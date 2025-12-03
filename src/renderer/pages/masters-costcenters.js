(function () {
    const getTemplate = () => `
    <div id="mastersCostcentersPageContainer" class="space-y-6">
        <div class="page-header flex justify-between items-center">
            <div>
                <h2>Cost Centers</h2>
                <p>Manage cost center masters</p>
            </div>
            <button id="addCostCenterBtn" class="btn btn-primary">+ New Cost Center</button>
        </div>
        <div class="flex gap-4 mb-6">
            <input type="text" id="costCenterSearch" placeholder="Search cost centers..." class="flex-1 px-4 py-2 border border-gray-200 rounded-lg">
        </div>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr><th>Code</th><th>Name</th><th>Department</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody id="costCentersTableBody"></tbody>
            </table>
        </div>

        <!-- Add/Edit Modal -->
        <div id="costCenterModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="costCenterModalTitle">Add Cost Center</h3>
                    <span class="close-btn" id="closeCostCenterModal">&times;</span>
                </div>
                <form id="costCenterForm">
                    <div class="form-group">
                        <label>Code *</label>
                        <input type="text" id="costCenterCode" required placeholder="e.g., CC001">
                    </div>
                    <div class="form-group">
                        <label>Name *</label>
                        <input type="text" id="costCenterName" required placeholder="e.g., Production">
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="costCenterDescription" placeholder="Enter description"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Budget Amount</label>
                        <input type="number" id="costCenterBudget" step="0.01" value="0">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="cancelCostCenterBtn">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Cost Center</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;

    if (!window.API_BASE_URL) {
        window.API_BASE_URL = window.AppConfig ? window.AppConfig.API_BASE_URL : 'http://localhost:8080/api';
    }

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
                const response = await fetch(`${window.API_BASE_URL}/masters/cost-centers`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                });

                if (response.ok) {
                    this.costCenters = await response.json();
                    this.renderTable();
                } else {
                    if (window.notificationService) window.notificationService.error('Failed to load cost centers');
                }
            } catch (error) {
                if (window.notificationService) window.notificationService.error('Error: ' + error.message);
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
                    ? `${window.API_BASE_URL}/masters/cost-centers/${this.currentEditId}`
                    : `${window.API_BASE_URL}/masters/cost-centers`;

                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify(formData)
                });

                if (response.ok) {
                    if (window.notificationService) window.notificationService.success('Cost center saved successfully');
                    this.closeModal();
                    this.loadCostCenters();
                } else {
                    if (window.notificationService) window.notificationService.error('Failed to save cost center');
                }
            } catch (error) {
                if (window.notificationService) window.notificationService.error('Error: ' + error.message);
            }
        }

        async deleteCostCenter(id) {
            try {
                const response = await fetch(`${window.API_BASE_URL}/masters/cost-centers/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                });

                if (response.ok) {
                    if (window.notificationService) window.notificationService.success('Cost center deleted');
                    this.loadCostCenters();
                }
            } catch (error) {
                if (window.notificationService) window.notificationService.error('Error: ' + error.message);
            }
        }

        filterCostCenters() {
            const search = document.getElementById('costCenterSearch').value.toLowerCase();
            const filtered = this.costCenters.filter(cc =>
                cc.code.toLowerCase().includes(search) || cc.name.toLowerCase().includes(search)
            );

            const tbody = document.getElementById('costCentersTableBody');
            tbody.innerHTML = filtered.map(cc => `
                <tr>
                    <td>${cc.code}</td>
                    <td>${cc.name}</td>
                    <td>${cc.description || '-'}</td>
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
    }

    window.initializeMastersCostCenters = function () {
        console.log('Initializing Masters Cost Centers Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getTemplate();
            new CostCentersPage();
        }
    };
})();
