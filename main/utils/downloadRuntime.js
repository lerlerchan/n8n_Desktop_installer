const fs = require('fs');
const path = require('path');
const os = require('os');
const { pipeline } = require('stream');
const { promisify } = require('util');
const fetch = require('node-fetch');

// Import logger with fallback for standalone usage
let logger;
try {
  logger = require('../logger');
} catch (e) {
  // Fallback logger for standalone usage
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.log
  };
}

const pump = promisify(pipeline);

async function downloadFile(url, destPath) {
  logger.info(`[runtime] Downloading from: ${url}`);
  logger.info(`[runtime] Destination: ${destPath}`);

  const res = await fetch(url, {
    timeout: 300000, // 5 minute timeout for large files
    headers: {
      'User-Agent': 'n8n-desktop-installer/1.0'
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }

  const totalSize = parseInt(res.headers.get('content-length') || '0', 10);
  logger.info(`[runtime] Download size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

  await pump(res.body, fs.createWriteStream(destPath));
  logger.info(`[runtime] Download complete`);
}

async function extractZip(zipPath, targetDir) {
  logger.info(`[runtime] Extracting ${zipPath} to ${targetDir}`);

  // Load adm-zip lazily so it's optional and only used when needed
  let AdmZip;
  try {
    AdmZip = require('adm-zip');
  } catch (e) {
    throw new Error('adm-zip is required to extract runtime. Please install adm-zip as an optional dependency.');
  }

  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  logger.info(`[runtime] Archive contains ${entries.length} entries`);

  zip.extractAllTo(targetDir, true);
  logger.info(`[runtime] Extraction complete`);

  // Verify extraction
  const nodeModulesPath = path.join(targetDir, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    const contents = fs.readdirSync(nodeModulesPath);
    logger.info(`[runtime] node_modules contains ${contents.length} items`);

    // Check for n8n binary
    const binPath = path.join(nodeModulesPath, '.bin');
    if (fs.existsSync(binPath)) {
      const binContents = fs.readdirSync(binPath);
      logger.info(`[runtime] .bin contains: ${binContents.slice(0, 10).join(', ')}...`);

      const n8nCmd = process.platform === 'win32' ? 'n8n.cmd' : 'n8n';
      if (binContents.includes(n8nCmd)) {
        logger.info(`[runtime] SUCCESS: ${n8nCmd} found in .bin`);
      } else {
        logger.warn(`[runtime] WARNING: ${n8nCmd} NOT found in .bin`);
      }
    } else {
      logger.warn(`[runtime] WARNING: .bin directory not found`);
    }
  } else {
    logger.warn(`[runtime] WARNING: node_modules not found after extraction`);
  }
}

// Runtime downloader: downloads a runtime zip and extracts into targetDir
// Expects the zip to contain a node_modules layout with .bin/n8n
async function ensureRuntime({ downloadUrl, targetDir, tmpDir }) {
  tmpDir = tmpDir || os.tmpdir();
  const zipName = `n8n-runtime-${Date.now()}.zip`;
  const zipPath = path.join(tmpDir, zipName);

  logger.info(`[runtime] Starting runtime installation`);
  logger.info(`[runtime] Download URL: ${downloadUrl}`);
  logger.info(`[runtime] Target directory: ${targetDir}`);
  logger.info(`[runtime] Temp directory: ${tmpDir}`);

  await downloadFile(downloadUrl, zipPath);

  // Ensure target exists
  if (!fs.existsSync(targetDir)) {
    logger.info(`[runtime] Creating target directory: ${targetDir}`);
    fs.mkdirSync(targetDir, { recursive: true });
  }

  await extractZip(zipPath, targetDir);

  // Remove zip
  try {
    fs.unlinkSync(zipPath);
    logger.info(`[runtime] Cleaned up temp zip file`);
  } catch (e) {
    logger.warn(`[runtime] Could not clean up temp file: ${e.message}`);
  }

  logger.info('[runtime] Runtime installation complete');
}

module.exports = { ensureRuntime };
