(function () {
    const getDashboardTemplate = () => {
        // Stats cards using Layout component
        const revenueCard = window.Layout.statsCard({
            icon: '💰',
            title: 'Total Revenue',
            value: '<span id="totalIncome">₹0</span>',
            change: '↑ 12% vs last month',
            changeType: 'positive'
        });

        const expensesCard = window.Layout.statsCard({
            icon: '💸',
            title: 'Expenses',
            value: '<span id="totalExpense">₹0</span>',
            change: '↑ 5% vs last month',
            changeType: 'negative'
        });

        const profitCard = window.Layout.statsCard({
            icon: '📈',
            title: 'Net Profit',
            value: '<span id="netBalance">₹0</span>',
            change: '↑ 8% vs last month',
            changeType: 'positive'
        });

        const invoicesCard = window.Layout.statsCard({
            icon: '⏳',
            title: 'Pending Invoices',
            value: '<span id="totalItems">0</span>',
            change: 'Needs Attention',
            changeType: 'neutral'
        });

        // Recent vouchers table
        const vouchersTable = window.UIComponents.card({
            title: '📝 Recent Vouchers',
            content: `
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Voucher #</th>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody id="recentVouchersTable">
                            <tr><td colspan="5" class="text-center py-8 text-gray-500">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            `
        });

        // Top ledgers table
        const ledgersTable = window.UIComponents.card({
            title: '💼 Top Ledgers',
            content: `
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Ledger Name</th>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Group</th>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Balance</th>
                            </tr>
                        </thead>
                        <tbody id="topLedgersTable">
                            <tr><td colspan="3" class="text-center py-8 text-gray-500">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            `
        });

        return window.Layout.page({
            title: 'Dashboard Overview',
            subtitle: 'Real-time financial insights and performance metrics',
            content: `
                ${window.Layout.grid({
                    columns: 4,
                    gap: 6,
                    items: [revenueCard, expensesCard, profitCard, invoicesCard],
                    className: 'mb-6'
                })}
                
                ${window.Layout.grid({
                    columns: 2,
                    gap: 6,
                    items: [vouchersTable, ledgersTable]
                })}
            `
        });
    };


    window.initializeDashboard = async function () {
        console.log('Initializing Dashboard...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getDashboardTemplate();
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
                        <tr class="hover:bg-gray-50 transition-colors">
                            <td class="px-4 py-3 text-gray-900">#${voucher.id || 'N/A'}</td>
                            <td class="px-4 py-3 text-gray-900">${new Date(voucher.voucherDate).toLocaleDateString()}</td>
                            <td class="px-4 py-3">${window.UIComponents.badge({
                                text: voucher.voucherType || 'N/A',
                                variant: 'primary',
                                size: 'sm'
                            })}</td>
                            <td class="px-4 py-3 text-gray-900 font-semibold">₹${(voucher.totalAmount || 0).toFixed(2)}</td>
                            <td class="px-4 py-3">${window.UIComponents.badge({
                                text: voucher.status || 'Active',
                                variant: 'success',
                                size: 'sm'
                            })}</td>
                        </tr>
                    `).join('');
                } else {
                    vouchersTable.innerHTML = `<tr><td colspan="5" class="text-center py-8">${window.UIComponents.emptyState({
                        icon: '📭',
                        title: 'No vouchers found',
                        message: 'No voucher data available at this time.'
                    })}</td></tr>`;
                }
            }

            // Load top ledgers
            const ledgersTable = document.getElementById('topLedgersTable');
            if (ledgersTable) {
                if (Array.isArray(ledgers) && ledgers.length > 0) {
                    ledgersTable.innerHTML = ledgers.slice(0, 5).map(ledger => `
                        <tr class="hover:bg-gray-50 transition-colors">
                            <td class="px-4 py-3 text-gray-900 font-medium">${ledger.ledgerName || 'N/A'}</td>
                            <td class="px-4 py-3 text-gray-600">${ledger.groupName || 'N/A'}</td>
                            <td class="px-4 py-3 text-gray-900 font-semibold">₹${(ledger.closingBalance || 0).toFixed(2)}</td>
                        </tr>
                    `).join('');
                } else {
                    ledgersTable.innerHTML = `<tr><td colspan="3" class="text-center py-8">${window.UIComponents.emptyState({
                        icon: '💼',
                        title: 'No ledgers found',
                        message: 'No ledger data available at this time.'
                    })}</td></tr>`;
                }
            }

        } catch (error) {
            console.error('Error loading dashboard:', error);
            if (window.notificationService) window.notificationService.error('Error loading dashboard');
        }
    }
})();

