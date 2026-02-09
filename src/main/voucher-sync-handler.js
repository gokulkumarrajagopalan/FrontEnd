/**
 * Electron IPC Handler - Voucher Sync
 * Spawns Python process to sync vouchers from Tally to Backend
 * 
 * Supports:
 * - Incremental sync via AlterID
 * - Date range filtering
 * - Company context switching
 * - Nested data: Voucher → LedgerEntries → Bills/CostCategories/CostCentres
 *                Voucher → InventoryEntries → BatchAllocations
 */

const { ipcMain, app } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { findPython } = require('./python-finder');

/**
 * Sync vouchers for a single company
 */
function syncVouchers(params) {
    return new Promise((resolve) => {
        const {
            companyId,
            companyGuid,
            userId,
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
        const pythonExe = findPython();
        const pythonScript = isDev
            ? path.join(__dirname, '../../python/sync_vouchers.py')
            : path.join(process.resourcesPath, 'python/sync_vouchers.py');

        const args = [
            pythonScript,
            companyId.toString(),
            companyGuid || '',
            tallyPort.toString(),
            backendUrl || '',
            authToken || '',
            deviceToken || '',
            fromDate,
            toDate,
            lastAlterID.toString(),
            companyName || '',
            (userId || 1).toString()
        ];

        if (isDev) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🧾 VOUCHER SYNC STARTED`);
            console.log(`   Company: ${companyName || companyId}`);
            console.log(`   Date Range: ${fromDate} to ${toDate}`);
            console.log(`   Last AlterID: ${lastAlterID}`);
            console.log(`   Python: ${pythonExe}`);
            console.log(`${'='.repeat(60)}`);
        }

        // Verify script exists
        if (!fs.existsSync(pythonScript)) {
            const errMsg = `Python script not found: ${pythonScript}`;
            if (isDev) console.error(`❌ ${errMsg}`);
            resolve({
                success: false,
                message: errMsg,
                count: 0,
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
            if (isDev) console.log(`[VOUCHER_SYNC] ${output.trim()}`);
        });

        python.stderr.on('data', (data) => {
            const output = data.toString();
            stderr += output;
            if (isDev) console.error(`[VOUCHER_SYNC_ERR] ${output.trim()}`);
        });

        python.on('close', (code) => {
            if (isDev) {
                console.log(`✅ Voucher sync process exited with code: ${code}`);
                console.log(`${'='.repeat(60)}\n`);
            }

            try {
                // Find the last JSON line in stdout (Python may log before the JSON)
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
            if (isDev) console.error(`❌ Failed to start voucher sync: ${error.message}`);
            resolve({
                success: false,
                message: `Failed to start Python: ${error.message}`,
                count: 0,
                exitCode: -1
            });
        });
    });
}

/**
 * Register voucher sync IPC handlers
 */
function registerVoucherSyncHandler() {
    // Main voucher sync handler
    ipcMain.handle('sync-vouchers', async (event, params) => {
        try {
            return await syncVouchers(params);
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
