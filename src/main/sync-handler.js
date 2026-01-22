/**
 * Electron IPC Handler - Sync Master Data
 * Spawns Python process to sync data from Tally to Backend
 */

const { ipcMain, app } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { findPython } = require('./python-finder');

function registerSyncHandler() {
    ipcMain.handle('sync-master-data', async (event, params) => {
        return new Promise((resolve) => {
            const {
                companyName,
                cmpId,
                userId,
                tallyPort = 9000,
                backendUrl = process.env.BACKEND_URL,
                authToken,
                deviceToken
            } = params;

            // Determine if we're in development or production
            const isDev = !app.isPackaged;
            let pythonExe, pythonScript, args;

            if (isDev) {
                // Development: Use python command with .py script
                pythonExe = findPython();
                pythonScript = path.join(__dirname, '../../python/sync_master.py');
                args = [
                    pythonScript,
                    companyName,
                    cmpId.toString(),
                    userId.toString(),
                    tallyPort.toString(),
                    backendUrl,
                    authToken || '',
                    deviceToken || ''
                ];
            } else {
                // Production: Use bundled Python executable
                pythonExe = findPython();
                pythonScript = path.join(process.resourcesPath, 'python/sync_master.py');
                args = [
                    pythonScript,
                    companyName,
                    cmpId.toString(),
                    userId.toString(),
                    tallyPort.toString(),
                    backendUrl,
                    authToken || '',
                    deviceToken || ''
                ];
            }

            console.log(`🔄 Starting sync for company: ${companyName}`);
            console.log(`   Mode: ${isDev ? 'Development' : 'Production'}`);
            console.log(`   Python: ${pythonExe}`);
            console.log(`   Script: ${pythonScript}`);
            console.log(`   Backend URL: ${backendUrl}`);
            console.log(`   Args: ${args.join(' ')}`);

            // Verify script exists
            if (!fs.existsSync(pythonScript)) {
                console.error(`❌ Python script not found: ${pythonScript}`);
                resolve({
                    success: false,
                    error: `Python script not found: ${pythonScript}`,
                    exitCode: -1
                });
                return;
            }

            const python = spawn(pythonExe, args);

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
