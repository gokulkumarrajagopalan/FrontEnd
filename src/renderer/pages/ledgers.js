// Enhanced Ledgers Page using BasePage
(function () {
    class LedgersPage extends BasePage {
        constructor() {
            super({
                pageName: 'Ledgers',
                apiEndpoint: '/ledgers',
                entityName: 'ledger',
                entityNamePlural: 'ledgers',
                idField: 'ledId',
                searchFields: ['ledName', 'ledEmail', 'ledParent'],
                tableColumns: [
                    { field: 'ledName', label: 'Name', type: 'name' },
                    { field: 'ledParent', label: 'Group' },
                    { field: 'ledOpeningBalance', label: 'Opening Balance', type: 'currency', align: 'text-right' },
                    { field: 'ledOpeningBalance', label: 'Current Balance', type: 'currency', align: 'text-right' }
                ]
            });
        }

        getFilters() {
            return ''; // Search is now built into table headers
        }

        renderTableRow(ledger) {
            const parentGroupName = ledger.ledParent || ledger.ledPrimaryGroup || 'N/A';
            const openingBalance = ledger.ledOpeningBalance || 0;
            const formattedBalance = new Intl.NumberFormat('en-IN', {
                style: 'currency', currency: 'INR', minimumFractionDigits: 2
            }).format(openingBalance);

            const taxBadge = ledger.gstApplicable && ledger.gstGstin ?
                `<span class="badge badge-info" title="GST: ${ledger.gstGstin}">GST</span>` :
                ledger.vatApplicable && ledger.vatTinNumber ?
                    `<span class="badge badge-primary" title="VAT: ${ledger.vatTinNumber}">VAT</span>` : '';

            return `
                <tr class="hover:bg-gray-50">
                    <td>
                        <div class="font-medium text-gray-900">${ledger.ledName || 'N/A'}</div>
                        ${ledger.ledEmail ? `<div class="text-xs text-gray-500">${ledger.ledEmail}</div>` : ''}
                        ${taxBadge ? `<div class="mt-1">${taxBadge}</div>` : ''}
                    </td>
                    <td>
                        <div class="text-gray-700">${parentGroupName}</div>
                        ${ledger.ledPrimaryGroup && ledger.ledPrimaryGroup !== parentGroupName ?
                    `<div class="text-xs text-gray-400">${ledger.ledPrimaryGroup}</div>` : ''}
                    </td>
                    <td class="text-right font-mono ${openingBalance >= 0 ? 'text-green-600' : 'text-red-600'}">
                        ${formattedBalance}
                    </td>
                    <td class="text-right font-mono ${openingBalance >= 0 ? 'text-green-600' : 'text-red-600'}">
                        ${formattedBalance}
                    </td>

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
                syncBtn.innerHTML = '<span class="animate-pulse">🔄 Syncing...</span>';

                const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
                const companies = JSON.parse(localStorage.getItem('importedCompanies') || '[]');
                const company = companies.find(c => c.id == this.selectedCompanyId);

                if (!window.electronAPI?.syncLedgers) {
                    throw new Error('Electron API not available. Please restart the application.');
                }

                const result = await window.electronAPI.syncLedgers({
                    companyId: this.selectedCompanyId,
                    userId: currentUser?.userId || 1,
                    authToken: localStorage.getItem('authToken'),
                    deviceToken: localStorage.getItem('deviceToken'),
                    tallyPort: appSettings.tallyPort || 9000,
                    backendUrl: window.apiConfig?.baseURL || window.AppConfig?.API_BASE_URL,
                    companyName: company?.name
                });

                if (result.success) {
                    this.showSuccess(`✅ Successfully synced ${result.count} ledgers!`);
                    await this.loadData();
                } else {
                    this.showError('Failed to sync ledgers: ' + result.message);
                }
            } catch (error) {
                this.showError('Failed to sync ledgers: ' + error.message);
            } finally {
                syncBtn.disabled = false;
                syncBtn.innerHTML = originalContent;
            }
        }
    }

    window.initializeLedgers = async function () {
        const ledgersPage = new LedgersPage();
        await ledgersPage.init();
    };
})();
