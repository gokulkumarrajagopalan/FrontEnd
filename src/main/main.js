const { app, BrowserWindow, ipcMain, Menu, Notification, Tray, nativeImage, shell, safeStorage, nativeTheme } = require("electron");
const { autoUpdater } = require("electron-updater");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const security = require("./security");
const { findPython } = require("./python-finder");
const { registerVoucherSyncHandler } = require("./voucher-sync-handler");
const { registerBillsSyncHandler } = require("./bills-sync-handler");
const { DEFAULT_BACKEND_URL, ALLOWED_EXTERNAL_ORIGINS } = require("./app-urls");

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance — reveal/focus our (possibly
    // hidden/tray) window instead of starting another copy.
    if (typeof showMainWindow === 'function') {
      showMainWindow();
    } else if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Check if running in development mode
const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

// Load environment variables from .env if present (dev and unpackaged production)
{
  const _envPath = path.join(__dirname, '../../.env');
  try {
    if (fs.existsSync(_envPath)) {
      require('dotenv').config({ path: _envPath });
    }
  } catch (_) {}
}

// Also load from persistent userData config.json (written by settings page)
// This runs before app.ready so we use a sync read. appDataPath is defined below.
function _loadUserConfig() {
  try {
    const cfgPath = path.join(app.getPath('appData'), 'DesktopApp', 'config.json');
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
      if (cfg.backendUrl) {
        process.env.BACKEND_URL = cfg.backendUrl;
      }
    }
  } catch (_) {}
}
_loadUserConfig();

// Only log in development mode
if (isDev) {
  console.log("🔥 main.js loaded");
  console.log("🔧 BACKEND_URL:", process.env.BACKEND_URL);
}

let mainWindow;
let tray = null;
let syncWorker = null;
let currentWorkerProcess = null;

// True only once the user explicitly chose Quit; otherwise closing the window
// just hides it so sync keeps running in the background (tray app behaviour).
app.isQuitting = false;
// Start hidden when launched at login (background process).
const startHidden = process.argv.includes('--hidden');

// Global registry of all active child processes (for cancel/kill)
const activeChildProcesses = new Set();

const appDataPath = path.join(app.getPath('appData'), 'DesktopApp');
if (!fs.existsSync(appDataPath)) {
  fs.mkdirSync(appDataPath, { recursive: true });
}
app.setPath('userData', appDataPath);

app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-default-apps');
app.commandLine.appendSwitch('disable-preconnect');
app.commandLine.appendSwitch('no-first-run');
app.commandLine.appendSwitch('no-default-browser-check');
app.commandLine.appendSwitch('disable-sync');
app.commandLine.appendSwitch('disable-extensions');

// Set app identity for Windows notifications (shows "Talliffy" instead of "electron.app.Electron")
app.setAppUserModelId('Talliffy');

if (!isDev) {
  app.commandLine.appendSwitch('disable-dev-tools');
}

function createWindow() {
  if (isDev) console.log("🔥 createWindow called");

  // Hide menu bar in production
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 750,
    minWidth: 480,
    minHeight: 560,
    show: false,
    icon: path.join(__dirname, '..', '..', 'assets', 'icon.png'),
    autoHideMenuBar: !isDev,  // Auto-hide menu bar in production
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      enableRemoteModule: false,
      disableHtmlCache: true,
      sandbox: true,
      cache: false,
      devTools: isDev,  // Disable DevTools in production
      // Keep timers (the background sync scheduler's setInterval) running at full
      // rate even when the window is hidden/minimized to the tray.
      backgroundThrottling: false
    }
  });
  if (isDev) console.log("🔥 BrowserWindow created");

  mainWindow.loadFile(path.join(__dirname, "index.html"));
  if (isDev) console.log("🔥 index.html loading...");

  mainWindow.once('ready-to-show', () => {
    if (startHidden) {
      if (isDev) console.log("🔥 Launched hidden (background) - staying in tray");
      return;
    }
    if (isDev) console.log("🔥 Window ready to show - displaying now");
    mainWindow.show();
  });

  setTimeout(() => {
    if (!startHidden && mainWindow && !mainWindow.isVisible()) {
      if (isDev) console.log("🔥 Timeout - forcing window.show()");
      mainWindow.show();
    }
  }, 2000);

  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error("Page failed to load:", errorDescription, errorCode);
    // In production, attempt to reload
    if (!isDev && mainWindow) {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadFile(path.join(__dirname, "index.html"));
        }
      }, 2000);
    }
  });

  mainWindow.webContents.on("crashed", (event, killed) => {
    console.error("Renderer process crashed, killed:", killed);
    // Auto-recover in production
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.reload();
    }
  });

  mainWindow.webContents.on("unresponsive", () => {
    console.warn("Renderer process became unresponsive");
  });

  mainWindow.webContents.on("responsive", () => {
    console.log("Renderer process became responsive again");
  });

  // Only open DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Disable keyboard shortcuts for DevTools in production
  if (!isDev) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (input.key === 'F12' ||
        (input.control && input.shift && (input.key === 'I' || input.key === 'i')) ||
        (input.control && input.shift && (input.key === 'J' || input.key === 'j')) ||
        (input.control && (input.key === 'U' || input.key === 'u'))) {
        event.preventDefault();
      }
    });
  }

  // Close-to-tray: hide the window instead of quitting so background sync keeps
  // running. The app only truly quits via the tray "Quit" item (app.isQuitting).
  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (tray && !app._trayHintShown) {
        app._trayHintShown = true;
        try {
          if (process.platform === 'win32' && typeof tray.displayBalloon === 'function') {
            tray.displayBalloon({
              title: 'Talliffy is still running',
              content: 'Sync continues in the background. Right-click the tray icon to quit.'
            });
          }
        } catch (_) { /* best effort */ }
      }
      return false;
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    stopSyncWorker();
  });
}

// Bring the (possibly hidden) window to the foreground, recreating it if needed.
function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

// System tray so the app behaves like other background apps (Slack/Spotify):
// closing the window keeps it running; the tray gives Open / Sync Now / Quit.
function createTray() {
  if (tray) return;
  try {
    const iconPath = path.join(__dirname, '..', '..', 'assets', 'icon.png');
    let trayImage = nativeImage.createFromPath(iconPath);
    if (!trayImage.isEmpty()) {
      trayImage = trayImage.resize({ width: 16, height: 16 });
    }
    tray = new Tray(trayImage.isEmpty() ? iconPath : trayImage);
    tray.setToolTip('Talliffy');

    const contextMenu = Menu.buildFromTemplate([
      { label: 'Open Talliffy', click: () => showMainWindow() },
      {
        label: 'Sync Now',
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('trigger-background-sync');
          } else {
            // No window alive to run the renderer scheduler — open one.
            showMainWindow();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Quit Talliffy',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => showMainWindow());
    if (isDev) console.log('🔔 System tray created');
  } catch (e) {
    if (isDev) console.error('Failed to create tray:', e);
  }
}

// ========== AUTO UPDATER SETUP ==========
// Configure loggers
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

// Download updates automatically once found, and install pending updates on quit.
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// Background auto-check toggle (driven by the Update App page checkbox).
let autoUpdateEnabled = true;

// Safe send to the renderer (window may be hidden in the tray or gone).
function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    mainWindow.webContents.send(channel, payload);
  }
}

// Notify the frontend using IPC
function sendUpdateStatusToWindow(text, progressObj = null) {
  if (isDev) {
    console.log(`[AutoUpdater] ${text}`);
  }
  sendToRenderer('update-message', { text, progressObj });
}

autoUpdater.on('checking-for-update', () => {
  sendUpdateStatusToWindow('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  sendUpdateStatusToWindow('Update available. Downloading...', null);
  sendToRenderer('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
  sendUpdateStatusToWindow('App is up to date.');
  sendToRenderer('update-not-available', info);
});

autoUpdater.on('error', (err) => {
  sendUpdateStatusToWindow('Error in auto-updater.');
  sendToRenderer('update-error', err == null ? 'Unknown error' : err.toString());
});

autoUpdater.on('download-progress', (progressObj) => {
  // progressObj contains bytesPerSecond, percent, total, transferred
  sendUpdateStatusToWindow('Downloading update...', progressObj);
  sendToRenderer('download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
  sendUpdateStatusToWindow('Update downloaded. Ready to install.');
  sendToRenderer('update-downloaded', info);
  // Surface a native toast even if the user isn't on the Update page.
  try {
    if (Notification.isSupported()) {
      const n = new Notification({
        title: 'Talliffy — Update ready',
        body: `Version ${info && info.version ? info.version : ''} downloaded. Restart to install.`
      });
      n.on('click', () => showMainWindow());
      n.show();
    }
  } catch (_) { /* best effort */ }
});

// Run an update check now. Returns the electron-updater promise (or null in dev).
function runUpdateCheck() {
  if (isDev) {
    sendUpdateStatusToWindow('Skipping auto-update check in development mode.');
    return null;
  }
  try {
    return autoUpdater.checkForUpdates();
  } catch (e) {
    sendToRenderer('update-error', e.message || 'Update check failed');
    return null;
  }
}

ipcMain.on('check-for-updates', () => {
  runUpdateCheck();
});

ipcMain.on('set-auto-update', (event, payload) => {
  autoUpdateEnabled = !!(payload && payload.enabled);
});

ipcMain.on('quit-and-install-update', () => {
  app.isQuitting = true;       // allow the close-to-tray handler to actually exit
  autoUpdater.quitAndInstall();
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});


function startSyncWorker(config = {}) {
  if (syncWorker) {
    if (isDev) console.log("Sync worker already running");
    return;
  }

  try {
    const { command, args, cwd } = getWorkerCommand();
    // Default mode is daemon, so we don't need to pass --mode daemon explicitly if default, 
    // but explicit is better. However, existing sync_worker defaults to daemon.
    // Let's pass it anyway if args is not empty, or just rely on default.
    // The previous implementation didn't pass args.
    // Let's passed --mode daemon just to be safe if we changed default.

    // Actually, sync_worker.py defaults to daemon if no mode.
    // But let's check getWorkerCommand args. 
    // It returns [scriptPath] for dev. 
    const finalArgs = [...args]; // We can add ['--mode', 'daemon'] if we want

    if (isDev) console.log(`Starting sync worker with: ${command} ${finalArgs.join(' ')}`);

    syncWorker = spawn(command, finalArgs, {
      cwd: cwd,
      stdio: ["pipe", "pipe", "pipe"]
    });

    const settings = {
      tallyHost: config.tallyHost || 'localhost',
      tallyPort: config.tallyPort || 9000,
      syncInterval: config.syncInterval || 30
    };

    try {
      security.validateSettings(settings);
    } catch (error) {
      if (isDev) console.error("❌ Invalid settings:", error.message);
      syncWorker.kill();
      syncWorker = null;
      return;
    }

    syncWorker.stdin.write(JSON.stringify(settings) + '\n');
    syncWorker.stdin.end();

    syncWorker.stdout.on("data", (data) => {
      const output = data.toString().trim();
      if (output) {
        try {
          const result = JSON.parse(output);
          const type = result.type || 'unknown';
          const timestamp = new Date().toLocaleTimeString();

          if (isDev) {
            if (type === 'worker_started') {
              console.log(`\n${'='.repeat(60)}`);
              console.log(`🚀 [${timestamp}] SYNC WORKER STARTED`);
              console.log(`   Port: ${result.data?.tally_port || 9000}`);
              console.log(`   Interval: ${result.data?.sync_interval || 30} minutes`);
              console.log(`${'='.repeat(60)}\n`);
            } else if (type === 'sync_started') {
              console.log(`\n📤 [${timestamp}] SYNC STARTED`);
              console.log(`   Port: ${result.data?.tally_port || 'N/A'}`);
            } else if (type === 'sync_completed') {
              console.log(`✅ [${timestamp}] SYNC COMPLETED`);
              console.log(`   Last Sync: ${result.data?.last_sync_time || 'N/A'}`);
              console.log(`   Next Sync: ${new Date(result.data?.next_sync_time * 1000).toLocaleTimeString() || 'N/A'}\n`);
            } else if (type === 'sync_error') {
              console.error(`\n❌ [${timestamp}] SYNC ERROR`);
              console.error(`   Error: ${result.data?.error || 'Unknown error'}\n`);
            } else if (type === 'worker_stopped') {
              console.log(`\n⏹️  [${timestamp}] SYNC WORKER STOPPED`);
              console.log(`   Last Sync: ${result.data?.last_sync_time || 'Never'}\n`);
            }
          }

          if (mainWindow) {
            mainWindow.webContents.send("sync-update", result);
          }
        } catch (e) {
          if (isDev) console.log(`Sync Worker: ${output}`);
        }
      }
    });

    syncWorker.stderr.on("data", (data) => {
      if (isDev) console.error(`Sync Worker Error: ${data}`);
      if (mainWindow) {
        mainWindow.webContents.send("sync-error", data.toString());
      }
    });

    syncWorker.on("error", (err) => {
      if (isDev) console.error("Failed to start sync worker:", err);
      syncWorker = null;
    });

    syncWorker.on("close", (code) => {
      if (isDev) console.log(`Sync worker process exited with code ${code}`);
      syncWorker = null;
    });

    if (isDev) console.log("Sync worker started successfully");
  } catch (error) {
    if (isDev) console.error("Error starting sync worker:", error);
    if (mainWindow) {
      mainWindow.webContents.send("sync-error", error.message);
    }
  }
}

function stopSyncWorker() {
  if (syncWorker) {
    if (isDev) console.log("Stopping sync worker");
    syncWorker.kill();
    syncWorker = null;
  }
  if (currentWorkerProcess) {
    if (isDev) console.log("Killing active worker process");
    currentWorkerProcess.kill('SIGTERM');
    currentWorkerProcess = null;
  }
  // Kill all tracked child processes (voucher-sync, bills-sync, etc.)
  if (activeChildProcesses.size > 0) {
    if (isDev) console.log(`Killing ${activeChildProcesses.size} active child process(es)`);
    for (const child of activeChildProcesses) {
      try {
        child.kill('SIGTERM');
        // Force kill after 3s if SIGTERM doesn't work
        setTimeout(() => {
          try { if (child.exitCode === null) child.kill('SIGKILL'); } catch (_) {}
        }, 3000);
      } catch (e) {
        if (isDev) console.error('Error killing child process:', e.message);
      }
    }
    activeChildProcesses.clear();
  }
}

ipcMain.on("start-sync", (event, config) => {
  if (isDev) console.log("Received start-sync request");
  startSyncWorker(config);
  event.reply("sync-started", { status: "Sync started" });
});

ipcMain.on("stop-sync", (event) => {
  if (isDev) console.log("Received stop-sync request");
  stopSyncWorker();
  event.reply("sync-stopped", { status: "Sync stopped" });
});

ipcMain.on("check-sync-status", (event) => {
  const isRunning = syncWorker !== null;
  event.reply("sync-status", { running: isRunning });
});

ipcMain.handle("get-sync-status", async () => {
  return {
    running: syncWorker !== null,
    timestamp: new Date().toISOString()
  };
});

// ========== SYSTEM NOTIFICATION HANDLER ==========
ipcMain.handle("show-system-notification", async (event, { title, body, urgency }) => {
  try {
    if (Notification.isSupported()) {
      const _escXml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const _title = _escXml(title || 'Talliffy');
      const _body = _escXml(body || '');
      const _iconPath = path.join(__dirname, 'assets', 'brand', 'talliffy-icon.png').replace(/\\/g, '/');
      const notification = new Notification({
        title: title || 'Talliffy',
        body: body || '',
        icon: path.join(__dirname, 'assets', 'brand', 'talliffy-icon.png'),
        urgency: urgency || 'normal',
        silent: false,
        toastXml: `<toast><visual><binding template="ToastGeneric"><text>${_title}</text><text>${_body}</text><image placement="appLogoOverride" src="${_iconPath}" hint-crop="circle"/></binding></visual></toast>`
      });
      notification.show();

      // Click to focus app window
      notification.on('click', () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
        }
      });

      return { success: true };
    }
    return { success: false, message: 'Notifications not supported' };
  } catch (error) {
    if (isDev) console.error('Notification error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.on("trigger-sync", (event, config) => {
  if (isDev) console.log("Trigger sync with config");
  startSyncWorker(config);
});

ipcMain.on("update-sync-settings", (event, settings) => {
  try {
    security.validateSettings(settings);
    if (isDev) console.log("Sync settings updated");
    stopSyncWorker();
    setTimeout(() => {
      startSyncWorker(settings);
    }, 500);
  } catch (error) {
    if (isDev) console.error("❌ Invalid settings:", error.message);
    event.reply("settings-error", { error: error.message });
  }
});

// Helper to get worker command based on environment
function getWorkerCommand() {
  const isDev = Boolean(process.env.NODE_ENV === "development" || !app.isPackaged || process.defaultApp);

  if (isDev) console.log(`🔍 Environment Check: isDev=${isDev} (NODE_ENV=${process.env.NODE_ENV}, isPackaged=${app.isPackaged}, defaultApp=${process.defaultApp})`);

  if (isDev) {
    // In dev, prefer Python source so code changes take effect immediately
    const scriptPath = path.join(__dirname, "../..", "python", "sync_worker.py");
    if (fs.existsSync(scriptPath)) {
      try {
        const pythonPath = findPython();
        const cwd = path.join(__dirname, "../..", "python");
        if (isDev) console.log(`✅ Using Python source: ${pythonPath} ${scriptPath}`);
        return { command: pythonPath, args: [scriptPath], cwd };
      } catch (e) {
        if (isDev) console.log(`⚠️ Python not found, falling back to bundled EXE`);
      }
    }

    // Fallback to bundled executable if Python source or interpreter not available
    const devExeCandidates = [
      path.join(__dirname, "../..", "resources", "bin", "sync_worker.exe"),
      path.join(__dirname, "../..", "resources", "python", "dist", "sync_worker.exe")
    ];

    for (const exePath of devExeCandidates) {
      if (fs.existsSync(exePath)) {
        const cwd = path.dirname(exePath);
        if (isDev) console.log(`✅ Using bundled sync_worker: ${exePath}`);
        return { command: exePath, args: [], cwd };
      }
    }

    throw new Error('No Python interpreter or bundled sync_worker.exe found');
  } else {
    // In prod, use the bundled executable
    // The executable is in resources/bin/sync_worker.exe
    // When packaged, __dirname is inside app.asar/src/main
    // We need to go up to app.asar/.. -> resources

    // Electron resources path
    const resourcesPath = process.resourcesPath;
    const exeName = process.platform === "win32" ? "sync_worker.exe" : "sync_worker";
    const exePath = path.join(resourcesPath, "bin", exeName);
    const cwd = path.join(resourcesPath, "bin");

    if (!fs.existsSync(exePath)) {
      throw new Error(
        `Bundled sync worker not found at: ${exePath}\n` +
        `Please reinstall the application.`
      );
    }

    return { command: exePath, args: [], cwd };
  }
}

// Generic helper to run worker command
async function runWorkerCommand(mode, params = {}) {
  return new Promise((resolve, reject) => {
    const { command, args: workerArgs, cwd } = getWorkerCommand();
    const finalArgs = [...workerArgs, '--mode', mode];

    // Map parameters to CLI flags.
    // SECURITY: auth/device tokens are intentionally NOT mapped to argv — they are
    // passed via the child environment below so they don't appear in OS process
    // listings, Event logs, or crash dumps. Python reads them from env (see
    // sync_worker.py resolve_secret()).
    const argMapping = {
      tallyHost: '--host',
      tallyPort: '--port',
      companyId: '--company-id',
      userId: '--user-id',
      backendUrl: '--backend-url',
      entityType: '--entity-type',
      maxAlterID: '--max-alter-id',
      companyName: '--company-name',
      companyGuid: '--company-guid',
      fromDate: '--from-date',
      toDate: '--to-date',
      lastAlterID: '--last-voucher-alter-id',
      isFirstSync: '--is-first-sync',
      syncCacheFile: '--sync-cache-file',
      deep: '--deep'
    };

    for (const [key, flag] of Object.entries(argMapping)) {
      if (params[key] !== undefined && params[key] !== null) {
        // Boolean flags (store_true in argparse) don't take a value
        if (flag === '--is-first-sync' || flag === '--deep') {
          if (params[key]) finalArgs.push(flag);
        } else {
          finalArgs.push(flag, params[key].toString());
        }
      }
    }

    // Pass secrets via environment (preferred). Also pass on argv as a fallback: the bundled
    // sync_worker.exe may predate env-based secret handling (it doesn't read TALLY_AUTH_TOKEN),
    // in which case env-only delivery leaves it with no token and every backend call 401s. The
    // current Python reads argv first, env as fallback, so this is safe for old and new workers.
    const childEnv = { ...process.env };
    if (params.authToken) {
      childEnv.TALLY_AUTH_TOKEN = params.authToken.toString();
      finalArgs.push('--auth-token', params.authToken.toString());
    }
    if (params.deviceToken) {
      childEnv.TALLY_DEVICE_TOKEN = params.deviceToken.toString();
      finalArgs.push('--device-token', params.deviceToken.toString());
    }

    currentWorkerProcess = spawn(command, finalArgs, {
      cwd: cwd,
      env: childEnv
    });
    const child = currentWorkerProcess;
    activeChildProcesses.add(child);

    // 10 minute timeout to prevent UI indefinite hang
    const timeoutHandle = setTimeout(() => {
      if (isDev) console.error(`Worker timeout exceeded (10m) for ${mode}`);
      child.kill('SIGTERM');
      // Force kill after 5s if SIGTERM fails
      setTimeout(() => {
        try { if (child.exitCode === null) child.kill('SIGKILL'); } catch (_) {}
      }, 5000);
      child.stdout.removeAllListeners();
      child.stderr.removeAllListeners();
      reject(new Error(`Process timed out after 10 minutes for ${mode}`));
    }, 10 * 60 * 1000);

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => output += data.toString());
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
      // In dev mode, always stream stderr so Python logger.error is visible
      if (isDev) {
        const line = data.toString().trim();
        if (line) console.log('[sync-worker]', line);
      }
    });

    child.on('close', (code) => {
      currentWorkerProcess = null;
      activeChildProcesses.delete(child);
      clearTimeout(timeoutHandle);
      // console.log(`Worker exited with code ${code}`);
      if (code === 0 && output.trim()) {
        try {
          const result = JSON.parse(output.trim());
          resolve(result);
        } catch (e) {
          // Fallback: find the last valid JSON line in output
          // (Python logging or print statements may precede the JSON result)
          const lines = output.trim().split('\n');
          for (let i = lines.length - 1; i >= 0; i--) {
            try {
              const parsed = JSON.parse(lines[i].trim());
              resolve(parsed);
              return;
            } catch (_) {
              continue;
            }
          }
          if (isDev) console.error('Failed to parse worker output:', output);
          reject(new Error('Failed to parse worker output'));
        }
      } else if (code === 0 && !output.trim()) {
        // Process exited OK but no stdout — may happen if result was empty
        reject(new Error(errorOutput || 'Worker produced no output'));
      } else {
        if (isDev) console.error('Worker failed:', errorOutput);
        reject(new Error(errorOutput || `Worker failed with code ${code}`));
      }
    });

    child.on('error', (err) => {
      clearTimeout(timeoutHandle);
      if (isDev) console.error('Failed to spawn worker:', err);
      // Fallback for dev environment if python is missing or path issues
      if (err.code === 'ENOENT') {
        reject(new Error(`Executable not found: ${command}`));
      } else {
        reject(err);
      }
    });
  });
}

ipcMain.handle("fetch-license", async (event, { tallyHost, tallyPort } = {}) => {
  try {
    const host = tallyHost || 'localhost';
    const port = security.validatePort(tallyPort || 9000);
    if (isDev) console.log(`📥 fetch-license IPC called on ${host}:${port}`);

    const result = await runWorkerCommand('fetch-license', { tallyHost: host, tallyPort: port });
    if (isDev) console.log("License fetch result:", result.success ? "success" : "failed");
    return result; // Return full object {success, data, error} for renderer validation
  } catch (error) {
    if (isDev) console.error("License fetch error:", error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("check-tally-connection", async (event, { tallyHost, tallyPort } = {}) => {
  try {
    const http = require('http');
    const host = tallyHost || 'localhost';
    const port = security.validatePort(tallyPort || 9000);

    // Validate host: allow only hostnames and IPs
    if (!/^[a-zA-Z0-9.\-]+$/.test(host)) {
      return false;
    }

    const url = `http://${host}:${port}/`;
    if (isDev) console.log(`Checking Tally connection at ${host}:${port}...`);

    return new Promise((resolve) => {
      // Safety timeout to prevent hanging
      const safetyTimeout = setTimeout(() => {
        resolve(false);
      }, 5000);

      const request = http.get(url, { timeout: 3000 }, (response) => {
        clearTimeout(safetyTimeout);
        resolve(true);
      });

      request.on('error', () => {
        clearTimeout(safetyTimeout);
        resolve(false);
      });

      request.on('timeout', () => {
        clearTimeout(safetyTimeout);
        request.destroy();
        resolve(false);
      });
    });
  } catch (error) {
    if (isDev) console.error("Tally connection check error:", error.message);
    return false;
  }
});

if (isDev) console.log("🔥 Registering IPC handlers...");

const { registerMasterDataHandler } = require('./master-data-handler');
registerMasterDataHandler();

// Helper: read backend URL from all possible sources (priority order)
function _resolveBackendUrl() {
  // 1. Already in env (set by dotenv or previous call)
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL;

  // 2. userData config.json (written by settings page)
  try {
    const cfgPath = path.join(app.getPath('userData'), 'config.json');
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
      if (cfg.backendUrl) {
        process.env.BACKEND_URL = cfg.backendUrl;
        return cfg.backendUrl;
      }
    }
  } catch (e) { if (isDev) console.error('config.json read error:', e); }

  // 3. .env file in project root
  {
    const envPath = path.join(__dirname, '../../.env');
    try {
      if (fs.existsSync(envPath)) {
        const cfg = require('dotenv').parse(fs.readFileSync(envPath));
        if (cfg.BACKEND_URL) {
          process.env.BACKEND_URL = cfg.BACKEND_URL;
          return cfg.BACKEND_URL;
        }
      }
    } catch (_) {}
  }

  // 4. Hardcoded fallback
  return DEFAULT_BACKEND_URL;
}

// Provide backend URL to renderer asynchronously
ipcMain.handle('get-backend-url', async () => {
  return _resolveBackendUrl();
});

// Provide backend URL to renderer synchronously (legacy)
ipcMain.on('get-backend-url-sync', (event) => {
  event.returnValue = _resolveBackendUrl();
});

// Save user config (backend URL, etc.) to persistent userData storage
ipcMain.handle('save-config', async (event, config) => {
  try {
    if (!config || typeof config !== 'object') {
      return { success: false, error: 'Invalid config object' };
    }
    // Validate backend URL if provided
    if (config.backendUrl) {
      security.validateBackendUrl(config.backendUrl);
    }
    const cfgPath = path.join(app.getPath('userData'), 'config.json');
    let existing = {};
    if (fs.existsSync(cfgPath)) {
      try {
        const content = fs.readFileSync(cfgPath, 'utf-8').trim();
        if (content) {
          existing = JSON.parse(content);
        }
      } catch (parseError) {
        console.error('Warning: config.json is corrupted, resetting to empty config:', parseError);
      }
    }
    const updated = { ...existing, ...config };
    fs.writeFileSync(cfgPath, JSON.stringify(updated, null, 2), 'utf-8');
    // Also update live env so sync workers spawned later get the new URL
    if (config.backendUrl) process.env.BACKEND_URL = config.backendUrl;
    return { success: true };
  } catch (e) {
    if (isDev) console.error('save-config error:', e);
    return { success: false, error: e.message };
  }
});

// fetch-companies logic moved to use sync_worker
ipcMain.handle("fetch-companies", async (event, { tallyHost, tallyPort } = {}) => {
  try {
    const host = tallyHost || 'localhost';
    const port = security.validatePort(tallyPort || 9000);
    if (isDev) console.log(`Fetching companies from ${host}:${port}...`);

    const result = await runWorkerCommand('fetch-companies', { tallyHost: host, tallyPort: port });
    if (isDev) console.log("Companies fetch result:", result.success ? "success" : "failed");
    return result;
  } catch (error) {
    if (isDev) console.error("Companies fetch error:", error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("sync-groups", async (event, config) => {
  return handleSync(config, "incremental_sync.py", "groups", "Group");
});
if (isDev) console.log("✅ 'sync-groups' IPC handler registered successfully");

ipcMain.handle("sync-ledgers", async (event, config) => {
  return handleSync(config, "incremental_sync.py", "ledgers", "Ledger");
});
if (isDev) console.log("✅ 'sync-ledgers' IPC handler registered successfully");

ipcMain.handle("sync-currencies", async (event, config) => {
  return handleSync(config, "incremental_sync.py", "currencies", "Currency");
});
if (isDev) console.log("✅ 'sync-currencies' IPC handler registered successfully");

ipcMain.handle("sync-cost-categories", async (event, config) => {
  return handleSync(config, "incremental_sync.py", "cost categories", "CostCategory");
});

ipcMain.handle("sync-cost-centers", async (event, config) => {
  return handleSync(config, "incremental_sync.py", "cost centers", "CostCenter");
});

ipcMain.handle("sync-voucher-types", async (event, config) => {
  return handleSync(config, "incremental_sync.py", "voucher types", "VoucherType");
});

ipcMain.handle("sync-tax-units", async (event, config) => {
  return handleSync(config, "incremental_sync.py", "tax units", "TaxUnit");
});

ipcMain.handle("sync-units", async (event, config) => {
  return handleSync(config, "incremental_sync.py", "units", "Unit");
});

ipcMain.handle("sync-stock-groups", async (event, config) => {
  return handleSync(config, "incremental_sync.py", "stock groups", "StockGroup");
});

ipcMain.handle("sync-stock-categories", async (event, config) => {
  return handleSync(config, "incremental_sync.py", "stock categories", "StockCategory");
});

ipcMain.handle("sync-stock-items", async (event, config) => {
  return handleSync(config, "incremental_sync.py", "stock items", "StockItem");
});

ipcMain.handle("sync-godowns", async (event, config) => {
  return handleSync(config, "incremental_sync.py", "godowns", "Godown");
});

// Register voucher sync handler (sync_vouchers.py)
registerVoucherSyncHandler(activeChildProcesses);
if (isDev) console.log("✅ 'sync-vouchers' IPC handler registered successfully");

// Register bills outstanding sync handler (sync_bills_outstanding.py)
registerBillsSyncHandler(activeChildProcesses);
if (isDev) console.log("✅ 'sync-bills-outstanding' IPC handler registered successfully");

// Register financial reports sync handler
const { registerFinancialReportsHandler } = require('./financial-reports-handler');
registerFinancialReportsHandler(activeChildProcesses);
if (isDev) console.log("✅ 'sync-financial-reports' IPC handler registered successfully");

if (isDev) console.log("🔧 About to register 'incremental-sync' handler...");

ipcMain.handle("incremental-sync", async (event, config) => {
  if (isDev) console.log('📡 Received incremental-sync IPC call');
  try {
    const { companyId, entityType = 'all', maxAlterID } = config || {};

    if (isDev) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔄 INCREMENTAL SYNC STARTED: ${String(entityType).toUpperCase()}`);
      console.log(`   Company: ${companyId}`);
      if (maxAlterID !== undefined && maxAlterID !== null) {
        console.log(`   Max AlterID: ${maxAlterID}`);
      } else {
        console.log(`   Max AlterID: [per-entity, fetched from master-mapping by worker]`);
      }
      console.log(`${'='.repeat(60)}`);
    }

    const result = await runWorkerCommand('incremental-sync', config);
    return result;
  } catch (error) {
    if (isDev) {
      console.error(`❌ INCREMENTAL SYNC FAILED`);
      console.error(`   Error: ${error.message}`);
      console.error(`${'='.repeat(60)}\n`);
    }
    return { success: false, message: error.message, count: 0 };
  }
});
if (isDev) console.log("✅ 'incremental-sync' IPC handler registered successfully");

// Reconciliation IPC handler
ipcMain.handle("reconcile-data", async (event, config) => {
  if (isDev) console.log('📡 Received reconcile-data IPC call');
  let syncCacheFile = null;
  try {
    const { companyId, entityType, voucherCache, ...restConfig } = config;

    if (isDev) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔍 RECONCILIATION STARTED: ${entityType.toUpperCase()}`);
      console.log(`   Company: ${companyId}`);
      if (voucherCache) console.log(`   📦 Using in-memory voucher cache (${voucherCache.length} records)`);
      console.log(`${'='.repeat(60)}`);
    }

    const reconConfig = { ...restConfig, companyId, entityType };

    // Write voucher cache to temp file for Python worker
    if (voucherCache && Array.isArray(voucherCache) && voucherCache.length > 0) {
      const os = require('os');
      syncCacheFile = path.join(os.tmpdir(), `talliffy_voucher_cache_${companyId}_${Date.now()}.json`);
      fs.writeFileSync(syncCacheFile, JSON.stringify(voucherCache), 'utf8');
      reconConfig.syncCacheFile = syncCacheFile;
      if (isDev) console.log(`   💾 Wrote ${voucherCache.length} cached records to ${syncCacheFile}`);
    }

    const result = await runWorkerCommand('reconcile', reconConfig);
    return result;
  } catch (error) {
    if (isDev) console.error(`❌ RECONCILIATION ERROR: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    // Clean up temp cache file
    if (syncCacheFile) {
      try { fs.unlinkSync(syncCacheFile); } catch (_) {}
    }
  }
});
if (isDev) console.log("✅ 'reconcile-data' IPC handler registered successfully");

ipcMain.handle("get-system-info", async () => {
  const os = require('os');
  try {
    let hostname = 'N/A';
    try {
      hostname = os.hostname() || process.env.COMPUTERNAME || process.env.HOSTNAME || 'N/A';
    } catch (e) {
      hostname = process.env.COMPUTERNAME || process.env.HOSTNAME || 'N/A';
    }

    let processor = 'N/A';
    try {
      const cpuList = os.cpus();
      if (cpuList && cpuList.length > 0 && cpuList[0].model) {
        processor = cpuList[0].model;
      } else {
        // Fallback: use WMIC on Windows
        if (process.platform === 'win32') {
          try {
            const { execSync } = require('child_process');
            const wmicOutput = execSync('wmic cpu get name', { encoding: 'utf8', timeout: 5000 });
            const lines = wmicOutput.trim().split('\n').filter(l => l.trim() && l.trim() !== 'Name');
            if (lines.length > 0) processor = lines[0].trim();
          } catch (_) { /* ignore */ }
        }
      }
    } catch (e) {
      if (isDev) console.error("Processor detection error:", e);
    }

    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const osRelease = os.release();

    // Determine friendly OS name
    let osName = `${os.type()} ${osRelease}`;
    if (process.platform === 'win32') {
      // Map Windows build numbers to friendly names
      const buildMatch = osRelease.match(/10\.0\.(\d+)/);
      if (buildMatch) {
        const build = parseInt(buildMatch[1], 10);
        if (build >= 22000) osName = 'Windows 11';
        else if (build >= 10240) osName = 'Windows 10';
        else osName = `Windows (Build ${build})`;
      }
    } else if (process.platform === 'darwin') {
      osName = `macOS ${osRelease}`;
    } else {
      osName = `Linux ${osRelease}`;
    }

    const result = {
      hostname: hostname,
      processor: processor,
      platform: process.platform,
      os: osName,
      arch: os.arch(),
      memory: `${Math.round(totalMem / (1024 ** 3))} GB`,
      cpus: cpus ? cpus.length : 0
    };
    if (isDev) console.log("System info result:", JSON.stringify(result));
    return result;
  } catch (error) {
    if (isDev) console.error("System info error:", error);
    // Return partial info even on error
    return {
      hostname: process.env.COMPUTERNAME || process.env.HOSTNAME || 'N/A',
      processor: 'N/A',
      platform: process.platform,
      os: process.platform === 'win32' ? 'Windows' : process.platform,
      arch: process.arch || 'N/A',
      memory: 'N/A',
      cpus: 0
    };
  }
});

async function handleSync(config, scriptName, displayName, entityType) {
  try {
    // Validate common parameters
    if (config.tallyHost) security.validateHost(config.tallyHost);
    if (config.tallyPort) security.validatePort(config.tallyPort);
    if (config.companyId) security.validateCompanyId(config.companyId);
    if (config.backendUrl) security.validateBackendUrl(config.backendUrl);
    if (entityType) security.validateEntityType(entityType);

    if (isDev) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔄 SYNC STARTED: ${displayName.toUpperCase()}`);
      console.log(`   Company: ${config.companyName || config.companyId}`);
      console.log(`   Entity Type: ${entityType}`);
      console.log(`${'='.repeat(60)}`);
    }

    // Merge entityType into config
    const runConfig = { ...config, entityType };

    const result = await runWorkerCommand('incremental-sync', runConfig);

    if (isDev) {
      if (result.success) {
        console.log(`✅ ${displayName.toUpperCase()} SYNC SUCCEEDED`);
        console.log(`   Count: ${result.count || 0}`);
      } else {
        console.error(`❌ ${displayName.toUpperCase()} SYNC FAILED`);
        console.error(`   Error: ${result.message || result.error}`);
      }
      console.log(`${'='.repeat(60)}\n`);
    }

    return result;
  } catch (error) {
    if (isDev) {
      console.error(`❌ ${displayName.toUpperCase()} SYNC FAILED`);
      console.error(`   Error: ${error.message}`);
      console.error(`${'='.repeat(60)}\n`);
    }
    return { success: false, message: error.message };
  }
}

app.whenReady().then(() => {
  if (isDev) console.log("🔥 app.whenReady() triggered");
  createWindow();
  createTray();
  if (isDev) console.log("🔥 window creation complete");

  // Auto-start on login (production), launching hidden into the tray so sync
  // runs in the background like other apps.
  if (!isDev) {
    try {
      app.setLoginItemSettings({ openAtLogin: true, args: ['--hidden'] });
    } catch (e) {
      if (isDev) console.error('setLoginItemSettings failed:', e);
    }

    // Check for updates shortly after launch, then every 4 hours, so a newly
    // published version surfaces on the Update App page (and downloads) without
    // the user clicking anything.
    setTimeout(() => { if (autoUpdateEnabled) runUpdateCheck(); }, 15 * 1000);
    setInterval(() => { if (autoUpdateEnabled) runUpdateCheck(); }, 4 * 60 * 60 * 1000);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      showMainWindow();
    }
  });

  // ── Global error handlers (production-grade) ──
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    // Log to file for production diagnostics
    _logCrash('uncaughtException', error);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled promise rejection:', reason);
    _logCrash('unhandledRejection', reason);
  });
});

// ── Crash logger ──
function _logCrash(type, error) {
  try {
    const logPath = path.join(app.getPath('userData'), 'crash.log');
    const entry = `[${new Date().toISOString()}] ${type}: ${error?.stack || error?.message || error}\n`;
    fs.appendFileSync(logPath, entry);
  } catch (_) { /* best effort */ }
}

app.on("window-all-closed", () => {
  // Keep running in the background (tray) — only fully quit when the user chose
  // "Quit" from the tray (app.isQuitting). Closing the window just hides it.
  if (app.isQuitting && process.platform !== "darwin") {
    stopSyncWorker();
    app.quit();
  }
});

app.on("before-quit", () => {
  app.isQuitting = true;
  if (tray) {
    try { tray.destroy(); } catch (_) { /* ignore */ }
    tray = null;
  }
  stopSyncWorker();
  // Clean up temp files
  try {
    const os = require('os');
    const tmpDir = os.tmpdir();
    const files = fs.readdirSync(tmpDir).filter(f => f.startsWith('talliffy_'));
    for (const f of files) {
      try { fs.unlinkSync(path.join(tmpDir, f)); } catch (_) {}
    }
  } catch (_) {}
});

// Open SSO URL in system browser (not inside Electron)
ipcMain.handle('open-external-url', async (event, url) => {
  try {
    console.log('🌐 Received request to open external URL:', url);
    
    if (!url || typeof url !== 'string') {
        return { success: false, error: 'Invalid URL' };
    }

    // Normalized check
    const normalizedUrl = url.trim().toLowerCase();
    
    // Whitelist (single source: app-urls.js)
    const isAllowed = ALLOWED_EXTERNAL_ORIGINS.some(origin => normalizedUrl.startsWith(origin.toLowerCase()));
    
    if (!isAllowed) {
      console.error('🚫 Blocked attempt to open external URL:', url);
      return { success: false, error: 'URL not allowed' };
    }

    console.log('✅ URL allowed, opening browser...');
    shell.openExternal(url).catch(err => {
      console.error('❌ Failed to open external URL:', err);
    });
    
    return { success: true };
  } catch (e) {
    console.error('❌ Error in open-external-url handler:', e);
    return { success: false, error: e.message };
  }
});

const { dialog } = require("electron");

ipcMain.handle('show-session-conflict', async (event, conflictData) => {
  console.log('⚠️ Showing session conflict native dialog');
  let conflictMessage = 'Your account is being accessed from a different device.';
  
  if (conflictData?.conflictType === 'SAME_SYSTEM_DIFFERENT_PLATFORM') {
    conflictMessage = 'You are trying to login from another app on this same computer.';
  } else if (conflictData?.existingDevice) {
    conflictMessage = `An active session was found on ${conflictData.existingDevice.platform || 'another device'}.`;
  }

  const response = dialog.showMessageBoxSync(mainWindow, {
    type: 'warning',
    buttons: ['Logout & Allow', 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    title: 'Session Conflict',
    message: 'New Login Detected',
    detail: `${conflictMessage}\n\nDo you want to logout the existing session and allow this new login?`
  });

  return { action: response === 0 ? 'LOGOUT_EXISTING' : 'CANCEL' };
});

// Unified Renderer Logging
ipcMain.on('log-renderer', (event, { level, message, data, timestamp }) => {
  const formattedData = data ? (typeof data === 'object' ? JSON.stringify(data) : data) : '';
  const logLine = `[RENDERER] [${level}] [${timestamp}] ${message} ${formattedData}\n`;
  const logPath = path.join(app.getPath('userData'), 'sync_report.log');
  try {
    fs.appendFileSync(logPath, logLine);
  } catch (err) {
    console.error('Failed to write renderer log to file:', err);
  }
});

// safeStorage Secure Store IPC Handlers
ipcMain.on('secure-store-get-sync', (event, key) => {
  try {
    const secureStorePath = path.join(app.getPath('userData'), 'secure_store.json');
    if (!fs.existsSync(secureStorePath)) {
      event.returnValue = null;
      return;
    }
    let store = {};
    try {
      const content = fs.readFileSync(secureStorePath, 'utf-8').trim();
      if (content) {
        store = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Warning: secure_store.json is corrupted, resetting to empty store:', parseError);
      store = {};
    }
    const storedValue = store[key];
    if (!storedValue) {
      event.returnValue = null;
      return;
    }
    
    let decrypted = null;
    if (storedValue.startsWith('enc:') && safeStorage.isEncryptionAvailable()) {
      const encryptedBuffer = Buffer.from(storedValue.substring(4), 'base64');
      decrypted = safeStorage.decryptString(encryptedBuffer);
    } else if (storedValue.startsWith('plain:')) {
      decrypted = Buffer.from(storedValue.substring(6), 'base64').toString('utf-8');
    } else {
      decrypted = storedValue;
    }
    event.returnValue = decrypted;
  } catch (e) {
    console.error('secure-store-get-sync error:', e);
    event.returnValue = null;
  }
});

ipcMain.on('secure-store-set-sync', (event, { key, value }) => {
  try {
    const secureStorePath = path.join(app.getPath('userData'), 'secure_store.json');
    let store = {};
    if (fs.existsSync(secureStorePath)) {
      try {
        const content = fs.readFileSync(secureStorePath, 'utf-8').trim();
        if (content) {
          store = JSON.parse(content);
        }
      } catch (parseError) {
        console.error('Warning: secure_store.json is corrupted, resetting to empty store:', parseError);
      }
    }
    
    let storedValue;
    if (safeStorage.isEncryptionAvailable()) {
      storedValue = 'enc:' + safeStorage.encryptString(value).toString('base64');
    } else {
      storedValue = 'plain:' + Buffer.from(value).toString('base64');
    }
    
    store[key] = storedValue;
    fs.writeFileSync(secureStorePath, JSON.stringify(store, null, 2), 'utf-8');
    event.returnValue = true;
  } catch (e) {
    console.error('secure-store-set-sync error:', e);
    event.returnValue = false;
  }
});

ipcMain.on('secure-store-delete-sync', (event, key) => {
  try {
    const secureStorePath = path.join(app.getPath('userData'), 'secure_store.json');
    let store = {};
    if (fs.existsSync(secureStorePath)) {
      try {
        const content = fs.readFileSync(secureStorePath, 'utf-8').trim();
        if (content) {
          store = JSON.parse(content);
        }
      } catch (parseError) {
        console.error('Warning: secure_store.json is corrupted, resetting to empty store:', parseError);
      }
      delete store[key];
      fs.writeFileSync(secureStorePath, JSON.stringify(store, null, 2), 'utf-8');
    }
    event.returnValue = true;
  } catch (e) {
    console.error('secure-store-delete-sync error:', e);
    event.returnValue = false;
  }
});
