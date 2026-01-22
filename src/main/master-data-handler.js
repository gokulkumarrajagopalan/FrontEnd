/**
 * Electron IPC Handler - Master Data Sync
 * Add this to your main Electron process (main.js)
 */

const { ipcMain, app } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { findPython } = require('./python-finder');

/**
 * Register master data fetch handler
 */
function registerMasterDataHandler() {
    ipcMain.handle('fetch-master-data', async (event, params) => {
        return new Promise((resolve) => {
            const {
                companyName,
                tallyPort = 9000,
                isFirstSync = false
            } = params;

            const isDev = !app.isPackaged;
            const pythonExe = findPython();
            const pythonScript = isDev 
                ? path.join(__dirname, '../../python/fetch_master_data.py')
                : path.join(process.resourcesPath, 'python/fetch_master_data.py');

            if (!fs.existsSync(pythonScript)) {
                resolve({
                    success: false,
                    data: {},
                    message: `Python script not found: ${pythonScript}`,
                    exitCode: -1
                });
                return;
            }

            const python = spawn(pythonExe, [
                pythonScript,
                companyName,
                tallyPort.toString(),
                isFirstSync.toString()
            ]);

            let stdout = '';
            let stderr = '';

            python.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            python.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            python.on('close', (code) => {
                try {
                    const result = JSON.parse(stdout);
                    resolve({
                        success: result.success,
                        data: result.data || {},
                        message: result.message,
                        exitCode: code
                    });
                } catch (error) {
                    resolve({
                        success: false,
                        data: {},
                        message: stderr || 'Failed to parse response',
                        exitCode: code
                    });
                }
            });
        });
    });
}

module.exports = { registerMasterDataHandler };
