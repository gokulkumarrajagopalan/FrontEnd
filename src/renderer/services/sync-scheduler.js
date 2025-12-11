/**
 * Automatic Sync Scheduler Service
 * Handles interval-based automatic syncing of groups and ledgers for all imported companies
 */

class SyncScheduler {
    constructor() {
        this.intervalId = null;
        this.isRunning = false;
        this.isSyncing = false;
        this.syncInterval = 30; // Default 30 minutes
        this.lastSyncTime = null;
        
        console.log('🔄 SyncScheduler initialized');
    }

    /**
     * Start the automatic sync scheduler
     */
    start() {
        // Load sync interval from settings
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        this.syncInterval = settings.syncInterval || 30;
        
        console.log(`🔄 Starting sync scheduler with interval: ${this.syncInterval} minutes`);
        
        // Don't start if interval is 0 (disabled)
        if (this.syncInterval === 0) {
            console.log('⏸️ Auto-sync disabled (interval = 0)');
            return;
        }
        
        // Stop existing interval if running
        this.stop();
        
        // Convert minutes to milliseconds
        const intervalMs = this.syncInterval * 60 * 1000;
        
        // Start interval
        this.intervalId = setInterval(() => {
            this.performAutoSync();
        }, intervalMs);
        
        this.isRunning = true;
        
        console.log(`✅ Sync scheduler started. Next sync in ${this.syncInterval} minutes`);
        
        // Optionally perform initial sync immediately
        // Uncomment if you want to sync on startup
        // this.performAutoSync();
    }

    /**
     * Stop the automatic sync scheduler
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.isRunning = false;
            console.log('⏹️ Sync scheduler stopped');
        }
    }

    /**
     * Restart the scheduler (useful when settings change)
     */
    restart() {
        console.log('🔄 Restarting sync scheduler...');
        this.stop();
        this.start();
    }

    /**
     * Perform automatic sync for all imported companies
     */
    async performAutoSync() {
        if (this.isSyncing) {
            console.log('⏭️ Sync already in progress, skipping...');
            return;
        }

        try {
            this.isSyncing = true;
            console.log('='.repeat(60));
            console.log('🔄 AUTO-SYNC STARTED');
            console.log('='.repeat(60));
            console.log('⏰ Time:', new Date().toLocaleString());
            
            // Check if user is authenticated
            if (!window.authService || !window.authService.isAuthenticated()) {
                console.log('⚠️ User not authenticated, skipping auto-sync');
                return;
            }

            // Get auth tokens
            const authToken = localStorage.getItem('authToken');
            const deviceToken = localStorage.getItem('deviceToken');
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
            
            if (!authToken || !deviceToken || !currentUser) {
                console.log('⚠️ Missing authentication data, skipping auto-sync');
                return;
            }

            // Get all imported companies from backend
            const companies = await this.getImportedCompanies(authToken, deviceToken);
            
            if (!companies || companies.length === 0) {
                console.log('📋 No companies found to sync');
                return;
            }

            console.log(`📊 Found ${companies.length} companies to sync`);

            // Get settings
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            const tallyPort = appSettings.tallyPort || 9000;
            const backendUrl = window.apiConfig?.baseURL || window.AppConfig?.API_BASE_URL || 'http://localhost:8080';

            let successCount = 0;
            let failCount = 0;

            // Sync each company
            for (const company of companies) {
                console.log(`\n📦 Syncing company: ${company.name} (ID: ${company.id})`);
                
                try {
                    // Sync groups
                    console.log('   🔄 Syncing groups...');
                    const groupsResult = await this.syncCompanyGroups(
                        company.id,
                        currentUser.userId,
                        authToken,
                        deviceToken,
                        tallyPort,
                        backendUrl
                    );
                    
                    if (groupsResult.success) {
                        console.log(`   ✅ Groups synced: ${groupsResult.count || 0} groups`);
                    } else {
                        console.log(`   ⚠️ Groups sync failed: ${groupsResult.message}`);
                    }

                    // Sync ledgers
                    console.log('   🔄 Syncing ledgers...');
                    const ledgersResult = await this.syncCompanyLedgers(
                        company.id,
                        currentUser.userId,
                        authToken,
                        deviceToken,
                        tallyPort,
                        backendUrl
                    );
                    
                    if (ledgersResult.success) {
                        console.log(`   ✅ Ledgers synced: ${ledgersResult.count || 0} ledgers`);
                    } else {
                        console.log(`   ⚠️ Ledgers sync failed: ${ledgersResult.message}`);
                    }

                    if (groupsResult.success && ledgersResult.success) {
                        successCount++;
                    } else {
                        failCount++;
                    }

                } catch (error) {
                    console.error(`   ❌ Error syncing company ${company.name}:`, error);
                    failCount++;
                }
            }

            this.lastSyncTime = new Date();
            
            console.log('\n' + '='.repeat(60));
            console.log('✅ AUTO-SYNC COMPLETED');
            console.log('='.repeat(60));
            console.log(`📊 Results: ${successCount} succeeded, ${failCount} failed`);
            console.log(`⏰ Next sync in ${this.syncInterval} minutes`);
            console.log('='.repeat(60));

            // Show notification to user
            if (window.notificationService) {
                if (successCount > 0) {
                    window.notificationService.success(
                        `🔄 Auto-sync completed: ${successCount} companies synced successfully`
                    );
                }
            }

        } catch (error) {
            console.error('❌ Auto-sync error:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Get all imported companies from backend
     */
    async getImportedCompanies(authToken, deviceToken) {
        try {
            const backendUrl = window.apiConfig?.baseURL || window.AppConfig?.API_BASE_URL || 'http://localhost:8080';
            
            const response = await fetch(`${backendUrl}/companies`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'X-Device-Token': deviceToken
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success && Array.isArray(result.data)) {
                return result.data;
            }
            
            return [];
        } catch (error) {
            console.error('Error fetching companies:', error);
            return [];
        }
    }

    /**
     * Sync groups for a specific company
     */
    async syncCompanyGroups(companyId, userId, authToken, deviceToken, tallyPort, backendUrl) {
        try {
            if (!window.electronAPI || !window.electronAPI.syncGroups) {
                throw new Error('Electron API not available');
            }

            const result = await window.electronAPI.syncGroups({
                companyId: companyId,
                userId: userId,
                authToken: authToken,
                deviceToken: deviceToken,
                tallyPort: tallyPort,
                backendUrl: backendUrl
            });

            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Sync ledgers for a specific company
     */
    async syncCompanyLedgers(companyId, userId, authToken, deviceToken, tallyPort, backendUrl) {
        try {
            if (!window.electronAPI || !window.electronAPI.syncLedgers) {
                throw new Error('Electron API not available');
            }

            const result = await window.electronAPI.syncLedgers({
                companyId: companyId,
                userId: userId,
                authToken: authToken,
                deviceToken: deviceToken,
                tallyPort: tallyPort,
                backendUrl: backendUrl
            });

            return result;
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Get status of the scheduler
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            isSyncing: this.isSyncing,
            syncInterval: this.syncInterval,
            lastSyncTime: this.lastSyncTime,
            nextSyncTime: this.lastSyncTime 
                ? new Date(this.lastSyncTime.getTime() + this.syncInterval * 60 * 1000)
                : null
        };
    }
}

// Create global instance
window.syncScheduler = new SyncScheduler();

console.log('✅ SyncScheduler service loaded');
