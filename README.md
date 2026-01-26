# n8n Desktop Installer

**A simple one-click installer for n8n - No technical knowledge required!**

n8n Desktop Installer makes it easy for non-technical users to install and run n8n automation workflows on their Windows computer. No Docker, no terminal commands, no configuration needed - just click install and start automating!

## 🎯 Purpose

Created to help students, educators, and beginners learn n8n automation without the complexity of traditional installation methods. Perfect for workshops, training sessions, and classroom environments.

## Features

- **One-click installation** - No Docker, no command line required
- **System tray interface** - Start/Stop/Restart n8n from the tray icon
- **Auto-start** - n8n starts automatically when the app launches
- **Browser integration** - Automatically opens your browser to n8n
- **Persistent data** - Your workflows and credentials are stored locally
- **Auto-download runtime** - The app downloads n8n on first run if needed

## Requirements

- Windows 10/11 (64-bit) or macOS 10.15+
- 4GB RAM minimum (8GB recommended)
- 2GB free disk space
- Internet connection (for first-run runtime download)

## Installation

### For End Users (From Release)

1. Download the latest installer from the [Releases](https://github.com/lerlerchan/n8n_Desktop_installer/releases) page
2. Run the installer (`.exe` for Windows, `.dmg` for macOS)
3. Follow the installation wizard
4. n8n Desktop will start automatically
5. On first run, the app will download the n8n runtime (~300MB)

### For Developers (From Source)

```bash
# Clone the repository
git clone https://github.com/lerlerchan/n8n_Desktop_installer.git
cd n8n_Desktop_installer

# Install dependencies (lightweight Electron shell only)
npm install

# Also install n8n for local development
npm install n8n

# Run in development mode
npm run dev

# Build Windows installer
npm run build:win

# Build macOS installer (on macOS only)
npm run build:mac
```

## Architecture

This project uses a **two-part architecture** to avoid Node.js version conflicts:

```
┌─────────────────────────────────────────────────────────────┐
│  1. Electron Shell (lightweight installer)                   │
│     - System tray UI                                         │
│     - Process management                                     │
│     - Runtime downloader                                     │
│     - ~50MB installed size                                   │
└─────────────────────────────────────────────────────────────┘
                              +
┌─────────────────────────────────────────────────────────────┐
│  2. n8n Runtime (downloaded on first run)                    │
│     - Pre-built n8n with all dependencies                   │
│     - Built with Node.js 20.x                               │
│     - ~300MB download                                        │
└─────────────────────────────────────────────────────────────┘
```

**Why this architecture?**
- n8n has native dependencies (like sqlite3) that must be compiled for a specific Node.js version
- Electron uses its own embedded Node.js which differs from system Node.js
- Building n8n inside Electron causes version conflicts
- The runtime is built separately with plain Node.js 20.x, then downloaded at runtime

## Building

### Build the Electron Installer

```bash
# Install dependencies
npm install

# Build Windows installer
npm run build:win

# Output: dist/n8n Desktop Setup*.exe
```

### Build the n8n Runtime

The runtime is built separately and hosted on GitHub Releases.

**Option 1: Use GitHub Actions (Recommended)**

1. Go to Actions tab in GitHub
2. Run "Build n8n Runtime" workflow
3. Download the `n8n-runtime-win-x64.zip` artifact
4. Upload to GitHub Releases

**Option 2: Build Locally**

```bash
# Build runtime zip
npm run build:runtime

# Or with specific version
npm run build:runtime -- --version 1.70.0

# Output: n8n-runtime-win-x64.zip
```

### Runtime ZIP Structure

After extracting, the runtime should have this structure:
```
node_modules/
├── .bin/
│   ├── n8n          # Unix executable
│   └── n8n.cmd      # Windows executable
├── n8n/
│   └── ...
└── (other dependencies)
package.json
package-lock.json
```

## CI/CD Workflows

### `.github/workflows/build-windows.yml`
- Triggers on push to main
- Builds the lightweight Electron installer
- Uploads installer as artifact

### `.github/workflows/build-runtime.yml`
- Triggers on push to main (when package.json changes) or manually
- Builds n8n runtime with Node.js 20.x
- Creates GitHub Release with the runtime zip
- Can specify n8n version via workflow input

## Usage

### System Tray Menu

Right-click the n8n icon in your system tray to access:

- **Start n8n** - Start the n8n server
- **Stop n8n** - Stop the n8n server
- **Restart n8n** - Restart the n8n server
- **Open in Browser** - Open n8n in your default browser
- **Quit** - Stop n8n and exit the application

### Status Indicators

- **Green icon** - n8n is running
- **Gray icon** - n8n is stopped

### Accessing n8n

Once started, n8n is available at: `http://localhost:5678`

## Data Storage

All n8n data is stored in your home directory:

- **Windows**: `C:\Users\<username>\.n8n\`
- **macOS**: `~/.n8n/`

This includes:
- `database.sqlite` - Workflows, credentials, and execution history
- `config` - n8n configuration
- `n8n-desktop.env` - Desktop app settings

## Configuration

### Custom Runtime URL

By default, the app downloads the runtime from GitHub Releases. You can override this:

```bash
# Set custom runtime URL (environment variable)
set RUNTIME_URL=https://your-server.com/n8n-runtime-win-x64.zip
```

### Custom Port

Edit `~/.n8n/n8n-desktop.env` and set:
```
N8N_PORT=5679
```

## Troubleshooting

### n8n won't start

1. Check if port 5678 is already in use
2. Check the logs in `~/.n8n/n8n-desktop-logs/`
3. Try restarting the application
4. Ensure the runtime was downloaded successfully

### Runtime download fails

1. Check your internet connection
2. Try downloading the runtime manually from Releases
3. Extract to `%LOCALAPPDATA%\Programs\n8n Desktop\resources\app\`

### Port conflict

If port 5678 is in use, change it by editing `~/.n8n/n8n-desktop.env`.

### Application crashes

Check the application logs and ensure you have enough free memory. n8n requires at least 1GB of free RAM.

## Project Structure

```
n8n_Desktop_installer/
├── .github/
│   └── workflows/
│       ├── build-windows.yml    # Electron installer CI
│       └── build-runtime.yml    # n8n runtime CI
├── main/
│   ├── index.js                 # Main Electron process
│   ├── tray.js                  # System tray implementation
│   ├── n8nProcess.js            # n8n process management
│   ├── envConfig.js             # Environment configuration
│   ├── utils.js                 # Utility functions
│   └── utils/
│       └── downloadRuntime.js   # Runtime downloader
├── preload/
│   └── preload.js               # Preload script for IPC
├── renderer/
│   └── index.html               # Optional UI
├── scripts/
│   └── build-runtime.js         # Local runtime build script
├── assets/                      # Icons and images
├── build/                       # Build configuration
└── package.json                 # Dependencies and scripts
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Run the application |
| `npm run dev` | Run in development mode |
| `npm run build:win` | Build Windows installer (NSIS) |
| `npm run build:mac` | Build macOS installer (DMG) |
| `npm run build:runtime` | Build n8n runtime zip locally |

## License

MIT License - See LICENSE file for details

**Made with ❤️ for educators and students**

*No more "Docker not found" errors in your workshops!*

## Credits and 🙏 Acknowledgments

- [n8n](https://n8n.io/) - Workflow automation platform
- [Electron](https://www.electronjs.org/) - Desktop application framework
- [electron-builder](https://www.electron.build/) - Build and distribution
