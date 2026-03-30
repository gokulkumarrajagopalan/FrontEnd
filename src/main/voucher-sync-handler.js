/**
 * Electron IPC Handler - Voucher Sync
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
 * Sync vouchers for a single company
 */
function syncVouchers(params, processRegistry) {
    return new Promise((resolve) => {
        // Validate inputs
        try {
            if (params.tallyHost) security.validateHost(params.tallyHost);
            if (params.tallyPort) security.validatePort(params.tallyPort);
            if (params.companyId) security.validateCompanyId(params.companyId);
            if (params.backendUrl) security.validateBackendUrl(params.backendUrl);
            if (params.fromDate) security.validateDateString(params.fromDate);
            if (params.toDate) security.validateDateString(params.toDate);
        } catch (validationError) {
            resolve({ success: false, message: `Validation error: ${validationError.message}` });
            return;
        }

        const {
            companyId,
            companyGuid,
            userId,
            tallyHost = 'localhost',
            tallyPort = 9000,
            backendUrl,
            authToken,
            deviceToken,
            fromDate = '01-Apr-2024',
            toDate = '31-Mar-2025',
            lastAlterID = 0,
            companyName = null
        } = params;

        const isDev = !app.isPackaged;
        const { command, useExe, cwd } = getWorkerExe();
        let args;

        if (useExe) {
            args = [
                '--mode', 'sync-vouchers',
                '--company-id', companyId.toString(),
                '--company-guid', companyGuid || '',
                '--host', tallyHost,
                '--port', tallyPort.toString(),
                '--backend-url', backendUrl || '',
                '--auth-token', authToken || '',
                '--device-token', deviceToken || '',
                '--from-date', fromDate,
                '--to-date', toDate,
                '--user-id', (userId || '').toString()
            ];
            // Forward explicit 0 as well; otherwise worker falls back to backend lookup.
            if (lastAlterID !== undefined && lastAlterID !== null) {
                args.push('--last-voucher-alter-id', lastAlterID.toString());
            }
            if (companyName) args.push('--company-name', companyName);
        } else {
            const pythonScript = path.join(__dirname, '../../python/sync_vouchers.py');
            args = [
                pythonScript,
                companyId.toString(),
                companyGuid || '',
                tallyHost,
                tallyPort.toString(),
                backendUrl || '',
                authToken || '',
                deviceToken || '',
                fromDate,
                toDate,
                lastAlterID.toString(),
                companyName || '',
                (userId || '').toString()
            ];
        }

        if (isDev) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🧾 VOUCHER SYNC STARTED`);
            console.log(`   Company: ${companyName || companyId}`);
            console.log(`   Date Range: ${fromDate} to ${toDate}`);
            console.log(`   Using: ${useExe ? 'EXE' : 'Python'}`);
            console.log(`${'='.repeat(60)}`);
        }

        const python = spawn(command, args, { cwd });
        if (processRegistry) processRegistry.add(python);
        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            if (isDev) console.log(`[VOUCHER_SYNC] ${output.trim()}`);
        });

        python.stderr.on('data', (data) => {
            const output = data.toString();
            stderr += output;
            if (isDev) console.error(`[VOUCHER_SYNC_ERR] ${output.trim()}`);
        });

        python.on('close', (code) => {
            if (processRegistry) processRegistry.delete(python);
            if (isDev) {
                console.log(`✅ Voucher sync process exited with code: ${code}`);
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
                        count: resultJson.count || 0,
                        lastAlterID: resultJson.lastAlterID,
                        stats: resultJson.stats,
                        tallyRecords: resultJson.tallyRecords || [],
                        exitCode: code
                    });
                } else {
                    resolve({
                        success: false,
                        message: stderr || 'Failed to parse voucher sync response',
                        count: 0,
                        exitCode: code
                    });
                }
            } catch (error) {
                resolve({
                    success: false,
                    message: stderr || `Parse error: ${error.message}`,
                    count: 0,
                    exitCode: code
                });
            }
        });

        python.on('error', (error) => {
            if (processRegistry) processRegistry.delete(python);
            if (isDev) console.error(`❌ Failed to start voucher sync: ${error.message}`);
            resolve({
                success: false,
                message: `Failed to start: ${error.message}`,
                count: 0,
                exitCode: -1
            });
        });
    });
}

/**
 * Register voucher sync IPC handlers
 */
function registerVoucherSyncHandler(processRegistry) {
    ipcMain.handle('sync-vouchers', async (event, params) => {
        try {
            return await syncVouchers(params, processRegistry);
        } catch (error) {
            return {
                success: false,
                message: error.message,
                count: 0
            };
        }
    });

    console.log('✅ Voucher Sync Handler registered');
}

module.exports = { registerVoucherSyncHandler, syncVouchers };
