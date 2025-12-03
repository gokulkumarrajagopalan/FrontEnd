
// Groups Page Module
(function () {
    // State
    let groups = [];

    // HTML Template
    const getTemplate = () => `
    <div id="groupsPageContainer" class="space-y-6">
        <div class="page-header">
            <h2>Account Groups</h2>
            <p>Manage ledger groups</p>
        </div>

        <div class="flex gap-4 mb-6">
            <input type="text" id="groupSearch" placeholder="Search groups..." class="flex-1 px-4 py-2 border border-gray-200 rounded-lg">
            <select id="groupTypeFilter" class="px-4 py-2 border border-gray-200 rounded-lg">
                <option value="">All Types</option>
                <option value="ASSETS">Assets</option>
                <option value="LIABILITIES">Liabilities</option>
                <option value="EQUITY">Equity</option>
                <option value="INCOME">Income</option>
                <option value="EXPENSE">Expense</option>
            </select>
            <button class="btn btn-primary" id="addGroupBtn">+ Add Group</button>
        </div>

        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Group Name</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody id="groupsTable">
                    <tr><td colspan="4" style="text-align: center; color: #999;">Loading...</td></tr>
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
        const token = localStorage.getItem('authToken');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
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
            await loadGroups();
            setupEventListeners();
            console.log('Groups page initialized successfully');
        } catch (error) {
            console.error('Error initializing groups:', error);
            showError('Failed to initialize groups page');
        }
    };

    async function loadGroups() {
        try {
            const response = await fetch(`${window.AppConfig.API_BASE_URL}/groups`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            groups = Array.isArray(data) ? data : (data.data || []);
            renderGroupsTable(groups);
        } catch (error) {
            console.error('Error loading groups:', error);
            const table = document.getElementById('groupsTable');
            if (table) table.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999;">Error loading groups. Please refresh.</td></tr>';
        }
    }

    function renderGroupsTable(data) {
        const table = document.getElementById('groupsTable');
        if (!table) return;

        if (!Array.isArray(data) || data.length === 0) {
            table.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999;">No groups found</td></tr>';
            return;
        }

        table.innerHTML = data.map(group => `
            <tr>
                <td>${group.name || 'N/A'}</td>
                <td><span class="type-badge">${group.type || 'N/A'}</span></td>
                <td>${group.description || '-'}</td>
                <td>
                    <button class="btn btn-small edit-btn" data-id="${group.id || group._id}">Edit</button>
                    <button class="btn btn-small delete-btn" data-id="${group.id || group._id}">Delete</button>
                </td>
            </tr>
        `).join('');

        attachRowHandlers();
    }

    function setupEventListeners() {
        const modal = document.getElementById('groupModal');
        const addBtn = document.getElementById('addGroupBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const closeBtn = document.querySelector('.close-btn');
        const form = document.getElementById('groupForm');
        const searchInput = document.getElementById('groupSearch');
        const typeFilter = document.getElementById('groupTypeFilter');

        if (addBtn) addBtn.addEventListener('click', () => {
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
            const groupData = {
                name: document.getElementById('groupName').value,
                type: document.getElementById('groupType').value,
                description: document.getElementById('groupDescription').value
            };

            try {
                const response = await fetch(`${window.AppConfig.API_BASE_URL}/groups`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(groupData)
                });

                if (response.ok) {
                    closeModal();
                    showSuccess('Group saved successfully');
                    await loadGroups();
                } else {
                    throw new Error(`HTTP ${response.status}`);
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
                const id = e.target.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this group?')) {
                    try {
                        const response = await fetch(`${window.AppConfig.API_BASE_URL}/groups/${id}`, {
                            method: 'DELETE',
                            headers: getAuthHeaders()
                        });
                        if (response.ok) {
                            showSuccess('Group deleted successfully');
                            await loadGroups();
                        } else {
                            throw new Error(`HTTP ${response.status}`);
                        }
                    } catch (error) {
                        console.error('Error deleting group:', error);
                        showError('Failed to delete group');
                    }
                }
            });
        });
    }

    function filterGroups() {
        const search = document.getElementById('groupSearch').value.toLowerCase();
        const type = document.getElementById('groupTypeFilter').value;

        const filtered = groups.filter(group => {
            const matchesSearch = (group.name || '').toLowerCase().includes(search);
            const matchesType = !type || group.type === type;
            return matchesSearch && matchesType;
        });

        renderGroupsTable(filtered);
    }

    function showError(message) {
        if (window.notificationService) {
            window.notificationService.error(message);
        } else {
            alert(message);
        }
    }

    function showSuccess(message) {
        if (window.notificationService) {
            window.notificationService.success(message);
        } else {
            alert(message);
        }
    }

})();
