(function () {
    const getInvoicesTemplate = () => `
    <div id="invoicesPageContainer" class="space-y-6">
        <div class="page-header">
            <h2>Invoice Management</h2>
            <p>Create, view and manage invoices.</p>
        </div>

        <div class="page-actions justify-between">
            <div class="flex gap-3">
                <button id="addInvoiceBtn" class="btn btn-primary">
                    <span class="mr-2">+</span> Create Invoice
                </button>
                <div class="relative">
                    <input id="invoiceSearch" placeholder="Search invoices..." class="w-64 pl-9">
                    <span class="absolute left-3 top-2.5 text-gray-400">🔍</span>
                </div>
            </div>
        </div>

        <div class="table-responsive">
            <table id="invoicesTable" class="table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- Populated by JS -->
                </tbody>
            </table>
        </div>

        <!-- Modal -->
        <div id="invoiceModal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50 backdrop-blur-sm">
            <div class="modal-content w-full max-w-lg m-4 animate-[slideIn_0.2s_ease-out]">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                    <h3 id="modalTitle" class="text-lg font-bold text-gray-800">Create Invoice</h3>
                    <button class="close-btn text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                </div>
                <form id="invoiceForm" class="p-6 space-y-4">
                    <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">Customer</label>
                        <input id="invoiceCustomer" class="w-full px-3 py-2 border border-gray-200 rounded-lg" required>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Date</label>
                            <input id="invoiceDate" type="date" class="w-full px-3 py-2 border border-gray-200 rounded-lg" required>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Amount</label>
                            <input id="invoiceAmount" type="number" step="0.01" class="w-full px-3 py-2 border border-gray-200 rounded-lg" required>
                        </div>
                    </div>
                    <div class="flex justify-end gap-3 pt-4 border-t border-gray-50">
                        <button type="button" id="cancelInvoiceBtn" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;

    if (!window.API_BASE_URL) {
        window.API_BASE_URL = window.AppConfig ? window.AppConfig.API_BASE_URL : 'http://localhost:8080/api';
    }

    let allInvoices = [];

    function getAuthHeaders() {
        const token = localStorage.getItem('authToken');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    }

    async function loadInvoices() {
        try {
            console.log('Loading invoices...');
            const response = await fetch(`${window.API_BASE_URL}/invoices`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            allInvoices = Array.isArray(data) ? data : (data.data || []);
            renderInvoicesTable(allInvoices);
        } catch (error) {
            console.error('Error loading invoices:', error);
            const tbody = document.querySelector('#invoicesTable tbody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">Error loading invoices</td></tr>';
            if (window.notificationService) window.notificationService.error('Failed to load invoices');
        }
    }

    function renderInvoicesTable(invoices) {
        const tbody = document.querySelector('#invoicesTable tbody');
        if (!tbody) return;

        if (!Array.isArray(invoices) || invoices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">No invoices found</td></tr>';
            return;
        }

        tbody.innerHTML = invoices.map(inv => `
            <tr>
                <td>#${inv.id || inv._id || 'N/A'}</td>
                <td>${inv.date ? new Date(inv.date).toLocaleDateString() : 'N/A'}</td>
                <td>${inv.customer || inv.party || 'N/A'}</td>
                <td>₹${(inv.amount || 0).toFixed(2)}</td>
                <td><span class="status-badge">${inv.status || 'Draft'}</span></td>
                <td>
                    <button class="btn btn-small edit-btn" data-id="${inv.id || inv._id}">Edit</button>
                    <button class="btn btn-small delete-btn" data-id="${inv.id || inv._id}">Delete</button>
                </td>
            </tr>
        `).join('');

        attachRowHandlers();
    }

    function setupEventListeners() {
        const modal = document.getElementById('invoiceModal');
        const addBtn = document.getElementById('addInvoiceBtn');
        const cancelBtn = document.getElementById('cancelInvoiceBtn');
        const closeBtn = document.querySelector('.close-btn');
        const form = document.getElementById('invoiceForm');
        const searchInput = document.getElementById('invoiceSearch');

        if (addBtn) {
            addBtn.addEventListener('click', () => {
                document.getElementById('modalTitle').textContent = 'Create Invoice';
                form.reset();
                delete modal.dataset.editId;
                const dateInput = document.getElementById('invoiceDate');
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
                const invoiceData = {
                    customer: document.getElementById('invoiceCustomer').value,
                    date: document.getElementById('invoiceDate').value,
                    amount: parseFloat(document.getElementById('invoiceAmount').value) || 0
                };

                try {
                    let response;
                    if (modal.dataset.editId) {
                        // Edit
                        response = await fetch(`${window.API_BASE_URL}/invoices/${modal.dataset.editId}`, {
                            method: 'PUT',
                            headers: getAuthHeaders(),
                            body: JSON.stringify(invoiceData)
                        });
                    } else {
                        // Add
                        response = await fetch(`${window.API_BASE_URL}/invoices`, {
                            method: 'POST',
                            headers: getAuthHeaders(),
                            body: JSON.stringify(invoiceData)
                        });
                    }

                    if (response.ok) {
                        closeModal();
                        if (window.notificationService) window.notificationService.success('Invoice saved successfully');
                        await loadInvoices();
                    } else {
                        if (window.notificationService) window.notificationService.error('Failed to save invoice');
                    }
                } catch (error) {
                    console.error('Error saving invoice:', error);
                    if (window.notificationService) window.notificationService.error('Error saving invoice');
                }
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const query = searchInput.value.toLowerCase();
                const filtered = allInvoices.filter(inv =>
                    (inv.customer || '').toLowerCase().includes(query) ||
                    (inv.id || '').toString().includes(query)
                );
                renderInvoicesTable(filtered);
            });
        }

        window.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    function attachRowHandlers() {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const inv = allInvoices.find(i => (i.id || i._id) == id);
                if (inv) openEditModal(inv);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                if (confirm('Delete this invoice?')) {
                    try {
                        const response = await fetch(`${window.API_BASE_URL}/invoices/${id}`, {
                            method: 'DELETE',
                            headers: getAuthHeaders()
                        });
                        if (response.ok) {
                            if (window.notificationService) window.notificationService.success('Invoice deleted successfully');
                            await loadInvoices();
                        } else {
                            if (window.notificationService) window.notificationService.error('Failed to delete invoice');
                        }
                    } catch (error) {
                        console.error('Error deleting invoice:', error);
                        if (window.notificationService) window.notificationService.error('Error deleting invoice');
                    }
                }
            });
        });
    }

    function openEditModal(inv) {
        const modal = document.getElementById('invoiceModal');
        document.getElementById('modalTitle').textContent = 'Edit Invoice';
        document.getElementById('invoiceCustomer').value = inv.customer || '';
        document.getElementById('invoiceDate').value = inv.date ? new Date(inv.date).toISOString().slice(0, 10) : '';
        document.getElementById('invoiceAmount').value = inv.amount || 0;

        modal.dataset.editId = inv.id || inv._id;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    window.initializeInvoices = async function () {
        console.log('Initializing Invoices Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getInvoicesTemplate();
            await loadInvoices();
            setupEventListeners();
        }
    };
})();
