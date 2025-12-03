(function () {
    const getTemplate = () => `
    <div id="importCompanyPageContainer" class="space-y-6">
        <div class="page-header">
            <h2>Import Company from Tally</h2>
            <p>Select and import companies from your Tally database</p>
        </div>

        <!-- Status Messages -->
        <div id="statusMessage" style="display: none;" class="p-4 rounded-lg border-l-4"></div>

        <!-- Fetch Button -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-lg font-bold text-gray-800">Available Companies</h3>
                    <p class="text-sm text-gray-500 mt-1">Click to fetch list of companies from Tally</p>
                </div>
                <button id="fetchCompaniesBtn" class="btn btn-primary">
                    <span>🔗</span>
                    <span>Fetch from Tally</span>
                </button>
            </div>
        </div>

        <!-- Companies List -->
        <div id="companiesList" style="display: none;" class="space-y-3">
            <h3 class="text-lg font-bold text-gray-800">Select Companies to Import</h3>
            <div id="companiesContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <!-- Company cards will be rendered here -->
            </div>
        </div>

        <!-- Import Selected Button -->
        <div id="importButtonContainer" style="display: none;" class="flex gap-4">
            <button id="importSelectedBtn" class="btn btn-primary flex-1">
                <span>📥</span>
                <span>Import Selected Companies</span>
            </button>
            <button id="clearSelectionBtn" class="btn btn-secondary flex-1">
                <span>🔄</span>
                <span>Clear Selection</span>
            </button>
        </div>

        <!-- Import Progress -->
        <div id="importProgress" style="display: none;" class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4">Importing Companies...</h3>
            <div id="importLog" class="space-y-2 max-h-96 overflow-y-auto bg-gray-50 p-4 rounded-lg">
                <!-- Import progress will be logged here -->
            </div>
        </div>
    </div>
    `;

    let tallyCompanies = [];
    let selectedCompanies = [];

    function showStatus(message, type = 'info') {
        const statusDiv = document.getElementById('statusMessage');
        statusDiv.innerHTML = message;
        statusDiv.style.display = 'block';
        
        if (type === 'success') {
            statusDiv.className = 'p-4 rounded-lg border-l-4 bg-green-50 border-green-500 text-green-800';
        } else if (type === 'error') {
            statusDiv.className = 'p-4 rounded-lg border-l-4 bg-red-50 border-red-500 text-red-800';
        } else {
            statusDiv.className = 'p-4 rounded-lg border-l-4 bg-blue-50 border-blue-500 text-blue-800';
        }
    }

    function addImportLog(message, status = 'info') {
        const log = document.getElementById('importLog');
        const entry = document.createElement('div');
        entry.className = `text-sm ${
            status === 'success' ? 'text-green-700' :
            status === 'error' ? 'text-red-700' :
            'text-gray-700'
        }`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
    }

    async function fetchTallyCompanies() {
        const fetchBtn = document.getElementById('fetchCompaniesBtn');
        fetchBtn.disabled = true;
        fetchBtn.innerHTML = '<span>⏳</span><span>Fetching from Tally...</span>';

        showStatus('Connecting to Tally server...', 'info');

        try {
            if (window.electronAPI && window.electronAPI.fetchCompanies) {
                const result = await window.electronAPI.fetchCompanies();

                if (result.success && result.data && Array.isArray(result.data)) {
                    tallyCompanies = result.data;
                    displayCompanies(tallyCompanies);
                    showStatus(`✅ Found ${tallyCompanies.length} companies in Tally`, 'success');
                } else {
                    throw new Error(result.error || 'Failed to fetch companies');
                }
            } else {
                throw new Error('Electron API not available');
            }
        } catch (error) {
            showStatus(`❌ Error: ${error.message}`, 'error');
            console.error('Fetch error:', error);
        } finally {
            fetchBtn.disabled = false;
            fetchBtn.innerHTML = '<span>🔗</span><span>Fetch from Tally</span>';
        }
    }

    function displayCompanies(companies) {
        const container = document.getElementById('companiesContainer');
        const list = document.getElementById('companiesList');
        const importContainer = document.getElementById('importButtonContainer');

        // Get already imported companies
        const savedCompanies = JSON.parse(localStorage.getItem('companies') || '[]');
        const importedGuids = new Set(savedCompanies.map(c => c.guid));

        if (companies.length === 0) {
            container.innerHTML = '<div class="col-span-full text-center py-8 text-gray-400">No companies found</div>';
            list.style.display = 'block';
            importContainer.style.display = 'none';
            return;
        }

        container.innerHTML = companies.map((company, index) => {
            const isImported = importedGuids.has(company.guid);
            const cardClass = isImported 
                ? 'bg-gray-50 border-gray-200 opacity-60' 
                : 'bg-white border-gray-100 hover:shadow-md';
            
            return `
            <div class="rounded-xl shadow-sm border p-4 transition-shadow company-card ${cardClass}" data-index="${index}" style="${isImported ? 'cursor-not-allowed;' : 'cursor-pointer;'}">
                <div class="flex items-start gap-3">
                    <input type="checkbox" class="company-checkbox mt-1" data-index="${index}" ${isImported ? 'disabled' : ''}>
                    <div class="flex-1">
                        <div class="flex items-center gap-2">
                            <h4 class="font-bold ${isImported ? 'text-gray-500' : 'text-gray-800'}">${company.name}</h4>
                            ${isImported ? '<span class="inline-block bg-gray-300 text-gray-700 text-xs font-semibold px-2 py-1 rounded">Already Imported</span>' : '<span class="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded">Available</span>'}
                        </div>
                        <p class="text-xs ${isImported ? 'text-gray-400' : 'text-gray-500'} mt-1">Code: <span class="font-mono">${company.code}</span></p>
                        <p class="text-xs ${isImported ? 'text-gray-400' : 'text-gray-500'}">GUID: <span class="font-mono text-xs">${company.guid.substring(0, 8)}...</span></p>
                        ${company.state ? `<p class="text-xs ${isImported ? 'text-gray-400' : 'text-gray-500'} mt-1">State: ${company.state}</p>` : ''}
                        ${company.email ? `<p class="text-xs ${isImported ? 'text-gray-400' : 'text-gray-500'}">Email: ${company.email}</p>` : ''}
                    </div>
                </div>
            </div>
        `;
        }).join('');

        // Add event listeners
        document.querySelectorAll('.company-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.tagName !== 'INPUT') {
                    const checkbox = card.querySelector('.company-checkbox');
                    if (!checkbox.disabled) {
                        checkbox.checked = !checkbox.checked;
                        updateSelection();
                    }
                }
            });
        });

        document.querySelectorAll('.company-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', updateSelection);
        });

        list.style.display = 'block';
        importContainer.style.display = 'flex';
    }

    function updateSelection() {
        selectedCompanies = [];
        document.querySelectorAll('.company-checkbox:checked').forEach(checkbox => {
            const index = parseInt(checkbox.getAttribute('data-index'));
            selectedCompanies.push(tallyCompanies[index]);
        });
    }

    async function importSelectedCompanies() {
        if (selectedCompanies.length === 0) {
            showStatus('❌ Please select at least one company', 'error');
            return;
        }

        const importBtn = document.getElementById('importSelectedBtn');
        importBtn.disabled = true;
        
        document.getElementById('importProgress').style.display = 'block';
        document.getElementById('importLog').innerHTML = '';

        addImportLog(`Starting import of ${selectedCompanies.length} company/companies...`, 'info');

        try {
            // Get existing companies from localStorage
            let savedCompanies = JSON.parse(localStorage.getItem('companies') || '[]');
            let importedCount = 0;
            let skippedCount = 0;

            for (const company of selectedCompanies) {
                // Check if company already exists
                const exists = savedCompanies.some(c => c.guid === company.guid);

                if (exists) {
                    addImportLog(`⏭️ Skipped: ${company.name} (already imported)`, 'info');
                    skippedCount++;
                } else {
                    // Create company object for our database
                    const newCompany = {
                        id: 'comp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                        code: company.code,
                        name: company.name,
                        guid: company.guid,
                        email: company.email || '',
                        phone: company.phone || '',
                        address: company.address || '',
                        state: company.state || '',
                        businessType: company.businessType || 'Tally Company',
                        status: 'active',
                        importedFrom: 'Tally',
                        importedDate: new Date().toISOString(),
                        syncStatus: 'synced',
                        lastSyncDate: new Date().toISOString()
                    };

                    savedCompanies.push(newCompany);
                    addImportLog(`✅ Imported: ${company.name} (${company.code})`, 'success');
                    importedCount++;
                }
            }

            // Save to localStorage
            localStorage.setItem('companies', JSON.stringify(savedCompanies));

            addImportLog(`\n✅ Import Complete!`, 'success');
            addImportLog(`Imported: ${importedCount} | Skipped: ${skippedCount}`, 'success');

            showStatus(`✅ Successfully imported ${importedCount} company/companies!`, 'success');

            // Reset selection
            selectedCompanies = [];
            document.querySelectorAll('.company-checkbox').forEach(cb => cb.checked = false);

            // Show success message and clear after 2 seconds
            setTimeout(() => {
                document.getElementById('importProgress').style.display = 'none';
                window.router.navigate('company-sync');
            }, 2000);

        } catch (error) {
            addImportLog(`❌ Error: ${error.message}`, 'error');
            showStatus(`❌ Import failed: ${error.message}`, 'error');
        } finally {
            importBtn.disabled = false;
        }
    }

    function setupEventListeners() {
        const fetchBtn = document.getElementById('fetchCompaniesBtn');
        if (fetchBtn) {
            fetchBtn.addEventListener('click', fetchTallyCompanies);
        }

        const importBtn = document.getElementById('importSelectedBtn');
        if (importBtn) {
            importBtn.addEventListener('click', importSelectedCompanies);
        }

        const clearBtn = document.getElementById('clearSelectionBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                selectedCompanies = [];
                document.querySelectorAll('.company-checkbox').forEach(cb => cb.checked = false);
            });
        }
    }

    window.initializeImportCompany = function () {
        console.log('Initializing Import Company Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getTemplate();
            setupEventListeners();
            console.log('✅ Import Company Page initialized');
        }
    };
})();
