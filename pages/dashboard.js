// Dashboard script
const API_BASE_URL = 'http://localhost:8080/api';

async function initializeDashboard() {
    try {
        // Fetch data from backend
        const [ledgers, vouchers] = await Promise.all([
            fetch(`${API_BASE_URL}/ledgers`).then(r => r.json()).catch(() => []),
            fetch(`${API_BASE_URL}/vouchers`).then(r => r.json()).catch(() => [])
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

        // Update stat cards
        document.getElementById('totalIncome').textContent = `₹${totalIncome.toFixed(2)}`;
        document.getElementById('totalExpense').textContent = `₹${totalExpense.toFixed(2)}`;
        document.getElementById('netBalance').textContent = `₹${netBalance.toFixed(2)}`;
        document.getElementById('totalItems').textContent = itemCount;

        // Load recent vouchers
        const vouchersTable = document.getElementById('recentVouchersTable');
        if (Array.isArray(vouchers) && vouchers.length > 0) {
            vouchersTable.innerHTML = vouchers.slice(0, 5).map(voucher => `
                <tr>
                    <td>#${voucher.id || 'N/A'}</td>
                    <td>${new Date(voucher.voucherDate).toLocaleDateString()}</td>
                    <td><span class="badge">${voucher.voucherType || 'N/A'}</span></td>
                    <td>₹${(voucher.totalAmount || 0).toFixed(2)}</td>
                    <td><span class="status-badge">${voucher.status || 'Active'}</span></td>
                </tr>
            `).join('');
        } else {
            vouchersTable.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">No vouchers found</td></tr>';
        }

        // Load top ledgers
        const ledgersTable = document.getElementById('topLedgersTable');
        if (Array.isArray(ledgers) && ledgers.length > 0) {
            ledgersTable.innerHTML = ledgers.slice(0, 5).map(ledger => `
                <tr>
                    <td>${ledger.ledgerName || 'N/A'}</td>
                    <td>${ledger.groupName || 'N/A'}</td>
                    <td>₹${(ledger.closingBalance || 0).toFixed(2)}</td>
                </tr>
            `).join('');
        } else {
            ledgersTable.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #999;">No ledgers found</td></tr>';
        }

    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Add styles
const style = document.createElement('style');
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

initializeDashboard();
