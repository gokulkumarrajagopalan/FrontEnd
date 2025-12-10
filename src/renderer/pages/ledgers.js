(function () {
    const getLedgersTemplate = () => `
    <div id="ledgersPageContainer" class="space-y-6">
        <div class="page-header flex justify-between items-center">
            <div>
                <h2>Ledgers</h2>
                <p>Manage chart of accounts and ledger details.</p>
            </div>
            <div class="flex gap-3">
                <button id="syncLedgersBtn" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-2">
                    🔄 Sync from Tally
                </button>
                <button id="addLedgerBtn" class="btn btn-primary">+ Create Ledger</button>
            </div>
        </div>

        <div class="flex gap-4 mb-6">
            <div class="relative flex-1">
                <input id="ledgerSearch" placeholder="Search ledgers..." class="w-full px-4 py-2 pl-10 border border-gray-200 rounded-lg">
                <span class="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>
            <select id="groupFilter" class="px-4 py-2 border border-gray-200 rounded-lg">
                <option value="">All Groups</option>
            </select>
            <button class="btn btn-secondary">Import</button>
        </div>

        <div class="table-responsive">
            <table id="ledgersTable" class="table w-full">
                <thead>
                    <tr>
                        <th class="text-left p-3">Name</th>
                        <th class="text-left p-3">Group</th>
                        <th class="text-left p-3">Opening Balance</th>
                        <th class="text-left p-3">Current Balance</th>
                        <th class="text-left p-3">Actions</th>
                    </tr>
                </thead>
                <tbody id="ledgersTableBody">
                    <!-- Populated by JS -->
                </tbody>
            </table>
        </div>

        <!-- Add/Edit Modal -->
        <div id="ledgerModal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50">
            <div class="bg-white rounded-xl w-full max-w-md mx-4 overflow-hidden">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 id="modalTitle" class="font-bold text-gray-800">Add Ledger</h3>
                    <button class="text-gray-400 hover:text-gray-600 text-2xl close-btn">&times;</button>
                </div>
                <form id="ledgerForm" class="p-6 space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Ledger Name *</label>
                        <input type="text" id="ledgerName" class="w-full px-3 py-2 border border-gray-200 rounded-lg" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Under Group *</label>
                        <select id="ledgerGroup" class="w-full px-3 py-2 border border-gray-200 rounded-lg" required>
                            <!-- Populated by JS -->
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Opening Balance</label>
                        <input type="number" id="openingBalance" class="w-full px-3 py-2 border border-gray-200 rounded-lg" step="0.01" placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Description / Address</label>
                        <textarea id="ledgerDescription" class="w-full px-3 py-2 border border-gray-200 rounded-lg" rows="3"></textarea>
                    </div>
                    <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg" id="cancelBtn">Cancel</button>
                        <button type="submit" class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Save Ledger</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;

    if (!window.API_BASE_URL) {
        window.API_BASE_URL = window.AppConfig ? window.AppConfig.API_BASE_URL : 'http://localhost:8080';
    }

    let allLedgers = [];
    let allGroups = [];

    function getAuthHeaders() {
        const authToken = localStorage.getItem('authToken');
        const deviceToken = localStorage.getItem('deviceToken');
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        if (deviceToken) {
            headers['X-Device-Token'] = deviceToken;
        }
        
        return headers;
    }

    async function loadGroups(companyId) {
        if (!companyId) {
            allGroups = [];
            const groupFilter = document.getElementById('groupFilter');
            if (groupFilter) {
                groupFilter.innerHTML = '<option value="">All Groups</option>';
            }
            const ledgerGroup = document.getElementById('ledgerGroup');
            if (ledgerGroup) {
                ledgerGroup.innerHTML = '<option value="">Select Company First</option>';
            }
            return;
        }
        
        try {
            console.log('🔄 Loading groups for company:', companyId);
            const response = await fetch(`${window.API_BASE_URL}/groups/company/${companyId}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            console.log('📥 Groups response status:', response.status);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const result = await response.json();
            allGroups = result.success ? result.data : [];

            // Populate group filter
            const groupFilter = document.getElementById('groupFilter');
            if (groupFilter) {
                groupFilter.innerHTML = '<option value="">All Groups</option>';
                allGroups.forEach(group => {
                    const option = document.createElement('option');
                    option.value = group.grpId;
                    option.textContent = group.grpName || 'Unnamed Group';
                    groupFilter.appendChild(option);
                });
            }

            // Populate group dropdown in form
            const ledgerGroup = document.getElementById('ledgerGroup');
            if (ledgerGroup) {
                ledgerGroup.innerHTML = '<option value="">Select Group</option>';
                allGroups.forEach(group => {
                    const option = document.createElement('option');
                    option.value = group.grpId;
                    option.textContent = group.grpName || 'Unnamed Group';
                    ledgerGroup.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading groups:', error);
            showError('Failed to load groups');
        }
    }

    async function loadLedgers(companyId) {
        const tbody = document.getElementById('ledgersTableBody');
        
        if (!companyId) {
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-400">📋 Please select a company from the dropdown above to view ledgers</td></tr>';
            }
            allLedgers = [];
            return;
        }
        
        try {
            console.log('🔄 Loading ledgers for company:', companyId);
            
            // Show loading state
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8"><div class="flex items-center justify-center gap-2"><span class="animate-spin">⏳</span> Loading ledgers...</div></td></tr>';
            }
            
            const response = await fetch(`${window.API_BASE_URL}/ledgers/company/${companyId}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            console.log('📥 Ledgers response status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const ledgers = await response.json();
            console.log(`✅ Loaded ${ledgers.length} ledgers`);
            
            allLedgers = Array.isArray(ledgers) ? ledgers : [];
            renderLedgersTable(allLedgers);
            
        } catch (error) {
            console.error('❌ Error loading ledgers:', error);
            allLedgers = [];
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-red-500">
                    ❌ Error loading ledgers: ${error.message}<br>
                    <small class="text-gray-500">Please check if backend is running on port 8080</small>
                </td></tr>`;
            }
        }
    }

    function renderLedgersTable(ledgers) {
        const tbody = document.getElementById('ledgersTableBody');
        if (!tbody) return;

        if (!Array.isArray(ledgers) || ledgers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-500">📋 No ledgers found. Click "Sync from Tally" to import ledgers.</td></tr>';
            return;
        }

        tbody.innerHTML = ledgers.map(ledger => {
            // Find parent group name
            const parentGroupName = ledger.ledParent || ledger.ledPrimaryGroup || 'N/A';
            
            // Format opening balance
            const openingBalance = ledger.ledOpeningBalance || 0;
            const formattedBalance = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 2
            }).format(openingBalance);
            
            // Current balance (same as opening for now, until we implement transactions)
            const currentBalance = openingBalance;
            const formattedCurrentBalance = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 2
            }).format(currentBalance);
            
            // Status badge
            const statusBadge = ledger.isActive 
                ? '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Active</span>'
                : '<span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">Inactive</span>';
            
            // GST/VAT indicator
            let taxBadge = '';
            if (ledger.gstApplicable && ledger.gstGstin) {
                taxBadge = `<span class="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700" title="GST: ${ledger.gstGstin}">GST</span>`;
            } else if (ledger.vatApplicable && ledger.vatTinNumber) {
                taxBadge = `<span class="px-2 py-1 text-xs rounded bg-purple-100 text-purple-700" title="VAT: ${ledger.vatTinNumber}">VAT</span>`;
            }
            
            return `
                <tr class="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td class="p-3">
                        <div class="flex flex-col">
                            <span class="font-medium text-gray-900">${ledger.ledName || 'N/A'}</span>
                            ${ledger.ledEmail ? `<span class="text-xs text-gray-500">${ledger.ledEmail}</span>` : ''}
                            ${taxBadge ? `<div class="mt-1">${taxBadge}</div>` : ''}
                        </div>
                    </td>
                    <td class="p-3">
                        <div class="flex flex-col">
                            <span class="text-gray-700">${parentGroupName}</span>
                            ${ledger.ledPrimaryGroup && ledger.ledPrimaryGroup !== parentGroupName 
                                ? `<span class="text-xs text-gray-400">${ledger.ledPrimaryGroup}</span>` 
                                : ''}
                        </div>
                    </td>
                    <td class="p-3 text-right">
                        <span class="font-mono ${openingBalance >= 0 ? 'text-green-600' : 'text-red-600'}">
                            ${formattedBalance}
                        </span>
                    </td>
                    <td class="p-3 text-right">
                        <span class="font-mono ${currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}">
                            ${formattedCurrentBalance}
                        </span>
                    </td>
                    <td class="p-3">
                        <div class="flex gap-2 items-center">
                            <button class="text-blue-600 hover:text-blue-800 transition-colors edit-btn" data-id="${ledger.ledId}" title="Edit ledger">
                                <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                            </button>
                            <button class="text-red-600 hover:text-red-800 transition-colors delete-btn" data-id="${ledger.ledId}" title="Delete ledger">
                                <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        attachRowHandlers();
    }

    async function syncLedgersFromTally() {
        const selectedCompanyId = window.selectedCompanyId;
        
        if (!selectedCompanyId) {
            window.notificationService.error('Please select a company first');
            return;
        }

        const syncBtn = document.getElementById('syncLedgersBtn');
        const originalContent = syncBtn.innerHTML;
        
        try {
            syncBtn.disabled = true;
            syncBtn.innerHTML = '<span class="animate-pulse">🔄 Syncing...</span>';
            
            console.log('🔄 Starting Tally ledgers sync via Python...');
            window.notificationService.info('🔄 Connecting to Tally Prime...');

            // Get auth tokens
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            const authToken = localStorage.getItem('authToken');
            const deviceToken = localStorage.getItem('deviceToken');

            if (!authToken || !deviceToken) {
                throw new Error('Authentication required. Please log in again.');
            }

            // Check if Electron API is available
            if (!window.electronAPI || !window.electronAPI.syncLedgers) {
                throw new Error('Electron API not available. Please restart the application.');
            }

            // Call Python sync via Electron IPC
            const result = await window.electronAPI.syncLedgers({
                companyId: selectedCompanyId,
                userId: currentUser?.userId || 1,
                authToken: authToken,
                deviceToken: deviceToken
            });

            console.log('✅ Ledgers sync result:', JSON.stringify(result, null, 2));

            if (result.success) {
                window.notificationService.success(`✅ Successfully synced ${result.count} ledgers from Tally to database!`);
                await loadLedgers(selectedCompanyId); // Reload the table
            } else {
                console.error('❌ Ledgers sync failed with result:', result);
                
                // Build detailed error message
                let errorMessage = 'Failed to sync ledgers: ' + (result.message || 'Sync failed');
                
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
                
                window.notificationService.error(errorMessage);
                return; // Exit early, no need to throw
            }

        } catch (error) {
            console.error('❌ Ledgers sync error:', error);
            
            let errorMessage = 'Failed to sync ledgers: ';
            if (error.message && error.message.includes('Authentication required')) {
                errorMessage += 'Please log in again.';
            } else if (error.message && error.message.includes('Electron API not available')) {
                errorMessage += error.message;
            } else {
                errorMessage += (error.message || 'Unknown error');
            }
            
            window.notificationService.error(errorMessage);
        } finally {
            syncBtn.disabled = false;
            syncBtn.innerHTML = originalContent;
        }
    }

    function setupEventListeners() {
        const modal = document.getElementById('ledgerModal');
        const addBtn = document.getElementById('addLedgerBtn');
        const syncBtn = document.getElementById('syncLedgersBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const closeBtn = document.querySelector('.close-btn');
        const form = document.getElementById('ledgerForm');
        const searchInput = document.getElementById('ledgerSearch');
        const groupFilter = document.getElementById('groupFilter');

        if (addBtn) {
            addBtn.addEventListener('click', () => {
                document.getElementById('modalTitle').textContent = 'Add Ledger';
                document.getElementById('ledgerForm').reset();
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            });
        }

        if (syncBtn) {
            syncBtn.addEventListener('click', syncLedgersFromTally);
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            });
        }

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const ledgerData = {
                    name: document.getElementById('ledgerName').value,
                    groupId: document.getElementById('ledgerGroup').value,
                    openingBalance: parseFloat(document.getElementById('openingBalance').value) || 0,
                    description: document.getElementById('ledgerDescription').value || ''
                };

                try {
                    const response = await fetch(`${window.API_BASE_URL}/ledgers`, {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify(ledgerData)
                    });

                    if (response.ok) {
                        modal.classList.add('hidden');
                        modal.classList.remove('flex');
                        showSuccess('Ledger saved successfully');
                        await loadLedgers();
                    } else {
                        throw new Error(`HTTP ${response.status}`);
                    }
                } catch (error) {
                    console.error('Error saving ledger:', error);
                    showError('Failed to save ledger');
                }
            });
        }

        if (searchInput) searchInput.addEventListener('input', () => filterLedgers());
        if (groupFilter) groupFilter.addEventListener('change', () => filterLedgers());

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        });
    }

    function attachRowHandlers() {
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this ledger?')) {
                    try {
                        const response = await fetch(`${window.API_BASE_URL}/ledgers/${id}`, {
                            method: 'DELETE',
                            headers: getAuthHeaders()
                        });
                        if (response.ok) {
                            showSuccess('Ledger deleted successfully');
                            await loadLedgers();
                        } else {
                            throw new Error(`HTTP ${response.status}`);
                        }
                    } catch (error) {
                        console.error('Error deleting ledger:', error);
                        showError('Failed to delete ledger');
                    }
                }
            });
        });

        // Edit handler would go here (omitted for brevity as it wasn't fully implemented in original)
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                // TODO: Implement edit logic
                console.log('Edit ledger', id);
            });
        });
    }

    function filterLedgers() {
        const search = document.getElementById('ledgerSearch').value.toLowerCase();
        const groupId = document.getElementById('groupFilter').value;

        const filtered = allLedgers.filter(ledger => {
            const matchesSearch = (ledger.name || '').toLowerCase().includes(search);
            const matchesGroup = !groupId || (ledger.groupId || ledger.groupId) === groupId;
            return matchesSearch && matchesGroup;
        });

        renderLedgersTable(filtered);
    }

    function showError(message) {
        console.error(message);
        const alert = document.createElement('div');
        alert.className = 'fixed top-5 right-5 px-6 py-3 rounded shadow-lg z-50 text-white bg-red-500';
        alert.textContent = message;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 3000);
    }

    function showSuccess(message) {
        console.log(message);
        const alert = document.createElement('div');
        alert.className = 'fixed top-5 right-5 px-6 py-3 rounded shadow-lg z-50 text-white bg-green-500';
        alert.textContent = message;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 3000);
    }

    window.initializeLedgers = async function () {
        console.log('🔧 Initializing Ledgers Page...');
        
        // Check authentication before loading
        const authToken = localStorage.getItem('authToken');
        const deviceToken = localStorage.getItem('deviceToken');
        
        if (!authToken || !deviceToken) {
            console.error('❌ Authentication required');
            window.notificationService?.error('Please log in to access ledgers');
            window.router?.navigate('auth');
            return;
        }
        
        console.log('✅ Authentication verified');
        
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getLedgersTemplate();
            
            // Use global company selector
            const selectedCompanyId = window.selectedCompanyId || null;
            console.log('📌 Selected company ID:', selectedCompanyId);
            
            // Listen for global company changes
            window.addEventListener('companyChanged', async (e) => {
                console.log('🔄 Company changed to:', e.detail.companyId);
                await loadGroups(e.detail.companyId);
                await loadLedgers(e.detail.companyId);
            });
            
            await loadGroups(selectedCompanyId);
            await loadLedgers(selectedCompanyId);
            setupEventListeners();
        }
    };
})();
