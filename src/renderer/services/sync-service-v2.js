/**
 * Sync Service - Manages data synchronization from Tally to Database
 * Sends data to backend /sync endpoint for processing
 */

class SyncService {
    constructor() {
        this.syncInProgress = false;
        this.lastSyncTime = this.loadLastSyncTime();
        this.syncIntervals = new Map();
        this.SYNC_INTERVAL = 24 * 60 * 60 * 1000;
        this.BATCH_DELAY = 100;
    }

    async startSyncSystem() {
        console.log('🔄 Starting Sync System...');
        
        try {
            await this.runInitialSync();
            this.setupRecurringSyncSchedule();
            console.log('✅ Sync System Started');
        } catch (error) {
            console.error('❌ Sync System Error:', error);
        }
    }

    async runInitialSync() {
        console.log('📥 Running Initial Sync...');
        
        if (this.syncInProgress) {
            console.warn('⚠️ Sync already in progress');
            return;
        }

        const companies = await this.fetchImportedCompanies();
        console.log(`📊 Found ${companies.length} companies to sync`);

        if (companies.length === 0) {
            console.log('ℹ️ No companies to sync');
            return;
        }

        // Try to start sync through SyncStateManager
        if (!window.syncStateManager.startSync('full', companies.length)) {
            console.warn('⚠️ Sync already in progress - request queued');
            return;
        }

        this.syncInProgress = true;

        try {
            for (let i = 0; i < companies.length; i++) {
                const company = companies[i];
                console.log(`\n[${i + 1}/${companies.length}] Syncing: ${company.name}`);

                try {
                    // Update progress in SyncStateManager
                    window.syncStateManager.updateProgress(i, company.name);

                    await this.syncCompanyData(company, true);

                    if (i < companies.length - 1) {
                        await this.delay(this.BATCH_DELAY);
                    }
                } catch (error) {
                    console.error(`❌ Error syncing ${company.name}:`, error);
                }
            }

            this.saveLastSyncTime();
            console.log('✅ Initial Sync Complete');
            window.syncStateManager.endSync(true, 'All companies synced successfully');
        } catch (error) {
            console.error('❌ Sync Error:', error);
            window.syncStateManager.endSync(false, error.message);
        } finally {
            this.syncInProgress = false;
        }
    }

    async syncCompanyData(company, isFirstSync = false) {
        try {
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            const tallyPort = appSettings.tallyPort || 9000;

            if (!window.authService || !window.authService.isAuthenticated()) {
                throw new Error('Not authenticated');
            }

            const headers = window.authService.getHeaders();
            const currentUser = window.authService.getCurrentUser();

            // Fetch master data from Tally
            const masterData = await this.fetchMasterDataFromTally(
                company.name,
                tallyPort,
                isFirstSync
            );

            if (!masterData || Object.keys(masterData).length === 0) {
                console.log(`ℹ️ No new data for ${company.name}`);
                return;
            }

            // Send to backend /sync endpoint
            await this.sendToBackendSync(
                company.id,
                currentUser.userId,
                masterData,
                headers
            );

            console.log(`✅ Synced ${company.name}`);
        } catch (error) {
            console.error(`Error syncing company ${company.name}:`, error);
            throw error;
        }
    }

    async fetchImportedCompanies() {
        try {
            if (!window.authService || !window.authService.isAuthenticated()) {
                return [];
            }

            const headers = window.authService.getHeaders();
            const response = await fetch(window.apiConfig.getUrl('/companies'), {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            return result.success && Array.isArray(result.data) ? result.data : [];
        } catch (error) {
            console.error('Error fetching companies:', error);
            return [];
        }
    }

    async fetchMasterDataFromTally(companyName, tallyPort, isFirstSync = false) {
        try {
            const result = await window.electronAPI.invoke('fetch-master-data', {
                companyName,
                tallyPort,
                isFirstSync
            });

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch master data');
            }

            return result.data || {};
        } catch (error) {
            console.error(`Error fetching master data for ${companyName}:`, error);
            return {};
        }
    }

    async sendToBackendSync(companyId, userId, masterData, headers) {
        try {
            console.log(`📤 Sending sync data to backend for company ${companyId}...`);

            // Send each master type separately
            for (const [masterType, records] of Object.entries(masterData)) {
                if (!Array.isArray(records) || records.length === 0) {
                    continue;
                }

                const endpoint = this.getMasterTypeEndpoint(masterType);
                const payload = {
                    cmpId: companyId,
                    userId: userId,
                    syncType: 'INITIAL',
                    [masterType.toLowerCase()]: records
                };

                console.log(`  📨 Sending ${records.length} ${masterType} records...`);

                const response = await fetch(window.apiConfig.getUrl(endpoint), {
                    method: 'POST',
                    headers: {
                        ...headers,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.message || 'Failed to sync data');
                }

                console.log(`  ✅ ${masterType}: ${result.count} records synced`);
            }

            console.log(`✅ All data sent to backend for company ${companyId}`);
        } catch (error) {
            console.error('Error sending to backend:', error);
            throw error;
        }
    }

    getMasterTypeEndpoint(masterType) {
        const endpointMap = {
            'Group': '/sync/groups',
            'StockItem': '/sync/stock-items',
            'CostCategory': '/sync/cost-categories',
            'CostCenter': '/sync/cost-centers',
            'Currency': '/sync/currencies',
            'Unit': '/sync/units',
            'TaxUnit': '/sync/tax-units',
            'VoucherType': '/sync/voucher-types',
            'Godown': '/sync/godowns',
            'STOCKGROUP': '/sync/stock-groups',
            'StockCategory': '/sync/stock-categories'
        };
        return endpointMap[masterType] || `/sync/${masterType.toLowerCase()}`;
    }

    setupRecurringSyncSchedule() {
        if (this.syncIntervals.has('recurring')) {
            clearInterval(this.syncIntervals.get('recurring'));
        }

        const intervalId = setInterval(() => {
            console.log('⏰ Running scheduled 24-hour sync...');
            this.runInitialSync();
        }, this.SYNC_INTERVAL);

        this.syncIntervals.set('recurring', intervalId);
        console.log('📅 Recurring sync scheduled every 24 hours');
    }

    async manualSync() {
        if (this.syncInProgress) {
            console.warn('⚠️ Sync already in progress');
            return { success: false, message: 'Sync already in progress' };
        }

        try {
            await this.runInitialSync();
            return { success: true, message: 'Sync completed' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    getSyncStatus() {
        return {
            inProgress: this.syncInProgress,
            lastSyncTime: this.lastSyncTime,
            nextSyncTime: new Date(this.lastSyncTime.getTime() + this.SYNC_INTERVAL)
        };
    }

    saveLastSyncTime() {
        this.lastSyncTime = new Date();
        localStorage.setItem('lastSyncTime', this.lastSyncTime.toISOString());
    }

    loadLastSyncTime() {
        const stored = localStorage.getItem('lastSyncTime');
        return stored ? new Date(stored) : new Date(0);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    stopSyncSystem() {
        console.log('🛑 Stopping Sync System...');
        
        for (const [key, intervalId] of this.syncIntervals) {
            clearInterval(intervalId);
        }
        
        this.syncIntervals.clear();
        console.log('✅ Sync System Stopped');
    }
}

window.syncService = new SyncService();
