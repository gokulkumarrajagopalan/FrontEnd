/**
 * Authentication Service
 * Handles user login, logout, token management, and session
 */

class AuthService {
    constructor() {
        this.loadAuthState();
        this.refreshInterval = null;

        console.log('🔐 AuthService initialized:', {
            hasToken: !!this.token,
            hasDeviceToken: !!this.deviceToken,
            hasCsrfToken: !!this.csrfToken,
            hasUser: !!this.user,
            userId: this.user?.userId
        });
    }

    /**
     * Load auth state from localStorage (consistent storage)
     */
    loadAuthState() {
        // Check if session has expired
        const sessionExpiry = localStorage.getItem('sessionExpiry');
        if (sessionExpiry && new Date().getTime() > parseInt(sessionExpiry)) {
            // Before clearing, check if the JWT token itself is still valid
            const storedToken = (window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function')
                ? window.electronAPI.secureStoreGet('authToken')
                : localStorage.getItem('authToken');
            let jwtStillValid = false;
            if (storedToken) {
                try {
                    const decoded = JSON.parse(atob(storedToken.split('.')[1]));
                    jwtStillValid = Math.floor(Date.now() / 1000) < (decoded.exp || 0);
                } catch (_) {}
            }
            if (jwtStillValid) {
                // Token is valid — refresh the client-side expiry and continue
                localStorage.setItem('sessionExpiry', (new Date().getTime() + (7 * 24 * 60 * 60 * 1000)).toString());
            } else {
                console.warn('⚠️ Session expired, logging out...');
                this.clearLocalData();
                return;
            }
        }

        // Read from the secure store, falling back to localStorage. Crucially, we
        // never overwrite an already-valid in-memory token with an empty read —
        // doing so would silently log the user out (e.g. if a secure-store write
        // didn't land). The in-memory value set at login is the source of truth.
        const secureGet = (key) => (window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function')
            ? window.electronAPI.secureStoreGet(key)
            : null;

        this.token = secureGet('authToken') || localStorage.getItem('authToken') || this.token || null;
        this.deviceToken = secureGet('deviceToken') || localStorage.getItem('deviceToken') || this.deviceToken || null;
        this.csrfToken = secureGet('csrfToken') || localStorage.getItem('csrfToken') || this.csrfToken || null;

        try {
            this.user = JSON.parse(localStorage.getItem('currentUser') || 'null');
        } catch (error) {
            console.error('⚠️ Corrupted user data in localStorage:', error);
            this.user = null;
            localStorage.removeItem('currentUser');
        }
    }

    /**
     * Clear all local authentication data
     */
    clearLocalData() {
        this.token = null;
        this.deviceToken = null;
        this.csrfToken = null;
        this.user = null;

        // Login persists tokens to BOTH the secure store and localStorage, so the
        // logout must clear BOTH — otherwise the startup gate (which reads
        // secureStore || localStorage) still finds a token and skips the login screen.
        if (window.electronAPI && typeof window.electronAPI.secureStoreDelete === 'function') {
            window.electronAPI.secureStoreDelete('authToken');
            window.electronAPI.secureStoreDelete('deviceToken');
            window.electronAPI.secureStoreDelete('csrfToken');
        }
        localStorage.removeItem('authToken');
        localStorage.removeItem('deviceToken');
        localStorage.removeItem('csrfToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('loginTime');
        localStorage.removeItem('sessionExpiry');
        localStorage.removeItem('userLicenseNumber');
        localStorage.removeItem('subscription');
    }

    /**
     * Login user
     * @param {string} username 
     * @param {string} password 
     * @returns {Promise<{success: boolean, message: string, token?: string, deviceToken?: string, user?: object}>}
     */
    async login(username, password) {
        try {
            let systemId = 'desktop_user';
            if (window.electronAPI && window.electronAPI.getSystemInfo) {
                try {
                    const sysInfo = await window.electronAPI.getSystemInfo();
                    systemId = sysInfo.hostname || 'desktop_user';
                } catch(e) {}
            }

            const response = await fetch(window.apiConfig.getNestedUrl('auth', 'login'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-System-Id': systemId,
                    'X-Device-Type': 'DESKTOP'
                },
                body: JSON.stringify({
                    username,
                    password,
                    deviceType: 'DESKTOP',
                    deviceInfo: navigator.userAgent || 'Talliffy Desktop',
                    systemId: systemId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                // Each system logs in independently — the backend no longer raises
                // session conflicts, so any non-OK response is a genuine failure.
                return {
                    success: false,
                    message: data.message || 'Login failed'
                };
            }

            // The backend wraps the session payload under `data` (ResponseBuilder.success):
            // { success, message, data: { token, deviceToken, userId, ... } }.
            // Fall back to the raw body for any flat-shaped response.
            const payload = (data && data.data) ? data.data : data;

            // Guard: a 200 with no token is still a failed login, not a silent success.
            if (!payload || !payload.token) {
                return {
                    success: false,
                    message: data.message || 'Login failed: no session token returned'
                };
            }

            // Store token, device token and user
            this.token = payload.token;
            this.deviceToken = payload.deviceToken;
            this.csrfToken = payload.csrfToken || this.extractCsrfToken(response);
            this.user = {
                userId: payload.userId,
                username: payload.username,
                fullName: payload.fullName,
                role: payload.role,
                licenseNumber: payload.licenceNo || payload.licenseNumber
            };

            // Persist to BOTH the secure store and localStorage so the session
            // reliably survives reloads (7-day expiry) even if one store fails.
            if (window.electronAPI && typeof window.electronAPI.secureStoreSet === 'function') {
                window.electronAPI.secureStoreSet('authToken', payload.token);
                window.electronAPI.secureStoreSet('deviceToken', payload.deviceToken);
                if (this.csrfToken) {
                    window.electronAPI.secureStoreSet('csrfToken', this.csrfToken);
                }
            }
            if (payload.token) localStorage.setItem('authToken', payload.token);
            if (payload.deviceToken) localStorage.setItem('deviceToken', payload.deviceToken);
            if (this.csrfToken) localStorage.setItem('csrfToken', this.csrfToken);
            localStorage.setItem('currentUser', JSON.stringify(this.user));
            localStorage.setItem('loginTime', new Date().toISOString());

            // Set session expiry to 24 hours from now
            const expiry = new Date().getTime() + (7 * 24 * 60 * 60 * 1000);
            localStorage.setItem('sessionExpiry', expiry.toString());

            // Store license number separately for easy access during sync validation
            if (this.user.licenseNumber) {
                localStorage.setItem('userLicenseNumber', this.user.licenseNumber.toString());
            }

            // Store subscription/plan data for sync validation
            if (payload.subscription) {
                localStorage.setItem('subscription', JSON.stringify(payload.subscription));
            }

            // Set token in all future requests
            this.setupTokenInterceptor();

            // Initialize sync system after successful login
            this.initializeSyncAfterLogin();

            return {
                success: true,
                message: 'Login successful',
                token: payload.token,
                deviceToken: payload.deviceToken,
                user: this.user,
                mobileVerified: payload.mobileVerified,
                mobile: payload.mobile,
                countryCode: payload.countryCode
            };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: 'Connection error: ' + error.message
            };
        }
    }

    /**
     * Validate mobile number format using libphonenumber-js
     */
    validateMobileNumber(mobile, countryCode) {
        try {
            const cleanMobile = mobile.replace(/\D/g, '');
            const cc = countryCode.replace('+', '');
            const countryCodeLengths = {
                '91': { minLength: 10, maxLength: 10, country: 'India' },
                '971': { minLength: 7, maxLength: 9, country: 'UAE' },
                '1': { minLength: 10, maxLength: 10, country: 'USA' },
                '44': { minLength: 10, maxLength: 11, country: 'UK' }
            };

            const validation = countryCodeLengths[cc];
            if (!validation) return { isValid: false, formatted: null, error: `Unsupported country code: +${cc}` };

            if (cleanMobile.length < validation.minLength || cleanMobile.length > validation.maxLength) {
                return { isValid: false, formatted: null, error: `Invalid length for ${validation.country}` };
            }

            const e164 = `+${cc}${cleanMobile}`;
            const international = `+${cc} ${cleanMobile}`;

            return { isValid: true, formatted: international, e164: e164, national: cleanMobile, country: validation.country, error: null };
        } catch (error) {
            return { isValid: false, formatted: null, error: error.message };
        }
    }

    async register(userData) {
        try {
            const mobileValidation = this.validateMobileNumber(userData.mobile, userData.countryCode || '+91');
            if (!mobileValidation.isValid) return { success: false, message: mobileValidation.error };

            const response = await fetch(window.apiConfig.getNestedUrl('auth', 'register'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...userData, mobile: mobileValidation.e164 })
            });

            const data = await response.json();
            if (!response.ok) return { success: false, message: data.message || 'Registration failed' };
            return { success: true, message: 'Registration successful', user: data.user };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Forgot Password — Step 1: request a reset code to be emailed.
     * @param {string} email
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async forgotPassword(email) {
        try {
            const response = await fetch(window.apiConfig.getNestedUrl('auth', 'forgotPassword'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                return { success: false, message: data.message || 'Failed to send reset code' };
            }
            return { success: true, message: data.message || 'Reset code sent' };
        } catch (error) {
            return { success: false, message: 'Connection error: ' + error.message };
        }
    }

    /**
     * Forgot Password — Step 2: verify the reset code and set a new password.
     * @param {string} email
     * @param {string} otp
     * @param {string} newPassword
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async resetPassword(email, otp, newPassword) {
        try {
            const response = await fetch(window.apiConfig.getNestedUrl('auth', 'resetPassword'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, newPassword })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                return { success: false, message: data.message || 'Failed to reset password' };
            }
            return { success: true, message: data.message || 'Password reset successfully' };
        } catch (error) {
            return { success: false, message: 'Connection error: ' + error.message };
        }
    }

    async logout(scope = 'CURRENT') {
        // Notify the backend, but never let a slow/hanging request block the UI logout.
        try {
            if (this.token) {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 4000);
                await fetch(window.apiConfig.getNestedUrl('auth', 'logout'), {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${this.token}`, 'X-Device-Token': this.deviceToken || '', 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scope }),
                    signal: controller.signal
                }).catch(() => {});
                clearTimeout(timer);
            }
        } catch (error) { console.error('Logout API error:', error); }

        // "Logout Web & Mobile" ends only the OTHER devices — this desktop stays
        // signed in and keeps syncing, so we neither clear local data nor redirect.
        if (scope === 'WEB_MOBILE') {
            if (window.notificationService) {
                window.notificationService.info('Signed out of Web & Mobile. This device stays active.');
            }
            return true;
        }

        // CURRENT / ALL → end this device's session and return to the login screen.
        this.clearLocalData();
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        if (window.notificationService) window.notificationService.info('You have been logged out');

        setTimeout(() => {
            window.location.hash = '#login';
            window.location.reload();
        }, 400);
        return true;
    }

    async refreshToken() {
        if (!this.token) return false;
        try {
            // Use the per-device refresh endpoint: it authenticates with the current
            // access token + device token and returns new tokens (wrapped under `data`).
            const response = await fetch(`${window.apiConfig.baseURL}/auth/token/refresh`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'X-Device-Token': this.deviceToken || '',
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (response.ok) {
                const payload = (data && data.data) ? data.data : data;
                if (!payload.token) return false;
                this.token = payload.token;
                if (window.electronAPI && typeof window.electronAPI.secureStoreSet === 'function') {
                    window.electronAPI.secureStoreSet('authToken', payload.token);
                }
                localStorage.setItem('authToken', payload.token);
                return true;
            }
            this.logout();
            return false;
        } catch (error) { return false; }
    }

    setupTokenInterceptor() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        this.refreshInterval = setInterval(() => { if (this.token) this.refreshToken(); }, 55 * 60 * 1000);
    }

    getHeaders() {
        this.loadAuthState();
        const headers = { 'Content-Type': 'application/json' };
        if (this.token && !this.isTokenExpired()) headers['Authorization'] = `Bearer ${this.token}`;
        if (this.deviceToken) headers['X-Device-Token'] = this.deviceToken;
        if (this.csrfToken) headers['X-CSRF-Token'] = this.csrfToken;
        return headers;
    }

    isAuthenticated() { return !!this.token && !!this.user; }

    initializeSyncAfterLogin() {
        try {
            if (!this.token || !this.deviceToken || !this.user) return;
            if (window.AppInitializer && typeof window.AppInitializer.initialize === 'function') {
                setTimeout(() => { window.AppInitializer.initialize().catch(e => console.error(e)); }, 1000);
            }
        } catch (error) { console.error(error); }
    }

    getCurrentUser() { if (!this.user) this.loadAuthState(); return this.user; }
    getToken() { return this.token; }
    getDeviceToken() { return this.deviceToken; }

    isTokenExpired() {
        if (!this.token) return true;
        try {
            const decoded = JSON.parse(atob(this.token.split('.')[1]));
            return Math.floor(Date.now() / 1000) >= (decoded.exp || 0);
        } catch (error) { return true; }
    }

    async validateToken() {
        if (!this.token) return false;
        if (this.isTokenExpired()) return await this.refreshToken();
        try {
            const response = await fetch(window.apiConfig.getNestedUrl('auth', 'validate'), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' }
            });
            return response.ok;
        } catch (error) { return false; }
    }

    extractCsrfToken(response) {
        const csrfHeaders = ['x-csrf-token', 'x-xsrf-token', 'csrf-token'];
        for (const h of csrfHeaders) {
            const t = response.headers.get(h);
            if (t) return t;
        }
        return null;
    }
}

const authService = new AuthService();
window.authService = authService;
window.AuthService = AuthService;
