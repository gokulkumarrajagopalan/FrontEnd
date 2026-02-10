# 🚀 Talliffy - Standalone Executable Build Guide

## 📋 Overview

This guide will help you build a **production-ready standalone executable** of Talliffy that doesn't require Python installation on the target machine.

---

## 🛠️ Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **Python** (3.8 or higher) - Only for building, not for deployment
   - Download: https://www.python.org/downloads/
   - Verify: `python --version`

3. **PyInstaller** - To bundle Python scripts
   ```bash
   pip install pyinstaller
   ```

4. **NSIS** (Optional, for advanced installer customization)
   - Download: https://nsis.sourceforge.io/Download

---

## 📦 Step 1: Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
cd python
pip install -r requirements.txt
cd ..
```

---

## 🔧 Step 2: Bundle Python Scripts

### Option A: Using the Automated Script

```bash
npm run bundle-python
```

### Option B: Manual Bundling

```bash
cd python

# Bundle each Python script to standalone executable
pyinstaller --onefile --windowed --name sync_vouchers sync_vouchers.py
pyinstaller --onefile --windowed --name incremental_sync incremental_sync.py
pyinstaller --onefile --windowed --name sync_master sync_master.py
pyinstaller --onefile --windowed --name tally_api tally_api.py
pyinstaller --onefile --windowed --name fetch_master_data fetch_master_data.py
pyinstaller --onefile --windowed --name list_tally_companies list_tally_companies.py
pyinstaller --onefile --windowed --name sync_worker sync_worker.py

# Copy executables to resources directory
cd ..
mkdir -p resources/python/bin
copy python\dist\*.exe resources\python\bin\
```

**Python Bundling Options Explained:**
- `--onefile`: Create a single executable file
- `--windowed`: Don't show console window (use `--console` for debugging)
- `--name`: Output executable name
- `--hidden-import`: Include hidden dependencies (if needed)
- `--icon`: Add custom icon (`.ico` file)

---

## 🏗️ Step 3: Build Electron Application

### Development Build (with debugging)

```bash
npm run pack
```
This creates a development build in `dist/` without installation package.

### Production Build (NSIS Installer)

```bash
npm run dist
```

This creates:
- ✅ Windows Installer (`.exe`) in `dist/`
- ✅ Portable executable
- ✅ All bundled Python scripts included

### Portable Build Only

```bash
npm run build-exe
```

Creates a portable `.exe` that can run from any location (USB, network drive).

---

## 📁 Step 4: Verify Build Output

After building, check the `dist/` directory:

```
dist/
├── Tallify Setup 1.0.0.exe      # Windows installer (NSIS)
├── Tallify-1.0.0.exe            # Portable version
└── win-unpacked/                # Unpacked directory (for testing)
    ├── Tallify.exe              # Main executable
    ├── resources/
    │   └── python/
    │       └── bin/             # Bundled Python executables
    │           ├── sync_vouchers.exe
    │           ├── incremental_sync.exe
    │           └── ...
    └── ...
```

---

## ⚙️ Step 5: Update electron-builder Configuration

Edit `package.json` to customize the build:

```json
{
  "build": {
    "appId": "com.tallify.desktop",
    "productName": "Talliffy Enterprise",
    "copyright": "Copyright © 2024 Talliffy Team",
    "win": {
      "target": ["nsis", "portable"],
      "icon": "assets/brand/icon.ico",
      "requestedExecutionLevel": "asInvoker"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "allowElevation": true,
      "installerIcon": "assets/brand/installer.ico",
      "uninstallerIcon": "assets/brand/uninstaller.ico",
      "installerHeaderIcon": "assets/brand/header.ico",
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "Talliffy",
      "license": "LICENSE.txt",
      "artifactName": "${productName} Setup ${version}.${ext}"
    },
    "files": [
      "src/**/*",
      "package.json",
      "!**/*.ts",
      "!**/*.map"
    ],
    "extraResources": [
      {
        "from": "resources/python/bin",
        "to": "python/bin",
        "filter": ["**/*"]
      },
      {
        "from": "database",
        "to": "database",
        "filter": ["**/*.sql"]
      }
    ],
    "directories": {
      "output": "dist",
      "buildResources": "assets"
    }
  }
}
```

---

## 🔄 Step 6: Update Python Execution Paths in Code

Update `src/main/main.js` to use bundled Python executables:

```javascript
const path = require('path');
const { app } = require('electron');

// Function to get Python executable path
function getPythonPath(scriptName) {
    if (app.isPackaged) {
        // Production: Use bundled executables
        return path.join(
            process.resourcesPath,
            'python',
            'bin',
            `${scriptName}.exe`
        );
    } else {
        // Development: Use Python interpreter
        return 'python';
    }
}

// Example: Running sync_vouchers
const { spawn } = require('child_process');

function runVoucherSync(companyGuid) {
    const pythonPath = getPythonPath('sync_vouchers');
    
    if (app.isPackaged) {
        // Run executable directly
        const process = spawn(pythonPath, [
            companyGuid,
            // ... other arguments
        ]);
    } else {
        // Run with Python interpreter
        const process = spawn('python', [
            'python/sync_vouchers.py',
            companyGuid,
            // ... other arguments
        ]);
    }
    
    process.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });
    
    process.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });
    
    process.on('close', (code) => {
        console.log(`Process exited with code ${code}`);
    });
}
```

---

## 🧪 Step 7: Test the Build

### Test Portable Version

1. Copy `Tallify-1.0.0.exe` to a clean folder
2. Double-click to run
3. Test all sync operations
4. Verify no Python dependency errors

### Test Installer Version

1. Run `Tallify Setup 1.0.0.exe`
2. Install to `C:\Program Files\Talliffy`
3. Launch from Start Menu
4. Test all features

### Common Issues & Solutions

**Issue:** Python scripts not found
- **Solution:** Check `extraResources` in `package.json`
- Verify files exist in `dist/win-unpacked/resources/python/bin/`

**Issue:** "Python not installed" error
- **Solution:** Update code to use bundled executables (Step 6)
- Check `app.isPackaged` logic

**Issue:** Installer fails to start
- **Solution:** Run as Administrator
- Check antivirus isn't blocking

**Issue:** Missing DLL errors
- **Solution:** Use `--collect-all` in PyInstaller:
  ```bash
  pyinstaller --onefile --collect-all requests --collect-all axios sync_vouchers.py
  ```

---

## 📦 Step 8: Create Distributable Package

### Zip for Distribution

```bash
# Windows
powershell Compress-Archive -Path "dist/Tallify-1.0.0.exe" -DestinationPath "Talliffy-v1.0.0-Portable.zip"
powershell Compress-Archive -Path "dist/Tallify Setup 1.0.0.exe" -DestinationPath "Talliffy-v1.0.0-Installer.zip"
```

### Upload to Release Platform

1. Create a new release on GitHub/GitLab
2. Upload both `.zip` files
3. Include release notes:

```markdown
## Talliffy v1.0.0 - Production Release

### 📥 Download Options

**Installer (Recommended)**
- `Talliffy-v1.0.0-Installer.zip` (Windows 10/11)
- Full installation with Start Menu shortcuts
- Automatic updates enabled

**Portable**
- `Talliffy-v1.0.0-Portable.zip`
- No installation required
- Run from USB or network drive

### ✨ Features

- ✅ No Python installation required
- ✅ Automatic Tally Prime sync
- ✅ Modern UI with dark mode support
- ✅ Real-time notifications
- ✅ Advanced settings panel

### 📋 System Requirements

- Windows 10 or higher
- 4GB RAM (8GB recommended)
- 500MB free disk space
- Tally Prime installed
- Internet connection for backend sync

### 🚀 Installation

1. Download installer
2. Run `Tallify Setup 1.0.0.exe`
3. Follow installation wizard
4. Launch from Start Menu

### 🔧 First-Time Setup

1. Open Settings (⚙️)
2. Configure Tally Port (default: 9000)
3. Set Backend URL (default: http://localhost:8080)
4. Import your first company
5. Start syncing!

### 🐛 Known Issues

- None reported

### 📞 Support

Email: support@talliffy.com
Docs: https://docs.talliffy.com
```

---

## 🔒 Step 9: Code Signing (Optional but Recommended)

### Why Sign Your App?

- Removes "Unknown Publisher" warning
- Increases user trust
- Required for some enterprise environments

### Get a Code Signing Certificate

1. Purchase from a Certificate Authority (CA):
   - DigiCert
   - Sectigo
   - GlobalSign

2. Or use a self-signed certificate (for testing):
   ```bash
   # Create self-signed certificate (Windows)
   New-SelfSignedCertificate -Subject "CN=Talliffy, O=Talliffy Inc" -Type CodeSigning -CertStoreLocation Cert:\CurrentUser\My
   ```

### Configure Signing in package.json

```json
{
  "build": {
    "win": {
      "certificateFile": "certs/certificate.pfx",
      "certificatePassword": "YOUR_PASSWORD",
      "signingHashAlgorithms": ["sha256"]
    }
  }
}
```

### Or use environment variables

```bash
set CSC_LINK=path/to/certificate.pfx
set CSC_KEY_PASSWORD=your_password
npm run dist
```

---

## 🔄 Step 10: Auto-Update Setup (Optional)

### Using electron-updater

1. **Install electron-updater:**
   ```bash
   npm install electron-updater
   ```

2. **Add to main.js:**
   ```javascript
   const { autoUpdater } = require('electron-updater');

   app.on('ready', () => {
       // Check for updates on startup
       autoUpdater.checkForUpdatesAndNotify();
   });

   autoUpdater.on('update-available', () => {
       dialog.showMessageBox({
           type: 'info',
           title: 'Update Available',
           message: 'A new version is available. Download now?',
           buttons: ['Download', 'Later']
       });
   });

   autoUpdater.on('update-downloaded', () => {
       dialog.showMessageBox({
           type: 'info',
           title: 'Update Ready',
           message: 'Update downloaded. Restart to apply?',
           buttons: ['Restart', 'Later']
       }).then((result) => {
           if (result.response === 0) {
               autoUpdater.quitAndInstall();
           }
       });
   });
   ```

3. **Configure update server in package.json:**
   ```json
   {
     "build": {
       "publish": {
         "provider": "github",
         "owner": "your-username",
         "repo": "talliffy"
       }
     }
   }
   ```

---

## 📊 Build Size Optimization

### Reduce Bundle Size

1. **Remove unused dependencies:**
   ```bash
   npm prune --production
   ```

2. **Exclude dev files:**
   ```json
   {
     "build": {
       "files": [
         "!**/*.ts",
         "!**/*.map",
         "!**/test/**",
         "!**/*.spec.js"
       ]
     }
   }
   ```

3. **Compress Python executables:**
   ```bash
   pyinstaller --onefile --strip sync_vouchers.py
   ```

4. **Use UPX compression (reduces size by 50-70%):**
   ```bash
   pip install pyinstaller[upx]
   pyinstaller --onefile --upx-dir=/path/to/upx sync_vouchers.py
   ```

### Expected Build Sizes

- Uncompressed: ~200-300 MB
- Compressed installer: ~100-150 MB
- Portable executable: ~150-200 MB

---

## ✅ Final Checklist

Before releasing:

- [ ] All Python scripts bundled successfully
- [ ] Electron build completes without errors
- [ ] Installer tested on clean Windows machine
- [ ] Portable version tested from USB drive
- [ ] All sync operations work without Python installed
- [ ] Settings page loads and saves correctly
- [ ] Notifications display properly
- [ ] No console errors in production
- [ ] About page shows correct version
- [ ] Auto-update works (if enabled)
- [ ] Code signed (if applicable)
- [ ] Release notes prepared
- [ ] Documentation updated

---

## 🎯 Quick Build Commands

```bash
# Complete build process (recommended)
npm run bundle-python && npm run dist

# Development build (fast)
npm run pack

# Portable only
npm run build-exe

# Clean and rebuild
rmdir /s /q dist node_modules
npm install
npm run bundle-python && npm run dist
```

---

## 📚 Additional Resources

- **Electron Builder Docs:** https://www.electron.build/
- **PyInstaller Manual:** https://pyinstaller.org/en/stable/
- **NSIS Documentation:** https://nsis.sourceforge.io/Docs/

---

## 🆘 Troubleshooting

### Build fails with "Cannot find module"

**Solution:**
```bash
npm install --save-dev electron-builder
npm rebuild
```

### PyInstaller bundling fails

**Solution:**
```bash
pip install --upgrade pyinstaller
pip install --upgrade pip setuptools wheel
```

### Installer doesn't start

**Solution:**
- Run as Administrator
- Disable antivirus temporarily
- Check Windows SmartScreen settings

### "Python not found" in production

**Solution:**
- Verify `app.isPackaged` check in code
- Check `extraResources` configuration
- Ensure `.exe` files are in `resources/python/bin/`

---

## 📞 Support

For build issues:
- Email: support@talliffy.com
- GitHub Issues: https://github.com/talliffy/talliffy/issues
- Discord: https://discord.gg/talliffy

---

**Happy Building! 🚀**
