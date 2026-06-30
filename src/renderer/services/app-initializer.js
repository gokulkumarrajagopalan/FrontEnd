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
            
            // Check if user is authenticated (auth tokens stored in localStorage)
            const authToken = (window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function')
                ? window.electronAPI.secureStoreGet('authToken')
                : localStorage.getItem('authToken');
            if (!authToken) {
                console.log('ℹ️ User not authenticated, sync system will start after login');
                return;
            }

            // Schedule auto-sync 30 seconds after app opens
            console.log('⏱️ Auto-sync scheduled to start in 30 seconds...');
            this._autoSyncTimer = setTimeout(async () => {
                try {
                    console.log('🔄 Auto-sync starting (30s after app open)...');
                    await this.runAppStartSync();
                } catch (err) {
                    console.error('❌ Auto-sync error:', err);
                }
            }, 30 * 1000);

            // Start background sync scheduler (2-hour interval)
            this.initializeBackgroundSyncScheduler();

            console.log('✅ App Sync System initialized (auto-sync in 30s)');
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
            const authToken = (window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function')
                ? window.electronAPI.secureStoreGet('authToken')
                : localStorage.getItem('authToken');
            const deviceToken = (window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function')
                ? window.electronAPI.secureStoreGet('deviceToken')
                : localStorage.getItem('deviceToken');
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            
            if (!currentUser || !authToken || !deviceToken) {
                console.log('⚠️ Not authenticated - skipping app-start sync');
                console.log('   Sync will start after successful login');
                return;
            }

            // Check if auth service is available and user is authenticated
            if (!window.authService || !window.authService.isAuthenticated()) {
                console.log('ℹ️ Auth service not ready or user not authenticated');
                return;
            }

            // Check app settings for sync-on-start
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            if (appSettings.syncOnAppStart === false) {
                console.log('ℹ️ App-start sync disabled in settings');
                return;
            }

            // Check if Tally is running and has companies loaded
            let tallyStatus = { running: true, loadedCompanies: null };
            const tallyPort = appSettings.tallyPort || 9000;
            const tallyHost = appSettings.tallyHost || 'localhost';
            try {
                if (window.backgroundSyncScheduler && typeof window.backgroundSyncScheduler.checkTallyStatus === 'function') {
                    tallyStatus = await window.backgroundSyncScheduler.checkTallyStatus();
                } else if (window.backgroundSyncScheduler && typeof window.backgroundSyncScheduler.fetchTallyLoadedCompanies === 'function') {
                    const pingCtrl = new AbortController();
                    const pingTimeout = setTimeout(() => pingCtrl.abort(), 4000);
                    await fetch(`http://${tallyHost}:${tallyPort}`, { method: 'GET', signal: pingCtrl.signal });
                    clearTimeout(pingTimeout);
                    const rawList = await window.backgroundSyncScheduler.fetchTallyLoadedCompanies(`http://${tallyHost}:${tallyPort}`);
                    tallyStatus.loadedCompanies = rawList ?? [];
                }
            } catch (err) {
                tallyStatus.running = false;
                tallyStatus.loadedCompanies = [];
            }

            if (!tallyStatus.running) {
                console.log('ℹ️ Tally not running, skipping app-start sync');
                return;
            }

            if (tallyStatus.loadedCompanies && tallyStatus.loadedCompanies.length === 0) {
                console.log('ℹ️ Tally is running but no companies are loaded — skipping sync to prevent MAV');
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

                    // Check if this specific company is loaded
                    if (tallyStatus.loadedCompanies) {
                        const normalize = (name) => {
                            if (window.backgroundSyncScheduler && typeof window.backgroundSyncScheduler.normalizeCompanyName === 'function') {
                                return window.backgroundSyncScheduler.normalizeCompanyName(name);
                            }
                            return String(name || '').toLowerCase().replace(/[^a-z0-9]/gi, '').trim();
                        };
                        const companyNameNorm = normalize(company.name);
                        const isLoaded = tallyStatus.loadedCompanies.some(n => normalize(n) === companyNameNorm);
                        if (!isLoaded) {
                            console.log(`⏭️ Skipping "${company.name}" — not loaded in Tally`);
                            continue;
                        }
                    }
                    
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
                        syncMode: 'all', // Sync all entity types
                        // Sync every master entity in ONE worker process (dependency order).
                        entityType: 'all'
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
            
            // NOTE: Reconciliation is intentionally NOT run here. It is decoupled from sync
            // and runs on its own 1-hour schedule (see BackgroundSyncScheduler.startReconciliationScheduler),
            // which waits until any in-progress sync has finished (UI showing 100%) before reconciling.
            // This keeps reconciliation off the "every sync" path.
            if (window.notificationService && typeof window.notificationService.system === 'function') {
                const msg = totalSynced > 0
                    ? `Sync complete: ${totalSynced} records synced`
                    : 'Sync complete — all data up to date';
                window.notificationService.system('Talliffy Sync', msg);
            }

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
                localStorage.removeItem('authToken');
                localStorage.removeItem('deviceToken');
                localStorage.removeItem('currentUser');
                
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
            const authToken = (window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function')
                ? window.electronAPI.secureStoreGet('authToken')
                : localStorage.getItem('authToken');
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
            
            // Check if Tally is running and has companies loaded
            let tallyStatus = { running: true, loadedCompanies: null };
            const tallyPort = appSettings.tallyPort || 9000;
            const tallyHost = appSettings.tallyHost || 'localhost';
            try {
                if (window.backgroundSyncScheduler && typeof window.backgroundSyncScheduler.checkTallyStatus === 'function') {
                    tallyStatus = await window.backgroundSyncScheduler.checkTallyStatus();
                } else if (window.backgroundSyncScheduler && typeof window.backgroundSyncScheduler.fetchTallyLoadedCompanies === 'function') {
                    const pingCtrl = new AbortController();
                    const pingTimeout = setTimeout(() => pingCtrl.abort(), 4000);
                    await fetch(`http://${tallyHost}:${tallyPort}`, { method: 'GET', signal: pingCtrl.signal });
                    clearTimeout(pingTimeout);
                    const rawList = await window.backgroundSyncScheduler.fetchTallyLoadedCompanies(`http://${tallyHost}:${tallyPort}`);
                    tallyStatus.loadedCompanies = rawList ?? [];
                }
            } catch (err) {
                tallyStatus.running = false;
                tallyStatus.loadedCompanies = [];
            }

            if (!tallyStatus.running) {
                console.log('ℹ️ Tally not running, skipping reconciliation');
                return;
            }

            if (tallyStatus.loadedCompanies && tallyStatus.loadedCompanies.length === 0) {
                console.log('ℹ️ Tally is running but no companies are loaded — skipping reconciliation to prevent MAV');
                return;
            }

            let totalMissing = 0;
            let totalUpdated = 0;
            let totalSynced = 0;
            
            for (const company of companies) {
                try {
                    console.log(`🔍 Reconciling: ${company.name}`);

                    // Check if this specific company is loaded
                    if (tallyStatus.loadedCompanies) {
                        const normalize = (name) => {
                            if (window.backgroundSyncScheduler && typeof window.backgroundSyncScheduler.normalizeCompanyName === 'function') {
                                return window.backgroundSyncScheduler.normalizeCompanyName(name);
                            }
                            return String(name || '').toLowerCase().replace(/[^a-z0-9]/gi, '').trim();
                        };
                        const companyNameNorm = normalize(company.name);
                        const isLoaded = tallyStatus.loadedCompanies.some(n => normalize(n) === companyNameNorm);
                        if (!isLoaded) {
                            console.log(`⏭️ Skipping reconciliation for "${company.name}" — not loaded in Tally`);
                            continue;
                        }
                    }
                    
                    const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const _now = new Date();
                    const _fyStart = _now.getMonth() >= 3 ? `01-Apr-${_now.getFullYear()}` : `01-Apr-${_now.getFullYear() - 1}`;
                    const _today = `${String(_now.getDate()).padStart(2, '0')}-${_months[_now.getMonth()]}-${_now.getFullYear()}`;
                    const result = await window.electronAPI.reconcileData({
                        companyId: company.id,
                        companyName: company.name,
                        companyGuid: company.companyGuid || company.guid || '',
                        userId: currentUser.userId,
                        tallyHost: appSettings.tallyHost || 'localhost',
                        tallyPort: appSettings.tallyPort || 9000,
                        backendUrl: window.apiConfig.baseURL,
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

                        const changed = (result.totalSynced || 0) + (result.totalMissing || 0) + (result.totalUpdated || 0);
                        if (changed > 0) {
                            console.log(`✅ ${company.name}: Reconciled and synced ${result.totalSynced || 0} records`);

                            // Reconciliation pulled in new/changed vouchers → refresh the financial
                            // reports FY-wise so Balance Sheet / P&L / Trial Balance reflect them.
                            try {
                                console.log(`  📊 ${company.name}: Refreshing financial reports after reconciliation...`);
                                const rep = await this.syncFinancialReportsAllYears(
                                    company,
                                    currentUser.userId,
                                    appSettings.tallyPort || 9000,
                                    window.apiConfig.baseURL,
                                    authToken,
                                    deviceToken
                                );
                                if (rep.success) {
                                    console.log(`  ✅ ${company.name}: Financial reports refreshed`);
                                } else {
                                    console.warn(`  ⚠️ ${company.name}: Some reports failed to refresh:`, rep.errors);
                                }
                            } catch (repErr) {
                                console.error(`  ❌ ${company.name}: Report refresh error:`, repErr);
                            }
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
     * Compute the list of financial years to sync reports for: last 4 FYs
     * (current FY up to today) plus a "Full" span from books-start to today.
     */
    static getReportFinancialYears(company) {
        const now = new Date();
        const currentYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

        const yearsToSync = [];
        for (let i = 0; i < 4; i++) {
            const fyStart = currentYear - i;
            const fromD = `${fyStart}0401`;
            // Span the whole FY incl. the open current FY — capping at "today"
            // dropped future-dated vouchers from the synced BS/P&L (see
            // background-sync-scheduler.getReportFinancialYears).
            const toD = `${fyStart + 1}0331`;
            const shortStart = String(fyStart).substring(2, 4);
            const shortEnd = String(fyStart + 1).substring(2, 4);
            yearsToSync.push({ fromDate: fromD, toDate: toD, financialYear: `${shortStart}-${shortEnd}` });
        }

        const fromISO = company.syncFromDate || company.booksStart || company.financialYearStart || '';
        const fullFromDate = fromISO ? fromISO.replace(/-/g, '') : '20000401';
        yearsToSync.push({ fromDate: fullFromDate, toDate: `${currentYear + 1}0331`, financialYear: 'Full' });
        return yearsToSync;
    }

    /**
     * Sync Balance Sheet, P&L and Trial Balance for every financial year for one company.
     */
    static async syncFinancialReportsAllYears(company, userId, tallyPort, backendUrl, authToken, deviceToken) {
        if (!window.electronAPI?.syncFinancialReports) {
            return { success: false, errors: ['syncFinancialReports API unavailable'] };
        }
        const companyId = company.id;
        const companyName = company.name;
        const reports = [
            { name: 'Balance Sheet', type: 'balancesheet' },
            { name: 'Profit & Loss', type: 'profitloss' },
            { name: 'Trial Balance', type: 'trailbalance' }
        ];
        const years = this.getReportFinancialYears(company);
        const errors = [];

        for (const report of reports) {
            for (const yr of years) {
                try {
                    const r = await window.electronAPI.syncFinancialReports({
                        companyId, cmpId: companyId, userId,
                        fromDate: yr.fromDate, toDate: yr.toDate,
                        authToken, deviceToken, tallyPort, backendUrl,
                        companyName, reportType: report.type, financialYear: yr.financialYear
                    });
                    if (!r.success) {
                        errors.push(`${report.name} (FY ${yr.financialYear}): ${r.error || r.message || 'failed'}`);
                    }
                } catch (e) {
                    errors.push(`${report.name} (FY ${yr.financialYear}): ${e.message}`);
                }
            }
        }
        return { success: errors.length === 0, errors };
    }

    /**
     * Stop all sync systems (called on logout)
     */
    static stopAllSyncSystems() {
        // Clear pending auto-sync timer
        if (this._autoSyncTimer) {
            clearTimeout(this._autoSyncTimer);
            this._autoSyncTimer = null;
        }
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
