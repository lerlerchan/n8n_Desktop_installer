#!/usr/bin/env node
/**
 * Build n8n Runtime Package
 *
 * Creates a zip file containing node_modules with n8n that can be extracted
 * into the Electron app's resources/app folder.
 *
 * Usage:
 *   node scripts/build-runtime.js [--version <n8n-version>] [--output <path>]
 *
 * Examples:
 *   node scripts/build-runtime.js
 *   node scripts/build-runtime.js --version 1.70.0
 *   node scripts/build-runtime.js --output ./dist/n8n-runtime.zip
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
let n8nVersion = 'latest';
let outputPath = './n8n-runtime-win-x64.zip';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--version' && args[i + 1]) {
    n8nVersion = args[i + 1];
    i++;
  } else if (args[i] === '--output' && args[i + 1]) {
    outputPath = args[i + 1];
    i++;
  }
}

const runtimeDir = path.join(__dirname, '..', 'runtime-build');
const isWindows = process.platform === 'win32';

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  return execSync(cmd, { stdio: 'inherit', ...opts });
}

function cleanup() {
  if (fs.existsSync(runtimeDir)) {
    console.log('Cleaning up runtime-build directory...');
    fs.rmSync(runtimeDir, { recursive: true, force: true });
  }
}

async function main() {
  console.log('=== Building n8n Runtime Package ===\n');
  console.log(`n8n version: ${n8nVersion}`);
  console.log(`Output: ${outputPath}\n`);

  // Clean up any previous build
  cleanup();

  // Create runtime directory
  fs.mkdirSync(runtimeDir, { recursive: true });

  // Create minimal package.json
  const pkgJson = {
    name: 'n8n-runtime',
    version: '1.0.0',
    private: true
  };
  fs.writeFileSync(
    path.join(runtimeDir, 'package.json'),
    JSON.stringify(pkgJson, null, 2)
  );

  // Install n8n
  console.log('\nInstalling n8n...');
  const versionSpec = n8nVersion === 'latest' ? 'n8n' : `n8n@${n8nVersion}`;
  run(`npm install ${versionSpec} --save`, { cwd: runtimeDir });

  // Verify n8n binary exists
  const n8nBinPath = path.join(runtimeDir, 'node_modules', '.bin', isWindows ? 'n8n.cmd' : 'n8n');
  if (!fs.existsSync(n8nBinPath)) {
    console.error(`ERROR: n8n binary not found at ${n8nBinPath}`);
    process.exit(1);
  }
  console.log(`\n✓ n8n binary found at: ${n8nBinPath}`);

  // Get actual installed version
  const installedPkgPath = path.join(runtimeDir, 'node_modules', 'n8n', 'package.json');
  const installedVersion = JSON.parse(fs.readFileSync(installedPkgPath, 'utf8')).version;
  console.log(`✓ Installed n8n version: ${installedVersion}`);

  // Create zip file
  console.log('\nCreating zip archive...');

  // Ensure output directory exists
  const outputDir = path.dirname(path.resolve(outputPath));
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  if (isWindows) {
    // Use PowerShell on Windows
    const absOutput = path.resolve(outputPath);
    const nodeModulesPath = path.join(runtimeDir, 'node_modules');
    const pkgJsonPath = path.join(runtimeDir, 'package.json');
    const pkgLockPath = path.join(runtimeDir, 'package-lock.json');

    // Remove existing zip if present
    if (fs.existsSync(absOutput)) {
      fs.unlinkSync(absOutput);
    }

    run(`powershell -Command "Compress-Archive -Path '${nodeModulesPath}', '${pkgJsonPath}', '${pkgLockPath}' -DestinationPath '${absOutput}' -Force"`);
  } else {
    // Use zip on Unix
    run(`cd "${runtimeDir}" && zip -r "${path.resolve(outputPath)}" node_modules package.json package-lock.json`);
  }

  // Verify zip was created
  if (!fs.existsSync(outputPath)) {
    console.error('ERROR: Failed to create zip file');
    process.exit(1);
  }

  const stats = fs.statSync(outputPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`\n✓ Runtime zip created: ${outputPath} (${sizeMB} MB)`);

  // Clean up
  cleanup();

  console.log('\n=== Build Complete ===');
  console.log(`\nTo use this runtime:`);
  console.log(`1. Extract the zip into resources/app/ of the packaged Electron app`);
  console.log(`2. Or upload to GitHub releases for automatic download`);
}

main().catch(err => {
  console.error('Build failed:', err);
  cleanup();
  process.exit(1);
});
