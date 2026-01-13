/**
 * API Service
 * Handles all REST API calls to backend
 */

const API_BASE_URL = window.AppConfig.API_BASE_URL;

class ApiService {
    static requestCache = new Map();
    static MAX_RETRIES = 3;
    static TIMEOUT_MS = 10000;
    static RETRY_DELAY_MS = 1000;

    /**
     * Execute request with timeout
     */
    static async executeWithTimeout(url, options) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

        try {
            return await fetch(`${API_BASE_URL}${url}`, {
                ...options,
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Generic fetch wrapper with retry logic
     * @param {string} url 
     * @param {object} options 
     * @param {number} attempt 
     * @returns {Promise<object>}
     */
    static async request(url, options = {}, attempt = 1) {
        const defaultOptions = {
            headers: authService.getHeaders()
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers,
                'Content-Type': 'application/json'
            }
        };

        try {
            const response = await this.executeWithTimeout(url, mergedOptions);

            if (response.status === 401) {
                console.warn('⚠️ 401 Unauthorized - Device token may be invalid');
                
                if (window.notificationService) {
                    window.notificationService.warning(
                        'Your session has ended. You may have logged in from another device.',
                        'Session Expired',
                        5000
                    );
                }
                
                this.clearAuthData();
                setTimeout(() => {
                    window.location.hash = '#login';
                    window.location.reload();
                }, 2000);
                
                throw new Error('Unauthorized - Logged in from another device');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }

            return { success: true, data };
        } catch (error) {
            if (error.name === 'AbortError') {
                error.message = `Request timeout after ${this.TIMEOUT_MS}ms`;
            }

            if (attempt < this.MAX_RETRIES && this.isRetryable(error)) {
                const delay = this.RETRY_DELAY_MS * attempt;
                console.warn(`🔄 Retry attempt ${attempt}/${this.MAX_RETRIES} for ${url} (waiting ${delay}ms)...`);
                await new Promise(r => setTimeout(r, delay));
                return this.request(url, options, attempt + 1);
            }

            console.error(`API Error (${url}):`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Determine if error is retryable
     */
    static isRetryable(error) {
        const nonRetryableErrors = [
            'Unauthorized',
            'Forbidden',
            'Not Found',
            'Invalid request'
        ];
        return !nonRetryableErrors.some(e => error.message.includes(e));
    }

    /**
     * Clear only auth-related data (not all localStorage)
     */
    static clearAuthData() {
        const authKeysToRemove = [
            'authToken',
            'deviceToken',
            'csrfToken',
            'currentUser',
            'loginTime'
        ];
        
        authKeysToRemove.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        
        console.log('✅ Auth data cleared');
    }

    /**
     * GET request
     * @param {string} url 
     * @returns {Promise<object>}
     */
    static get(url) {
        return this.request(url, { method: 'GET' });
    }

    /**
     * POST request
     * @param {string} url 
     * @param {object} data 
     * @returns {Promise<object>}
     */
    static post(url, data) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT request
     * @param {string} url 
     * @param {object} data 
     * @returns {Promise<object>}
     */
    static put(url, data) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE request
     * @param {string} url 
     * @returns {Promise<object>}
     */
    static delete(url) {
        return this.request(url, { 
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // ==================== GROUPS ====================

    static getGroups() {
        return this.get('/groups');
    }

    static getGroupById(id) {
        return this.get(`/groups/${id}`);
    }

    static createGroup(group) {
        return this.post('/groups', group);
    }

    static updateGroup(id, group) {
        return this.put(`/groups/${id}`, group);
    }

    static deleteGroup(id) {
        return this.delete(`/groups/${id}`);
    }

    // ==================== LEDGERS ====================

    static getLedgers() {
        return this.get('/ledgers');
    }

    static getLedgerById(id) {
        return this.get(`/ledgers/${id}`);
    }

    static getLedgersByGroup(groupId) {
        return this.get(`/ledgers/group/${groupId}`);
    }

    static createLedger(ledger) {
        return this.post('/ledgers', ledger);
    }

    static updateLedger(id, ledger) {
        return this.put(`/ledgers/${id}`, ledger);
    }

    static deleteLedger(id) {
        return this.delete(`/ledgers/${id}`);
    }

    static getTotalBalance() {
        return this.get('/ledgers/total/balance');
    }

    // ==================== VOUCHERS ====================

    static getVouchers() {
        return this.get('/vouchers');
    }

    static getVoucherById(id) {
        return this.get(`/vouchers/${id}`);
    }

    static getVouchersByType(type) {
        return this.get(`/vouchers/type/${type}`);
    }

    static getVouchersByDate(date) {
        return this.get(`/vouchers/date/${date}`);
    }

    static createVoucher(voucher) {
        return this.post('/vouchers', voucher);
    }

    static updateVoucher(id, voucher) {
        return this.put(`/vouchers/${id}`, voucher);
    }

    static deleteVoucher(id) {
        return this.delete(`/vouchers/${id}`);
    }

    static getTotalVoucherAmount() {
        return this.get('/vouchers/total/amount');
    }

    // ==================== MASTERS ====================

    // Chart of Accounts
    static getAccounts() {
        return this.get('/masters/accounts');
    }

    static getAccountById(id) {
        return this.get(`/masters/accounts/${id}`);
    }

    static createAccount(account) {
        return this.post('/masters/accounts', account);
    }

    static updateAccount(id, account) {
        return this.put(`/masters/accounts/${id}`, account);
    }

    static deleteAccount(id) {
        return this.delete(`/masters/accounts/${id}`);
    }

    // Cost Centers
    static getCostCenters() {
        return this.get('/masters/cost-centers');
    }

    static getCostCenterById(id) {
        return this.get(`/masters/cost-centers/${id}`);
    }

    static createCostCenter(costCenter) {
        return this.post('/masters/cost-centers', costCenter);
    }

    static updateCostCenter(id, costCenter) {
        return this.put(`/masters/cost-centers/${id}`, costCenter);
    }

    static deleteCostCenter(id) {
        return this.delete(`/masters/cost-centers/${id}`);
    }

    // Stock Categories
    static getCategories() {
        return this.get('/masters/categories');
    }

    static getCategoryById(id) {
        return this.get(`/masters/categories/${id}`);
    }

    static createCategory(category) {
        return this.post('/masters/categories', category);
    }

    static updateCategory(id, category) {
        return this.put(`/masters/categories/${id}`, category);
    }

    static deleteCategory(id) {
        return this.delete(`/masters/categories/${id}`);
    }

    // Units of Measurement
    static getUnits() {
        return this.get('/masters/units');
    }

    static getUnitById(id) {
        return this.get(`/masters/units/${id}`);
    }

    static createUnit(unit) {
        return this.post('/masters/units', unit);
    }

    static updateUnit(id, unit) {
        return this.put(`/masters/units/${id}`, unit);
    }

    static deleteUnit(id) {
        return this.delete(`/masters/units/${id}`);
    }

    // ==================== USER MANAGEMENT ====================

    static getUsers() {
        return this.get('/users');
    }

    static getUserById(id) {
        return this.get(`/users/${id}`);
    }

    static createUser(user) {
        return this.post('/users', user);
    }

    static updateUser(id, user) {
        return this.put(`/users/${id}`, user);
    }

    static deleteUser(id) {
        return this.delete(`/users/${id}`);
    }

    static updateUserStatus(id, status) {
        return this.put(`/users/${id}/status`, status);
    }

    static changePassword(id, passwordData) {
        return this.put(`/users/${id}/password`, passwordData);
    }

    static getUserProfile() {
        return this.get('/users/profile');
    }

    // ==================== REPORTS ====================

    static getTrialBalance() {
        return this.get('/reports/trial-balance');
    }

    static getLedgerReport() {
        return this.get('/reports/ledger-report');
    }

    static getDayBook() {
        return this.get('/vouchers');
    }
}
