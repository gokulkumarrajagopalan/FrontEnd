(function () {
    const getDashboardTemplate = () => `
    <div id="dashboardPageContainer" class="space-y-6">
        <div class="page-header">
            <h2>Dashboard Overview</h2>
            <p>Real-time financial insights and performance metrics.</p>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</p>
                        <h3 class="text-2xl font-bold text-gray-800 mt-1" id="totalIncome">₹0</h3>
                    </div>
                    <span class="p-2 bg-green-50 text-green-600 rounded-lg text-xl">💰</span>
                </div>
                <div class="flex items-center text-xs text-green-600 font-medium">
                    <span>↑ 12%</span>
                    <span class="text-gray-400 ml-1">vs last month</span>
                </div>
            </div>

            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</p>
                        <h3 class="text-2xl font-bold text-gray-800 mt-1" id="totalExpense">₹0</h3>
                    </div>
                    <span class="p-2 bg-red-50 text-red-600 rounded-lg text-xl">💸</span>
                </div>
                <div class="flex items-center text-xs text-red-600 font-medium">
                    <span>↑ 5%</span>
                    <span class="text-gray-400 ml-1">vs last month</span>
                </div>
            </div>

            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">Net Profit</p>
                        <h3 class="text-2xl font-bold text-gray-800 mt-1" id="netBalance">₹0</h3>
                    </div>
                    <span class="p-2 bg-blue-50 text-blue-600 rounded-lg text-xl">📈</span>
                </div>
                <div class="flex items-center text-xs text-green-600 font-medium">
                    <span>↑ 8%</span>
                    <span class="text-gray-400 ml-1">vs last month</span>
                </div>
            </div>

            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Invoices</p>
                        <h3 class="text-2xl font-bold text-gray-800 mt-1" id="totalItems">0</h3>
                    </div>
                    <span class="p-2 bg-orange-50 text-orange-600 rounded-lg text-xl">⏳</span>
                </div>
                <div class="flex items-center text-xs text-orange-600 font-medium">
                    <span>Needs Attention</span>
                </div>
            </div>
        </div>

        <!-- Recent Activity Tables -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Recent Vouchers -->
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">Recent Vouchers</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th class="px-4 py-2 text-left font-medium text-gray-600">Voucher #</th>
                                <th class="px-4 py-2 text-left font-medium text-gray-600">Date</th>
                                <th class="px-4 py-2 text-left font-medium text-gray-600">Type</th>
                                <th class="px-4 py-2 text-left font-medium text-gray-600">Amount</th>
                                <th class="px-4 py-2 text-left font-medium text-gray-600">Status</th>
                            </tr>
                        </thead>
                        <tbody id="recentVouchersTable">
                            <tr><td colspan="5" style="text-align: center; padding: 20px; color: #999;">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Top Ledgers -->
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">Top Ledgers</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th class="px-4 py-2 text-left font-medium text-gray-600">Ledger Name</th>
                                <th class="px-4 py-2 text-left font-medium text-gray-600">Group</th>
                                <th class="px-4 py-2 text-left font-medium text-gray-600">Balance</th>
                            </tr>
                        </thead>
                        <tbody id="topLedgersTable">
                            <tr><td colspan="3" style="text-align: center; padding: 20px; color: #999;">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    `;

    // Add styles
    const addStyles = () => {
        if (document.getElementById('dashboard-styles')) return;
        const style = document.createElement('style');
        style.id = 'dashboard-styles';
        style.textContent = `
            .badge {
                background: #667eea;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.85em;
            }

            .status-badge {
                background: #d4edda;
                color: #155724;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.85em;
            }
        `;
        document.head.appendChild(style);
    };

    window.initializeDashboard = async function () {
        console.log('Initializing Dashboard...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getDashboardTemplate();
            addStyles();
            await loadDashboardData();
        }
    };

    async function loadDashboardData() {
        try {
            if (!window.API_BASE_URL) {
                window.API_BASE_URL = window.AppConfig ? window.AppConfig.API_BASE_URL : 'http://localhost:8080';
            }

            // Fetch data from backend
            const [ledgers, vouchers] = await Promise.all([
                fetch(`${window.API_BASE_URL}/ledgers`).then(r => r.json()).catch(() => []),
                fetch(`${window.API_BASE_URL}/vouchers`).then(r => r.json()).catch(() => [])
            ]);

            // Calculate totals
            let totalIncome = 0;
            let totalExpense = 0;
            let itemCount = 0;

            if (Array.isArray(ledgers)) {
                ledgers.forEach(ledger => {
                    if (ledger.openingBalance > 0) totalIncome += ledger.openingBalance;
                });
            }

            if (Array.isArray(vouchers)) {
                vouchers.forEach(voucher => {
                    if (voucher.voucherType === 'EXPENSE') totalExpense += (voucher.totalAmount || 0);
                });
            }

            const netBalance = totalIncome - totalExpense;

            // Update stat cards with null safety
            const updateElement = (id, value) => {
                const el = document.getElementById(id);
                if (el) {
                    el.textContent = value;
                }
            };

            updateElement('totalIncome', `₹${totalIncome.toFixed(2)}`);
            updateElement('totalExpense', `₹${totalExpense.toFixed(2)}`);
            updateElement('netBalance', `₹${netBalance.toFixed(2)}`);
            updateElement('totalItems', itemCount);

            // Load recent vouchers
            const vouchersTable = document.getElementById('recentVouchersTable');
            if (vouchersTable) {
                if (Array.isArray(vouchers) && vouchers.length > 0) {
                    vouchersTable.innerHTML = vouchers.slice(0, 5).map(voucher => `
                        <tr>
                            <td class="px-4 py-2">#${voucher.id || 'N/A'}</td>
                            <td class="px-4 py-2">${new Date(voucher.voucherDate).toLocaleDateString()}</td>
                            <td class="px-4 py-2"><span class="badge">${voucher.voucherType || 'N/A'}</span></td>
                            <td class="px-4 py-2">₹${(voucher.totalAmount || 0).toFixed(2)}</td>
                            <td class="px-4 py-2"><span class="status-badge">${voucher.status || 'Active'}</span></td>
                        </tr>
                    `).join('');
                } else {
                    vouchersTable.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999; padding: 20px;">No vouchers found</td></tr>';
                }
            }

            // Load top ledgers
            const ledgersTable = document.getElementById('topLedgersTable');
            if (ledgersTable) {
                if (Array.isArray(ledgers) && ledgers.length > 0) {
                    ledgersTable.innerHTML = ledgers.slice(0, 5).map(ledger => `
                        <tr>
                            <td class="px-4 py-2">${ledger.ledgerName || 'N/A'}</td>
                            <td class="px-4 py-2">${ledger.groupName || 'N/A'}</td>
                            <td class="px-4 py-2">₹${(ledger.closingBalance || 0).toFixed(2)}</td>
                        </tr>
                    `).join('');
                } else {
                    ledgersTable.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #999; padding: 20px;">No ledgers found</td></tr>';
                }
            }

        } catch (error) {
            console.error('Error loading dashboard:', error);
            if (window.notificationService) window.notificationService.error('Error loading dashboard');
        }
    }
})();
