/**
 * Cost Centers - Master Screen
 */

const API_BASE_URL = 'http://localhost:8080/api';

class CostCentersPage {
    constructor() {
        this.costCenters = [];
        this.currentEditId = null;
        this.initializePage();
    }

    initializePage() {
        this.loadCostCenters();
        this.setupEventListeners();
    }

    async loadCostCenters() {
        try {
            const response = await fetch(`${API_BASE_URL}/masters/cost-centers`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            if (response.ok) {
                this.costCenters = await response.json();
                this.renderTable();
            } else {
                this.showAlert('Failed to load cost centers', 'error');
            }
        } catch (error) {
            this.showAlert('Error: ' + error.message, 'error');
        }
    }

    renderTable() {
        const tbody = document.getElementById('costCentersTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.costCenters.map(cc => `
            <tr>
                <td>${cc.code || 'N/A'}</td>
                <td>${cc.name || 'N/A'}</td>
                <td>${cc.description || '-'}</td>
                <td>${this.formatCurrency(cc.budget)}</td>
                <td><span class="status-badge ${cc.active ? 'active' : 'inactive'}">${cc.active ? 'Active' : 'Inactive'}</span></td>
                <td class="actions">
                    <button class="btn btn-small edit-btn" data-id="${cc.id}">Edit</button>
                    <button class="btn btn-small delete-btn" data-id="${cc.id}">Delete</button>
                </td>
            </tr>
        `).join('');

        this.attachRowHandlers();
    }

    attachRowHandlers() {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const cc = this.costCenters.find(c => c.id == id);
                if (cc) this.openEditModal(cc);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                if (confirm('Delete this cost center?')) {
                    this.deleteCostCenter(id);
                }
            });
        });
    }

    setupEventListeners() {
        document.getElementById('addCostCenterBtn')?.addEventListener('click', () => this.openAddModal());
        document.getElementById('costCenterForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCostCenter();
        });
        document.getElementById('closeCostCenterModal')?.addEventListener('click', () => this.closeModal());
        document.getElementById('cancelCostCenterBtn')?.addEventListener('click', () => this.closeModal());
        document.getElementById('costCenterSearch')?.addEventListener('input', () => this.filterCostCenters());
    }

    openAddModal() {
        this.currentEditId = null;
        document.getElementById('costCenterForm').reset();
        document.getElementById('costCenterModalTitle').textContent = 'Add New Cost Center';
        document.getElementById('costCenterModal').classList.add('active');
    }

    openEditModal(cc) {
        this.currentEditId = cc.id;
        document.getElementById('costCenterCode').value = cc.code;
        document.getElementById('costCenterName').value = cc.name;
        document.getElementById('costCenterDescription').value = cc.description || '';
        document.getElementById('costCenterBudget').value = cc.budget;
        document.getElementById('costCenterModalTitle').textContent = 'Edit Cost Center';
        document.getElementById('costCenterModal').classList.add('active');
    }

    async saveCostCenter() {
        const formData = {
            code: document.getElementById('costCenterCode').value,
            name: document.getElementById('costCenterName').value,
            description: document.getElementById('costCenterDescription').value,
            budget: parseFloat(document.getElementById('costCenterBudget').value) || 0
        };

        try {
            const method = this.currentEditId ? 'PUT' : 'POST';
            const url = this.currentEditId 
                ? `${API_BASE_URL}/masters/cost-centers/${this.currentEditId}`
                : `${API_BASE_URL}/masters/cost-centers`;

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                this.showAlert('Cost center saved successfully', 'success');
                this.closeModal();
                this.loadCostCenters();
            } else {
                this.showAlert('Failed to save cost center', 'error');
            }
        } catch (error) {
            this.showAlert('Error: ' + error.message, 'error');
        }
    }

    async deleteCostCenter(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/masters/cost-centers/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });

            if (response.ok) {
                this.showAlert('Cost center deleted', 'success');
                this.loadCostCenters();
            }
        } catch (error) {
            this.showAlert('Error: ' + error.message, 'error');
        }
    }

    filterCostCenters() {
        const search = document.getElementById('costCenterSearch').value.toLowerCase();
        const filtered = this.costCenters.filter(cc => 
            cc.code.toLowerCase().includes(search) || cc.name.toLowerCase().includes(search)
        );

        document.getElementById('costCentersTableBody').innerHTML = filtered.map(cc => `
            <tr>
                <td>${cc.code}</td>
                <td>${cc.name}</td>
                <td>${cc.description || '-'}</td>
                <td>${this.formatCurrency(cc.budget)}</td>
                <td><span class="status-badge ${cc.active ? 'active' : 'inactive'}">${cc.active ? 'Active' : 'Inactive'}</span></td>
                <td class="actions">
                    <button class="btn btn-small edit-btn" data-id="${cc.id}">Edit</button>
                    <button class="btn btn-small delete-btn" data-id="${cc.id}">Delete</button>
                </td>
            </tr>
        `).join('');

        this.attachRowHandlers();
    }

    closeModal() {
        document.getElementById('costCenterModal').classList.remove('active');
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

let costCentersPage;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        costCentersPage = new CostCentersPage();
    });
} else {
    costCentersPage = new CostCentersPage();
}
