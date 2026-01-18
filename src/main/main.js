const { app, BrowserWindow, ipcMain } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const security = require("./security");
const { findPython } = require("./python-finder");

// Load environment variables from .env file in project root
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

console.log("🔥 main.js loaded");
console.log("🔧 BACKEND_URL from .env:", process.env.BACKEND_URL);

let mainWindow;
let syncWorker = null;

const isDev = process.env.NODE_ENV === "development";

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
  console.log("🔥 createWindow called");
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      enableRemoteModule: false,
      disableHtmlCache: true,
      sandbox: true,
      cache: false
    }
  });
  console.log("🔥 BrowserWindow created");

  mainWindow.loadFile(path.join(__dirname, "index.html"));
  console.log("🔥 index.html loading...");

  mainWindow.once('ready-to-show', () => {
    console.log("🔥 Window ready to show - displaying now");
    mainWindow.show();
  });

  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.log("🔥 Timeout - forcing window.show()");
      mainWindow.show();
    }
  }, 2000);

  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error("❌ Page failed to load:", errorDescription, errorCode);
  });

  mainWindow.webContents.on("crashed", () => {
    console.error("❌ Renderer process crashed");
  });

  mainWindow.webContents.on("unresponsive", () => {
    console.warn("⚠️ Renderer process became unresponsive");
  });

  if (true) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
    stopSyncWorker();
  });
}

function startSyncWorker(config = {}) {
  if (syncWorker) {
    console.log("Sync worker already running");
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

    console.log(`Starting sync worker with: ${command} ${finalArgs.join(' ')}`);

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
      console.error("❌ Invalid settings:", error.message);
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

          if (mainWindow) {
            mainWindow.webContents.send("sync-update", result);
          }
        } catch (e) {
          console.log(`Sync Worker: ${output}`);
        }
      }
    });

    syncWorker.stderr.on("data", (data) => {
      console.error(`Sync Worker Error: ${data}`);
      if (mainWindow) {
        mainWindow.webContents.send("sync-error", data.toString());
      }
    });

    syncWorker.on("error", (err) => {
      console.error("Failed to start sync worker:", err);
      syncWorker = null;
    });

    syncWorker.on("close", (code) => {
      console.log(`Sync worker process exited with code ${code}`);
      syncWorker = null;
    });

    console.log("Sync worker started successfully");
  } catch (error) {
    console.error("Error starting sync worker:", error);
    if (mainWindow) {
      mainWindow.webContents.send("sync-error", error.message);
    }
  }
}

function stopSyncWorker() {
  if (syncWorker) {
    console.log("Stopping sync worker");
    syncWorker.kill();
    syncWorker = null;
  }
}

ipcMain.on("start-sync", (event, config) => {
  console.log("Received start-sync request");
  startSyncWorker(config);
  event.reply("sync-started", { status: "Sync started" });
});

ipcMain.on("stop-sync", (event) => {
  console.log("Received stop-sync request");
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
  console.log("Trigger sync with config");
  startSyncWorker(config);
});

ipcMain.on("update-sync-settings", (event, settings) => {
  try {
    security.validateSettings(settings);
    console.log("Sync settings updated");
    stopSyncWorker();
    setTimeout(() => {
      startSyncWorker(settings);
    }, 500);
  } catch (error) {
    console.error("❌ Invalid settings:", error.message);
    event.reply("settings-error", { error: error.message });
  }
});

// Helper to get worker command based on environment
function getWorkerCommand() {
  const isDev = Boolean(process.env.NODE_ENV === "development" || !app.isPackaged || process.defaultApp);

  console.log(`🔍 Environment Check: isDev=${isDev} (NODE_ENV=${process.env.NODE_ENV}, isPackaged=${app.isPackaged}, defaultApp=${process.defaultApp})`);

  if (isDev) {
    // In dev, use system python to run the script
    const pythonPath = process.platform === "win32" ? "python" : "python3";
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
    child.stderr.on('data', (data) => errorOutput += data.toString());

    child.on('close', (code) => {
      // console.log(`Worker exited with code ${code}`);
      if (code === 0 && output.trim()) {
        try {
          const result = JSON.parse(output.trim());
          resolve(result);
        } catch (e) {
          console.error('Failed to parse worker output:', output);
          reject(new Error('Failed to parse worker output'));
        }
      } else {
        console.error('Worker failed:', errorOutput);
        reject(new Error(errorOutput || `Worker failed with code ${code}`));
      }
    });

    child.on('error', (err) => {
      console.error('Failed to spawn worker:', err);
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
    console.log(`📥 fetch-license IPC called on port ${port}`);

    const result = await runWorkerCommand('fetch-license', { tallyPort: port });
    console.log("License fetch result:", result.success ? "success" : "failed");
    return result; // Return full object {success, data, error} for renderer validation
  } catch (error) {
    console.error("License fetch error:", error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("check-tally-connection", async (event, { tallyPort } = {}) => {
  try {
    const http = require('http');
    const port = security.validatePort(tallyPort || 9000);
    const url = `http://localhost:${port}/`;
    console.log(`Checking Tally connection at port ${port}...`);

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
    console.error("Tally connection check error:", error.message);
    return false;
  }
});

console.log("🔥 Registering IPC handlers...");

const { registerMasterDataHandler } = require('./master-data-handler');
registerMasterDataHandler();

// Provide backend URL to renderer synchronously
ipcMain.on('get-backend-url-sync', (event) => {
  let backendUrl = process.env.BACKEND_URL;

  if (!backendUrl) {
    console.warn('⚠️ BACKEND_URL not found in process.env, attempting to reload .env...');
    try {
      const envPath = path.join(__dirname, '../../.env');
      if (fs.existsSync(envPath)) {
        const envConfig = require('dotenv').parse(fs.readFileSync(envPath));
        if (envConfig.BACKEND_URL) {
          backendUrl = envConfig.BACKEND_URL;
          process.env.BACKEND_URL = backendUrl;
          console.log('✅ BACKEND_URL loaded from .env re-read:', backendUrl);
        }
      }
    } catch (e) {
      console.error('❌ Failed to reload .env:', e);
    }
  }

  if (!backendUrl) {
    console.error('❌ BACKEND_URL not set in .env file!');
    console.error('Please create a .env file in the project root with: BACKEND_URL=http://your-backend-url:8080');
  } else {
    console.log('✅ Sending BACKEND_URL to renderer:', backendUrl);
  }

  event.returnValue = backendUrl;
});

// fetch-companies logic moved to use sync_worker
ipcMain.handle("fetch-companies", async (event, { tallyPort } = {}) => {
  try {
    const port = security.validatePort(tallyPort || 9000);
    console.log(`Fetching companies from Tally on port ${port}...`);

    const result = await runWorkerCommand('fetch-companies', { tallyPort: port });
    console.log("Companies fetch result:", result.success ? "success" : "failed");
    return result;
  } catch (error) {
    console.error("Companies fetch error:", error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("sync-groups", async (event, config) => {
  return handleSync(config, "incremental_sync.py", "groups", "Group");
});
console.log("✅ 'sync-groups' IPC handler registered successfully");

ipcMain.handle("sync-ledgers", async (event, config) => {
  return handleSync(config, "incremental_sync.py", "ledgers", "Ledger");
});
console.log("✅ 'sync-ledgers' IPC handler registered successfully");

ipcMain.handle("sync-currencies", async (event, config) => {
  return handleSync(config, "incremental_sync.py", "currencies", "Currency");
});
console.log("✅ 'sync-currencies' IPC handler registered successfully");

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

console.log("🔧 About to register 'incremental-sync' handler...");

ipcMain.handle("incremental-sync", async (event, config) => {
  console.log('📡 Received incremental-sync IPC call');
  try {
    const { companyId, entityType, maxAlterID } = config;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 INCREMENTAL SYNC STARTED: ${entityType.toUpperCase()}`);
    console.log(`   Company: ${companyId}`);
    console.log(`   Max AlterID: ${maxAlterID}`);
    console.log(`${'='.repeat(60)}`);

    const result = await runWorkerCommand('incremental-sync', config);
    return result;
  } catch (error) {
    console.error(`❌ INCREMENTAL SYNC FAILED`);
    console.error(`   Error: ${error.message}`);
    console.error(`${'='.repeat(60)}\n`);
    return { success: false, message: error.message, count: 0 };
  }
});
console.log("✅ 'incremental-sync' IPC handler registered successfully");

// Reconciliation IPC handler
ipcMain.handle("reconcile-data", async (event, config) => {
  console.log('📡 Received reconcile-data IPC call');
  try {
    const { companyId, entityType } = config;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 RECONCILIATION STARTED: ${entityType.toUpperCase()}`);
    console.log(`   Company: ${companyId}`);
    console.log(`${'='.repeat(60)}`);

    const result = await runWorkerCommand('reconcile', config);
    return result;
  } catch (error) {
    console.error(`❌ RECONCILIATION ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
});
console.log("✅ 'reconcile-data' IPC handler registered successfully");

async function handleSync(config, scriptName, displayName, entityType) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 SYNC STARTED: ${displayName.toUpperCase()}`);
    console.log(`   Company: ${config.companyName || config.companyId}`);
    console.log(`   Entity Type: ${entityType}`);
    console.log(`${'='.repeat(60)}`);

    // Merge entityType into config
    const runConfig = { ...config, entityType };

    const result = await runWorkerCommand('incremental-sync', runConfig);

    if (result.success) {
      console.log(`✅ ${displayName.toUpperCase()} SYNC SUCCEEDED`);
      console.log(`   Count: ${result.count || 0}`);
    } else {
      console.error(`❌ ${displayName.toUpperCase()} SYNC FAILED`);
      console.error(`   Error: ${result.message || result.error}`);
    }
    console.log(`${'='.repeat(60)}\n`);

    return result;
  } catch (error) {
    console.error(`❌ ${displayName.toUpperCase()} SYNC FAILED`);
    console.error(`   Error: ${error.message}`);
    console.error(`${'='.repeat(60)}\n`);
    return { success: false, message: error.message };
  }
}

app.whenReady().then(() => {
  console.log("🔥 app.whenReady() triggered");
  createWindow();
  console.log("🔥 window creation complete");

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  process.on('uncaughtException', (error) => {
    console.error('🔥 Uncaught exception:', error);
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
