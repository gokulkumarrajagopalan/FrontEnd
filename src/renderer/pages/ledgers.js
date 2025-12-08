(function () {
    const getLedgersTemplate = () => `
    <div id="ledgersPageContainer" class="space-y-6">
        <div class="page-header flex justify-between items-center">
            <div>
                <h2>Ledgers</h2>
                <p>Manage chart of accounts and ledger details.</p>
            </div>
            <button id="addLedgerBtn" class="btn btn-primary">+ Create Ledger</button>
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
        const token = localStorage.getItem('authToken');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    }

    async function loadGroups() {
        try {
            console.log('Loading groups...');
            const response = await fetch(`${window.API_BASE_URL}/groups`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            allGroups = Array.isArray(data) ? data : (data.data || []);

            // Populate group filter
            const groupFilter = document.getElementById('groupFilter');
            if (groupFilter) {
                groupFilter.innerHTML = '<option value="">All Groups</option>';
                allGroups.forEach(group => {
                    const option = document.createElement('option');
                    option.value = group.id || group._id;
                    option.textContent = group.name || 'Unnamed Group';
                    groupFilter.appendChild(option);
                });
            }

            // Populate group dropdown in form
            const ledgerGroup = document.getElementById('ledgerGroup');
            if (ledgerGroup) {
                ledgerGroup.innerHTML = '<option value="">Select Group</option>';
                allGroups.forEach(group => {
                    const option = document.createElement('option');
                    option.value = group.id || group._id;
                    option.textContent = group.name || 'Unnamed Group';
                    ledgerGroup.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading groups:', error);
            showError('Failed to load groups');
        }
    }

    async function loadLedgers() {
        try {
            console.log('Loading ledgers...');
            const response = await fetch(`${window.API_BASE_URL}/ledgers`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            allLedgers = Array.isArray(data) ? data : (data.data || []);

            renderLedgersTable(allLedgers);
        } catch (error) {
            console.error('Error loading ledgers:', error);
            const tbody = document.getElementById('ledgersTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">Error loading ledgers. Please refresh.</td></tr>';
            }
        }
    }

    function renderLedgersTable(ledgers) {
        const tbody = document.getElementById('ledgersTableBody');
        if (!tbody) return;

        if (!Array.isArray(ledgers) || ledgers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No ledgers found</td></tr>';
            return;
        }

        tbody.innerHTML = ledgers.map(ledger => {
            const groupName = allGroups.find(g => (g.id || g._id) === ledger.groupId)?.name || 'Unassigned';
            return `
                <tr class="border-b border-gray-50 hover:bg-gray-50">
                    <td class="p-3">${ledger.name || 'N/A'}</td>
                    <td class="p-3">${groupName}</td>
                    <td class="p-3">₹${(ledger.openingBalance || 0).toFixed(2)}</td>
                    <td class="p-3">₹${(ledger.balance || 0).toFixed(2)}</td>
                    <td class="p-3">
                        <div class="flex gap-2">
                            <button class="text-blue-600 hover:text-blue-800 edit-btn" data-id="${ledger.id || ledger._id}">Edit</button>
                            <button class="text-red-600 hover:text-red-800 delete-btn" data-id="${ledger.id || ledger._id}">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        attachRowHandlers();
    }

    function setupEventListeners() {
        const modal = document.getElementById('ledgerModal');
        const addBtn = document.getElementById('addLedgerBtn');
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
        console.log('Initializing Ledgers Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getLedgersTemplate();
            await loadGroups();
            await loadLedgers();
            setupEventListeners();
        }
    };
})();
