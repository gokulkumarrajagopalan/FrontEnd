/**
 * Electron IPC Handler - Sync Master Data
 * Uses bundled sync_worker.exe in production, Python fallback in dev
 */

const { ipcMain, app } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { findPython } = require('./python-finder');

function getWorkerExe() {
    const isDev = !app.isPackaged;
    if (isDev) {
        const devExe = path.join(__dirname, '../../resources/bin/sync_worker.exe');
        if (fs.existsSync(devExe)) {
            return { command: devExe, useExe: true, cwd: path.dirname(devExe) };
        }
        return { command: findPython(), useExe: false, cwd: path.join(__dirname, '../../python') };
    } else {
        const exeName = process.platform === 'win32' ? 'sync_worker.exe' : 'sync_worker';
        const exePath = path.join(process.resourcesPath, 'bin', exeName);
        return { command: exePath, useExe: true, cwd: path.join(process.resourcesPath, 'bin') };
    }
}

function registerSyncHandler() {
    ipcMain.handle('sync-master-data', async (event, params) => {
        return new Promise((resolve) => {
            const {
                companyName,
                cmpId,
                userId,
                tallyHost = 'localhost',
                tallyPort = 9000,
                backendUrl = process.env.BACKEND_URL,
                authToken,
                deviceToken
            } = params;

            const isDev = !app.isPackaged;
            const { command, useExe, cwd } = getWorkerExe();
            let args;

            if (useExe) {
                args = [
                    '--mode', 'sync-master',
                    '--company-name', companyName,
                    '--company-id', cmpId.toString(),
                    '--user-id', userId.toString(),
                    '--host', tallyHost,
                    '--port', tallyPort.toString(),
                    '--backend-url', backendUrl || '',
                    '--auth-token', authToken || '',
                    '--device-token', deviceToken || ''
                ];
            } else {
                const pythonScript = path.join(__dirname, '../../python/sync_master.py');
                args = [
                    pythonScript,
                    companyName,
                    cmpId.toString(),
                    userId.toString(),
                    tallyHost,
                    tallyPort.toString(),
                    backendUrl || '',
                    authToken || '',
                    deviceToken || ''
                ];
            }

            console.log(`🔄 Starting sync for company: ${companyName}`);
            console.log(`   Mode: ${isDev ? 'Development' : 'Production'} (${useExe ? 'EXE' : 'Python'})`);

            const python = spawn(command, args, { cwd });

            let stdout = '';
            let stderr = '';

            python.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                if (isDev) console.log(`[SYNC] ${output}`);
            });

            python.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                if (isDev) console.error(`[SYNC ERROR] ${output}`);
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
