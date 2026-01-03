/**
 * Electron IPC Handler - Sync Master Data
 * Spawns Python process to sync data from Tally to Backend
 */

const { ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

function registerSyncHandler() {
    ipcMain.handle('sync-master-data', async (event, params) => {
        return new Promise((resolve) => {
            const {
                companyName,
                cmpId,
                userId,
                tallyPort = 9000,
                backendUrl = 'http://localhost:8080',
                authToken,
                deviceToken
            } = params;

            const pythonScript = path.join(__dirname, '../python/sync_master.py');

            const args = [
                pythonScript,
                companyName,
                cmpId.toString(),
                userId.toString(),
                tallyPort.toString(),
                backendUrl,
                authToken || '',
                deviceToken || ''
            ];

            console.log(`🔄 Starting sync for company: ${companyName}`);
            console.log(`   Python: ${pythonScript}`);
            console.log(`   Args: ${args.join(' ')}`);

            const python = spawn('python', args);

            let stdout = '';
            let stderr = '';

            python.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                console.log(`[SYNC] ${output}`);
            });

            python.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                console.error(`[SYNC ERROR] ${output}`);
            });

            python.on('close', (code) => {
                console.log(`✅ Sync process exited with code: ${code}`);
                
                try {
                    const result = JSON.parse(stdout);
                    resolve({
                        success: result.success,
                        results: result.results,
                        logFile: result.log_file,
                        error: result.error,
                        exitCode: code
                    });
                } catch (error) {
                    resolve({
                        success: false,
                        error: stderr || 'Failed to parse response',
                        exitCode: code
                    });
                }
            });

            python.on('error', (err) => {
                console.error(`❌ Failed to start sync: ${err.message}`);
                resolve({
                    success: false,
                    error: err.message,
                    exitCode: -1
                });
            });
        });
    });
}

module.exports = { registerSyncHandler };
