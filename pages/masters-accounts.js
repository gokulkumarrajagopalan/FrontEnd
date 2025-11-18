/**
 * Chart of Accounts - Master Screen
 * Manage accounting master data
 */

const API_BASE_URL = 'http://localhost:8080/api';

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
            const response = await fetch(`${API_BASE_URL}/masters/accounts`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            if (response.ok) {
                this.accounts = await response.json();
                this.renderTable();
            } else {
                console.error('Failed to load accounts');
                this.showAlert('Failed to load accounts', 'error');
            }
        } catch (error) {
            console.error('Error loading accounts:', error);
            this.showAlert('Error loading accounts: ' + error.message, 'error');
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
                <td>${this.formatCurrency(account.currentBalance)}</td>
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
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openAddModal());
        }

        const form = document.getElementById('accountForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveAccount();
            });
        }

        const closeBtn = document.getElementById('closeAccountModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        const cancelBtn = document.getElementById('cancelAccountBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }

        // Search functionality
        const searchInput = document.getElementById('accountSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterAccounts());
        }

        // Type filter
        const typeFilter = document.getElementById('accountTypeFilter');
        if (typeFilter) {
            typeFilter.addEventListener('change', () => this.filterAccounts());
        }
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
                ? `${API_BASE_URL}/masters/accounts/${this.currentEditId}`
                : `${API_BASE_URL}/masters/accounts`;

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                this.showAlert('Account saved successfully', 'success');
                this.closeModal();
                this.loadAccounts();
            } else {
                const error = await response.json();
                this.showAlert(error.message || 'Failed to save account', 'error');
            }
        } catch (error) {
            this.showAlert('Error: ' + error.message, 'error');
        }
    }

    async deleteAccount(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/masters/accounts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });

            if (response.ok) {
                this.showAlert('Account deleted successfully', 'success');
                this.loadAccounts();
            } else {
                this.showAlert('Failed to delete account', 'error');
            }
        } catch (error) {
            this.showAlert('Error: ' + error.message, 'error');
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

        document.getElementById('accountsTableBody').innerHTML = filtered.map(account => `
            <tr>
                <td>${account.code}</td>
                <td>${account.name}</td>
                <td><span class="badge">${account.type}</span></td>
                <td>${this.formatCurrency(account.openingBalance)}</td>
                <td>${this.formatCurrency(account.currentBalance)}</td>
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

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        alertDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 15px 20px; border-radius: 4px; z-index: 1000; min-width: 300px;';
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 3000);
    }
}

// Initialize when page loads
let chartOfAccountsPage;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        chartOfAccountsPage = new ChartOfAccountsPage();
    });
} else {
    chartOfAccountsPage = new ChartOfAccountsPage();
}
