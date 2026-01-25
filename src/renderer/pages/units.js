// Units Page using BasePage
(function () {
    class UnitsPage extends BasePage {
        constructor() {
            super({
                pageName: 'Units',
                apiEndpoint: '/units',
                entityName: 'unit',
                entityNamePlural: 'units',
                idField: 'id',
                searchFields: ['name', 'symbol'],
                tableColumns: [
                    { field: 'name', label: 'Unit Name', type: 'name' },
                    { field: 'symbol', label: 'Symbol' },
                    { field: 'description', label: 'Description' }
                ]
            });
        }

        getFilters() {
            return ''; // Search is now built into table headers
        }

        renderTableRow(unit) {
            const name = unit.name || 'N/A';
            const symbol = unit.symbol || 'N/A';
            const description = unit.description || '-';

            return `
                <tr class="hover:bg-gray-50">
                    <td><div class="font-semibold text-gray-900">${name}</div></td>
                    <td class="text-gray-600 font-mono">${symbol}</td>
                    <td class="text-gray-600 text-sm">${description}</td>
                </tr>
            `;
        }

        // Use base class loadData() with server-side pagination

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

                if (!window.electronAPI?.syncUnits) {
                    throw new Error('Electron API not available. Please restart the application.');
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
                    this.showSuccess(`Successfully synced ${result.count} units!`);
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

    window.initializeUnits = async function () {
        const unitsPage = new UnitsPage();
        await unitsPage.init();
    };
})();
