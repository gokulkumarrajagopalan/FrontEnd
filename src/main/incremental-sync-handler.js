/**
 * Electron IPC Handler - Incremental Sync
 * Add this to your main Electron process
 */

const { ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

/**
 * Register incremental sync IPC handler
 */
function registerIncrementalSyncHandler() {
    ipcMain.handle('incremental-sync', async (event, params) => {
        return new Promise((resolve) => {
            const {
                companyId,
                userId,
                tallyPort,
                backendUrl,
                authToken,
                deviceToken,
                entityType,
                maxAlterID = 0  // Max alterID from database
            } = params;

            const pythonScript = path.join(__dirname, '../python/incremental_sync.py');

            const python = spawn('python', [
                pythonScript,
                companyId.toString(),
                userId.toString(),
                tallyPort.toString(),
                backendUrl,
                authToken,
                deviceToken,
                entityType,
                maxAlterID.toString()  // Pass maxAlterID to Python script
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
                        message: result.message,
                        count: result.count,
                        lastAlterID: result.lastAlterID,
                        exitCode: code
                    });
                } catch (error) {
                    resolve({
                        success: false,
                        message: stderr || 'Failed to parse response',
                        count: 0,
                        exitCode: code
                    });
                }
            });
        });
    });
}

module.exports = { registerIncrementalSyncHandler };
