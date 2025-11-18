/**
 * Units of Measurement - Master Screen
 */

const API_BASE_URL = 'http://localhost:8080/api';

class UnitsPage {
    constructor() {
        this.units = [];
        this.currentEditId = null;
        this.initializePage();
    }

    initializePage() {
        this.loadUnits();
        this.setupEventListeners();
    }

    async loadUnits() {
        try {
            const response = await fetch(`${API_BASE_URL}/masters/units`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            if (response.ok) {
                this.units = await response.json();
                this.renderTable();
            } else {
                this.showAlert('Failed to load units', 'error');
            }
        } catch (error) {
            this.showAlert('Error: ' + error.message, 'error');
        }
    }

    renderTable() {
        const tbody = document.getElementById('unitsTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.units.map(unit => `
            <tr>
                <td>${unit.name || 'N/A'}</td>
                <td><strong>${unit.symbol || 'N/A'}</strong></td>
                <td>${unit.type || 'N/A'}</td>
                <td>${unit.description || '-'}</td>
                <td><span class="status-badge ${unit.active ? 'active' : 'inactive'}">${unit.active ? 'Active' : 'Inactive'}</span></td>
                <td class="actions">
                    <button class="btn btn-small edit-btn" data-id="${unit.id}">Edit</button>
                    <button class="btn btn-small delete-btn" data-id="${unit.id}">Delete</button>
                </td>
            </tr>
        `).join('');

        this.attachRowHandlers();
    }

    attachRowHandlers() {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const unit = this.units.find(u => u.id == id);
                if (unit) this.openEditModal(unit);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                if (confirm('Delete this unit?')) {
                    this.deleteUnit(id);
                }
            });
        });
    }

    setupEventListeners() {
        document.getElementById('addUnitBtn')?.addEventListener('click', () => this.openAddModal());
        document.getElementById('unitForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveUnit();
        });
        document.getElementById('closeUnitModal')?.addEventListener('click', () => this.closeModal());
        document.getElementById('cancelUnitBtn')?.addEventListener('click', () => this.closeModal());
        document.getElementById('unitSearch')?.addEventListener('input', () => this.filterUnits());
    }

    openAddModal() {
        this.currentEditId = null;
        document.getElementById('unitForm').reset();
        document.getElementById('unitModalTitle').textContent = 'Add New Unit';
        document.getElementById('unitModal').classList.add('active');
    }

    openEditModal(unit) {
        this.currentEditId = unit.id;
        document.getElementById('unitName').value = unit.name;
        document.getElementById('unitSymbol').value = unit.symbol;
        document.getElementById('unitType').value = unit.type;
        document.getElementById('unitDescription').value = unit.description || '';
        document.getElementById('unitModalTitle').textContent = 'Edit Unit';
        document.getElementById('unitModal').classList.add('active');
    }

    async saveUnit() {
        const formData = {
            name: document.getElementById('unitName').value,
            symbol: document.getElementById('unitSymbol').value,
            type: document.getElementById('unitType').value,
            description: document.getElementById('unitDescription').value
        };

        try {
            const method = this.currentEditId ? 'PUT' : 'POST';
            const url = this.currentEditId 
                ? `${API_BASE_URL}/masters/units/${this.currentEditId}`
                : `${API_BASE_URL}/masters/units`;

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                this.showAlert('Unit saved successfully', 'success');
                this.closeModal();
                this.loadUnits();
            } else {
                this.showAlert('Failed to save unit', 'error');
            }
        } catch (error) {
            this.showAlert('Error: ' + error.message, 'error');
        }
    }

    async deleteUnit(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/masters/units/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });

            if (response.ok) {
                this.showAlert('Unit deleted', 'success');
                this.loadUnits();
            }
        } catch (error) {
            this.showAlert('Error: ' + error.message, 'error');
        }
    }

    filterUnits() {
        const search = document.getElementById('unitSearch').value.toLowerCase();
        const filtered = this.units.filter(unit => 
            unit.name.toLowerCase().includes(search) || unit.symbol.toLowerCase().includes(search)
        );

        document.getElementById('unitsTableBody').innerHTML = filtered.map(unit => `
            <tr>
                <td>${unit.name}</td>
                <td><strong>${unit.symbol}</strong></td>
                <td>${unit.type}</td>
                <td>${unit.description || '-'}</td>
                <td><span class="status-badge ${unit.active ? 'active' : 'inactive'}">${unit.active ? 'Active' : 'Inactive'}</span></td>
                <td class="actions">
                    <button class="btn btn-small edit-btn" data-id="${unit.id}">Edit</button>
                    <button class="btn btn-small delete-btn" data-id="${unit.id}">Delete</button>
                </td>
            </tr>
        `).join('');

        this.attachRowHandlers();
    }

    closeModal() {
        document.getElementById('unitModal').classList.remove('active');
        this.currentEditId = null;
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

let unitsPage;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        unitsPage = new UnitsPage();
    });
} else {
    unitsPage = new UnitsPage();
}
