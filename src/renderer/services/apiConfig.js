/**
 * API Configuration Module
 * Centralized API endpoint management
 * This is the ONLY place where API URLs should be defined
 */

const apiConfig = {
    BASE_URL: 'http://localhost:8080',
    
    // API Endpoints
    endpoints: {
        // Authentication
        auth: {
            login: '/auth/login',
            register: '/auth/register',
            logout: '/auth/logout',
            refresh: '/auth/refresh',
            validate: '/auth/validate'
        },
        
        // Companies
        companies: '/companies',
        
        // Masters
        masters: {
            accounts: '/masters/accounts',
            costcenters: '/masters/cost-centers',
            categories: '/masters/categories',
            units: '/masters/units'
        },
        
        // Transactions
        vouchers: '/vouchers',
        invoices: '/invoices',
        payments: '/payments',
        
        // Data
        ledgers: '/ledgers',
        items: '/items',
        
        // Reports & Analytics
        audit: '/audit/logs',
        bank: '/bank/statements',
        budgets: '/budgets',
        reports: '/reports',
        
        // User
        users: '/users'
    },
    
    /**
     * Get full API URL for an endpoint
     * @param {string} endpoint - The endpoint path
     * @returns {string} - Full API URL
     */
    getUrl(endpoint) {
        return `${this.BASE_URL}${endpoint}`;
    },
    
    /**
     * Get full API URL for a specific endpoint with ID
     * @param {string} endpoint - The endpoint path
     * @param {string|number} id - The resource ID
     * @returns {string} - Full API URL with ID
     */
    getUrlWithId(endpoint, id) {
        return `${this.BASE_URL}${endpoint}/${id}`;
    },
    
    /**
     * Get nested endpoint (e.g., masters.accounts)
     * @param {string} category - Parent category (e.g., 'masters', 'auth')
     * @param {string} endpoint - Specific endpoint (e.g., 'accounts')
     * @returns {string} - Full API URL
     */
    getNestedUrl(category, endpoint) {
        const path = this.endpoints[category]?.[endpoint];
        if (!path) {
            console.warn(`Endpoint not found: ${category}.${endpoint}`);
            return '';
        }
        return `${this.BASE_URL}${path}`;
    }
};

// Export for module systems and make globally available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = apiConfig;
}
window.apiConfig = apiConfig;
