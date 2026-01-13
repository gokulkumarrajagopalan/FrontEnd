
// Enhanced Groups Page Module using BasePage
(function () {
    class GroupsPage extends BasePage {
        constructor() {
            super({
                pageName: 'Account Groups',
                apiEndpoint: '/groups',
                entityName: 'group',
                entityNamePlural: 'groups',
                idField: 'grpId',
                searchFields: ['grpName', 'grpAlias', 'grpParent'],
                tableColumns: [
                    { field: 'grpName', label: 'Group Name', type: 'name' },
                    { field: 'grpParent', label: 'Parent Group' }
                ]
            });
        }

        getFilters() {
            return ''; // Search is now built into table headers
        }

        getModal() {
            return `
                <div id="dataModal" class="modal hidden">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 id="modalTitle">Add Group</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <form id="dataForm" class="modal-body">
                            <div class="form-group">
                                <label class="form-label">Group Name *</label>
                                <input type="text" id="groupName" class="form-input" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Type *</label>
                                <select id="groupType" class="form-input" required>
                                    <option value="">Select Type</option>
                                    <option value="ASSETS">ASSETS</option>
                                    <option value="LIABILITIES">LIABILITIES</option>
                                    <option value="EQUITY">EQUITY</option>
                                    <option value="INCOME">INCOME</option>
                                    <option value="EXPENSE">EXPENSE</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Description</label>
                                <textarea id="groupDescription" class="form-input" rows="3"></textarea>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn-secondary" id="cancelBtn">Cancel</button>
                                <button type="submit" class="btn-erp">Save Group</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        }

        renderTableRow(group) {
            const parentGroupName = group.grpParent || '-';

            return `
                <tr class="hover:bg-gray-50">
                    <td>
                        <div class="font-medium text-gray-900">${group.grpName || 'N/A'}</div>
                        ${group.grpAlias ? `<div class="text-xs text-gray-500">Alias: ${group.grpAlias}</div>` : ''}
                    </td>
                    <td class="text-gray-700">${parentGroupName}</td>

                </tr>
            `;
        }

        setupEventListeners() {
            super.setupEventListeners();
            // Header search is now handled by base-page.js
        }

        filterData() {
            const headerSearch = this.headerSearch || {};

            this.filteredData = this.data.filter(group => {
                // Header per-column searches
                return Object.entries(headerSearch).every(([field, term]) => {
                    if (!term) return true;
                    const value = group[field];
                    return value && value.toString().toLowerCase().includes(term.toLowerCase());
                });
            });

            this.renderTable();
        }

        async syncFromTally() {
            if (this.isSyncing) {
                this.showInfo('🔄 Sync is already in progress. Please wait...');
                return;
            }

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

            this.isSyncing = true;
            const syncBtn = document.getElementById(`sync${this.config.pageName}Btn`);
            const originalContent = syncBtn.innerHTML;

            try {
                syncBtn.disabled = true;
                syncBtn.innerHTML = '<span class="animate-pulse">🔄 Syncing...</span>';

                console.log('🔄 Starting Tally sync via Python...');
                this.showInfo('🔄 Sync queued - Verifying company exists...');

                // Get auth tokens
                const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
                const authToken = sessionStorage.getItem('authToken');
                const deviceToken = sessionStorage.getItem('deviceToken');

                // Get Tally port from settings
                const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
                const tallyPort = appSettings.tallyPort || 9000;

                // Get backend URL from config
                const backendUrl = window.apiConfig?.baseURL || window.AppConfig?.API_BASE_URL || 'http://localhost:8080';

                if (!authToken || !deviceToken) {
                    throw new Error('Authentication required. Please log in again.');
                }

                // Verify company exists in backend first
                this.showInfo('🔍 Checking if company exists in database...');
                const companyCheckResponse = await fetch(window.apiConfig.getUrl(`/companies/${this.selectedCompanyId}`), {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'X-Device-Token': deviceToken
                    }
                });

                if (!companyCheckResponse.ok) {
                    if (companyCheckResponse.status === 404) {
                        throw new Error(`❌ Company ID ${this.selectedCompanyId} does not exist in the database.\n\n💡 Please import this company first from the "Import Company" page before syncing groups.`);
                    } else {
                        throw new Error(`Failed to verify company: HTTP ${companyCheckResponse.status}`);
                    }
                }

                const companyData = await companyCheckResponse.json();
                console.log('✅ Company verified:', companyData.data?.name || 'Unknown');
                this.showInfo(`✅ Company verified: ${companyData.data?.name || 'Company ID ' + this.selectedCompanyId}`);

                // Check if Electron API is available
                if (!window.electronAPI || !window.electronAPI.syncGroups) {
                    throw new Error('Electron API not available. Please restart the application.');
                }

                this.showInfo('🔄 Connecting to Tally Prime...');

                // Get company name for verification
                const companies = JSON.parse(localStorage.getItem('importedCompanies') || '[]');
                const company = companies.find(c => c.id == this.selectedCompanyId);
                const companyName = company ? company.name : null;

                // Call Python sync via Electron IPC
                const result = await window.electronAPI.syncGroups({
                    companyId: this.selectedCompanyId,
                    userId: currentUser?.userId || 1,
                    authToken: authToken,
                    deviceToken: deviceToken,
                    tallyPort: tallyPort,
                    backendUrl: backendUrl,
                    companyName: companyName
                });

                console.log('✅ Sync result:', JSON.stringify(result, null, 2));

                if (result.success) {
                    this.showSuccess(`✅ Successfully synced ${result.count} groups from Tally to database!`);
                    await this.loadData(); // Reload the table
                } else {
                    console.error('❌ Sync failed with result:', result);

                    // Build detailed error message
                    let errorMessage = 'Failed to sync groups: ' + (result.message || 'Sync failed');

                    // Add Python error details if available
                    if (result.stderr) {
                        errorMessage += '\n\n❌ Error details:\n' + result.stderr;
                    }
                    if (result.stdout && !result.stderr) {
                        errorMessage += '\n\n📄 Output:\n' + result.stdout;
                    }
                    if (result.exitCode) {
                        errorMessage += '\n\nExit code: ' + result.exitCode;
                    }

                    this.showError(errorMessage);
                    return;
                }

            } catch (error) {
                console.error('❌ Sync error:', error);

                let errorMessage = 'Failed to sync groups: ';
                if (error.message && error.message.includes('Authentication required')) {
                    errorMessage += 'Please log in again.';
                } else if (error.message && error.message.includes('Electron API not available')) {
                    errorMessage += error.message;
                } else {
                    errorMessage += (error.message || 'Unknown error');
                }

                this.showError(errorMessage);
            } finally {
                this.isSyncing = false;
                syncBtn.disabled = false;
                syncBtn.innerHTML = originalContent;
            }
        }

        async saveData() {
            const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
            const groupData = {
                cmpId: this.selectedCompanyId,
                userId: currentUser.userId,
                grpName: document.getElementById('groupName').value,
                grpNature: document.getElementById('groupType').value,
                grpParent: 'Primary',
                isActive: true
            };

            try {
                const response = await fetch(window.apiConfig.getUrl('/groups'), {
                    method: 'POST',
                    headers: window.authService.getHeaders(),
                    body: JSON.stringify(groupData)
                });

                const result = await response.json();
                if (result.success) {
                    this.hideModal();
                    this.showSuccess('Group created successfully');
                    await this.loadData();
                } else {
                    throw new Error(result.message || 'Failed to create group');
                }
            } catch (error) {
                console.error('Error saving group:', error);
                this.showError('Failed to save group');
            }
        }
    }

    // Initialize the page
    window.initializeGroups = async function () {
        console.log('Initializing Groups Page...');
        const groupsPage = new GroupsPage();
        await groupsPage.init();
    };

    // Export sync function for use by other pages
    window.syncGroupsForCompany = async function (companyId) {
        const groupsPage = new GroupsPage();
        groupsPage.selectedCompanyId = companyId;
        await groupsPage.syncFromTally();
    };

})();
