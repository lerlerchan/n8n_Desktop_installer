# n8n Desktop Installer v1.0.1 - Fixed n8n Module Packaging

## What's Fixed

### n8n Module Not Included in Packaged App
The n8n module was not being properly bundled in the installer. This has been fixed by including the full `node_modules` directory in the packaged app.

### Binary Path Issue in Production Builds
Electron-builder doesn't create `.bin` symlinks in the packaged app. The app now uses direct paths to `node_modules/n8n/bin/n8n.cmd` instead of relying on `.bin/n8n.cmd`.

### Native Module Conflicts
Added `npmRebuild: false` to prevent electron-builder from rebuilding native modules, which was causing conflicts with n8n's dependencies.

## Installation

1. Download `n8n Desktop Setup 1.0.0.exe` from the release assets below
2. Run the installer
3. Follow the installation wizard
4. n8n Desktop will start automatically and open your browser to http://localhost:5678

## System Requirements

- Windows 10/11 (64-bit)
- 4GB RAM minimum (8GB recommended)
- 2GB free disk space

## Known Issues

- The deprecation warning about `EXECUTIONS_PROCESS` can be safely ignored
- First startup may take 10-15 seconds while n8n initializes

## Full Changelog

See [OVERNIGHT_SUMMARY.md](OVERNIGHT_SUMMARY.md) for detailed technical changes.

---
**Made with love for educators and students**
