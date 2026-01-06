const { app, BrowserWindow, ipcMain } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const security = require("./security");

console.log("🔥 main.js loaded");

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

  if (isDev && false) {
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
    const workerScript = path.join(__dirname, "../..", "python", "sync_worker.py");

    let pythonPath = "python";
    if (process.platform === "win32") {
      pythonPath = path.join(__dirname, "../..", "python", "python.exe");
      if (!fs.existsSync(pythonPath)) {
        pythonPath = "python.exe";
      }
    }

    console.log(`Starting sync worker with: ${pythonPath}`);

    syncWorker = spawn(pythonPath, [workerScript], {
      cwd: path.join(__dirname, "../..", "python"),
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

ipcMain.handle("fetch-license", async (event, { tallyPort } = {}) => {
  try {
    const port = security.validatePort(tallyPort || 9000);
    console.log(`📥 fetch-license IPC called on port ${port}`);

    return new Promise((resolve, reject) => {
      const pythonPath = process.platform === "win32" ? "python.exe" : "python";
      const pythonDir = path.join(__dirname, "../..", "python").replace(/\\/g, '\\\\');

      const script = `
import sys
import json
sys.path.insert(0, r'${pythonDir}')
from tally_api import TallyAPIClient

try:
    client = TallyAPIClient(host='localhost', port=${port}, timeout=10)
    success, result = client.get_license_info()
    print(json.dumps({
        'success': success,
        'data': result if success else None,
        'error': None if success else str(result)
    }))
except Exception as e:
    print(json.dumps({
        'success': False,
        'data': None,
        'error': str(e)
    }))
`;

      const python = spawn(pythonPath, ['-c', script], {
        cwd: path.join(__dirname, "../..", "python")
      });

      let output = '';
      let errorOutput = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0 && output.trim()) {
          try {
            const result = JSON.parse(output.trim());
            console.log("License fetch result: success");
            resolve(result);
          } catch (e) {
            console.error('Failed to parse Python output');
            reject(new Error('Failed to parse Python output'));
          }
        } else {
          console.error('Python script error');
          reject(new Error(errorOutput || 'Python script failed'));
        }
      });

      python.on('error', (err) => {
        console.error('Python spawn error:', err);
        reject(err);
      });
    });
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
console.log("✅ 'fetch-master-data' IPC handler registered");

ipcMain.handle("fetch-companies", async (event, { tallyPort } = {}) => {
  try {
    const port = security.validatePort(tallyPort || 9000);
    console.log(`Fetching companies from Tally on port ${port}...`);

    return new Promise((resolve, reject) => {
      const pythonPath = process.platform === "win32" ? "python.exe" : "python";
      const pythonDir = path.join(__dirname, "../..", "python").replace(/\\/g, '\\\\');

      const script = `
import sys
import json
sys.path.insert(0, r'${pythonDir}')
from tally_api import TallyAPIClient

try:
    client = TallyAPIClient(host='localhost', port=${port}, timeout=10)
    success, result = client.get_companies()
    print(json.dumps({
        'success': success,
        'data': result if success else None,
        'error': None if success else str(result)
    }))
except Exception as e:
    print(json.dumps({
        'success': False,
        'data': None,
        'error': str(e)
    }))
`;

      const python = spawn(pythonPath, ['-c', script], {
        cwd: path.join(__dirname, "../..", "python")
      });

      let output = '';
      let errorOutput = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0 && output.trim()) {
          try {
            const result = JSON.parse(output.trim());
            console.log("Companies fetch result: success");
            resolve(result);
          } catch (e) {
            console.error('Failed to parse Python output');
            reject(new Error('Failed to parse Python output'));
          }
        } else {
          console.error('Python script error');
          reject(new Error(errorOutput || 'Python script failed'));
        }
      });

      python.on('error', (err) => {
        console.error('Python spawn error:', err);
        reject(err);
      });
    });
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
    const { companyId, userId, tallyPort, backendUrl, authToken, deviceToken, entityType, maxAlterID } = config;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 INCREMENTAL SYNC STARTED: ${entityType.toUpperCase()}`);
    console.log(`   Company: ${companyId}`);
    console.log(`   Max AlterID: ${maxAlterID}`);
    console.log(`${'='.repeat(60)}`);
    
    return new Promise((resolve) => {
      const pythonPath = process.platform === "win32" ? "python" : "python3";
      const scriptPath = path.join(__dirname, "../..", "python", "incremental_sync.py");

      const args = [
        scriptPath,
        companyId.toString(),
        userId.toString(),
        tallyPort.toString(),
        backendUrl,
        authToken,
        deviceToken,
        entityType,
        maxAlterID.toString()
      ];

      const python = spawn(pythonPath, args, {
        cwd: path.join(__dirname, "../..", "python")
      });

      let output = '';
      let errorOutput = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const lines = output.trim().split('\n');
            const lastLine = lines[lines.length - 1];
            const result = JSON.parse(lastLine);
            console.log(`✅ ${entityType.toUpperCase()} INCREMENTAL SYNC SUCCEEDED`);
            console.log(`   Records: ${result.count || 0}`);
            console.log(`${'='.repeat(60)}\n`);
            resolve(result);
          } catch (e) {
            console.log(`✅ ${entityType.toUpperCase()} INCREMENTAL SYNC COMPLETED`);
            console.log(`${'='.repeat(60)}\n`);
            resolve({ success: true, count: 0, message: 'Sync completed' });
          }
        } else {
          console.error(`❌ ${entityType.toUpperCase()} INCREMENTAL SYNC FAILED`);
          console.error(`   Error: ${errorOutput.trim() || 'Unknown error'}`);
          console.error(`${'='.repeat(60)}\n`);
          resolve({ success: false, message: errorOutput || 'Sync failed', count: 0 });
        }
      });

      python.on('error', (err) => {
        console.error(`❌ ${entityType.toUpperCase()} INCREMENTAL SYNC FAILED`);
        console.error(`   Error: ${err.message}`);
        console.error(`${'='.repeat(60)}\n`);
        resolve({ success: false, message: err.message, count: 0 });
      });
    });
  } catch (error) {
    console.error(`❌ INCREMENTAL SYNC FAILED`);
    console.error(`   Error: ${error.message}`);
    console.error(`${'='.repeat(60)}\n`);
    return { success: false, message: error.message, count: 0 };
  }
});
console.log("✅ 'incremental-sync' IPC handler registered successfully");

function handleSync({ companyId, userId, authToken, deviceToken, tallyPort, backendUrl, companyName }, scriptName, displayName, entityType) {
  try {
    security.validateScriptPath(scriptName, path.join(__dirname, "../..", "python"));
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 SYNC STARTED: ${displayName.toUpperCase()}`);
    console.log(`   Company: ${companyName || companyId}`);
    console.log(`   Entity Type: ${entityType}`);
    console.log(`   Auth Token: ${security.maskToken(authToken)}`);
    console.log(`${'='.repeat(60)}`);

    return new Promise((resolve) => {
      const pythonPath = process.platform === "win32" ? "python" : "python3";
      const scriptPath = path.join(__dirname, "../..", "python", scriptName);

      const args = [
        scriptPath,
        companyId.toString(),
        userId.toString(),
        tallyPort.toString(),
        backendUrl,
        authToken,
        deviceToken,
        entityType
      ];

      if (companyName) args.push('--company-name', companyName);

      const python = spawn(pythonPath, args, {
        cwd: path.join(__dirname, "../..", "python")
      });

      let output = '';
      let errorOutput = '';
      let lastJsonOutput = '';

      python.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        const lines = text.trim().split('\n');
        for (const line of lines) {
          if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
            lastJsonOutput = line.trim();
          }
        }
      });

      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0 && lastJsonOutput) {
          try {
            const result = JSON.parse(lastJsonOutput);
            console.log(`✅ ${displayName.toUpperCase()} SYNC SUCCEEDED`);
            console.log(`   Status: ${result.success ? 'Success' : 'Failed'}`);
            console.log(`${'='.repeat(60)}\n`);
            resolve(result);
          } catch (e) {
            console.error(`❌ ${displayName.toUpperCase()} SYNC FAILED`);
            console.error(`   Error: Failed to parse result`);
            console.error(`${'='.repeat(60)}\n`);
            resolve({ success: false, message: `Failed to parse ${displayName} sync result` });
          }
        } else {
          if (lastJsonOutput) {
            try {
              const result = JSON.parse(lastJsonOutput);
              console.log(`✅ ${displayName.toUpperCase()} SYNC COMPLETED`);
              console.log(`   Status: ${result.success ? 'Success' : 'Failed'}`);
              console.log(`${'='.repeat(60)}\n`);
              resolve(result);
              return;
            } catch (e) { }
          }
          console.error(`❌ ${displayName.toUpperCase()} SYNC FAILED`);
          console.error(`   Error: ${errorOutput.trim() || 'Unknown error'}`);
          console.error(`${'='.repeat(60)}\n`);
          resolve({
            success: false,
            message: errorOutput.trim() || `Syncing ${displayName} failed`,
            exitCode: code
          });
        }
      });

      python.on('error', (err) => {
        console.error(`❌ ${displayName.toUpperCase()} SYNC FAILED`);
        console.error(`   Error: ${err.message}`);
        console.error(`${'='.repeat(60)}\n`);
        resolve({ success: false, message: `Failed to start Python: ${err.message}` });
      });
    });
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
