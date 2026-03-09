/**
 * Electron IPC Handler - Master Data Sync
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

/**
 * Register master data fetch handler
 */
function registerMasterDataHandler() {
    ipcMain.handle('fetch-master-data', async (event, params) => {
        return new Promise((resolve) => {
            const {
                companyName,
                tallyHost = 'localhost',
                tallyPort = 9000,
                isFirstSync = false
            } = params;

            const isDev = !app.isPackaged;
            const { command, useExe, cwd } = getWorkerExe();
            let args;

            if (useExe) {
                args = [
                    '--mode', 'fetch-master-data',
                    '--company-name', companyName,
                    '--host', tallyHost,
                    '--port', tallyPort.toString()
                ];
                if (isFirstSync) args.push('--is-first-sync');
            } else {
                const pythonScript = path.join(__dirname, '../../python/fetch_master_data.py');
                if (!fs.existsSync(pythonScript)) {
                    resolve({
                        success: false,
                        data: {},
                        message: `Python script not found: ${pythonScript}`,
                        exitCode: -1
                    });
                    return;
                }
                args = [
                    pythonScript,
                    companyName,
                    tallyHost,
                    tallyPort.toString(),
                    isFirstSync.toString()
                ];
            }

            const python = spawn(command, args, { cwd });

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

            python.on('error', (err) => {
                resolve({
                    success: false,
                    data: {},
                    message: `Failed to start: ${err.message}`,
                    exitCode: -1
                });
            });
        });
    });
}

module.exports = { registerMasterDataHandler };
