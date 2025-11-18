// Reports script
const API_BASE_URL = 'http://localhost:8080/api';

function initializeReports() {
    setupEventListeners();
}

function setupEventListeners() {
    document.querySelectorAll('.report-card').forEach(card => {
        const btn = card.querySelector('.btn');
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const reportType = card.getAttribute('data-report');
            await loadReport(reportType);
        });
    });
}

async function loadReport(reportType) {
    const reportContent = document.getElementById('reportContent');
    const reportsGrid = document.querySelector('.reports-grid');
    
    reportsGrid.style.display = 'none';
    reportContent.style.display = 'block';

    try {
        switch(reportType) {
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
        }
    } catch (error) {
        console.error('Error loading report:', error);
        reportContent.innerHTML = '<p>Error loading report</p>';
    }
}

async function loadTrialBalanceReport() {
    const reportContent = document.getElementById('reportContent');
    try {
        const ledgers = await fetch(`${API_BASE_URL}/ledgers`).then(r => r.json()).catch(() => []);
        
        let debitTotal = 0, creditTotal = 0;
        const rows = (ledgers || []).map(ledger => {
            const balance = ledger.closingBalance || 0;
            if (balance >= 0) debitTotal += balance;
            else creditTotal -= balance;
            
            return `
                <tr>
                    <td>${ledger.ledgerName}</td>
                    <td class="debit">₹${balance >= 0 ? balance.toFixed(2) : '-'}</td>
                    <td class="credit">₹${balance < 0 ? Math.abs(balance).toFixed(2) : '-'}</td>
                </tr>
            `;
        }).join('');

        reportContent.innerHTML = `
            <button class="back-btn" onclick="document.getElementById('page-content').scrollTop = 0; location.reload();">← Back to Reports</button>
            <div class="report-section">
                <h2>Trial Balance Report</h2>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Ledger Name</th>
                            <th style="text-align: right;">Debit (₹)</th>
                            <th style="text-align: right;">Credit (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                        <tr class="total-row">
                            <td>Total</td>
                            <td class="debit">₹${debitTotal.toFixed(2)}</td>
                            <td class="credit">₹${creditTotal.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        reportContent.innerHTML = '<p>Error loading trial balance report</p>';
    }
}

async function loadBalanceSheetReport() {
    const reportContent = document.getElementById('reportContent');
    try {
        const ledgers = await fetch(`${API_BASE_URL}/ledgers`).then(r => r.json()).catch(() => []);
        
        const assets = (ledgers || []).filter(l => l.groupType === 'ASSETS');
        const liabilities = (ledgers || []).filter(l => l.groupType === 'LIABILITIES');
        const equity = (ledgers || []).filter(l => l.groupType === 'EQUITY');

        const assetTotal = assets.reduce((sum, a) => sum + (a.closingBalance || 0), 0);
        const liabilityTotal = liabilities.reduce((sum, l) => sum + (l.closingBalance || 0), 0);
        const equityTotal = equity.reduce((sum, e) => sum + (e.closingBalance || 0), 0);

        reportContent.innerHTML = `
            <button class="back-btn" onclick="document.getElementById('page-content').scrollTop = 0; location.reload();">← Back to Reports</button>
            <div class="report-section">
                <h2>Balance Sheet Report</h2>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th colspan="2">Assets</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${assets.map(a => `<tr><td>${a.ledgerName}</td><td style="text-align: right;">₹${(a.closingBalance || 0).toFixed(2)}</td></tr>`).join('')}
                        <tr class="total-row">
                            <td>Total Assets</td>
                            <td style="text-align: right;">₹${assetTotal.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
                <table class="report-table" style="margin-top: 20px;">
                    <thead>
                        <tr>
                            <th colspan="2">Liabilities & Equity</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${liabilities.map(l => `<tr><td>${l.ledgerName}</td><td style="text-align: right;">₹${(l.closingBalance || 0).toFixed(2)}</td></tr>`).join('')}
                        ${equity.map(e => `<tr><td>${e.ledgerName}</td><td style="text-align: right;">₹${(e.closingBalance || 0).toFixed(2)}</td></tr>`).join('')}
                        <tr class="total-row">
                            <td>Total Liabilities & Equity</td>
                            <td style="text-align: right;">₹${(liabilityTotal + equityTotal).toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        reportContent.innerHTML = '<p>Error loading balance sheet report</p>';
    }
}

async function loadProfitLossReport() {
    const reportContent = document.getElementById('reportContent');
    try {
        const ledgers = await fetch(`${API_BASE_URL}/ledgers`).then(r => r.json()).catch(() => []);
        
        const income = (ledgers || []).filter(l => l.groupType === 'INCOME');
        const expense = (ledgers || []).filter(l => l.groupType === 'EXPENSE');

        const incomeTotal = income.reduce((sum, i) => sum + (i.closingBalance || 0), 0);
        const expenseTotal = expense.reduce((sum, e) => sum + (e.closingBalance || 0), 0);
        const netProfit = incomeTotal - expenseTotal;

        reportContent.innerHTML = `
            <button class="back-btn" onclick="document.getElementById('page-content').scrollTop = 0; location.reload();">← Back to Reports</button>
            <div class="report-section">
                <h2>Profit & Loss Report</h2>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th colspan="2">Income</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${income.map(i => `<tr><td>${i.ledgerName}</td><td style="text-align: right;">₹${(i.closingBalance || 0).toFixed(2)}</td></tr>`).join('')}
                        <tr class="total-row">
                            <td>Total Income</td>
                            <td style="text-align: right;">₹${incomeTotal.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
                <table class="report-table" style="margin-top: 20px;">
                    <thead>
                        <tr>
                            <th colspan="2">Expenses</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${expense.map(e => `<tr><td>${e.ledgerName}</td><td style="text-align: right;">₹${(e.closingBalance || 0).toFixed(2)}</td></tr>`).join('')}
                        <tr class="total-row">
                            <td>Total Expenses</td>
                            <td style="text-align: right;">₹${expenseTotal.toFixed(2)}</td>
                        </tr>
                        <tr class="total-row" style="background: ${netProfit >= 0 ? '#d4edda' : '#f8d7da'};">
                            <td>Net ${netProfit >= 0 ? 'Profit' : 'Loss'}</td>
                            <td style="text-align: right;">₹${netProfit.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        reportContent.innerHTML = '<p>Error loading profit & loss report</p>';
    }
}

async function loadLedgerSummaryReport() {
    const reportContent = document.getElementById('reportContent');
    try {
        const ledgers = await fetch(`${API_BASE_URL}/ledgers`).then(r => r.json()).catch(() => []);
        
        reportContent.innerHTML = `
            <button class="back-btn" onclick="document.getElementById('page-content').scrollTop = 0; location.reload();">← Back to Reports</button>
            <div class="report-section">
                <h2>Ledger Summary Report</h2>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Ledger Name</th>
                            <th>Group</th>
                            <th style="text-align: right;">Opening Balance</th>
                            <th style="text-align: right;">Closing Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(ledgers || []).map(l => `
                            <tr>
                                <td>${l.ledgerName}</td>
                                <td>${l.groupName}</td>
                                <td style="text-align: right;">₹${(l.openingBalance || 0).toFixed(2)}</td>
                                <td style="text-align: right;">₹${(l.closingBalance || 0).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        reportContent.innerHTML = '<p>Error loading ledger summary report</p>';
    }
}

async function loadInventoryReport() {
    const reportContent = document.getElementById('reportContent');
    try {
        const items = await fetch(`${API_BASE_URL}/items`).then(r => r.json()).catch(() => []);
        
        reportContent.innerHTML = `
            <button class="back-btn" onclick="document.getElementById('page-content').scrollTop = 0; location.reload();">← Back to Reports</button>
            <div class="report-section">
                <h2>Inventory Report</h2>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Item Name</th>
                            <th>Category</th>
                            <th>Unit</th>
                            <th style="text-align: right;">Opening Stock</th>
                            <th style="text-align: right;">Rate</th>
                            <th style="text-align: right;">Value</th>
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
                                    <td style="text-align: right;">${(i.openingStock || 0).toFixed(2)}</td>
                                    <td style="text-align: right;">₹${(i.rate || 0).toFixed(2)}</td>
                                    <td style="text-align: right;">₹${value.toFixed(2)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        reportContent.innerHTML = '<p>Error loading inventory report</p>';
    }
}

async function loadCashFlowReport() {
    const reportContent = document.getElementById('reportContent');
    reportContent.innerHTML = `
        <button class="back-btn" onclick="document.getElementById('page-content').scrollTop = 0; location.reload();">← Back to Reports</button>
        <div class="report-section">
            <h2>Cash Flow Report</h2>
            <p>Cash flow analysis based on bank and cash vouchers.</p>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th style="text-align: right;">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Cash Inflows</td>
                        <td style="text-align: right;">0.00</td>
                    </tr>
                    <tr>
                        <td>Cash Outflows</td>
                        <td style="text-align: right;">0.00</td>
                    </tr>
                    <tr class="total-row">
                        <td>Net Cash Flow</td>
                        <td style="text-align: right;">0.00</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}

initializeReports();
