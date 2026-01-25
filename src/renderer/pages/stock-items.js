// Stock Items Page using BasePage
(function () {
    class StockItemsPage extends BasePage {
        constructor() {
            super({
                pageName: 'Stock Items',
                apiEndpoint: '/stock-items',
                entityName: 'stock item',
                entityNamePlural: 'stock items',
                idField: 'id',
                searchFields: ['name', 'category', 'baseUnits'],
                tableColumns: [
                    { field: 'name', label: 'Item Name', type: 'name' },
                    { field: 'category', label: 'Category' },
                    { field: 'baseUnits', label: 'Base Unit' },
                    { field: 'openingBalance', label: 'Opening Balance', type: 'currency', align: 'text-right' },
                    { field: 'openingValue', label: 'Opening Value', type: 'currency', align: 'text-right' }
                ]
            });
        }

        getFilters() {
            return ''; // Search is now built into table headers
        }

        renderTableRow(item) {
            const name = item.name || 'N/A';
            const category = item.category || 'N/A';
            const baseUnits = item.baseUnits || 'N/A';
            const openingBalance = item.openingBalance || 0;
            const openingValue = item.openingValue || 0;

            const formattedBalance = new Intl.NumberFormat('en-IN', {
                style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 4
            }).format(openingBalance);

            const formattedValue = new Intl.NumberFormat('en-IN', {
                style: 'currency', currency: 'INR', minimumFractionDigits: 2
            }).format(openingValue);

            return `
                <tr class="hover:bg-gray-50">
                    <td><div class="font-semibold text-gray-900">${name}</div></td>
                    <td class="text-gray-600">${category}</td>
                    <td class="text-gray-600">${baseUnits}</td>
                    <td class="text-right font-mono text-gray-700">${formattedBalance}</td>
                    <td class="text-right font-mono text-green-600">${formattedValue}</td>

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

                if (!window.electronAPI?.syncStockItems) {
                    throw new Error('Electron API not available. Please restart the application.');
                }

                const result = await window.electronAPI.syncStockItems({
                    companyId: this.selectedCompanyId,
                    userId: currentUser?.userId || 1,
                    authToken: localStorage.getItem('authToken'),
                    deviceToken: localStorage.getItem('deviceToken'),
                    tallyPort: appSettings.tallyPort || 9000,
                    backendUrl: window.apiConfig?.baseURL || window.AppConfig?.API_BASE_URL,
                    companyName: company?.name
                });

                if (result.success) {
                    this.showSuccess(`Successfully synced ${result.count} stock items!`);
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

    window.initializeStockItems = async function () {
        const stockItemsPage = new StockItemsPage();
        await stockItemsPage.init();
    };
})();
