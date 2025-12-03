(function () {
    const getSyncSettingsTemplate = () => `
    <div id="syncSettingsPageContainer" class="space-y-6">
        <div class="page-header">
            <h2>Tally Sync Dashboard</h2>
            <p>Monitor Tally connection and synchronization status in real-time.</p>
        </div>

        <!-- Status Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- Tally Connection Status -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">Tally Status</p>
                        <h3 class="text-lg font-bold text-gray-800 mt-2">Server 9000</h3>
                    </div>
                    <div class="p-3 rounded-lg" id="tallyStatusIcon">
                        <span class="text-2xl">⏳</span>
                    </div>
                </div>
                <div class="flex items-center gap-2 mb-3">
                    <div class="w-3 h-3 rounded-full" id="tallyStatusDot" style="background-color: #9ca3af;"></div>
                    <span class="text-sm font-medium" id="tallyStatusText" style="color: #6b7280;">Checking...</span>
                </div>
                <div class="text-xs text-gray-400">
                    <p>Last Check: <span id="tallyLastCheck">--:--:--</span></p>
                    <p>Host: localhost:9000</p>
                </div>
            </div>

            <!-- Internet Connection Status -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">Internet Status</p>
                        <h3 class="text-lg font-bold text-gray-800 mt-2">Connectivity</h3>
                    </div>
                    <div class="p-3 rounded-lg" id="internetStatusIcon">
                        <span class="text-2xl">⏳</span>
                    </div>
                </div>
                <div class="flex items-center gap-2 mb-3">
                    <div class="w-3 h-3 rounded-full" id="internetStatusDot" style="background-color: #9ca3af;"></div>
                    <span class="text-sm font-medium" id="internetStatusText" style="color: #6b7280;">Checking...</span>
                </div>
                <div class="text-xs text-gray-400">
                    <p>Last Check: <span id="internetLastCheck">--:--:--</span></p>
                    <p>Type: DNS Lookup</p>
                </div>
            </div>

            <!-- Sync Status -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">Sync Status</p>
                        <h3 class="text-lg font-bold text-gray-800 mt-2">Overall</h3>
                    </div>
                    <div class="p-3 rounded-lg" id="syncStatusIcon">
                        <span class="text-2xl">⏳</span>
                    </div>
                </div>
                <div class="flex items-center gap-2 mb-3">
                    <div class="w-3 h-3 rounded-full" id="syncStatusDot" style="background-color: #9ca3af;"></div>
                    <span class="text-sm font-medium" id="syncStatusText" style="color: #6b7280;">Checking...</span>
                </div>
                <div class="text-xs text-gray-400">
                    <p>Sync Enabled: <span id="syncEnabledStatus">No</span></p>
                    <p>Interval: 10 seconds</p>
                </div>
            </div>
        </div>

        <!-- Tally License Information -->
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4">📜 Tally License Information</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="bg-white rounded-lg p-4 border border-blue-100">
                    <p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">License Number</p>
                    <p class="text-2xl font-bold text-blue-600" id="licenseNumber">--</p>
                    <p class="text-xs text-gray-400 mt-2">Tally License Serial</p>
                </div>
                <div class="bg-white rounded-lg p-4 border border-green-100">
                    <p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Product Version</p>
                    <p class="text-2xl font-bold text-green-600" id="productVersion">--</p>
                    <p class="text-xs text-gray-400 mt-2">Tally ERP Version</p>
                </div>
                <div class="bg-white rounded-lg p-4 border border-purple-100">
                    <p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Status</p>
                    <p class="text-2xl font-bold text-purple-600" id="licenseStatus">--</p>
                    <p class="text-xs text-gray-400 mt-2">License Status</p>
                </div>
                <div class="bg-white rounded-lg p-4 border border-orange-100">
                    <p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Last Updated</p>
                    <p class="text-sm font-bold text-orange-600" id="licenseUpdated">--</p>
                    <p class="text-xs text-gray-400 mt-2">Last fetch time</p>
                </div>
            </div>
        </div>

        <!-- Detailed Status Timeline -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4">Connection History</h3>
            <div class="space-y-3 max-h-96 overflow-y-auto custom-scrollbar" id="statusTimeline">
                <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div class="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></div>
                    <div class="text-sm text-gray-600">
                        <span class="font-medium">Initializing</span>
                        <span class="text-gray-400 text-xs ml-2">Just now</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Control Panel -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4">Controls</h3>
            <div class="space-y-4">
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                        <p class="font-medium text-gray-800">Auto Sync Monitoring</p>
                        <p class="text-sm text-gray-500">Check connection every 10 seconds</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="autoSyncToggle" class="sr-only peer" checked>
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                </div>

                <div class="flex gap-3">
                    <button id="testTallyBtn" class="btn btn-primary flex-1">
                        <span>🔗</span>
                        <span>Test Tally Connection</span>
                    </button>
                    <button id="testInternetBtn" class="btn btn-primary flex-1">
                        <span>🌐</span>
                        <span>Test Internet</span>
                    </button>
                    <button id="fetchLicenseBtn" class="btn btn-primary flex-1">
                        <span>📜</span>
                        <span>Fetch License</span>
                    </button>
                    <button id="clearHistoryBtn" class="btn btn-secondary flex-1">
                        <span>🗑️</span>
                        <span>Clear History</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Statistics -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 class="text-lg font-bold text-gray-800 mb-4">Tally Statistics</h3>
                <div class="space-y-3">
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span class="text-sm text-gray-600">Connected</span>
                        <span class="text-lg font-bold text-green-600" id="tallyConnectedCount">0</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span class="text-sm text-gray-600">Disconnected</span>
                        <span class="text-lg font-bold text-red-600" id="tallyDisconnectedCount">0</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span class="text-sm text-gray-600">Success Rate</span>
                        <span class="text-lg font-bold text-blue-600" id="tallySuccessRate">0%</span>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 class="text-lg font-bold text-gray-800 mb-4">Internet Statistics</h3>
                <div class="space-y-3">
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span class="text-sm text-gray-600">Connected</span>
                        <span class="text-lg font-bold text-green-600" id="internetConnectedCount">0</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span class="text-sm text-gray-600">Disconnected</span>
                        <span class="text-lg font-bold text-red-600" id="internetDisconnectedCount">0</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span class="text-sm text-gray-600">Success Rate</span>
                        <span class="text-lg font-bold text-blue-600" id="internetSuccessRate">0%</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

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
        history: [],
        licenseInfo: {
            licenseNumber: '--',
            productVersion: '--',
            status: '--',
            lastUpdated: '--'
        }
    };

    // Check Tally connection (localhost:9000) via IPC to avoid CORS issues
    async function checkTallyConnection() {
        try {
            // Use IPC to check connection from main process (avoids CORS)
            if (window.electronAPI && window.electronAPI.checkTallyConnection) {
                const result = await window.electronAPI.checkTallyConnection();
                return result === true;
            }
            
            // Fallback: Direct fetch with simple GET request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch('http://localhost:9000/', {
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

        // Update Statistics
        updateStatistics();

        // Update Timeline
        addTimelineEntry();
    }

    function updateStatusCard(type, connected, timeStr) {
        const statusDot = document.getElementById(`${type}StatusDot`);
        const statusText = document.getElementById(`${type}StatusText`);
        const statusIcon = document.getElementById(`${type}StatusIcon`);
        const lastCheck = document.getElementById(`${type}LastCheck`);

        if (statusDot) {
            statusDot.style.backgroundColor = connected ? '#22c55e' : '#ef4444';
        }

        if (statusText) {
            statusText.textContent = connected ? 'Connected' : 'Disconnected';
            statusText.style.color = connected ? '#16a34a' : '#dc2626';
        }

        if (statusIcon) {
            statusIcon.innerHTML = `<span class="text-2xl">${connected ? '✅' : '❌'}</span>`;
        }

        if (lastCheck) {
            lastCheck.textContent = timeStr;
        }
    }

    function updateStatistics() {
        // Tally Statistics
        const tallyConnected = document.getElementById('tallyConnectedCount');
        const tallyDisconnected = document.getElementById('tallyDisconnectedCount');
        const tallyRate = document.getElementById('tallySuccessRate');

        if (tallyConnected) tallyConnected.textContent = syncState.tally.successCount;
        if (tallyDisconnected) tallyDisconnected.textContent = syncState.tally.totalCount - syncState.tally.successCount;
        if (tallyRate) {
            const rate = syncState.tally.totalCount > 0 
                ? Math.round((syncState.tally.successCount / syncState.tally.totalCount) * 100)
                : 0;
            tallyRate.textContent = rate + '%';
        }

        // Internet Statistics
        const internetConnected = document.getElementById('internetConnectedCount');
        const internetDisconnected = document.getElementById('internetDisconnectedCount');
        const internetRate = document.getElementById('internetSuccessRate');

        if (internetConnected) internetConnected.textContent = syncState.internet.successCount;
        if (internetDisconnected) internetDisconnected.textContent = syncState.internet.totalCount - syncState.internet.successCount;
        if (internetRate) {
            const rate = syncState.internet.totalCount > 0
                ? Math.round((syncState.internet.successCount / syncState.internet.totalCount) * 100)
                : 0;
            internetRate.textContent = rate + '%';
        }
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
            licenseStatus.textContent = syncState.licenseInfo.status;
            licenseStatus.style.color = syncState.licenseInfo.status === 'active' ? '#16a34a' : '#dc2626';
        }
        if (licenseUpdated) licenseUpdated.textContent = syncState.licenseInfo.lastUpdated;

        addTimelineEntry(`License fetched - ${syncState.licenseInfo.licenseNumber}`);
    }

    function addTimelineEntry(customMessage) {
        const timeline = document.getElementById('statusTimeline');
        if (!timeline) return;

        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        
        const entry = document.createElement('div');
        entry.className = 'flex items-center gap-3 p-3 bg-gray-50 rounded-lg';
        
        if (customMessage) {
            // Custom message entry (license fetch, etc)
            entry.innerHTML = `
                <div class="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>
                <div class="text-sm text-gray-600 flex-1">
                    <span class="font-medium">${customMessage}</span>
                    <span class="text-gray-400 text-xs ml-2">${timeStr}</span>
                </div>
            `;
        } else {
            // Status entry
            const tallyStatus = syncState.tally.connected ? '✅ Tally' : '❌ Tally';
            const internetStatus = syncState.internet.connected ? '✅ Internet' : '❌ Internet';
            const isOnline = syncState.tally.connected && syncState.internet.connected;
            
            entry.innerHTML = `
                <div class="w-2 h-2 ${isOnline ? 'bg-green-400' : 'bg-red-400'} rounded-full flex-shrink-0"></div>
                <div class="text-sm text-gray-600 flex-1">
                    <span class="font-medium">${tallyStatus} | ${internetStatus}</span>
                    <span class="text-gray-400 text-xs ml-2">${timeStr}</span>
                </div>
            `;
        }

        timeline.insertBefore(entry, timeline.firstChild);

        // Keep only last 20 entries
        while (timeline.children.length > 20) {
            timeline.removeChild(timeline.lastChild);
        }
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
            console.log('Auto-fetching license info...');
            if (window.electronAPI && window.electronAPI.fetchLicense) {
                const result = await window.electronAPI.fetchLicense();
                
                if (result.success && result.data) {
                    console.log('License fetched successfully:', result.data);
                    updateLicenseInfo(result.data);
                } else {
                    console.warn('License fetch failed:', result.error);
                    addTimelineEntry('⚠️ License fetch - ' + (result.error || 'Unknown error'));
                }
            } else {
                console.warn('electronAPI.fetchLicense not available');
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
    window.initializeSyncSettings = function () {
        console.log('Initializing Sync Settings Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getSyncSettingsTemplate();

            // Setup event listeners
            const autoSyncToggle = document.getElementById('autoSyncToggle');
            if (autoSyncToggle) {
                autoSyncToggle.addEventListener('change', (e) => {
                    syncState.autoSync = e.target.checked;
                    if (syncState.autoSync) {
                        startPeriodicChecks();
                    } else {
                        stopPeriodicChecks();
                    }
                });
            }

            const testTallyBtn = document.getElementById('testTallyBtn');
            if (testTallyBtn) {
                testTallyBtn.addEventListener('click', () => {
                    testTallyBtn.disabled = true;
                    testTallyBtn.textContent = '⏳ Testing...';
                    checkTallyConnection().then(result => {
                        syncState.tally.connected = result;
                        syncState.tally.lastCheck = new Date();
                        syncState.tally.totalCount++;
                        if (result) syncState.tally.successCount++;
                        updateUI();
                        testTallyBtn.disabled = false;
                        testTallyBtn.textContent = '🔗 Test Tally Connection';
                    });
                });
            }

            const testInternetBtn = document.getElementById('testInternetBtn');
            if (testInternetBtn) {
                testInternetBtn.addEventListener('click', () => {
                    testInternetBtn.disabled = true;
                    testInternetBtn.textContent = '⏳ Testing...';
                    checkInternetConnection().then(result => {
                        syncState.internet.connected = result;
                        syncState.internet.lastCheck = new Date();
                        syncState.internet.totalCount++;
                        if (result) syncState.internet.successCount++;
                        updateUI();
                        testInternetBtn.disabled = false;
                        testInternetBtn.textContent = '🌐 Test Internet';
                    });
                });
            }

            const clearHistoryBtn = document.getElementById('clearHistoryBtn');
            if (clearHistoryBtn) {
                clearHistoryBtn.addEventListener('click', () => {
                    const timeline = document.getElementById('statusTimeline');
                    if (timeline) {
                        timeline.innerHTML = '<div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"><div class="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0"></div><div class="text-sm text-gray-600"><span class="font-medium">History cleared</span></div></div>';
                        syncState.history = [];
                    }
                });
            }

            const fetchLicenseBtn = document.getElementById('fetchLicenseBtn');
            if (fetchLicenseBtn) {
                fetchLicenseBtn.addEventListener('click', async () => {
                    fetchLicenseBtn.disabled = true;
                    fetchLicenseBtn.innerHTML = '<span>⏳</span><span>Fetching License...</span>';
                    
                    try {
                        // Call Python via IPC to fetch license
                        if (window.electronAPI && window.electronAPI.fetchLicense) {
                            const result = await window.electronAPI.fetchLicense();
                            
                            if (result.success && result.data) {
                                updateLicenseInfo(result.data);
                            } else {
                                addTimelineEntry('❌ License fetch failed - ' + (result.error || 'Unknown error'));
                            }
                        } else {
                            addTimelineEntry('❌ Electron API not available');
                        }
                    } catch (error) {
                        console.error('License fetch error:', error);
                        addTimelineEntry('❌ License fetch failed - ' + error.message);
                    } finally {
                        fetchLicenseBtn.disabled = false;
                        fetchLicenseBtn.innerHTML = '<span>📜</span><span>Fetch License</span>';
                    }
                });
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
