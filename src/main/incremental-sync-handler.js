/**
 * Electron IPC Handler - Incremental Sync with Support for All Entity Types
 * Handles both single entity sync and full sync of all entities
 */

const { ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

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
            tallyPort,
            backendUrl,
            authToken,
            deviceToken,
            entityType,
            maxAlterID = 0,
            companyName = null
        } = params;

        const pythonScript = path.join(__dirname, '../../python/incremental_sync.py');

        const args = [
            pythonScript,
            companyId.toString(),
            userId.toString(),
            tallyPort.toString(),
            backendUrl,
            authToken || '',
            deviceToken || '',
            entityType,
            maxAlterID.toString()
        ];

        // Add company name if provided (for Tally context switching)
        if (companyName) {
            args.push(companyName);
        }

        const python = spawn('python', args);

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
                message: `Failed to start Python: ${error.message}`,
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
                syncMode = 'single',  // 'single' or 'all'
                entityType = 'Ledger'
            } = params;

            // If syncMode is 'all', sync all entity types in order
            if (syncMode === 'all') {
                return await syncAllEntities(params);
            } else {
                // Sync single entity type
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

