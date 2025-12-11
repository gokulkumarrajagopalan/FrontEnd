(function () {
    const getHomeTemplate = () => `
    <div id="homePageContainer" class="space-y-6">
        <!-- Hero Section -->
        <div class="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-8 text-white shadow-xl shadow-primary-900/20 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div class="relative z-10">
                <h1 class="text-3xl font-bold mb-2">Welcome to Tally Prime</h1>
                <p class="text-primary-100 text-lg max-w-xl">Your complete enterprise resource planning solution. Manage finances, inventory, and operations seamlessly.</p>
                <div class="flex gap-3 mt-6">
                    <button class="bg-white text-primary-700 px-6 py-2.5 rounded-lg font-semibold shadow-lg hover:bg-gray-50 transition-colors" onclick="window.router.navigate('vouchers')">Create Voucher</button>
                    <button class="bg-primary-700/50 text-white border border-white/20 px-6 py-2.5 rounded-lg font-semibold hover:bg-primary-700/70 transition-colors" onclick="window.router.navigate('reports')">View Reports</button>
                </div>
            </div>
        </div>

        <!-- Quick Actions Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

        <!-- Features Section -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-lg font-bold text-gray-800">System Status</h3>
                    <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Operational</span>
                </div>
                <div class="space-y-4">
                    <div class="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div class="flex-1">
                            <h4 class="text-sm font-medium">Database Connection</h4>
                            <p class="text-xs text-gray-500">Connected to local instance</p>
                        </div>
                        <span class="text-xs text-gray-400">2ms</span>
                    </div>
                    <div class="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div class="flex-1">
                            <h4 class="text-sm font-medium">API Gateway</h4>
                            <p class="text-xs text-gray-500">Responding normally</p>
                        </div>
                        <span class="text-xs text-gray-400">15ms</span>
                    </div>
                    <div class="flex items-center gap-4 p-3 bg-gray-50 rounded-lg" id="autoSyncStatusHome">
                        <div class="w-2 h-2 bg-gray-400 rounded-full" id="syncIndicatorDot"></div>
                        <div class="flex-1">
                            <h4 class="text-sm font-medium">Auto-Sync Service</h4>
                            <p class="text-xs text-gray-500" id="syncStatusTextHome">Checking...</p>
                        </div>
                        <span class="text-xs text-gray-400" id="syncIntervalDisplay">-</span>
                    </div>
                    <div class="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div class="flex-1">
                            <h4 class="text-sm font-medium">Backup Service</h4>
                            <p class="text-xs text-gray-500">Last backup: 2 hours ago</p>
                        </div>
                        <span class="text-xs text-gray-400">Idle</span>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 class="text-lg font-bold text-gray-800 mb-4">Recent Activity</h3>
                <div class="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                    <div class="relative pl-6">
                        <div class="absolute left-0 top-1.5 w-4 h-4 bg-blue-100 rounded-full border-2 border-white"></div>
                        <p class="text-sm text-gray-800 font-medium">System Startup</p>
                        <p class="text-xs text-gray-500">Just now</p>
                    </div>
                    <div class="relative pl-6">
                        <div class="absolute left-0 top-1.5 w-4 h-4 bg-green-100 rounded-full border-2 border-white"></div>
                        <p class="text-sm text-gray-800 font-medium">User Login</p>
                        <p class="text-xs text-gray-500">2 mins ago</p>
                    </div>
                    <div class="relative pl-6">
                        <div class="absolute left-0 top-1.5 w-4 h-4 bg-orange-100 rounded-full border-2 border-white"></div>
                        <p class="text-sm text-gray-800 font-medium">Data Sync</p>
                        <p class="text-xs text-gray-500">1 hour ago</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    function updateHomeSyncStatus() {
        if (!window.syncScheduler) return;
        
        const status = window.syncScheduler.getStatus();
        const indicatorDot = document.getElementById('syncIndicatorDot');
        const statusText = document.getElementById('syncStatusTextHome');
        const intervalDisplay = document.getElementById('syncIntervalDisplay');
        
        if (!indicatorDot || !statusText || !intervalDisplay) return;
        
        if (status.isRunning) {
            indicatorDot.className = 'w-2 h-2 bg-green-500 rounded-full';
            if (status.isSyncing) {
                statusText.textContent = 'Syncing companies now...';
                intervalDisplay.textContent = '🔄';
            } else {
                statusText.textContent = `Active - Every ${status.syncInterval} min`;
                if (status.lastSyncTime) {
                    const mins = Math.floor((Date.now() - status.lastSyncTime.getTime()) / 60000);
                    intervalDisplay.textContent = mins === 0 ? 'Just now' : `${mins}m ago`;
                } else {
                    intervalDisplay.textContent = 'Ready';
                }
            }
        } else {
            indicatorDot.className = 'w-2 h-2 bg-gray-400 rounded-full';
            statusText.textContent = 'Disabled';
            intervalDisplay.textContent = 'Idle';
        }
    }

    window.initializeHome = function () {
        console.log('Initializing Home Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getHomeTemplate();
            
            // Update sync status
            updateHomeSyncStatus();
            
            // Update every 10 seconds
            setInterval(updateHomeSyncStatus, 10000);
        }
    };
})();
