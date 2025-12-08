(function () {
    const getTemplate = () => `
    <div id="mastersCategoriesPageContainer" class="space-y-6">
        <div class="page-header flex justify-between items-center">
            <div>
                <h2>Stock Categories</h2>
                <p>Manage product categories</p>
            </div>
            <button id="addCategoryBtn" class="btn btn-primary">+ New Category</button>
        </div>
        <div class="flex gap-4 mb-6">
            <input type="text" id="categorySearch" placeholder="Search categories..." class="flex-1 px-4 py-2 border border-gray-200 rounded-lg">
        </div>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr><th>Category Name</th><th>Description</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody id="categoriesTableBody"></tbody>
            </table>
        </div>

        <!-- Add/Edit Modal -->
        <div id="categoryModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="categoryModalTitle">Add Category</h3>
                    <span class="close-btn" id="closeCategoryModal">&times;</span>
                </div>
                <form id="categoryForm">
                    <div class="form-group">
                        <label>Category Name *</label>
                        <input type="text" id="categoryName" required placeholder="e.g., Electronics">
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="categoryDescription" placeholder="Enter description"></textarea>
                    </div>
                    <div class="form-group">
                        <label>HSN Code</label>
                        <input type="text" id="categoryHsnCode" placeholder="e.g., 8471">
                    </div>
                    <div class="form-group">
                        <label>Tax Rate (%) *</label>
                        <input type="number" id="categoryTaxRate" required step="0.01" value="0">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="cancelCategoryBtn">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Category</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;

    if (!window.API_BASE_URL) {
        window.API_BASE_URL = window.AppConfig ? window.AppConfig.API_BASE_URL : 'http://localhost:8080';
    }

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
                const response = await fetch(`${window.API_BASE_URL}/masters/categories`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                });

                if (response.ok) {
                    this.categories = await response.json();
                    this.renderTable();
                } else {
                    if (window.notificationService) window.notificationService.error('Failed to load categories');
                }
            } catch (error) {
                if (window.notificationService) window.notificationService.error('Error: ' + error.message);
            }
        }

        renderTable() {
            const tbody = document.getElementById('categoriesTableBody');
            if (!tbody) return;

            tbody.innerHTML = this.categories.map(cat => `
                <tr>
                    <td>${cat.name || 'N/A'}</td>
                    <td>${cat.description || '-'}</td>
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
                    ? `${window.API_BASE_URL}/masters/categories/${this.currentEditId}`
                    : `${window.API_BASE_URL}/masters/categories`;

                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify(formData)
                });

                if (response.ok) {
                    if (window.notificationService) window.notificationService.success('Category saved successfully');
                    this.closeModal();
                    this.loadCategories();
                } else {
                    if (window.notificationService) window.notificationService.error('Failed to save category');
                }
            } catch (error) {
                if (window.notificationService) window.notificationService.error('Error: ' + error.message);
            }
        }

        async deleteCategory(id) {
            try {
                const response = await fetch(`${window.API_BASE_URL}/masters/categories/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                });

                if (response.ok) {
                    if (window.notificationService) window.notificationService.success('Category deleted');
                    this.loadCategories();
                }
            } catch (error) {
                if (window.notificationService) window.notificationService.error('Error: ' + error.message);
            }
        }

        filterCategories() {
            const search = document.getElementById('categorySearch').value.toLowerCase();
            const filtered = this.categories.filter(cat =>
                cat.name.toLowerCase().includes(search)
            );

            const tbody = document.getElementById('categoriesTableBody');
            tbody.innerHTML = filtered.map(cat => `
                <tr>
                    <td>${cat.name}</td>
                    <td>${cat.description || '-'}</td>
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
    }

    window.initializeMastersCategories = function () {
        console.log('Initializing Masters Categories Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getTemplate();
            new CategoriesPage();
        }
    };
})();
