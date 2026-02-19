/**
 * Background Sync Scheduler
 * Runs incremental sync every 2 hours in the background
 * @version 1.0.0
 */

class BackgroundSyncScheduler {
    constructor() {
        this.syncInterval = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
        this.intervalId = null;
        this.lastSyncTime = null;
        this.isRunning = false;
    }
    
    /**
     * Start the background sync scheduler
     */
    start() {
        if (this.intervalId) {
            console.log('⚠️ Background sync scheduler already running');
            return;
        }
        
        console.log('🕒 Starting background sync scheduler (2-hour interval)');
        
        // Run first sync after 5 minutes (to avoid collision with app-start sync)
        setTimeout(() => {
            this.runBackgroundSync();
        }, 5 * 60 * 1000);
        
        // Set up recurring interval
        this.intervalId = setInterval(() => {
            this.runBackgroundSync();
        }, this.syncInterval);
    }
    
    /**
     * Stop the background sync scheduler
     */
    stop() {
        console.log('⏸️ Stopping background sync scheduler');
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    
    /**
     * Run background sync operation
     */
    async runBackgroundSync() {
        // Use SyncStateManager queue if available
        if (window.syncStateManager) {
            if (window.syncStateManager.isSyncInProgress()) {
                console.log('⚠️ Sync already in progress, queuing background sync...');
                window.syncStateManager.addToQueue('background', 0);
                return;
            }
        } else if (this.isRunning) {
            console.log('⚠️ Background sync already running, skipping...');
            return;
        }
        
        console.log('🔄 Starting background sync...');
        this.isRunning = true;
        this.lastSyncTime = new Date();
        
        try {
            // Check if Tally is running
            const tallyStatus = await this.checkTallyStatus();
            
            if (!tallyStatus.running) {
                console.log('ℹ️ Tally not running, skipping background sync');
                return;
            }
            
            // Get auth info
            const authToken = localStorage.getItem('authToken');
            const deviceToken = localStorage.getItem('deviceToken');
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            
            if (!authToken || !deviceToken) {
                console.log('⚠️ Not authenticated, skipping background sync');
                return;
            }
            
            // Fetch companies
            const companies = await this.fetchCompanies();
            
            if (companies.length === 0) {
                console.log('ℹ️ No companies to sync');
                return;
            }

            // Register with SyncStateManager for queue management
            if (window.syncStateManager) {
                window.syncStateManager.startSync('background', companies.length);
            }
            
            let totalNewRecords = 0;
            let syncResults = [];
            
            // Sync each company
            for (const company of companies) {
                try {
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
                        syncMode: 'all'
                    });
                    
                    if (result.success) {
                        totalNewRecords += result.totalCount || 0;
                        if (result.totalCount > 0) {
                            syncResults.push({
                                company: company.name,
                                count: result.totalCount,
                                success: true
                            });
                        }
                        console.log(`✅ ${company.name}: Synced ${result.totalCount || 0} master records`);
                    } else {
                        console.warn(`⚠️ ${company.name}: Master sync issue - ${result.message}`);
                    }

                    // ---- Voucher Sync ----
                    try {
                        if (window.electronAPI?.syncVouchers) {
                            console.log(`  📦 ${company.name}: Syncing Vouchers...`);
                            const _months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                            const _isoToTally = (iso) => {
                                if (!iso || iso.length < 10) return null;
                                const [y, m, d] = iso.split('-');
                                return `${d}-${_months[parseInt(m,10)-1]}-${y}`;
                            };
                            const fromISO = company.booksStart || company.financialYearStart || '';
                            const _now = new Date();
                            const vResult = await window.electronAPI.syncVouchers({
                                companyId: company.id,
                                userId: currentUser.userId,
                                authToken, deviceToken,
                                tallyPort: appSettings.tallyPort || 9000,
                                backendUrl: window.apiConfig.baseURL,
                                companyName: company.name,
                                companyGuid: company.companyGuid || company.guid || '',
                                fromDate: _isoToTally(fromISO) || '01-Apr-2024',
                                toDate: `${String(_now.getDate()).padStart(2,'0')}-${_months[_now.getMonth()]}-${_now.getFullYear()}`,
                                lastAlterID: 0
                            });
                            if (vResult.success) {
                                console.log(`  ✅ ${company.name}: Vouchers synced`);
                            } else {
                                console.warn(`  ⚠️ ${company.name}: Voucher sync failed - ${vResult.message}`);
                            }
                        }
                    } catch (vErr) {
                        console.error(`  ❌ ${company.name}: Voucher sync error:`, vErr.message);
                    }

                    // ---- Bills Outstanding Sync ----
                    try {
                        if (window.electronAPI?.syncBillsOutstanding) {
                            console.log(`  📦 ${company.name}: Syncing Bills Outstanding...`);
                            const bResult = await window.electronAPI.syncBillsOutstanding({
                                companyId: company.id,
                                userId: currentUser.userId,
                                authToken, deviceToken,
                                tallyPort: appSettings.tallyPort || 9000,
                                backendUrl: window.apiConfig.baseURL,
                                companyName: company.name
                            });
                            if (bResult.success) {
                                console.log(`  ✅ ${company.name}: Bills Outstanding synced`);
                            } else {
                                console.warn(`  ⚠️ ${company.name}: Bills sync failed - ${bResult.message}`);
                            }
                        }
                    } catch (bErr) {
                        console.error(`  ❌ ${company.name}: Bills sync error:`, bErr.message);
                    }

                    // Final status reporting
                    if (result.success) {
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
                    } else {
                        syncResults.push({
                            company: company.name,
                            count: 0,
                            success: false,
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
                    console.error(`❌ Error syncing ${company.name}:`, error);
                    syncResults.push({
                        company: company.name,
                        count: 0,
                        success: false,
                        error: error.message
                    });
                }
            }
            
            // Run background reconciliation (actual Python IPC reconciliation)
            await this.runBackgroundReconciliation(companies, currentUser, authToken, deviceToken, appSettings);
            
            // Show notification for sync results (success or failure)
            this.showSyncNotification(totalNewRecords, syncResults);

            // Fire OS system notification on completion
            if (window.notificationService && typeof window.notificationService.system === 'function') {
                const msg = totalNewRecords > 0
                    ? `Sync & Reconciliation complete: ${totalNewRecords} records updated`
                    : 'Sync & Reconciliation complete — all data in sync';
                window.notificationService.system('Talliffy Sync', msg);
            }

            // End sync in SyncStateManager (triggers queue processing)
            if (window.syncStateManager) {
                const hasFailures = syncResults.some(r => r.success === false);
                window.syncStateManager.endSync(!hasFailures, `Background sync: ${totalNewRecords} records`);
            }
            
        } catch (error) {
            console.error('❌ Background sync error:', error);
            if (window.syncStateManager) {
                window.syncStateManager.endSync(false, `Background sync error: ${error.message}`);
            }
        } finally {
            this.isRunning = false;
        }
    }
    
    /**
     * Check if Tally is running and accessible
     */
    async checkTallyStatus() {
        try {
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            const tallyPort = appSettings.tallyPort || 9000;
            
            // Simple ping to check Tally availability
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`http://localhost:${tallyPort}`, {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return { running: true };
        } catch (error) {
            return { running: false };
        }
    }
    
    /**
     * Fetch all imported companies from backend
     */
    async fetchCompanies() {
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
     * Run background reconciliation for all companies
     * Uses actual Python IPC reconciliation (not just status check)
     */
    async runBackgroundReconciliation(companies, currentUser, authToken, deviceToken, appSettings) {
        console.log('🔍 Running background reconciliation...');
        
        if (!window.electronAPI || typeof window.electronAPI.reconcileData !== 'function') {
            console.warn('⚠️ reconcileData IPC not available, skipping reconciliation');
            return;
        }

        let totalMissing = 0;
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
                    totalSynced += result.totalSynced || 0;
                    if (result.totalSynced > 0) {
                        console.log(`✅ ${company.name}: Reconciled and synced ${result.totalSynced} records`);
                    } else {
                        console.log(`✅ ${company.name}: All records in sync`);
                    }
                } else {
                    console.error(`❌ ${company.name}: Reconciliation failed - ${result.message || 'Unknown error'}`);
                }
            } catch (error) {
                console.error(`❌ Error reconciling company ${company.name}:`, error);
            }
        }
        
        if (totalSynced > 0) {
            console.log(`📊 Background reconciliation: ${totalSynced} missing/outdated records synced`);
            if (window.notificationService) {
                window.notificationService.show({
                    type: 'success',
                    message: `🔍 Reconciliation: ${totalSynced} missing/outdated records synced`,
                    details: `Missing: ${totalMissing}`,
                    duration: 5000
                });
            }
        } else {
            console.log('✅ Background reconciliation complete — all records in sync');
        }
    }
    
    /**
     * Show sync notification to user
     */
    showSyncNotification(totalRecords, results) {
        const successCompanies = results.filter(r => r.success !== false);
        const failedCompanies = results.filter(r => r.success === false);
        
        // Show success notification if there are synced records
        if (totalRecords > 0 && successCompanies.length > 0) {
            const details = successCompanies
                .filter(r => r.count > 0)
                .map(r => `${r.company}: ${r.count} records`)
                .join(', ');
            
            if (window.notificationService) {
                window.notificationService.show({
                    type: 'success',
                    message: `✅ Background sync completed: ${totalRecords} new records`,
                    details: details,
                    duration: 8000
                });
            }
        }
        
        // Show error notification if there are failures
        if (failedCompanies.length > 0) {
            const errorDetails = failedCompanies
                .map(r => `${r.company}: ${r.error || 'Failed'}`)
                .join(', ');
            
            if (window.notificationService) {
                window.notificationService.show({
                    type: 'error',
                    message: `❌ Background sync failed for ${failedCompanies.length} company(ies)`,
                    details: errorDetails,
                    duration: 10000
                });
            }
        }
        
        // If no changes and no errors
        if (totalRecords === 0 && failedCompanies.length === 0) {
            console.log('✅ Background sync complete - no changes detected');
        }
    }
    
    /**
     * Get current scheduler status
     */
    getStatus() {
        return {
            running: this.intervalId !== null,
            isRunning: this.isRunning,
            lastSyncTime: this.lastSyncTime,
            nextSyncTime: this.lastSyncTime 
                ? new Date(this.lastSyncTime.getTime() + this.syncInterval)
                : null,
            intervalMinutes: this.syncInterval / 60000
        };
    }
    
    /**
     * Manually trigger background sync
     */
    async triggerManualSync() {
        console.log('🔄 Manual background sync triggered');
        await this.runBackgroundSync();
    }
}

// Export as singleton
window.backgroundSyncScheduler = new BackgroundSyncScheduler();

console.log('✅ Background Sync Scheduler loaded');
