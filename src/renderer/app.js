class App {
    constructor() {
        this.initialized = false;
        this.tableHeaderToggleBtnOpened = false;
        this.initializeUpgrades();
        console.log('✅ App class created');
    }

    /**
     * Initialize upgraded services
     * @private
     */
    initializeUpgrades() {
        try {
            // Initialize Logger
            this.logger = window.loggerApp;
            this.logger.info('Logger initialized');

            // Initialize Error Boundary
            this.errorBoundary = window.errorBoundary;
            this.logger.info('Error Boundary initialized');

            // Initialize Telemetry
            this.telemetry = window.telemetry;
            this.telemetry.trackEvent('App', 'Initialized');
            this.logger.info('Telemetry initialized');

            // Initialize Offline Queue
            this.offlineQueue = window.offlineQueue;
            this.logger.info('Offline Queue initialized');

            // Initialize Sync Reconciliation
            this.syncReconciliation = window.syncReconciliation;
            this.logger.info('Sync Reconciliation initialized');

            console.log('✅ All upgrade services initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing upgrades:', error);
        }
    }

    /**
     * Set table header toggle button visibility
     * @param {boolean} visible 
     * @param {boolean} isCollapsed - whether the header is currently collapsed
     */
    setTableHeaderToggleBtnVisibility(visible, isCollapsed = true) {
        this.tableHeaderToggleBtnOpened = visible;
        const btn = document.getElementById('tableHeaderToggleBtnOpened');
        if (btn) {
            btn.style.display = visible ? 'flex' : 'none';

            // Update icon based on state
            const svg = btn.querySelector('svg');
            if (svg) {
                if (isCollapsed) {
                    // Chevron Down (to expand)
                    svg.innerHTML = '<path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
                    btn.setAttribute('title', 'Expand Header');
                } else {
                    // Chevron Up (to collapse)
                    svg.innerHTML = '<path d="M18 15L12 9L6 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
                    btn.setAttribute('title', 'Collapse Header');
                }
            }
        }
    }

    async init() {
        console.log('🚀 App.init() called');
        if (this.initialized) {
            console.log('⚠️ App already initialized, skipping...');
            return;
        }

        try {
            console.log('🚀 App initialization started...');

<<<<<<< HEAD
=======
            // Check Auth - Use sessionStorage (migrated from localStorage for security)
>>>>>>> b730e34e0a80a7374987b7b416a882891f368180
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.log('⚠️ No auth token found - rendering login');
                this.renderLogin();
            } else {
                console.log('✅ Auth token found - rendering app layout');
                this.renderAppLayout();

                console.log('🔄 Initializing Tally data on startup...');
                this.initializeTallyData();
            }

            this.initialized = true;
            window.appInitialized = true;
            console.log('✅ App initialization complete');
        } catch (error) {
            console.error('❌ Error during app initialization:', error);
            console.error('Stack:', error.stack);
            document.body.innerHTML = `<div style="padding: 20px; color: red;"><h1>Error Loading App</h1><p>${error.message}</p><pre style="font-size: 10px; white-space: pre-wrap;">${error.stack}</pre></div>`;
        }
    }

    async initializeTallyData() {
        console.log('\n' + '='.repeat(80));
        console.log('🚀 TALLY DATA INITIALIZATION');
        console.log('='.repeat(80));

        try {
            await this.checkTallyConnection();

            await this.fetchTallyLicense();

            await this.fetchTallyCompanies();


            this.initializeSyncScheduler();

            console.log('✅ Tally initialization complete');
            console.log('='.repeat(80) + '\n');
        } catch (error) {
            console.error('❌ Error during Tally initialization:', error);
        }
    }


    async initializeNewSyncSystem() {
        try {
            console.log('\n[4] INITIALIZING NEW SYNC SYSTEM');
            console.log('-'.repeat(80));

            if (window.AppInitializer) {
                await window.AppInitializer.initialize();
                console.log('✅ New sync system initialized');
            } else {
                console.warn('⚠️ AppInitializer not available');
            }
        } catch (error) {
            console.error('❌ Error initializing new sync system:', error);
        }
    }

    async checkTallyConnection() {
        try {
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            const tallyPort = appSettings.tallyPort || 9000;

            console.log('📦 Raw appSettings:', localStorage.getItem('appSettings'));
            console.log('📊 Parsed appSettings:', appSettings);
            console.log('🔌 Tally Port to use:', tallyPort, '(type:', typeof tallyPort, ')');

            console.log(`\n[1] CHECKING TALLY CONNECTION (localhost:${tallyPort})`);
            console.log('-'.repeat(80));

            if (window.electronAPI && window.electronAPI.invoke) {
                const isConnected = await window.electronAPI.invoke('check-tally-connection', { tallyPort });

                if (isConnected) {
                    console.log('✅ TALLY CONNECTION: SUCCESS');
                    console.log(`   Server: http://localhost:${tallyPort}`);
                    console.log('   Status: ONLINE');

                    // Store connection status
                    localStorage.setItem('tallyConnectionStatus', JSON.stringify({
                        connected: true,
                        timestamp: new Date().toISOString(),
                        server: `localhost:${tallyPort}`
                    }));
                    window.tallyConnectionStatus = { connected: true };
                } else {
                    console.warn('⚠️ TALLY CONNECTION: OFFLINE');
                    console.log(`   Server: http://localhost:${tallyPort}`);
                    console.log('   Status: UNREACHABLE');
                    window.tallyConnectionStatus = { connected: false };
                }
            } else {
                console.warn('⚠️ electronAPI not available');
            }
        } catch (error) {
            console.error('❌ Error checking Tally connection:', error);
        }
    }

    async fetchTallyLicense() {
        try {
            // Get Tally port from settings
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            const tallyPort = appSettings.tallyPort || 9000;

            console.log('\n[2] FETCHING TALLY LICENSE INFO');
            console.log('-'.repeat(80));
            console.log('🔌 Using Tally Port:', tallyPort);

            if (window.electronAPI && window.electronAPI.invoke) {
                const response = await window.electronAPI.invoke('fetch-license', { tallyPort });

                if (response.success && response.data) {
                    console.log('✅ LICENSE INFO: RETRIEVED');
                    console.log(`   License Number: ${response.data.license_number}`);
                    console.log(`   Product Version: ${response.data.product_version}`);
                    console.log(`   Status: ${response.data.status}`);
                    console.log(`   Companies Count: ${response.data.company_count}`);
                    console.log(`   Ledgers Count: ${response.data.ledger_count}`);
                    console.log(`   Vouchers Count: ${response.data.voucher_count}`);

                    // Store license info
                    localStorage.setItem('tallyLicense', JSON.stringify(response.data));
                    localStorage.setItem('tallyLicenseNumber', response.data.license_number);
                    window.tallyLicense = response.data;
                } else {
                    console.warn('⚠️ LICENSE INFO: NOT AVAILABLE');
                    console.log('   Error:', response.error);
                }
            } else {
                console.warn('⚠️ electronAPI not available for license fetch');
            }
        } catch (error) {
            console.error('❌ Error fetching license:', error);
        }
    }

    async fetchTallyCompanies() {
        try {
            // Get Tally port from settings
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            const tallyPort = appSettings.tallyPort || 9000;

            console.log('\n[3] FETCHING TALLY COMPANIES');
            console.log('-'.repeat(80));
            console.log('🔌 Using Tally Port:', tallyPort);

            if (window.electronAPI && window.electronAPI.invoke) {
                const response = await window.electronAPI.invoke('fetch-companies', { tallyPort });

                if (response.success && response.data) {
                    console.log(`✅ COMPANIES: RETRIEVED (${response.data.length} companies)`);
                    console.log('');

                    // Store companies in localStorage for later use
                    localStorage.setItem('tallyCompanies', JSON.stringify(response.data));
                    window.tallyCompanies = response.data;

                    // Display each company
                    response.data.forEach((company, idx) => {
                        console.log(`   Company ${idx + 1}: ${company.name}`);
                        console.log(`   ├─ GUID: ${company.companyGuid}`);
                        console.log(`   ├─ Code: ${company.code}`);
                        console.log(`   ├─ Country: ${company.country}`);
                        console.log(`   ├─ State: ${company.state || 'N/A'}`);
                        console.log(`   ├─ Currency: ${company.currencyFormalName} (${company.currencySymbol})`);
                        console.log(`   ├─ Financial Year Start: ${company.financialYearStart}`);
                        console.log(`   ├─ Features: Billwise=${company.billwiseEnabled}, Discount=${company.useDiscountColumn}, Payroll=${company.payrollEnabled}`);
                        console.log(`   ├─ Fields: ${Object.keys(company).length}/56`);
                        console.log(`   └─ Status: ${company.status} (Sync: ${company.syncStatus})`);
                        console.log('');
                    });

                    console.log('✅ Companies available in window.tallyCompanies');
                    console.log('⚠️ NOTE: Companies will be sent to backend when user clicks "Import Selected Companies"');

                } else {
                    console.warn('⚠️ COMPANIES: NOT AVAILABLE');
                    console.log('   Error:', response.error);
                }
            } else {
                console.warn('⚠️ electronAPI not available for companies fetch');
            }
        } catch (error) {
            console.error('❌ Error fetching companies:', error);
        }
    }

    /**
     * Initialize legacy sync scheduler based on appSettings
     * (Kept for backward compatibility)
     */
    initializeSyncScheduler() {
        try {
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            const syncInterval = appSettings.syncInterval || 0;

            console.log('\n[5] INITIALIZING LEGACY SYNC SCHEDULER (if configured)');
            console.log('-'.repeat(80));
            console.log('📊 Sync Interval from settings:', syncInterval, 'minutes');

            if (syncInterval <= 0) {
                console.log('⏸️ Auto-sync disabled (interval is 0 or not set)');
                return;
            }

            // Create and start the sync scheduler
            if (window.SyncScheduler) {
                window.syncScheduler = new window.SyncScheduler();
                window.syncScheduler.start();
                console.log(`✅ Sync scheduler started with ${syncInterval} minute interval`);
            } else {
                console.warn('⚠️ SyncScheduler class not available');
            }
        } catch (error) {
            console.error('❌ Error initializing sync scheduler:', error);
        }
    }

    /**
     * Check if Tally license matches user license
     */
    checkLicenseMatch() {
        try {
            // Get user license from storage (check multiple locations)
            let userLicense = sessionStorage.getItem('userLicenseNumber') ||
                sessionStorage.getItem('licenseNumber') ||
                localStorage.getItem('licenseNumber') ||
                localStorage.getItem('licenceNo');

            // If still not found, try to get from currentUser object
            if (!userLicense) {
                const currentUser = sessionStorage.getItem('currentUser');
                if (currentUser) {
                    try {
                        const parsed = JSON.parse(currentUser);
                        userLicense = parsed.licenceNo || parsed.licenseNumber;
                    } catch (e) {
                        console.error('Error parsing currentUser:', e);
                    }
                }
            }

            // Get Tally license from storage
            let tallyLicense = localStorage.getItem('tallyLicenseNumber');

            // If not found, try to get from tallyLicense object
            if (!tallyLicense) {
                const tallyLicenseObj = localStorage.getItem('tallyLicense');
                if (tallyLicenseObj) {
                    try {
                        const parsed = JSON.parse(tallyLicenseObj);
                        tallyLicense = parsed.license_number;
                    } catch (e) {
                        console.error('Error parsing tallyLicense:', e);
                    }
                }
            }

            if (!userLicense || !tallyLicense) {
                console.log('⚠️ License check: Missing license information', { userLicense, tallyLicense });
                return false;
            }

            // Normalize licenses for comparison
            const normalizeString = (str) => String(str || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            const normalizedUser = normalizeString(userLicense);
            const normalizedTally = normalizeString(tallyLicense);

            const matches = normalizedUser === normalizedTally;
            console.log('🔐 License match check:', matches ? '✅ MATCHED' : '❌ NOT MATCHED', {
                userLicense: normalizedUser,
                tallyLicense: normalizedTally
            });

            return matches;
        } catch (error) {
            console.error('❌ Error checking license match:', error);
            return false;
        }
    }

    renderLogin() {
        try {
            console.log('🚀 Rendering login page using auth.js...');

            // Stop session monitoring on login page
            if (window.sessionManager) {
                window.sessionManager.stop();
                console.log('✅ Session monitoring stopped (login page)');
            }

            // Clear body and use auth.js login template
            document.body.innerHTML = '';
            document.body.className = '';

            // Call the auth.js initializeAuth function
            if (typeof window.initializeAuth === 'function') {
                window.initializeAuth();
                console.log('✅ Login page rendered using auth.js template');
            } else {
                console.error('❌ initializeAuth function not found!');
                // Fallback to basic login
                document.body.className = 'bg-gray-100 h-screen flex items-center justify-center';
                document.body.innerHTML = `
                    <div class="w-full max-w-md">
                        <div class="bg-white rounded-lg shadow-lg p-8">
                            <h1 class="text-2xl font-bold text-center text-gray-800 mb-2">Tally Prime</h1>
                            <p class="text-center text-gray-500 mb-8">Enterprise ERP System</p>
                            <p class="text-red-500 mb-4">Error: Auth module not loaded. Please refresh.</p>
                        </div>
                    </div>
                `;
            }
        } catch (e) {
            console.error('❌ Error in renderLogin:', e);
            document.body.innerHTML = `<div style="color: red; padding: 20px;"><h1>Error Rendering Login</h1><p>${e.message}</p></div>`;
        }
    }

    renderAppLayout() {
        try {
            // Start session monitoring for single-device login
            if (window.sessionManager) {
                window.sessionManager.start();
                console.log('✅ Session monitoring started');
            }

            const licenseMatches = true;





            document.body.className = 'h-screen overflow-hidden flex bg-gray-50';
            document.body.innerHTML = `
                <aside class="flex flex-col relative transition-all duration-300" id="mainSidebar" style="width: 80px; flex-shrink: 0; height: 100vh; background: white; border-right: 1px solid #e5e7eb;" onmouseenter="window.app.expandSidebar()" onmouseleave="window.app.collapseSidebar()">
                    <!-- Fixed Header - Collapsed View (Icon only) -->
                    <div id="collapsedHeader" class="h-16 px-3 border-b border-gray-200 flex-shrink-0 flex flex-col justify-center transition-all duration-300">
                        <div class="flex items-center justify-center">
                            <div class="brand-icon-wrapper" onclick="window.router.navigate('home')" aria-label="Talliffy Home" title="Talliffy Home">
                                <img src="assets/brand/talliffy-icon.png" alt="Talliffy Icon" class="brand-icon-image brand-icon-collapsed" />
                            </div>
                        </div>
                    </div>
                    
                    <!-- Expanded Content (Hidden by default) -->
                    <div id="expandedHeader" style="display: none; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                        <div class="flex items-center gap-2" style="white-space: nowrap;">
                            <div class="brand-icon-wrapper" onclick="window.router.navigate('home')" aria-label="Talliffy Home" title="Talliffy Home">
                                <img src="assets/brand/talliffy-icon.png" alt="Talliffy Icon" class="brand-icon-image brand-icon-expanded" />
                            </div>
                            <h1 class="brand-title" style="cursor: pointer; margin: 0;" onclick="window.router.navigate('home')">Talliffy</h1>
                        </div>
                        <p class="brand-subtitle">Enterprise Sync Platform</p>
                    </div>
                    
                    <!-- Resizable Navigation Area -->
                    <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-1 transition-all duration-300" id="sidebarNav">
                        <div class="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide sidebar-section-title">Main</div>
                        <a class="nav-link active" data-route="import-company">
                            <span class="nav-icon">📥</span> <span>Add Company</span>
                        </a>
                        <a class="nav-link" data-route="company-sync">
                            <span class="nav-icon">🏢</span> <span>My Company</span>
                        </a>
                        <a class="nav-link" data-route="sync-settings">
                            <span class="nav-icon">📡</span> <span>Tally Sync</span>
                        </a>
                        <a class="nav-link" data-route="settings">
                            <span class="nav-icon">⚙️</span> <span>Settings</span>
                        </a>
                    </nav>
                    
                    <!-- Resize Handle - Only on nav/logout area (starts below header) -->
                    <div id="sidebarResizeHandle" style="position: absolute; top: 64px; right: 0; width: 4px; height: calc(100% - 64px); cursor: ew-resize; background: transparent; z-index: 1000;" 
                         onmouseenter="this.style.background='rgba(59, 130, 246, 0.5)'" 
                         onmouseleave="this.style.background='transparent'"></div>
                    
                    <!-- Logout Button at bottom of sidebar -->
                    <div class="p-2 border-t border-gray-200 flex-shrink-0 flex justify-center items-center">
                        <button id="logoutBtn" class="py-2 px-4 text-white bg-red-500 text-sm font-semibold hover:bg-red-600 transition-colors cursor-pointer rounded-lg" style="border: none; width: auto;">
                            Logout
                        </button>
                    </div>
                </aside>
                <main class="flex-1 flex flex-col min-w-0" style="height: 100vh; overflow: hidden;">
                    <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm" style="flex-shrink: 0; position: sticky; top: 0; z-index: 40;">
                        <div class="flex items-center gap-4">
                            <button id="tableHeaderToggleBtnOpened" class="header-toggle-btn" title="Collapse Header" style="${this.tableHeaderToggleBtnOpened ? 'display: flex;' : 'display: none;'}">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18 15L12 9L6 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                            <div class="h-8 w-px bg-gray-300"></div>
                            <h2 class="text-lg font-semibold text-gray-800" id="page-title">Home</h2>
                        </div>
                        <div class="flex items-center gap-4">
                            <div class="flex items-center gap-2">
                                <span style="font-size: 16px;">🏢</span>
                                <select id="globalCompanySelector" class="global-company-selector px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 cursor-pointer hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                                    <option value="">Select Companies</option>
                                </select>
                            </div>
                            <div id="userProfileBtn" class="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors" onclick="window.app.showUserProfile()" title="View Profile">
                                <span style="font-size: 16px;">👤</span>
                                <span class="text-sm font-medium text-gray-700" id="headerUsername">User</span>
                                <span style="font-size: 10px; color: #9ca3af;">▼</span>
                            </div>
                            <span id="notificationBell" style="font-size: 24px; cursor: pointer; opacity: 0.8; transition: opacity 0.2s;" title="Open Notifications" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">
                                🔔
                            </span>
                        </div>
                    </header>
                    <div id="page-content" class="flex-1 overflow-y-auto bg-gray-50" style="height: 100%; min-height: 0;">Loading...</div>
                </main>
            `;

            // Update user info
            this.updateUserInfo();

            // Load companies for global selector (apiConfig should be available by now)
            setTimeout(() => {
                this.loadGlobalCompanies();
            }, 100);

            // Setup global company selector change handler
            this.setupGlobalCompanySelector();

            // Setup sidebar resize functionality
            this.setupSidebarResize();

            // Setup notification bell click handler
            this.setupNotificationBell();

            // Retry notification bell setup after a delay if notification center not ready
            setTimeout(() => {
                if (!window.notificationCenter || !window.notificationCenter.initialized) {
                    console.log('⏳ Retrying notification bell setup...');
                    this.setupNotificationBell();
                }
            }, 1000);

            console.log('✅ App layout rendered successfully');
            console.log('📍 page-content element exists:', !!document.getElementById('page-content'));

            // Setup router after layout is rendered
            setTimeout(() => {
                this.setupRouter();
                this.restoreSidebarStates();
            }, 100);
        } catch (e) {
            console.error('❌ Error in renderAppLayout:', e);
            document.body.innerHTML = `<div style="color: red; padding: 20px;"><h1>Error Rendering App</h1><p>${e.message}</p></div>`;
        }
    }

    updateUserInfo() {
        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            console.log('✅ User info updated:', user.fullName || user.username);

            // Update header username display
            const headerUsername = document.getElementById('headerUsername');
            if (headerUsername) {
                headerUsername.textContent = user.fullName || user.username || 'User';
            }

            // Setup logout button
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async () => {
                    const confirmed = await window.Popup.confirm({
                        title: 'Logout',
                        message: 'Are you sure you want to logout?',
                        icon: '⚠️',
                        confirmText: 'Logout',
                        cancelText: 'Cancel',
                        confirmVariant: 'danger'
                    });
                    if (confirmed) {
                        await this.handleLogout();
                    }
                });
            }
        } catch (e) {
            console.error('❌ Error updating user info:', e);
        }
    }

    /**
     * Show user profile popup with user details
     * Delegates to UserProfileService
     */
    async showUserProfile() {
        if (window.userProfileService) {
            await window.userProfileService.showProfile();
        } else {
            console.error('❌ UserProfileService not available');
            if (window.Popup) {
                window.Popup.alert({
                    title: 'Error',
                    message: 'Profile service not loaded. Please refresh the page.',
                    icon: '❌',
                    variant: 'danger'
                });
            }
        }
    }

    async loadGlobalCompanies() {
        try {
            // Check if apiConfig is available
            if (!window.apiConfig) {
                console.warn('⚠️ window.apiConfig not available yet, waiting...');
                // Wait for apiConfig to be initialized
                let attempts = 0;
                while (!window.apiConfig && attempts < 50) {
                    await new Promise(r => setTimeout(r, 100));
                    attempts++;
                }

                if (!window.apiConfig) {
                    console.error('❌ window.apiConfig still not available after waiting');
                    const selector = document.getElementById('globalCompanySelector');
                    if (selector) {
                        selector.innerHTML = '<option value="">API Configuration Error</option>';
                    }
                    return;
                }
            }

            // Get current user from session storage
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const userId = currentUser.userId;

            console.log('🏢 Loading companies for user:', userId);
            console.log('   Current user:', JSON.stringify(currentUser, null, 2));

            let endpoint;
            let response;

            // PREFERRED: If we have userId, fetch user-specific companies first
            if (userId) {
                endpoint = window.apiConfig.getUrl(`/companies/user/${userId}`);
                console.log('   📡 Using user-specific endpoint:', endpoint);

                response = await fetch(endpoint, {
                    method: 'GET',
                    headers: window.authService.getHeaders()
                });

                console.log('   📊 Response status:', response.status);

                // If user endpoint fails, fall back to general endpoint
                if (!response.ok) {
                    console.warn(`⚠️ User endpoint returned ${response.status}, trying general endpoint`);
                    endpoint = window.apiConfig.getUrl('/companies');
                    response = await fetch(endpoint, {
                        method: 'GET',
                        headers: window.authService.getHeaders()
                    });
                }
            } else {
                // No userId, use general endpoint
                endpoint = window.apiConfig.getUrl('/companies');
                console.log('   📡 No userId found, using general endpoint:', endpoint);

                response = await fetch(endpoint, {
                    method: 'GET',
                    headers: window.authService.getHeaders()
                });

                console.log('   📊 Response status:', response.status);
            }

            // Check response
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Failed to load companies, HTTP:', response.status);
                console.log('   Response:', errorText.substring(0, 200));

                const selector = document.getElementById('globalCompanySelector');
                if (selector) {
                    selector.innerHTML = '<option value="">Error loading companies (HTTP ' + response.status + ')</option>';
                }
                return;
            }

            const result = await response.json();
            console.log('📦 Companies API response received');
            console.log('   Success:', result.success);
            console.log('   Count:', result.count);

            // Extract companies data from response
            const companies = (result.success && Array.isArray(result.data)) ? result.data : [];
            console.log('📋 Total companies to display:', companies.length);

            const selector = document.getElementById('globalCompanySelector');
            if (!selector) {
                console.warn('⚠️ globalCompanySelector element not found in DOM');
                return;
            }

            if (companies.length === 0) {
                console.warn('⚠️ No companies available to display');
                selector.innerHTML = '<option value="">No companies available</option>';
                return;
            }

            // Log first company to see structure
            console.log('🔍 First company structure:', JSON.stringify(companies[0], null, 2));

            // Build options HTML
            const optionsHtml = companies.map(c => {
                // Try multiple field names for ID and name
                const id = c.id || c.cmpId || c.companyId;
                const name = c.name || c.companyName || c.cmpName;

                if (!id || !name) {
                    console.warn('⚠️ Missing id or name for company:', JSON.stringify(c));
                    return '';
                }

                console.log(`   ✓ Option: ID=${id}, Name="${name}"`);
                return `<option value="${id}">${name}</option>`;
            }).filter(opt => opt).join('');

            selector.innerHTML = '<option value="">Select a company</option>' + optionsHtml;

            // Restore previously selected company
            const savedCompanyId = localStorage.getItem('selectedCompanyId');
            if (savedCompanyId) {
                const option = selector.querySelector(`option[value="${savedCompanyId}"]`);
                if (option) {
                    selector.value = savedCompanyId;
                    window.selectedCompanyId = parseInt(savedCompanyId);
                    console.log('✅ Restored saved company ID:', window.selectedCompanyId);
                } else {
                    console.log('⚠️ Saved company ID not found in current list:', savedCompanyId);
                }
            }

            console.log('✅ Successfully populated dropdown with', companies.length, 'companies');
        } catch (error) {
            console.error('❌ Error loading companies:', error);
            console.error('   Stack:', error.stack);
            const selector = document.getElementById('globalCompanySelector');
            if (selector) {
                selector.innerHTML = '<option value="">Error loading companies</option>';
            }
        }
    }

    setupGlobalCompanySelector() {
        const selector = document.getElementById('globalCompanySelector');
        if (selector) {
            selector.addEventListener('change', (e) => {
                const companyId = e.target.value ? parseInt(e.target.value) : null;
                window.selectedCompanyId = companyId;

                // Save selection to localStorage
                if (companyId) {
                    localStorage.setItem('selectedCompanyId', companyId.toString());
                } else {
                    localStorage.removeItem('selectedCompanyId');
                }

                console.log('🏢 Global company selected:', companyId);

                // Show notification
                const companyName = e.target.options[e.target.selectedIndex].text;
                if (window.notificationService) {
                    window.notificationService.info(
                        companyId ? `Switched to ${companyName}` : 'Viewing all companies',
                        'Company Selection',
                        2000
                    );
                }

                // Trigger event for pages to reload data
                window.dispatchEvent(new CustomEvent('companyChanged', {
                    detail: { companyId }
                }));

                // Reload current page if it's groups or ledgers
                const currentRoute = window.router?.currentRoute;
                if (currentRoute === 'groups' || currentRoute === 'ledgers') {
                    window.router.navigate(currentRoute);
                }
            });
        }
    }

    setupSidebarResize() {
        const sidebarContainer = document.querySelector('div[style*="width: 256px"]'); // The outer fixed container
        const sidebar = document.getElementById('mainSidebar');
        const resizeHandle = document.getElementById('sidebarResizeHandle');

        if (!sidebar || !resizeHandle || !sidebarContainer) return;

        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        // Function to adjust text size based on sidebar width
        const adjustTextSize = (width) => {
            const minWidth = 200;
            const maxWidth = 400;

            // Calculate scale factor (0.75 to 1.0)
            const scale = 0.75 + (0.25 * (width - minWidth) / (maxWidth - minWidth));

            // Apply font size scaling ONLY to nav and logout button
            const nav = sidebar.querySelector('nav');
            const logoutSection = sidebar.querySelector('.p-4.border-t');

            if (nav) {
                nav.style.fontSize = `${scale * 100}%`;
            }

            if (logoutSection) {
                logoutSection.style.fontSize = `${scale * 100}%`;
            }
        };

        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = sidebarContainer.offsetWidth;

            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const diff = e.clientX - startX;
            const newWidth = startWidth + diff;

            // Respect min and max width
            const minWidth = 200;
            const maxWidth = 400;

            if (newWidth >= minWidth && newWidth <= maxWidth) {
                sidebarContainer.style.width = newWidth + 'px';
                adjustTextSize(newWidth);
                // Save width to localStorage
                localStorage.setItem('sidebarWidth', newWidth);
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });

        // Restore saved width
        const savedWidth = localStorage.getItem('sidebarWidth');
        if (savedWidth) {
            const width = parseInt(savedWidth);
            sidebarContainer.style.width = width + 'px';
            adjustTextSize(width);
        } else {
            adjustTextSize(256); // Default width
        }
    }

    setupNotificationBell() {
        console.log('🔍 Setting up notification bell...');
        const bell = document.getElementById('notificationBell');
        console.log('   Bell element found:', !!bell);

        if (bell) {
            bell.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔔 Notification bell clicked!');
                console.log('   notificationCenter exists:', !!window.notificationCenter);
                console.log('   notificationCenter initialized:', window.notificationCenter?.initialized);

                if (window.notificationCenter) {
                    console.log('   ▶ Calling toggle()...');
                    window.notificationCenter.toggle();
                    console.log('   isOpen after toggle:', window.notificationCenter.isOpen);
                } else {
                    console.error('❌ NotificationCenter not available!');
                    alert('Notification center not loaded yet. Please wait a moment and try again.');
                }
            });
            console.log('✅ Notification bell click handler attached');
        } else {
            console.error('❌ Notification bell element NOT FOUND in DOM');
        }
    }

    expandSidebar() {
        const sidebar = document.getElementById('mainSidebar');
        const expandedHeader = document.getElementById('expandedHeader');
        const collapsedHeader = document.getElementById('collapsedHeader');
        const sidebarNav = document.getElementById('sidebarNav');

        if (!sidebar) return;

        // Set expanded state attribute
        sidebar.setAttribute('data-expanded', 'true');

        // Expand sidebar
        sidebar.style.width = '250px';
        sidebar.style.transition = 'width 0.3s ease-in-out';

        // Show expanded header content
        if (expandedHeader) {
            expandedHeader.style.display = 'block';
            setTimeout(() => {
                expandedHeader.style.opacity = '1';
            }, 50);
        }

        // Hide collapsed header to avoid duplicate icon when expanded
        if (collapsedHeader) {
            collapsedHeader.style.display = 'none';
        }
    }

    collapseSidebar() {
        const sidebar = document.getElementById('mainSidebar');
        const expandedHeader = document.getElementById('expandedHeader');
        const collapsedHeader = document.getElementById('collapsedHeader');

        if (!sidebar) return;

        // Remove expanded state attribute
        sidebar.setAttribute('data-expanded', 'false');

        // Collapse sidebar
        sidebar.style.width = '80px';
        sidebar.style.transition = 'width 0.3s ease-in-out';

        // Hide expanded header content
        if (expandedHeader) {
            expandedHeader.style.opacity = '0';
            setTimeout(() => {
                expandedHeader.style.display = 'none';
            }, 150);
        }

        // Show collapsed header again
        if (collapsedHeader) {
            collapsedHeader.style.display = '';
        }
    }

    async handleLogout() {
        console.log('🔐 App.handleLogout() - Starting logout sequence');
        try {
            // Stop session monitoring FIRST
            if (window.sessionManager) {
                console.log('   → Stopping WebSocket session manager');
                window.sessionManager.stop();
            }

            // Call logout on auth service (will call backend and clear storage)
            if (window.authService) {
                console.log('   → Calling authService.logout()');
                await window.authService.logout();
                console.log('   ✅ Logout successful, redirect will happen via authService');
            } else {
                // Fallback: just clear storage and reload
                console.log('   ❌ authService not available, clearing storage and reloading');
                localStorage.clear();
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            }
        } catch (error) {
            console.error('🔴 Logout error:', error);
            // Force clear and reload on error
            console.log('   → Forcing page reload due to error');
            localStorage.clear();
            setTimeout(() => {
                window.location.reload();
            }, 500);
        }
    }

    /**
     * Toggle sidebar section
     * @param {string} sectionId 
     */
    toggleSection(sectionId) {
        const container = document.getElementById(sectionId);
        const header = container?.previousElementSibling;

        if (container && header) {
            container.classList.toggle('collapsed');
            header.classList.toggle('collapsed');

            // Save state to localStorage
            const states = JSON.parse(localStorage.getItem('sidebarStates') || '{}');
            states[sectionId] = container.classList.contains('collapsed');
            localStorage.setItem('sidebarStates', JSON.stringify(states));
        }
    }

    /**
     * Restore sidebar section states
     */
    restoreSidebarStates() {
        const states = JSON.parse(localStorage.getItem('sidebarStates') || '{}');

        // If no saved states, expand all sections by default
        if (Object.keys(states).length === 0) {
            const allSections = ['finance-section', 'inventory-section'];
            allSections.forEach(sectionId => {
                const container = document.getElementById(sectionId);
                const header = container?.previousElementSibling;
                if (container && header) {
                    container.classList.remove('collapsed');
                    header.classList.remove('collapsed');
                }
            });
            return;
        }

        // Restore saved states
        Object.keys(states).forEach(sectionId => {
            const container = document.getElementById(sectionId);
            const header = container?.previousElementSibling;
            if (container && header) {
                if (states[sectionId]) {
                    container.classList.add('collapsed');
                    header.classList.add('collapsed');
                } else {
                    container.classList.remove('collapsed');
                    header.classList.remove('collapsed');
                }
            }
        });
    }

    /**
     * Logout method (called by SessionManager when session is invalidated)
     */
    async logout() {
        console.log('🔐 App.logout() called by SessionManager');
        await this.handleLogout();
    }

    async setupRouter() {
        try {
            console.log('🔧 Setting up router...');

            if (!window.router) {
                window.router = new Router();
            }

            // Load all pages dynamically
            console.log('📦 Loading page modules...');
            const pagesMap = await PageLoader.loadAllPages();

            // Register pages with router
            window.router.registerPages(pagesMap);
            console.log('✅ Pages registered with router');

            // Setup navigation listeners
            window.router.setupNavigation();
            window.router.setupHashRouting();

            // Navigate to initial route
            const hash = window.location.hash.slice(1) || 'home';
            console.log('🚀 Navigating to:', hash);
            await window.router.navigate(hash);

            console.log('✅ Router setup complete');
        } catch (error) {
            console.error('❌ Router setup error:', error);
            const content = document.getElementById('page-content');
            if (content) {
                content.innerHTML = `<div class="p-6"><h1 class="text-2xl font-bold text-red-600 mb-4">Router Error</h1><pre class="bg-gray-100 p-4 rounded text-sm overflow-auto">${error.message}</pre></div>`;
            }
        }
    }
}

console.log('✅ Creating window.app...');
window.app = new App();
console.log('✅ window.app created');

<<<<<<< HEAD
=======
// Expose refreshCompanyList globally for use after import
>>>>>>> b730e34e0a80a7374987b7b416a882891f368180
window.refreshCompanyList = async function () {
    console.log('🔄 Refreshing company list...');
    if (window.app && window.app.loadGlobalCompanies) {
        await window.app.loadGlobalCompanies();
        console.log('✅ Company list refreshed');
    } else {
        console.warn('⚠️ App not ready for company refresh');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOMContentLoaded fired');
    window.app.init();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('✅ DOM already ready, initializing...');
    setTimeout(() => window.app.init(), 100);
}

console.log('✅ app.js loaded complete');
