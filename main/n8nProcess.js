const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const respawn = require('respawn');
const findProcess = require('find-process');

let n8nMonitor = null;
let currentStatus = 'stopped';

const isDev = process.env.ELECTRON_DEV_MODE === 'true';
const N8N_PORT = process.env.N8N_PORT || 5678;

// Check if we're running as a packaged app (vs from source)
function isPackaged() {
  // In packaged apps, app.asar or the app folder exists in resources
  // When running from source, process.resourcesPath points to electron's internal resources
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

  console.log(`[n8n] Binary path: ${fullPath}`);
  console.log(`[n8n] Path exists: ${fs.existsSync(fullPath)}`);
  console.log(`[n8n] isPackaged: ${isPackaged()}, isDev: ${isDev}`);

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

    console.log(`Starting n8n from: ${n8nPath}`);

    if (isDev) {
      // Development: Simple spawn for easier debugging
      // First verify the binary exists
      if (!fs.existsSync(n8nPath)) {
        const error = new Error(`n8n binary not found at: ${n8nPath}`);
        console.error(error.message);
        reject(error);
        return;
      }

      n8nMonitor = spawn(n8nPath, args, {
        env,
        stdio: 'inherit',
        shell: true
      });

      n8nMonitor.on('error', (err) => {
        console.error('[n8n] Failed to start:', err.message);
        console.error('[n8n] Error details:', err);
        currentStatus = 'stopped';
        reject(err);
      });

      n8nMonitor.on('spawn', () => {
        console.log('[n8n] Process spawned successfully in dev mode');
        currentStatus = 'running';
        resolve(n8nMonitor);
      });

      n8nMonitor.on('exit', (code, signal) => {
        console.log(`[n8n] Dev process exited with code ${code}, signal ${signal}`);
        currentStatus = 'stopped';
      });

    } else {
      // Production: Use respawn for auto-restart
      // But first verify the binary exists
      if (!fs.existsSync(n8nPath)) {
        const error = new Error(`n8n binary not found at: ${n8nPath}`);
        console.error(error.message);
        reject(error);
        return;
      }

      n8nMonitor = respawn([n8nPath, ...args], {
        env,
        maxRestarts: 10,
        sleep: 1000,
        kill: 5000,
        stdio: ['ignore', 'pipe', 'pipe'] // Capture stdout/stderr
      });

      // Capture stdout
      n8nMonitor.on('stdout', (data) => {
        console.log(`[n8n stdout] ${data.toString().trim()}`);
      });

      // Capture stderr
      n8nMonitor.on('stderr', (data) => {
        console.error(`[n8n stderr] ${data.toString().trim()}`);
      });

      n8nMonitor.on('start', () => {
        console.log('[n8n] Process started');
        currentStatus = 'running';
        resolve(n8nMonitor);
      });

      n8nMonitor.on('crash', () => {
        console.error('[n8n] Process crashed - check stderr output above for details');
        currentStatus = 'stopped';
      });

      n8nMonitor.on('exit', (code, signal) => {
        console.log(`[n8n] Process exited with code ${code}, signal ${signal}`);
      });

      n8nMonitor.on('warn', (err) => {
        console.warn(`[n8n] Warning: ${err.message}`);
      });

      n8nMonitor.start();
    }
  });
}

async function stopN8n() {
  currentStatus = 'stopping';

  return new Promise(async (resolve) => {
    try {
      if (n8nMonitor) {
        if (isDev) {
          // Kill the process directly
          if (n8nMonitor.kill) {
            n8nMonitor.kill('SIGTERM');
          }
        } else {
          // Stop respawn monitor
          n8nMonitor.stop(() => {
            console.log('n8n respawn monitor stopped');
          });
        }
      }

      // Also kill any orphan n8n processes on the port
      await killProcessOnPort(N8N_PORT);

      currentStatus = 'stopped';
      n8nMonitor = null;
      resolve();
    } catch (error) {
      console.error('Error stopping n8n:', error);
      currentStatus = 'stopped';
      resolve();
    }
  });
}

async function killProcessOnPort(port) {
  try {
    const processes = await findProcess('port', port);
    for (const proc of processes) {
      console.log(`Killing process ${proc.pid} on port ${port}`);
      process.kill(proc.pid, 'SIGTERM');
    }
  } catch (error) {
    // Process might already be dead
  }
}

async function restartN8n() {
  await stopN8n();
  return startN8n();
}

function getN8nStatus() {
  return currentStatus;
}

module.exports = { startN8n, stopN8n, restartN8n, getN8nStatus };
