const { spawn } = require('child_process');
const path = require('path');
const respawn = require('respawn');
const findProcess = require('find-process');

let n8nMonitor = null;
let currentStatus = 'stopped';

const isDev = process.env.ELECTRON_DEV_MODE === 'true';
const N8N_PORT = process.env.N8N_PORT || 5678;

function getN8nBinaryPath() {
  // n8n CLI is in node_modules/.bin/n8n
  const basePath = isDev
    ? path.join(__dirname, '../node_modules/.bin/n8n')
    : path.join(process.resourcesPath, 'app/node_modules/.bin/n8n');

  return process.platform === 'win32' ? `${basePath}.cmd` : basePath;
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
      n8nMonitor = spawn(n8nPath, args, {
        env,
        stdio: 'inherit',
        shell: true
      });

      n8nMonitor.on('error', (err) => {
        console.error('Failed to start n8n:', err);
        currentStatus = 'stopped';
        reject(err);
      });

      n8nMonitor.on('spawn', () => {
        currentStatus = 'running';
        resolve(n8nMonitor);
      });

    } else {
      // Production: Use respawn for auto-restart
      n8nMonitor = respawn([n8nPath, ...args], {
        env,
        maxRestarts: 10,
        sleep: 1000,
        kill: 5000,
        stdio: 'inherit'
      });

      n8nMonitor.on('start', () => {
        console.log('n8n process started');
        currentStatus = 'running';
        resolve(n8nMonitor);
      });

      n8nMonitor.on('crash', () => {
        console.error('n8n process crashed');
        currentStatus = 'stopped';
      });

      n8nMonitor.on('exit', (code) => {
        console.log(`n8n process exited with code ${code}`);
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
