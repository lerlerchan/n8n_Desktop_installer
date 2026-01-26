const fs = require('fs');
const path = require('path');
const os = require('os');

const LOG_DIR = path.join(os.homedir(), '.n8n');
const LOG_FILE = path.join(LOG_DIR, 'n8n-desktop.log');
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5 MB

// Ensure log directory exists
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

// Rotate log if too large
function rotateLogIfNeeded() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE);
      if (stats.size > MAX_LOG_SIZE) {
        const backupPath = LOG_FILE + '.old';
        if (fs.existsSync(backupPath)) {
          fs.unlinkSync(backupPath);
        }
        fs.renameSync(LOG_FILE, backupPath);
      }
    }
  } catch (e) {
    // Ignore rotation errors
  }
}

// Format timestamp
function timestamp() {
  return new Date().toISOString();
}

// Write to log file
function writeToLog(level, ...args) {
  try {
    ensureLogDir();
    rotateLogIfNeeded();

    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    const logLine = `[${timestamp()}] [${level}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logLine, 'utf8');
  } catch (e) {
    // Silently fail if we can't write to log
  }
}

// Create logger object that logs to both console and file
const logger = {
  info: (...args) => {
    console.log(...args);
    writeToLog('INFO', ...args);
  },

  warn: (...args) => {
    console.warn(...args);
    writeToLog('WARN', ...args);
  },

  error: (...args) => {
    console.error(...args);
    writeToLog('ERROR', ...args);
  },

  debug: (...args) => {
    console.log(...args);
    writeToLog('DEBUG', ...args);
  },

  // Get the log file path for display to users
  getLogPath: () => LOG_FILE,

  // Write startup banner
  logStartup: () => {
    writeToLog('INFO', '='.repeat(60));
    writeToLog('INFO', 'n8n Desktop starting');
    writeToLog('INFO', `Platform: ${process.platform}`);
    writeToLog('INFO', `Arch: ${process.arch}`);
    writeToLog('INFO', `Node: ${process.version}`);
    writeToLog('INFO', `Electron: ${process.versions.electron}`);
    writeToLog('INFO', `App Path: ${process.execPath}`);
    writeToLog('INFO', `Resources Path: ${process.resourcesPath || 'N/A'}`);
    writeToLog('INFO', `Working Dir: ${process.cwd()}`);
    writeToLog('INFO', '='.repeat(60));
  }
};

module.exports = logger;
