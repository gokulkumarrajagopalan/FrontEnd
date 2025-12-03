(function () {
    const getTemplate = () => `
    <div id="addCompanyPageContainer" class="space-y-6">
        <div class="page-header flex justify-between items-center">
            <div>
                <h2 id="pageTitle">Add Company</h2>
                <p id="pageDescription">Create a new company or fetch from Tally</p>
            </div>
            <a href="#" data-route="my-company" class="btn btn-secondary">← Back to Companies</a>
        </div>

        <!-- Tabs -->
        <div class="flex gap-4 border-b border-gray-200">
            <button id="manualEntryTab" class="tab-btn active px-4 py-2 border-b-2 border-blue-600 font-medium text-blue-600">Manual Entry</button>
            <button id="fetchFromTallyTab" class="tab-btn px-4 py-2 text-gray-600 font-medium">Fetch from Tally</button>
        </div>

        <!-- Manual Entry Form -->
        <div id="manualEntryForm" class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4">Company Details</h3>
            <form id="companyForm" class="grid grid-cols-2 gap-6">
                <div class="form-group">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Company Code *</label>
                    <input type="text" id="companyCode" placeholder="e.g., MAIN, BRANCH1" required class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <p class="text-xs text-gray-500 mt-1">Unique identifier for the company</p>
                </div>

                <div class="form-group">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
                    <input type="text" id="companyName" placeholder="e.g., ABC Company Ltd" required class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <p class="text-xs text-gray-500 mt-1">Legal name of the company</p>
                </div>

                <div class="form-group">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Business Type *</label>
                    <select id="businessType" required class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="">Select Business Type</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="Trading">Trading</option>
                        <option value="Service">Service</option>
                        <option value="Retail">Retail</option>
                        <option value="Distribution">Distribution</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="block text-sm font-medium text-gray-700 mb-2">GSTIN</label>
                    <input type="text" id="gstin" placeholder="e.g., 27AABCT1234A2Z5" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <p class="text-xs text-gray-500 mt-1">15-digit GST Identification Number</p>
                </div>

                <div class="form-group col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <textarea id="address" placeholder="Enter complete address" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows="3"></textarea>
                </div>

                <div class="form-group">
                    <label class="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input type="text" id="city" placeholder="e.g., Mumbai" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>

                <div class="form-group">
                    <label class="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input type="text" id="state" placeholder="e.g., Maharashtra" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>

                <div class="form-group">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input type="email" id="email" placeholder="e.g., info@company.com" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>

                <div class="form-group">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input type="tel" id="phone" placeholder="e.g., +91 9876543210" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>

                <div class="form-group col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <div class="flex gap-4">
                        <label class="flex items-center">
                            <input type="radio" name="status" value="active" checked class="mr-2"> Active
                        </label>
                        <label class="flex items-center">
                            <input type="radio" name="status" value="inactive" class="mr-2"> Inactive
                        </label>
                        <label class="flex items-center">
                            <input type="radio" name="status" value="archived" class="mr-2"> Archived
                        </label>
                    </div>
                </div>

                <div class="col-span-2 flex gap-4">
                    <button type="submit" class="btn btn-primary flex-1">Save Company</button>
                    <a href="#" data-route="my-company" class="btn btn-secondary flex-1 text-center">Cancel</a>
                </div>
            </form>
        </div>

        <!-- Fetch from Tally Form -->
        <div id="fetchFromTallyForm" style="display: none;" class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4">Fetch Companies from Tally</h3>
            
            <div class="space-y-4">
                <button id="fetchCompaniesBtn" class="btn btn-primary w-full">
                    <span>🔗</span>
                    <span>Fetch Companies from Tally</span>
                </button>
                
                <div id="fetchStatus" style="display: none;" class="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <p id="fetchStatusText" class="text-sm text-blue-800">Connecting to Tally...</p>
                </div>

                <div id="tallyCompaniesList" style="display: none;">
                    <h4 class="font-medium mb-3">Available Companies in Tally</h4>
                    <div id="tallyCompaniesTable" class="space-y-2">
                        <!-- Companies from Tally will be listed here -->
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    function setupTabSwitching() {
        const manualTab = document.getElementById('manualEntryTab');
        const tallyTab = document.getElementById('fetchFromTallyTab');
        const manualForm = document.getElementById('manualEntryForm');
        const tallyForm = document.getElementById('fetchFromTallyForm');

        if (manualTab && tallyTab) {
            manualTab.addEventListener('click', () => {
                manualTab.classList.add('active', 'border-b-2', 'border-blue-600', 'text-blue-600');
                manualTab.classList.remove('text-gray-600');
                tallyTab.classList.remove('active', 'border-b-2', 'border-blue-600', 'text-blue-600');
                tallyTab.classList.add('text-gray-600');
                manualForm.style.display = 'block';
                tallyForm.style.display = 'none';
            });

            tallyTab.addEventListener('click', () => {
                tallyTab.classList.add('active', 'border-b-2', 'border-blue-600', 'text-blue-600');
                tallyTab.classList.remove('text-gray-600');
                manualTab.classList.remove('active', 'border-b-2', 'border-blue-600', 'text-blue-600');
                manualTab.classList.add('text-gray-600');
                tallyForm.style.display = 'block';
                manualForm.style.display = 'none';
            });
        }
    }

    function setupFormHandling() {
        const form = document.getElementById('companyForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();

                const company = {
                    id: sessionStorage.getItem('editingCompany') ? JSON.parse(sessionStorage.getItem('editingCompany')).id : 'company_' + Date.now(),
                    code: document.getElementById('companyCode').value,
                    name: document.getElementById('companyName').value,
                    businessType: document.getElementById('businessType').value,
                    gstin: document.getElementById('gstin').value,
                    address: document.getElementById('address').value,
                    city: document.getElementById('city').value,
                    state: document.getElementById('state').value,
                    email: document.getElementById('email').value,
                    phone: document.getElementById('phone').value,
                    status: document.querySelector('input[name="status"]:checked').value
                };

                // Save to localStorage
                let companies = JSON.parse(localStorage.getItem('companies') || '[]');
                const existingIndex = companies.findIndex(c => c.id === company.id);
                
                if (existingIndex > -1) {
                    companies[existingIndex] = company;
                } else {
                    companies.push(company);
                }

                localStorage.setItem('companies', JSON.stringify(companies));
                sessionStorage.removeItem('editingCompany');
                
                alert('Company saved successfully!');
                window.router.navigate('my-company');
            });
        }
    }

    function setupTallyFetch() {
        const fetchBtn = document.getElementById('fetchCompaniesBtn');
        if (fetchBtn) {
            fetchBtn.addEventListener('click', async () => {
                fetchBtn.disabled = true;
                fetchBtn.innerHTML = '<span>⏳</span><span>Fetching from Tally...</span>';
                
                const statusDiv = document.getElementById('fetchStatus');
                const statusText = document.getElementById('fetchStatusText');
                
                statusDiv.style.display = 'block';
                statusText.textContent = 'Connecting to Tally server...';

                try {
                    // Call Python backend to fetch companies from Tally
                    if (window.electronAPI && window.electronAPI.fetchCompanies) {
                        const result = await window.electronAPI.fetchCompanies();
                        
                        if (result.success && result.data) {
                            displayTallyCompanies(result.data);
                            statusText.textContent = `✅ Found ${result.data.length} companies in Tally`;
                        } else {
                            statusText.textContent = `❌ Error: ${result.error || 'Failed to fetch companies'}`;
                        }
                    } else {
                        // Mock data for demo
                        const mockCompanies = [
                            { code: 'TAL001', name: 'Tally Company 1', businessType: 'Manufacturing' },
                            { code: 'TAL002', name: 'Tally Company 2', businessType: 'Trading' }
                        ];
                        displayTallyCompanies(mockCompanies);
                        statusText.textContent = `✅ Found ${mockCompanies.length} companies in Tally (Demo)`;
                    }
                } catch (error) {
                    statusText.textContent = `❌ Error: ${error.message}`;
                } finally {
                    fetchBtn.disabled = false;
                    fetchBtn.innerHTML = '<span>🔗</span><span>Fetch Companies from Tally</span>';
                }
            });
        }
    }

    function displayTallyCompanies(companies) {
        const list = document.getElementById('tallyCompaniesList');
        const table = document.getElementById('tallyCompaniesTable');

        const rows = companies.map((company, index) => `
            <div class="p-3 border border-gray-200 rounded-lg flex justify-between items-center">
                <div>
                    <p class="font-medium">${company.name}</p>
                    <p class="text-sm text-gray-500">Code: ${company.code} | Type: ${company.businessType || 'N/A'}</p>
                </div>
                <button class="btn btn-primary btn-sm import-company" data-index="${index}">
                    <span>📥</span> Import
                </button>
            </div>
        `).join('');

        table.innerHTML = rows;
        list.style.display = 'block';

        // Add import handlers
        document.querySelectorAll('.import-company').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.target.closest('button').getAttribute('data-index');
                const company = companies[index];
                
                // Populate form with Tally company data
                document.getElementById('companyCode').value = company.code;
                document.getElementById('companyName').value = company.name;
                document.getElementById('businessType').value = company.businessType || '';
                
                // Switch back to manual entry tab
                document.getElementById('manualEntryTab').click();
            });
        });
    }

    function loadEditingCompany() {
        const editingStr = sessionStorage.getItem('editingCompany');
        if (editingStr) {
            const company = JSON.parse(editingStr);
            document.getElementById('pageTitle').textContent = 'Edit Company';
            document.getElementById('pageDescription').textContent = 'Update company information';
            
            document.getElementById('companyCode').value = company.code;
            document.getElementById('companyName').value = company.name;
            document.getElementById('businessType').value = company.businessType || '';
            document.getElementById('gstin').value = company.gstin || '';
            document.getElementById('address').value = company.address || '';
            document.getElementById('city').value = company.city || '';
            document.getElementById('state').value = company.state || '';
            document.getElementById('email').value = company.email || '';
            document.getElementById('phone').value = company.phone || '';
            
            const statusRadio = document.querySelector(`input[name="status"][value="${company.status || 'active'}"]`);
            if (statusRadio) statusRadio.checked = true;
        }
    }

    window.initializeAddCompany = function () {
        console.log('Initializing Add Company Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getTemplate();
            loadEditingCompany();
            setupTabSwitching();
            setupFormHandling();
            setupTallyFetch();
            console.log('✅ Add Company Page initialized');
        }
    };
})();
