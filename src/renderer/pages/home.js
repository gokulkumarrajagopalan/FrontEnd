(function () {
    const getHomeTemplate = () => `
    <div id="homePageContainer" class="space-y-6" style="padding: 1rem; box-sizing: border-box;">
        <!-- Hero Section -->
        <div class="rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border: 1px solid rgba(255, 255, 255, 0.1);">
            <div class="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div class="relative z-10">
                <h1 class="text-3xl font-bold mb-2" style="color: #ffffff !important;">Welcome to Tally Prime</h1>
                <p class="text-lg max-w-xl" style="color: #ffffff !important; opacity: 0.9;">Your complete enterprise resource planning solution. Manage finances, inventory, and operations seamlessly.</p>
                <div class="flex gap-3 mt-6">
                    <button class="text-white px-6 py-2.5 rounded-lg font-semibold shadow-lg transition-all hover:opacity-90 active:scale-95" 
                            style="background: #8761e3;" 
                            onclick="window.router.navigate('vouchers')">Create Voucher</button>
                    <button class="bg-white/10 text-white border border-white/20 px-6 py-2.5 rounded-lg font-semibold hover:bg-white/20 transition-colors active:scale-95" 
                            onclick="window.router.navigate('reports')">View Reports</button>
                </div>
            </div>
        </div>

        <!-- Quick Actions Grid -->
        <div class="grid grid-cols-4 gap-4">
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group" onclick="window.router.navigate('invoices')">
                <div class="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">🧾</div>
                <h3 class="font-semibold text-gray-800">Invoices</h3>
                <p class="text-xs text-gray-500 mt-1">Manage sales & billing</p>
            </div>
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group" onclick="window.router.navigate('inventory')">
                <div class="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">📦</div>
                <h3 class="font-semibold text-gray-800">Inventory</h3>
                <p class="text-xs text-gray-500 mt-1">Track stock levels</p>
            </div>
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group" onclick="window.router.navigate('bank-reconciliation')">
                <div class="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">🏦</div>
                <h3 class="font-semibold text-gray-800">Banking</h3>
                <p class="text-xs text-gray-500 mt-1">Reconcile statements</p>
            </div>
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group" onclick="window.router.navigate('reports')">
                <div class="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">📈</div>
                <h3 class="font-semibold text-gray-800">Reports</h3>
                <p class="text-xs text-gray-500 mt-1">Financial insights</p>
            </div>
        </div>

        <!-- System Status - Horizontal Layout -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold text-gray-800">System Status</h3>
                <span class="px-3 py-1 rounded-full text-xs font-medium" id="overallStatusBadge">
                    <span class="inline-block w-1.5 h-1.5 rounded-full mr-1.5" id="overallStatusDot"></span>
                    <span id="overallStatusText">Checking...</span>
                </span>
            </div>
            
            <!-- Horizontal Status Cards -->
            <div class="grid grid-cols-4 gap-4">
                <!-- Tally Connection -->
                <div class="p-4 bg-gradient-to-br from-blue-50 to-blue-100/30 rounded-lg border border-blue-100 hover:shadow-md transition-shadow">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-2xl">🔌</span>
                        <div class="w-2 h-2 rounded-full" id="tallyStatusDot"></div>
                    </div>
                    <h4 class="text-sm font-semibold text-gray-800">Tally Prime</h4>
                    <p class="text-xs text-gray-600 mt-1" id="tallyStatusText">Connecting...</p>
                    <span class="text-xs text-gray-400 mt-2 block" id="tallyResponseTime">-</span>
                </div>

                <!-- Backend API -->
                <div class="p-4 bg-gradient-to-br from-green-50 to-green-100/30 rounded-lg border border-green-100 hover:shadow-md transition-shadow">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-2xl">🌐</span>
                        <div class="w-2 h-2 rounded-full" id="backendStatusDot"></div>
                    </div>
                    <h4 class="text-sm font-semibold text-gray-800">Backend API</h4>
                    <p class="text-xs text-gray-600 mt-1" id="backendStatusText">Connecting...</p>
                    <span class="text-xs text-gray-400 mt-2 block" id="backendResponseTime">-</span>
                </div>

                <!-- Auto-Sync Service -->
                <div class="p-4 bg-gradient-to-br from-purple-50 to-purple-100/30 rounded-lg border border-purple-100 hover:shadow-md transition-shadow">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-2xl">🔄</span>
                        <div class="w-2 h-2 rounded-full" id="syncStatusDot"></div>
                    </div>
                    <h4 class="text-sm font-semibold text-gray-800">Auto-Sync</h4>
                    <p class="text-xs text-gray-600 mt-1" id="syncStatusText">Checking...</p>
                    <span class="text-xs text-gray-400 mt-2 block" id="syncLastTime">-</span>
                </div>

                <!-- Last Sync -->
                <div class="p-4 bg-gradient-to-br from-orange-50 to-orange-100/30 rounded-lg border border-orange-100 hover:shadow-md transition-shadow">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-2xl">⏱️</span>
                        <div class="w-2 h-2 rounded-full" id="lastSyncStatusDot"></div>
                    </div>
                    <h4 class="text-sm font-semibold text-gray-800">Last Sync</h4>
                    <p class="text-xs text-gray-600 mt-1" id="lastSyncCompany">No recent sync</p>
                    <span class="text-xs text-gray-400 mt-2 block" id="lastSyncTime">-</span>
                </div>
            </div>
        </div>
    </div>
    `;

    // Check Tally Connection
    async function checkTallyConnection() {
        const dot = document.getElementById('tallyStatusDot');
        const text = document.getElementById('tallyStatusText');
        const time = document.getElementById('tallyResponseTime');
        
        if (!dot || !text || !time) return;

        const startTime = Date.now();
        try {
            const response = await fetch('http://localhost:9000', { 
                method: 'GET',
                timeout: 5000 
            });
            const elapsed = Date.now() - startTime;
            
            if (response.ok || response.status === 404) { // 404 is OK, means Tally is running
                dot.className = 'w-2 h-2 bg-green-500 rounded-full animate-pulse';
                text.textContent = 'Connected (Port 9000)';
                time.textContent = `${elapsed}ms`;
            } else {
                throw new Error('Connection failed');
            }
        } catch (error) {
            dot.className = 'w-2 h-2 bg-red-500 rounded-full';
            text.textContent = 'Disconnected';
            time.textContent = 'Offline';
        }
    }

    // Check Backend API
    // async function checkBackendAPI() {
    //     const dot = document.getElementById('backendStatusDot');
    //     const text = document.getElementById('backendStatusText');
    //     const time = document.getElementById('backendResponseTime');
        
    //     if (!dot || !text || !time) return;

    //     const startTime = Date.now();
    //     try {
    //         const response = await fetch('http://localhost:8080/health', { 
    //             method: 'GET',
    //             timeout: 5000 
    //         });
    //         const elapsed = Date.now() - startTime;
            
    //         if (response.ok) {
    //             dot.className = 'w-2 h-2 bg-green-500 rounded-full animate-pulse';
    //             text.textContent = 'Online (Port 8080)';
    //             time.textContent = `${elapsed}ms`;
    //         } else {
    //             throw new Error('API error');
    //         }
    //     } catch (error) {
    //         dot.className = 'w-2 h-2 bg-red-500 rounded-full';
    //         text.textContent = 'Offline';
    //         time.textContent = 'No response';
    //     }
    // }

    // Update Auto-Sync Status
    function updateAutoSyncStatus() {
        const dot = document.getElementById('syncStatusDot');
        const text = document.getElementById('syncStatusText');
        const time = document.getElementById('syncLastTime');
        
        if (!dot || !text || !time) return;

        if (window.syncScheduler) {
            const status = window.syncScheduler.getStatus();
            
            if (status.isRunning) {
                if (status.isSyncing) {
                    dot.className = 'w-2 h-2 bg-blue-500 rounded-full animate-ping';
                    text.textContent = 'Syncing now...';
                    time.textContent = '🔄 Active';
                } else {
                    dot.className = 'w-2 h-2 bg-green-500 rounded-full animate-pulse';
                    text.textContent = `Every ${status.syncInterval || 120} min`;
                    
                    if (status.lastSyncTime) {
                        const mins = Math.floor((Date.now() - status.lastSyncTime.getTime()) / 60000);
                        time.textContent = mins === 0 ? 'Just now' : `${mins}m ago`;
                    } else {
                        time.textContent = 'Ready';
                    }
                }
            } else {
                dot.className = 'w-2 h-2 bg-gray-400 rounded-full';
                text.textContent = 'Disabled';
                time.textContent = 'Idle';
            }
        } else {
            dot.className = 'w-2 h-2 bg-yellow-500 rounded-full';
            text.textContent = 'Initializing...';
            time.textContent = 'Starting';
        }
    }

    // Update Last Sync Info
    function updateLastSyncInfo() {
        const dot = document.getElementById('lastSyncStatusDot');
        const company = document.getElementById('lastSyncCompany');
        const time = document.getElementById('lastSyncTime');
        
        if (!dot || !company || !time) return;

        // Get last sync from localStorage or notification center
        const companySyncStatus = JSON.parse(localStorage.getItem('companySyncStatus') || '{}');
        const companies = Object.keys(companySyncStatus);
        
        if (companies.length > 0) {
            // Get most recent sync
            let mostRecent = null;
            let mostRecentTime = 0;
            
            companies.forEach(companyName => {
                const syncData = companySyncStatus[companyName];
                if (syncData.timestamp && syncData.timestamp > mostRecentTime) {
                    mostRecentTime = syncData.timestamp;
                    mostRecent = { name: companyName, ...syncData };
                }
            });
            
            if (mostRecent) {
                if (mostRecent.status === 'success') {
                    dot.className = 'w-2 h-2 bg-green-500 rounded-full';
                    company.textContent = `${mostRecent.name} ✓`;
                } else if (mostRecent.status === 'error') {
                    dot.className = 'w-2 h-2 bg-red-500 rounded-full';
                    company.textContent = `${mostRecent.name} ✗`;
                } else {
                    dot.className = 'w-2 h-2 bg-blue-500 rounded-full animate-pulse';
                    company.textContent = `${mostRecent.name} 🔄`;
                }
                
                const elapsed = Date.now() - mostRecent.timestamp;
                const mins = Math.floor(elapsed / 60000);
                const hours = Math.floor(mins / 60);
                
                if (mins < 1) {
                    time.textContent = 'Just now';
                } else if (mins < 60) {
                    time.textContent = `${mins}m ago`;
                } else {
                    time.textContent = `${hours}h ago`;
                }
            }
        } else {
            dot.className = 'w-2 h-2 bg-gray-400 rounded-full';
            company.textContent = 'No recent sync';
            time.textContent = '-';
        }
    }

    // Update Overall Status
    function updateOverallStatus() {
        const badge = document.getElementById('overallStatusBadge');
        const dot = document.getElementById('overallStatusDot');
        const text = document.getElementById('overallStatusText');
        
        if (!badge || !dot || !text) return;

        // Check all systems
        const tallyDot = document.getElementById('tallyStatusDot');
        const backendDot = document.getElementById('backendStatusDot');
        const syncDot = document.getElementById('syncStatusDot');
        
        const tallyOk = tallyDot && tallyDot.className.includes('green');
        const backendOk = backendDot && backendDot.className.includes('green');
        const syncOk = syncDot && (syncDot.className.includes('green') || syncDot.className.includes('blue'));
        
        if (tallyOk && backendOk && syncOk) {
            badge.className = 'px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium';
            dot.className = 'inline-block w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5';
            text.textContent = 'All Systems Operational';
        } else if (!tallyOk || !backendOk) {
            badge.className = 'px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium';
            dot.className = 'inline-block w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5';
            text.textContent = 'Connection Issues';
        } else {
            badge.className = 'px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium';
            dot.className = 'inline-block w-1.5 h-1.5 bg-yellow-500 rounded-full mr-1.5';
            text.textContent = 'Partial Service';
        }
    }

    // Refresh all status indicators
    async function refreshAllStatus() {
        await checkTallyConnection();
        updateAutoSyncStatus();
        updateLastSyncInfo();
        updateOverallStatus();
    }

    window.initializeHome = function () {
        console.log('Initializing Home Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getHomeTemplate();

            // Initial status check
            setTimeout(() => {
                refreshAllStatus();
            }, 500);

            // Update every 10 seconds
            setInterval(() => {
                refreshAllStatus();
            }, 10000);

            // Listen for sync events
            if (window.syncScheduler) {
                // Refresh when sync starts or completes
                const originalStartSync = window.syncScheduler.startSync;
                if (originalStartSync) {
                    window.syncScheduler.startSync = async function(...args) {
                        const result = await originalStartSync.apply(this, args);
                        refreshAllStatus();
                        return result;
                    };
                }
            }
        }
    };
})();
