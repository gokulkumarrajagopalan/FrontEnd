const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const security = require("./security");
const { findPython } = require("./python-finder");
const { registerVoucherSyncHandler } = require("./voucher-sync-handler");

// Load environment variables from .env file in project root
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Check if running in development mode
const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

// Only log in development mode
if (isDev) {
  console.log("🔥 main.js loaded");
  console.log("🔧 BACKEND_URL from .env:", process.env.BACKEND_URL);
}

let mainWindow;
let syncWorker = null;

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
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: !isDev,  // Auto-hide menu bar in production
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      enableRemoteModule: false,
      disableHtmlCache: true,
      sandbox: true,
      cache: false,
      devTools: isDev  // Disable DevTools in production
    }
  });
  if (isDev) console.log("🔥 BrowserWindow created");

  mainWindow.loadFile(path.join(__dirname, "index.html"));
  if (isDev) console.log("🔥 index.html loading...");

  mainWindow.once('ready-to-show', () => {
    if (isDev) console.log("🔥 Window ready to show - displaying now");
    mainWindow.show();
  });

  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      if (isDev) console.log("🔥 Timeout - forcing window.show()");
      mainWindow.show();
    }
  }, 2000);

  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    if (isDev) console.error("❌ Page failed to load:", errorDescription, errorCode);
  });

  mainWindow.webContents.on("crashed", () => {
    if (isDev) console.error("❌ Renderer process crashed");
  });

  mainWindow.webContents.on("unresponsive", () => {
    if (isDev) console.warn("⚠️ Renderer process became unresponsive");
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

  mainWindow.on("closed", () => {
    mainWindow = null;
    stopSyncWorker();
  });
}

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
    // In dev, prefer bundled executable if available (no Python install needed)
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

    // Fallback to system python only if no exe is available
    const pythonPath = findPython();
    const scriptPath = path.join(__dirname, "../..", "python", "sync_worker.py");
    // Explicitly set CWD to the python directory
    const cwd = path.join(__dirname, "../..", "python");
    return { command: pythonPath, args: [scriptPath], cwd };
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

    return { command: exePath, args: [], cwd };
  }
}

// Generic helper to run worker command
async function runWorkerCommand(mode, params = {}) {
  return new Promise((resolve, reject) => {
    const { command, args: workerArgs, cwd } = getWorkerCommand();
    const finalArgs = [...workerArgs, '--mode', mode];

    // Map parameters to CLI flags
    const argMapping = {
      tallyPort: '--port',
      companyId: '--company-id',
      userId: '--user-id',
      backendUrl: '--backend-url',
      authToken: '--auth-token',
      deviceToken: '--device-token',
      entityType: '--entity-type',
      maxAlterID: '--max-alter-id',
      companyName: '--company-name'
    };

    for (const [key, flag] of Object.entries(argMapping)) {
      if (params[key] !== undefined && params[key] !== null) {
        finalArgs.push(flag, params[key].toString());
      }
    }

    // console.log(`🚀 Running worker command: ${command} ${finalArgs.join(' ')} (CWD: ${cwd})`);

    const child = spawn(command, finalArgs, {
      cwd: cwd
    });

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
      // console.log(`Worker exited with code ${code}`);
      if (code === 0 && output.trim()) {
        try {
          const result = JSON.parse(output.trim());
          resolve(result);
        } catch (e) {
          if (isDev) console.error('Failed to parse worker output:', output);
          reject(new Error('Failed to parse worker output'));
        }
      } else {
        if (isDev) console.error('Worker failed:', errorOutput);
        reject(new Error(errorOutput || `Worker failed with code ${code}`));
      }
    });

    child.on('error', (err) => {
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

ipcMain.handle("fetch-license", async (event, { tallyPort } = {}) => {
  try {
    const port = security.validatePort(tallyPort || 9000);
    if (isDev) console.log(`📥 fetch-license IPC called on port ${port}`);

    const result = await runWorkerCommand('fetch-license', { tallyPort: port });
    if (isDev) console.log("License fetch result:", result.success ? "success" : "failed");
    return result; // Return full object {success, data, error} for renderer validation
  } catch (error) {
    if (isDev) console.error("License fetch error:", error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("check-tally-connection", async (event, { tallyPort } = {}) => {
  try {
    const http = require('http');
    const port = security.validatePort(tallyPort || 9000);
    const url = `http://localhost:${port}/`;
    if (isDev) console.log(`Checking Tally connection at port ${port}...`);

    return new Promise((resolve) => {
      const request = http.get(url, { timeout: 3000 }, (response) => {
        resolve(true);
      });

      request.on('error', () => {
        resolve(false);
      });

      request.on('timeout', () => {
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

// Provide backend URL to renderer synchronously
ipcMain.on('get-backend-url-sync', (event) => {
  let backendUrl = process.env.BACKEND_URL;

  if (!backendUrl) {
    if (isDev) console.warn('⚠️ BACKEND_URL not found in process.env, attempting to reload .env...');
    try {
      const envPath = path.join(__dirname, '../../.env');
      if (fs.existsSync(envPath)) {
        const envConfig = require('dotenv').parse(fs.readFileSync(envPath));
        if (envConfig.BACKEND_URL) {
          backendUrl = envConfig.BACKEND_URL;
          process.env.BACKEND_URL = backendUrl;
          if (isDev) console.log('✅ BACKEND_URL loaded from .env re-read:', backendUrl);
        }
      }
    } catch (e) {
      if (isDev) console.error('❌ Failed to reload .env:', e);
    }
  }

  if (!backendUrl) {
    if (isDev) {
      console.error('❌ BACKEND_URL not set in .env file!');
      console.error('Please create a .env file in the project root with: BACKEND_URL=http://your-backend-url:8080');
    }
  } else {
    if (isDev) console.log('✅ Sending BACKEND_URL to renderer:', backendUrl);
  }

  event.returnValue = backendUrl;
});

// fetch-companies logic moved to use sync_worker
ipcMain.handle("fetch-companies", async (event, { tallyPort } = {}) => {
  try {
    const port = security.validatePort(tallyPort || 9000);
    if (isDev) console.log(`Fetching companies from Tally on port ${port}...`);

    const result = await runWorkerCommand('fetch-companies', { tallyPort: port });
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
registerVoucherSyncHandler();
if (isDev) console.log("✅ 'sync-vouchers' IPC handler registered successfully");

if (isDev) console.log("🔧 About to register 'incremental-sync' handler...");

ipcMain.handle("incremental-sync", async (event, config) => {
  if (isDev) console.log('📡 Received incremental-sync IPC call');
  try {
    const { companyId, entityType, maxAlterID } = config;

    if (isDev) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔄 INCREMENTAL SYNC STARTED: ${entityType.toUpperCase()}`);
      console.log(`   Company: ${companyId}`);
      console.log(`   Max AlterID: ${maxAlterID}`);
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
  try {
    const { companyId, entityType } = config;

    if (isDev) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔍 RECONCILIATION STARTED: ${entityType.toUpperCase()}`);
      console.log(`   Company: ${companyId}`);
      console.log(`${'='.repeat(60)}`);
    }

    const result = await runWorkerCommand('reconcile', config);
    return result;
  } catch (error) {
    if (isDev) console.error(`❌ RECONCILIATION ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
});
if (isDev) console.log("✅ 'reconcile-data' IPC handler registered successfully");

async function handleSync(config, scriptName, displayName, entityType) {
  try {
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
  if (isDev) console.log("🔥 window creation complete");

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  process.on('uncaughtException', (error) => {
    if (isDev) console.error('🔥 Uncaught exception:', error);
  });
});

app.on("window-all-closed", () => {
  stopSyncWorker();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  stopSyncWorker();
});

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      windows[0].focus();
    }
  });
}
