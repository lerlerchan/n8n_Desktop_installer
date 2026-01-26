const { app, shell } = require('electron');
const path = require('path');
const { createTray, updateTrayStatus, destroyTray } = require('./tray');
const { startN8n, stopN8n, restartN8n, getN8nStatus } = require('./n8nProcess');
const { setEnvVars, getConfig } = require('./envConfig');
const { waitForN8n } = require('./utils');

// Prevent multiple instances
// Note: Singleton lock temporarily disabled for testing
// TODO: Re-enable after testing
const gotTheLock = true; // app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('Another instance is already running');
  app.quit();
  process.exit(0);
}

let tray = null;
let isQuitting = false;

const N8N_PORT = process.env.N8N_PORT || 5678;
const N8N_URL = `http://localhost:${N8N_PORT}`;

async function handleStart() {
  console.log('Starting n8n...');
  updateTrayStatus('starting');

  try {
    await startN8n();
    await waitForN8n(N8N_URL);
    updateTrayStatus('running');
    console.log('n8n started successfully');

    // Auto-open browser
    shell.openExternal(N8N_URL);
  } catch (error) {
    console.error('Failed to start n8n:', error);
    updateTrayStatus('stopped');
  }
}

async function handleStop() {
  console.log('Stopping n8n...');
  updateTrayStatus('stopping');

  try {
    await stopN8n();
    updateTrayStatus('stopped');
    console.log('n8n stopped');
  } catch (error) {
    console.error('Failed to stop n8n:', error);
    updateTrayStatus('stopped');
  }
}

async function handleRestart() {
  console.log('Restarting n8n...');
  await handleStop();
  await handleStart();
}

function handleOpenBrowser() {
  const status = getN8nStatus();
  if (status === 'running') {
    shell.openExternal(N8N_URL);
  }
}

async function handleQuit() {
  console.log('Quitting application...');
  isQuitting = true;

  try {
    await stopN8n();
  } catch (error) {
    console.error('Error during shutdown:', error);
  }

  destroyTray();
  app.quit();
}

async function main() {
  console.log('Initializing n8n Desktop...');

  // Initialize environment configuration
  await setEnvVars();
  const config = getConfig();
  console.log('Config:', config);

  // Create system tray
  tray = createTray({
    onStart: handleStart,
    onStop: handleStop,
    onRestart: handleRestart,
    onOpenBrowser: handleOpenBrowser,
    onQuit: handleQuit
  });

  // Auto-start n8n
  await handleStart();
}

// App lifecycle
app.whenReady().then(main);

// Hide dock icon on macOS (tray-only app)
if (process.platform === 'darwin') {
  app.dock.hide();
}

app.on('window-all-closed', (event) => {
  // Keep running in tray - don't quit
  event.preventDefault();
});

app.on('before-quit', async (event) => {
  if (!isQuitting) {
    event.preventDefault();
    await handleQuit();
  }
});

app.on('second-instance', () => {
  // Open browser when second instance is launched
  handleOpenBrowser();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});
