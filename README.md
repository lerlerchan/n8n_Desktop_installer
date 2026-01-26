# n8n Desktop Installer

A desktop application that bundles n8n with a simple system tray interface. Run n8n locally without Docker or manual setup - just install and run.

## Features

- **One-click installation** - No Docker, no command line required
- **System tray interface** - Start/Stop/Restart n8n from the tray icon
- **Auto-start** - n8n starts automatically when the app launches
- **Browser integration** - Automatically opens your browser to n8n
- **Persistent data** - Your workflows and credentials are stored locally

## Requirements

- Windows 10/11 (64-bit) or macOS 10.15+
- 4GB RAM minimum (8GB recommended)
- 2GB free disk space

## Installation

### From Release

1. Download the latest installer from the Releases page
2. Run the installer (`.exe` for Windows, `.dmg` for macOS)
3. Follow the installation wizard
4. n8n Desktop will start automatically

### From Source

```bash
# Clone the repository
git clone https://github.com/yourusername/n8n_Desktop_installer.git
cd n8n_Desktop_installer

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build Windows installer
npm run build:win

# Build macOS installer (on macOS only)
npm run build:mac
```

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

## Troubleshooting

### n8n won't start

1. Check if port 5678 is already in use
2. Check the logs in `~/.n8n/n8n-desktop-logs/`
3. Try restarting the application

### Port conflict

If port 5678 is in use, you can change it by editing `~/.n8n/n8n-desktop.env` and setting a different `N8N_PORT` value.

### Application crashes

Check the application logs and ensure you have enough free memory. n8n requires at least 1GB of free RAM to run properly.

## Development

### Project Structure

```
n8n_Desktop_installer/
├── main/
│   ├── index.js        # Main Electron process
│   ├── tray.js         # System tray implementation
│   ├── n8nProcess.js   # n8n process management
│   ├── envConfig.js    # Environment configuration
│   └── utils.js        # Utility functions
├── preload/
│   └── preload.js      # Preload script for IPC
├── renderer/
│   └── index.html      # Optional UI
├── assets/             # Icons and images
├── build/              # Build configuration
└── package.json        # Dependencies and scripts
```

### Scripts

- `npm start` - Run the application
- `npm run dev` - Run in development mode with hot reload
- `npm run build:win` - Build Windows installer (NSIS)
- `npm run build:mac` - Build macOS installer (DMG)

## License

MIT License - See LICENSE file for details

## Credits

- [n8n](https://n8n.io/) - Workflow automation platform
- [Electron](https://www.electronjs.org/) - Desktop application framework
- [electron-builder](https://www.electron.build/) - Build and distribution
