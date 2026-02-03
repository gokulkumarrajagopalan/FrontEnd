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

            // Check Auth - Use sessionStorage (migrated from localStorage for security)
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

            document.body.className = 'h-screen overflow-hidden flex bg-gray-50';
            document.body.innerHTML = `
                <style>
                    /* Force Light Theme Colors for Sidebar Navigation */
                    #mainSidebar .nav-link {
                        color: #1e293b !important; /* Slate 800 - High contrast text */
                        visibility: visible !important;
                        opacity: 1 !important;
                    }
                    #mainSidebar .nav-link .nav-text {
                        color: #1e293b !important; /* Ensure all child spans are visible */
                        visibility: visible !important;
                        opacity: 1 !important;
                        display: block !important;
                        font-weight: 500 !important;
                    }
                    #mainSidebar .nav-link:hover {
                        color: #1d4ed8 !important; /* Blue 700 */
                        background: #eff6ff !important; /* Blue 50 */
                    }
                    #mainSidebar .nav-link:hover .nav-text {
                        color: #1d4ed8 !important;
                    }
                    #mainSidebar .nav-link.active {
                        color: #1e40af !important; /* Blue 800 */
                        background: #dbeafe !important; /* Blue 100 */
                        font-weight: 600 !important;
                    }
                    #mainSidebar .nav-link.active .nav-text {
                        color: #1e40af !important;
                    }
                    #mainSidebar .nav-link .nav-icon {
                        filter: none !important;
                        opacity: 1 !important;
                        visibility: visible !important;
                    }
                    /* Ensure header is visible */
                    #expandedHeader {
                        display: flex !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                    }
                    #expandedHeader h1 {
                        color: #1e293b !important;
                        display: block !important;
                        opacity: 1 !important;
                        visibility: visible !important;
                    }
                    #expandedHeader p {
                        color: #64748b !important;
                        display: block !important;
                        opacity: 1 !important;
                        visibility: visible !important;
                    }
                </style>
                <aside class="flex flex-col relative" id="mainSidebar" style="width: 280px; flex-shrink: 0; height: 100vh; background: #f0f4f8; border-right: 1px solid #e2e8f0; box-shadow: 4px 0 24px rgba(0, 0, 0, 0.05);">
                    <!-- Fixed Header -->
                    <div id="expandedHeader" style="padding: 1.5rem 1rem; border-bottom: 1px solid #e2e8f0; background: #ffffff;">
                        <div class="flex items-center gap-3" style="white-space: nowrap;">
                            <div class="brand-icon-wrapper" onclick="window.router.navigate('home')" aria-label="Talliffy Home" title="Talliffy Home" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 8px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                                <img src="assets/brand/talliffy-icon.png" alt="Talliffy Icon" class="brand-icon-image brand-icon-expanded" style="width: 32px; height: 32px;" />
                            </div>
                            <div style="display: flex; flex-direction: column;">
                                <h1 class="brand-title" style="cursor: pointer; margin: 0; font-size: 1.25rem; font-weight: 700; color: #1e293b !important; letter-spacing: -0.02em; display: block !important;" onclick="window.router.navigate('home')">Talliffy</h1>
                                <p class="brand-subtitle" style="font-size: 0.75rem; color: #64748b !important; margin: 0; font-weight: 500; display: block !important;">Enterprise Sync Platform</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Navigation Area -->
                    <nav class="flex-1 overflow-y-auto py-4 px-3" id="sidebarNav" style="scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent;">
                        <div style="padding: 0 0.75rem 0.5rem; font-size: 0.7rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem;">NAVIGATION</div>
                        <a class="nav-link" data-route="company-sync" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1rem; margin-bottom: 0.375rem; border-radius: 10px; font-size: 0.9rem; font-weight: 500; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; text-decoration: none; color: #1e293b;">
                            <span class="nav-icon" style="font-size: 1.25rem; filter: grayscale(0);">🏢</span>
                            <span class="nav-text" style="flex: 1; color: #1e293b;">My Company</span>
                        </a>
                        <a class="nav-link" data-route="import-company" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1rem; margin-bottom: 0.375rem; border-radius: 10px; font-size: 0.9rem; font-weight: 500; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; text-decoration: none; color: #1e293b;">
                            <span class="nav-icon" style="font-size: 1.25rem; filter: grayscale(0);">📥</span>
                            <span class="nav-text" style="flex: 1; color: #1e293b;">Add Company</span>
                        </a>
                        <a class="nav-link" data-route="settings" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1rem; margin-bottom: 0.375rem; border-radius: 10px; font-size: 0.9rem; font-weight: 500; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; text-decoration: none; color: #1e293b;">
                            <span class="nav-icon" style="font-size: 1.25rem; filter: grayscale(0);">⚙️</span>
                            <span class="nav-text" style="flex: 1; color: #1e293b;">Setting</span>
                        </a>
                        <a class="nav-link" data-route="profile" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1rem; margin-bottom: 0.375rem; border-radius: 10px; font-size: 0.9rem; font-weight: 500; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; text-decoration: none; color: #1e293b;">
                            <span class="nav-icon" style="font-size: 1.25rem; filter: grayscale(0);">👤</span>
                            <span class="nav-text" style="flex: 1; color: #1e293b;">Profile</span>
                        </a>
                        <a class="nav-link" data-route="system-info" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1rem; margin-bottom: 0.375rem; border-radius: 10px; font-size: 0.9rem; font-weight: 500; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; text-decoration: none; color: #1e293b;">
                            <span class="nav-icon" style="font-size: 1.25rem; filter: grayscale(0);">💻</span>
                            <span class="nav-text" style="flex: 1; color: #1e293b;">System Info</span>
                        </a>
                        <a class="nav-link" data-route="tutorial" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1rem; margin-bottom: 0.375rem; border-radius: 10px; font-size: 0.9rem; font-weight: 500; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; text-decoration: none; color: #1e293b;">
                            <span class="nav-icon" style="font-size: 1.25rem; filter: grayscale(0);">❓</span>
                            <span class="nav-text" style="flex: 1; color: #1e293b;">Tutorial</span>
                        </a>
                        <a class="nav-link" data-route="support" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1rem; margin-bottom: 0.375rem; border-radius: 10px; font-size: 0.9rem; font-weight: 500; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; text-decoration: none; color: #1e293b;">
                            <span class="nav-icon" style="font-size: 1.25rem; filter: grayscale(0);">📞</span>
                            <span class="nav-text" style="flex: 1; color: #1e293b;">Support</span>
                        </a>
                        <a class="nav-link" data-route="update-app" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1rem; margin-bottom: 0.375rem; border-radius: 10px; font-size: 0.9rem; font-weight: 500; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; text-decoration: none; color: #1e293b;">
                            <span class="nav-icon" style="font-size: 1.25rem; filter: grayscale(0);">⬇️</span>
                            <span class="nav-text" style="flex: 1; color: #1e293b;">Update App</span>
                        </a>
                        <a class="nav-link" data-route="purchase" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1rem; margin-bottom: 0.375rem; border-radius: 10px; font-size: 0.9rem; font-weight: 500; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; text-decoration: none; color: #1e293b;">
                            <span class="nav-icon" style="font-size: 1.25rem; filter: grayscale(0);">💳</span>
                            <span class="nav-text" style="flex: 1; color: #1e293b;">Purchase</span>
                        </a>
                    </nav>
                    
                    <!-- Status Bar at bottom of sidebar -->
                    <div style="padding: 1rem; border-top: 1px solid #e2e8f0; background: #ffffff;">
                        <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.75rem;">
                            <!-- Tally Status -->
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span style="width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block;"></span>
                                <span style="color: #475569; font-weight: 600;">Tally: CONNECTED</span>
                            </div>
                            
                            <!-- Internet Status -->
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span style="width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block;"></span>
                                <span style="color: #475569; font-weight: 600;">Internet: Connected</span>
                                <span style="color: #475569;">📶</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Logout Button -->
                    <div style="padding: 1rem; border-top: 1px solid #e2e8f0; background: #ffffff;">
                        <button id="logoutBtn" style="width: 100%; padding: 0.75rem 1rem; background: #f1f5f9; color: #000000; font-size: 0.875rem; font-weight: 600; border: 1px solid #e2e8f0; border-radius: 10px; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                            <span style="font-size: 1.1rem;">🚪</span>
                            <span>Logout</span>
                        </button>
                    </div>
                </aside>
                <main class="flex-1 flex flex-col min-w-0" style="height: 100vh; overflow: hidden; background: #ffffff;">
                    <div id="page-content" class="flex-1 overflow-y-auto" style="height: 100%; min-height: 0; background: #f8f9fb; padding: 0;">Loading...</div>
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

// Expose refreshCompanyList globally for use after import
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
