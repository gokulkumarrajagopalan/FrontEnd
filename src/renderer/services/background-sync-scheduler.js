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

            // Check if Tally is running
            const tallyStatus = await this.checkTallyStatus();

            if (!tallyStatus.running) {
                console.log('ℹ️ Tally not running, skipping background sync');
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
     * Compute the list of financial years to sync reports for: the last 4 FYs
     * (current FY runs up to today) plus a "Full" span from books-start to today.
     */
    getReportFinancialYears(company) {
        const now = new Date();
        const currentYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        const today = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

        const yearsToSync = [];
        for (let i = 0; i < 4; i++) {
            const fyStart = currentYear - i;
            const fromD = `${fyStart}0401`;
            const toD = i === 0 ? today : `${fyStart + 1}0331`;
            const shortStart = String(fyStart).substring(2, 4);
            const shortEnd = String(fyStart + 1).substring(2, 4);
            yearsToSync.push({ fromDate: fromD, toDate: toD, financialYear: `${shortStart}-${shortEnd}` });
        }

        const fromISO = company.syncFromDate || company.booksStart || company.financialYearStart || '';
        const fullFromDate = fromISO ? fromISO.replace(/-/g, '') : '20000401';
        yearsToSync.push({ fromDate: fullFromDate, toDate: today, financialYear: 'Full' });
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
