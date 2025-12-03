(function () {
    const getReportsTemplate = () => `
    <div id="reportsPageContainer" class="space-y-8 max-w-7xl mx-auto">
        <div class="page-header flex justify-between items-end">
            <div>
                <h2 class="text-2xl font-bold text-gray-800 tracking-tight">Financial Reports</h2>
                <p class="text-gray-500 mt-1">Comprehensive financial statements and analysis</p>
            </div>
            <div class="flex gap-2">
                <button class="btn btn-secondary text-sm" onclick="window.print()">
                    <span>🖨️ Print</span>
                </button>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 reports-grid">
            <div class="card p-6 hover:shadow-float transition-all cursor-pointer report-card group" data-report="trial-balance">
                <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">⚖️</div>
                <h3 class="font-bold text-lg text-gray-800 mb-2">Trial Balance</h3>
                <p class="text-sm text-gray-500">View closing balances of all ledgers to ensure accounting accuracy.</p>
            </div>
            <div class="card p-6 hover:shadow-float transition-all cursor-pointer report-card group" data-report="balance-sheet">
                <div class="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">💰</div>
                <h3 class="font-bold text-lg text-gray-800 mb-2">Balance Sheet</h3>
                <p class="text-sm text-gray-500">Snapshot of assets, liabilities, and equity at a specific point in time.</p>
            </div>
            <div class="card p-6 hover:shadow-float transition-all cursor-pointer report-card group" data-report="profit-loss">
                <div class="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">📉</div>
                <h3 class="font-bold text-lg text-gray-800 mb-2">Profit & Loss</h3>
                <p class="text-sm text-gray-500">Summary of revenues, costs, and expenses during a specific period.</p>
            </div>
            <div class="card p-6 hover:shadow-float transition-all cursor-pointer report-card group" data-report="ledger-summary">
                <div class="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">📋</div>
                <h3 class="font-bold text-lg text-gray-800 mb-2">Ledger Summary</h3>
                <p class="text-sm text-gray-500">Detailed transaction history and balances for individual ledgers.</p>
            </div>
            <div class="card p-6 hover:shadow-float transition-all cursor-pointer report-card group" data-report="inventory">
                <div class="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">📦</div>
                <h3 class="font-bold text-lg text-gray-800 mb-2">Inventory Report</h3>
                <p class="text-sm text-gray-500">Track stock levels, valuation, and movement of inventory items.</p>
            </div>
             <div class="card p-6 hover:shadow-float transition-all cursor-pointer report-card group" data-report="cash-flow">
                <div class="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">💸</div>
                <h3 class="font-bold text-lg text-gray-800 mb-2">Cash Flow</h3>
                <p class="text-sm text-gray-500">Analysis of cash inflows and outflows from operating activities.</p>
            </div>
        </div>

        <div id="reportContent" class="hidden space-y-6">
            <div class="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div class="flex items-center gap-4">
                    <button id="closeReportBtn" class="btn btn-secondary btn-small">
                        ← Back
                    </button>
                    <h3 id="reportTitle" class="font-bold text-xl text-gray-800">Report View</h3>
                </div>
                <div class="flex gap-2">
                    <button class="btn btn-secondary btn-small">Export PDF</button>
                    <button class="btn btn-primary btn-small">Export Excel</button>
                </div>
            </div>
            <div class="card overflow-hidden">
                <div class="table-responsive">
                    <div id="reportDataContainer" class="p-6">
                        <!-- Dynamic Content -->
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    if (!window.API_BASE_URL) {
        window.API_BASE_URL = window.AppConfig ? window.AppConfig.API_BASE_URL : 'http://localhost:8080/api';
    }

    function getAuthHeaders() {
        const token = localStorage.getItem('authToken');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    }

    async function loadReport(reportType) {
        const reportContent = document.getElementById('reportContent');
        const reportsGrid = document.querySelector('.reports-grid');
        const reportDataContainer = document.getElementById('reportDataContainer');

        if (reportsGrid) reportsGrid.style.display = 'none';
        if (reportContent) reportContent.style.display = 'block';
        if (reportDataContainer) reportDataContainer.innerHTML = '<div class="p-4 text-center">Loading...</div>';

        try {
            switch (reportType) {
                case 'trial-balance':
                    await loadTrialBalanceReport();
                    break;
                case 'balance-sheet':
                    await loadBalanceSheetReport();
                    break;
                case 'profit-loss':
                    await loadProfitLossReport();
                    break;
                case 'ledger-summary':
                    await loadLedgerSummaryReport();
                    break;
                case 'inventory':
                    await loadInventoryReport();
                    break;
                case 'cash-flow':
                    await loadCashFlowReport();
                    break;
                default:
                    if (reportDataContainer) reportDataContainer.innerHTML = '<p>Unknown report type</p>';
            }
        } catch (error) {
            console.error('Error loading report:', error);
            if (reportDataContainer) reportDataContainer.innerHTML = '<p class="text-red-500 p-4">Error loading report. Please try again.</p>';
            if (window.notificationService) window.notificationService.error('Failed to load report');
        }
    }

    async function loadTrialBalanceReport() {
        const reportDataContainer = document.getElementById('reportDataContainer');
        const response = await fetch(`${window.API_BASE_URL}/ledgers`, { headers: getAuthHeaders() });
        const ledgers = await response.json();

        let debitTotal = 0, creditTotal = 0;
        const rows = (ledgers || []).map(ledger => {
            const balance = ledger.closingBalance || 0;
            if (balance >= 0) debitTotal += balance;
            else creditTotal -= balance;

            return `
                <tr>
                    <td>${ledger.ledgerName}</td>
                    <td class="debit text-right">₹${balance >= 0 ? balance.toFixed(2) : '-'}</td>
                    <td class="credit text-right">₹${balance < 0 ? Math.abs(balance).toFixed(2) : '-'}</td>
                </tr>
            `;
        }).join('');

        reportDataContainer.innerHTML = `
            <div class="report-section">
                <h2 class="text-xl font-bold mb-4">Trial Balance Report</h2>
                <table class="table w-full">
                    <thead>
                        <tr>
                            <th>Ledger Name</th>
                            <th class="text-right">Debit (₹)</th>
                            <th class="text-right">Credit (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                        <tr class="total-row font-bold bg-gray-50">
                            <td>Total</td>
                            <td class="debit text-right">₹${debitTotal.toFixed(2)}</td>
                            <td class="credit text-right">₹${creditTotal.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    async function loadBalanceSheetReport() {
        const reportDataContainer = document.getElementById('reportDataContainer');
        const response = await fetch(`${window.API_BASE_URL}/ledgers`, { headers: getAuthHeaders() });
        const ledgers = await response.json();

        const assets = (ledgers || []).filter(l => l.groupType === 'ASSETS');
        const liabilities = (ledgers || []).filter(l => l.groupType === 'LIABILITIES');
        const equity = (ledgers || []).filter(l => l.groupType === 'EQUITY');

        const assetTotal = assets.reduce((sum, a) => sum + (a.closingBalance || 0), 0);
        const liabilityTotal = liabilities.reduce((sum, l) => sum + (l.closingBalance || 0), 0);
        const equityTotal = equity.reduce((sum, e) => sum + (e.closingBalance || 0), 0);

        reportDataContainer.innerHTML = `
            <div class="report-section space-y-8">
                <h2 class="text-xl font-bold mb-4">Balance Sheet Report</h2>
                
                <div>
                    <h3 class="font-bold mb-2">Assets</h3>
                    <table class="table w-full">
                        <tbody>
                            ${assets.map(a => `<tr><td>${a.ledgerName}</td><td class="text-right">₹${(a.closingBalance || 0).toFixed(2)}</td></tr>`).join('')}
                            <tr class="total-row font-bold bg-gray-50">
                                <td>Total Assets</td>
                                <td class="text-right">₹${assetTotal.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div>
                    <h3 class="font-bold mb-2">Liabilities & Equity</h3>
                    <table class="table w-full">
                        <tbody>
                            ${liabilities.map(l => `<tr><td>${l.ledgerName}</td><td class="text-right">₹${(l.closingBalance || 0).toFixed(2)}</td></tr>`).join('')}
                            ${equity.map(e => `<tr><td>${e.ledgerName}</td><td class="text-right">₹${(e.closingBalance || 0).toFixed(2)}</td></tr>`).join('')}
                            <tr class="total-row font-bold bg-gray-50">
                                <td>Total Liabilities & Equity</td>
                                <td class="text-right">₹${(liabilityTotal + equityTotal).toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async function loadProfitLossReport() {
        const reportDataContainer = document.getElementById('reportDataContainer');
        const response = await fetch(`${window.API_BASE_URL}/ledgers`, { headers: getAuthHeaders() });
        const ledgers = await response.json();

        const income = (ledgers || []).filter(l => l.groupType === 'INCOME');
        const expense = (ledgers || []).filter(l => l.groupType === 'EXPENSE');

        const incomeTotal = income.reduce((sum, i) => sum + (i.closingBalance || 0), 0);
        const expenseTotal = expense.reduce((sum, e) => sum + (e.closingBalance || 0), 0);
        const netProfit = incomeTotal - expenseTotal;

        reportDataContainer.innerHTML = `
            <div class="report-section space-y-8">
                <h2 class="text-xl font-bold mb-4">Profit & Loss Report</h2>
                
                <div>
                    <h3 class="font-bold mb-2">Income</h3>
                    <table class="table w-full">
                        <tbody>
                            ${income.map(i => `<tr><td>${i.ledgerName}</td><td class="text-right">₹${(i.closingBalance || 0).toFixed(2)}</td></tr>`).join('')}
                            <tr class="total-row font-bold bg-gray-50">
                                <td>Total Income</td>
                                <td class="text-right">₹${incomeTotal.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div>
                    <h3 class="font-bold mb-2">Expenses</h3>
                    <table class="table w-full">
                        <tbody>
                            ${expense.map(e => `<tr><td>${e.ledgerName}</td><td class="text-right">₹${(e.closingBalance || 0).toFixed(2)}</td></tr>`).join('')}
                            <tr class="total-row font-bold bg-gray-50">
                                <td>Total Expenses</td>
                                <td class="text-right">₹${expenseTotal.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="p-4 rounded-lg ${netProfit >= 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'} font-bold text-lg flex justify-between">
                    <span>Net ${netProfit >= 0 ? 'Profit' : 'Loss'}</span>
                    <span>₹${netProfit.toFixed(2)}</span>
                </div>
            </div>
        `;
    }

    async function loadLedgerSummaryReport() {
        const reportDataContainer = document.getElementById('reportDataContainer');
        const response = await fetch(`${window.API_BASE_URL}/ledgers`, { headers: getAuthHeaders() });
        const ledgers = await response.json();

        reportDataContainer.innerHTML = `
            <div class="report-section">
                <h2 class="text-xl font-bold mb-4">Ledger Summary Report</h2>
                <table class="table w-full">
                    <thead>
                        <tr>
                            <th>Ledger Name</th>
                            <th>Group</th>
                            <th class="text-right">Opening Balance</th>
                            <th class="text-right">Closing Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(ledgers || []).map(l => `
                            <tr>
                                <td>${l.ledgerName}</td>
                                <td>${l.groupName || '-'}</td>
                                <td class="text-right">₹${(l.openingBalance || 0).toFixed(2)}</td>
                                <td class="text-right">₹${(l.closingBalance || 0).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async function loadInventoryReport() {
        const reportDataContainer = document.getElementById('reportDataContainer');
        const response = await fetch(`${window.API_BASE_URL}/items`, { headers: getAuthHeaders() });
        const items = await response.json();

        reportDataContainer.innerHTML = `
            <div class="report-section">
                <h2 class="text-xl font-bold mb-4">Inventory Report</h2>
                <table class="table w-full">
                    <thead>
                        <tr>
                            <th>Item Name</th>
                            <th>Category</th>
                            <th>Unit</th>
                            <th class="text-right">Stock</th>
                            <th class="text-right">Rate</th>
                            <th class="text-right">Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(items || []).map(i => {
            const value = (i.openingStock || 0) * (i.rate || 0);
            return `
                                <tr>
                                    <td>${i.itemName}</td>
                                    <td>${i.category || '-'}</td>
                                    <td>${i.unit}</td>
                                    <td class="text-right">${(i.openingStock || 0).toFixed(2)}</td>
                                    <td class="text-right">₹${(i.rate || 0).toFixed(2)}</td>
                                    <td class="text-right">₹${value.toFixed(2)}</td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async function loadCashFlowReport() {
        const reportDataContainer = document.getElementById('reportDataContainer');
        // Placeholder for Cash Flow
        reportDataContainer.innerHTML = `
            <div class="report-section">
                <h2 class="text-xl font-bold mb-4">Cash Flow Report</h2>
                <p class="mb-4 text-gray-600">Cash flow analysis based on bank and cash vouchers.</p>
                <table class="table w-full">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th class="text-right">Amount (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Cash Inflows</td>
                            <td class="text-right">0.00</td>
                        </tr>
                        <tr>
                            <td>Cash Outflows</td>
                            <td class="text-right">0.00</td>
                        </tr>
                        <tr class="total-row font-bold bg-gray-50">
                            <td>Net Cash Flow</td>
                            <td class="text-right">0.00</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    function setupEventListeners() {
        document.querySelectorAll('.report-card').forEach(card => {
            card.addEventListener('click', () => {
                const reportType = card.dataset.report;
                loadReport(reportType);
            });
        });

        const closeBtn = document.getElementById('closeReportBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                const reportContent = document.getElementById('reportContent');
                const reportsGrid = document.querySelector('.reports-grid');
                if (reportContent) reportContent.style.display = 'none';
                if (reportsGrid) reportsGrid.style.display = 'grid';
            });
        }
    }

    window.initializeReports = function () {
        console.log('Initializing Reports Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getReportsTemplate();
            setupEventListeners();
        }
    };
})();
