# Call for Testers: n8n Desktop v1.0.1

We've fixed several critical issues with the n8n Desktop installer and need your help testing it!

## What Was Fixed

- **n8n module not included**: The n8n automation engine was not being bundled correctly in the installer
- **Binary path issue**: Production builds couldn't find the n8n executable due to missing symlinks
- **Native module conflicts**: Build process was corrupting some dependencies

## Download

Download the latest installer from our [Releases page](https://github.com/lerlerchan/n8n_Desktop_installer/releases/tag/v1.0.1)

## Testing Checklist

Please test the following and report any issues:

- [ ] **Installation**: Does the installer run without errors?
- [ ] **First Launch**: Does the app start and show a system tray icon?
- [ ] **n8n Startup**: Does n8n start automatically? (Check for green tray icon)
- [ ] **Browser Access**: Can you access http://localhost:5678?
- [ ] **Setup Page**: Does the n8n setup/login page load correctly?
- [ ] **Tray Menu**: Do the Start/Stop/Restart options work?
- [ ] **Persistence**: After restarting the app, is your data still there?
- [ ] **Uninstall**: Does the uninstaller work cleanly?

## How to Report Bugs

If you encounter any issues:

1. Open a new issue at: https://github.com/lerlerchan/n8n_Desktop_installer/issues/new
2. Include:
   - Windows version (10 or 11)
   - RAM amount
   - What happened vs what you expected
   - Any error messages you saw
   - Screenshots if possible

## Environment Details

- n8n version: 1.70.0
- Electron version: 28.0.0
- Supported OS: Windows 10/11 (64-bit)

## Thank You!

Your feedback helps make n8n Desktop better for students, educators, and everyone learning automation!

---
Labels: `testing`, `help wanted`
