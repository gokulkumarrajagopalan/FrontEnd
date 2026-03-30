/**
 * Electron IPC Handler - Bills Outstanding Sync
 * Uses bundled sync_worker.exe in production, Python fallback in dev
 */

const { ipcMain, app } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { findPython } = require('./python-finder');
const security = require('./security');

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
        if (!fs.existsSync(exePath)) {
            throw new Error(`Bundled sync worker not found at: ${exePath}. Please reinstall the application.`);
        }
        return { command: exePath, useExe: true, cwd: path.join(process.resourcesPath, 'bin') };
    }
}

/**
 * Sync bills outstanding for a single company
 */
function syncBillsOutstanding(params, processRegistry) {
    return new Promise((resolve) => {
        // Validate inputs
        try {
            if (params.tallyHost) security.validateHost(params.tallyHost);
            if (params.tallyPort) security.validatePort(params.tallyPort);
            if (params.companyId) security.validateCompanyId(params.companyId);
            if (params.backendUrl) security.validateBackendUrl(params.backendUrl);
        } catch (validationError) {
            resolve({ success: false, message: `Validation error: ${validationError.message}` });
            return;
        }

        const {
            companyId,
            tallyHost = 'localhost',
            tallyPort = 9000,
            backendUrl,
            authToken,
            deviceToken,
            companyName = ''
        } = params;

        const isDev = !app.isPackaged;
        const { command, useExe, cwd } = getWorkerExe();
        let args;

        if (useExe) {
            args = [
                '--mode', 'sync-bills-outstanding',
                '--company-id', (companyId || 1).toString(),
                '--host', tallyHost,
                '--port', (tallyPort || 9000).toString(),
                '--backend-url', backendUrl || '',
                '--auth-token', authToken || '',
                '--device-token', deviceToken || ''
            ];
            if (companyName) args.push('--company-name', companyName);
        } else {
            const pythonScript = path.join(__dirname, '../../python/sync_bills_outstanding.py');
            args = [
                pythonScript,
                (companyId || 1).toString(),
                tallyHost,
                (tallyPort || 9000).toString(),
                backendUrl || '',
                authToken || '',
                deviceToken || '',
                companyName || ''
            ];

            if (!fs.existsSync(pythonScript)) {
                const errMsg = `Python script not found: ${pythonScript}`;
                if (isDev) console.error(`❌ ${errMsg}`);
                resolve({ success: false, message: errMsg });
                return;
            }
        }

        if (isDev) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`💰 BILLS OUTSTANDING SYNC STARTED`);
            console.log(`   Company: ${companyName || companyId}`);
            console.log(`   Using: ${useExe ? 'EXE' : 'Python'}`);
            console.log(`${'='.repeat(60)}`);
        }

        const python = spawn(command, args, { cwd });
        if (processRegistry) processRegistry.add(python);
        let stdout = '';
        let stderr = '';
        let resolved = false;

        // 5 minute timeout to prevent indefinite hang
        const timeoutHandle = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                if (processRegistry) processRegistry.delete(python);
                python.kill('SIGTERM');
                // Force kill if SIGTERM doesn't work
                setTimeout(() => {
                    try { if (python.exitCode === null) python.kill('SIGKILL'); } catch (_) {}
                }, 5000);
                python.stdout.removeAllListeners();
                python.stderr.removeAllListeners();
                resolve({
                    success: false,
                    message: 'Bills outstanding sync timed out after 5 minutes'
                });
            }
        }, 5 * 60 * 1000);

        python.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            if (isDev) console.log(`[BILLS_SYNC] ${output.trim()}`);
        });

        python.stderr.on('data', (data) => {
            const output = data.toString();
            stderr += output;
            if (isDev) console.error(`[BILLS_SYNC_ERR] ${output.trim()}`);
        });

        python.on('close', (code) => {
            if (processRegistry) processRegistry.delete(python);
            clearTimeout(timeoutHandle);
            if (resolved) return;
            resolved = true;

            if (isDev) {
                console.log(`✅ Bills outstanding sync exited with code: ${code}`);
                console.log(`${'='.repeat(60)}\n`);
            }

            try {
                const lines = stdout.trim().split('\n');
                let resultJson = null;

                for (let i = lines.length - 1; i >= 0; i--) {
                    try {
                        resultJson = JSON.parse(lines[i]);
                        break;
                    } catch (e) {
                        continue;
                    }
                }

                if (resultJson) {
                    resolve({
                        success: resultJson.success,
                        message: resultJson.message,
                        receivable: resultJson.receivable || {},
                        payable: resultJson.payable || {},
                        exitCode: code
                    });
                } else {
                    resolve({
                        success: false,
                        message: stderr || 'Failed to parse bills outstanding response',
                        exitCode: code
                    });
                }
            } catch (error) {
                resolve({
                    success: false,
                    message: stderr || `Parse error: ${error.message}`,
                    exitCode: code
                });
            }
        });

        python.on('error', (error) => {
            if (processRegistry) processRegistry.delete(python);
            clearTimeout(timeoutHandle);
            if (resolved) return;
            resolved = true;
            if (isDev) console.error(`❌ Failed to start bills sync: ${error.message}`);
            resolve({
                success: false,
                message: `Failed to start: ${error.message}`
            });
        });
    });
}

/**
 * Register bills outstanding sync IPC handler
 */
function registerBillsSyncHandler(processRegistry) {
    ipcMain.handle('sync-bills-outstanding', async (event, params) => {
        try {
            return await syncBillsOutstanding(params, processRegistry);
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    });

    console.log('✅ Bills Outstanding Sync Handler registered');
}

module.exports = { registerBillsSyncHandler, syncBillsOutstanding };
