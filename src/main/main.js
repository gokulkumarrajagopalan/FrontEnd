const { app, BrowserWindow, ipcMain } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

console.log("🔥 main.js loaded");

let mainWindow;
let syncWorker = null;

// Determine if we're in production or development
const isDev = process.env.NODE_ENV === "development";

// Set app data path before window creation
const appDataPath = path.join(app.getPath('appData'), 'DesktopApp');
if (!fs.existsSync(appDataPath)) {
  fs.mkdirSync(appDataPath, { recursive: true });
}
app.setPath('userData', appDataPath);

// Disable all caching and networking issues
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-default-apps');
app.commandLine.appendSwitch('disable-preconnect');
app.commandLine.appendSwitch('no-first-run');
app.commandLine.appendSwitch('no-default-browser-check');
app.commandLine.appendSwitch('disable-sync');
app.commandLine.appendSwitch('disable-extensions');

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

  // Load the app
  mainWindow.loadFile(path.join(__dirname, "index.html"));
  console.log("🔥 index.html loading...");

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    console.log("🔥 Window ready to show - displaying now");
    mainWindow.show();
  });

  // Fallback: show after timeout if ready-to-show doesn't fire
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.log("🔥 Timeout - forcing window.show()");
      mainWindow.show();
    }
  }, 2000);

  // Handle page loading errors
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error("❌ Page failed to load:", errorDescription, errorCode);
  });

  mainWindow.webContents.on("crashed", () => {
    console.error("❌ Renderer process crashed");
    // Don't quit - try to recover
    // app.quit();
  });

  mainWindow.webContents.on("unresponsive", () => {
    console.warn("⚠️ Renderer process became unresponsive");
  });

  // Open DevTools in development
  if (isDev && false) {  // DevTools disabled
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
    stopSyncWorker();
  });
}


/**
 * Start the Python sync worker
 */
function startSyncWorker() {
  if (syncWorker) {
    console.log("Sync worker already running");
    return;
  }

  try {
    const workerScript = path.join(__dirname, "../..", "python", "sync_worker.py");
    
    // Determine Python executable path
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

    syncWorker.stdout.on("data", (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`Sync Worker Output: ${output}`);
        try {
          const result = JSON.parse(output);
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

/**
 * Stop the Python sync worker
 */
function stopSyncWorker() {
  if (syncWorker) {
    console.log("Stopping sync worker");
    syncWorker.kill();
    syncWorker = null;
  }
}

/**
 * IPC Handlers for sync operations
 */

// Start sync
ipcMain.on("start-sync", (event, config) => {
  console.log("Received start-sync request", config);
  startSyncWorker();
  event.reply("sync-started", { status: "Sync started" });
});

// Stop sync
ipcMain.on("stop-sync", (event) => {
  console.log("Received stop-sync request");
  stopSyncWorker();
  event.reply("sync-stopped", { status: "Sync stopped" });
});

// Check sync status
ipcMain.on("check-sync-status", (event) => {
  const isRunning = syncWorker !== null;
  event.reply("sync-status", { running: isRunning });
});

// Get sync worker status
ipcMain.handle("get-sync-status", async () => {
  return {
    running: syncWorker !== null,
    timestamp: new Date().toISOString()
  };
});

// Handle periodic sync
ipcMain.on("trigger-sync", (event, config) => {
  console.log("Trigger sync with config:", config);
  startSyncWorker();
});

// Handle fetch license request
ipcMain.handle("fetch-license", async () => {
  try {
    console.log("Fetching Tally license info...");
    
    return new Promise((resolve, reject) => {
      const pythonPath = process.platform === "win32" ? "python.exe" : "python";
      const pythonDir = path.join(__dirname, "../..", "python").replace(/\\/g, '\\\\');
      
      const script = `
import sys
import json
sys.path.insert(0, r'${pythonDir}')
from tally_api import TallyAPIClient

try:
    client = TallyAPIClient(host='localhost', port=9000, timeout=10)
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
        console.log(`Python license fetch exit code: ${code}`);
        if (code === 0 && output.trim()) {
          try {
            const result = JSON.parse(output.trim());
            console.log("License fetch result:", result);
            resolve(result);
          } catch (e) {
            console.error('Failed to parse Python output:', output);
            reject(new Error('Failed to parse Python output'));
          }
        } else {
          console.error('Python script error:', errorOutput);
          reject(new Error(errorOutput || 'Python script failed'));
        }
      });
      
      python.on('error', (err) => {
        console.error('Python spawn error:', err);
        reject(err);
      });
    });
  } catch (error) {
    console.error("License fetch error:", error);
    return { success: false, error: error.message };
  }
});

// Check Tally connection via HTTP (bypasses CORS)
ipcMain.handle("check-tally-connection", async () => {
  try {
    const http = require('http');
    
    return new Promise((resolve) => {
      const request = http.get('http://localhost:9000/', { timeout: 3000 }, (response) => {
        // If we get any response (even an error response), server is up
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
    console.error("Tally connection check error:", error);
    return false;
  }
});

// Fetch companies from Tally
ipcMain.handle("fetch-companies", async () => {
  try {
    console.log("Fetching companies from Tally...");
    
    return new Promise((resolve, reject) => {
      const pythonPath = process.platform === "win32" ? "python.exe" : "python";
      const pythonDir = path.join(__dirname, "../..", "python").replace(/\\/g, '\\\\');
      
      const script = `
import sys
import json
sys.path.insert(0, r'${pythonDir}')
from tally_api import TallyAPIClient

try:
    client = TallyAPIClient(host='localhost', port=9000, timeout=10)
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
        console.log(`Python companies fetch exit code: ${code}`);
        if (code === 0 && output.trim()) {
          try {
            const result = JSON.parse(output.trim());
            console.log("Companies fetch result:", result);
            resolve(result);
          } catch (e) {
            console.error('Failed to parse Python output:', output);
            reject(new Error('Failed to parse Python output'));
          }
        } else {
          console.error('Python script error:', errorOutput);
          reject(new Error(errorOutput || 'Python script failed'));
        }
      });
      
      python.on('error', (err) => {
        console.error('Python spawn error:', err);
        reject(err);
      });
    });
  } catch (error) {
    console.error("Companies fetch error:", error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  console.log("🔥 app.whenReady() triggered");
  createWindow();
  console.log("🔥 window creation complete");

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Add uncaught exception handler
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

// Prevent multiple instances
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
