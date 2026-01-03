/**
 * Electron IPC Handler - Master Data Sync
 * Add this to your main Electron process (main.js)
 */

const { ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

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

            const pythonScript = path.join(__dirname, '../python/fetch_master_data.py');

            const python = spawn('python', [
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
