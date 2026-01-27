const { app, shell, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');
const { createTray, updateTrayStatus, destroyTray } = require('./tray');
const { startN8n, stopN8n, restartN8n, getN8nStatus } = require('./n8nProcess');
const { setEnvVars, getConfig } = require('./envConfig');
const { waitForN8n } = require('./utils');

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('Another instance is already running');
  app.quit();
  process.exit(0);
}

let tray = null;
let isQuitting = false;

const N8N_PORT = process.env.N8N_PORT || 5678;
const N8N_URL = `http://localhost:${N8N_PORT}`;

// Show error notification to user
function showErrorNotification(title, body) {
  logger.error(`[notification] ${title}: ${body}`);

  // Show system notification if supported
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: title,
      body: body,
      icon: path.join(__dirname, '..', 'assets', 'icon.ico')
    });
    notification.show();
  }
}

// Show error dialog
async function showErrorDialog(title, message, detail) {
  logger.error(`[dialog] ${title}: ${message}`);
  logger.error(`[dialog] Detail: ${detail}`);

  return dialog.showMessageBox({
    type: 'error',
    title: title,
    message: message,
    detail: detail + `\n\nLog file: ${logger.getLogPath()}`,
    buttons: ['OK', 'View Logs'],
    defaultId: 0
  }).then(result => {
    if (result.response === 1) {
      shell.showItemInFolder(logger.getLogPath());
    }
  });
}

async function handleStart() {
  logger.info('Starting n8n...');
  updateTrayStatus('starting');

  try {
    await startN8n();
    logger.info('n8n process started, waiting for health check...');

    await waitForN8n(N8N_URL);
    updateTrayStatus('running');
    logger.info('n8n started successfully and is healthy');

    // Auto-open browser
    logger.info(`Opening browser to ${N8N_URL}`);
    shell.openExternal(N8N_URL);
  } catch (error) {
    logger.error('Failed to start n8n:', error.message);
    logger.error('Stack trace:', error.stack);
    updateTrayStatus('stopped');

    // Show error to user
    showErrorNotification(
      'n8n Failed to Start',
      'Check the logs for details. Click the tray icon for options.'
    );

    await showErrorDialog(
      'n8n Failed to Start',
      'The n8n server could not be started.',
      error.message
    );
  }
}

async function handleStop() {
  logger.info('Stopping n8n...');
  updateTrayStatus('stopping');

  try {
    await stopN8n();
    updateTrayStatus('stopped');
    logger.info('n8n stopped');
  } catch (error) {
    logger.error('Failed to stop n8n:', error.message);
    updateTrayStatus('stopped');
  }
}

async function handleRestart() {
  logger.info('Restarting n8n...');
  await handleStop();
  await handleStart();
}

function handleOpenBrowser() {
  const status = getN8nStatus();
  logger.info(`Opening browser, current status: ${status}`);
  if (status === 'running') {
    shell.openExternal(N8N_URL);
  } else {
    showErrorNotification(
      'n8n Not Running',
      'Start n8n first from the system tray menu.'
    );
  }
}

async function handleQuit() {
  logger.info('Quitting application...');
  isQuitting = true;

  try {
    await stopN8n();
  } catch (error) {
    logger.error('Error during shutdown:', error.message);
  }

  destroyTray();
  app.quit();
}

async function main() {
  // Initialize logging
  logger.logStartup();
  logger.info('Initializing n8n Desktop...');
  logger.info(`App is packaged: ${app.isPackaged}`);

  // Initialize environment configuration
  await setEnvVars();
  const config = getConfig();
  logger.info('Config:', config);

  // Verify n8n binary exists (bundled with installer)
  const n8nBinPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app', 'node_modules', '.bin', process.platform === 'win32' ? 'n8n.cmd' : 'n8n')
    : path.join(__dirname, '..', 'node_modules', '.bin', process.platform === 'win32' ? 'n8n.cmd' : 'n8n');

  logger.info(`[n8n] Expected binary path: ${n8nBinPath}`);
  logger.info(`[n8n] Binary exists: ${fs.existsSync(n8nBinPath)}`);

  if (!fs.existsSync(n8nBinPath)) {
    logger.error('[n8n] CRITICAL: n8n binary not found!');
    await showErrorDialog(
      'n8n Not Found',
      'The n8n binary is missing from the installation.',
      `Expected at: ${n8nBinPath}\n\nPlease reinstall the application.`
    );
  }

  // Create system tray
  logger.info('Creating system tray...');
  try {
    tray = createTray({
      onStart: handleStart,
      onStop: handleStop,
      onRestart: handleRestart,
      onOpenBrowser: handleOpenBrowser,
      onQuit: handleQuit
    });
    logger.info('System tray created successfully');
  } catch (error) {
    logger.error('Failed to create system tray:', error.message);
    logger.error('Stack trace:', error.stack);

    await showErrorDialog(
      'Tray Creation Failed',
      'Failed to create system tray icon.',
      error.message
    );
  }

  // Auto-start n8n
  logger.info('Auto-starting n8n...');
  await handleStart();
}

// App lifecycle
app.whenReady().then(main).catch(error => {
  logger.error('Fatal error during app initialization:', error.message);
  logger.error('Stack trace:', error.stack);
});

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
  logger.info('Second instance detected, opening browser');
  // Open browser when second instance is launched
  handleOpenBrowser();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error.message);
  logger.error('Stack trace:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise);
  logger.error('Reason:', reason);
});
