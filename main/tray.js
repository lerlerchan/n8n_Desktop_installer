const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let trayInstance = null;
let handlersRef = null;

const ICONS = {
  running: path.join(__dirname, '../assets/tray-icon-running.png'),
  stopped: path.join(__dirname, '../assets/tray-icon-stopped.png'),
  starting: path.join(__dirname, '../assets/tray-icon-stopped.png'),
  stopping: path.join(__dirname, '../assets/tray-icon-stopped.png')
};

const STATUS_LABELS = {
  running: 'n8n is Running',
  stopped: 'n8n is Stopped',
  starting: 'Starting n8n...',
  stopping: 'Stopping n8n...'
};

function createTray(handlers) {
  handlersRef = handlers;

  const iconPath = ICONS.stopped;
  const icon = nativeImage.createFromPath(iconPath);

  trayInstance = new Tray(icon);
  trayInstance.setToolTip('n8n Desktop');

  // Build context menu
  updateTrayMenu('stopped');

  // Handle click (Windows: left-click opens menu)
  trayInstance.on('click', () => {
    if (process.platform === 'win32') {
      trayInstance.popUpContextMenu();
    }
  });

  // Double-click opens browser
  trayInstance.on('double-click', () => {
    if (handlers.onOpenBrowser) {
      handlers.onOpenBrowser();
    }
  });

  return trayInstance;
}

function updateTrayMenu(status) {
  if (!trayInstance || !handlersRef) return;

  const isRunning = status === 'running';
  const isTransitioning = status === 'starting' || status === 'stopping';

  const contextMenu = Menu.buildFromTemplate([
    {
      label: STATUS_LABELS[status] || 'n8n Desktop',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Start n8n',
      enabled: !isRunning && !isTransitioning,
      click: handlersRef.onStart
    },
    {
      label: 'Stop n8n',
      enabled: isRunning && !isTransitioning,
      click: handlersRef.onStop
    },
    {
      label: 'Restart n8n',
      enabled: isRunning && !isTransitioning,
      click: handlersRef.onRestart
    },
    { type: 'separator' },
    {
      label: 'Open in Browser',
      enabled: isRunning,
      click: handlersRef.onOpenBrowser
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: handlersRef.onQuit
    }
  ]);

  trayInstance.setContextMenu(contextMenu);
}

function updateTrayStatus(status) {
  if (!trayInstance) return;

  // Update icon
  const iconPath = ICONS[status] || ICONS.stopped;
  const icon = nativeImage.createFromPath(iconPath);
  trayInstance.setImage(icon);

  // Update tooltip
  trayInstance.setToolTip(`n8n Desktop - ${STATUS_LABELS[status] || status}`);

  // Update menu
  updateTrayMenu(status);
}

function destroyTray() {
  if (trayInstance) {
    trayInstance.destroy();
    trayInstance = null;
  }
}

module.exports = { createTray, updateTrayStatus, destroyTray };
