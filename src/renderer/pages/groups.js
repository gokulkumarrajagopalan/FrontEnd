
// Groups Page Module
(function () {
    // State
    let groups = [];
    let selectedCompanyId = null;

    // HTML Template
    const getTemplate = () => `
    <div id="groupsPageContainer" class="space-y-6">
        <div class="page-header flex justify-between items-center">
            <div>
                <h2>Account Groups</h2>
                <p>Manage ledger groups and chart of accounts</p>
            </div>
            <div class="flex gap-3">
                <button class="btn btn-secondary" id="syncGroupsBtn">
                    <span>🔄</span>
                    <span>Sync from Tally</span>
                </button>
                <button class="btn btn-primary" id="addGroupBtn">+ Add Group</button>
            </div>
        </div>

        <div class="flex gap-4 mb-6">
            <input type="text" id="groupSearch" placeholder="Search groups..." class="flex-1 px-4 py-2 border border-gray-200 rounded-lg">
            <select id="groupTypeFilter" class="px-4 py-2 border border-gray-200 rounded-lg">
                <option value="">All Types</option>
                <option value="revenue">Revenue (P&L)</option>
                <option value="balancesheet">Balance Sheet</option>
                <option value="primary">Primary Groups</option>
            </select>
        </div>

        <div class="table-responsive bg-white rounded-xl shadow-sm border border-gray-100">
            <table class="table">
                <thead>
                    <tr>
                        <th>Group Name</th>
                        <th>Parent Group</th>
                        <th>Nature</th>
                        <th>Is Revenue</th>
                        <th>Status</th>
                        <th>Tally GUID</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="groupsTable">
                    <tr><td colspan="7" class="text-center py-8 text-gray-400">Select a company to view groups...</td></tr>
                </tbody>
            </table>
        </div>

        <!-- Modal for adding/editing group -->
        <div id="groupModal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50">
            <div class="modal-content bg-white rounded-xl w-full max-w-md mx-4">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 id="modalTitle" class="font-bold text-gray-800">Add Group</h2>
                    <button class="close-btn text-gray-400 hover:text-gray-600">&times;</button>
                </div>
                <form id="groupForm" class="p-6 space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                        <input type="text" id="groupName" class="w-full px-3 py-2 border border-gray-200 rounded-lg" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select id="groupType" class="w-full px-3 py-2 border border-gray-200 rounded-lg" required>
                            <option>ASSETS</option>
                            <option>LIABILITIES</option>
                            <option>EQUITY</option>
                            <option>INCOME</option>
                            <option>EXPENSE</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea id="groupDescription" class="w-full px-3 py-2 border border-gray-200 rounded-lg" rows="3"></textarea>
                    </div>
                    <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;

    // Styles
    const injectStyles = () => {
        if (document.getElementById('groups-page-styles')) return;
        const style = document.createElement('style');
        style.id = 'groups-page-styles';
        style.textContent = `
            .type-badge {
                background: #667eea;
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.85em;
            }
        `;
        document.head.appendChild(style);
    };

    // API Helpers
    const getAuthHeaders = () => {
        // Use global auth service for proper headers (includes device token)
        if (window.authService) {
            return window.authService.getHeaders();
        }
        // Fallback to manual token
        const token = localStorage.getItem('authToken');
        const deviceToken = localStorage.getItem('deviceToken');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...(deviceToken && { 'X-Device-Token': deviceToken })
        };
    };

    // Initialization
    window.initializeGroups = async function () {
        console.log('Initializing Groups Page...');

        // Render HTML
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getTemplate();
            injectStyles();
        } else {
            console.error('Page content container not found');
            return;
        }

        try {
            // Check authentication
            const isAuthenticated = window.authService?.isAuthenticated();
            console.log('🔐 User authenticated:', isAuthenticated);
            
            if (!isAuthenticated) {
                console.warn('⚠️ User not authenticated, redirecting to login...');
                window.router?.navigate('login');
                return;
            }
            
            // Use global company selector
            const savedCompanyId = localStorage.getItem('selectedCompanyId');
            selectedCompanyId = window.selectedCompanyId || (savedCompanyId ? parseInt(savedCompanyId) : null);
            
            console.log('📋 Groups page - Selected Company ID:', selectedCompanyId);
            console.log('📋 window.selectedCompanyId:', window.selectedCompanyId);
            console.log('📋 localStorage.selectedCompanyId:', savedCompanyId);
            
            // Listen for global company changes
            window.addEventListener('companyChanged', async (e) => {
                console.log('📋 Company changed event received:', e.detail);
                selectedCompanyId = e.detail.companyId;
                await loadGroups();
            });
            
            await loadGroups();
            setupEventListeners();
            console.log('Groups page initialized successfully');
        } catch (error) {
            console.error('Error initializing groups:', error);
            showError('Failed to initialize groups page');
        }
    };

    async function loadGroups() {
        console.log('📊 loadGroups called with selectedCompanyId:', selectedCompanyId);
        
        if (!selectedCompanyId) {
            const table = document.getElementById('groupsTable');
            if (table) table.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-400">📋 Please select a company from the dropdown above to view groups</td></tr>';
            console.log('⚠️ No company selected, skipping fetch');
            return;
        }

        try {
            showLoading();
            const url = window.apiConfig.getUrl(`/groups/company/${selectedCompanyId}`);
            const headers = getAuthHeaders();
            
            console.log(`🔍 Fetching groups from URL: ${url}`);
            console.log(`🔍 Company ID type: ${typeof selectedCompanyId}, value: ${selectedCompanyId}`);
            console.log(`🔐 Auth headers:`, {
                hasAuth: !!headers.Authorization,
                hasDevice: !!headers['X-Device-Token'],
                authToken: localStorage.getItem('authToken')?.substring(0, 20) + '...',
                deviceToken: localStorage.getItem('deviceToken')?.substring(0, 20) + '...'
            });
            
            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Groups response:', result);
            
            if (result.success) {
                groups = result.data || [];
                console.log(`📊 Loaded ${groups.length} groups`);
                renderGroupsTable(groups);
            } else {
                throw new Error(result.message || 'Failed to load groups');
            }
        } catch (error) {
            console.error('❌ Error loading groups:', error);
            const table = document.getElementById('groupsTable');
            if (table) table.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-red-500">Error loading groups: ' + error.message + '</td></tr>';
            showError('Failed to load groups: ' + error.message);
        }
    }

    function showLoading() {
        const table = document.getElementById('groupsTable');
        if (table) table.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-400"><span class="animate-pulse">Loading groups...</span></td></tr>';
    }

    function renderGroupsTable(data) {
        const table = document.getElementById('groupsTable');
        if (!table) return;

        if (!Array.isArray(data) || data.length === 0) {
            table.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-400">No groups found for this company</td></tr>';
            return;
        }

        table.innerHTML = data.map(group => `
            <tr class="hover:bg-gray-50">
                <td>
                    <div class="font-medium text-gray-900">${group.grpName || 'N/A'}</div>
                    ${group.grpAlias ? `<div class="text-xs text-gray-500">Alias: ${group.grpAlias}</div>` : ''}
                </td>
                <td class="text-gray-700">${group.grpParent || '-'}</td>
                <td>
                    <span class="px-2 py-1 text-xs rounded-full ${
                        group.grpNature === 'Assets' ? 'bg-blue-100 text-blue-700' :
                        group.grpNature === 'Liabilities' ? 'bg-red-100 text-red-700' :
                        group.grpNature === 'Income' ? 'bg-green-100 text-green-700' :
                        group.grpNature === 'Expense' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                    }">${group.grpNature || 'N/A'}</span>
                </td>
                <td>
                    ${group.isRevenue ? 
                        '<span class="text-green-600 font-medium">✓ Yes</span>' : 
                        '<span class="text-gray-400">✗ No</span>'}
                </td>
                <td>
                    ${group.isActive !== false ? 
                        '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Active</span>' : 
                        '<span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">Inactive</span>'}
                </td>
                <td class="font-mono text-xs text-gray-500">${group.guid ? group.guid.substring(0, 20) + '...' : 'N/A'}</td>
                <td>
                    <div class="flex gap-2">
                        <button class="btn btn-small edit-btn" data-id="${group.grpId}">✏️</button>
                        <button class="btn btn-small delete-btn" data-id="${group.grpId}">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');

        attachRowHandlers();
    }

    async function syncGroupsFromTally() {
        if (!selectedCompanyId) {
            showError('Please select a company first');
            return;
        }

        const syncBtn = document.getElementById('syncGroupsBtn');
        const originalContent = syncBtn.innerHTML;
        
        try {
            syncBtn.disabled = true;
            syncBtn.innerHTML = '<span class="animate-pulse">🔄 Syncing...</span>';
            
            console.log('🔄 Starting Tally sync via Python...');
            showInfo('🔄 Verifying company exists...');

            // Get auth tokens
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            const authToken = localStorage.getItem('authToken');
            const deviceToken = localStorage.getItem('deviceToken');

            // Get Tally port from settings
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            const tallyPort = appSettings.tallyPort || 9000;
            
            // Get backend URL from config
            const backendUrl = window.apiConfig?.baseURL || window.AppConfig?.API_BASE_URL || 'http://localhost:8080';
            
            console.log(`📍 Using Tally Port: ${tallyPort}`);

            if (!authToken || !deviceToken) {
                throw new Error('Authentication required. Please log in again.');
            }

            // ✅ VERIFY COMPANY EXISTS IN BACKEND FIRST
            showInfo('🔍 Checking if company exists in database...');
            const companyCheckResponse = await fetch(window.apiConfig.getUrl(`/companies/${selectedCompanyId}`), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'X-Device-Token': deviceToken
                }
            });

            if (!companyCheckResponse.ok) {
                if (companyCheckResponse.status === 404) {
                    throw new Error(`❌ Company ID ${selectedCompanyId} does not exist in the database.\n\n💡 Please import this company first from the "Import Company" page before syncing groups.`);
                } else {
                    throw new Error(`Failed to verify company: HTTP ${companyCheckResponse.status}`);
                }
            }

            const companyData = await companyCheckResponse.json();
            console.log('✅ Company verified:', companyData.data?.name || 'Unknown');
            showInfo(`✅ Company verified: ${companyData.data?.name || 'Company ID ' + selectedCompanyId}`);

            // Check if Electron API is available
            if (!window.electronAPI || !window.electronAPI.syncGroups) {
                throw new Error('Electron API not available. Please restart the application (stop and run "npm start" again).');
            }

            showInfo('🔄 Connecting to Tally Prime...');
            
            console.log(`🌐 Using Backend URL: ${backendUrl}`);

            // Call Python sync via Electron IPC
            const result = await window.electronAPI.syncGroups({
                companyId: selectedCompanyId,
                userId: currentUser?.userId || 1,
                authToken: authToken,
                deviceToken: deviceToken,
                tallyPort: tallyPort,
                backendUrl: backendUrl
            });

            console.log('✅ Sync result:', JSON.stringify(result, null, 2));

            if (result.success) {
                showSuccess(`✅ Successfully synced ${result.count} groups from Tally to database!`);
                await loadGroups(); // Reload the table
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
                
                showError(errorMessage);
                return; // Exit early, no need to throw
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
            
            showError(errorMessage);
        } finally {
            syncBtn.disabled = false;
            syncBtn.innerHTML = originalContent;
        }
    }

    function setupEventListeners() {
        const modal = document.getElementById('groupModal');
        const addBtn = document.getElementById('addGroupBtn');
        const syncBtn = document.getElementById('syncGroupsBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const closeBtn = document.querySelector('.close-btn');
        const form = document.getElementById('groupForm');
        const searchInput = document.getElementById('groupSearch');
        const typeFilter = document.getElementById('groupTypeFilter');

        if (syncBtn) syncBtn.addEventListener('click', syncGroupsFromTally);

        if (addBtn) addBtn.addEventListener('click', () => {
            if (!selectedCompanyId) {
                showError('Please select a company first');
                return;
            }
            document.getElementById('modalTitle').textContent = 'Add Group';
            form.reset();
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        });

        const closeModal = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        };

        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);

        if (form) form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            const groupData = {
                cmpId: selectedCompanyId,
                userId: currentUser.userId,
                grpName: document.getElementById('groupName').value,
                grpNature: document.getElementById('groupType').value,
                grpParent: 'Primary',
                isActive: true
            };

            try {
                const response = await fetch(window.apiConfig.getUrl('/groups'), {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(groupData)
                });

                const result = await response.json();
                if (result.success) {
                    closeModal();
                    showSuccess('Group created successfully');
                    await loadGroups();
                } else {
                    throw new Error(result.message || 'Failed to create group');
                }
            } catch (error) {
                console.error('Error saving group:', error);
                showError('Failed to save group');
            }
        });

        if (searchInput) searchInput.addEventListener('input', filterGroups);
        if (typeFilter) typeFilter.addEventListener('change', filterGroups);

        window.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    function attachRowHandlers() {
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.closest('button').getAttribute('data-id');
                if (confirm('Are you sure you want to delete this group?')) {
                    try {
                        const response = await fetch(window.apiConfig.getUrl(`/groups/${id}`), {
                            method: 'DELETE',
                            headers: getAuthHeaders()
                        });
                        const result = await response.json();
                        if (result.success) {
                            showSuccess('Group deleted successfully');
                            await loadGroups();
                        } else {
                            throw new Error(result.message || 'Delete failed');
                        }
                    } catch (error) {
                        console.error('Error deleting group:', error);
                        showError('Failed to delete group');
                    }
                }
            });
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.closest('button').getAttribute('data-id');
                // TODO: Implement edit functionality
                showInfo('Edit functionality coming soon');
            });
        });
    }

    function filterGroups() {
        const search = document.getElementById('groupSearch').value.toLowerCase();
        const type = document.getElementById('groupTypeFilter').value;

        const filtered = groups.filter(group => {
            const matchesSearch = (group.grpName || '').toLowerCase().includes(search) ||
                                (group.grpAlias || '').toLowerCase().includes(search);
            
            let matchesType = true;
            if (type === 'revenue') matchesType = group.isRevenue === true;
            else if (type === 'balancesheet') matchesType = group.isRevenue === false;
            else if (type === 'primary') matchesType = group.grpParent === 'Primary';

            return matchesSearch && matchesType;
        });

        renderGroupsTable(filtered);
        updateStats(filtered);
    }

    function showError(message) {
        console.error(message);
        if (window.notificationService) {
            window.notificationService.error(message);
        } else {
            alert('❌ ' + message);
        }
    }

    function showSuccess(message) {
        console.log('✅', message);
        if (window.notificationService) {
            window.notificationService.success(message);
        } else {
            // Show temporary success message
            const msg = document.createElement('div');
            msg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
            msg.textContent = message;
            document.body.appendChild(msg);
            setTimeout(() => msg.remove(), 3000);
        }
    }

    function showInfo(message) {
        console.log('ℹ️', message);
        if (window.notificationService) {
            window.notificationService.info(message);
        } else {
            const msg = document.createElement('div');
            msg.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
            msg.textContent = message;
            document.body.appendChild(msg);
            setTimeout(() => msg.remove(), 3000);
        }
    }

    // Export sync function for use by other pages
    window.syncGroupsForCompany = async function(companyId) {
        selectedCompanyId = companyId;
        await syncGroupsFromTally();
    };

})();
