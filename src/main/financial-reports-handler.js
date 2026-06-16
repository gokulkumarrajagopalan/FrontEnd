const { ipcMain, app } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { findPython } = require('./python-finder');
const { DEFAULT_BACKEND_URL } = require('./app-urls');

function logToFile(message) {
    try {
        const logFilePath = path.join(__dirname, '../../financial_sync.log');
        fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] ${message}\n`);
    } catch (e) {
        console.error('Failed to write to log file:', e);
    }
}

function getWorkerExe() {
    const isDev = !app.isPackaged;
    if (isDev) {
        // If we want to use the dev executable, we could, but let's stick to Python source for dev
        return { command: findPython(), useExe: false, cwd: path.join(__dirname, '../../python') };
    } else {
        const exeName = process.platform === 'win32' ? 'sync_financial_reports.exe' : 'sync_financial_reports';
        // Note: For now, we assume if packaged it uses python source or bundled exe
        const exePath = path.join(process.resourcesPath, 'bin', exeName);
        if (fs.existsSync(exePath)) {
            return { command: exePath, useExe: true, cwd: path.join(process.resourcesPath, 'bin') };
        }
        // Fallback to python
        return { command: findPython(), useExe: false, cwd: path.join(process.resourcesPath, 'python') };
    }
}

function registerFinancialReportsHandler(activeChildProcesses) {
    ipcMain.handle('sync-financial-reports', async (event, params) => {
        return new Promise((resolve) => {
            const {
                companyName = '',
                cmpId,
                companyId: companyIdParam,
                userId,
                fromDate = 'None',
                toDate = 'None',
                tallyHost = 'localhost',
                tallyPort = 9000,
                backendUrl = process.env.BACKEND_URL || DEFAULT_BACKEND_URL,
                authToken = 'None',
                deviceToken = 'None',
                reportType = 'None',
                financialYear = 'None'
            } = params;

            const isDev = !app.isPackaged;
            const { command, useExe, cwd } = getWorkerExe();
            let args;

            if (useExe) {
                args = [
                    companyName,
                    (cmpId || companyIdParam).toString(),
                    (userId || 1).toString(),
                    fromDate || 'None',
                    toDate || 'None',
                    tallyPort.toString(),
                    backendUrl || '',
                    authToken || 'None', // also on argv for older bundled workers that don't read env
                    deviceToken || 'None', // (Python still prefers env; argv is the fallback)
                    reportType || 'None',
                    financialYear || 'None'
                ];
            } else {
                const pythonScript = isDev 
                    ? path.join(__dirname, '../../python/sync_financial_reports.py')
                    : path.join(cwd, 'sync_financial_reports.py');
                args = [
                    pythonScript,
                    companyName,
                    (cmpId || companyIdParam).toString(),
                    (userId || 1).toString(),
                    fromDate || 'None',
                    toDate || 'None',
                    tallyPort.toString(),
                    backendUrl || '',
                    authToken || 'None', // also on argv for older bundled workers that don't read env
                    deviceToken || 'None', // (Python still prefers env; argv is the fallback)
                    reportType || 'None',
                    financialYear || 'None'
                ];
            }

            console.log(`📊 Starting Financial Reports sync for company: ${companyName}`);
            logToFile(`[START] Syncing financial reports for company: ${companyName} (ID: ${cmpId}, Year: ${financialYear})`);

            // Secrets via env, not argv (avoids leaking into OS process listings).
            const childEnv = { ...process.env };
            if (authToken && authToken !== 'None') childEnv.TALLY_AUTH_TOKEN = authToken.toString();
            if (deviceToken && deviceToken !== 'None') childEnv.TALLY_DEVICE_TOKEN = deviceToken.toString();

            const child = spawn(command, args, { cwd, env: childEnv });
            if (activeChildProcesses) {
                activeChildProcesses.add(child);
            }

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                if (isDev) console.log(`[FINANCIAL-SYNC] ${output}`);
                logToFile(`[INFO] ${output.trim()}`);
            });

            child.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                if (isDev) console.error(`[FINANCIAL-SYNC ERROR] ${output}`);
                logToFile(`[ERROR] ${output.trim()}`);
            });

            child.on('close', (code) => {
                console.log(`✅ Financial Reports sync exited with code: ${code}`);
                logToFile(`[END] Sync completed with exit code: ${code}`);
                if (activeChildProcesses) {
                    activeChildProcesses.delete(child);
                }

                // Notify renderer that sync has finished to trigger auto-refresh in report pages
                if (event.sender) {
                    event.sender.send('sync-update', {
                        type: 'sync_completed',
                        entityType: 'FinancialReports',
                        companyId: cmpId,
                        success: code === 0
                    });
                }

                resolve({
                    success: code === 0,
                    output: stdout,
                    error: stderr,
                    exitCode: code
                });
            });

            child.on('error', (err) => {
                console.error(`❌ Failed to start Financial Reports sync: ${err.message}`);
                logToFile(`[FATAL ERROR] Failed to start: ${err.message}`);
                if (activeChildProcesses) {
                    activeChildProcesses.delete(child);
                }
                resolve({
                    success: false,
                    error: err.message,
                    exitCode: -1
                });
            });
        });
    });
}

module.exports = { registerFinancialReportsHandler };
