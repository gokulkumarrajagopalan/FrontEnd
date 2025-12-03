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

    renderLogin() {
        try {
            document.body.innerHTML = '';
            document.body.className = 'bg-gray-100 h-screen flex items-center justify-center';
            document.body.innerHTML = `
                <div class="w-full max-w-md">
                    <div class="bg-white rounded-lg shadow-lg p-8">
                        <h1 class="text-2xl font-bold text-center text-gray-800 mb-2">Tally Prime</h1>
                        <p class="text-center text-gray-500 mb-8">Enterprise ERP System</p>
                        <form id="loginForm" class="space-y-4">
                            <input type="text" id="username" placeholder="Username" class="w-full px-4 py-2 border border-gray-300 rounded-lg" required>
                            <input type="password" id="password" placeholder="Password" class="w-full px-4 py-2 border border-gray-300 rounded-lg" required>
                            <button type="submit" class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium">Login</button>
                        </form>
                    </div>
                </div>
            `;

            const form = document.getElementById('loginForm');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const username = document.getElementById('username').value;
                    localStorage.setItem('authToken', 'demo-token-' + Date.now());
                    localStorage.setItem('currentUser', JSON.stringify({
                        username: username || 'Demo User',
                        fullName: username || 'Demo User',
                        role: 'Admin'
                    }));
                    console.log('✅ Login successful, reloading...');
                    window.location.reload();
                });
            }
            console.log('✅ Login page rendered successfully');
        } catch (e) {
            console.error('❌ Error in renderLogin:', e);
            document.body.innerHTML = `<div style="color: red; padding: 20px;"><h1>Error Rendering Login</h1><p>${e.message}</p></div>`;
        }
    }

    renderAppLayout() {
        try {
            document.body.className = 'h-screen overflow-hidden flex bg-gray-50';
            document.body.innerHTML = `
                <aside class="w-64 bg-gray-900 flex flex-col shadow-xl z-20" id="mainSidebar">
                    <div class="p-6 border-b border-gray-700">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">T</div>
                            <div><h1 class="text-xl font-bold text-white">Tally Prime</h1><p class="text-xs text-gray-400">ERP System</p></div>
                        </div>
                    </div>
                    <nav class="flex-1 overflow-y-auto py-4 px-2 space-y-1">
                        <div class="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Masters</div>
                        <a class="nav-link active" data-route="import-company" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #d1d5db; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">📥</span> <span>Import Company</span>
                        </a>
                        <a class="nav-link" data-route="company-sync" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #d1d5db; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">🏢</span> <span>Company Sync</span>
                        </a>
                        <a class="nav-link" data-route="sync-settings" style="display: flex; align-items: center; gap: 3px; padding: 10px 12px; color: #d1d5db; cursor: pointer; border-radius: 6px; transition: all 0.2s;">
                            <span style="font-size: 18px;">📡</span> <span>Tally Sync</span>
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
                </aside>
                <main class="flex-1 flex flex-col min-w-0">
                    <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
                        <h2 class="text-lg font-semibold text-gray-800" id="page-title">Home</h2>
                        <div class="flex items-center gap-4">
                            <input type="text" placeholder="Search..." style="padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 6px; width: 200px;">
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
                        this.style.backgroundColor = 'rgba(255,255,255,0.05)';
                        this.style.color = 'white';
                    }
                });
                link.addEventListener('mouseleave', function() {
                    if (!this.classList.contains('active')) {
                        this.style.backgroundColor = 'transparent';
                        this.style.color = '#d1d5db';
                    }
                });
            });
            
            // Update user info
            this.updateUserInfo();
            
            // Setup router after layout is rendered
            this.setupRouter();
            console.log('✅ App layout rendered successfully');
        } catch (e) {
            console.error('❌ Error in renderAppLayout:', e);
            document.body.innerHTML = `<div style="color: red; padding: 20px;"><h1>Error Rendering App</h1><p>${e.message}</p></div>`;
        }
    }

    updateUserInfo() {
        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            console.log('✅ User info updated:', user.fullName || user.username);
        } catch (e) {
            console.error('❌ Error updating user info:', e);
        }
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
