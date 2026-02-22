(function () {
    const getTemplate = () => {
        const fetchBtn = window.UIComponents.button({
            id: 'fetchCompaniesBtn',
            text: 'Fetch from Tally',
            icon: '<i class="fas fa-plug"></i>',
            variant: 'primary',
            size: 'md'
        });

        return window.Layout.page({
            title: 'Import Companies',
            subtitle: 'Connect to Tally Prime and import your company data seamlessly',
            headerActions: fetchBtn,
            content: `
                <div style="display: flex; flex-direction: column; gap: var(--ds-space-6);">
                    <!-- Stats Card -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--ds-space-4);">
                        <div style="background: var(--ds-bg-surface); border: 1px solid var(--ds-border-default); border-radius: var(--ds-radius-2xl); padding: var(--ds-space-6); display: flex; align-items: center; justify-content: space-between;">
                            <div>
                                <h4 style="font-size: var(--ds-text-2xs); font-weight: var(--ds-weight-bold); color: var(--ds-text-tertiary); text-transform: uppercase; margin-bottom: var(--ds-space-2);">Tally Status</h4>
                                <div id="tallyConnectionStatus" style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold); color: var(--ds-text-secondary);">Not Connected</div>
                            </div>
                            <div style="font-size: var(--ds-text-4xl); color: var(--ds-text-tertiary); opacity: 0.2;"><i class="fas fa-plug"></i></div>
                        </div>
                        <div style="background: var(--ds-bg-surface); border: 1px solid var(--ds-border-default); border-radius: var(--ds-radius-2xl); padding: var(--ds-space-6); display: flex; align-items: center; justify-content: space-between;">
                            <div>
                                <h4 style="font-size: var(--ds-text-2xs); font-weight: var(--ds-weight-bold); color: var(--ds-text-tertiary); text-transform: uppercase; margin-bottom: var(--ds-space-2);">Available Companies</h4>
                                <div id="tallyCompanyCount" style="font-size: var(--ds-text-3xl); font-weight: var(--ds-weight-bold); color: var(--ds-primary-600);">0</div>
                            </div>
                            <div style="font-size: var(--ds-text-4xl); color: var(--ds-primary-500); opacity: 0.2;"><i class="fas fa-building"></i></div>
                        </div>
                    </div>

                    <!-- Connection History / Status -->
                    <div id="statusMessage" style="display: none;"></div>

                    <!-- Companies List Area -->
                    <div id="companiesListSection" style="display: none;">
                        <div style="background: var(--ds-bg-surface); border: 1px solid var(--ds-border-default); border-radius: var(--ds-radius-3xl); overflow: hidden; display: flex; flex-direction: column;">
                            <div style="padding: var(--ds-space-6) var(--ds-space-8); border-bottom: 1px solid var(--ds-border-default); background: var(--ds-bg-surface-sunken); display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <h3 style="font-size: var(--ds-text-xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin: 0;">Select Companies</h3>
                                    <p style="font-size: var(--ds-text-sm); color: var(--ds-text-secondary); margin: var(--ds-space-1) 0 0 0;">Choose which companies to import from your Tally server</p>
                                </div>
                                <div style="display: flex; gap: var(--ds-space-2);">
                                    ${window.UIComponents.button({ id: 'importMoreBtn', text: 'Refresh', icon: '<i class="fas fa-sync-alt"></i>', variant: 'secondary', size: 'sm' })}
                                    ${window.UIComponents.button({ id: 'clearSelectionBtn', text: 'Clear', icon: '<i class="fas fa-undo"></i>', variant: 'secondary', size: 'sm' })}
                                </div>
                            </div>
                            <div id="companiesContainer" style="padding: var(--ds-space-8); display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: var(--ds-space-4);">
                                <!-- Company cards injected here -->
                            </div>
                            <div id="importButtonContainer" style="padding: var(--ds-space-6) var(--ds-space-8); border-top: 1px solid var(--ds-border-default); background: var(--ds-bg-surface-sunken); display: none;">
                                ${window.UIComponents.button({ id: 'importSelectedBtn', text: 'Import Selected Companies', icon: '<i class="fas fa-file-import"></i>', variant: 'primary', fullWidth: true, size: 'lg' })}
                            </div>
                        </div>
                    </div>

                    <!-- Import Progress -->
                    <div id="importProgress" style="display: none;">
                        <div style="background: var(--ds-bg-surface); border: 1px solid var(--ds-border-default); border-radius: var(--ds-radius-3xl); padding: var(--ds-space-8); display: flex; flex-direction: column; gap: var(--ds-space-6);">
                            <div style="display: flex; align-items: center; gap: var(--ds-space-4);">
                                <div style="width: 48px; height: 48px; min-width: 48px; border-radius: var(--ds-radius-xl); background: var(--ds-primary-100); color: var(--ds-primary-600); display: flex; align-items: center; justify-content: center; font-size: var(--ds-text-2xl);">
                                    <i class="fas fa-cog fa-spin"></i>
                                </div>
                                <div>
                                    <h3 style="font-size: var(--ds-text-xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin: 0;">Importing Data...</h3>
                                    <p style="font-size: var(--ds-text-sm); color: var(--ds-text-secondary); margin: var(--ds-space-1) 0 0 0;">Synchronizing company records with the cloud server</p>
                                </div>
                            </div>
                            <div id="importLog" style="background: var(--ds-bg-surface-sunken); border-radius: var(--ds-radius-2xl); padding: var(--ds-space-6); font-family: monospace; font-size: var(--ds-text-xs); color: var(--ds-text-primary); max-height: 400px; overflow-y: auto;">
                                <!-- Logs here -->
                            </div>
                        </div>
                    </div>
                </div>
            `
        });
    };

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
                <div style="text-align: center; padding: var(--ds-space-8); color: var(--ds-text-tertiary);">
                    <div style="font-size: var(--ds-text-4xl); margin-bottom: var(--ds-space-3); opacity: 0.2;"><i class="fas fa-history"></i></div>
                    <p style="font-size: var(--ds-text-sm); margin: 0;">No connection history yet</p>
                    <p style="font-size: var(--ds-text-xs); margin: var(--ds-space-1) 0 0 0;">Click "Fetch from Tally" to connect</p>
                </div>
            `;
            return;
        }

        container.innerHTML = connectionHistory.map(conn => {
            const date = new Date(conn.timestamp);
            const timeAgo = getTimeAgo(date);
            const isSuccess = conn.status === 'success';

            return `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--ds-space-4) var(--ds-space-5); background: var(--ds-bg-surface); border: 1px solid var(--ds-border-default); border-radius: var(--ds-radius-xl); transition: all var(--ds-duration-base) var(--ds-ease);">
                    <div style="display: flex; align-items: center; gap: var(--ds-space-4);">
                        <div style="width: 40px; height: 40px; border-radius: var(--ds-radius-lg); background: ${isSuccess ? 'var(--ds-success-50)' : 'var(--ds-error-50)'}; color: ${isSuccess ? 'var(--ds-success-600)' : 'var(--ds-error-600)'}; display: flex; align-items: center; justify-content: center; font-size: var(--ds-text-lg);">
                            <i class="fas fa-${isSuccess ? 'check' : 'times'}"></i>
                        </div>
                        <div>
                            <p style="font-size: var(--ds-text-sm); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin: 0;">${conn.message}</p>
                            <p style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary); margin: var(--ds-space-1) 0 0 0;">${timeAgo}</p>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <p style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold); color: ${isSuccess ? 'var(--ds-success-600)' : 'var(--ds-error-600)'}; margin: 0;">${conn.companyCount}</p>
                        <p style="font-size: var(--ds-text-2xs); color: var(--ds-text-tertiary); text-transform: uppercase; margin: 0;">companies</p>
                    </div>
                </div>
            `;
        }).join('<div style="height: var(--ds-space-3);"></div>');
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

    function addImportLog(message, status = 'info') {
        const log = document.getElementById('importLog');
        if (!log) return;
        const entry = document.createElement('div');
        entry.style.marginBottom = 'var(--ds-space-1)';
        entry.style.color = status === 'success' ? 'var(--ds-success-600)' :
            status === 'error' ? 'var(--ds-error-600)' :
                'var(--ds-text-primary)';
        entry.innerHTML = `<span style="color: var(--ds-text-tertiary); margin-right: var(--ds-space-2);">[${new Date().toLocaleTimeString()}]</span> ${message}`;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
    }

    const init = () => {
        const fetchBtn = document.getElementById('fetchCompaniesBtn');
        if (fetchBtn) fetchBtn.onclick = fetchTallyCompanies;

        const importMoreBtn = document.getElementById('importMoreBtn');
        if (importMoreBtn) importMoreBtn.onclick = refreshCompaniesFromDB;

        const clearBtn = document.getElementById('clearSelectionBtn');
        if (clearBtn) {
            clearBtn.onclick = () => {
                document.querySelectorAll('.company-checkbox').forEach(cb => cb.checked = false);
                updateSelection();
            };
        }

        const importSelectedBtn = document.getElementById('importSelectedBtn');
        if (importSelectedBtn) importSelectedBtn.onclick = importSelectedCompanies;

        loadConnectionHistory();
        renderConnectionHistory();
    };

    function showStatus(message, type = 'info') {
        if (window.notificationService) {
            window.notificationService.show({
                type: type,
                message: message,
                duration: 5000
            });
        }

        const statusDiv = document.getElementById('statusMessage');
        if (!statusDiv) return;

        statusDiv.style.display = 'block';
        statusDiv.innerHTML = window.UIComponents.alert({
            message: message,
            type: type,
            className: 'mb-6'
        });
    }

    async function fetchTallyCompanies() {
        const fetchBtn = document.getElementById('fetchCompaniesBtn');
        const statusText = document.getElementById('tallyConnectionStatus');

        if (!fetchBtn) return;

        fetchBtn.disabled = true;
        fetchBtn.innerHTML = '<span><i class="fas fa-spinner fa-spin"></i></span><span>Fetching...</span>';

        if (statusText) {
            statusText.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Connecting...';
            statusText.style.color = 'var(--ds-text-secondary)';
        }

        try {
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            const tallyPort = appSettings.tallyPort || 9000;

            if (window.electronAPI && window.electronAPI.invoke) {
                const result = await window.electronAPI.invoke('fetch-companies', { tallyPort });

                if (result.success && result.data && Array.isArray(result.data)) {
                    tallyCompanies = result.data;
                    const countElem = document.getElementById('tallyCompanyCount');
                    if (countElem) countElem.textContent = tallyCompanies.length;

                    if (statusText) {
                        statusText.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Connected';
                        statusText.style.color = 'var(--ds-success-600)';
                    }

                    await displayCompanies(tallyCompanies);
                    showStatus(`Found ${tallyCompanies.length} companies in Tally`, 'success');
                    saveConnectionHistory('success', tallyCompanies.length, 'Connected successfully');
                } else {
                    let errorMsg = result.error || 'Failed to fetch companies';
                    if (statusText) {
                        statusText.innerHTML = '<i class="fas fa-exclamation-circle mr-2"></i>Failed';
                        statusText.style.color = 'var(--ds-error-600)';
                    }
                    throw new Error(errorMsg);
                }
            }
        } catch (error) {
            showStatus(error.message || 'Connection failed', 'error');
            saveConnectionHistory('error', 0, error.message);
        } finally {
            fetchBtn.disabled = false;
            fetchBtn.innerHTML = '<span><i class="fas fa-plug"></i></span><span>Fetch from Tally</span>';
        }
    }

    async function refreshCompaniesFromDB() {
        const refreshBtn = document.getElementById('importMoreBtn');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<span><i class="fas fa-spinner fa-spin"></i></span><span>Loading...</span>';
        }
        try {
            if (!window.authService || !window.authService.isAuthenticated()) {
                showStatus('Please login to refresh companies', 'error');
                return;
            }
            const headers = window.authService.getHeaders();
            const response = await fetch(window.apiConfig.getUrl('/companies'), {
                method: 'GET',
                headers: headers
            });
            if (response.ok) {
                const result = await response.json();
                if (result.success && Array.isArray(result.data)) {
                    await displayCompanies(result.data.map(c => ({
                        ...c,
                        guid: c.companyGuid || c.guid
                    })));
                    showStatus(`Loaded ${result.data.length} companies`, 'success');
                } else {
                    showStatus('No companies found', 'info');
                }
            } else {
                showStatus('Failed to load companies', 'error');
            }
        } catch (error) {
            showStatus('Error loading companies: ' + error.message, 'error');
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<span><i class="fas fa-sync-alt"></i></span><span>Refresh</span>';
            }
        }
    }

    async function displayCompanies(companies) {
        const container = document.getElementById('companiesContainer');
        const listSection = document.getElementById('companiesListSection');
        const importContainer = document.getElementById('importButtonContainer');

        if (!container) return;

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
                        importedGuids = new Set(result.data.map(c => (c.companyGuid || c.guid || '').toUpperCase().trim()));
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching companies from database:', error);
        }

        if (companies.length === 0) {
            container.innerHTML = window.UIComponents.emptyState({
                title: 'No companies found',
                message: 'Ensure Tally Prime is running and ODBC is enabled.'
            });
            listSection.style.display = 'block';
            importContainer.style.display = 'none';
            return;
        }

        container.innerHTML = companies.map((company, index) => {
            const companyGuid = (company.guid || company.companyGuid || '').toUpperCase().trim();
            const isImported = companyGuid ? importedGuids.has(companyGuid) : false;

            return `
            <div class="company-card" data-index="${index}" data-imported="${isImported}" 
                 style="background: ${isImported ? 'var(--ds-bg-surface-sunken)' : 'var(--ds-bg-surface)'}; 
                        border: 1px solid var(--ds-border-default); 
                        border-radius: var(--ds-radius-2xl); 
                        padding: var(--ds-space-5); 
                        display: flex; 
                        align-items: center; 
                        gap: var(--ds-space-4); 
                        cursor: ${isImported ? 'default' : 'pointer'}; 
                        transition: all var(--ds-duration-base) var(--ds-ease);
                        ${isImported ? 'opacity: 0.7;' : ''}"
                 onmouseover="${isImported ? '' : "this.style.borderColor='var(--ds-primary-500)'; this.style.shadow='var(--ds-shadow-md)';"}"
                 onmouseout="${isImported ? '' : "this.style.borderColor='var(--ds-border-default)'; this.style.shadow='none';"}"
            >
                <div style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: var(--ds-radius-lg); background: ${isImported ? 'var(--ds-bg-surface)' : 'var(--ds-primary-50)'}; color: ${isImported ? 'var(--ds-text-tertiary)' : 'var(--ds-primary-600)'}; font-size: var(--ds-text-xl);">
                    <i class="fas fa-building"></i>
                </div>
                
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); font-size: var(--ds-text-base); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${company.name}
                    </div>
                    <div style="display: flex; align-items: center; gap: var(--ds-space-2); margin-top: var(--ds-space-1);">
                        <span style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary);"><i class="fas fa-map-marker-alt"></i> ${company.state || 'N/A'}</span>
                        ${isImported
                    ? window.UIComponents.badge({ text: 'IMPORTED', variant: 'neutral', size: 'sm' })
                    : window.UIComponents.badge({ text: 'AVAILABLE', variant: 'success', size: 'sm' })}
                    </div>
                </div>

                <input type="checkbox" class="company-checkbox" data-index="${index}" ${isImported ? 'disabled style="display:none;"' : 'style="width: 20px; height: 20px; accent-color: var(--ds-primary-600); cursor: pointer;"'}>
            </div>
        `;
        }).join('');

        // Add event listeners
        document.querySelectorAll('.company-card').forEach(card => {
            const index = card.getAttribute('data-index');
            const isImported = card.getAttribute('data-imported') === 'true';

            if (!isImported) {
                card.onclick = (e) => {
                    if (e.target.tagName !== 'INPUT') {
                        const checkbox = card.querySelector('.company-checkbox');
                        checkbox.checked = !checkbox.checked;
                        updateSelection();
                    }
                };
            }
        });

        document.querySelectorAll('.company-checkbox').forEach(checkbox => {
            checkbox.onchange = updateSelection;
        });

        listSection.style.display = 'block';
        importContainer.style.display = 'block';
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

            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
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
            const authToken = localStorage.getItem('authToken');
            const deviceToken = localStorage.getItem('deviceToken');
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
                addImportLog(`   Sent to Backend API (ID: ${result.data?.id || result.id || 'N/A'})`, 'success');
                addImportLog(`   Backend response: ${result.message || 'Company created'}`, 'success');
                return { success: true, backendId: result.data?.id || result.id };
            } else {
                // Extract detailed error information
                let errorMsg = result.message || result.error || `HTTP ${response.status}`;
                let errorDetails = result.details || result.fieldErrors || '';

                addImportLog(`   Backend Error (${response.status}): ${errorMsg}`, 'error');
                if (errorDetails) {
                    addImportLog(`   Details: ${JSON.stringify(errorDetails)}`, 'error');
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
            addImportLog(`   API Error: ${err.message}`, 'error');
            console.error('API Call Error:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Trigger first-time full sync for a newly imported company
     * Scenario 1: First-time Import → Full Sync → Reconcile
     */
    async function triggerFirstTimeSync(companyId, companyData) {
        console.log(`🔄 Starting first-time sync for: ${companyData.name}`);

        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        const authToken = localStorage.getItem('authToken');
        const deviceToken = localStorage.getItem('deviceToken');
        const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');

        try {
            // Call sync_master.py via Electron IPC for full sync
            if (!window.electronAPI || !window.electronAPI.syncMasterData) {
                throw new Error('Sync API not available');
            }

            const result = await window.electronAPI.syncMasterData({
                companyName: companyData.name,
                cmpId: companyId,
                userId: currentUser.userId,
                tallyPort: appSettings.tallyPort || 9000,
                backendUrl: window.apiConfig.baseURL,
                authToken: authToken,
                deviceToken: deviceToken
            });

            if (result.success) {
                console.log('✅ Full sync completed');
                addImportLog(`   📊 Sync results: ${JSON.stringify(result.results)}`, 'info');

                // Trigger reconciliation for all entity types
                await runFirstTimeReconciliation(companyId);

                return result;
            } else {
                throw new Error(result.error || 'Sync failed');
            }
        } catch (error) {
            console.error('First-time sync error:', error);
            throw error;
        }
    }

    /**
     * Run reconciliation for all entity types after first-time sync
     */
    async function runFirstTimeReconciliation(companyId) {
        console.log(`🔍 Starting reconciliation for company ${companyId}`);

        const entityTypes = [
            'Group', 'Currency', 'Unit', 'StockGroup',
            'StockCategory', 'CostCategory', 'CostCenter',
            'Godown', 'VoucherType', 'TaxUnit',
            'Ledger', 'StockItem'
        ];

        let totalDiscrepancies = 0;

        for (const entityType of entityTypes) {
            try {
                const result = await reconcileEntity(companyId, entityType);
                if (result.missing > 0 || result.extra > 0) {
                    totalDiscrepancies += result.missing + result.extra;
                    addImportLog(`   <i class="fas fa-exclamation-triangle mr-2"></i> ${entityType}: ${result.missing} missing, ${result.extra} extra`, 'info');
                } else {
                    addImportLog(`   <i class="fas fa-check-circle mr-2"></i> ${entityType}: Verified (${result.matched} records)`, 'success');
                }
            } catch (error) {
                console.error(`Reconciliation error for ${entityType}:`, error);
                addImportLog(`   ⚠️ ${entityType}: Reconciliation failed - ${error.message}`, 'info');
            }
        }

        if (totalDiscrepancies === 0) {
            addImportLog(`   ✅ All entity types reconciled successfully`, 'success');
        } else {
            addImportLog(`   ⚠️ Found ${totalDiscrepancies} total discrepancies`, 'info');
        }
    }

    /**
     * Reconcile a single entity type
     */
    async function reconcileEntity(companyId, entityType) {
        try {
            const authToken = localStorage.getItem('authToken');
            const deviceToken = localStorage.getItem('deviceToken');

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'X-Device-Token': deviceToken
            };

            const response = await fetch(
                window.apiConfig.getUrl(`/api/companies/${companyId}/reconcile`),
                {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        entityType: entityType
                    })
                }
            );

            if (response.ok) {
                const result = await response.json();
                return {
                    matched: result.matched || 0,
                    missing: result.missing || 0,
                    extra: result.extra || 0,
                    missingGuids: result.missingGuids || []
                };
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error(`Reconcile entity ${entityType} error:`, error);
            return { matched: 0, missing: 0, extra: 0 };
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
            const authToken = localStorage.getItem('authToken');
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');

            console.log('🔐 Import - Auth check:', {
                hasToken: !!authToken,
                hasUser: !!currentUser,
                userId: currentUser?.userId,
                username: currentUser?.username
            });

            if (!authToken) {
                addImportLog('Authentication token not found. Please login.', 'error');
                console.error('No authToken in localStorage');
                showStatus('Please login to import companies', 'error');
                importBtn.disabled = false;
                return;
            }

            if (!currentUser || !currentUser.userId) {
                addImportLog('User information not found. Please login again.', 'error');
                console.error('No currentUser in localStorage or missing userId');
                showStatus('User session invalid. Please login again.', 'error');
                importBtn.disabled = false;
                return;
            }

            // Generate device token if missing
            let deviceToken = localStorage.getItem('deviceToken');
            if (!deviceToken) {
                deviceToken = 'device-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now();
                localStorage.setItem('deviceToken', deviceToken);
                addImportLog('🔑 Generated new device token', 'info');
            }

            // Build headers manually
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'X-Device-Token': deviceToken
            };

            addImportLog(`Authenticated as: ${currentUser.username} (ID: ${currentUser.userId})`, 'success');

            // Fetch existing companies from database to check for duplicates
            let existingCompanyGuids = new Set();
            try {
                const response = await fetch(window.apiConfig.getUrl('/companies'), {
                    method: 'GET',
                    headers: headers
                });

                if (response.status === 401) {
                    addImportLog('Your session has expired. Please login again to import companies.', 'error');
                    addImportLog('💡 Click the user icon or refresh the page to login again.', 'info');
                    importBtn.disabled = false;
                    showStatus('Session expired. Please login again to continue.', 'error');
                    return;
                }

                if (response.ok) {
                    const result = await response.json();
                    if (result.success && Array.isArray(result.data)) {
                        existingCompanyGuids = new Set(result.data.map(c => c.companyGuid || c.guid));
                        addImportLog(`Found ${existingCompanyGuids.size} existing companies in database`, 'info');
                    }
                }
            } catch (error) {
                addImportLog(`Could not check existing companies: ${error.message}`, 'info');
            }

            let importedCount = 0;
            let skippedCount = 0;

            for (const company of selectedCompanies) {
                // Check if company already exists in database
                const companyGuid = company.companyGuid || company.guid;
                const exists = existingCompanyGuids.has(companyGuid);

                if (exists) {
                    addImportLog(`Skipped: ${company.name} (already exists in database)`, 'info');
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
                        addImportLog(`Imported: ${company.name} (ID: ${backendResponse.backendId})`, 'success');
                        importedCount++;

                        // TRIGGER FIRST-TIME FULL SYNC → RECONCILE
                        try {
                            addImportLog(`Starting first-time full sync for ${company.name}...`, 'info');

                            // Mark as syncing in notification center
                            if (window.notificationCenter) {
                                window.notificationCenter.updateCompanySyncStatus(
                                    company.name,
                                    'syncing',
                                    0
                                );
                            }

                            const syncResult = await triggerFirstTimeSync(backendResponse.backendId, company);
                            addImportLog(`First-time sync completed successfully`, 'success');

                            // Update as success in notification center
                            if (window.notificationCenter) {
                                window.notificationCenter.updateCompanySyncStatus(
                                    company.name,
                                    'success',
                                    syncResult.totalCount || 0
                                );
                            }

                            // CASE 1: Run reconciliation after company import
                            addImportLog(`Running reconciliation for ${company.name}...`, 'info');
                            try {
                                const reconResult = await window.electronAPI.reconcileData({
                                    companyId: backendResponse.backendId,
                                    companyName: company.name,
                                    userId: currentUser.userId,
                                    tallyPort: appSettings.tallyPort || 9000,
                                    backendUrl: window.apiConfig.baseURL,
                                    authToken: authToken,
                                    deviceToken: deviceToken,
                                    entityType: 'all'
                                });

                                if (reconResult.success) {
                                    if (reconResult.totalSynced > 0) {
                                        addImportLog(`Reconciliation: ${reconResult.totalSynced} records auto-synced`, 'success');
                                    } else {
                                        addImportLog(`Reconciliation: All records in sync`, 'success');
                                    }
                                } else {
                                    addImportLog(`Reconciliation completed with warnings`, 'info');
                                }
                            } catch (reconError) {
                                addImportLog(`Reconciliation skipped: ${reconError.message}`, 'info');
                            }

                            // Show success notification
                            if (window.notificationService) {
                                window.notificationService.show({
                                    type: 'success',
                                    message: `${company.name} imported & synced successfully`,
                                    details: `All data synchronized from Tally`,
                                    duration: 5000
                                });
                            }
                        } catch (syncError) {
                            addImportLog(`First-time sync failed: ${syncError.message}`, 'error');

                            // Update as error in notification center
                            if (window.notificationCenter) {
                                window.notificationCenter.updateCompanySyncStatus(
                                    company.name,
                                    'error',
                                    0,
                                    syncError.message
                                );
                            }

                            // Show error notification
                            if (window.notificationService) {
                                window.notificationService.show({
                                    type: 'error',
                                    message: `Sync failed for ${company.name}`,
                                    details: syncError.message,
                                    duration: 8000
                                });
                            }
                        }
                    } else {
                        addImportLog(`Failed: ${company.name} - ${backendResponse.error}`, 'error');
                        skippedCount++;
                    }
                }
            }

            addImportLog(`Import Complete!`, 'success');
            addImportLog(`Imported: ${importedCount} | Skipped: ${skippedCount}`, 'success');

            showStatus(`Successfully imported ${importedCount} company/companies with groups!`, 'success');

            // Reset selection
            selectedCompanies = [];
            document.querySelectorAll('.company-checkbox').forEach(cb => cb.checked = false);

            // Refresh company data in the app
            if (importedCount > 0) {
                addImportLog(`Refreshing company data...`, 'info');

                // Refresh companies in sidebar/dropdown
                if (window.refreshCompanyList) {
                    await window.refreshCompanyList();
                    addImportLog(`Company list refreshed`, 'success');
                }

                // Refresh dashboard if function exists
                if (window.refreshDashboard) {
                    await window.refreshDashboard();
                }

                // Dispatch event to notify other components
                window.dispatchEvent(new CustomEvent('companies-updated', {
                    detail: { importedCount, skippedCount }
                }));
            }

            // Show success message and navigate after 2 seconds
            setTimeout(() => {
                document.getElementById('importProgress').style.display = 'none';

                // Show notification before navigation
                if (window.notificationService) {
                    window.notificationService.success(`${importedCount} company/companies imported successfully!`);
                }

                window.router.navigate('company-sync');
            }, 2000);

        } catch (error) {
            addImportLog(`Error: ${error.message}`, 'error');
            showStatus(`Import failed: ${error.message}`, 'error');
        } finally {
            importBtn.disabled = false;
        }
    }

    window.initializeImportCompany = async function () {
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getTemplate();
            init();

            // Auto-fetch after short delay to improve UX
            setTimeout(fetchTallyCompanies, 400);
        }
    };
})();
