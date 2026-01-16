// Godowns Page using BasePage
(function () {
    class GodownsPage extends BasePage {
        constructor() {
            super({
                pageName: 'Godowns',
                apiEndpoint: '/godowns',
                entityName: 'godown',
                entityNamePlural: 'godowns',
                idField: 'id',
                searchFields: ['name', 'address'],
                tableColumns: [
                    { field: 'name', label: 'Godown Name', type: 'name' },
                    { field: 'address', label: 'Address' }
                ]
            });
        }

        getFilters() {
            return ''; // Search is now built into table headers
        }

        renderTableRow(godown) {
            const name = godown.name || 'N/A';
            const address = godown.address || '-';

            return `
                <tr class="hover:bg-gray-50">
                    <td><div class="font-semibold text-gray-900">${name}</div></td>
                    <td class="text-gray-600 text-sm">${address}</td>

                </tr>
            `;
        }

        async loadData() {
            console.log(`📊 Loading ${this.config.entityNamePlural} for company:`, this.selectedCompanyId);
            const tbody = document.getElementById('dataTableBody');
            if (!tbody) return;
            if (!this.selectedCompanyId) {
                tbody.innerHTML = `<tr><td colspan="${this.config.tableColumns.length + 1}" class="no-data">📋 Please select a company from the dropdown above to view ${this.config.entityNamePlural}</td></tr>`;
                return;
            }
            try {
                this.showLoading();
                const url = window.apiConfig.getUrl(`${this.config.apiEndpoint}/company/${this.selectedCompanyId}`);
                const response = await fetch(url, { method: 'GET', headers: window.authService.getHeaders() });
                if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                const result = await response.json();
                this.data = Array.isArray(result) ? result : (result.data || []);
                this.filteredData = [...this.data];
                console.log(`✅ Loaded ${this.data.length} ${this.config.entityNamePlural}`);
                this.renderTable();
                this.setupTableListeners();
            } catch (error) {
                console.error(`❌ Error loading ${this.config.entityNamePlural}:`, error);
                tbody.innerHTML = `<tr><td colspan="${this.config.tableColumns.length + 1}" class="no-data text-red-500">Error loading ${this.config.entityNamePlural}: ${error.message}</td></tr>`;
                this.showError(`Failed to load ${this.config.entityNamePlural}: ${error.message}`);
            }
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
                syncBtn.innerHTML = '<span>🔄</span> <span class="animate-pulse">Syncing...</span>';

                const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
                const companies = JSON.parse(localStorage.getItem('importedCompanies') || '[]');
                const company = companies.find(c => c.id == this.selectedCompanyId);

                if (!window.electronAPI?.syncGodowns) {
                    throw new Error('Electron API not available. Please restart the application.');
                }

                const result = await window.electronAPI.syncGodowns({
                    companyId: this.selectedCompanyId,
                    userId: currentUser?.userId || 1,
                    authToken: localStorage.getItem('authToken'),
                    deviceToken: localStorage.getItem('deviceToken'),
                    tallyPort: appSettings.tallyPort || 9000,
                    backendUrl: window.apiConfig?.baseURL || window.AppConfig?.API_BASE_URL,
                    companyName: company?.name
                });

                if (result.success) {
                    this.showSuccess(`Successfully synced ${result.count} godowns!`);
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
    }

    window.initializeGodowns = async function () {
        const godownsPage = new GodownsPage();
        await godownsPage.init();
    };
})();
