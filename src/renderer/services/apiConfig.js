// Support both module and non-module environments
const apiConfig = {
    get BASE_URL() {
        // Use exposed backend URL from main process
        if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.backendUrl) {
            return window.electronAPI.backendUrl;
        }
        // Fallback to AppConfig from config.js
        if (typeof window !== 'undefined' && window.AppConfig && window.AppConfig.API_BASE_URL) {
            return window.AppConfig.API_BASE_URL;
        }
        
        // Provide detailed error message
        console.error('❌ Backend URL not configured!');
        console.error('window.electronAPI.backendUrl:', typeof window !== 'undefined' && window.electronAPI ? window.electronAPI.backendUrl : 'undefined');
        console.error('window.AppConfig.API_BASE_URL:', typeof window !== 'undefined' && window.AppConfig ? window.AppConfig.API_BASE_URL : 'undefined');
        console.error('Please ensure:');
        console.error('1. .env file exists in project root');
        console.error('2. BACKEND_URL is set in .env file (e.g., BACKEND_URL=http://3.80.124.37:8080)');
        console.error('3. Application has been restarted after .env changes');
        
        throw new Error('Backend URL not configured. Please set BACKEND_URL in .env file');
    },

    endpoints: {
        auth: {
            login: '/auth/login',
            register: '/auth/register',
            logout: '/auth/logout',
            refresh: '/auth/refresh',
            validate: '/auth/validate'
        },
        companies: '/companies',

        masters: {
            accounts: '/masters/accounts',
            costcenters: '/masters/cost-centers',
            categories: '/masters/categories',
            units: '/units'
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
        const base = this.BASE_URL;
        return `${base}${endpoint}`;
    },

    /**
     * Get base URL (alias for BASE_URL)
     */
    get baseURL() {
        return this.BASE_URL;
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

// Make globally available
if (typeof window !== 'undefined') {
    window.apiConfig = apiConfig;
}

// Also export for module systems if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = apiConfig;
}
