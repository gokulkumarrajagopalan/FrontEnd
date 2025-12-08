(function () {
    const getTemplate = () => `
    <div id="mastersAccountsPageContainer" class="space-y-6">
        <div class="page-header flex justify-between items-center">
            <div>
                <h2>Chart of Accounts</h2>
                <p>Manage accounting master data</p>
            </div>
            <button id="addAccountBtn" class="btn btn-primary">+ New Account</button>
        </div>

        <div class="flex gap-4 mb-6">
            <input type="text" id="accountSearch" placeholder="Search by code, name..." class="flex-1 px-4 py-2 border border-gray-200 rounded-lg">
            <select id="accountTypeFilter" class="px-4 py-2 border border-gray-200 rounded-lg">
                <option value="">All Types</option>
                <option value="ASSET">Asset</option>
                <option value="LIABILITY">Liability</option>
                <option value="EQUITY">Equity</option>
                <option value="REVENUE">Revenue</option>
                <option value="EXPENSE">Expense</option>
            </select>
        </div>

        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Opening Balance</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="accountsTableBody">
                    <!-- Populated by JS -->
                </tbody>
            </table>
        </div>
        
        <!-- Add/Edit Modal -->
        <div id="accountModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="accountModalTitle">Add Account</h3>
                    <span class="close-btn" id="closeAccountModal">&times;</span>
                </div>
                <form id="accountForm">
                    <div class="form-group">
                        <label>Account Code *</label>
                        <input type="text" id="accountCode" required placeholder="e.g., 1001">
                    </div>
                    <div class="form-group">
                        <label>Account Name *</label>
                        <input type="text" id="accountName" required placeholder="e.g., Cash">
                    </div>
                    <div class="form-group">
                        <label>Account Type *</label>
                        <select id="accountType" required>
                            <option value="">Select Type</option>
                            <option value="ASSET">Asset</option>
                            <option value="LIABILITY">Liability</option>
                            <option value="EQUITY">Equity</option>
                            <option value="REVENUE">Revenue</option>
                            <option value="EXPENSE">Expense</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Opening Balance</label>
                        <input type="number" id="openingBalance" step="0.01" value="0">
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="accountDescription" placeholder="Enter description"></textarea>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="cancelAccountBtn">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Account</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;

    if (!window.API_BASE_URL) {
        window.API_BASE_URL = window.AppConfig ? window.AppConfig.API_BASE_URL : 'http://localhost:8080';
    }

    class ChartOfAccountsPage {
        constructor() {
            this.accounts = [];
            this.currentEditId = null;
            this.initializePage();
        }

        initializePage() {
            this.loadAccounts();
            this.setupEventListeners();
        }

        async loadAccounts() {
            try {
                const response = await fetch(`${window.API_BASE_URL}/masters/accounts`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                });
                if (response.ok) {
                    this.accounts = await response.json();
                    this.renderTable();
                } else {
                    if (window.notificationService) window.notificationService.error('Failed to load accounts');
                }
            } catch (error) {
                console.error(error);
                if (window.notificationService) window.notificationService.error('Error loading accounts');
            }
        }

        renderTable() {
            const tbody = document.getElementById('accountsTableBody');
            if (!tbody) return;

            tbody.innerHTML = this.accounts.map(account => `
                <tr>
                    <td>${account.code || 'N/A'}</td>
                    <td>${account.name || 'N/A'}</td>
                    <td><span class="badge">${account.type || 'N/A'}</span></td>
                    <td>${this.formatCurrency(account.openingBalance)}</td>
                    <td><span class="status-badge ${account.active ? 'active' : 'inactive'}">${account.active ? 'Active' : 'Inactive'}</span></td>
                    <td class="actions">
                        <button class="btn btn-small edit-btn" data-id="${account.id}">Edit</button>
                        <button class="btn btn-small delete-btn" data-id="${account.id}">Delete</button>
                    </td>
                </tr>
            `).join('');

            this.attachRowHandlers();
        }

        attachRowHandlers() {
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    const account = this.accounts.find(a => a.id == id);
                    if (account) this.openEditModal(account);
                });
            });

            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    if (confirm('Are you sure you want to delete this account?')) {
                        this.deleteAccount(id);
                    }
                });
            });
        }

        setupEventListeners() {
            const addBtn = document.getElementById('addAccountBtn');
            if (addBtn) addBtn.addEventListener('click', () => this.openAddModal());

            const form = document.getElementById('accountForm');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveAccount();
                });
            }

            const closeBtn = document.getElementById('closeAccountModal');
            if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());

            const cancelBtn = document.getElementById('cancelAccountBtn');
            if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());

            const searchInput = document.getElementById('accountSearch');
            if (searchInput) searchInput.addEventListener('input', () => this.filterAccounts());

            const typeFilter = document.getElementById('accountTypeFilter');
            if (typeFilter) typeFilter.addEventListener('change', () => this.filterAccounts());
        }

        openAddModal() {
            this.currentEditId = null;
            document.getElementById('accountForm').reset();
            document.getElementById('accountModalTitle').textContent = 'Add New Account';
            document.getElementById('accountModal').classList.add('active');
        }

        openEditModal(account) {
            this.currentEditId = account.id;
            document.getElementById('accountCode').value = account.code;
            document.getElementById('accountName').value = account.name;
            document.getElementById('accountType').value = account.type;
            document.getElementById('openingBalance').value = account.openingBalance;
            document.getElementById('accountDescription').value = account.description || '';
            document.getElementById('accountModalTitle').textContent = 'Edit Account';
            document.getElementById('accountModal').classList.add('active');
        }

        async saveAccount() {
            const formData = {
                code: document.getElementById('accountCode').value,
                name: document.getElementById('accountName').value,
                type: document.getElementById('accountType').value,
                openingBalance: parseFloat(document.getElementById('openingBalance').value) || 0,
                description: document.getElementById('accountDescription').value
            };

            try {
                const method = this.currentEditId ? 'PUT' : 'POST';
                const url = this.currentEditId
                    ? `${window.API_BASE_URL}/masters/accounts/${this.currentEditId}`
                    : `${window.API_BASE_URL}/masters/accounts`;

                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify(formData)
                });

                if (response.ok) {
                    if (window.notificationService) window.notificationService.success('Account saved successfully');
                    this.closeModal();
                    this.loadAccounts();
                } else {
                    const error = await response.json();
                    if (window.notificationService) window.notificationService.error(error.message || 'Failed to save account');
                }
            } catch (error) {
                if (window.notificationService) window.notificationService.error('Error: ' + error.message);
            }
        }

        async deleteAccount(id) {
            try {
                const response = await fetch(`${window.API_BASE_URL}/masters/accounts/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                });
                if (response.ok) {
                    if (window.notificationService) window.notificationService.success('Account deleted successfully');
                    await this.loadAccounts();
                } else {
                    if (window.notificationService) window.notificationService.error('Failed to delete account');
                }
            } catch (error) {
                if (window.notificationService) window.notificationService.error('Error deleting account');
            }
        }

        filterAccounts() {
            const searchText = document.getElementById('accountSearch').value.toLowerCase();
            const typeFilter = document.getElementById('accountTypeFilter').value;

            const filtered = this.accounts.filter(acc => {
                const matchesSearch = acc.code.toLowerCase().includes(searchText) ||
                    acc.name.toLowerCase().includes(searchText);
                const matchesType = !typeFilter || acc.type === typeFilter;
                return matchesSearch && matchesType;
            });

            const tbody = document.getElementById('accountsTableBody');
            tbody.innerHTML = filtered.map(account => `
                <tr>
                    <td>${account.code}</td>
                    <td>${account.name}</td>
                    <td><span class="badge">${account.type}</span></td>
                    <td>${this.formatCurrency(account.openingBalance)}</td>
                    <td><span class="status-badge ${account.active ? 'active' : 'inactive'}">${account.active ? 'Active' : 'Inactive'}</span></td>
                    <td class="actions">
                        <button class="btn btn-small edit-btn" data-id="${account.id}">Edit</button>
                        <button class="btn btn-small delete-btn" data-id="${account.id}">Delete</button>
                    </td>
                </tr>
            `).join('');

            this.attachRowHandlers();
        }

        closeModal() {
            document.getElementById('accountModal').classList.remove('active');
            this.currentEditId = null;
        }

        formatCurrency(value) {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(value || 0);
        }
    }

    window.initializeMastersAccounts = function () {
        console.log('Initializing Masters Accounts Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getTemplate();
            new ChartOfAccountsPage();
        }
    };
})();
