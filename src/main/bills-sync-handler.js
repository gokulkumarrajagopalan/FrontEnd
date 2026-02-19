/**
 * Electron IPC Handler - Bills Outstanding Sync
 * Spawns standalone Python script to fetch bills from Tally's built-in
 * "Bills Receivable" / "Bills Payable" reports and push to Backend.
 *
 * This bypasses sync_worker.exe entirely (the compiled exe doesn't have
 * this mode), mirroring the pattern used by voucher-sync-handler.js.
 */

const { ipcMain, app } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { findPython } = require('./python-finder');

/**
 * Sync bills outstanding for a single company
 */
function syncBillsOutstanding(params) {
    return new Promise((resolve) => {
        const {
            companyId,
            tallyPort = 9000,
            backendUrl,
            authToken,
            deviceToken,
            companyName = ''
        } = params;

        const isDev = !app.isPackaged;
        const pythonExe = findPython();
        const pythonScript = isDev
            ? path.join(__dirname, '../../python/sync_bills_outstanding.py')
            : path.join(process.resourcesPath, 'python/sync_bills_outstanding.py');

        const args = [
            pythonScript,
            (companyId || 1).toString(),
            (tallyPort || 9000).toString(),
            backendUrl || '',
            authToken || '',
            deviceToken || '',
            companyName || ''
        ];

        if (isDev) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`💰 BILLS OUTSTANDING SYNC STARTED`);
            console.log(`   Company: ${companyName || companyId}`);
            console.log(`   Tally Port: ${tallyPort}`);
            console.log(`   Python: ${pythonExe}`);
            console.log(`${'='.repeat(60)}`);
        }

        // Verify script exists
        if (!fs.existsSync(pythonScript)) {
            const errMsg = `Python script not found: ${pythonScript}`;
            if (isDev) console.error(`❌ ${errMsg}`);
            resolve({
                success: false,
                message: errMsg
            });
            return;
        }

        const python = spawn(pythonExe, args);
        let stdout = '';
        let stderr = '';

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
            if (isDev) {
                console.log(`✅ Bills outstanding sync exited with code: ${code}`);
                console.log(`${'='.repeat(60)}\n`);
            }

            try {
                // Find last JSON line in stdout (Python may log before the JSON)
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
            if (isDev) console.error(`❌ Failed to start bills sync: ${error.message}`);
            resolve({
                success: false,
                message: `Failed to start Python: ${error.message}`
            });
        });
    });
}

/**
 * Register bills outstanding sync IPC handler
 */
function registerBillsSyncHandler() {
    ipcMain.handle('sync-bills-outstanding', async (event, params) => {
        try {
            return await syncBillsOutstanding(params);
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
