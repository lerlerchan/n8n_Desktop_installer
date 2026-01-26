const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const respawn = require('respawn');
const findProcess = require('find-process');
const { app } = require('electron');
const logger = require('./logger');

let n8nMonitor = null;
let currentStatus = 'stopped';

const isDev = process.env.ELECTRON_DEV_MODE === 'true';
const N8N_PORT = process.env.N8N_PORT || 5678;

// Check if we're running as a packaged app (vs from source)
function isPackaged() {
  // Use Electron's built-in check
  if (typeof app !== 'undefined' && app.isPackaged !== undefined) {
    return app.isPackaged;
  }

  // Fallback: In packaged apps, app.asar or the app folder exists in resources
  const appPath = path.join(process.resourcesPath, 'app');
  const asarPath = path.join(process.resourcesPath, 'app.asar');
  return fs.existsSync(appPath) || fs.existsSync(asarPath);
}

function getN8nBinaryPath() {
  // n8n CLI is in node_modules/.bin/n8n
  let basePath;

  if (isPackaged()) {
    // Packaged app: look in resources/app/node_modules
    basePath = path.join(process.resourcesPath, 'app', 'node_modules', '.bin', 'n8n');
  } else {
    // Running from source (dev or npm start): look in project's node_modules
    basePath = path.join(__dirname, '..', 'node_modules', '.bin', 'n8n');
  }

  const fullPath = process.platform === 'win32' ? `${basePath}.cmd` : basePath;

  logger.info(`[n8n] Binary path: ${fullPath}`);
  logger.info(`[n8n] Path exists: ${fs.existsSync(fullPath)}`);
  logger.info(`[n8n] isPackaged: ${isPackaged()}, isDev: ${isDev}`);
  logger.info(`[n8n] resourcesPath: ${process.resourcesPath}`);

  // List contents of expected directory for debugging
  const binDir = path.dirname(fullPath);
  if (fs.existsSync(binDir)) {
    try {
      const files = fs.readdirSync(binDir);
      logger.debug(`[n8n] Contents of ${binDir}:`, files.slice(0, 20));
    } catch (e) {
      logger.debug(`[n8n] Could not list directory: ${e.message}`);
    }
  } else {
    logger.warn(`[n8n] Binary directory does not exist: ${binDir}`);
  }

  return fullPath;
}

async function startN8n() {
  return new Promise((resolve, reject) => {
    const n8nPath = getN8nBinaryPath();
    const args = ['start'];

    const env = {
      ...process.env,
      N8N_PORT: N8N_PORT.toString(),
      N8N_DIAGNOSTICS_ENABLED: 'false',
      N8N_VERSION_NOTIFICATIONS_ENABLED: 'false'
    };

    logger.info(`[n8n] Starting n8n from: ${n8nPath}`);
    logger.info(`[n8n] Args: ${args.join(' ')}`);
    logger.info(`[n8n] Port: ${N8N_PORT}`);

    // First verify the binary exists
    if (!fs.existsSync(n8nPath)) {
      const error = new Error(`n8n binary not found at: ${n8nPath}`);
      logger.error(`[n8n] ${error.message}`);

      // Try to provide more context
      const appDir = path.join(process.resourcesPath, 'app');
      if (fs.existsSync(appDir)) {
        logger.info(`[n8n] App directory exists: ${appDir}`);
        try {
          const appContents = fs.readdirSync(appDir);
          logger.info(`[n8n] App directory contents: ${appContents.join(', ')}`);
        } catch (e) {
          logger.error(`[n8n] Could not list app directory: ${e.message}`);
        }
      } else {
        logger.error(`[n8n] App directory does not exist: ${appDir}`);
      }

      reject(error);
      return;
    }

    if (isDev) {
      // Development: Simple spawn for easier debugging
      logger.info('[n8n] Starting in development mode');

      n8nMonitor = spawn(n8nPath, args, {
        env,
        stdio: 'inherit',
        shell: true
      });

      n8nMonitor.on('error', (err) => {
        logger.error('[n8n] Failed to start:', err.message);
        logger.error('[n8n] Error details:', err);
        currentStatus = 'stopped';
        reject(err);
      });

      n8nMonitor.on('spawn', () => {
        logger.info('[n8n] Process spawned successfully in dev mode');
        currentStatus = 'running';
        resolve(n8nMonitor);
      });

      n8nMonitor.on('exit', (code, signal) => {
        logger.info(`[n8n] Dev process exited with code ${code}, signal ${signal}`);
        currentStatus = 'stopped';
      });

    } else {
      // Production: Use respawn for auto-restart
      logger.info('[n8n] Starting in production mode with respawn');

      n8nMonitor = respawn([n8nPath, ...args], {
        env,
        maxRestarts: 10,
        sleep: 1000,
        kill: 5000,
        stdio: ['ignore', 'pipe', 'pipe'] // Capture stdout/stderr
      });

      // Capture stdout
      n8nMonitor.on('stdout', (data) => {
        const output = data.toString().trim();
        if (output) {
          logger.info(`[n8n stdout] ${output}`);
        }
      });

      // Capture stderr
      n8nMonitor.on('stderr', (data) => {
        const output = data.toString().trim();
        if (output) {
          logger.error(`[n8n stderr] ${output}`);
        }
      });

      n8nMonitor.on('start', () => {
        logger.info('[n8n] Process started via respawn');
        currentStatus = 'running';
        resolve(n8nMonitor);
      });

      n8nMonitor.on('crash', () => {
        logger.error('[n8n] Process crashed - check stderr output above for details');
        currentStatus = 'stopped';
      });

      n8nMonitor.on('exit', (code, signal) => {
        logger.info(`[n8n] Process exited with code ${code}, signal ${signal}`);
      });

      n8nMonitor.on('warn', (err) => {
        logger.warn(`[n8n] Warning: ${err.message}`);
      });

      n8nMonitor.start();
    }
  });
}

async function stopN8n() {
  currentStatus = 'stopping';
  logger.info('[n8n] Stopping n8n...');

  return new Promise(async (resolve) => {
    try {
      if (n8nMonitor) {
        if (isDev) {
          // Kill the process directly
          if (n8nMonitor.kill) {
            logger.info('[n8n] Killing dev process');
            n8nMonitor.kill('SIGTERM');
          }
        } else {
          // Stop respawn monitor
          logger.info('[n8n] Stopping respawn monitor');
          n8nMonitor.stop(() => {
            logger.info('[n8n] Respawn monitor stopped');
          });
        }
      }

      // Also kill any orphan n8n processes on the port
      await killProcessOnPort(N8N_PORT);

      currentStatus = 'stopped';
      n8nMonitor = null;
      logger.info('[n8n] n8n stopped successfully');
      resolve();
    } catch (error) {
      logger.error('[n8n] Error stopping n8n:', error.message);
      currentStatus = 'stopped';
      resolve();
    }
  });
}

async function killProcessOnPort(port) {
  try {
    logger.info(`[n8n] Looking for processes on port ${port}`);
    const processes = await findProcess('port', port);
    for (const proc of processes) {
      logger.info(`[n8n] Killing process ${proc.pid} (${proc.name}) on port ${port}`);
      process.kill(proc.pid, 'SIGTERM');
    }
  } catch (error) {
    // Process might already be dead
    logger.debug(`[n8n] killProcessOnPort error (may be normal): ${error.message}`);
  }
}

async function restartN8n() {
  logger.info('[n8n] Restarting n8n...');
  await stopN8n();
  return startN8n();
}

function getN8nStatus() {
  return currentStatus;
}

module.exports = { startN8n, stopN8n, restartN8n, getN8nStatus };
