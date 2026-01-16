# Building MizCall Desktop EXE for Microsoft Store

## Prerequisites
- Windows machine (for building .exe)
- Node.js installed
- All dependencies installed

## Step 1: Build the NSIS Installer

On your Windows machine, navigate to the MizCallDesktop folder:

```bash
cd MizCallDesktop

# Install dependencies if not already installed
npm install

# Build the NSIS .exe installer for x64
npm run build:win-nsis
```

This will create the installer at:
```
release/MizCall Desktop-1.0.0-Windows-x64.exe
```

## Step 2: Upload to Your Server

Upload the .exe file to your server at this location:
```
/home/packages/desktop/windows/1.0.0/MizCall-Desktop-Setup-1.0.0.exe
```

### Using SCP (from Windows):
```bash
scp "release/MizCall Desktop-1.0.0-Windows-x64.exe" root@your-server:/home/packages/desktop/windows/1.0.0/MizCall-Desktop-Setup-1.0.0.exe
```

### Or using WinSCP/FileZilla:
1. Connect to your server
2. Navigate to `/home/packages/desktop/windows/1.0.0/`
3. Upload the file and rename it to: `MizCall-Desktop-Setup-1.0.0.exe`

## Step 3: Set Proper Permissions

On your server:
```bash
sudo chmod 644 /home/packages/desktop/windows/1.0.0/MizCall-Desktop-Setup-1.0.0.exe
```

## Step 4: Test Download URL

Test the URL:
```bash
curl -I https://mizcall.com/downloads/desktop/windows/1.0.0/MizCall-Desktop-Setup-1.0.0.exe
```

You should see: `HTTP/1.1 200 OK`

## Step 5: Microsoft Store Submission

In Microsoft Partner Center, use this Package URL:
```
https://mizcall.com/downloads/desktop/windows/1.0.0/MizCall-Desktop-Setup-1.0.0.exe
```

**Architecture:** x64

## For Future Updates

When releasing version 1.0.1:

1. Update `version` in `package.json` to `1.0.1`
2. Build: `npm run build:win-nsis`
3. Upload to: `/home/packages/desktop/windows/1.0.1/MizCall-Desktop-Setup-1.0.1.exe`
4. Submit new URL to Microsoft Store

## File Size Information

The .exe installer will be significantly smaller than the MSIX:
- MSIX: ~497 MB
- NSIS .exe: ~150-200 MB (compressed installer)

## Troubleshooting

### Build fails on Windows:
- Make sure all dependencies are installed: `npm install`
- Delete `node_modules` and reinstall
- Check that you have enough disk space

### Icon issues:
- Make sure `assets/Icons512/Group 6.png` exists
- Convert PNG to ICO format for better results (optional)

### Silent Installation (if needed):
The installer supports silent mode:
```bash
MizCall-Desktop-Setup-1.0.0.exe /S
```

## Notes

- The NSIS installer is better for Microsoft Store URL submission
- Users will download and run the installer
- Auto-update functionality can be added later
- The installer includes uninstaller automatically
