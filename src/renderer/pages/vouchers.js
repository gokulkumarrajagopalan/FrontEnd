(function () {
    const getVouchersTemplate = () => `
    <div id="vouchersPageContainer" class="space-y-6">
        <div class="page-header">
            <h2>Vouchers</h2>
            <p>Manage and track all financial transactions.</p>
        </div>

        <div class="page-actions justify-between">
            <div class="flex gap-3">
                <button id="addVoucherBtn" class="btn btn-primary">
                    <span class="mr-2">+</span> New Voucher
                </button>
                <div class="relative">
                    <input id="voucherSearch" placeholder="Search vouchers..." class="w-64 pl-9">
                    <span class="absolute left-3 top-2.5 text-gray-400">🔍</span>
                </div>
            </div>
            <div class="flex gap-2">
                <select id="voucherTypeFilter" class="w-40">
                    <option value="">All Types</option>
                    <option value="Sales">Sales</option>
                    <option value="Purchase">Purchase</option>
                    <option value="Payment">Payment</option>
                    <option value="Receipt">Receipt</option>
                </select>
                <button class="btn btn-secondary">Export</button>
            </div>
        </div>

        <div class="table-responsive">
            <table id="vouchersTable" class="table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Voucher No</th>
                        <th>Type</th>
                        <th>Party</th>
                        <th>Amount</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- Populated by JS -->
                </tbody>
            </table>
        </div>

        <!-- Modal -->
        <div id="voucherModal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50 backdrop-blur-sm">
            <div class="modal-content w-full max-w-2xl m-4 animate-[slideIn_0.2s_ease-out]">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                    <h3 class="text-lg font-bold text-gray-800" id="modalTitle">Create Voucher</h3>
                    <button class="close-btn text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                </div>

                <form id="voucherForm" class="p-6 space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Voucher Type</label>
                            <select id="voucherType" class="w-full" required>
                                <option value="Sales">Sales</option>
                                <option value="Purchase">Purchase</option>
                                <option value="Payment">Payment</option>
                                <option value="Receipt">Receipt</option>
                                <option value="Contra">Contra</option>
                                <option value="Journal">Journal</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Voucher Number</label>
                            <input type="text" id="voucherNumber" required>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Date</label>
                            <input type="date" id="voucherDate" required>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Amount</label>
                            <input type="number" id="voucherAmount" step="0.01" required>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">Party Name</label>
                        <input type="text" id="voucherParty" required>
                    </div>

                    <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">Narration</label>
                        <textarea id="voucherNarration" rows="3" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 transition-all"></textarea>
                    </div>

                    <div class="flex justify-end gap-3 pt-4 border-t border-gray-50">
                        <button type="button" id="cancelVoucherBtn" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Voucher</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;

    if (!window.API_BASE_URL) {
        window.API_BASE_URL = window.AppConfig ? window.AppConfig.API_BASE_URL : 'http://localhost:8080';
    }

    let allVouchers = [];

    function getAuthHeaders() {
        const token = localStorage.getItem('authToken');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    }

    async function loadVouchers() {
        try {
            console.log('Loading vouchers...');
            const response = await fetch(window.apiConfig.getUrl('/vouchers'), {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            allVouchers = Array.isArray(data) ? data : (data.data || []);

            console.log('Vouchers loaded:', allVouchers);
            renderVouchersTable(allVouchers);
        } catch (error) {
            console.error('Error loading vouchers:', error);
            const table = document.getElementById('vouchersTable');
            if (table) table.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">Error loading vouchers. Please refresh.</td></tr>';
        }
    }

    function renderVouchersTable(vouchers) {
        const tbody = document.querySelector('#vouchersTable tbody');
        if (!tbody) return;

        if (!Array.isArray(vouchers) || vouchers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">No vouchers found</td></tr>';
            return;
        }

        tbody.innerHTML = vouchers.map(voucher => `
            <tr>
                <td>${voucher.date ? new Date(voucher.date).toLocaleDateString() : 'N/A'}</td>
                <td>#${voucher.voucherNumber || voucher.id || voucher._id || 'N/A'}</td>
                <td><span class="type-badge">${(voucher.type || 'N/A').replace(/_/g, ' ')}</span></td>
                <td>${voucher.partyName || voucher.party || 'N/A'}</td>
                <td>₹${(voucher.amount || 0).toFixed(2)}</td>
                <td>
                    <button class="btn btn-small edit-btn" data-id="${voucher.id || voucher._id}">Edit</button>
                    <button class="btn btn-small delete-btn" data-id="${voucher.id || voucher._id}">Delete</button>
                </td>
            </tr>
        `).join('');

        attachRowHandlers();
    }

    function setupEventListeners() {
        const modal = document.getElementById('voucherModal');
        const addBtn = document.getElementById('addVoucherBtn');
        const cancelBtn = document.getElementById('cancelVoucherBtn');
        const closeBtn = document.querySelector('.close-btn');
        const form = document.getElementById('voucherForm');
        const searchInput = document.getElementById('voucherSearch');
        const typeFilter = document.getElementById('voucherTypeFilter');

        if (addBtn) {
            addBtn.addEventListener('click', () => {
                document.getElementById('modalTitle').textContent = 'Create Voucher';
                form.reset();
                delete modal.dataset.editId;
                const dateInput = document.getElementById('voucherDate');
                if (dateInput) dateInput.valueAsDate = new Date();
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            });
        }

        const closeModal = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        };

        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const voucherData = {
                    type: document.getElementById('voucherType').value,
                    voucherNumber: document.getElementById('voucherNumber').value,
                    date: document.getElementById('voucherDate').value,
                    amount: parseFloat(document.getElementById('voucherAmount').value) || 0,
                    partyName: document.getElementById('voucherParty').value,
                    narration: document.getElementById('voucherNarration').value
                };

                try {
                    let response;
                    if (modal.dataset.editId) {
                        // Edit
                        response = await fetch(window.apiConfig.getUrlWithId('/vouchers', modal.dataset.editId), {
                            method: 'PUT',
                            headers: getAuthHeaders(),
                            body: JSON.stringify(voucherData)
                        });
                    } else {
                        // Add
                        response = await fetch(window.apiConfig.getUrl('/vouchers'), {
                            method: 'POST',
                            headers: getAuthHeaders(),
                            body: JSON.stringify(voucherData)
                        });
                    }

                    if (response.ok) {
                        closeModal();
                        showSuccess('Voucher saved successfully');
                        await loadVouchers();
                    } else {
                        showError('Failed to save voucher');
                    }
                } catch (error) {
                    console.error('Error saving voucher:', error);
                    showError('Error saving voucher');
                }
            });
        }

        if (searchInput) searchInput.addEventListener('input', () => filterVouchers());
        if (typeFilter) typeFilter.addEventListener('change', () => filterVouchers());

        window.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    function attachRowHandlers() {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const voucher = allVouchers.find(v => (v.id || v._id) == id);
                if (voucher) openEditModal(voucher);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                if (confirm('Delete this voucher?')) {
                    try {
                        const response = await fetch(window.apiConfig.getUrlWithId('/vouchers', id), {
                            method: 'DELETE',
                            headers: getAuthHeaders()
                        });
                        if (response.ok) {
                            showSuccess('Voucher deleted successfully');
                            await loadVouchers();
                        } else {
                            showError('Failed to delete voucher');
                        }
                    } catch (error) {
                        console.error('Error deleting voucher:', error);
                        showError('Error deleting voucher');
                    }
                }
            });
        });
    }

    function openEditModal(voucher) {
        const modal = document.getElementById('voucherModal');
        const form = document.getElementById('voucherForm');

        document.getElementById('modalTitle').textContent = 'Edit Voucher';
        document.getElementById('voucherType').value = voucher.type || 'Sales';
        document.getElementById('voucherNumber').value = voucher.voucherNumber || '';
        document.getElementById('voucherDate').value = voucher.date ? new Date(voucher.date).toISOString().slice(0, 10) : '';
        document.getElementById('voucherAmount').value = voucher.amount || 0;
        document.getElementById('voucherParty').value = voucher.partyName || voucher.party || '';
        document.getElementById('voucherNarration').value = voucher.narration || '';

        modal.dataset.editId = voucher.id || voucher._id;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function filterVouchers() {
        const search = document.getElementById('voucherSearch')?.value.toLowerCase() || '';
        const type = document.getElementById('voucherTypeFilter')?.value || '';

        const filtered = allVouchers.filter(voucher => {
            const voucherId = (voucher.voucherNumber || voucher.id || voucher._id || '').toString().toLowerCase();
            const party = (voucher.partyName || voucher.party || '').toLowerCase();
            const matchesSearch = voucherId.includes(search) || party.includes(search);
            const matchesType = !type || voucher.type === type;
            return matchesSearch && matchesType;
        });

        renderVouchersTable(filtered);
    }

    function showError(message) {
        console.error(message);
        const alert = document.createElement('div');
        alert.className = 'fixed top-5 right-5 px-6 py-3 rounded shadow-lg z-50 text-white bg-red-500';
        alert.textContent = message;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 3000);
    }

    function showSuccess(message) {
        console.log(message);
        const alert = document.createElement('div');
        alert.className = 'fixed top-5 right-5 px-6 py-3 rounded shadow-lg z-50 text-white bg-green-500';
        alert.textContent = message;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 3000);
    }

    window.initializeVouchers = async function () {
        console.log('Initializing Vouchers Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getVouchersTemplate();
            await loadVouchers();
            setupEventListeners();
        }
    };
})();
