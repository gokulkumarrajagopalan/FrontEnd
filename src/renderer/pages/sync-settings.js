(function () {
    const getSyncSettingsTemplate = () => {
        return window.Layout.page({
            title: 'Tally Sync Dashboard',
            subtitle: 'Monitor Tally connection and synchronization status in real-time',
            content: `
                <div style="display: flex; flex-direction: column; gap: var(--ds-space-8);">
                    <!-- Status Cards Grid -->
                    ${window.Layout.grid({
                columns: 3,
                gap: 'var(--ds-space-6)',
                content: `
                            ${window.Layout.statsCard({
                    title: 'Tally Connection',
                    value: 'Checking...',
                    icon: '<i class="fas fa-plug"></i>',
                    trend: '--',
                    trendLabel: 'Server Status',
                    id: 'tally-status-card'
                }).replace('id="tally-status-card"', 'id="tallyStatusCard"')}
                            
                            ${window.Layout.statsCard({
                    title: 'Internet Status',
                    value: 'Checking...',
                    icon: '<i class="fas fa-globe"></i>',
                    trend: '--',
                    trendLabel: 'Connectivity',
                    id: 'internet-status-card'
                }).replace('id="internet-status-card"', 'id="internetStatusCard"')}
                            
                            ${window.Layout.statsCard({
                    title: 'Overall Sync',
                    value: 'Checking...',
                    icon: '<i class="fas fa-sync-alt"></i>',
                    trend: '--',
                    trendLabel: 'Sync Status',
                    id: 'sync-status-card'
                }).replace('id="sync-status-card"', 'id="syncStatusCard"')}
                        `
            })}

                    <!-- Connection Details Info -->
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--ds-space-6); margin-top: calc(-1 * var(--ds-space-4));">
                        <div id="tallyDetails" style="padding: 0 var(--ds-space-6); font-size: var(--ds-text-xs); color: var(--ds-text-tertiary);">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;"><span>Last Check:</span> <span id="tallyLastCheck">--:--:--</span></div>
                            <div style="display: flex; justify-content: space-between;"><span>Host:</span> <span>localhost:<span id="tallyPortDisplay">9000</span></span></div>
                        </div>
                        <div id="internetDetails" style="padding: 0 var(--ds-space-6); font-size: var(--ds-text-xs); color: var(--ds-text-tertiary);">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;"><span>Last Check:</span> <span id="internetLastCheck">--:--:--</span></div>
                            <div style="display: flex; justify-content: space-between;"><span>Verification:</span> <span>DNS Lookup</span></div>
                        </div>
                        <div id="syncDetails" style="padding: 0 var(--ds-space-6); font-size: var(--ds-text-xs); color: var(--ds-text-tertiary);">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;"><span>Auto Sync:</span> <span id="syncEnabledStatus" style="font-weight: var(--ds-weight-bold);">Enabled</span></div>
                            <div style="display: flex; justify-content: space-between;"><span>Interval:</span> <span>10 seconds</span></div>
                        </div>
                    </div>

                    <!-- License Information Section -->
                    <div style="background: var(--ds-bg-surface-sunken); border: 1px solid var(--ds-border-default); border-radius: var(--ds-radius-3xl); overflow: hidden;">
                        <div style="padding: var(--ds-space-5) var(--ds-space-8); border-bottom: 1px solid var(--ds-border-default); display: flex; align-items: center; gap: var(--ds-space-3);">
                            <div style="color: var(--ds-primary-600); font-size: var(--ds-text-xl);"><i class="fas fa-file-contract"></i></div>
                            <h3 style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin: 0;">Tally License Information</h3>
                        </div>
                        <div style="padding: var(--ds-space-8);">
                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--ds-space-6);">
                                <div style="background: var(--ds-bg-surface); border: 1px solid var(--ds-border-default); border-radius: var(--ds-radius-2xl); padding: var(--ds-space-6);">
                                    <div style="font-size: var(--ds-text-2xs); font-weight: var(--ds-weight-bold); color: var(--ds-text-tertiary); text-transform: uppercase; margin-bottom: var(--ds-space-2);">License Number</div>
                                    <div id="licenseNumber" style="font-size: var(--ds-text-2xl); font-weight: var(--ds-weight-bold); color: var(--ds-primary-600);">--</div>
                                    <div style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary); margin-top: var(--ds-space-1);">Tally Serial</div>
                                </div>
                                <div style="background: var(--ds-bg-surface); border: 1px solid var(--ds-border-default); border-radius: var(--ds-radius-2xl); padding: var(--ds-space-6);">
                                    <div style="font-size: var(--ds-text-2xs); font-weight: var(--ds-weight-bold); color: var(--ds-text-tertiary); text-transform: uppercase; margin-bottom: var(--ds-space-2);">Product Version</div>
                                    <div id="productVersion" style="font-size: var(--ds-text-2xl); font-weight: var(--ds-weight-bold); color: var(--ds-success-600);">--</div>
                                    <div style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary); margin-top: var(--ds-space-1);">Release Info</div>
                                </div>
                                <div style="background: var(--ds-bg-surface); border: 1px solid var(--ds-border-default); border-radius: var(--ds-radius-2xl); padding: var(--ds-space-6);">
                                    <div style="font-size: var(--ds-text-2xs); font-weight: var(--ds-weight-bold); color: var(--ds-text-tertiary); text-transform: uppercase; margin-bottom: var(--ds-space-2);">License Status</div>
                                    <div id="licenseStatus" style="font-size: var(--ds-text-2xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary);">--</div>
                                    <div style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary); margin-top: var(--ds-space-1);">Current State</div>
                                </div>
                                <div style="background: var(--ds-bg-surface); border: 1px solid var(--ds-border-default); border-radius: var(--ds-radius-2xl); padding: var(--ds-space-6);">
                                    <div style="font-size: var(--ds-text-2xs); font-weight: var(--ds-weight-bold); color: var(--ds-text-tertiary); text-transform: uppercase; margin-bottom: var(--ds-space-2);">Last Updated</div>
                                    <div id="licenseUpdated" style="font-size: var(--ds-text-sm); font-weight: var(--ds-weight-bold); color: var(--ds-warning-600);">--</div>
                                    <div style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary); margin-top: var(--ds-space-1);">Fetch Time</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `
        });
    };

    // State management
    const syncState = {
        tally: {
            connected: false,
            lastCheck: null,
            successCount: 0,
            totalCount: 0
        },
        internet: {
            connected: false,
            lastCheck: null,
            successCount: 0,
            totalCount: 0
        },
        autoSync: true,
        checkInterval: null,
        licenseInfo: {
            licenseNumber: '--',
            productVersion: '--',
            status: '--',
            lastUpdated: '--'
        }
    };

    // Check Tally connection with dynamic port via IPC to avoid CORS issues
    async function checkTallyConnection() {
        try {
            // Get Tally port from settings
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            const tallyPort = appSettings.tallyPort || 9000;

            // Use IPC to check connection from main process (avoids CORS)
            if (window.electronAPI && window.electronAPI.invoke) {
                const result = await window.electronAPI.invoke('check-tally-connection', { tallyPort });
                return result === true;
            }

            // Fallback: Direct fetch with simple GET request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(`http://localhost:${tallyPort}/`, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response.ok || response.status === 405; // 405 = Method Not Allowed (still means server is up)
        } catch (error) {
            return false;
        }
    }

    // Check Internet connection
    async function checkInternetConnection() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch('https://8.8.8.8//', {
                method: 'HEAD',
                mode: 'no-cors',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return true;
        } catch (error) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);

                await fetch('https://www.google.com/', {
                    method: 'HEAD',
                    mode: 'no-cors',
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                return true;
            } catch {
                return false;
            }
        }
    }

    // Update UI with status
    function updateUI() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString();

        // Update Tally Status
        const tallyConnected = syncState.tally.connected;
        updateStatusCard('tally', tallyConnected, timeStr);

        // Update Internet Status
        const internetConnected = syncState.internet.connected;
        updateStatusCard('internet', internetConnected, timeStr);

        // Update Overall Sync Status
        const syncConnected = tallyConnected && internetConnected;
        updateStatusCard('sync', syncConnected, timeStr);
    }

    function updateStatusCard(type, connected, timeStr) {
        const cardId = `${type}StatusCard`;
        const card = document.getElementById(cardId);
        if (!card) return;

        // Update the main value
        const valueElem = card.querySelector('div[style*="font-size: var(--ds-text-3xl)"]');
        if (valueElem) {
            valueElem.textContent = connected ? 'Connected' : 'Disconnected';
            valueElem.style.color = connected ? 'var(--ds-success-600)' : 'var(--ds-error-600)';
        }

        // Update the trend/badge
        const trendElem = card.querySelector('.ds-badge');
        if (trendElem) {
            trendElem.textContent = connected ? 'ONLINE' : 'OFFLINE';
            trendElem.className = `ds-badge ds-badge-${connected ? 'success' : 'danger'}`;
        }

        // Update details
        const lastCheckElem = document.getElementById(`${type}LastCheck`);
        if (lastCheckElem) lastCheckElem.textContent = timeStr;
    }

    function updateLicenseInfo(licenseData) {
        if (!licenseData) return;

        syncState.licenseInfo = {
            licenseNumber: licenseData.license_number || '--',
            productVersion: licenseData.product_version || '--',
            status: licenseData.status || '--',
            lastUpdated: new Date().toLocaleTimeString()
        };

        const licenseNumber = document.getElementById('licenseNumber');
        const productVersion = document.getElementById('productVersion');
        const licenseStatus = document.getElementById('licenseStatus');
        const licenseUpdated = document.getElementById('licenseUpdated');

        if (licenseNumber) licenseNumber.textContent = syncState.licenseInfo.licenseNumber;
        if (productVersion) productVersion.textContent = syncState.licenseInfo.productVersion;
        if (licenseStatus) {
            licenseStatus.textContent = syncState.licenseInfo.status.toUpperCase();
            licenseStatus.style.color = syncState.licenseInfo.status.toLowerCase() === 'active' ? 'var(--ds-success-600)' : 'var(--ds-error-600)';
        }
        if (licenseUpdated) licenseUpdated.textContent = syncState.licenseInfo.lastUpdated;
    }

    // Perform status check
    async function performStatusCheck() {
        const tallyResult = await checkTallyConnection();
        const internetResult = await checkInternetConnection();

        syncState.tally.connected = tallyResult;
        syncState.tally.lastCheck = new Date();
        syncState.tally.totalCount++;
        if (tallyResult) syncState.tally.successCount++;

        syncState.internet.connected = internetResult;
        syncState.internet.lastCheck = new Date();
        syncState.internet.totalCount++;
        if (internetResult) syncState.internet.successCount++;

        updateUI();

        // Send to Python sync worker if available
        if (window.ipcRenderer) {
            window.ipcRenderer.send('sync-status-update', {
                tally: tallyResult,
                internet: internetResult,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Start periodic checks
    function startPeriodicChecks() {
        if (syncState.checkInterval) clearInterval(syncState.checkInterval);

        // Initial check
        performStatusCheck();

        // Then check every 10 seconds
        syncState.checkInterval = setInterval(() => {
            if (syncState.autoSync) {
                performStatusCheck();
            }
        }, 10000);
    }

    // Fetch license info automatically
    async function autoFetchLicense() {
        try {
            // Get Tally port from settings
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            const tallyPort = appSettings.tallyPort || 9000;

            console.log(`Auto-fetching license info from port ${tallyPort}...`);
            if (window.electronAPI && window.electronAPI.invoke) {
                const result = await window.electronAPI.invoke('fetch-license', { tallyPort });

                if (result.success && result.data) {
                    console.log('License fetched successfully:', result.data);
                    updateLicenseInfo(result.data);
                } else {
                    console.warn('License fetch failed:', result);
                    addTimelineEntry('<i class="fas fa-exclamation-triangle" style="color: var(--ds-warning-500)"></i> License fetch - ' + JSON.stringify(result.error || result));
                }
            } else {
                console.warn('electronAPI.invoke not available');
            }
        } catch (error) {
            console.error('Auto-fetch license error:', error);
        }
    }

    // Stop periodic checks
    function stopPeriodicChecks() {
        if (syncState.checkInterval) {
            clearInterval(syncState.checkInterval);
            syncState.checkInterval = null;
        }
    }

    // Initialize page
    window.initializeSyncSettings = async function () {
        console.log('Initializing Sync Settings Page...');

        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getSyncSettingsTemplate();

            // Display current Tally port from settings
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            const tallyPort = appSettings.tallyPort || 9000;
            const tallyPortDisplay = document.getElementById('tallyPortDisplay');
            if (tallyPortDisplay) {
                tallyPortDisplay.textContent = tallyPort;
            }

            // Start monitoring
            startPeriodicChecks();

            // Auto-fetch license info on page load
            console.log('Auto-fetching license info...');
            autoFetchLicense();

            console.log('✅ Sync Settings Page initialized');
        }
    };

    // Cleanup on page leave
    window.addEventListener('beforeunload', () => {
        stopPeriodicChecks();
    });
})();
