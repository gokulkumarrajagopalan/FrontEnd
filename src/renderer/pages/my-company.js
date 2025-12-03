(function () {
    const getTemplate = () => `
    <div id="myCompanyPageContainer" class="space-y-6">
        <div class="page-header flex justify-between items-center">
            <div>
                <h2>My Company</h2>
                <p>View and manage company information</p>
            </div>
            <button id="addCompanyBtn" class="btn btn-primary">+ Add Company</button>
        </div>

        <div class="flex gap-4 mb-6">
            <input type="text" id="companySearch" placeholder="Search by name, code..." class="flex-1 px-4 py-2 border border-gray-200 rounded-lg">
            <select id="companyStatusFilter" class="px-4 py-2 border border-gray-200 rounded-lg">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
            </select>
        </div>

        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Company Name</th>
                        <th>Business Type</th>
                        <th>GSTIN</th>
                        <th>Address</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="companiesTableBody">
                    <tr><td colspan="7" class="text-center py-8 text-gray-400">No companies found. Click 'Add Company' to create one.</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    `;

    const companies = [];

    function renderCompaniesTable() {
        const tableBody = document.getElementById('companiesTableBody');
        if (!tableBody) return;

        const searchTerm = document.getElementById('companySearch')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('companyStatusFilter')?.value || '';

        const filtered = companies.filter(company => {
            const matchesSearch = !searchTerm || 
                company.name.toLowerCase().includes(searchTerm) || 
                company.code.toLowerCase().includes(searchTerm);
            const matchesStatus = !statusFilter || company.status === statusFilter;
            return matchesSearch && matchesStatus;
        });

        if (filtered.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-400">No companies found.</td></tr>';
            return;
        }

        tableBody.innerHTML = filtered.map(company => `
            <tr>
                <td class="font-mono text-sm">${company.code}</td>
                <td class="font-medium">${company.name}</td>
                <td>${company.businessType || '--'}</td>
                <td class="font-mono text-sm">${company.gstin || '--'}</td>
                <td class="text-sm text-gray-600">${company.address || '--'}</td>
                <td>
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${
                        company.status === 'active' ? 'bg-green-100 text-green-800' :
                        company.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                    }">
                        ${company.status || 'active'}
                    </span>
                </td>
                <td>
                    <div class="flex gap-2">
                        <button class="btn-icon edit-company" data-id="${company.id}" title="Edit">✏️</button>
                        <button class="btn-icon delete-company" data-id="${company.id}" title="Delete">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Add event listeners to edit/delete buttons
        document.querySelectorAll('.edit-company').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const company = companies.find(c => c.id === id);
                if (company) {
                    // Redirect to add-company page with edit mode
                    sessionStorage.setItem('editingCompany', JSON.stringify(company));
                    window.router.navigate('add-company');
                }
            });
        });

        document.querySelectorAll('.delete-company').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this company?')) {
                    const index = companies.findIndex(c => c.id === id);
                    if (index > -1) {
                        companies.splice(index, 1);
                        renderCompaniesTable();
                    }
                }
            });
        });
    }

    function setupEventListeners() {
        const addCompanyBtn = document.getElementById('addCompanyBtn');
        if (addCompanyBtn) {
            addCompanyBtn.addEventListener('click', () => {
                sessionStorage.removeItem('editingCompany');
                window.router.navigate('add-company');
            });
        }

        const searchInput = document.getElementById('companySearch');
        if (searchInput) {
            searchInput.addEventListener('input', renderCompaniesTable);
        }

        const statusFilter = document.getElementById('companyStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', renderCompaniesTable);
        }
    }

    function loadCompanies() {
        // Load from localStorage or mock data
        const stored = localStorage.getItem('companies');
        if (stored) {
            companies.length = 0;
            companies.push(...JSON.parse(stored));
        } else {
            // Mock data
            companies.push({
                id: '1',
                code: 'MAIN',
                name: 'Main Company Ltd',
                businessType: 'Manufacturing',
                gstin: '27AABCT1234A2Z5',
                address: '123 Business Street, City, State',
                status: 'active'
            });
            localStorage.setItem('companies', JSON.stringify(companies));
        }
        renderCompaniesTable();
    }

    window.initializeMyCompany = function () {
        console.log('Initializing My Company Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getTemplate();
            loadCompanies();
            setupEventListeners();
            console.log('✅ My Company Page initialized');
        }
    };
})();
