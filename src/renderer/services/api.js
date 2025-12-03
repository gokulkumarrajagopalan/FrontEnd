/**
 * API Service
 * Handles all REST API calls to backend
 */

const API_BASE_URL = window.AppConfig.API_BASE_URL;

class ApiService {
    /**
     * Generic fetch wrapper
     * @param {string} url 
     * @param {object} options 
     * @returns {Promise<object>}
     */
    static async request(url, options = {}) {
        const defaultOptions = {
            headers: authService.getHeaders()
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(`${API_BASE_URL}${url}`, mergedOptions);

            // Handle 401 Unauthorized
            if (response.status === 401) {
                const refreshed = await authService.refreshToken();
                if (!refreshed) {
                    window.location.href = '#login';
                    throw new Error('Unauthorized');
                }
                // Retry request with new token
                return this.request(url, options);
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }

            return { success: true, data };
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, error: error.message };
        }
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
        return this.request(url, { method: 'DELETE' });
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
