(function () {
    const getHomeTemplate = () => `
    <div id="homePageContainer" class="space-y-6" style="padding: 2.5rem; max-width: 1400px; margin: 0 auto; box-sizing: border-box;">
        <!-- Hero Section -->
        <div class="rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden" style="background: linear-gradient(135deg, #06090a 0%, #6B7F8E 100%); border: 1px solid rgba(255, 255, 255, 0.1);">
            <div class="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div class="relative z-10">
                <h1 class="text-3xl font-bold mb-2" style="color: #ffffff !important;">Welcome to Talliffy</h1>
                <p class="text-lg max-w-xl" style="color: #ffffff !important; opacity: 0.9;">Your complete enterprise resource planning solution. Manage finances, inventory, and operations seamlessly with Tally integration.</p>
                <div class="flex gap-3 mt-6">
                    <button class="px-8 py-3 rounded-lg font-bold shadow-xl transition-all active:scale-95 hover:shadow-2xl" 
                            style="background: #5E86BA; color: white; border: none; cursor: pointer;" 
                            onclick="window.router.navigate('company-sync')">🔄 Sync Data</button>
                    <button class="px-8 py-3 rounded-lg font-bold transition-all active:scale-95 hover:shadow-xl" 
                            style="background: rgba(94, 134, 186, 0.3); color: white; border: none; cursor: pointer; backdrop-filter: blur(10px);"
                            onclick="window.router.navigate('groups')">📊 View Masters</button>
                </div>
            </div>
        </div>

        <!-- Stats Overview -->
        <div class="grid grid-cols-4 gap-4">
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-sm hover:shadow-md transition-all">
                <div class="flex items-center justify-between mb-3">
                    <div class="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-2xl">📁</div>
                    <span class="text-xs font-semibold text-blue-600 bg-blue-200 px-2 py-1 rounded-full">Masters</span>
                </div>
                <h3 class="text-2xl font-bold text-gray-800">Groups</h3>
                <p class="text-sm text-gray-600 mt-1">Financial classification</p>
            </div>
            <div class="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl shadow-sm hover:shadow-md transition-all">
                <div class="flex items-center justify-between mb-3">
                    <div class="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-2xl">📒</div>
                    <span class="text-xs font-semibold text-green-600 bg-green-200 px-2 py-1 rounded-full">Accounts</span>
                </div>
                <h3 class="text-2xl font-bold text-gray-800">Ledgers</h3>
                <p class="text-sm text-gray-600 mt-1">Account management</p>
            </div>
            <div class="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl shadow-sm hover:shadow-md transition-all">
                <div class="flex items-center justify-between mb-3">
                    <div class="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center text-2xl">📦</div>
                    <span class="text-xs font-semibold text-orange-600 bg-orange-200 px-2 py-1 rounded-full">Inventory</span>
                </div>
                <h3 class="text-2xl font-bold text-gray-800">Stock Items</h3>
                <p class="text-sm text-gray-600 mt-1">Product catalog</p>
            </div>
            <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl shadow-sm hover:shadow-md transition-all">
                <div class="flex items-center justify-between mb-3">
                    <div class="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-2xl">🏬</div>
                    <span class="text-xs font-semibold text-purple-600 bg-purple-200 px-2 py-1 rounded-full">Locations</span>
                </div>
                <h3 class="text-2xl font-bold text-gray-800">Godowns</h3>
                <p class="text-sm text-gray-600 mt-1">Warehouse management</p>
            </div>
        </div>

        <!-- Quick Actions Grid -->
        <div class="grid grid-cols-2 gap-6">
            <!-- Finance Masters Card -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
                <div class="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
                    <h3 class="text-lg font-bold flex items-center gap-2" style="color: #000000;">
                        <span>💼</span> Finance Masters
                    </h3>
                    <p class="text-sm mt-1" style="color: #000000;">Manage financial data and accounting</p>
                </div>
                <div class="p-4 space-y-2">
                    <div class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors" onclick="window.router.navigate('groups')">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">📁</span>
                            <div>
                                <div class="font-semibold text-gray-800">Groups</div>
                                <div class="text-xs text-gray-500">Account grouping & hierarchy</div>
                            </div>
                        </div>
                        <span class="text-gray-400">→</span>
                    </div>
                    <div class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors" onclick="window.router.navigate('ledgers')">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">📒</span>
                            <div>
                                <div class="font-semibold text-gray-800">Ledgers</div>
                                <div class="text-xs text-gray-500">Individual accounts & balances</div>
                            </div>
                        </div>
                        <span class="text-gray-400">→</span>
                    </div>
                </div>
            </div>

            <!-- Inventory Masters Card -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
                <div class="bg-gradient-to-r from-orange-500 to-orange-600 p-4">
                    <h3 class="text-lg font-bold flex items-center gap-2" style="color: #000000;">
                        <span>📦</span> Inventory Masters
                    </h3>
                    <p class="text-sm mt-1" style="color: #000000;">Control stock and warehouse operations</p>
                </div>
                <div class="p-4 space-y-2">
                    <div class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors" onclick="window.router.navigate('stock-items')">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">🍎</span>
                            <div>
                                <div class="font-semibold text-gray-800">Stock Items</div>
                                <div class="text-xs text-gray-500">Products & pricing details</div>
                            </div>
                        </div>
                        <span class="text-gray-400">→</span>
                    </div>
                    <div class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors" onclick="window.router.navigate('stock-groups')">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">📦</span>
                            <div>
                                <div class="font-semibold text-gray-800">Stock Groups</div>
                                <div class="text-xs text-gray-500">Product categorization</div>
                            </div>
                        </div>
                        <span class="text-gray-400">→</span>
                    </div>
                    <div class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors" onclick="window.router.navigate('godowns')">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">🏬</span>
                            <div>
                                <div class="font-semibold text-gray-800">Godowns</div>
                                <div class="text-xs text-gray-500">Storage locations & inventory</div>
                            </div>
                        </div>
                        <span class="text-gray-400">→</span>
                    </div>
                    <div class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors" onclick="window.router.navigate('units')">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">📏</span>
                            <div>
                                <div class="font-semibold text-gray-800">Units</div>
                                <div class="text-xs text-gray-500">Measurement units</div>
                            </div>
                        </div>
                        <span class="text-gray-400">→</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Sync & Settings Section -->
        <div class="grid grid-cols-3 gap-4">
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group" onclick="window.router.navigate('import-company')">
                <div class="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">📥</div>
                <h3 class="font-semibold text-gray-800">Import Company</h3>
                <p class="text-xs text-gray-500 mt-1">Sync companies from Tally</p>
            </div>
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group" onclick="window.router.navigate('company-sync')">
                <div class="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">🏢</div>
                <h3 class="font-semibold text-gray-800">Company Sync</h3>
                <p class="text-xs text-gray-500 mt-1">Full data synchronization</p>
            </div>
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group" onclick="window.router.navigate('sync-settings')">
                <div class="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">📡</div>
                <h3 class="font-semibold text-gray-800">Tally Sync</h3>
                <p class="text-xs text-gray-500 mt-1">Configure sync settings</p>
            </div>
        </div>

        <!-- Info Banner -->
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
            <div class="flex items-start gap-4">
                <div class="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">💡</div>
                <div>
                    <h3 class="font-bold text-gray-800 mb-1">Getting Started with Talliffy</h3>
                    <p class="text-sm text-gray-600 mb-3">Follow these steps to set up your system and start syncing data from Tally:</p>
                    <ol class="text-sm text-gray-600 space-y-2 ml-4">
                        <li class="flex items-start gap-2">
                            <span class="font-bold text-blue-600">1.</span>
                            <span><strong>Import Companies:</strong> Connect to Tally and import your company data</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <span class="font-bold text-blue-600">2.</span>
                            <span><strong>Configure Sync:</strong> Set up automatic synchronization schedules</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <span class="font-bold text-blue-600">3.</span>
                            <span><strong>Sync Masters:</strong> Synchronize groups, ledgers, and inventory data</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <span class="font-bold text-blue-600">4.</span>
                            <span><strong>Export Reports:</strong> Generate Excel reports for analysis</span>
                        </li>
                    </ol>
                </div>
            </div>
        </div>
    </div>
    `;

    window.initializeHome = function () {
        console.log('Initializing Home Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getHomeTemplate();
        }
    };
})();
