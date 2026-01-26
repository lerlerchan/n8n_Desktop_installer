const fs = require('fs');
const path = require('path');
const os = require('os');
const { pipeline } = require('stream');
const { promisify } = require('util');
const fetch = require('node-fetch');

const pump = promisify(pipeline);

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  await pump(res.body, fs.createWriteStream(destPath));
}

async function extractZip(zipPath, targetDir) {
  // Load adm-zip lazily so it's optional and only used when needed
  let AdmZip;
  try {
    AdmZip = require('adm-zip');
  } catch (e) {
    throw new Error('adm-zip is required to extract runtime. Please install adm-zip as an optional dependency.');
  }

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(targetDir, true);
}

// Runtime downloader: downloads a runtime zip and extracts into targetDir
// Expects the zip to contain a node_modules layout with .bin/n8n
async function ensureRuntime({ downloadUrl, targetDir, tmpDir }) {
  tmpDir = tmpDir || os.tmpdir();
  const zipName = `n8n-runtime-${Date.now()}.zip`;
  const zipPath = path.join(tmpDir, zipName);

  console.log(`[runtime] Downloading runtime from: ${downloadUrl}`);
  await downloadFile(downloadUrl, zipPath);
  console.log(`[runtime] Downloaded to: ${zipPath}`);

  // Ensure target exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log(`[runtime] Extracting runtime to: ${targetDir}`);
  await extractZip(zipPath, targetDir);

  // Remove zip
  try { fs.unlinkSync(zipPath); } catch (e) {}

  console.log('[runtime] Extraction complete');
}

module.exports = { ensureRuntime };
