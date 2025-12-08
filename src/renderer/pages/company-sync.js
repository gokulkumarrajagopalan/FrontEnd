(function () {
    const getTemplate = () => `
    <style>
        .metric-card-spacing {
            margin: 15px;
        }
    </style>
    <div id="companySyncPageContainer" class="space-y-6">
        <!-- Hero & Snapshot -->
        <div class="grid gap-4 xl:grid-cols-3">
            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 xl:col-span-2">
                <div class="flex flex-wrap items-start justify-between gap-6">
                    <div>
                        <p class="text-xs uppercase tracking-[0.3em] text-gray-400">Operations</p>
                        <h2 class="text-3xl font-extrabold text-gray-900 mt-2">Company Sync Control Center</h2>
                        <p class="text-gray-600 mt-3 max-w-2xl">Keep every imported company in perfect alignment with Tally. Track sync health, triage issues, and trigger new imports from a single cockpit.</p>
                        <div class="flex flex-wrap gap-2 mt-4">
                            <span class="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">Live Monitoring</span>
                            <span class="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">Auto Refresh</span>
                            <span class="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">Smart Alerts</span>
                        </div>
                    </div>
                    <div class="flex flex-col items-end gap-4">
                        <div class="text-right">
                            <p class="text-xs uppercase text-gray-400">Last Sync Pulse</p>
                            <p class="text-lg font-semibold text-gray-900">Just now</p>
                            <p class="text-sm text-emerald-600 flex items-center gap-1 justify-end"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>Healthy</p>
                        </div>
                        <div class="flex flex-wrap gap-3 justify-end">
                            <button id="importMoreBtn" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all duration-200 font-bold flex items-center gap-2">
                                <span class="text-xl">➕</span>
                                <span>Import More</span>
                            </button>
                            <button class="px-6 py-3 border border-gray-300 hover:border-gray-400 rounded-xl text-gray-800 font-semibold flex items-center gap-2 transition-all">
                                <span>📤</span>
                                <span>Export Report</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl shadow-lg p-6 flex flex-col justify-between">
                <div>
                    <p class="text-xs uppercase text-blue-100">Sync Health Score</p>
                    <h3 class="text-4xl font-bold mt-1" id="syncHealthScore">98%</h3>
                    <p class="text-sm text-blue-100 mt-1">Measured across the last 24 hours</p>
                </div>
                <div class="grid grid-cols-2 gap-4 mt-6">
                    <div class="bg-white/15 rounded-xl p-3">
                        <p class="text-xs text-blue-100">Avg. Duration</p>
                        <p class="text-xl font-bold">02m 14s</p>
                        <p class="text-[11px] text-blue-100 mt-1">Per company</p>
                    </div>
                    <div class="bg-white/15 rounded-xl p-3">
                        <p class="text-xs text-blue-100">Queue Size</p>
                        <p class="text-xl font-bold">6 Pending</p>
                        <p class="text-[11px] text-blue-100 mt-1">Awaiting sync</p>
                    </div>
                </div>
                <div class="mt-6 text-xs text-blue-100 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-emerald-300"></span>
                    Live anomaly detection enabled
                </div>
            </div>
        </div>

        <!-- Key Metrics -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm">
                <div class="flex items-center justify-between metric-card-spacing">
                    <div>
                        <p class="text-xs uppercase font-semibold tracking-wide text-gray-500">Total Companies</p>
                        <p class="text-3xl font-bold text-gray-900 mt-2" id="totalCompanies">0</p>
                    </div>
                    <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl">🏢</div>
                </div>
                <p class="text-xs text-gray-500 mt-2 metric-card-spacing">All imported</p>
            </div>
            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm">
                <div class="flex items-center justify-between metric-card-spacing">
                    <div>
                        <p class="text-xs uppercase font-semibold tracking-wide text-gray-500">Synced</p>
                        <p class="text-3xl font-bold text-gray-900 mt-2" id="syncedCount">0</p>
                    </div>
                    <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl">✓</div>
                </div>
                <p class="text-xs text-gray-500 mt-2 metric-card-spacing">Successfully synced</p>
            </div>
            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm">
                <div class="flex items-center justify-between metric-card-spacing">
                    <div>
                        <p class="text-xs uppercase font-semibold tracking-wide text-gray-500">Pending</p>
                        <p class="text-3xl font-bold text-gray-900 mt-2" id="pendingCount">0</p>
                    </div>
                    <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl">⏳</div>
                </div>
                <p class="text-xs text-gray-500 mt-2 metric-card-spacing">Awaiting sync</p>
            </div>
            <div class="bg-white border border-gray-200 rounded-2xl shadow-sm">
                <div class="flex items-center justify-between metric-card-spacing">
                    <div>
                        <p class="text-xs uppercase font-semibold tracking-wide text-gray-500">Errors</p>
                        <p class="text-3xl font-bold text-gray-900 mt-2" id="errorCount">0</p>
                    </div>
                    <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl">⚠</div>
                </div>
                <p class="text-xs text-gray-500 mt-2 metric-card-spacing">Failed syncs</p>
            </div>
        </div>

        <!-- Search / Filters -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div class="flex flex-col lg:flex-row gap-4 items-center">
                <div class="flex-1 w-full relative">
                    <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    <input type="text" id="companySearch" placeholder="Search by name, code, GUID..." class="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 bg-white">
                </div>
                <div class="flex gap-3 w-full lg:w-auto">
                    <select id="syncStatusFilter" class="flex-1 lg:flex-none px-6 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-semibold transition-all text-gray-900 bg-white">
                        <option value="">All Status</option>
                        <option value="synced">✓ Synced</option>
                        <option value="pending">⏳ Pending</option>
                        <option value="error">⚠ Error</option>
                    </select>
                    <select id="companyStatusFilter" class="flex-1 lg:flex-none px-6 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-semibold transition-all text-gray-900 bg-white">
                        <option value="">All Companies</option>
                        <option value="active">● Active</option>
                        <option value="inactive">○ Inactive</option>
                    </select>
                </div>
            </div>
          
        </div>

        <!-- Companies Table with Enhanced Design -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-blue-100">
                <div>
                    <h3 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <span class="text-3xl">📊</span>
                        Company Records
                    </h3>
                    <p class="text-sm text-gray-700 mt-1 font-medium">Detailed status for every imported company</p>
                </div>
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
                        <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
                        <span class="text-sm font-semibold text-gray-700">Synced</span>
                    </div>
                    <div class="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
                        <span class="w-3 h-3 rounded-full bg-amber-500"></span>
                        <span class="text-sm font-semibold text-gray-700">Pending</span>
                    </div>
                    <div class="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
                        <span class="w-3 h-3 rounded-full bg-rose-500"></span>
                        <span class="text-sm font-semibold text-gray-700">Error</span>
                    </div>
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                        <tr>
                            <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Company Name</th>
                            <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Code</th>
                            <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700">State</th>
                            <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Sync Status</th>
                            <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Last Sync</th>
                            <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Status</th>
                            <th class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="companiesTableBody">
                        <tr><td colspan="7" class="px-6 py-12 text-center">
                            <div class="flex flex-col items-center gap-3">
                                <span class="text-6xl">📦</span>
                                <p class="text-gray-400 text-lg font-semibold">No companies imported yet</p>
                                <p class="text-gray-500 text-sm">Click 'Import More' to add companies from Tally</p>
                            </div>
                        </td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Sync Details Modal -->
        <div id="syncDetailsModal" style="display: none;" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-xl shadow-lg max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
                <div class="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 class="text-xl font-bold text-gray-900">Company Sync Details</h3>
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

    async function loadCompanies() {
        try {
            // Check if user is authenticated
            if (!window.authService || !window.authService.isAuthenticated()) {
                console.warn('User not authenticated, redirecting to login');
                window.location.hash = '#auth';
                return;
            }

            const headers = window.authService.getHeaders();
            const response = await fetch(window.apiConfig.getUrl('/companies'), {
                method: 'GET',
                headers: headers
            });

            if (response.status === 401 || response.status === 403) {
                // Unauthorized - token expired or invalid device
                console.warn('Unauthorized access (HTTP ' + response.status + '), clearing auth');
                // Clear authService tokens immediately
                if (window.authService) {
                    window.authService.token = null;
                    window.authService.deviceToken = null;
                    window.authService.user = null;
                }
                // Don't logout yet - let session manager handle it
                console.warn('   Session manager will log you out in ~1 minute');
                companies = [];
                renderTable();
                updateStatistics();
                return;
            }

            if (response.ok) {
                const result = await response.json();
                if (result.success && Array.isArray(result.data)) {
                    companies = result.data;
                    console.log(`✅ Loaded ${companies.length} companies from database`);
                } else {
                    companies = [];
                    console.error('Invalid response format:', result);
                }
            } else {
                companies = [];
                console.error('Failed to fetch companies:', response.status);
            }
        } catch (error) {
            companies = [];
            console.error('Error loading companies from database:', error);
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
                (company.name && company.name.toLowerCase().includes(searchTerm)) ||
                (company.code && company.code.toLowerCase().includes(searchTerm)) ||
                (company.guid && company.guid.toLowerCase().includes(searchTerm)) ||
                (company.companyGuid && company.companyGuid.toLowerCase().includes(searchTerm));
            const matchesSync = !syncFilter || company.syncStatus === syncFilter;
            const matchesStatus = !statusFilter || company.status === statusFilter;
            return matchesSearch && matchesSync && matchesStatus;
        });

        if (filtered.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="px-6 py-8 text-center text-gray-400">No companies found</td></tr>';
            return;
        }

        tableBody.innerHTML = filtered.map(company => {
            const isSynced = company.syncStatus === 'synced';
            const isPending = company.syncStatus === 'pending';
            const isActive = company.status === 'active';
            
            return `
            <tr class="border-b border-gray-100 hover:bg-blue-50 transition-all">
                <td class="px-6 py-5">
                    <div class="flex items-center gap-3">
                       
                        <div>
                            <p class="font-bold text-gray-900 text-base">${company.name}</p>
                            <p class="text-xs text-gray-500 font-mono">ID: ${company.id ? company.id.toString().substring(0, 12) + '...' : 'N/A'}</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-5">
                    <span class="px-3 py-1 bg-gray-100 text-gray-900 rounded-lg font-mono text-sm font-bold ">${company.code}</span>
                </td>
                <td class="px-6 py-5">
                    <span class="text-sm text-gray-900 font-semibold">${company.state || '--'}</span>
                </td>
                <td class="px-6 py-5">
                    <span class="text-sm font-semibold ${
                        isSynced ? 'text-emerald-700' :
                        isPending ? 'text-amber-700' :
                        'text-rose-700'
                    }">
                        ${isSynced ? '✓ Synced' : isPending ? '⏳ Pending' : '⚠ Failed'}
                    </span>
                </td>
                <td class="px-6 py-5">
                    <span class="text-sm text-gray-900 font-medium">${company.lastSyncDate ? new Date(company.lastSyncDate).toLocaleString() : '--'}</span>
                </td>
                <td class="px-6 py-5">
                    <span class="text-sm font-semibold ${isActive ? 'text-blue-700' : 'text-gray-500'}">
                        ${isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td class="px-6 py-5">
                    <button class="view-details-btn px-4 py-2 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 rounded-xl shadow-md hover:shadow-lg transition-all font-semibold text-sm" data-id="${company.id}">👁️ View</button>
                </td>
            </tr>
        `;
        }).join('');

        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const button = e.currentTarget;
                const id = button.getAttribute('data-id');
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

                <!-- Core Information Section -->
                <div class="mb-6">
                    <h4 class="text-sm font-bold text-gray-700 mb-3 uppercase">Core Information</h4>
                    <div class="grid grid-cols-2 gap-3 text-sm">
                        ${company.mailingName ? `<div><span class="text-gray-500">Mailing Name:</span> ${company.mailingName}</div>` : ''}
                        ${company.country ? `<div><span class="text-gray-500">Country:</span> ${company.country}</div>` : ''}
                        ${company.state ? `<div><span class="text-gray-500">State:</span> ${company.state}</div>` : ''}
                        ${company.email ? `<div><span class="text-gray-500">Email:</span> ${company.email}</div>` : ''}
                        ${company.telephone ? `<div><span class="text-gray-500">Telephone:</span> ${company.telephone}</div>` : ''}
                        ${company.mobile ? `<div><span class="text-gray-500">Mobile:</span> ${company.mobile}</div>` : ''}
                        ${company.website ? `<div><span class="text-gray-500">Website:</span> ${company.website}</div>` : ''}
                        ${company.panNumber ? `<div><span class="text-gray-500">PAN:</span> ${company.panNumber}</div>` : ''}
                    </div>
                </div>

                <!-- Address Section -->
                ${company.addressLine1 || company.addressLine2 || company.addressLine3 || company.addressLine4 ? `
                <div class="mb-6">
                    <h4 class="text-sm font-bold text-gray-700 mb-3 uppercase">Address</h4>
                    <div class="text-sm text-gray-700 space-y-1">
                        ${company.addressLine1 ? `<div>${company.addressLine1}</div>` : ''}
                        ${company.addressLine2 ? `<div>${company.addressLine2}</div>` : ''}
                        ${company.addressLine3 ? `<div>${company.addressLine3}</div>` : ''}
                        ${company.addressLine4 ? `<div>${company.addressLine4}</div>` : ''}
                    </div>
                </div>
                ` : ''}

                <!-- Financial Configuration -->
                ${company.financialYearStart || company.booksStart || company.currencyFormalName ? `
                <div class="mb-6">
                    <h4 class="text-sm font-bold text-gray-700 mb-3 uppercase">Financial Configuration</h4>
                    <div class="grid grid-cols-2 gap-3 text-sm">
                        ${company.financialYearStart ? `<div><span class="text-gray-500">FY Start:</span> ${company.financialYearStart}</div>` : ''}
                        ${company.booksStart ? `<div><span class="text-gray-500">Books Start:</span> ${company.booksStart}</div>` : ''}
                        ${company.currencyFormalName ? `<div><span class="text-gray-500">Currency:</span> ${company.currencyFormalName}</div>` : ''}
                        ${company.currencySymbol ? `<div><span class="text-gray-500">Symbol:</span> ${company.currencySymbol}</div>` : ''}
                    </div>
                </div>
                ` : ''}

                <!-- GST Details (India) -->
                ${company.country === 'India' && (company.gstin || company.gstState || company.gstType) ? `
                <div class="mb-6 bg-blue-50 p-3 rounded border border-blue-200">
                    <h4 class="text-sm font-bold text-blue-700 mb-3 uppercase">GST Details (India)</h4>
                    <div class="grid grid-cols-2 gap-3 text-sm">
                        ${company.gstin ? `<div><span class="text-gray-600">GSTIN:</span> <span class="font-mono">${company.gstin}</span></div>` : ''}
                        ${company.gstType ? `<div><span class="text-gray-600">GST Type:</span> ${company.gstType}</div>` : ''}
                        ${company.gstState ? `<div><span class="text-gray-600">GST State:</span> ${company.gstState}</div>` : ''}
                        ${company.gstApplicableDate ? `<div><span class="text-gray-600">Applicable From:</span> ${company.gstApplicableDate}</div>` : ''}
                        ${company.gstFreezone !== undefined ? `<div><span class="text-gray-600">Freezone:</span> ${company.gstFreezone ? 'Yes' : 'No'}</div>` : ''}
                        ${company.gstEInvoiceApplicable !== undefined ? `<div><span class="text-gray-600">e-Invoice:</span> ${company.gstEInvoiceApplicable ? 'Yes' : 'No'}</div>` : ''}
                        ${company.gstEWayBillApplicable !== undefined ? `<div><span class="text-gray-600">e-Way Bill:</span> ${company.gstEWayBillApplicable ? 'Yes' : 'No'}</div>` : ''}
                    </div>
                </div>
                ` : ''}

                <!-- VAT Details (GCC Countries) -->
                ${['UAE', 'Saudi Arabia', 'Bahrain', 'Kuwait', 'Oman', 'Qatar'].includes(company.country) && (company.vatRegistrationNumber || company.vatEmirate) ? `
                <div class="mb-6 bg-orange-50 p-3 rounded border border-orange-200">
                    <h4 class="text-sm font-bold text-orange-700 mb-3 uppercase">VAT Details (${company.country})</h4>
                    <div class="grid grid-cols-2 gap-3 text-sm">
                        ${company.vatRegistrationNumber ? `<div><span class="text-gray-600">VAT Number:</span> <span class="font-mono">${company.vatRegistrationNumber}</span></div>` : ''}
                        ${company.vatEmirate ? `<div><span class="text-gray-600">Emirate:</span> ${company.vatEmirate}</div>` : ''}
                        ${company.vatApplicableDate ? `<div><span class="text-gray-600">Applicable From:</span> ${company.vatApplicableDate}</div>` : ''}
                        ${company.vatAccountId ? `<div><span class="text-gray-600">Account ID:</span> ${company.vatAccountId}</div>` : ''}
                        ${company.vatFreezone !== undefined ? `<div><span class="text-gray-600">Freezone:</span> ${company.vatFreezone ? 'Yes' : 'No'}</div>` : ''}
                    </div>
                </div>
                ` : ''}

                <!-- Company Features -->
                ${company.billwiseEnabled !== undefined || company.costcentreEnabled || company.batchEnabled || company.payrollEnabled ? `
                <div class="mb-6 bg-green-50 p-3 rounded border border-green-200">
                    <h4 class="text-sm font-bold text-green-700 mb-3 uppercase">Features</h4>
                    <div class="grid grid-cols-2 gap-3 text-sm">
                        ${company.billwiseEnabled !== undefined ? `<div><span class="text-gray-600">Billwise:</span> <span class="px-2 py-1 bg-${company.billwiseEnabled ? 'green' : 'gray'}-100 text-${company.billwiseEnabled ? 'green' : 'gray'}-700 rounded text-xs">${company.billwiseEnabled ? '✓ Enabled' : '✗ Disabled'}</span></div>` : ''}
                        ${company.costcentreEnabled !== undefined ? `<div><span class="text-gray-600">Cost Centre:</span> <span class="px-2 py-1 bg-${company.costcentreEnabled ? 'green' : 'gray'}-100 text-${company.costcentreEnabled ? 'green' : 'gray'}-700 rounded text-xs">${company.costcentreEnabled ? '✓ Enabled' : '✗ Disabled'}</span></div>` : ''}
                        ${company.batchEnabled !== undefined ? `<div><span class="text-gray-600">Batch:</span> <span class="px-2 py-1 bg-${company.batchEnabled ? 'green' : 'gray'}-100 text-${company.batchEnabled ? 'green' : 'gray'}-700 rounded text-xs">${company.batchEnabled ? '✓ Enabled' : '✗ Disabled'}</span></div>` : ''}
                        ${company.payrollEnabled !== undefined ? `<div><span class="text-gray-600">Payroll:</span> <span class="px-2 py-1 bg-${company.payrollEnabled ? 'green' : 'gray'}-100 text-${company.payrollEnabled ? 'green' : 'gray'}-700 rounded text-xs">${company.payrollEnabled ? '✓ Enabled' : '✗ Disabled'}</span></div>` : ''}
                        ${company.useDiscountColumn !== undefined ? `<div><span class="text-gray-600">Discount:</span> <span class="px-2 py-1 bg-${company.useDiscountColumn ? 'green' : 'gray'}-100 text-${company.useDiscountColumn ? 'green' : 'gray'}-700 rounded text-xs">${company.useDiscountColumn ? '✓ Enabled' : '✗ Disabled'}</span></div>` : ''}
                        ${company.useActualColumn !== undefined ? `<div><span class="text-gray-600">Actual Qty:</span> <span class="px-2 py-1 bg-${company.useActualColumn ? 'green' : 'gray'}-100 text-${company.useActualColumn ? 'green' : 'gray'}-700 rounded text-xs">${company.useActualColumn ? '✓ Enabled' : '✗ Disabled'}</span></div>` : ''}
                    </div>
                </div>
                ` : ''}

                <hr class="my-4">

                <!-- Sync & Status Information -->
                <div class="grid grid-cols-2 gap-4 mb-4">
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

                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <p class="text-sm text-gray-500 uppercase font-semibold">Last Sync</p>
                        <p class="text-sm text-gray-700">${lastSync}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500 uppercase font-semibold">Imported Date</p>
                        <p class="text-sm text-gray-700">${imported}</p>
                    </div>
                </div>

                <div>
                    <p class="text-sm text-gray-500 uppercase font-semibold mb-2">GUID</p>
                    <p class="text-xs font-mono bg-gray-100 p-3 rounded text-gray-700">${company.guid || company.companyGuid}</p>
                </div>

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

    window.initializeCompanySync = async function () {
        console.log('Initializing Company Sync Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getTemplate();
            setupEventListeners();
            await loadCompanies();
            console.log('✅ Company Sync Page initialized');
        }
    };
})();
