(function () {
    const getTemplate = () => `
    <div id="companySyncPageContainer" class="space-y-6">
        <div class="page-header flex justify-between items-center">
            <div>
                <h2>Company Sync Details</h2>
                <p>View imported companies and their synchronization status</p>
            </div>
            <button id="importMoreBtn" class="btn btn-primary">
                <span>➕</span>
                <span>Import More</span>
            </button>
        </div>

        <!-- Search and Filter -->
        <div class="flex gap-4 mb-6">
            <input type="text" id="companySearch" placeholder="Search by name, code, GUID..." class="flex-1 px-4 py-2 border border-gray-200 rounded-lg">
            <select id="syncStatusFilter" class="px-4 py-2 border border-gray-200 rounded-lg">
                <option value="">All Status</option>
                <option value="synced">Synced</option>
                <option value="pending">Pending</option>
                <option value="error">Error</option>
            </select>
            <select id="companyStatusFilter" class="px-4 py-2 border border-gray-200 rounded-lg">
                <option value="">All Companies</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
            </select>
        </div>

        <!-- Statistics -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <p class="text-sm text-gray-500 uppercase font-medium mb-2">Total Companies</p>
                <p class="text-3xl font-bold text-blue-600" id="totalCompanies">0</p>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <p class="text-sm text-gray-500 uppercase font-medium mb-2">Synced</p>
                <p class="text-3xl font-bold text-green-600" id="syncedCount">0</p>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <p class="text-sm text-gray-500 uppercase font-medium mb-2">Pending</p>
                <p class="text-3xl font-bold text-yellow-600" id="pendingCount">0</p>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <p class="text-sm text-gray-500 uppercase font-medium mb-2">Errors</p>
                <p class="text-3xl font-bold text-red-600" id="errorCount">0</p>
            </div>
        </div>

        <!-- Companies Table -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Company Name</th>
                            <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Code</th>
                            <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">State</th>
                            <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Sync Status</th>
                            <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Last Sync</th>
                            <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                            <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="companiesTableBody">
                        <tr><td colspan="7" class="px-6 py-8 text-center text-gray-400">No companies imported yet. Click 'Import More' to add companies.</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Sync Details Modal -->
        <div id="syncDetailsModal" style="display: none;" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-xl shadow-lg max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
                <div class="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 class="text-xl font-bold text-gray-800">Company Sync Details</h3>
                    <button id="closeModalBtn" class="text-2xl text-gray-400 hover:text-gray-600">&times;</button>
                </div>
                <div id="modalContent" class="p-6 space-y-4">
                    <!-- Details will be populated here -->
                </div>
            </div>
        </div>
    </div>
    `;

    let companies = [];

    function loadCompanies() {
        const stored = localStorage.getItem('companies');
        if (stored) {
            companies = JSON.parse(stored);
        } else {
            companies = [];
        }
        renderTable();
        updateStatistics();
    }

    function updateStatistics() {
        const total = companies.length;
        const synced = companies.filter(c => c.syncStatus === 'synced').length;
        const pending = companies.filter(c => c.syncStatus === 'pending').length;
        const error = companies.filter(c => c.syncStatus === 'error').length;

        document.getElementById('totalCompanies').textContent = total;
        document.getElementById('syncedCount').textContent = synced;
        document.getElementById('pendingCount').textContent = pending;
        document.getElementById('errorCount').textContent = error;
    }

    function renderTable() {
        const tableBody = document.getElementById('companiesTableBody');
        const searchTerm = document.getElementById('companySearch')?.value.toLowerCase() || '';
        const syncFilter = document.getElementById('syncStatusFilter')?.value || '';
        const statusFilter = document.getElementById('companyStatusFilter')?.value || '';

        let filtered = companies.filter(company => {
            const matchesSearch = !searchTerm || 
                company.name.toLowerCase().includes(searchTerm) ||
                company.code.toLowerCase().includes(searchTerm) ||
                company.guid.toLowerCase().includes(searchTerm);
            const matchesSync = !syncFilter || company.syncStatus === syncFilter;
            const matchesStatus = !statusFilter || company.status === statusFilter;
            return matchesSearch && matchesSync && matchesStatus;
        });

        if (filtered.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="px-6 py-8 text-center text-gray-400">No companies found</td></tr>';
            return;
        }

        tableBody.innerHTML = filtered.map(company => `
            <tr class="border-b border-gray-200 hover:bg-gray-50">
                <td class="px-6 py-4">
                    <div>
                        <p class="font-medium text-gray-900">${company.name}</p>
                        <p class="text-xs text-gray-500">ID: ${company.id.substring(0, 12)}...</p>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <span class="font-mono text-sm font-medium">${company.code}</span>
                </td>
                <td class="px-6 py-4">
                    <span class="text-sm text-gray-600">${company.state || '--'}</span>
                </td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-full text-xs font-medium ${
                        company.syncStatus === 'synced' ? 'bg-green-100 text-green-800' :
                        company.syncStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                    }">
                        ${company.syncStatus || 'unknown'}
                    </span>
                </td>
                <td class="px-6 py-4">
                    <span class="text-sm text-gray-500">${company.lastSyncDate ? new Date(company.lastSyncDate).toLocaleString() : '--'}</span>
                </td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-full text-xs font-medium ${
                        company.status === 'active' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                    }">
                        ${company.status || 'active'}
                    </span>
                </td>
                <td class="px-6 py-4">
                    <button class="view-details-btn text-blue-600 hover:text-blue-800 font-medium" data-id="${company.id}">View</button>
                </td>
            </tr>
        `).join('');

        // Add event listeners to view buttons
        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const company = companies.find(c => c.id === id);
                if (company) {
                    showSyncDetails(company);
                }
            });
        });
    }

    function showSyncDetails(company) {
        const modal = document.getElementById('syncDetailsModal');
        const content = document.getElementById('modalContent');

        const lastSync = company.lastSyncDate ? new Date(company.lastSyncDate).toLocaleString() : 'Never';
        const imported = company.importedDate ? new Date(company.importedDate).toLocaleString() : '--';

        content.innerHTML = `
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm text-gray-500 uppercase font-semibold">Company Name</p>
                        <p class="text-lg font-bold text-gray-900">${company.name}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500 uppercase font-semibold">Code</p>
                        <p class="text-lg font-mono font-bold text-gray-900">${company.code}</p>
                    </div>
                </div>

                <hr class="my-4">

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm text-gray-500 uppercase font-semibold">Sync Status</p>
                        <p class="text-base font-medium ${
                            company.syncStatus === 'synced' ? 'text-green-600' :
                            company.syncStatus === 'pending' ? 'text-yellow-600' :
                            'text-red-600'
                        }">${company.syncStatus || 'unknown'}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500 uppercase font-semibold">Company Status</p>
                        <p class="text-base font-medium text-gray-900">${company.status || 'active'}</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm text-gray-500 uppercase font-semibold">Last Sync</p>
                        <p class="text-sm text-gray-700">${lastSync}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500 uppercase font-semibold">Imported Date</p>
                        <p class="text-sm text-gray-700">${imported}</p>
                    </div>
                </div>

                <hr class="my-4">

                <div>
                    <p class="text-sm text-gray-500 uppercase font-semibold mb-2">GUID</p>
                    <p class="text-xs font-mono bg-gray-100 p-3 rounded text-gray-700">${company.guid}</p>
                </div>

                <div>
                    <p class="text-sm text-gray-500 uppercase font-semibold mb-2">Business Type</p>
                    <p class="text-sm text-gray-700">${company.businessType}</p>
                </div>

                ${company.email ? `
                <div>
                    <p class="text-sm text-gray-500 uppercase font-semibold mb-2">Email</p>
                    <p class="text-sm text-gray-700">${company.email}</p>
                </div>
                ` : ''}

                ${company.state ? `
                <div>
                    <p class="text-sm text-gray-500 uppercase font-semibold mb-2">State</p>
                    <p class="text-sm text-gray-700">${company.state}</p>
                </div>
                ` : ''}

                <div class="flex gap-3 pt-4">
                    <button class="btn btn-primary flex-1" onclick="document.getElementById('syncDetailsModal').style.display='none'">Close</button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    }

    function setupEventListeners() {
        const importBtn = document.getElementById('importMoreBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                window.router.navigate('import-company');
            });
        }

        const searchInput = document.getElementById('companySearch');
        if (searchInput) {
            searchInput.addEventListener('input', renderTable);
        }

        const syncFilter = document.getElementById('syncStatusFilter');
        if (syncFilter) {
            syncFilter.addEventListener('change', renderTable);
        }

        const statusFilter = document.getElementById('companyStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', renderTable);
        }

        const closeModal = document.getElementById('closeModalBtn');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                document.getElementById('syncDetailsModal').style.display = 'none';
            });
        }

        // Close modal on background click
        const modal = document.getElementById('syncDetailsModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
    }

    window.initializeCompanySync = function () {
        console.log('Initializing Company Sync Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getTemplate();
            loadCompanies();
            setupEventListeners();
            console.log('✅ Company Sync Page initialized');
        }
    };
})();
