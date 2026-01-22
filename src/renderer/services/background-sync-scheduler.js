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
        if (this.isRunning) {
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
            const authToken = sessionStorage.getItem('authToken');
            const deviceToken = sessionStorage.getItem('deviceToken');
            const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
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
            
            // Run background reconciliation
            await this.runBackgroundReconciliation(companies);
            
            // Show notification for sync results (success or failure)
            this.showSyncNotification(totalNewRecords, syncResults);
            
        } catch (error) {
            console.error('❌ Background sync error:', error);
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
     */
    async runBackgroundReconciliation(companies) {
        console.log('🔍 Running background reconciliation...');
        
        for (const company of companies) {
            try {
                await this.reconcileCompany(company.id);
            } catch (error) {
                console.error(`Error reconciling company ${company.id}:`, error);
            }
        }
        
        console.log('✅ Background reconciliation complete');
    }
    
    /**
     * Reconcile a single company
     */
    async reconcileCompany(companyId) {
        try {
            const headers = window.authService.getHeaders();
            const response = await fetch(
                window.apiConfig.getUrl(`/api/companies/${companyId}/reconcile-status`),
                {
                    method: 'GET',
                    headers: headers
                }
            );
            
            if (response.ok) {
                const result = await response.json();
                if (result.discrepancies && result.discrepancies.length > 0) {
                    console.warn(`⚠️ Reconciliation issues found for company ${companyId}:`, result);
                }
            }
        } catch (error) {
            console.error('Reconciliation error:', error);
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
