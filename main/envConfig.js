const fs = require('fs');
const path = require('path');
const os = require('os');
const dotenv = require('dotenv');

const CONFIG_DIR_NAME = '.n8n';
const CONFIG_FILE_NAME = 'n8n-desktop.env';
const DEFAULT_PORT = 5678;

function getN8nDataDir() {
  const homeDir = os.homedir();
  const n8nDir = path.join(homeDir, CONFIG_DIR_NAME);

  if (!fs.existsSync(n8nDir)) {
    fs.mkdirSync(n8nDir, { recursive: true });
  }

  return n8nDir;
}

function getDefaultConfig() {
  const deploymentType = process.platform === 'darwin' ? 'desktop_mac' : 'desktop_win';

  return {
    N8N_PORT: DEFAULT_PORT,
    N8N_DEPLOYMENT_TYPE: deploymentType,
    N8N_DIAGNOSTICS_ENABLED: 'false',
    N8N_VERSION_NOTIFICATIONS_ENABLED: 'false',
    EXECUTIONS_PROCESS: 'main',
    GENERIC_TIMEZONE: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  };
}

function getConfigFilePath() {
  return path.join(getN8nDataDir(), CONFIG_FILE_NAME);
}

function ensureConfigFile() {
  const configPath = getConfigFilePath();

  if (!fs.existsSync(configPath)) {
    const defaultConfig = getDefaultConfig();
    const configContent = Object.entries(defaultConfig)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    fs.writeFileSync(configPath, configContent, 'utf-8');
    console.log(`Created config file at: ${configPath}`);
  }

  return configPath;
}

async function setEnvVars() {
  const configPath = ensureConfigFile();

  // Load environment variables from config file
  const result = dotenv.config({ path: configPath });

  if (result.error) {
    console.error('Error loading config:', result.error);
  }

  // Set N8N_USER_FOLDER to our data directory
  process.env.N8N_USER_FOLDER = getN8nDataDir();

  // Ensure data directories exist
  const logsDir = path.join(getN8nDataDir(), 'n8n-desktop-logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

function getConfig() {
  return {
    port: parseInt(process.env.N8N_PORT || DEFAULT_PORT, 10),
    dataDir: getN8nDataDir(),
    configPath: getConfigFilePath()
  };
}

module.exports = { setEnvVars, getConfig, getN8nDataDir };
