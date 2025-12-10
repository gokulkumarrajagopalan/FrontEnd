/**
 * Main Application Entry Point
 * Handles layout, sidebar, header, and initialization
 */

console.log('✅ app.js loading...');
console.log('✅ Checking for required global objects...');
console.log('   - window.electronAPI:', typeof window.electronAPI);

class App {
    constructor() {
        this.initialized = false;
        console.log('✅ App class created');
    }

    async init() {
        console.log('🚀 App.init() called');
        if (this.initialized) {
            console.log('⚠️ App already initialized, skipping...');
            return;
        }

        try {
            console.log('🚀 App initialization started...');

            // Check Auth
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.log('⚠️ No auth token found - rendering login');
                this.renderLogin();
            } else {
                console.log('✅ Auth token found - rendering app layout');
                this.renderAppLayout();
                
                // Initialize Tally connection on app startup
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
            // STEP 1: Check Tally Connection
            await this.checkTallyConnection();
            
            // STEP 2: Fetch License Info
            await this.fetchTallyLicense();
            
            // STEP 3: Fetch Companies
            await this.fetchTallyCompanies();
            
            console.log('✅ Tally initialization complete');
            console.log('='.repeat(80) + '\n');
        } catch (error) {
            console.error('❌ Error during Tally initialization:', error);
        }
    }

    async checkTallyConnection() {
        try {
            console.log('\n[1] CHECKING TALLY CONNECTION (localhost:9000)');
            console.log('-'.repeat(80));
            
            if (window.electronAPI && window.electronAPI.invoke) {
                const isConnected = await window.electronAPI.invoke('check-tally-connection');
                
                if (isConnected) {
                    console.log('✅ TALLY CONNECTION: SUCCESS');
                    console.log('   Server: http://localhost:9000');
                    console.log('   Status: ONLINE');
                    
                    // Store connection status
                    localStorage.setItem('tallyConnectionStatus', JSON.stringify({
                        connected: true,
                        timestamp: new Date().toISOString(),
                        server: 'localhost:9000'
                    }));
                    window.tallyConnectionStatus = { connected: true };
                } else {
                    console.warn('⚠️ TALLY CONNECTION: OFFLINE');
                    console.log('   Server: http://localhost:9000');
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
            console.log('\n[2] FETCHING TALLY LICENSE INFO');
            console.log('-'.repeat(80));
            
            if (window.electronAPI && window.electronAPI.invoke) {
                const response = await window.electronAPI.invoke('fetch-license');
                
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
            console.log('\n[3] FETCHING TALLY COMPANIES');
            console.log('-'.repeat(80));
            
            if (window.electronAPI && window.electronAPI.invoke) {
                const response = await window.electronAPI.invoke('fetch-companies');
                
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
                <aside class="w-64 bg-white flex flex-col shadow-xl z-20 border-r border-gray-200" id="mainSidebar">
                    <div class="p-6 border-b border-gray-200">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">T</div>
                            <div><h1 class="text-2xl font-bold text-gray-900">Talliffy</h1></div>
                        </div>
                    </div>
                    <nav class="flex-1 overflow-y-auto py-4 px-2 space-y-1">
                        <div class="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Masters</div>
                        <a class="nav-link active" data-route="import-company" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #374151; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">📥</span> <span>Import Company</span>
                        </a>
                        <a class="nav-link" data-route="company-sync" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #374151; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">🏢</span> <span>Company Sync</span>
                        </a>
                        <a class="nav-link" data-route="sync-settings" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #374151; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">📡</span> <span>Tally Sync</span>
                        </a>

                        <div class="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4">Finance</div>
                        <a class="nav-link" data-route="groups" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #374151; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">📁</span> <span>Groups</span>
                        </a>
                        <a class="nav-link" data-route="ledgers" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #374151; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">📒</span> <span>Ledgers</span>
                        </a>

                        <!-- COMMENTED - Uncomment later as needed -->
                        <!-- <div class="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Operations</div>
                        <a class="nav-link" data-route="home" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #d1d5db; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">🏠</span> <span>Home</span>
                        </a>
                        <a class="nav-link" data-route="dashboard" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #d1d5db; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">📊</span> <span>Dashboard</span>
                        </a>
                        <a class="nav-link" data-route="vouchers" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #d1d5db; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">📝</span> <span>Vouchers</span>
                        </a>
                        <a class="nav-link" data-route="invoices" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #d1d5db; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">🧾</span> <span>Invoices</span>
                        </a>
                        <a class="nav-link" data-route="inventory" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #d1d5db; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">📦</span> <span>Inventory</span>
                        </a>
                        <a class="nav-link" data-route="payments" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #d1d5db; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">💸</span> <span>Payments</span>
                        </a>

                        <div class="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide mt-4">Finance</div>
                        <a class="nav-link" data-route="ledgers" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #d1d5db; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">📒</span> <span>Ledgers</span>
                        </a>
                        <a class="nav-link" data-route="groups" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #d1d5db; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">📁</span> <span>Groups</span>
                        </a>
                        <a class="nav-link" data-route="bank-reconciliation" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #d1d5db; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">🏦</span> <span>Banking</span>
                        </a>
                        <a class="nav-link" data-route="tax" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #d1d5db; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">⚖️</span> <span>Taxation</span>
                        </a>
                        <a class="nav-link" data-route="budget" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #d1d5db; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">📉</span> <span>Budgets</span>
                        </a>
                        <a class="nav-link" data-route="reports" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #d1d5db; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">📈</span> <span>Reports</span>
                        </a>

                        <a class="nav-link" data-route="items" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #d1d5db; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">🏷️</span> <span>Items</span>
                        </a>
                        <a class="nav-link" data-route="masters-accounts" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #d1d5db; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">📋</span> <span>Accounts</span>
                        </a>
                        <a class="nav-link" data-route="masters-costcenters" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #d1d5db; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">🎯</span> <span>Cost Centers</span>
                        </a>
                        <a class="nav-link" data-route="masters-categories" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #d1d5db; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">🏷️</span> <span>Categories</span>
                        </a>
                        <a class="nav-link" data-route="masters-units" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #d1d5db; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">📐</span> <span>Units</span>
                        </a>

                        <div class="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide mt-4">System</div>
                        <a class="nav-link" data-route="users" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #d1d5db; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">👥</span> <span>Users</span>
                        </a>
                        <a class="nav-link" data-route="audit-trail" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #d1d5db; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">📜</span> <span>Audit Log</span>
                        </a>
                        <a class="nav-link" data-route="sync-settings" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #d1d5db; cursor: pointer; border-radius: 6px; transition: all 0.2s; background-color: #2563eb; color: white;">
                            <span style="font-size: 18px;">📡</span> <span>Tally Sync</span>
                        </a>
                        <a class="nav-link" data-route="settings" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #d1d5db; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">⚙️</span> <span>Settings</span>
                        </a> -->
                    </nav>
                    
                    <!-- Logout Button at bottom of sidebar -->
                    <div class="mt-auto p-4 border-t border-gray-200">
                        <button id="logoutBtn" class="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all duration-200 shadow-lg">
                            <span style="font-size: 18px;">🚪</span>
                            <span>Logout</span>
                        </button>
                    </div>
                </aside>
                <main class="flex-1 flex flex-col min-w-0">
                    <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
                        <h2 class="text-lg font-semibold text-gray-800" id="page-title">Home</h2>
                        <div class="flex items-center gap-4">
                            <div class="flex items-center gap-2">
                                <span style="font-size: 16px;">🏢</span>
                                <select id="globalCompanySelector" class="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 cursor-pointer hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                                    <option value="">All Companies</option>
                                </select>
                            </div>
                            <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                                <span style="font-size: 16px;">👤</span>
                                <span class="text-sm font-medium text-gray-700" id="headerUsername">User</span>
                            </div>
                            <span style="font-size: 18px; cursor: pointer;">🔔</span>
                        </div>
                    </header>
                    <div id="page-content" class="flex-1 overflow-y-auto p-6 bg-gray-50">Loading...</div>
                </main>
            `;
            
            // Add hover effects to nav links
            document.querySelectorAll('[data-route]').forEach(link => {
                link.addEventListener('mouseenter', function() {
                    if (!this.classList.contains('active')) {
                        this.style.backgroundColor = '#f3f4f6';
                        this.style.color = '#1e48a2ff';
                    }
                });
                link.addEventListener('mouseleave', function() {
                    if (!this.classList.contains('active')) {
                        this.style.backgroundColor = 'transparent';
                        this.style.color = '#374151';
                    }
                });
            });
            
            // Update user info
            this.updateUserInfo();
            
            // Load companies for global selector
            this.loadGlobalCompanies();
            
            // Setup global company selector change handler
            this.setupGlobalCompanySelector();
            
            console.log('✅ App layout rendered successfully');
            console.log('📍 page-content element exists:', !!document.getElementById('page-content'));
            
            // Setup router after layout is rendered
            setTimeout(() => {
                this.setupRouter();
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
                    if (confirm('Are you sure you want to logout?')) {
                        await this.handleLogout();
                    }
                });
            }
        } catch (e) {
            console.error('❌ Error updating user info:', e);
        }
    }

    async loadGlobalCompanies() {
        try {
            console.log('🏢 Fetching companies from:', window.apiConfig.getUrl('/companies'));
            const response = await fetch(window.apiConfig.getUrl('/companies'), {
                method: 'GET',
                headers: window.authService.getHeaders()
            });

            if (!response.ok) {
                console.error('❌ Failed to load companies, status:', response.status);
                return;
            }

            const result = await response.json();
            console.log('📦 Companies response:', result);
            const companies = result.success ? result.data : [];
            console.log('📋 Companies data:', companies);
            
            const selector = document.getElementById('globalCompanySelector');
            if (selector && companies.length > 0) {
                // Log first company to see structure
                console.log('🔍 First company structure:', companies[0]);
                
                selector.innerHTML = '<option value="">All Companies</option>' + 
                    companies.map(c => {
                        const id = c.cmpId || c.id || c.companyId;
                        const name = c.name || c.companyName || c.cmpName;
                        console.log(`  - Company: ${name} (ID: ${id})`);
                        return `<option value="${id}">${name}</option>`;
                    }).join('');
                
                // Restore previously selected company
                const savedCompanyId = localStorage.getItem('selectedCompanyId');
                if (savedCompanyId) {
                    selector.value = savedCompanyId;
                    window.selectedCompanyId = parseInt(savedCompanyId);
                    console.log('✅ Restored saved company ID:', window.selectedCompanyId);
                }
                
                console.log('✅ Loaded', companies.length, 'companies for global selector');
            }
        } catch (error) {
            console.error('Error loading companies:', error);
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

// Initialize
console.log('✅ Creating window.app...');
window.app = new App();
console.log('✅ window.app created');

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOMContentLoaded fired');
    window.app.init();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('✅ DOM already ready, initializing...');
    setTimeout(() => window.app.init(), 100);
}

console.log('✅ app.js loaded complete');
