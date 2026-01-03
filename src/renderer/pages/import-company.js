(function () {
    const getTemplate = () => `
    <div id="importCompanyPageContainer" class="space-y-6">
        <!-- Import Header -->
        <div class="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-gray-900">
            <div class="flex items-center justify-between gap-6 flex-wrap">
                <div>
                    <h2 class="text-3xl font-bold mb-2">🏢 Import Companies from Tally</h2>
                    <p class="text-gray-600">Connect to Tally and import your company data seamlessly</p>
                </div>
                <div class="flex flex-col items-center gap-4">
                    <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                        <p class="text-4xl font-bold text-blue-600" id="tallyCompanyCount">0</p>
                        <p class="text-sm text-blue-500">Available</p>
                    </div>
                    <button id="fetchCompaniesBtn" class="px-6 py-3 rounded-xl shadow-lg hover:shadow-xl border-2 transition-all duration-200 font-bold flex items-center gap-2" style="background: var(--text-primary); color: #ffffff !important; border-color: var(--text-primary);">
                        <span style="color: #ffffff !important;">🔗</span>
                        <span style="color: #ffffff !important;">Fetch from Tally</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Status Messages -->
        <div id="statusMessage" style="display: none;" class="p-4 rounded-xl border border-gray-200 bg-gray-50 shadow-sm text-gray-900"></div>

        <!-- Companies List -->
        <div id="companiesList" style="display: none;" class="space-y-4">
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div class="flex items-center justify-between mb-2">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900 mb-1">📋 Select Companies to Import</h3>
                        <p class="text-sm text-gray-600">Choose the companies you want to import from Tally</p>
                    </div>
                    <button id="importMoreBtn" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl border-2 border-blue-700 transition-all duration-200 font-bold flex items-center gap-2">
                        <span>🔗</span>
                        <span>Fetch More</span>
                    </button>
                </div>
                <div id="companiesContainer" class="space-y-3">
                    <!-- Company list items will be rendered here -->
                </div>
            </div>
        </div>

        <!-- Import Selected Button -->
        <div id="importButtonContainer" style="display: none;" class="flex gap-4">
            <button id="importSelectedBtn" class="flex-1 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg hover:shadow-xl border-2 border-green-700 transition-all duration-200 font-semibold text-base flex items-center justify-center gap-2">
                <span class="text-lg">📥</span>
                <span>Import Selected Companies</span>
            </button>
            <button id="clearSelectionBtn" class="px-6 py-2.5 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-xl shadow-lg hover:shadow-xl border-2 border-gray-400 transition-all duration-200 font-semibold text-base flex items-center justify-center gap-2">
                <span class="text-lg">🔄</span>
                <span>Clear Selection</span>
            </button>
        </div>

        <!-- Import Progress -->
        <div id="importProgress" style="display: none;" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="flex items-center gap-3 mb-4">
                <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center animate-pulse">
                    <span class="text-2xl">⚙️</span>
                </div>
                <div>
                    <h3 class="text-xl font-bold text-gray-900">Importing Companies...</h3>
                    <p class="text-sm text-gray-700">Please wait while we import your data</p>
                </div>
            </div>
            <div id="importLog" class="space-y-2 max-h-96 overflow-y-auto bg-gray-50 p-4 rounded-xl border border-gray-200">
                <!-- Import progress will be logged here -->
            </div>
        </div>
    </div>
    `;

    let tallyCompanies = [];
    let selectedCompanies = [];
    let connectionHistory = [];

    function loadConnectionHistory() {
        const stored = localStorage.getItem('tallyConnectionHistory');
        if (stored) {
            connectionHistory = JSON.parse(stored);
        } else {
            connectionHistory = [];
        }
    }

    function saveConnectionHistory(status, companyCount, message) {
        const connection = {
            timestamp: new Date().toISOString(),
            status: status,
            companyCount: companyCount,
            message: message
        };
        connectionHistory.unshift(connection);
        connectionHistory = connectionHistory.slice(0, 3); // Keep only last 3
        localStorage.setItem('tallyConnectionHistory', JSON.stringify(connectionHistory));
        renderConnectionHistory();
    }

    function renderConnectionHistory() {
        const container = document.getElementById('connectionHistory');
        if (!container) return;

        if (connectionHistory.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 text-gray-400">
                    <p class="text-sm">No connection history yet</p>
                    <p class="text-xs mt-1">Click "Fetch from Tally" to connect</p>
                </div>
            `;
            return;
        }

        container.innerHTML = connectionHistory.map(conn => {
            const date = new Date(conn.timestamp);
            const timeAgo = getTimeAgo(date);
            const isSuccess = conn.status === 'success';
            const statusIcon = isSuccess ? '✓' : '✗';
            const bgClass = isSuccess ? 'bg-green-100' : 'bg-red-100';
            const textClass = isSuccess ? 'text-green-600' : 'text-red-600';

            return `
                <div class="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 ${bgClass} rounded-lg flex items-center justify-center">
                            <span class="${textClass} font-bold text-lg">${statusIcon}</span>
                        </div>
                        <div>
                            <p class="text-sm font-semibold text-gray-800">${conn.message}</p>
                            <p class="text-xs text-gray-500">${timeAgo}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-lg font-bold ${textClass}">${conn.companyCount}</p>
                        <p class="text-xs text-gray-500">companies</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    function getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    function showStatus(message, type = 'info') {
        const statusDiv = document.getElementById('statusMessage');
        // Use textContent for security (prevents XSS)
        statusDiv.textContent = message;
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
        entry.className = `text-sm ${status === 'success' ? 'text-green-700' :
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
            // Get Tally port from settings
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            const tallyPort = appSettings.tallyPort || 9000;

            console.log('📍 Fetching companies with Tally Port:', tallyPort);

            if (window.electronAPI && window.electronAPI.invoke) {
                const result = await window.electronAPI.invoke('fetch-companies', { tallyPort });

                if (result.success && result.data && Array.isArray(result.data)) {
                    tallyCompanies = result.data;
                    document.getElementById('tallyCompanyCount').textContent = tallyCompanies.length;
                    await displayCompanies(tallyCompanies);
                    showStatus(`✅ Found ${tallyCompanies.length} companies in Tally`, 'success');
                    saveConnectionHistory('success', tallyCompanies.length, 'Connected successfully');
                } else {
                    throw new Error(result.error || 'Failed to fetch companies');
                }
            } else {
                throw new Error('Electron API not available');
            }
        } catch (error) {
            showStatus(`❌ Error: ${error.message}`, 'error');
            console.error('Fetch error:', error);
            saveConnectionHistory('error', 0, error.message);
        } finally {
            fetchBtn.disabled = false;
            fetchBtn.innerHTML = '<span>🔗</span><span>Fetch from Tally</span>';
        }
    }

    async function displayCompanies(companies) {
        const container = document.getElementById('companiesContainer');
        const list = document.getElementById('companiesList');
        const importContainer = document.getElementById('importButtonContainer');

        console.log('📊 Displaying companies:', companies.length);
        console.log('Sample company structure:', companies[0]);

        // Fetch already imported companies from database
        let importedGuids = new Set();
        try {
            if (window.authService && window.authService.isAuthenticated()) {
                const headers = window.authService.getHeaders();
                const response = await fetch(window.apiConfig.getUrl('/companies'), {
                    method: 'GET',
                    headers: headers
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success && Array.isArray(result.data)) {
                        // Normalize GUIDs to uppercase for reliable matching
                        importedGuids = new Set(result.data.map(c => (c.companyGuid || c.guid || '').toUpperCase().trim()));
                        console.log(`✅ Loaded ${importedGuids.size} companies from database`);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching companies from database:', error);
        }

        if (companies.length === 0) {
            container.innerHTML = '<div class="col-span-full text-center py-8 text-gray-400">No companies found</div>';
            list.style.display = 'block';
            importContainer.style.display = 'none';
            return;
        }

        container.innerHTML = companies.map((company, index) => {
            const companyGuid = (company.guid || company.companyGuid || '').toUpperCase().trim();
            const isImported = companyGuid ? importedGuids.has(companyGuid) : false;

            return `
            <div class="company-card flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${isImported
                    ? 'bg-gray-100 border-gray-200 opacity-70 cursor-not-allowed'
                    : 'bg-white border-gray-200 hover:border-blue-500 hover:shadow-md cursor-pointer'
                }" data-index="${index}" data-imported="${isImported}">
                <input type="checkbox" class="company-checkbox w-6 h-6 rounded border-2 border-blue-500 ${isImported ? 'opacity-50 cursor-not-allowed' : ''}" data-index="${index}" ${isImported ? 'disabled' : ''}>
                
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-1">
                        <h4 class="text-base text-gray-900">${company.name}</h4>
                        ${isImported
                    ? '<span class="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 border border-gray-200">✓ Imported</span>'
                    : '<span class="px-3 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700 border border-green-200">● Available</span>'
                }
                    </div>
                    <div class="flex gap-6 text-sm text-gray-600">
                        <span>Code: <span class="font-mono bg-gray-100 px-2 py-1 rounded text-gray-900">${company.code || 'N/A'}</span></span>
                        ${company.state ? `<span>📍 State: ${company.state}</span>` : ''}
                        ${company.email ? `<span>📧 Email: ${company.email}</span>` : ''}
                    </div>
                    <p class="text-xs text-gray-500 mt-1">GUID: <span class="font-mono">${companyGuid ? companyGuid.substring(0, 12) + '...' : 'N/A'}</span></p>
                </div>
            </div>
        `;
        }).join('');

        console.log('✅ Rendered', companies.length, 'company cards');

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
            checkbox.addEventListener('click', (e) => {
                if (checkbox.disabled) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
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

    // Helper function to convert Tally date format (YYYYMMDD) to ISO date (YYYY-MM-DD)
    function formatTallyDate(dateStr) {
        if (!dateStr || dateStr.length !== 8) return '';
        // Convert "20250401" to "2025-04-01"
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        return `${year}-${month}-${day}`;
    }

    async function syncGroupsForCompany(companyId, companyData) {
        // Fetch groups from Tally and sync to backend
        try {
            // Get Tally port from settings
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            const tallyPort = appSettings.tallyPort || 9000;
            const tallyUrl = `http://localhost:${tallyPort}`;

            console.log(`Syncing groups from Tally at ${tallyUrl}...`);

            const response = await fetch(tallyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/xml' },
                body: `<ENVELOPE>
                    <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>AllGroups</ID></HEADER>
                    <BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES><TDL>
                    <TDLMESSAGE><COLLECTION NAME="AllGroups" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No"><TYPE>Group</TYPE><FETCH>GUID, MASTERID, ALTERID, NAME, PARENT, ISREVENUE</FETCH></COLLECTION></TDLMESSAGE>
                    </TDL></DESC></BODY>
                </ENVELOPE>`
            });

            if (!response.ok) throw new Error(`Failed to connect to Tally at ${tallyUrl}`);

            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            const groupElements = xmlDoc.querySelectorAll('GROUP');

            if (groupElements.length === 0) return;

            const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
            const tallyGroups = Array.from(groupElements).map(elem => {
                const getTextContent = (tag) => {
                    const node = elem.querySelector(tag);
                    return node ? node.textContent.trim() : '';
                };

                return {
                    cmpId: companyId,
                    userId: currentUser.userId,
                    grpName: elem.getAttribute('NAME') || '',
                    guid: getTextContent('GUID'),
                    masterId: parseInt(getTextContent('MASTERID')) || 0,
                    alterId: parseInt(getTextContent('ALTERID')) || 0,
                    grpParent: getTextContent('PARENT') || 'Primary',
                    isRevenue: getTextContent('ISREVENUE') === 'Yes',
                    isActive: true
                };
            });

            // Sync to backend
            const authToken = sessionStorage.getItem('authToken');
            const deviceToken = sessionStorage.getItem('deviceToken');
            const syncResponse = await fetch(window.apiConfig.getUrl('/groups/sync'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                    'X-Device-Token': deviceToken
                },
                body: JSON.stringify(tallyGroups)
            });

            const result = await syncResponse.json();
            if (!result.success) {
                throw new Error(result.message || 'Sync failed');
            }
        } catch (error) {
            console.error('Group sync error:', error);
            throw error;
        }
    }

    async function sendCompanyToBackend(company) {
        const backendUrl = window.apiConfig.getUrl('/companies');

        try {
            // Check authentication
            if (!window.authService || !window.authService.isAuthenticated()) {
                return { success: false, error: 'Authentication required' };
            }

            const currentUser = window.authService.getCurrentUser();
            if (!currentUser || !currentUser.userId) {
                return { success: false, error: 'User information not found' };
            }

            // Add userId to company data
            company.userId = currentUser.userId;

            // Log the exact payload being sent
            console.log('📤 Sending 56-field company structure to backend:');
            console.log('Company Name:', company.name);
            console.log('User ID:', company.userId);
            console.log('Total Fields:', Object.keys(company).length);
            console.log('Full Payload:', JSON.stringify(company, null, 2));

            const headers = window.authService.getHeaders();

            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(company)
            });

            const responseText = await response.text();
            let result;

            try {
                result = JSON.parse(responseText);
            } catch (e) {
                result = { message: responseText };
            }

            if (response.ok) {
                addImportLog(`   📤 Sent to Backend API (ID: ${result.data?.id || result.id || 'N/A'})`, 'success');
                addImportLog(`   ✅ Response: ${result.message || 'Company created'}`, 'success');
                return { success: true, backendId: result.data?.id || result.id };
            } else {
                // Extract detailed error information
                let errorMsg = result.message || result.error || `HTTP ${response.status}`;
                let errorDetails = result.details || result.fieldErrors || '';

                addImportLog(`   ⚠️ Backend Error (${response.status}): ${errorMsg}`, 'error');
                if (errorDetails) {
                    addImportLog(`   📋 Details: ${JSON.stringify(errorDetails)}`, 'error');
                }

                // Log FULL response for debugging
                console.error('❌ BACKEND ERROR RESPONSE:', {
                    status: response.status,
                    statusText: response.statusText,
                    fullBody: result,
                    errorMessage: errorMsg,
                    errorDetails: errorDetails
                });

                return { success: false, error: errorMsg };
            }
        } catch (err) {
            addImportLog(`   ❌ API Error: ${err.message}`, 'error');
            console.error('API Call Error:', err);
            return { success: false, error: err.message };
        }
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
            // Get auth token and user directly from sessionStorage (more reliable)
            const authToken = sessionStorage.getItem('authToken');
            const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');

            console.log('🔐 Import - Auth check:', {
                hasToken: !!authToken,
                hasUser: !!currentUser,
                userId: currentUser?.userId,
                username: currentUser?.username
            });

            if (!authToken) {
                addImportLog('❌ Authentication token not found. Please login.', 'error');
                console.error('No authToken in sessionStorage');
                showStatus('⚠️ Please login to import companies', 'error');
                importBtn.disabled = false;
                return;
            }

            if (!currentUser || !currentUser.userId) {
                addImportLog('❌ User information not found. Please login again.', 'error');
                console.error('No currentUser in sessionStorage or missing userId');
                showStatus('⚠️ User session invalid. Please login again.', 'error');
                importBtn.disabled = false;
                return;
            }

            // Generate device token if missing
            let deviceToken = sessionStorage.getItem('deviceToken');
            if (!deviceToken) {
                deviceToken = 'device-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now();
                sessionStorage.setItem('deviceToken', deviceToken);
                addImportLog('🔑 Generated new device token', 'info');
            }

            // Build headers manually
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'X-Device-Token': deviceToken
            };

            addImportLog(`✅ Authenticated as: ${currentUser.username} (ID: ${currentUser.userId})`, 'success');

            // Fetch existing companies from database to check for duplicates
            let existingCompanyGuids = new Set();
            try {
                const response = await fetch(window.apiConfig.getUrl('/companies'), {
                    method: 'GET',
                    headers: headers
                });

                if (response.status === 401) {
                    addImportLog('⚠️ Your session has expired. Please login again to import companies.', 'error');
                    addImportLog('💡 Click the user icon or refresh the page to login again.', 'info');
                    importBtn.disabled = false;
                    showStatus('⚠️ Session expired. Please login again to continue.', 'error');
                    return;
                }

                if (response.ok) {
                    const result = await response.json();
                    if (result.success && Array.isArray(result.data)) {
                        existingCompanyGuids = new Set(result.data.map(c => c.companyGuid || c.guid));
                        addImportLog(`📊 Found ${existingCompanyGuids.size} existing companies in database`, 'info');
                    }
                }
            } catch (error) {
                addImportLog(`⚠️ Could not check existing companies: ${error.message}`, 'info');
            }

            let importedCount = 0;
            let skippedCount = 0;

            for (const company of selectedCompanies) {
                // Check if company already exists in database
                const companyGuid = company.companyGuid || company.guid;
                const exists = existingCompanyGuids.has(companyGuid);

                if (exists) {
                    addImportLog(`⏭️ Skipped: ${company.name} (already exists in database)`, 'info');
                    skippedCount++;
                } else {
                    // Create company object for our database
                    // Using exact field names and types expected by backend
                    const newCompany = {
                        // ========== USER ASSOCIATION (REQUIRED) ==========
                        // Send both camelCase and lowercase to ensure backend compatibility
                        userId: currentUser.userId,
                        userid: currentUser.userId,
                        user_id: currentUser.userId,

                        // ========== IDENTIFICATION (1 field) ==========
                        companyGuid: company.companyGuid || company.guid || '',

                        // ========== CORE INFORMATION (20 fields) ==========
                        alterId: company.alterId || '',
                        code: company.code || '',
                        name: company.name || '',
                        mailingName: company.mailingName || '',
                        addressLine1: company.addressLine1 || '',
                        addressLine2: company.addressLine2 || '',
                        addressLine3: company.addressLine3 || '',
                        addressLine4: company.addressLine4 || '',
                        pincode: company.pincode || company.zipcode || '',
                        state: company.state || '',
                        country: company.country || 'India',
                        telephone: company.telephone || company.phone || '',
                        mobile: company.mobile || company.phonenumber || '',
                        fax: company.fax || company.faxnumber || '',
                        email: company.email || '',
                        website: company.website || '',
                        panNumber: company.panNumber || '',
                        financialYearStart: formatTallyDate(company.financialYearStart) || '',
                        booksStart: formatTallyDate(company.booksStart) || '',
                        currencySymbol: company.currencySymbol || '₹',
                        currencyFormalName: company.currencyFormalName || 'INR',
                        currencyDecimalPlaces: company.currencyDecimalPlaces || 2,

                        // ========== GST DETAILS (7 fields - India) ==========
                        gstApplicableDate: formatTallyDate(company.gstApplicableDate) || '',
                        gstState: company.gstState || '',
                        gstType: company.gstType || '',
                        gstin: company.gstin || '',
                        gstFreezone: company.gstFreezone === true || company.gstFreezone === 'true',
                        gstEInvoiceApplicable: company.gstEInvoiceApplicable === true || company.gstEInvoiceApplicable === 'true',
                        gstEWayBillApplicable: company.gstEWayBillApplicable === true || company.gstEWayBillApplicable === 'true',

                        // ========== VAT DETAILS (5 fields - GCC) ==========
                        vatEmirate: company.vatEmirate || '',
                        vatApplicableDate: formatTallyDate(company.vatApplicableDate) || '',
                        vatRegistrationNumber: company.vatRegistrationNumber || '',
                        vatAccountId: company.vatAccountId || '',
                        vatFreezone: company.vatFreezone === true || company.vatFreezone === 'true',

                        // ========== COMPANY FEATURES (6 fields) ==========
                        billwiseEnabled: company.billwiseEnabled === true || company.billwiseEnabled === 'true',
                        costcentreEnabled: company.costcentreEnabled === true || company.costcentreEnabled === 'true',
                        batchEnabled: company.batchEnabled === true || company.batchEnabled === 'true',
                        useDiscountColumn: company.useDiscountColumn === true || company.useDiscountColumn === 'true',
                        useActualColumn: company.useActualColumn === true || company.useActualColumn === 'true',
                        payrollEnabled: company.payrollEnabled === true || company.payrollEnabled === 'true',

                        // ========== AUDIT TIMESTAMPS (2 fields) ==========
                        createdAt: company.createdAt || new Date().toISOString(),
                        updatedAt: company.updatedAt || new Date().toISOString(),

                        // ========== BACKWARD COMPATIBILITY (7+ fields) ==========
                        guid: company.companyGuid || company.guid || '',
                        businessType: company.businessType || 'Tally Company',
                        status: company.status || 'imported',
                        importedFrom: company.importedFrom || 'tally',
                        importedDate: company.importedDate || new Date().toISOString(),
                        syncStatus: company.syncStatus || 'pending',
                        lastSyncDate: company.lastSyncDate || null
                    };

                    // SEND TO BACKEND API
                    addImportLog(`Importing: ${company.name}...`, 'info');
                    const backendResponse = await sendCompanyToBackend(newCompany);

                    if (backendResponse.success) {
                        addImportLog(`✅ Imported: ${company.name} (ID: ${backendResponse.backendId})`, 'success');
                        importedCount++;

                        // AUTO-SYNC GROUPS from Tally for this company
                        try {
                            addImportLog(`   🔄 Syncing groups from Tally for ${company.name}...`, 'info');
                            await syncGroupsForCompany(backendResponse.backendId, company);
                            addImportLog(`   ✅ Groups synced successfully`, 'success');
                        } catch (syncError) {
                            addImportLog(`   ⚠️ Group sync failed: ${syncError.message}`, 'info');
                        }
                    } else {
                        addImportLog(`❌ Failed: ${company.name} - ${backendResponse.error}`, 'error');
                        skippedCount++;
                    }
                }
            }

            addImportLog(`\n✅ Import Complete!`, 'success');
            addImportLog(`Imported: ${importedCount} | Skipped: ${skippedCount}`, 'success');

            showStatus(`✅ Successfully imported ${importedCount} company/companies with groups!`, 'success');

            // Reset selection
            selectedCompanies = [];
            document.querySelectorAll('.company-checkbox').forEach(cb => cb.checked = false);

            // Show success message and clear after 2 seconds
            setTimeout(() => {
                document.getElementById('importProgress').style.display = 'none';
                window.router.navigate('groups');
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

        const importMoreBtn = document.getElementById('importMoreBtn');
        if (importMoreBtn) {
            importMoreBtn.addEventListener('click', fetchTallyCompanies);
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
                updateSelection();
                showStatus('Selection cleared', 'info');
            });
        }
    }

    window.initializeImportCompany = async function () {
        console.log('Initializing Import Company Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getTemplate();
            loadConnectionHistory();
            renderConnectionHistory();
            setupEventListeners();
            console.log('✅ Import Company Page initialized');
            // Auto-fetch from Tally on page load
            setTimeout(async () => {
                await fetchTallyCompanies();
            }, 500);
        }
    };
})();
