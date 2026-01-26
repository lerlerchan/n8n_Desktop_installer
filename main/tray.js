const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

let trayInstance = null;
let handlersRef = null;

// Get the correct assets path for both packaged and dev modes
function getAssetsPath() {
  // When packaged, assets are in resources/app/assets
  // When in dev mode, assets are relative to main directory
  if (app.isPackaged) {
    // Try multiple possible locations
    const possiblePaths = [
      path.join(process.resourcesPath, 'app', 'assets'),
      path.join(process.resourcesPath, 'assets'),
      path.join(__dirname, '..', 'assets')
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        logger.info(`[tray] Found assets at: ${p}`);
        return p;
      }
    }

    logger.warn('[tray] Could not find assets directory, using fallback');
    return path.join(__dirname, '..', 'assets');
  }

  return path.join(__dirname, '..', 'assets');
}

function getIconPath(iconName) {
  const assetsPath = getAssetsPath();
  const iconPath = path.join(assetsPath, iconName);

  logger.debug(`[tray] Loading icon: ${iconPath}`);
  logger.debug(`[tray] Icon exists: ${fs.existsSync(iconPath)}`);

  return iconPath;
}

const ICON_NAMES = {
  running: 'tray-icon-running.png',
  stopped: 'tray-icon-stopped.png',
  starting: 'tray-icon-stopped.png',
  stopping: 'tray-icon-stopped.png'
};

const STATUS_LABELS = {
  running: 'n8n is Running',
  stopped: 'n8n is Stopped',
  starting: 'Starting n8n...',
  stopping: 'Stopping n8n...'
};

function createTray(handlers) {
  logger.info('[tray] Creating system tray...');
  handlersRef = handlers;

  try {
    const iconPath = getIconPath(ICON_NAMES.stopped);
    logger.info(`[tray] Initial icon path: ${iconPath}`);

    // Check if icon file exists
    if (!fs.existsSync(iconPath)) {
      logger.error(`[tray] Icon file not found: ${iconPath}`);
      // Create an empty image as fallback to ensure tray appears
      const emptyIcon = nativeImage.createEmpty();
      trayInstance = new Tray(emptyIcon);
      logger.warn('[tray] Created tray with empty icon (fallback)');
    } else {
      const icon = nativeImage.createFromPath(iconPath);
      if (icon.isEmpty()) {
        logger.error('[tray] Icon loaded but is empty');
        trayInstance = new Tray(nativeImage.createEmpty());
      } else {
        logger.info(`[tray] Icon loaded successfully, size: ${icon.getSize().width}x${icon.getSize().height}`);
        trayInstance = new Tray(icon);
      }
    }

    trayInstance.setToolTip('n8n Desktop');
    logger.info('[tray] Tray created successfully');

    // Build context menu
    updateTrayMenu('stopped');

    // Handle click (Windows: left-click opens menu)
    trayInstance.on('click', () => {
      logger.debug('[tray] Left-click detected');
      if (process.platform === 'win32') {
        trayInstance.popUpContextMenu();
      }
    });

    // Double-click opens browser
    trayInstance.on('double-click', () => {
      logger.debug('[tray] Double-click detected');
      if (handlers.onOpenBrowser) {
        handlers.onOpenBrowser();
      }
    });

    return trayInstance;
  } catch (error) {
    logger.error('[tray] Failed to create tray:', error.message);
    logger.error('[tray] Stack trace:', error.stack);
    throw error;
  }
}

function updateTrayMenu(status) {
  if (!trayInstance || !handlersRef) {
    logger.warn('[tray] Cannot update menu - tray or handlers not initialized');
    return;
  }

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
      label: 'View Logs',
      click: () => {
        const { shell } = require('electron');
        const logPath = require('./logger').getLogPath();
        shell.showItemInFolder(logPath);
      }
    },
    {
      label: 'Quit',
      click: handlersRef.onQuit
    }
  ]);

  trayInstance.setContextMenu(contextMenu);
}

function updateTrayStatus(status) {
  if (!trayInstance) {
    logger.warn('[tray] Cannot update status - tray not initialized');
    return;
  }

  logger.info(`[tray] Updating status to: ${status}`);

  // Update icon
  try {
    const iconPath = getIconPath(ICON_NAMES[status] || ICON_NAMES.stopped);
    if (fs.existsSync(iconPath)) {
      const icon = nativeImage.createFromPath(iconPath);
      if (!icon.isEmpty()) {
        trayInstance.setImage(icon);
      }
    }
  } catch (error) {
    logger.error('[tray] Failed to update icon:', error.message);
  }

  // Update tooltip
  trayInstance.setToolTip(`n8n Desktop - ${STATUS_LABELS[status] || status}`);

  // Update menu
  updateTrayMenu(status);
}

function destroyTray() {
  if (trayInstance) {
    logger.info('[tray] Destroying tray');
    trayInstance.destroy();
    trayInstance = null;
  }
}

module.exports = { createTray, updateTrayStatus, destroyTray };
