// Enhanced Stock Groups Page using BasePage
(function () {
    class StockGroupsPage extends BasePage {
        constructor() {
            super({
                pageName: 'Stock Groups',
                apiEndpoint: '/stock-groups',
                entityName: 'stock group',
                entityNamePlural: 'stock groups',
                idField: 'id',
                searchFields: ['name', 'grpName'],
                tableColumns: [
                    { field: 'name', label: 'Stock Group Name', type: 'name' },
                    { field: 'parent', label: 'Parent Group' }
                ]
            });
        }

        renderTableRow(group) {
            const name = group.name || group.grpName || 'N/A';
            const parent = group.parent || group.grpParent || 'Primary';

            return `
                <tr class="hover:bg-gray-50">
                    <td><div class="font-semibold text-gray-900">${name}</div></td>
                    <td class="text-gray-600">${parent}</td>
                    <td class="text-center">
                        <div class="flex gap-2 justify-center">
                            <button class="action-btn edit-btn" data-id="${group.id}">✏️</button>
                            <button class="action-btn delete-btn" data-id="${group.id}">🗑️</button>
                        </div>
                    </td>
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
                const response = await fetch(url, {
                    method: 'GET',
                    headers: window.authService.getHeaders()
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                this.data = Array.isArray(result) ? result : (result.data || []);
                this.filteredData = [...this.data];
                console.log(`✅ Loaded ${this.data.length} ${this.config.entityNamePlural}`);
                this.renderTable();
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

            const syncBtn = document.getElementById(`sync${this.config.pageName}Btn`);
            const originalContent = syncBtn.innerHTML;

            try {
                syncBtn.disabled = true;
                syncBtn.innerHTML = '<span>🔄</span> <span class="animate-pulse">Syncing...</span>';

                const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
                const companies = JSON.parse(localStorage.getItem('importedCompanies') || '[]');
                const company = companies.find(c => c.id == this.selectedCompanyId);

                if (!window.electronAPI?.syncStockGroups) {
                    throw new Error('Electron API not available. Please restart the application.');
                }

                const result = await window.electronAPI.syncStockGroups({
                    companyId: this.selectedCompanyId,
                    userId: currentUser?.userId || 1,
                    authToken: localStorage.getItem('authToken'),
                    deviceToken: localStorage.getItem('deviceToken'),
                    tallyPort: appSettings.tallyPort || 9000,
                    backendUrl: window.apiConfig?.baseURL || 'http://localhost:8080',
                    companyName: company?.name
                });

                if (result.success) {
                    this.showSuccess(`Successfully synced ${result.count} stock groups!`);
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

    window.initializeStockGroups = async function () {
        const stockGroupsPage = new StockGroupsPage();
        await stockGroupsPage.init();
    };
})();
