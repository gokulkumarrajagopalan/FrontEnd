/**
 * App Initialization - Start sync scheduler and app-start sync
 */

class AppInitializer {
    /**
     * Initialize the sync system - runs on app start
     * Scenario 2: App Open → Incremental Sync → Reconcile
     * Scenario 3: Every 2 Hours → Background Sync → Reconcile
     */
    static async initialize() {
        try {
            console.log('🚀 Initializing App Sync System...');
            
            // Check if user is authenticated
            const authToken = sessionStorage.getItem('authToken');
            if (!authToken) {
                console.log('ℹ️ User not authenticated, sync system will start after login');
                return;
            }

            // Run app-start incremental sync
            await this.runAppStartSync();

            // Start background sync scheduler (2-hour interval)
            this.initializeBackgroundSyncScheduler();

            console.log('✅ App Sync System initialized');
        } catch (error) {
            console.error('❌ Error initializing app sync system:', error);
        }
    }

    /**
     * Run incremental sync when app starts
     * Scenario 2: App Open → Incremental Sync → Reconcile
     */
    static async runAppStartSync() {
        console.log('🔄 Running app-start incremental sync...');
        
        try {
            // CRITICAL: Verify authentication before starting sync
            const authToken = sessionStorage.getItem('authToken');
            const deviceToken = sessionStorage.getItem('deviceToken');
            const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
            
            if (!currentUser || !authToken || !deviceToken) {
                console.log('⚠️ Not authenticated - skipping app-start sync');
                console.log('   Sync will start after successful login');
                return;
            }

            // Check if auth service is available and user is authenticated
            if (!window.authService || !window.authService.isAuthenticated()) {
                console.log('⚠️ Auth service not ready or user not authenticated');
                return;
            }

            // Check app settings for sync-on-start
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            if (appSettings.syncOnAppStart === false) {
                console.log('ℹ️ App-start sync disabled in settings');
                return;
            }

            const companies = await this.fetchImportedCompanies();
            
            if (companies.length === 0) {
                console.log('ℹ️ No companies to sync');
                return;
            }

            let totalSynced = 0;
            const syncResults = [];
            const failedCompanies = [];

            // Sync each company incrementally
            for (const company of companies) {
                try {
                    console.log(`🔄 Syncing: ${company.name}`);
                    
                    // Show sync started notification
                    if (window.notificationService) {
                        window.notificationService.show({
                            type: 'info',
                            message: `🔄 ${company.name} - Sync started`,
                            duration: 3000
                        });
                    }
                    
                    const result = await window.electronAPI.incrementalSync({
                        companyId: company.id,
                        companyName: company.name,
                        userId: currentUser.userId,
                        tallyPort: appSettings.tallyPort || 9000,
                        backendUrl: window.apiConfig.baseURL,
                        authToken: authToken,
                        deviceToken: deviceToken,
                        syncMode: 'all' // Sync all entity types
                    });
                    
                    if (result.success) {
                        totalSynced += result.totalCount || 0;
                        if (result.totalCount > 0) {
                            syncResults.push({
                                company: company.name,
                                count: result.totalCount,
                                success: true
                            });
                        }
                        console.log(`✅ ${company.name}: Synced ${result.totalCount || 0} records`);
                        
                        // Show sync completed notification
                        if (window.notificationService) {
                            window.notificationService.show({
                                type: 'success',
                                message: `✅ ${company.name} - Sync completed (${result.totalCount || 0} records)`,
                                duration: 4000
                            });
                        }
                        
                        // Update notification center status
                        if (window.notificationCenter) {
                            window.notificationCenter.updateCompanySyncStatus(
                                company.name,
                                'success',
                                result.totalCount || 0
                            );
                        }
                    } else if (result.error && result.error.includes('401')) {
                        // 401 Unauthorized - stop sync immediately
                        console.error('❌ Authentication failed (401) - stopping sync');
                        console.error('   User needs to login again');
                        
                        if (window.notificationService) {
                            window.notificationService.show({
                                type: 'error',
                                message: 'Authentication expired',
                                details: 'Please login again to continue syncing',
                                duration: 5000
                            });
                        }
                        
                        // Stop syncing remaining companies
                        break;
                    } else {
                        // Other sync failure
                        failedCompanies.push({
                            company: company.name,
                            error: result.message || 'Sync failed'
                        });
                        console.error(`❌ ${company.name}: Sync failed - ${result.message}`);
                        
                        // Update notification center status
                        if (window.notificationCenter) {
                            window.notificationCenter.updateCompanySyncStatus(
                                company.name,
                                'error',
                                0,
                                result.message || 'Sync failed'
                            );
                        }
                    }
                } catch (error) {
                    console.error(`Error syncing ${company.name}:`, error);
                    failedCompanies.push({
                        company: company.name,
                        error: error.message
                    });
                    
                    // Check if error is 401 Unauthorized
                    if (error.message && error.message.includes('401')) {
                        console.error('❌ Authentication error - stopping sync');
                        break;
                    }
                }
            }
            
            // Show success notification if changes found
            if (totalSynced > 0) {
                const details = syncResults
                    .filter(r => r.count > 0)
                    .map(r => `${r.company}: ${r.count} records`)
                    .join(', ');
                
                if (window.notificationService) {
                    window.notificationService.show({
                        type: 'success',
                        message: `✅ App Start Sync: ${totalSynced} new records synced`,
                        details: details,
                        duration: 5000
                    });
                } else {
                    console.log(`📢 App Start Sync: ${totalSynced} new records synced - ${details}`);
                }
            } else if (failedCompanies.length === 0) {
                console.log('✅ App-start sync complete - no changes detected');
            }
            
            // Show error notification if there are failures
            if (failedCompanies.length > 0) {
                const errorDetails = failedCompanies
                    .map(r => `${r.company}: ${r.error}`)
                    .join(', ');
                
                if (window.notificationService) {
                    window.notificationService.show({
                        type: 'error',
                        message: `❌ App Start Sync failed for ${failedCompanies.length} company(ies)`,
                        details: errorDetails,
                        duration: 8000
                    });
                }
            }
            
            // CASE 2: Run reconciliation after app-start sync
            console.log('🔍 Starting post-login reconciliation...');
            setTimeout(() => {
                this.runReconciliation(companies, currentUser, authToken, deviceToken, appSettings);
            }, 2000); // 2 second delay after sync completes
            
        } catch (error) {
            console.error('❌ App-start sync error:', error);
        }
    }

    /**
     * Fetch imported companies from backend
     */
    static async fetchImportedCompanies() {
        try {
            if (!window.authService || !window.authService.isAuthenticated()) {
                console.log('⚠️ Not authenticated - cannot fetch companies');
                return [];
            }

            const headers = window.authService.getHeaders();
            const response = await fetch(window.apiConfig.getUrl('/companies'), {
                method: 'GET',
                headers: headers
            });

            if (response.status === 401) {
                console.error('❌ 401 Unauthorized - authentication expired');
                console.error('   User needs to login again');
                
                // Clear invalid tokens
                sessionStorage.removeItem('authToken');
                sessionStorage.removeItem('deviceToken');
                sessionStorage.removeItem('currentUser');
                
                return [];
            }

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
     * Initialize background sync scheduler
     * Scenario 3: Every 2 Hours → Background Sync → Reconcile
     */
    static initializeBackgroundSyncScheduler() {
        try {
            // Check app settings
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            if (appSettings.backgroundSyncEnabled === false) {
                console.log('ℹ️ Background sync disabled in settings');
                return;
            }

            // Start background scheduler (2-hour interval)
            if (window.backgroundSyncScheduler) {
                window.backgroundSyncScheduler.start();
                console.log('✅ Background sync scheduler started (2-hour interval)');
            } else {
                console.warn('⚠️ Background sync scheduler not loaded');
            }
        } catch (error) {
            console.error('❌ Error starting background sync scheduler:', error);
        }
    }

    /**
     * Stop background sync scheduler
     */
    static stopBackgroundSyncScheduler() {
        if (window.backgroundSyncScheduler) {
            window.backgroundSyncScheduler.stop();
            console.log('✅ Background sync scheduler stopped');
        }
    }

    /**
     * Initialize legacy sync scheduler (kept for backward compatibility)
     */
    static initializeSyncScheduler() {
        try {
            // Check if user is authenticated
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                console.log('ℹ️ User not authenticated, sync scheduler will start after login');
                return;
            }

            // Initialize and start scheduler
            window.syncScheduler = new SyncScheduler();
            window.syncScheduler.start();

            console.log('✅ Sync scheduler initialized');
        } catch (error) {
            console.error('❌ Error initializing sync scheduler:', error);
        }
    }

    static stopSyncScheduler() {
        if (window.syncScheduler) {
            window.syncScheduler.stop();
            console.log('✅ Sync scheduler stopped');
        }
    }

    static restartSyncScheduler() {
        this.stopSyncScheduler();
        this.initializeSyncScheduler();
        console.log('✅ Sync scheduler restarted');
    }

    static getSyncStatus() {
        const status = {
            legacy: null,
            background: null
        };

        if (window.syncScheduler) {
            status.legacy = window.syncScheduler.getStatus();
        }

        if (window.backgroundSyncScheduler) {
            status.background = window.backgroundSyncScheduler.getStatus();
        }

        return status;
    }

    /**
     * Run reconciliation for all companies
     * Detects missing/outdated records and auto-syncs them
     */
    static async runReconciliation(companies, currentUser, authToken, deviceToken, appSettings) {
        try {
            console.log(`🔍 Reconciling ${companies.length} companies...`);
            
            let totalMissing = 0;
            let totalUpdated = 0;
            let totalSynced = 0;
            
            for (const company of companies) {
                try {
                    console.log(`🔍 Reconciling: ${company.name}`);
                    
                    const result = await window.electronAPI.reconcileData({
                        companyId: company.id,
                        companyName: company.name,
                        userId: currentUser.userId,
                        tallyPort: appSettings.tallyPort || 9000,
                        backendUrl: window.apiConfig.baseURL,
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
                        } else {
                            console.log(`✅ ${company.name}: All records in sync`);
                        }
                    } else {
                        console.error(`❌ ${company.name}: Reconciliation failed`);
                    }
                } catch (error) {
                    console.error(`❌ Error reconciling ${company.name}:`, error);
                }
            }
            
            // Show notification if any records were synced
            if (totalSynced > 0) {
                if (window.notificationService) {
                    window.notificationService.show({
                        type: 'success',
                        message: `🔍 Reconciliation: ${totalSynced} missing/outdated records synced`,
                        details: `Missing: ${totalMissing}, Updated: ${totalUpdated}`,
                        duration: 5000
                    });
                }
            } else {
                console.log('✅ Reconciliation complete - all records in sync');
            }
            
        } catch (error) {
            console.error('❌ Reconciliation error:', error);
        }
    }

    /**
     * Stop all sync systems (called on logout)
     */
    static stopAllSyncSystems() {
        this.stopSyncScheduler();
        this.stopBackgroundSyncScheduler();
        console.log('✅ All sync systems stopped');
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.AppInitializer = AppInitializer;

    // Listen for logout event to stop sync schedulers
    window.addEventListener('user-logout', () => {
        AppInitializer.stopAllSyncSystems();
    });
}
