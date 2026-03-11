class SyncScheduler {
    constructor() {
        this.syncInterval = null;
        this.isRunning = false;
        this.lastSyncTime = null;
        this._settingsListener = null;
    }


    getSyncInterval() {
        try {
            const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            // Settings stores interval in MINUTES, convert to milliseconds
            const intervalMinutes = settings.syncInterval || 60; // Default 60 minutes
            const intervalMs = intervalMinutes * 60 * 1000;
            console.log(`📊 Sync interval: ${intervalMinutes} minutes (${intervalMs}ms)`);
            return intervalMs;
        } catch (error) {
            console.error('Error getting sync interval:', error);
            return 3600000; // Default 1 hour in ms
        }
    }

    start() {
        if (this.isRunning) {
            console.log('⚠️ Scheduler already running');
            return;
        }

        const interval = this.getSyncInterval();
        console.log(`🔄 Starting sync scheduler with interval: ${interval}ms`);

        this.isRunning = true;
        this.syncInterval = setInterval(() => this.runSync(), interval);

        // Listen for settings changes to restart with new interval
        if (!this._settingsListener) {
            this._settingsListener = (e) => {
                if (e.key === 'appSettings') {
                    console.log('🔄 Settings changed, restarting scheduler...');
                    this.restart();
                }
            };
            window.addEventListener('storage', this._settingsListener);
        }

        this.runSync();
    }


    stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            this.isRunning = false;
            console.log('⏹️ Sync scheduler stopped');
        }
        if (this._settingsListener) {
            window.removeEventListener('storage', this._settingsListener);
            this._settingsListener = null;
        }
    }


    restart() {
        console.log('🔄 Restarting sync scheduler...');
        this.stop();
        this.start();
    }

    async runSync() {
        try {
            console.log('\n' + '='.repeat(80));
            console.log(`🔄 STARTING AUTOMATIC SYNC - ${new Date().toLocaleTimeString()}`);
            console.log('='.repeat(80));
            this.lastSyncTime = new Date();

            // Read all settings and auth once
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            const tallyPort = appSettings.tallyPort || 9000;
            const backendUrl = window.apiConfig?.baseURL || window.AppConfig?.API_BASE_URL;
            const authToken = localStorage.getItem('authToken');
            const deviceToken = localStorage.getItem('deviceToken');
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

            if (!authToken || !deviceToken) {
                console.warn('⚠️ Not authenticated, skipping sync');
                return;
            }

            if (window.LicenseValidator) {
                const userLicense = currentUser?.licenceNo || currentUser?.licenseNumber || localStorage.getItem('userLicenseNumber');

                const isValid = await window.LicenseValidator.validateAndNotify(userLicense, tallyPort);
                if (!isValid) {
                    console.error('❌ License validation failed - sync aborted');
                    return;
                }
            }

            const companies = await this.fetchImportedCompanies(backendUrl, authToken, deviceToken);
            if (companies.length === 0) {
                console.log('ℹ️ No companies to sync');
                console.log('='.repeat(80) + '\n');
                return;
            }

            console.log(`📋 Found ${companies.length} companies to sync (one by one)`);

            // Notify user that sync is starting
            if (window.notificationService) {
                window.notificationService.info(
                    `Starting automatic sync for ${companies.length} ${companies.length === 1 ? 'company' : 'companies'}...`,
                    'Auto Sync Started'
                );
            }

            if (window.syncStateManager && !window.syncStateManager.startSync('incremental', companies.length)) {
                console.warn('⚠️ Sync already in progress, this sync will be queued');
                return;
            }

            let successCount = 0;
            let failureCount = 0;
            const failedCompanies = [];

            for (let i = 0; i < companies.length; i++) {
                const company = companies[i];
                console.log(`\n[${i + 1}/${companies.length}] 🏢 Syncing: ${company.name}...`);

                if (window.syncStateManager) {
                    window.syncStateManager.updateProgress(i + 1, `Syncing ${company.name}...`);
                }

                try {
                    const syncResult = await this.syncCompany(
                        company,
                        currentUser.userId,
                        tallyPort,
                        backendUrl,
                        authToken,
                        deviceToken
                    );

                    if (syncResult.success) {
                        successCount++;
                        console.log(`   ✅ ${company.name} synced successfully`);
                    } else {
                        failureCount++;
                        console.error(`   ❌ ${company.name} sync failed`);
                        failedCompanies.push({
                            name: company.name,
                            errors: syncResult.errors
                        });
                    }
                } catch (error) {
                    console.error(`   ❌ Error syncing company ${company.name}:`, error);
                    failureCount++;
                    failedCompanies.push({
                        name: company.name,
                        errors: [{ entity: 'COMPANY', message: error.message }]
                    });
                }
            }

            console.log('\n' + '='.repeat(80));
            console.log(`✅ SYNC CYCLE COMPLETED`);
            console.log(`   Success: ${successCount}/${companies.length}`);
            console.log(`   Failed: ${failureCount}/${companies.length}`);
            console.log('='.repeat(80) + '\n');

            const success = failureCount === 0;
            let message = `${successCount}/${companies.length} companies synced`;

            if (failureCount > 0) {
                const failureDetails = failedCompanies
                    .map(c => `${c.name}: ${c.errors.map(e => `${e.entity}(${e.message})`).join(', ')}`)
                    .join(' | ');
                message = `${message}. Failed: ${failureDetails}`;
            }

            if (window.syncStateManager) {
                window.syncStateManager.endSync(success, message);
            } else {
                if (window.notificationService) {
                    if (success) {
                        window.notificationService.success(message, 'Sync Completed');
                        window.notificationService.system('Sync Completed', message);
                    } else {
                        window.notificationService.warning(message, 'Sync Completed with Errors');
                        window.notificationService.system('Sync Completed with Errors', message);
                    }
                }
            }

            console.log('🔍 Starting post-sync reconciliation...');
            setTimeout(() => {
                this.runReconciliation(companies, currentUser.userId, authToken, deviceToken, appSettings);
            }, 1000);

        } catch (error) {
            console.error('❌ Sync error:', error);

            if (window.syncStateManager) {
                window.syncStateManager.endSync(false, error.message || 'An error occurred during sync');
            } else {
                if (window.notificationService) {
                    window.notificationService.error(
                        error.message || 'An error occurred during sync',
                        'Sync Failed'
                    );
                    window.notificationService.system(
                        'Sync Failed',
                        error.message || 'An error occurred during sync'
                    );
                }
            }
        }
    }


    async runReconciliation(companies, userId, authToken, deviceToken, appSettings) {
        try {
            console.log(`🔍 Reconciling ${companies.length} companies...`);

            let totalMissing = 0;
            let totalUpdated = 0;
            let totalSynced = 0;

            for (const company of companies) {
                try {
                    const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const _now = new Date();
                    const _fyStart = _now.getMonth() >= 3 ? `01-Apr-${_now.getFullYear()}` : `01-Apr-${_now.getFullYear() - 1}`;
                    const _today = `${String(_now.getDate()).padStart(2, '0')}-${_months[_now.getMonth()]}-${_now.getFullYear()}`;
                    const result = await window.electronAPI.reconcileData({
                        companyId: company.id,
                        companyName: company.name,
                        companyGuid: company.companyGuid || company.guid || '',
                        userId: userId,
                        tallyHost: appSettings.tallyHost || 'localhost',
                        tallyPort: appSettings.tallyPort || 9000,
                        backendUrl: appSettings.backendUrl || window.apiConfig?.baseURL || window.AppConfig?.API_BASE_URL,
                        authToken: authToken,
                        deviceToken: deviceToken,
                        entityType: 'all',
                        fromDate: _fyStart,
                        toDate: _today
                    });

                    if (result.success) {
                        totalMissing += result.totalMissing || 0;
                        totalUpdated += result.totalUpdated || 0;
                        totalSynced += result.totalSynced || 0;

                        if (result.totalSynced > 0) {
                            console.log(`✅ ${company.name}: Reconciled and synced ${result.totalSynced} records`);
                        }
                    }
                } catch (error) {
                    console.error(`❌ Error reconciling ${company.name}:`, error);
                }
            }

            if (totalSynced > 0) {
                if (window.notificationService) {
                    window.notificationService.show({
                        type: 'info',
                        message: `🔍 Reconciliation: ${totalSynced} records auto-synced`,
                        details: `Missing: ${totalMissing}, Updated: ${totalUpdated}`,
                        duration: 4000
                    });
                }
                console.log(`✅ Background reconciliation: ${totalSynced} records synced`);
            } else {
                console.log('✅ Background reconciliation: All records in sync');
            }

        } catch (error) {
            console.error('❌ Background reconciliation error:', error);
        }
    }

    async fetchImportedCompanies(backendUrl, authToken, deviceToken) {
        try {
            const companiesUrl = window.apiConfig
                ? window.apiConfig.getUrl('/companies')
                : `${backendUrl}/companies`;

            console.log(`📡 Fetching companies from: ${companiesUrl}`);

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'X-Device-Token': deviceToken
            };

            const csrfToken = localStorage.getItem('csrfToken');
            if (csrfToken) {
                headers['X-CSRF-Token'] = csrfToken;
            }

            const response = await fetch(companiesUrl, {
                method: 'GET',
                headers
            });

            if (!response.ok) {
                console.warn(`⚠️ Failed to fetch companies: HTTP ${response.status}`);
                if (response.status === 403) {
                    console.error('❌ Access Forbidden - Check authentication and permissions');
                }
                return [];
            }

            const result = await response.json();
            if (result.success && Array.isArray(result.data)) {
                console.log(`✅ Fetched ${result.data.length} companies from backend`);
                return result.data;
            }
            return [];
        } catch (error) {
            console.error('❌ Error fetching companies:', error);
            return [];
        }
    }

    async syncCompany(company, userId, tallyPort, backendUrl, authToken, deviceToken) {
        const companyId = company.id;
        const companyName = company.name;
        const result = { success: true, errors: [] };

        try {
            // Validate company ID is present and valid
            if (!companyId) {
                console.error(`❌ Company "${companyName}" has no valid ID — skipping sync`);
                result.success = false;
                result.errors.push({ entity: 'COMPANY', message: 'Missing company ID' });
                return result;
            }
            console.log(`\n📋 Syncing company ${companyId} (${companyName})...`);

            const masterMapping = await this.getMasterMapping(companyId, backendUrl, authToken, deviceToken);

            const entities = [
                { type: 'Group', key: 'group' },
                { type: 'Currency', key: 'currency' },
                { type: 'Unit', key: 'unit' },
                { type: 'StockGroup', key: 'stockgroup' },
                { type: 'StockCategory', key: 'stockcategory' },
                { type: 'CostCategory', key: 'costcategory' },
                { type: 'CostCenter', key: 'costcenter' },
                { type: 'Godown', key: 'godown' },
                { type: 'VoucherType', key: 'vouchertype' },
                { type: 'TaxUnit', key: 'taxunit' },
                { type: 'Ledger', key: 'ledger' },
                { type: 'StockItem', key: 'stockitem' }
            ];

            // Total steps = 12 master entities + Vouchers + Bills Outstanding = 14
            const totalSteps = entities.length + 2;

            for (let j = 0; j < entities.length; j++) {
                const entity = entities[j];
                const entityPercentage = Math.round(((j + 1) / totalSteps) * 100);

                // Update entity-level progress for UI
                if (window.syncStateManager) {
                    const companyIndex = window.syncStateManager.syncedCount || 0;
                    window.syncStateManager.updateProgress(companyIndex, `${companyName} - ${entity.type}`, {
                        companyId: companyId,
                        companyName: companyName,
                        entityIndex: j + 1,
                        entityCount: totalSteps,
                        entityName: entity.type,
                        percentage: entityPercentage
                    });
                }

                const maxAlterID = masterMapping[entity.key] || 0;
                const entityResult = await this.syncEntity(
                    companyId,
                    companyName,
                    userId,
                    entity.type,
                    maxAlterID,
                    tallyPort,
                    backendUrl,
                    authToken,
                    deviceToken
                );

                if (!entityResult || !entityResult.success) {
                    result.success = false;
                    result.errors.push({
                        entity: entity.type,
                        message: entityResult?.message || 'Unknown error'
                    });
                }
            }

            // ============= VOUCHER SYNC =============
            const voucherStepIndex = entities.length + 1;
            const voucherPercentage = Math.round((voucherStepIndex / totalSteps) * 100);
            if (window.syncStateManager) {
                const companyIndex = window.syncStateManager.syncedCount || 0;
                window.syncStateManager.updateProgress(companyIndex, `${companyName} - Vouchers`, {
                    companyId: companyId,
                    companyName: companyName,
                    entityIndex: voucherStepIndex,
                    entityCount: totalSteps,
                    entityName: 'Vouchers',
                    percentage: voucherPercentage
                });
            }
            try {
                if (window.electronAPI?.syncVouchers) {
                    const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const _formatTallyDate = (dt) => `${String(dt.getDate()).padStart(2, '0')}-${_months[dt.getMonth()]}-${dt.getFullYear()}`;

                    const isFirstTime = !company.firstTimeSyncDone;

                    if (isFirstTime) {
                        // ---- FIRST-TIME: Monthly chunks + adaptive weekly ----
                        console.log(`  📦 Vouchers: First-time sync (monthly chunks)...`);
                        const fromISO = company.syncFromDate || company.booksStart || company.financialYearStart || '';
                        const _now = new Date();
                        const toISO = company.syncToDate || _now.toISOString().split('T')[0];

                        let vStartDate = fromISO ? new Date(fromISO + 'T00:00:00') : null;
                        let vEndDate = toISO ? new Date(toISO + 'T00:00:00') : _now;

                        if (!vStartDate || isNaN(vStartDate.getTime())) {
                            const fyYear = _now.getMonth() >= 3 ? _now.getFullYear() : _now.getFullYear() - 1;
                            vStartDate = new Date(fyYear, 3, 1);
                        }
                        if (!vEndDate || isNaN(vEndDate.getTime())) vEndDate = _now;

                        const vChunks = [];
                        let vChunkStart = new Date(vStartDate);
                        while (vChunkStart <= vEndDate) {
                            let vChunkEnd = new Date(vChunkStart.getFullYear(), vChunkStart.getMonth() + 1, 0);
                            if (vChunkEnd > vEndDate) vChunkEnd = vEndDate;
                            vChunks.push({ from: new Date(vChunkStart), to: new Date(vChunkEnd) });
                            vChunkStart = new Date(vChunkEnd.getFullYear(), vChunkEnd.getMonth() + 1, 1);
                        }

                        console.log(`  📦 Vouchers: ${vChunks.length} monthly chunk(s) (FIRST-TIME SYNC)`);
                        let allChunksSuccess = true;

                        for (let ci = 0; ci < vChunks.length; ci++) {
                            const vc = vChunks[ci];
                            const cFrom = _formatTallyDate(vc.from);
                            const cTo = _formatTallyDate(vc.to);
                            console.log(`  📅 Month ${ci + 1}/${vChunks.length}: ${cFrom} → ${cTo}`);

                            const chunkStartTime = Date.now();
                            const voucherResult = await window.electronAPI.syncVouchers({
                                companyId, userId, authToken, deviceToken,
                                tallyPort, backendUrl, companyName,
                                companyGuid: company.companyGuid || company.guid || '',
                                fromDate: cFrom, toDate: cTo, lastAlterID: 0
                            });
                            const chunkElapsed = Date.now() - chunkStartTime;

                            if (voucherResult.success) {
                                console.log(`  ✅ Month ${ci + 1}: synced (${(chunkElapsed / 1000).toFixed(1)}s)`);
                                if (chunkElapsed > 30000) {
                                    console.log(`  ⏱️ Month ${ci + 1} took >30s, re-syncing weekly...`);
                                    let weekStart = new Date(vc.from);
                                    while (weekStart <= vc.to) {
                                        let weekEnd = new Date(weekStart);
                                        weekEnd.setDate(weekEnd.getDate() + 6);
                                        if (weekEnd > vc.to) weekEnd = new Date(vc.to);
                                        await window.electronAPI.syncVouchers({
                                            companyId, userId, authToken, deviceToken,
                                            tallyPort, backendUrl, companyName,
                                            companyGuid: company.companyGuid || company.guid || '',
                                            fromDate: _formatTallyDate(weekStart),
                                            toDate: _formatTallyDate(weekEnd),
                                            lastAlterID: 0
                                        });
                                        weekStart = new Date(weekEnd);
                                        weekStart.setDate(weekStart.getDate() + 1);
                                    }
                                }
                            } else {
                                allChunksSuccess = false;
                                console.warn(`  ⚠️ Month ${ci + 1}: ${voucherResult.message}`);
                            }
                        }

                        if (allChunksSuccess) {
                            console.log(`  ✅ Vouchers: First-time sync completed`);
                            try {
                                const headers = {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${authToken}`,
                                    'X-Device-Token': deviceToken
                                };
                                const updatePayload = JSON.stringify({ firstTimeSyncDone: true });
                                const candidates = [
                                    `${backendUrl}/api/companies/${companyId}`,
                                    `${backendUrl}/companies/${companyId}`
                                ];

                                let updated = false;
                                let lastStatus = 'n/a';
                                for (const url of candidates) {
                                    const resp = await fetch(url, { method: 'PUT', headers, body: updatePayload });
                                    if (resp.ok) {
                                        updated = true;
                                        console.log(`  📝 firstTimeSyncDone flag set for company ${companyId} via ${url}`);
                                        break;
                                    }
                                    lastStatus = String(resp.status);
                                }
                                if (!updated) {
                                    console.warn(`⚠️ firstTimeSyncDone update failed for company ${companyId} (last status: ${lastStatus})`);
                                }
                            } catch (e) {
                                console.warn('⚠️ Could not update firstTimeSyncDone:', e.message);
                            }
                        } else {
                            result.errors.push({ entity: 'Vouchers', message: 'Some monthly chunks failed' });
                        }
                    } else {
                        // ---- INCREMENTAL: Single call with lastAlterID ----
                        console.log(`  📦 Vouchers: Incremental sync (alterId mode)...`);
                        let storedAlterID = 0;
                        try {
                            const voucherState = JSON.parse(localStorage.getItem('voucherSyncState') || '{}');
                            storedAlterID = voucherState[companyId] || 0;
                        } catch (e) { /* use default 0 */ }

                        const voucherResult = await window.electronAPI.syncVouchers({
                            companyId, userId, authToken, deviceToken,
                            tallyPort, backendUrl, companyName,
                            companyGuid: company.companyGuid || company.guid || '',
                            fromDate: '', toDate: '',
                            lastAlterID: storedAlterID
                        });

                        if (voucherResult.success) {
                            console.log(`  ✅ Vouchers: Incremental sync completed`);
                            if (voucherResult.lastAlterID && voucherResult.lastAlterID > storedAlterID) {
                                try {
                                    const voucherState = JSON.parse(localStorage.getItem('voucherSyncState') || '{}');
                                    voucherState[companyId] = voucherResult.lastAlterID;
                                    localStorage.setItem('voucherSyncState', JSON.stringify(voucherState));
                                    console.log(`  📝 Vouchers: Stored lastAlterID = ${voucherResult.lastAlterID}`);
                                } catch (e) { /* ignore */ }
                            }
                        } else {
                            console.warn(`  ⚠️ Vouchers: ${voucherResult.message}`);
                            result.errors.push({ entity: 'Vouchers', message: voucherResult.message || 'Voucher sync error' });
                        }
                    }
                } else {
                    console.warn('  ⚠️ Vouchers: syncVouchers API not available');
                }
            } catch (vErr) {
                console.error('  ❌ Vouchers sync error:', vErr);
                result.errors.push({ entity: 'Vouchers', message: vErr.message || 'Voucher sync error' });
            }

            // ============= BILLS OUTSTANDING SYNC =============
            const billsStepIndex = entities.length + 2;
            const billsPercentage = Math.round((billsStepIndex / totalSteps) * 100);
            if (window.syncStateManager) {
                const companyIndex = window.syncStateManager.syncedCount || 0;
                window.syncStateManager.updateProgress(companyIndex, `${companyName} - Bills Outstanding`, {
                    companyId: companyId,
                    companyName: companyName,
                    entityIndex: billsStepIndex,
                    entityCount: totalSteps,
                    entityName: 'Bills Outstanding',
                    percentage: billsPercentage
                });
            }
            try {
                if (window.electronAPI?.syncBillsOutstanding) {
                    console.log(`  📦 Bills Outstanding: Syncing...`);
                    const billsResult = await window.electronAPI.syncBillsOutstanding({
                        companyId: companyId,
                        userId: userId,
                        authToken: authToken,
                        deviceToken: deviceToken,
                        tallyPort: tallyPort,
                        backendUrl: backendUrl,
                        companyName: companyName
                    });
                    if (billsResult.success) {
                        console.log(`  ✅ Bills Outstanding: Synced successfully`);
                    } else {
                        console.warn(`  ⚠️ Bills Outstanding: ${billsResult.message}`);
                        result.errors.push({ entity: 'Bills Outstanding', message: billsResult.message || 'Bills sync failed' });
                    }
                } else {
                    console.warn('  ⚠️ Bills Outstanding: syncBillsOutstanding API not available');
                }
            } catch (bErr) {
                console.error('  ❌ Bills Outstanding sync error:', bErr);
                result.errors.push({ entity: 'Bills Outstanding', message: bErr.message || 'Bills sync error' });
            }

            // Mark overall result based on errors
            if (result.errors.length > 0) {
                result.success = false;
            }
        } catch (error) {
            console.error(`❌ Error syncing company ${companyId}:`, error);
            result.success = false;
            result.errors.push({
                entity: 'COMPANY',
                message: error.message || 'Unexpected error during company sync'
            });
        }

        return result;
    }

    async syncEntity(companyId, companyName, userId, entityType, maxAlterID, tallyPort, backendUrl, authToken, deviceToken) {
        const MAX_RETRIES = 2;
        let lastError = null;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const isFirstSync = maxAlterID === 0;
                if (attempt === 1) {
                    console.log(`  📦 ${entityType}: Max AlterID in DB = ${maxAlterID}${isFirstSync ? ' (FIRST-TIME SYNC)' : ''}`);
                } else {
                    console.log(`  🔄 ${entityType}: Retry attempt ${attempt}/${MAX_RETRIES}`);
                }

                const result = await this.callIncrementalSync(
                    companyId,
                    companyName,
                    userId,
                    tallyPort,
                    backendUrl,
                    authToken,
                    deviceToken,
                    entityType,
                    maxAlterID
                );

                if (result.success) {
                    if (result.count > 0) {
                        console.log(`  ✅ ${entityType}: Synced ${result.count} records`);
                    }
                    return { success: true, message: `${result.count} records synced` };
                } else {
                    lastError = result.message;
                    // Don't retry on non-transient errors
                    if (result.message?.includes('mismatch') || result.message?.includes('not found')) {
                        console.warn(`  ⚠️ ${entityType}: ${result.message} (non-retryable)`);
                        return { success: false, message: result.message };
                    }
                    if (attempt < MAX_RETRIES) {
                        const delay = attempt * 2000; // 2s, 4s backoff
                        console.warn(`  ⚠️ ${entityType}: ${result.message} — retrying in ${delay / 1000}s...`);
                        await new Promise(r => setTimeout(r, delay));
                    }
                }
            } catch (error) {
                lastError = error.message || 'Unknown error';
                if (attempt < MAX_RETRIES) {
                    const delay = attempt * 2000;
                    console.warn(`  ⚠️ ${entityType}: Error — retrying in ${delay / 1000}s...`, error.message);
                    await new Promise(r => setTimeout(r, delay));
                }
            }
        }

        console.error(`  ❌ ${entityType}: Failed after ${MAX_RETRIES} attempts: ${lastError}`);
        return { success: false, message: lastError || 'Unknown error' };
    }

    async getMasterMapping(companyId, backendUrl, authToken, deviceToken) {
        try {
            console.log(`📊 Fetching master mapping for company ${companyId}...`);

            const url = window.apiConfig
                ? window.apiConfig.getUrl(`/api/companies/${companyId}/master-mapping`)
                : `${backendUrl}/api/companies/${companyId}/master-mapping`;

            console.log(`   📡 Trying endpoint: ${url}`);

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'X-Device-Token': deviceToken
            };

            const csrfToken = localStorage.getItem('csrfToken');
            if (csrfToken) {
                headers['X-CSRF-Token'] = csrfToken;
            }

            const response = await fetch(url, {
                method: 'GET',
                headers
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Master mapping retrieved:`, data);
                if (data && typeof data === 'object') {
                    return data;
                }
            } else {
                console.warn(`⚠️ Master mapping endpoint returned ${response.status}`);
                if (response.status === 403) {
                    console.error('❌ Access Forbidden - Check authentication and permissions');
                }
            }

            console.log(`🔄 Using fallback: fetching individual entity max AlterIDs...`);
            const mapping = {};

            const entities = [
                { type: 'Group', endpoint: '/groups/company/{cmpId}' },
                { type: 'Currency', endpoint: '/currencies/company/{cmpId}' },
                { type: 'Unit', endpoint: '/units/company/{cmpId}' },
                { type: 'StockGroup', endpoint: '/stock-groups/company/{cmpId}' },
                { type: 'StockCategory', endpoint: '/stock-categories/company/{cmpId}' },
                { type: 'CostCategory', endpoint: '/cost-categories/company/{cmpId}' },
                { type: 'CostCenter', endpoint: '/cost-centers/company/{cmpId}' },
                { type: 'Godown', endpoint: '/godowns/company/{cmpId}' },
                { type: 'VoucherType', endpoint: '/voucher-types/company/{cmpId}' },
                { type: 'TaxUnit', endpoint: '/tax-units/company/{cmpId}' },
                { type: 'Ledger', endpoint: '/ledgers/company/{cmpId}' },
                { type: 'StockItem', endpoint: '/stock-items/company/{cmpId}' }
            ];

            for (const entity of entities) {
                try {
                    const endpointUrl = entity.endpoint.replace('{cmpId}', companyId);
                    const entityUrl = window.apiConfig
                        ? window.apiConfig.getUrl(endpointUrl)
                        : `${backendUrl}${endpointUrl}`;

                    const entityHeaders = {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`,
                        'X-Device-Token': deviceToken
                    };

                    if (csrfToken) {
                        entityHeaders['X-CSRF-Token'] = csrfToken;
                    }

                    const response = await fetch(entityUrl, {
                        method: 'GET',
                        headers: entityHeaders
                    });

                    if (response.ok) {
                        const result = await response.json();

                        // Extract max AlterID from the data
                        let maxAlterID = 0;

                        if (Array.isArray(result.data)) {
                            // If data is an array, find the max AlterID
                            maxAlterID = result.data.reduce((max, item) => {
                                const alterId = item.alterId || item.alterid || item.altId || 0;
                                return Math.max(max, Number(alterId) || 0);
                            }, 0);
                        } else if (result.maxAlterID) {
                            maxAlterID = result.maxAlterID;
                        } else if (result.data && result.data.maxAlterID) {
                            maxAlterID = result.data.maxAlterID;
                        }

                        const key = entity.type.toLowerCase();
                        mapping[key] = maxAlterID;
                        console.log(`   ✅ ${entity.type}: Max AlterID = ${maxAlterID}`);
                    } else if (response.status === 403) {
                        console.warn(`   ⚠️ ${entity.type}: HTTP 403 Forbidden - Check permissions`);
                    } else {
                        console.warn(`   ⚠️ ${entity.type}: HTTP ${response.status}`);
                    }
                } catch (error) {
                    console.warn(`   ⚠️ Error fetching ${entity.type}: ${error.message}`);
                }
            }

            console.log(`📊 Final master mapping:`, mapping);
            return mapping;
        } catch (error) {
            console.warn(`⚠️ Error getting master mapping: ${error}`);
            return {};
        }
    }

    /**
     * Call Python incremental sync script
     */
    async callIncrementalSync(companyId, companyName, userId, tallyPort, backendUrl, authToken, deviceToken, entityType, maxAlterID = 0) {
        try {
            if (!window.electronAPI?.incrementalSync) {
                console.warn('⚠️ Electron API not available for incremental sync');
                return { success: false, message: 'API not available', count: 0 };
            }

            console.log(`📡 Calling incremental-sync for ${entityType}...`);

            const result = await window.electronAPI.incrementalSync({
                companyId,
                companyName,
                userId,
                tallyPort,
                backendUrl,
                authToken,
                deviceToken,
                entityType,
                maxAlterID
            });

            return result;
        } catch (error) {
            console.error(`❌ Error calling incremental sync for ${entityType}:`, error.message);
            return { success: false, message: error.message, count: 0 };
        }
    }

    /**
     * Get API endpoint for entity type
     */
    getEndpoint(entityType) {
        const endpoints = {
            'Ledger': '/api/ledgers',
            'Group': '/api/groups',
            'StockItem': '/api/stock-items'
        };
        return endpoints[entityType] || '/api/ledgers';
    }

    /**
     * Get scheduler status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastSyncTime: this.lastSyncTime,
            interval: this.getSyncInterval()
        };
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.SyncScheduler = SyncScheduler;
}
