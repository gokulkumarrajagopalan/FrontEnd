(function () {
    const getTemplate = () => `
    <div id="mastersUnitsPageContainer" class="space-y-6">
        <div class="page-header flex justify-between items-center">
            <div>
                <h2>Units of Measurement</h2>
                <p>Manage measurement units</p>
            </div>
            <button id="addUnitBtn" class="btn btn-primary">+ New Unit</button>
        </div>
        <div class="flex gap-4 mb-6">
            <input type="text" id="unitSearch" placeholder="Search units..." class="flex-1 px-4 py-2 border border-gray-200 rounded-lg">
        </div>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr><th>Unit Name</th><th>Symbol</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody id="unitsTableBody"></tbody>
            </table>
        </div>

        <!-- Add/Edit Modal -->
        <div id="unitModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="unitModalTitle">Add Unit</h3>
                    <span class="close-btn" id="closeUnitModal">&times;</span>
                </div>
                <form id="unitForm">
                    <div class="form-group">
                        <label>Unit Name *</label>
                        <input type="text" id="unitName" required placeholder="e.g., Kilogram">
                    </div>
                    <div class="form-group">
                        <label>Symbol *</label>
                        <input type="text" id="unitSymbol" required placeholder="e.g., KG">
                    </div>
                    <div class="form-group">
                        <label>Type *</label>
                        <select id="unitType" required>
                            <option value="">Select Type</option>
                            <option value="WEIGHT">Weight</option>
                            <option value="LENGTH">Length</option>
                            <option value="VOLUME">Volume</option>
                            <option value="QUANTITY">Quantity</option>
                            <option value="AREA">Area</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="unitDescription" placeholder="Enter description"></textarea>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="cancelUnitBtn">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save Unit</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;

    if (!window.API_BASE_URL) {
        window.API_BASE_URL = window.AppConfig ? window.AppConfig.API_BASE_URL : 'http://localhost:8080/api';
    }

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
                const response = await fetch(`${window.API_BASE_URL}/masters/units`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                });

                if (response.ok) {
                    this.units = await response.json();
                    this.renderTable();
                } else {
                    if (window.notificationService) window.notificationService.error('Failed to load units');
                }
            } catch (error) {
                if (window.notificationService) window.notificationService.error('Error: ' + error.message);
            }
        }

        renderTable() {
            const tbody = document.getElementById('unitsTableBody');
            if (!tbody) return;

            tbody.innerHTML = this.units.map(unit => `
                <tr>
                    <td>${unit.name || 'N/A'}</td>
                    <td><strong>${unit.symbol || 'N/A'}</strong></td>
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
                    ? `${window.API_BASE_URL}/masters/units/${this.currentEditId}`
                    : `${window.API_BASE_URL}/masters/units`;

                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify(formData)
                });

                if (response.ok) {
                    if (window.notificationService) window.notificationService.success('Unit saved successfully');
                    this.closeModal();
                    this.loadUnits();
                } else {
                    if (window.notificationService) window.notificationService.error('Failed to save unit');
                }
            } catch (error) {
                if (window.notificationService) window.notificationService.error('Error: ' + error.message);
            }
        }

        async deleteUnit(id) {
            try {
                const response = await fetch(`${window.API_BASE_URL}/masters/units/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                });

                if (response.ok) {
                    if (window.notificationService) window.notificationService.success('Unit deleted');
                    this.loadUnits();
                }
            } catch (error) {
                if (window.notificationService) window.notificationService.error('Error: ' + error.message);
            }
        }

        filterUnits() {
            const search = document.getElementById('unitSearch').value.toLowerCase();
            const filtered = this.units.filter(unit =>
                unit.name.toLowerCase().includes(search) || unit.symbol.toLowerCase().includes(search)
            );

            const tbody = document.getElementById('unitsTableBody');
            tbody.innerHTML = filtered.map(unit => `
                <tr>
                    <td>${unit.name}</td>
                    <td><strong>${unit.symbol}</strong></td>
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
    }

    window.initializeMastersUnits = function () {
        console.log('Initializing Masters Units Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getTemplate();
            new UnitsPage();
        }
    };
})();
