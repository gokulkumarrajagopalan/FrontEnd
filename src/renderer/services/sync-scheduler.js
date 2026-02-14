class SyncScheduler {
    constructor() {
        this.syncInterval = null;
        this.isRunning = false;
        this.lastSyncTime = null;
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

        this.runSync();
    }


    stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            this.isRunning = false;
            console.log('⏹️ Sync scheduler stopped');
        }
    }


    restart() {
        console.log('🔄 Restarting sync scheduler...');
        this.stop();
        this.start();
    }

    async runSync() {
        try {
            console.log(`\n📊 Running incremental sync at ${new Date().toLocaleTimeString()}`);
            this.lastSyncTime = new Date();

            if (window.LicenseValidator) {
                const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
                const userLicense = currentUser?.licenseNumber || localStorage.getItem('userLicenseNumber');
                const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
                const tallyPort = appSettings.tallyPort || 9000;

                const isValid = await window.LicenseValidator.validateAndNotify(userLicense, tallyPort);
                if (!isValid) {
                    console.error('❌ License validation failed - sync aborted');
                    return;
                }
            }

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

            const companies = await this.fetchImportedCompanies(backendUrl, authToken, deviceToken);
            if (companies.length === 0) {
                console.log('ℹ️ No companies to sync');
                return;
            }

            console.log(`📋 Found ${companies.length} companies to sync`);

            if (window.syncStateManager && !window.syncStateManager.startSync('incremental', companies.length)) {
                console.warn('⚠️ Sync already in progress, this sync will be queued');
                return;
            }

            let successCount = 0;
            let failureCount = 0;
            const failedCompanies = [];

            for (let i = 0; i < companies.length; i++) {
                const company = companies[i];

                if (window.syncStateManager) {
                    window.syncStateManager.updateProgress(i + 1, company.name);
                }

                try {
                    const syncResult = await this.syncCompany(
                        company.id,
                        company.name,
                        currentUser.userId,
                        tallyPort,
                        backendUrl,
                        authToken,
                        deviceToken
                    );

                    if (syncResult.success) {
                        successCount++;
                    } else {
                        failureCount++;
                        failedCompanies.push({
                            name: company.name,
                            errors: syncResult.errors
                        });
                    }
                } catch (error) {
                    console.error(`❌ Error syncing company ${company.name}:`, error);
                    failureCount++;
                    failedCompanies.push({
                        name: company.name,
                        errors: [{ entity: 'COMPANY', message: error.message }]
                    });
                }
            }

            console.log(`✅ Sync cycle completed - ${successCount} successful, ${failureCount} failed`);

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
                    const result = await window.electronAPI.reconcileData({
                        companyId: company.id,
                        companyName: company.name,
                        userId: userId,
                        tallyPort: appSettings.tallyPort || 9000,
                        backendUrl: appSettings.backendUrl || window.apiConfig?.baseURL || window.AppConfig?.API_BASE_URL,
                        authToken: authToken,
                        deviceToken: deviceToken,
                        entityType: 'all'
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

    async syncCompany(companyId, companyName, userId, tallyPort, backendUrl, authToken, deviceToken) {
        const result = { success: true, errors: [] };

        try {
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

            for (const entity of entities) {
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
        try {
            const isFirstSync = maxAlterID === 0;

            console.log(`  📦 ${entityType}: Max AlterID in DB = ${maxAlterID}${isFirstSync ? ' (FIRST-TIME SYNC)' : ''}`);
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
                console.warn(`  ⚠️ ${entityType}: ${result.message}`);
                return { success: false, message: result.message };
            }
        } catch (error) {
            console.error(`  ❌ Error syncing ${entityType}:`, error);
            return { success: false, message: error.message || 'Unknown error' };
        }
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
            console.log(`🔍 Checking window.electronAPI:`, window.electronAPI);
            console.log(`🔍 Checking incrementalSync method:`, window.electronAPI?.incrementalSync);

            if (!window.electronAPI?.incrementalSync) {
                console.warn('⚠️ Electron API not available');
                console.warn(`   window.electronAPI exists: ${!!window.electronAPI}`);
                console.warn(`   incrementalSync method exists: ${!!window.electronAPI?.incrementalSync}`);
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
                maxAlterID  // Pass maxAlterID from DB - Python will fetch records with alterID > maxAlterID
            });

            return result;
        } catch (error) {
            console.error('❌ Error calling incremental sync:', error);
            console.error('   Error message:', error.message);
            console.error('   Error stack:', error.stack);
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
