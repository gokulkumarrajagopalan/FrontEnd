const apiConfig = {
    async initialize() {
        if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.getBackendUrl) {
            try {
                const url = await window.electronAPI.getBackendUrl();
                if (url) {
                    window._backendUrl = this._enforceHttps(url);
                    console.log('✅ apiConfig: Backend URL initialized from main process:', window._backendUrl);
                    return;
                }
            } catch (error) {
                console.error('apiConfig: Failed to get Backend URL from main process:', error);
            }
        }

        // Fallback: read from localStorage (set by settings page)
        try {
            const saved = JSON.parse(localStorage.getItem('appSettings') || '{}');
            if (saved.backendUrl) {
                window._backendUrl = this._enforceHttps(saved.backendUrl);
                console.log('✅ apiConfig: Backend URL loaded from localStorage:', window._backendUrl);
                return;
            }
        } catch (_) {}

        // Final fallback: hardcoded default (localhost OK for dev)
        window._backendUrl = 'http://localhost:8080';
        console.log('✅ apiConfig: Using default Backend URL:', window._backendUrl);
    },

    /**
     * Enforce HTTPS for non-localhost URLs
     */
    _enforceHttps(url) {
        if (!url) return url;
        // Allow HTTP only for localhost/127.0.0.1
        const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url);
        if (!isLocal && url.startsWith('http://')) {
            return url.replace('http://', 'https://');
        }
        return url;
    },

    get BASE_URL() {
        // 1. Check cached value from async initialization
        if (typeof window !== 'undefined' && window._backendUrl) {
            return window._backendUrl;
        }

        // 2. Fallback to exposed property (legacy/sync)
        if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.backendUrl) {
            return window.electronAPI.backendUrl;
        }

        // 3. Fallback to AppConfig from config.js
        if (typeof window !== 'undefined' && window.AppConfig && window.AppConfig.API_BASE_URL) {
            return window.AppConfig.API_BASE_URL;
        }

        // 4. Fallback to localStorage (user-configured in settings)
        try {
            const saved = JSON.parse(localStorage.getItem('appSettings') || '{}');
            if (saved.backendUrl) return saved.backendUrl;
        } catch (_) {}

        // 5. Hardcoded default — ensures login always has a target URL
        return 'http://localhost:8080';
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
