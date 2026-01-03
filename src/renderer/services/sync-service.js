/**
 * Sync Service - Manages data synchronization from Tally to Database
 * - Initial sync: Fetch all data for newly imported companies
 * - Incremental sync: Fetch only changed records (daily)
 * - Reconciliation: Full data verification every 24 hours
 */

class SyncService {
    constructor() {
        this.syncInProgress = false;
        this.lastSyncTime = this.loadLastSyncTime();
        this.syncIntervals = new Map();
        this.SYNC_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
        this.BATCH_DELAY = 100; // ms between company syncs
    }

    /**
     * Start sync system - runs initial sync and sets up recurring syncs
     */
    async startSyncSystem() {
        console.log('🔄 Starting Sync System...');
        
        try {
            // Run initial sync for all companies
            await this.runInitialSync();
            
            // Set up recurring sync every 24 hours
            this.setupRecurringSyncSchedule();
            
            console.log('✅ Sync System Started');
        } catch (error) {
            console.error('❌ Sync System Error:', error);
        }
    }

    /**
     * Initial sync - fetch all data for all imported companies
     */
    async runInitialSync() {
        console.log('📥 Running Initial Sync...');
        
        // Check if sync is allowed using SyncStateManager
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

        try {
            // Sync each company sequentially
            for (let i = 0; i < companies.length; i++) {
                const company = companies[i];
                console.log(`\n[${i + 1}/${companies.length}] Syncing: ${company.name}`);

                try {
                    // Update progress in SyncStateManager
                    window.syncStateManager.updateProgress(i, company.name);

                    // Check if company needs initial sync
                    if (!company.lastSyncDate || company.syncStatus === 'pending') {
                        await this.syncCompanyData(company, true);
                    } else {
                        await this.syncCompanyData(company, false);
                    }

                    // Delay between syncs to avoid overwhelming Tally
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
        }
    }

    /**
     * Sync data for a single company
     */
    async syncCompanyData(company, isFirstSync = false) {
        try {
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            const tallyPort = appSettings.tallyPort || 9000;

            // Get auth headers
            if (!window.authService || !window.authService.isAuthenticated()) {
                throw new Error('Not authenticated');
            }

            const headers = window.authService.getHeaders();

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

            // Store data in database
            await this.storeMasterDataInDatabase(
                company.id,
                masterData,
                headers
            );

            // Update company sync status
            await this.updateCompanySyncStatus(
                company.id,
                'completed',
                headers
            );

            console.log(`✅ Synced ${company.name}`);
        } catch (error) {
            console.error(`Error syncing company ${company.name}:`, error);
            throw error;
        }
    }

    /**
     * Fetch all imported companies from database
     */
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

    /**
     * Fetch master data from Tally for a company
     */
    async fetchMasterDataFromTally(companyName, tallyPort, isFirstSync = false) {
        try {
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');

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

    /**
     * Store master data in database
     */
    async storeMasterDataInDatabase(companyId, masterData, headers) {
        try {
            const payload = {
                companyId,
                masterData,
                syncedAt: new Date().toISOString()
            };

            const response = await fetch(window.apiConfig.getUrl('/sync/master-data'), {
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
                throw new Error(result.message || 'Failed to store data');
            }

            return result;
        } catch (error) {
            console.error('Error storing master data:', error);
            throw error;
        }
    }

    /**
     * Update company sync status
     */
    async updateCompanySyncStatus(companyId, status, headers) {
        try {
            const response = await fetch(
                window.apiConfig.getUrl(`/companies/${companyId}/sync-status`),
                {
                    method: 'PATCH',
                    headers: {
                        ...headers,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        syncStatus: status,
                        lastSyncDate: new Date().toISOString()
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating sync status:', error);
            throw error;
        }
    }

    /**
     * Setup recurring sync schedule (every 24 hours)
     */
    setupRecurringSyncSchedule() {
        // Clear existing interval if any
        if (this.syncIntervals.has('recurring')) {
            clearInterval(this.syncIntervals.get('recurring'));
        }

        // Set up 24-hour recurring sync
        const intervalId = setInterval(() => {
            console.log('⏰ Running scheduled 24-hour sync...');
            this.runInitialSync();
        }, this.SYNC_INTERVAL);

        this.syncIntervals.set('recurring', intervalId);
        console.log('📅 Recurring sync scheduled every 24 hours');
    }

    /**
     * Run reconciliation - verify all data is up-to-date
     */
    async runReconciliation() {
        console.log('🔍 Running Reconciliation...');

        try {
            const companies = await this.fetchImportedCompanies();

            for (const company of companies) {
                await this.reconcileCompanyData(company);
            }

            console.log('✅ Reconciliation Complete');
        } catch (error) {
            console.error('❌ Reconciliation Error:', error);
        }
    }

    /**
     * Reconcile data for a single company
     */
    async reconcileCompanyData(company) {
        try {
            if (!window.authService || !window.authService.isAuthenticated()) {
                return;
            }

            const headers = window.authService.getHeaders();

            // Fetch current data from Tally
            const tallyData = await this.fetchMasterDataFromTally(company.name, 9000, false);

            // Fetch current data from database
            const dbData = await this.fetchCompanyDataFromDatabase(company.id, headers);

            // Compare and update if needed
            const differences = this.compareData(tallyData, dbData);

            if (Object.keys(differences).length > 0) {
                console.log(`🔄 Found differences for ${company.name}, updating...`);
                await this.storeMasterDataInDatabase(company.id, differences, headers);
            } else {
                console.log(`✅ ${company.name} is up-to-date`);
            }
        } catch (error) {
            console.error(`Error reconciling ${company.name}:`, error);
        }
    }

    /**
     * Fetch company data from database
     */
    async fetchCompanyDataFromDatabase(companyId, headers) {
        try {
            const response = await fetch(
                window.apiConfig.getUrl(`/companies/${companyId}/master-data`),
                {
                    method: 'GET',
                    headers: headers
                }
            );

            if (!response.ok) {
                return {};
            }

            const result = await response.json();
            return result.success && result.data ? result.data : {};
        } catch (error) {
            console.error('Error fetching company data from database:', error);
            return {};
        }
    }

    /**
     * Compare Tally data with database data
     */
    compareData(tallyData, dbData) {
        const differences = {};

        for (const [key, tallyRecords] of Object.entries(tallyData)) {
            const dbRecords = dbData[key] || [];
            const dbGuids = new Set(dbRecords.map(r => r.guid));

            const newRecords = tallyRecords.filter(r => !dbGuids.has(r.guid));

            if (newRecords.length > 0) {
                differences[key] = newRecords;
            }
        }

        return differences;
    }

    /**
     * Manual sync trigger
     */
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

    /**
     * Get sync status
     */
    getSyncStatus() {
        return {
            inProgress: this.syncInProgress,
            lastSyncTime: this.lastSyncTime,
            nextSyncTime: new Date(this.lastSyncTime.getTime() + this.SYNC_INTERVAL)
        };
    }

    /**
     * Save last sync time to localStorage
     */
    saveLastSyncTime() {
        this.lastSyncTime = new Date();
        localStorage.setItem('lastSyncTime', this.lastSyncTime.toISOString());
    }

    /**
     * Load last sync time from localStorage
     */
    loadLastSyncTime() {
        const stored = localStorage.getItem('lastSyncTime');
        return stored ? new Date(stored) : new Date(0);
    }

    /**
     * Utility: delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cleanup - stop all sync operations
     */
    stopSyncSystem() {
        console.log('🛑 Stopping Sync System...');
        
        for (const [key, intervalId] of this.syncIntervals) {
            clearInterval(intervalId);
        }
        
        this.syncIntervals.clear();
        console.log('✅ Sync System Stopped');
    }
}

// Export as singleton
window.syncService = new SyncService();
