// Enhanced Units Page using BasePage
(function () {
    class UnitsPage extends BasePage {
        constructor() {
            super({
                pageName: 'Units',
                apiEndpoint: '/units',
                entityName: 'unit',
                entityNamePlural: 'units',
                idField: 'unitId',
                searchFields: ['unitName', 'originalName'],
                tableColumns: [
                    { field: 'unitName', label: 'Unit Name', type: 'name' },
                    { field: 'originalName', label: 'Original Name' },
                    { field: 'simpleUnit', label: 'Type', type: 'unitType' }
                ]
            });
        }

        getPageHeader() {
            return `
                <div class="page-header flex justify-between items-center">
                    <div>
                        <h2>Units of Measure</h2>
                        <p>Manage measurement units for inventory items</p>
                    </div>
                    <div class="flex gap-3">
                        <button id="sync${this.config.pageName}Btn" class="btn-success">
                            <span>🔄</span>
                            <span>Sync From Tally</span>
                        </button>
                        <button id="add${this.config.pageName}Btn" class="btn-erp">
                            + Add Unit
                        </button>
                    </div>
                </div>
            `;
        }

        getFilters() {
            return `
                <div class="filters-container">
                    <div class="relative flex-grow">
                        <input type="text" id="searchInput" placeholder="Search units..." class="search-input">
                        <span class="search-icon">🔍</span>
                    </div>
                    <select id="unitTypeFilter" class="form-input" style="width: 200px;">
                        <option value="">All Types</option>
                        <option value="simple">Simple Only</option>
                        <option value="compound">Compound Only</option>
                    </select>
                    <button class="btn-secondary">Export</button>
                </div>
            `;
        }

        getModal() {
            return `
                <div id="dataModal" class="modal hidden">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 id="modalTitle">Add Unit</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <form id="dataForm" class="modal-body">
                            <div class="form-group">
                                <label class="form-label">Unit Name *</label>
                                <input type="text" id="unitName" class="form-input" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Original Name / Symbol</label>
                                <input type="text" id="originalName" class="form-input">
                            </div>
                            <div class="form-group">
                                <label class="flex items-center gap-2">
                                    <input type="checkbox" id="isSimpleUnit" checked>
                                    <span>Simple Unit</span>
                                </label>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn-secondary" id="cancelBtn">Cancel</button>
                                <button type="submit" class="btn-erp">Save Unit</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        }

        renderTableRow(unit) {
            const name = unit.unitName || 'N/A';
            const originalName = unit.originalName || '-';
            const typeBadge = unit.simpleUnit ?
                '<span class="badge badge-success">Simple</span>' :
                '<span class="badge badge-primary">Compound</span>';

            return `
                <tr class="hover:bg-gray-50">
                    <td><div class="font-medium text-gray-900">${name}</div></td>
                    <td class="text-gray-600">${originalName}</td>
                    <td>${typeBadge}</td>

                </tr>
            `;
        }

        // Use base class loadData() with server-side pagination

        setupEventListeners() {
            super.setupEventListeners();

            const typeFilter = document.getElementById('unitTypeFilter');
            if (typeFilter) {
                typeFilter.addEventListener('change', () => this.filterData());
            }
        }

        filterData() {
            const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
            const type = document.getElementById('unitTypeFilter')?.value || '';

            this.filteredData = this.data.filter(unit => {
                const matchesSearch = this.config.searchFields.some(field => {
                    const value = unit[field];
                    return value && value.toString().toLowerCase().includes(searchTerm);
                });

                let matchesType = true;
                if (type === 'simple') matchesType = unit.simpleUnit === true;
                else if (type === 'compound') matchesType = unit.simpleUnit === false;

                return matchesSearch && matchesType;
            });

            this.renderTable();
        }

        async syncFromTally() {
            if (!this.selectedCompanyId) {
                this.showError('Please select a company first');
                return;
            }

            // Validate license before sync
            if (window.LicenseValidator) {
                const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
                const tallyPort = appSettings.tallyPort || 9000;
                const isValid = await window.LicenseValidator.validateAndNotify(null, tallyPort);
                if (!isValid) {
                    return; // Block sync if license doesn't match
                }
            }

            const syncBtn = document.getElementById(`sync${this.config.pageName}Btn`);
            const originalContent = syncBtn.innerHTML;

            try {
                syncBtn.disabled = true;
                syncBtn.innerHTML = '<span class="animate-spin">🔄</span> Syncing...';

                const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
                const companies = JSON.parse(localStorage.getItem('importedCompanies') || '[]');
                const company = companies.find(c => c.id == this.selectedCompanyId);

                if (!window.electronAPI?.syncUnits) {
                    throw new Error('Sync Units capability not available in Electron');
                }

                const result = await window.electronAPI.syncUnits({
                    companyId: this.selectedCompanyId,
                    userId: currentUser?.userId || 1,
                    authToken: localStorage.getItem('authToken'),
                    deviceToken: localStorage.getItem('deviceToken'),
                    tallyPort: appSettings.tallyPort || 9000,
                    backendUrl: window.apiConfig?.baseURL || window.AppConfig?.API_BASE_URL,
                    companyName: company?.name
                });

                if (result.success) {
                    this.showSuccess('Successfully synced units!');
                    await this.loadData();
                } else {
                    this.showError('Sync failed: ' + (result.message || 'Unknown error'));
                }
            } catch (error) {
                this.showError('Sync failed: ' + error.message);
            } finally {
                syncBtn.disabled = false;
                syncBtn.innerHTML = originalContent;
            }
        }

        async saveData() {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            const unitData = {
                cmpId: this.selectedCompanyId,
                userId: currentUser?.userId || 1,
                unitName: document.getElementById('unitName').value,
                originalName: document.getElementById('originalName').value,
                simpleUnit: document.getElementById('isSimpleUnit').checked,
                masterId: 0,
                alterId: 0,
                guid: crypto.randomUUID ? crypto.randomUUID() : 'new-guid'
            };

            try {
                const response = await fetch(window.apiConfig.getUrl('/units/sync'), {
                    method: 'POST',
                    headers: window.authService.getHeaders(),
                    body: JSON.stringify([unitData])
                });

                if (response.ok) {
                    this.hideModal();
                    this.showSuccess('Unit saved successfully');
                    await this.loadData();
                } else {
                    const err = await response.json();
                    throw new Error(err.message || 'Failed to save unit');
                }
            } catch (error) {
                this.showError('Failed to save unit: ' + error.message);
            }
        }
    }

    window.initializeUnits = async function () {
        const unitsPage = new UnitsPage();
        await unitsPage.init();
    };
})();