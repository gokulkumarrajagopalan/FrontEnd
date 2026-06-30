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

        // Internet-aware pause/resume. When the connection drops mid-cycle (or a
        // cycle is skipped because we're offline) we set this flag; the 'online'
        // event handler then resumes a sync immediately instead of waiting for
        // the next 2-hour tick.
        this.pausedForOffline = false;
        this._onlineHandler = null;
        this._offlineHandler = null;

        // Reconciliation cadence. Reconciliation does NOT run on every sync. It runs:
        //   • once right after a company's FIRST-TIME sync (case 1), and
        //   • at most once every 2 hours on the background cycle (case 2).
        // The last reconcile time is persisted in localStorage so it survives the
        // +5-min first background run and app restarts (so reopening the app does
        // not reconcile again unless 2h have actually elapsed).
        this.reconcileThrottleMs = 2 * 60 * 60 * 1000; // 2 hours
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

        // Pause/resume on internet connectivity changes.
        this._offlineHandler = () => {
            console.log('📴 Internet lost — sync is paused until the connection returns');
            this.pausedForOffline = true;
        };
        this._onlineHandler = () => {
            console.log('📶 Internet restored');
            if (this.pausedForOffline) {
                this.pausedForOffline = false;
                console.log('▶️ Resuming background sync after reconnect...');
                // Small grace delay so the network stack settles before we fire requests.
                setTimeout(() => this.runBackgroundSync(), 3000);
            }
        };
        window.addEventListener('offline', this._offlineHandler);
        window.addEventListener('online', this._onlineHandler);

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
     * Decide whether reconciliation should run at the end of a background sync.
     * Returns the list of companies to reconcile (empty = skip reconciliation).
     *
     *   • firstTimeCompanies → always reconcile (case 1: first-time import sync).
     *   • Otherwise reconcile the full set only if ≥ 2h since the last reconcile
     *     (case 2: returning-user opens don't reconcile; the 2-hourly cycle does).
     */
    getCompaniesToReconcile(allCompanies, firstTimeCompanies) {
        const lastReconcile = parseInt(localStorage.getItem('lastReconcileTime') || '0', 10) || 0;
        const dueByInterval = !lastReconcile || (Date.now() - lastReconcile) >= this.reconcileThrottleMs;

        if (dueByInterval) {
            return { companies: allCompanies, dueByInterval: true };
        }
        // Not yet due on the 2-hour cycle — only reconcile any first-time companies.
        const minsLeft = Math.round((this.reconcileThrottleMs - (Date.now() - lastReconcile)) / 60000);
        if (firstTimeCompanies.length > 0) {
            console.log(`🔍 Reconciliation: not due for ${minsLeft} min, but ${firstTimeCompanies.length} first-time company(ies) → reconciling those`);
        } else {
            console.log(`⏳ Reconciliation skipped — next 2-hourly reconcile in ~${minsLeft} min`);
        }
        return { companies: firstTimeCompanies, dueByInterval: false };
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
        if (this._offlineHandler) {
            window.removeEventListener('offline', this._offlineHandler);
            this._offlineHandler = null;
        }
        if (this._onlineHandler) {
            window.removeEventListener('online', this._onlineHandler);
            this._onlineHandler = null;
        }
    }

    /**
     * True only when the device has a network AND the backend is actually
     * reachable. navigator.onLine alone only reports a LAN/interface, so we also
     * do a short, cache-busting ping to the backend to catch "connected to Wi-Fi
     * but no real internet" cases.
     */
    async isInternetAvailable() {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            return false;
        }
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            // Public liveness endpoint (permitAll in SecurityConfig) — no auth needed.
            const url = window.apiConfig
                ? window.apiConfig.getUrl('/actuator/health/live')
                : `${window.apiConfig?.baseURL || ''}/actuator/health/live`;
            await fetch(url, { method: 'GET', cache: 'no-store', signal: controller.signal });
            clearTimeout(timeoutId);
            // Any HTTP response (even 401/404) proves the backend was reached.
            return true;
        } catch (error) {
            return false;
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
            // Pause when there is no internet — the backend is unreachable, so
            // syncing would only produce failures. Mark paused so the 'online'
            // event resumes us immediately when the connection returns.
            if (!(await this.isInternetAvailable())) {
                console.log('📴 No internet connection — sync paused until it returns');
                this.pausedForOffline = true;
                if (window.notificationService) {
                    window.notificationService.show({
                        type: 'warning',
                        message: '📴 No internet — sync paused, will resume automatically',
                        duration: 4000
                    });
                }
                return;
            }

            // Guard: reject if another sync cycle is already in progress
            if (window.syncStateManager && window.syncStateManager.isSyncing()) {
                console.log('⏳ Sync already in progress — skipping this cycle');
                return;
            }

            // Check if Tally is running AND has companies loaded
            const tallyStatus = await this.checkTallyStatus();

            if (!tallyStatus.running) {
                console.log('ℹ️ Tally not running, skipping background sync');
                return;
            }

            if (tallyStatus.loadedCompanies.length === 0) {
                console.log('ℹ️ Tally is running but no companies are loaded — skipping sync to prevent MAV');
                return;
            }

            // Get auth info
            const authToken = (window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function')
                ? window.electronAPI.secureStoreGet('authToken')
                : localStorage.getItem('authToken');
            const deviceToken = (window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function')
                ? window.electronAPI.secureStoreGet('deviceToken')
                : localStorage.getItem('deviceToken');
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
            // Companies whose FIRST-TIME sync runs in this cycle → always reconciled afterward.
            const firstTimeCompanies = [];

            // Reconcile gate (decided ONCE per cycle): masters do a full deep sync+reconcile
            // ONLY when reconciliation is due (≥ 2h since last) or for a first-time company.
            // Otherwise masters do a cheap AlterID-only sync (deep:false) — no reconcile. This
            // is what stops "Sync + Reconcile" from running on every cycle / shortly after open.
            const lastReconcile = parseInt(localStorage.getItem('lastReconcileTime') || '0', 10) || 0;
            const reconcileDue = !lastReconcile || (Date.now() - lastReconcile) >= this.reconcileThrottleMs;
            console.log(`🔍 Reconcile gate: ${reconcileDue ? 'DUE (deep sync + reconcile)' : 'not due (fast sync only)'}`);

            // Sync each company
            for (const company of companies) {
                // Internet dropped mid-cycle → stop now and resume on reconnect
                // rather than churning through guaranteed-to-fail uploads.
                if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                    console.log('📴 Internet lost mid-sync — pausing remaining companies until reconnect');
                    this.pausedForOffline = true;
                    break;
                }

                try {
                    // Per-company guard: only sync if this company is currently open in Tally.
                    // A missing/mismatched company name causes Tally's MAV crash.
                    // Use the robust normalizer (entity-decode + whitespace-collapse) so a
                    // genuinely-open company isn't skipped over a formatting difference.
                    const companyNameNorm = this.normalizeCompanyName(company.name);
                    const isLoaded = tallyStatus.loadedCompanies.some(
                        n => this.normalizeCompanyName(n) === companyNameNorm
                    );
                    if (!isLoaded) {
                        console.log(`⏭️ Skipping "${company.name}" — not loaded in Tally`);
                        continue;
                    }

                    // Capture first-time state BEFORE syncing (the voucher step below flips
                    // firstTimeSyncDone=true on the backend once the first-time sync succeeds).
                    const companyIsFirstTime = !company.firstTimeSyncDone;
                    if (companyIsFirstTime) {
                        firstTimeCompanies.push(company);
                    }

                    // Deep (full fetch + reconcile) only when due or first-time; else fast sync.
                    const useDeep = reconcileDue || companyIsFirstTime;

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
                        syncMode: 'all',
                        // Sync every master entity in ONE worker process (dependency order).
                        entityType: 'all',
                        // deep:true → full fetch + reconcile (only when due/first-time);
                        // deep:false → AlterID-only fast sync, no reconcile.
                        deep: useDeep
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

                    // ---- Voucher Sync (first-time vs incremental) ----
                    try {
                        if (window.electronAPI?.syncVouchers) {
                            const _months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                            const _formatTallyDate = (dt) => `${String(dt.getDate()).padStart(2, '0')}-${_months[dt.getMonth()]}-${dt.getFullYear()}`;

                            // Authoritative first-time detection from ACTUAL DB state, not just the
                            // firstTimeSyncDone flag (which may fail to persist). A company is
                            // first-time ONLY if it has NO vouchers in the DB yet (watermark 0) AND
                            // its flag isn't set. Once any vouchers exist, we ALWAYS do incremental
                            // AlterID-only sync — never re-run the monthly date chunks (the loop that
                            // was repeating every cycle on Jan-2023, Feb-2023, …).
                            let voucherAlterId = 0;
                            try {
                                const mmUrl = window.apiConfig
                                    ? window.apiConfig.getUrl(`/companies/${company.id}/master-mapping`)
                                    : `${window.apiConfig.baseURL}/companies/${company.id}/master-mapping`;
                                const mmResp = await fetch(mmUrl, {
                                    headers: { 'Authorization': `Bearer ${authToken}`, 'X-Device-Token': deviceToken }
                                });
                                if (mmResp.ok) {
                                    const mm = await mmResp.json();
                                    const masters = (mm && mm.masters) ? mm.masters : (mm || {});
                                    voucherAlterId = Number(masters.voucher || 0) || 0;
                                }
                            } catch (e) {
                                console.warn(`  ⚠️ ${company.name}: could not read voucher watermark, falling back to flag`);
                            }

                            // Local fallback marker: survives even if the backend firstTimeSyncDone
                            // PUT fails to persist, so an empty company (watermark stays 0) does not
                            // re-run the monthly chunks on every cycle.
                            let localFirstTimeDone = false;
                            try {
                                localFirstTimeDone = !!(JSON.parse(localStorage.getItem('voucherFirstTimeDone') || '{}')[company.id]);
                            } catch (_) { /* ignore */ }

                            const isFirstTime = voucherAlterId === 0 && !company.firstTimeSyncDone && !localFirstTimeDone;
                            console.log(`  📌 ${company.name}: voucher watermark=${voucherAlterId}, `
                                + `firstTimeSyncDone=${!!company.firstTimeSyncDone}, localDone=${localFirstTimeDone} → `
                                + `${isFirstTime ? 'FIRST-TIME (monthly chunks)' : 'INCREMENTAL (AlterID-only, no date filter)'}`);

                            if (isFirstTime) {
                                // ---- FIRST-TIME: Monthly chunks + adaptive weekly ----
                                console.log(`  📦 ${company.name}: First-time voucher sync (monthly chunks)...`);
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

                                console.log(`  📅 ${company.name}: ${vChunks.length} monthly chunk(s)`);

                                let allSuccess = true;
                                for (let ci = 0; ci < vChunks.length; ci++) {
                                    const vc = vChunks[ci];
                                    const cFrom = _formatTallyDate(vc.from);
                                    const cTo = _formatTallyDate(vc.to);
                                    console.log(`  📅 Month ${ci + 1}/${vChunks.length}: ${cFrom} → ${cTo}`);

                                    const chunkStartTime = Date.now();
                                    const vResult = await window.electronAPI.syncVouchers({
                                        companyId: company.id,
                                        userId: currentUser.userId,
                                        authToken, deviceToken,
                                        tallyPort: appSettings.tallyPort || 9000,
                                        backendUrl: window.apiConfig.baseURL,
                                        companyName: company.name,
                                        companyGuid: company.companyGuid || company.guid || '',
                                        fromDate: cFrom, toDate: cTo, lastAlterID: 0
                                    });
                                    const chunkElapsed = Date.now() - chunkStartTime;

                                    if (vResult.success) {
                                        console.log(`  ✅ ${company.name}: Month ${ci + 1} synced (${(chunkElapsed / 1000).toFixed(1)}s)`);
                                        if (chunkElapsed > 30000) {
                                            console.log(`  ⏱️ Month ${ci + 1} took >30s, re-syncing weekly...`);
                                            let weekStart = new Date(vc.from);
                                            while (weekStart <= vc.to) {
                                                let weekEnd = new Date(weekStart);
                                                weekEnd.setDate(weekEnd.getDate() + 6);
                                                if (weekEnd > vc.to) weekEnd = new Date(vc.to);
                                                await window.electronAPI.syncVouchers({
                                                    companyId: company.id,
                                                    userId: currentUser.userId,
                                                    authToken, deviceToken,
                                                    tallyPort: appSettings.tallyPort || 9000,
                                                    backendUrl: window.apiConfig.baseURL,
                                                    companyName: company.name,
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
                                        allSuccess = false;
                                        console.warn(`  ⚠️ ${company.name}: Month ${ci + 1} failed - ${vResult.message}`);
                                    }
                                }

                                if (allSuccess) {
                                    // Mark locally first so first-time never re-runs even if the backend
                                    // PUT below fails (prevents the monthly-chunk loop from repeating).
                                    try {
                                        const m = JSON.parse(localStorage.getItem('voucherFirstTimeDone') || '{}');
                                        m[company.id] = true;
                                        localStorage.setItem('voucherFirstTimeDone', JSON.stringify(m));
                                    } catch (_) { /* ignore */ }

                                    try {
                                        const headers = {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${authToken}`,
                                            'X-Device-Token': deviceToken
                                        };
                                        // Dedicated endpoint that flips ONLY the first_time_sync_done
                                        // column (the generic PUT /{id} validates a full Company body
                                        // and would 400 on this partial payload).
                                        const url = window.apiConfig
                                            ? window.apiConfig.getUrl(`/companies/${company.id}/first-time-sync-done`)
                                            : `${window.apiConfig.baseURL}/companies/${company.id}/first-time-sync-done`;
                                        const resp = await fetch(url, {
                                            method: 'PUT', headers, body: JSON.stringify({ firstTimeSyncDone: true })
                                        });
                                        if (resp.ok) {
                                            console.log(`  📝 ${company.name}: first_time_sync_done column set (Y)`);
                                        } else {
                                            console.warn(`⚠️ ${company.name}: firstTimeSyncDone update failed (status: ${resp.status})`);
                                        }
                                    } catch (e) {
                                        console.warn('⚠️ Could not update firstTimeSyncDone:', e.message);
                                    }
                                }
                            } else {
                                // ---- INCREMENTAL: AlterID-only, NO date filter ----
                                // Reuse the watermark already fetched above (the worker also
                                // re-derives it authoritatively, so a 0 here self-corrects).
                                console.log(`  📦 ${company.name}: Incremental voucher sync (AlterID > ${voucherAlterId}, no date filter)...`);
                                const vResult = await window.electronAPI.syncVouchers({
                                    companyId: company.id,
                                    userId: currentUser.userId,
                                    authToken, deviceToken,
                                    tallyPort: appSettings.tallyPort || 9000,
                                    backendUrl: window.apiConfig.baseURL,
                                    companyName: company.name,
                                    companyGuid: company.companyGuid || company.guid || '',
                                    fromDate: '', toDate: '',
                                    lastAlterID: voucherAlterId
                                });
                                if (vResult.success) {
                                    console.log(`  ✅ ${company.name}: Incremental voucher sync completed (count: ${vResult.count || 0})`);
                                } else {
                                    console.warn(`  ⚠️ ${company.name}: Voucher sync failed - ${vResult.message}`);
                                }
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

                    // ---- Financial Reports Sync (Balance Sheet / P&L / Trial Balance, FY-wise) ----
                    try {
                        console.log(`  📊 ${company.name}: Syncing financial reports (all FYs)...`);
                        const repResult = await this.syncFinancialReportsAllYears(
                            company,
                            currentUser.userId,
                            appSettings.tallyPort || 9000,
                            window.apiConfig.baseURL,
                            authToken,
                            deviceToken
                        );
                        if (repResult.success) {
                            console.log(`  ✅ ${company.name}: Financial reports synced`);
                        } else {
                            console.warn(`  ⚠️ ${company.name}: Some financial reports failed:`, repResult.errors);
                        }
                    } catch (rErr) {
                        console.error(`  ❌ ${company.name}: Financial reports sync error:`, rErr.message);
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
                            // Native OS notification (works while minimized to tray).
                            const recs = result.totalCount || 0;
                            window.notificationService.system(
                                'Talliffy — Sync successful',
                                recs > 0
                                    ? `${company.name}: synced successfully (${recs} record${recs === 1 ? '' : 's'})`
                                    : `${company.name}: synced successfully`
                            );
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

                        // Native OS notification on failure.
                        if (window.notificationService) {
                            window.notificationService.system(
                                'Talliffy — Sync failed',
                                `${company.name}: ${result.message || 'sync failed'}`
                            );
                        }

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
                    // Native OS notification on hard error.
                    if (window.notificationService) {
                        window.notificationService.system(
                            'Talliffy — Sync failed',
                            `${company.name}: ${error.message || 'unexpected error'}`
                        );
                    }
                }
            }
            
            // Show notification for sync results (success or failure)
            this.showSyncNotification(totalNewRecords, syncResults);

            // Fire OS system notification on completion
            if (window.notificationService && typeof window.notificationService.system === 'function') {
                const msg = totalNewRecords > 0
                    ? `Sync complete: ${totalNewRecords} records updated`
                    : 'Sync complete — all data up to date';
                window.notificationService.system('Talliffy Sync', msg);
            }

            // End sync in SyncStateManager → UI shows 100% / "Sync Complete" FIRST.
            if (window.syncStateManager) {
                const hasFailures = syncResults.some(r => r.success === false);
                window.syncStateManager.endSync(!hasFailures, `Background sync: ${totalNewRecords} records`);
            }

            // ── Reconciliation (runs AFTER 100%, gated by the SAME reconcileDue decision) ──
            // Not on every sync: full reconcile only when due (≥2h), otherwise just any
            // first-time companies. Uses the reconcileDue computed before the loop so the
            // master deep-sync flag and the voucher/report reconcile stay consistent.
            try {
                const toReconcile = reconcileDue ? companies : firstTimeCompanies;
                if (toReconcile.length > 0) {
                    if (window.notificationService) {
                        window.notificationService.show({
                            type: 'info',
                            message: `🔍 Reconciliation started for ${toReconcile.length} ${toReconcile.length === 1 ? 'company' : 'companies'}...`,
                            duration: 4000
                        });
                    }
                    await this.runBackgroundReconciliation(toReconcile, currentUser, authToken, deviceToken, appSettings);
                    // Advance the 2-hour watermark only when a full interval-due reconcile ran.
                    if (reconcileDue) {
                        localStorage.setItem('lastReconcileTime', Date.now().toString());
                    }
                }
            } catch (reconErr) {
                console.error('❌ Post-sync reconciliation error:', reconErr);
            }

            // Sync successfully completed, show tray balloon notification
            if (window.electronAPI && typeof window.electronAPI.showTrayBalloon === 'function') {
                window.electronAPI.showTrayBalloon({
                    title: 'Sync Completed',
                    content: 'Data has been successfully synced with Tally.'
                });
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
     * Resolve the financial-year START month (0-indexed) for a company's country.
     * GCC states run a calendar-year FY (Jan→Dec, month 0); India and others run
     * April→March (month 3). Mirrors the web app's getFinancialYearStartMonth so
     * the FY labels produced here match what the web app expects to display.
     */
    getFinancialYearStartMonth(company) {
        const calendarYearCountries = [
            'united arab emirates', 'uae', 'u.a.e', 'u.a.e.',
            'saudi arabia', 'ksa', 'kingdom of saudi arabia',
            'qatar', 'kuwait', 'bahrain', 'oman', 'sultanate of oman',
        ];
        const country = String(company?.country || '').trim().toLowerCase();
        return calendarYearCountries.includes(country) ? 0 : 3; // 0=Jan (GCC), 3=Apr (India)
    }

    /**
     * Compute the list of financial years to sync reports for: the last 4 FYs
     * (current FY runs up to today) plus a "Full" span from books-start to today.
     *
     * FY boundaries are country-specific: India/default = April→March, GCC = Jan→Dec.
     * Labels follow the span: a calendar-year FY → "2023"; a split FY → "23-24".
     */
    getReportFinancialYears(company) {
        const now = new Date();
        const fyStartMonth = this.getFinancialYearStartMonth(company); // 0=Jan, 3=Apr
        const mm = String(fyStartMonth + 1).padStart(2, '0');

        // The calendar year in which the CURRENT financial year started.
        const currentYear = now.getMonth() >= fyStartMonth ? now.getFullYear() : now.getFullYear() - 1;
        // Span every financial year to its FULL end boundary — including the
        // current, still-open FY. Capping the current FY (and "Full") at *today*
        // made Tally compute the Balance Sheet / P&L "as at today", silently
        // dropping future-dated vouchers (e.g. a post-dated rent accrual). That
        // is exactly how the synced BS/P&L diverged from Tally's period view —
        // Tally reports over the whole period, so we must request the whole
        // period. Future dates only ADD already-entered vouchers; if none exist
        // beyond today the report is identical to the as-at-today result.
        const yearsToSync = [];
        let currentFyEndStr = '';
        for (let i = 0; i < 4; i++) {
            const fyStart = currentYear - i;
            // Last day before the next FY starts: new Date(fyStart+1, fyStartMonth, 0).
            const endBoundary = new Date(fyStart + 1, fyStartMonth, 0);
            const endYear = endBoundary.getFullYear();
            const endMM = String(endBoundary.getMonth() + 1).padStart(2, '0');
            const endDD = String(endBoundary.getDate()).padStart(2, '0');

            const fromD = `${fyStart}${mm}01`;
            const toD = `${endYear}${endMM}${endDD}`;
            if (i === 0) currentFyEndStr = toD;

            // Single-year (calendar) FY → "2023"; split FY → "23-24".
            const financialYear = endYear === fyStart
                ? `${fyStart}`
                : `${String(fyStart).substring(2, 4)}-${String(fyStart + 1).substring(2, 4)}`;

            yearsToSync.push({ fromDate: fromD, toDate: toD, financialYear });
        }

        // "Full" spans books-start through the END of the current FY, so open-year
        // future-dated vouchers are captured for the same reason as above.
        const fromISO = company.syncFromDate || company.booksStart || company.financialYearStart || '';
        const fullFromDate = fromISO ? fromISO.replace(/-/g, '') : `2000${mm}01`;
        yearsToSync.push({ fromDate: fullFromDate, toDate: currentFyEndStr, financialYear: 'Full' });
        return yearsToSync;
    }

    /**
     * Sync Balance Sheet, P&L and Trial Balance for every financial year for one company.
     */
    async syncFinancialReportsAllYears(company, userId, tallyPort, backendUrl, authToken, deviceToken) {
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
     * Check if Tally is running AND has at least one company loaded.
     * Returns { running: false } if Tally is not reachable.
     * Returns { running: true, loadedCompanies: string[] } with the list of
     * company names currently open in Tally (may be empty if none are loaded).
     */
    async checkTallyStatus() {
        const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        const tallyPort = appSettings.tallyPort || 9000;
        const tallyHost = appSettings.tallyHost || 'localhost';
        const tallyUrl = `http://${tallyHost}:${tallyPort}`;

        // Step 1 — HTTP ping (quick, no body)
        try {
            const pingCtrl = new AbortController();
            const pingTimeout = setTimeout(() => pingCtrl.abort(), 4000);
            await fetch(tallyUrl, { method: 'GET', signal: pingCtrl.signal });
            clearTimeout(pingTimeout);
        } catch (_) {
            return { running: false, loadedCompanies: [] };
        }

        // Step 2 - If sync is actively running, skip querying the list of companies
        // to prevent unnecessary load and XML request spam to Tally.
        if (window.syncStateManager && typeof window.syncStateManager.isSyncInProgress === 'function' && window.syncStateManager.isSyncInProgress()) {
            return { running: true, loadedCompanies: null };
        }

        // Step 3 — Query Tally for the list of currently open companies.
        // null means the XML call failed (Tally busy/not ready) → treat as no
        // loaded companies so every company sync is safely skipped.
        const rawList = await this.fetchTallyLoadedCompanies(tallyUrl);
        const loadedCompanies = rawList ?? [];
        return { running: true, loadedCompanies };
    }

    /**
     * Decode the XML entities Tally emits so a parsed name matches the stored one.
     * Handles named (&amp; &lt; &gt; &quot; &apos;) and numeric (&#NN; / &#xNN;)
     * entities. Tally encodes '&' as &amp; and some control/special chars as
     * numeric entities, so without this "A &amp; B Traders" never equals "A & B Traders".
     */
    decodeXmlEntities(str) {
        if (!str) return '';
        return String(str)
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&quot;/gi, '"')
            .replace(/&apos;/gi, "'")
            .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
                try { return String.fromCodePoint(parseInt(h, 16)); } catch (_) { return ' '; }
            })
            .replace(/&#(\d+);/g, (_, d) => {
                try { return String.fromCodePoint(parseInt(d, 10)); } catch (_) { return ' '; }
            });
    }

    /**
     * Canonical form for comparing a Tally company name with a stored one:
     * decode entities, collapse ALL whitespace runs to a single space, trim,
     * lowercase. This absorbs the formatting differences (double spaces,
     * non-breaking spaces, encoded chars) that caused open companies to be
     * mis-reported as "not loaded".
     */
    normalizeCompanyName(name) {
        return this.decodeXmlEntities(name)
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    /**
     * POST a Tally XML request and return the list of company names that are
     * currently open (loaded) in the running Tally instance.
     * Returns [] if the call fails or no companies are loaded.
     *
     * WHY COMPUTE instead of FILTER:
     *   <TYPE>Company</TYPE> without a filter returns ALL companies on disk.
     *   Tally's XML API does not reliably apply FILTER clauses, so we use a
     *   COMPUTE field ($$IsOpen:$Name) on every row and filter client-side.
     *   When Tally is at the "Select Company" screen (nothing loaded),
     *   $$IsOpen is "No" for every company → result is [].
     */
    async fetchTallyLoadedCompanies(tallyUrl) {
        const xmlBody = `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>Collection of Companies</ID></HEADER><BODY><DESC><STATICVARIABLES><SVFROMDATE TYPE="Date">01-Jan-1970</SVFROMDATE><SVTODATE TYPE="Date">01-Jan-1970</SVTODATE><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES><TDL><TDLMESSAGE><COLLECTION NAME="Collection of Companies" ISMODIFY="No"><TYPE>Company</TYPE><FETCH>GUID,ALTERID,MASTERID,NAME,STATE,STARTINGFROM,BOOKSFROM,ENDINGAT,LASTVOUCHERDATE,BASICCOMPANYFORMALNAME,EMAIL,WEBSITE,TELEPHONE,FAX,PHONENUMBER,_ADDRESS1,_ADDRESS2,_ADDRESS3,_ADDRESS4,_ADDRESS5,STATENAME,PINCODE,COUNTRYNAME,PANID,GSTREGISTRATIONTYPE,GSTAPPLICABLEDATE,GSTSTATE,GSTIN,GSTFREEZONE,GSTEINVOICEAPPLICABLE,GSTEWAYBILLAPPLICABLE,VATEMIRAATE,VATAPPLICABLEDATE,VATREGISTRATIONNUMBER,VATACCOUNTID,VATFREEZONE,BILLWISEENABLED,COSTCENTREENABLED,BATCHENABLED,USEDISCOUNTCOLUMN,USEACTUALCOLUMN,PAYROLLENABLED,DESTINATION</FETCH><FILTERS>GroupFilter</FILTERS></COLLECTION><SYSTEM TYPE="FORMULAE" NAME="GroupFilter">$isaggregate = "No"</SYSTEM></TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>`;

        try {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 5000);
            const response = await fetch(tallyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/xml' },
                body: xmlBody,
                signal: ctrl.signal
            });
            clearTimeout(tid);

            // Non-OK HTTP response → Tally is running but not usable yet. Return null
            // so callers can distinguish "XML call failed" from "nothing loaded".
            if (!response.ok) return null;

            const xml = await response.text();
            console.log('🔍 Tally company status XML (first 600 chars):', xml.substring(0, 600));

            // Parse each <COMPANY> block; only keep entries where <ISOPEN> = "Yes".
            // Parse each <COMPANY> block
            // IMPORTANT: collect BOTH the NAME="…" attribute AND the child <NAME> tag as
            // name candidates. Tally often puts a re-encoded/internal form of the name in
            // the attribute while the readable name (matching our stored company.name)
            // lives in the child tag — relying on only one caused valid, open companies to
            // be reported as "not loaded". Pushing both (decoded) lets the caller match on
            // either form. Extra aliases belong to THIS open company, so they can't produce
            // a false positive for a different company.
            const names = [];
            const companyBlockRe = /<COMPANY\b[^>]*>([\s\S]*?)<\/COMPANY>/gi;
            let block;
            while ((block = companyBlockRe.exec(xml)) !== null) {
                const inner = block[1];

                // Candidate 1 — child <NAME> tag (human-readable, usually matches our store)
                const nameTag = inner.match(/<NAME>([\s\S]*?)<\/NAME>/i);
                if (nameTag) {
                    const v = this.decodeXmlEntities(nameTag[1]).trim();
                    if (v) names.push(v);
                }

                // Candidate 2 — NAME="…" attribute on the <COMPANY> element
                const nameAttr = block[0].match(/\bNAME="([^"]*)"/i);
                if (nameAttr) {
                    const v = this.decodeXmlEntities(nameAttr[1]).trim();
                    if (v) names.push(v);
                }
            }

            // De-duplicate (case-insensitive) for a clean list.
            const seen = new Set();
            const unique = [];
            for (const n of names) {
                const key = n.toLowerCase();
                if (!seen.has(key)) { seen.add(key); unique.push(n); }
            }

            console.log(`🏢 Tally currently loaded companies: [${unique.join(', ') || 'none'}]`);
            // [] here is valid: Tally responded but no company is open (Select Company screen)
            return unique;
        } catch (_) {
            // Network/timeout error: Tally is unreachable or too busy. Return null so
            // callers know the list could not be retrieved (distinct from "nothing loaded").
            console.log('⚠️ Could not fetch Tally company list — Tally may be busy or not ready');
            return null;
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

        // Check if Tally is running and has companies loaded
        let tallyStatus = { running: true, loadedCompanies: null };
        try {
            tallyStatus = await this.checkTallyStatus();
        } catch (err) {
            tallyStatus.running = false;
            tallyStatus.loadedCompanies = [];
        }

        if (!tallyStatus.running) {
            console.log('ℹ️ Tally not running, skipping background reconciliation');
            return;
        }

        if (tallyStatus.loadedCompanies && tallyStatus.loadedCompanies.length === 0) {
            console.log('ℹ️ Tally is running but no companies are loaded — skipping background reconciliation to prevent MAV');
            return;
        }

        let totalMissing = 0;
        let totalSynced = 0;
        
        for (const company of companies) {
            try {
                console.log(`🔍 Reconciling: ${company.name}`);

                // Check if this specific company is loaded
                if (tallyStatus.loadedCompanies) {
                    const companyNameNorm = this.normalizeCompanyName(company.name);
                    const isLoaded = tallyStatus.loadedCompanies.some(n => this.normalizeCompanyName(n) === companyNameNorm);
                    if (!isLoaded) {
                        console.log(`⏭️ Skipping background reconciliation for "${company.name}" — not loaded in Tally`);
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
                    message: `🔍 Reconciliation complete: ${totalSynced} record(s) synced`,
                    details: `Missing: ${totalMissing}`,
                    duration: 5000
                });
                if (typeof window.notificationService.system === 'function') {
                    window.notificationService.system('Talliffy Reconciliation', `${totalSynced} record(s) reconciled`);
                }
            }
        } else {
            console.log('✅ Background reconciliation complete — all records in sync');
            if (window.notificationService) {
                window.notificationService.show({
                    type: 'success',
                    message: '🔍 Reconciliation complete — all data in sync',
                    duration: 4000
                });
            }
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

// Allow the system-tray "Sync Now" item (main process) to trigger a sync even
// while the window is hidden in the background.
if (window.electronAPI && typeof window.electronAPI.onTriggerBackgroundSync === 'function') {
    window.electronAPI.onTriggerBackgroundSync(() => {
        console.log('🔔 Tray requested background sync');
        window.backgroundSyncScheduler.triggerManualSync();
    });
}

console.log('✅ Background Sync Scheduler loaded');
