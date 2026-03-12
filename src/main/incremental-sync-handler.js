/**
 * Electron IPC Handler - Incremental Sync with Support for All Entity Types
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
        if (!fs.existsSync(exePath)) {
            throw new Error(`Bundled sync worker not found at: ${exePath}. Please reinstall the application.`);
        }
        return { command: exePath, useExe: true, cwd: path.join(process.resourcesPath, 'bin') };
    }
}

/**
 * Sync all entity types in correct dependency order
 */
async function syncAllEntities(params) {
    const SYNC_ORDER = [
        'Group',
        'Currency',
        'Unit',
        'StockGroup',
        'StockCategory',
        'CostCategory',
        'CostCenter',
        'Godown',
        'VoucherType',
        'TaxUnit',
        'Ledger',
        'StockItem'
    ];
    
    const results = {};
    let totalCount = 0;
    
    for (const entityType of SYNC_ORDER) {
        try {
            const result = await syncSingleEntity({ ...params, entityType });
            results[entityType] = result;
            totalCount += result.count || 0;
        } catch (error) {
            results[entityType] = {
                success: false,
                error: error.message,
                count: 0
            };
        }
    }
    
    return {
        success: true,
        totalCount: totalCount,
        results: results
    };
}

/**
 * Sync a single entity type
 */
function syncSingleEntity(params) {
    return new Promise((resolve) => {
        const {
            companyId,
            userId,
            tallyHost = 'localhost',
            tallyPort = 9000,
            backendUrl,
            authToken,
            deviceToken,
            entityType,
            maxAlterID = 0,
            companyName = null
        } = params;

        const isDev = !app.isPackaged;
        const { command, useExe, cwd } = getWorkerExe();
        let args;

        if (useExe) {
            args = [
                '--mode', 'incremental-sync',
                '--company-id', companyId.toString(),
                '--user-id', userId.toString(),
                '--host', tallyHost,
                '--port', tallyPort.toString(),
                '--backend-url', backendUrl || '',
                '--auth-token', authToken || '',
                '--device-token', deviceToken || '',
                '--entity-type', entityType,
                '--max-alter-id', maxAlterID.toString()
            ];
            if (companyName) args.push('--company-name', companyName);
        } else {
            const pythonScript = path.join(__dirname, '../../python/incremental_sync.py');
            args = [
                pythonScript,
                companyId.toString(),
                userId.toString(),
                tallyHost,
                tallyPort.toString(),
                backendUrl,
                authToken || '',
                deviceToken || '',
                entityType,
                maxAlterID.toString()
            ];
            if (companyName) args.push(companyName);

            if (!fs.existsSync(pythonScript)) {
                resolve({
                    success: false,
                    message: `Python script not found: ${pythonScript}`,
                    count: 0,
                    exitCode: -1
                });
                return;
            }
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
                    message: result.message,
                    count: result.count,
                    lastAlterID: result.lastAlterID,
                    reconciliation: result.reconciliation,
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

        python.on('error', (error) => {
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
 * Register incremental sync IPC handler
 */
function registerIncrementalSyncHandler() {
    ipcMain.handle('incremental-sync', async (event, params) => {
        try {
            const {
                syncMode = 'single',
                entityType = 'Ledger'
            } = params;

            if (syncMode === 'all') {
                return await syncAllEntities(params);
            } else {
                return await syncSingleEntity(params);
            }
        } catch (error) {
            return {
                success: false,
                message: error.message,
                count: 0
            };
        }
    });

    console.log('✅ Incremental Sync Handler registered');
}

module.exports = { registerIncrementalSyncHandler };

