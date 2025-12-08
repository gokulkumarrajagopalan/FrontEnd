/**
 * Dynamic Page Loader
 * Loads all page modules and registers them with the router
 */

class PageLoader {
    static async loadAllPages() {
        const pagesMap = {};
        
        // Map of route names to their initialize function names
        const pageInitializers = {
            'home': 'initializeHome',
            'dashboard': 'initializeDashboard',
            'login': 'initializeAuth',
            'signup': 'initializeAuth',
            'groups': 'initializeGroups',
            'ledgers': 'initializeLedgers',
            'vouchers': 'initializeVouchers',
            'items': 'initializeItems',
            'reports': 'initializeReports',
            'settings': 'initializeSettings',
            'masters-accounts': 'initializeMastersAccounts',
            'masters-costcenters': 'initializeMastersCostcenters',
            'masters-categories': 'initializeMastersCategories',
            'masters-units': 'initializeMastersUnits',
            'users': 'initializeUsers',
            'invoices': 'initializeInvoices',
            'bank-reconciliation': 'initializeBankReconciliation',
            'inventory': 'initializeInventory',
            'budget': 'initializeBudget',
            'tax': 'initializeTax',
            'payments': 'initializePayments',
            'audit-trail': 'initializeAuditTrail',
            'batch-operations': 'initializeBatchOperations',
            'advanced-search': 'initializeAdvancedSearch',
            'dashboard-metrics': 'initializeDashboardMetrics',
            'sync-settings': 'initializeSyncSettings',
            'my-company': 'initializeMyCompany',
            'add-company': 'initializeAddCompany',
            'import-company': 'initializeImportCompany',
            'company-sync': 'initializeCompanySync'
        };

        for (const [route, initName] of Object.entries(pageInitializers)) {
            try {
                const initFn = window[initName];
                if (typeof initFn === 'function') {
                    pagesMap[route] = {
                        init: async () => {
                            console.log(`Calling ${initName} for route ${route}`);
                            await initFn();
                        }
                    };
                } else {
                    console.warn(`Initializer ${initName} not found for page ${route}`);
                    // Create a stub page
                    pagesMap[route] = {
                        init: async () => {
                            const content = document.getElementById('page-content');
                            if (content) {
                                content.innerHTML = `<div class="p-6"><h1 class="text-2xl font-bold mb-4">${this.formatPageName(route)}</h1><p class="text-gray-500">Page under development...</p></div>`;
                            }
                        }
                    };
                }
            } catch (error) {
                console.warn(`Failed to setup page ${route}:`, error.message);
                // Create a stub page for missing pages
                pagesMap[route] = {
                    init: async () => {
                        const content = document.getElementById('page-content');
                        if (content) {
                            content.innerHTML = `<div class="p-6"><h1 class="text-2xl font-bold mb-4">${this.formatPageName(route)}</h1><p class="text-gray-500">Page under development...</p></div>`;
                        }
                    }
                };
            }
        }

        console.log('Pages loaded:', Object.keys(pagesMap));
        return pagesMap;
    }

    static formatPageName(name) {
        return name
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
}
