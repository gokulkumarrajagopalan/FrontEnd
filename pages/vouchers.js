// Vouchers script
const API_BASE_URL = 'http://localhost:8080/api';
let allVouchers = [];

async function initializeVouchers() {
    try {
        // Set today's date as default
        document.getElementById('voucherDate').valueAsDate = new Date();
        
        await loadVouchers();
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing vouchers:', error);
    }
}

async function loadVouchers() {
    try {
        const response = await fetch(`${API_BASE_URL}/vouchers`);
        allVouchers = await response.json() || [];
        renderVouchersTable(allVouchers);
    } catch (error) {
        console.error('Error loading vouchers:', error);
        document.getElementById('vouchersTable').innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">Error loading vouchers</td></tr>';
    }
}

function renderVouchersTable(vouchers) {
    const table = document.getElementById('vouchersTable');
    if (!Array.isArray(vouchers) || vouchers.length === 0) {
        table.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">No vouchers found</td></tr>';
        return;
    }

    table.innerHTML = vouchers.map(voucher => `
        <tr>
            <td>#${voucher.id || 'N/A'}</td>
            <td>${new Date(voucher.voucherDate).toLocaleDateString()}</td>
            <td><span class="type-badge">${(voucher.voucherType || 'N/A').replace(/_/g, ' ')}</span></td>
            <td>₹${(voucher.totalAmount || 0).toFixed(2)}</td>
            <td><span class="status-badge">${voucher.status || 'Active'}</span></td>
            <td>
                <button class="btn btn-small edit-btn" data-id="${voucher.id}">Edit</button>
                <button class="btn btn-small delete-btn" data-id="${voucher.id}">Delete</button>
            </td>
        </tr>
    `).join('');

    attachRowHandlers();
}

function setupEventListeners() {
    const modal = document.getElementById('voucherModal');
    const addBtn = document.getElementById('addVoucherBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const closeBtn = document.querySelector('.close-btn');
    const form = document.getElementById('voucherForm');
    const searchInput = document.getElementById('voucherSearch');
    const typeFilter = document.getElementById('typeFilter');

    addBtn.addEventListener('click', () => {
        document.getElementById('modalTitle').textContent = 'Create Voucher';
        document.getElementById('voucherForm').reset();
        document.getElementById('voucherDate').valueAsDate = new Date();
        modal.classList.add('active');
    });

    cancelBtn.addEventListener('click', () => modal.classList.remove('active'));
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const voucherData = {
            voucherType: document.getElementById('voucherType').value,
            voucherDate: document.getElementById('voucherDate').value,
            totalAmount: parseFloat(document.getElementById('totalAmount').value) || 0,
            narration: document.getElementById('narration').value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/vouchers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(voucherData)
            });

            if (response.ok) {
                modal.classList.remove('active');
                await loadVouchers();
            }
        } catch (error) {
            console.error('Error saving voucher:', error);
        }
    });

    searchInput.addEventListener('input', () => filterVouchers());
    typeFilter.addEventListener('change', () => filterVouchers());

    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
}

function attachRowHandlers() {
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this voucher?')) {
                try {
                    await fetch(`${API_BASE_URL}/vouchers/${id}`, { method: 'DELETE' });
                    await loadVouchers();
                } catch (error) {
                    console.error('Error deleting voucher:', error);
                }
            }
        });
    });
}

function filterVouchers() {
    const search = document.getElementById('voucherSearch').value.toLowerCase();
    const type = document.getElementById('typeFilter').value;

    const filtered = allVouchers.filter(voucher => {
        const matchesSearch = voucher.id.toString().includes(search) || 
                            (voucher.narration && voucher.narration.toLowerCase().includes(search));
        const matchesType = !type || voucher.voucherType === type;
        return matchesSearch && matchesType;
    });

    renderVouchersTable(filtered);
}

initializeVouchers();
