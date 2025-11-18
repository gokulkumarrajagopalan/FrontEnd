/**
 * Stock Categories - Master Screen
 */

const API_BASE_URL = 'http://localhost:8080/api';

class CategoriesPage {
    constructor() {
        this.categories = [];
        this.currentEditId = null;
        this.initializePage();
    }

    initializePage() {
        this.loadCategories();
        this.setupEventListeners();
    }

    async loadCategories() {
        try {
            const response = await fetch(`${API_BASE_URL}/masters/categories`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            if (response.ok) {
                this.categories = await response.json();
                this.renderTable();
            } else {
                this.showAlert('Failed to load categories', 'error');
            }
        } catch (error) {
            this.showAlert('Error: ' + error.message, 'error');
        }
    }

    renderTable() {
        const tbody = document.getElementById('categoriesTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.categories.map(cat => `
            <tr>
                <td>${cat.name || 'N/A'}</td>
                <td>${cat.description || '-'}</td>
                <td>${cat.hsnCode || '-'}</td>
                <td>${cat.taxRate}%</td>
                <td><span class="status-badge ${cat.active ? 'active' : 'inactive'}">${cat.active ? 'Active' : 'Inactive'}</span></td>
                <td class="actions">
                    <button class="btn btn-small edit-btn" data-id="${cat.id}">Edit</button>
                    <button class="btn btn-small delete-btn" data-id="${cat.id}">Delete</button>
                </td>
            </tr>
        `).join('');

        this.attachRowHandlers();
    }

    attachRowHandlers() {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const cat = this.categories.find(c => c.id == id);
                if (cat) this.openEditModal(cat);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                if (confirm('Delete this category?')) {
                    this.deleteCategory(id);
                }
            });
        });
    }

    setupEventListeners() {
        document.getElementById('addCategoryBtn')?.addEventListener('click', () => this.openAddModal());
        document.getElementById('categoryForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCategory();
        });
        document.getElementById('closeCategoryModal')?.addEventListener('click', () => this.closeModal());
        document.getElementById('cancelCategoryBtn')?.addEventListener('click', () => this.closeModal());
        document.getElementById('categorySearch')?.addEventListener('input', () => this.filterCategories());
    }

    openAddModal() {
        this.currentEditId = null;
        document.getElementById('categoryForm').reset();
        document.getElementById('categoryModalTitle').textContent = 'Add New Category';
        document.getElementById('categoryModal').classList.add('active');
    }

    openEditModal(cat) {
        this.currentEditId = cat.id;
        document.getElementById('categoryName').value = cat.name;
        document.getElementById('categoryDescription').value = cat.description || '';
        document.getElementById('categoryHsnCode').value = cat.hsnCode || '';
        document.getElementById('categoryTaxRate').value = cat.taxRate;
        document.getElementById('categoryModalTitle').textContent = 'Edit Category';
        document.getElementById('categoryModal').classList.add('active');
    }

    async saveCategory() {
        const formData = {
            name: document.getElementById('categoryName').value,
            description: document.getElementById('categoryDescription').value,
            hsnCode: document.getElementById('categoryHsnCode').value,
            taxRate: parseFloat(document.getElementById('categoryTaxRate').value) || 0
        };

        try {
            const method = this.currentEditId ? 'PUT' : 'POST';
            const url = this.currentEditId 
                ? `${API_BASE_URL}/masters/categories/${this.currentEditId}`
                : `${API_BASE_URL}/masters/categories`;

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                this.showAlert('Category saved successfully', 'success');
                this.closeModal();
                this.loadCategories();
            } else {
                this.showAlert('Failed to save category', 'error');
            }
        } catch (error) {
            this.showAlert('Error: ' + error.message, 'error');
        }
    }

    async deleteCategory(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/masters/categories/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });

            if (response.ok) {
                this.showAlert('Category deleted', 'success');
                this.loadCategories();
            }
        } catch (error) {
            this.showAlert('Error: ' + error.message, 'error');
        }
    }

    filterCategories() {
        const search = document.getElementById('categorySearch').value.toLowerCase();
        const filtered = this.categories.filter(cat => 
            cat.name.toLowerCase().includes(search)
        );

        document.getElementById('categoriesTableBody').innerHTML = filtered.map(cat => `
            <tr>
                <td>${cat.name}</td>
                <td>${cat.description || '-'}</td>
                <td>${cat.hsnCode || '-'}</td>
                <td>${cat.taxRate}%</td>
                <td><span class="status-badge ${cat.active ? 'active' : 'inactive'}">${cat.active ? 'Active' : 'Inactive'}</span></td>
                <td class="actions">
                    <button class="btn btn-small edit-btn" data-id="${cat.id}">Edit</button>
                    <button class="btn btn-small delete-btn" data-id="${cat.id}">Delete</button>
                </td>
            </tr>
        `).join('');

        this.attachRowHandlers();
    }

    closeModal() {
        document.getElementById('categoryModal').classList.remove('active');
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

let categoriesPage;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        categoriesPage = new CategoriesPage();
    });
} else {
    categoriesPage = new CategoriesPage();
}
