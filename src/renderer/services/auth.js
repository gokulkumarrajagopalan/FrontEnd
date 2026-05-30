/**
 * Authentication Service
 * Handles user login, logout, token management, and session
 */

class AuthService {
    constructor() {
        this.loadAuthState();
        this.refreshInterval = null;

        // PKCE Storage keys
        this.PKCE_VERIFIER_KEY = 'pkce_code_verifier';
        this.PKCE_STATE_KEY = 'pkce_state';

        // Listen for SSO callback from main process (deep link)
        if (window.electronAPI && typeof window.electronAPI.onSsoCallback === 'function') {
            window.electronAPI.onSsoCallback((url) => {
                this.handleSsoCallback(url);
            });
        }

        console.log('🔐 AuthService initialized:', {
            hasToken: !!this.token,
            hasDeviceToken: !!this.deviceToken,
            hasCsrfToken: !!this.csrfToken,
            hasUser: !!this.user,
            userId: this.user?.userId
        });
    }

    /**
     * Start the browser-based SSO login flow
     */
    async ssoLoginWithBrowser() {
        try {
            // 1. Generate PKCE pair
            const verifier = this.generateCodeVerifier();
            const challenge = await this.generateCodeChallenge(verifier);
            const state = this.generateState();

            // 2. Store verifier and state for later validation
            localStorage.setItem(this.PKCE_VERIFIER_KEY, verifier);
            localStorage.setItem(this.PKCE_STATE_KEY, state);

            // 3. Construct Web App Login URL
            // Using the Web App as a proxy for Keycloak ensures consistent branding and session management
            const webAppBase = 'http://localhost:3000/sso/login';
            const authUrl = `${webAppBase}?` + new URLSearchParams({
                redirect: 'desktop',
                state: state
            }).toString();

            console.log('🌐 Opening browser for SSO login:', authUrl);
            
            // Try Electron IPC first
            if (window.electronAPI && window.electronAPI.openExternalUrl) {
                try {
                    // Don't await forever, if it doesn't resolve in 2s, assume success and proceed
                    // (Some Electron versions hang on openExternal if the browser is already open)
                    const openPromise = window.electronAPI.openExternalUrl(authUrl);
                    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ timeout: true }), 2000));
                    
                    const result = await Promise.race([openPromise, timeoutPromise]);
                    console.log('✅ Browser open attempt result:', result);
                } catch (ipcError) {
                    console.warn('⚠️ Electron openExternalUrl failed, falling back to window.open:', ipcError);
                    window.open(authUrl, '_blank');
                }
            } else {
                console.log('ℹ️ window.electronAPI.openExternalUrl not found, using window.open');
                window.open(authUrl, '_blank');
            }

            return { success: true };
        } catch (error) {
            console.error('❌ Failed to start SSO login:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Handle the deep link callback from the browser
     */
    async handleSsoCallback(urlStr) {
        try {
            console.log('🔗 Received SSO callback URL:', urlStr);
            const url = new URL(urlStr.replace('talliffy://', 'http://localhost/'));
            
            // Handle direct token hand-off from Web App
            const token = url.searchParams.get('token');
            const deviceToken = url.searchParams.get('deviceToken');
            const state = url.searchParams.get('state');

            // Optional: validate state if we started the flow ourselves
            const storedState = localStorage.getItem(this.PKCE_STATE_KEY);
            if (storedState && state && state !== storedState) {
                console.warn('⚠️ State mismatch - possible CSRF');
            }

            if (token && deviceToken) {
                console.log('✅ Received direct tokens from browser hand-off');
                
                // Extract user info from URL or fetch it if needed
                const user = {
                    userId: parseInt(url.searchParams.get('userId')),
                    username: url.searchParams.get('username'),
                    fullName: url.searchParams.get('fullName'),
                    role: url.searchParams.get('role'),
                    email: url.searchParams.get('email')
                };

                const result = await this.establishSessionWithTokens(token, deviceToken, user);
                if (result.success) {
                    if (window.notificationService) window.notificationService.success('Logged in successfully via Browser', 'Welcome!');
                    if (window.router) window.router.navigate('dashboard');
                    return;
                }
            }

            // Fallback: Handle standard OIDC code exchange (if still used)
            const code = url.searchParams.get('code');
            if (code) {
                const result = await this.completeSsoExchange(code);
                if (result.success) {
                    if (window.notificationService) window.notificationService.success('Logged in successfully via SSO', 'Welcome!');
                    if (window.router) window.router.navigate('dashboard');
                    return;
                }
            }

            throw new Error('Authentication failed: Missing tokens or code');
        } catch (error) {
            console.error('❌ SSO Callback Error:', error);
            if (window.notificationService) window.notificationService.error(error.message, 'Login Failed');
        } finally {
            localStorage.removeItem(this.PKCE_VERIFIER_KEY);
            localStorage.removeItem(this.PKCE_STATE_KEY);
        }
    }

    /**
     * Establish session with pre-obtained tokens
     */
    async establishSessionWithTokens(token, deviceToken, user) {
        try {
            this.token = token;
            this.deviceToken = deviceToken;
            this.user = user;

            localStorage.setItem('authToken', token);
            localStorage.setItem('deviceToken', deviceToken);
            localStorage.setItem('currentUser', JSON.stringify(user));
            localStorage.setItem('loginTime', new Date().toISOString());
            localStorage.setItem('sessionExpiry', (new Date().getTime() + (24 * 60 * 60 * 1000)).toString());

            this.setupTokenInterceptor();
            this.initializeSyncAfterLogin();
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Exchange the code for tokens and establish session
     */
    async completeSsoExchange(code) {
        try {
            const verifier = localStorage.getItem(this.PKCE_VERIFIER_KEY);
            if (!verifier) throw new Error('PKCE verifier missing');

            const tokenUrl = 'http://localhost:8180/realms/talliffy/protocol/openid-connect/token';
            const redirectUri = 'http://localhost:3000/auth/callback';
            
            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: 'talliffy-web',
                    code: code,
                    redirect_uri: redirectUri,
                    code_verifier: verifier
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error_description || 'Keycloak token exchange failed');
            }

            let systemId = 'desktop_user';
            let platform = 'Desktop';
            if (window.electronAPI && window.electronAPI.getSystemInfo) {
                try {
                    const sysInfo = await window.electronAPI.getSystemInfo();
                    systemId = sysInfo.hostname || 'desktop_user';
                    platform = sysInfo.platform || 'Desktop';
                } catch(e) {}
            }

            const kcTokens = await response.json();
            const ssoResponse = await fetch(`${window.apiConfig.baseURL}/auth/sso/keycloak`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${kcTokens.access_token}`,
                    'X-Device-Type': 'DESKTOP',
                    'X-System-Id': systemId,
                    'X-Platform': platform
                }
            });

            const data = await ssoResponse.json().catch(() => ({}));

            if (ssoResponse.status === 409 && data.error === 'SESSION_CONFLICT') {
                if (window.electronAPI && window.electronAPI.showSessionConflict) {
                    const conflictRes = await window.electronAPI.showSessionConflict(data);
                    if (conflictRes.action === 'LOGOUT_EXISTING') {
                        const resolveUrl = window.apiConfig.getNestedUrl('auth', 'resolve-conflict') || (window.apiConfig.baseURL + '/auth/resolve-conflict');
                        const resolveRes = await fetch(resolveUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ conflictToken: data.conflictToken, action: 'LOGOUT_EXISTING' })
                        });
                        if (resolveRes.ok) {
                            return await this.completeSsoExchange(code);
                        } else {
                            throw new Error('Failed to resolve active session conflict.');
                        }
                    } else {
                        throw new Error('Login cancelled by user.');
                    }
                }
            }

            if (!ssoResponse.ok) throw new Error(data.message || 'Backend session establishment failed');

            const sessionData = data.data;
            this.token = sessionData.token;
            this.deviceToken = sessionData.deviceToken;
            this.user = {
                userId: sessionData.userId,
                username: sessionData.username,
                fullName: sessionData.fullName,
                role: sessionData.role,
                licenseNumber: sessionData.licenceNo || sessionData.licenseNumber
            };

            localStorage.setItem('authToken', this.token);
            localStorage.setItem('deviceToken', this.deviceToken);
            localStorage.setItem('currentUser', JSON.stringify(this.user));
            localStorage.setItem('loginTime', new Date().toISOString());
            localStorage.setItem('sessionExpiry', (new Date().getTime() + (24 * 60 * 60 * 1000)).toString());

            this.setupTokenInterceptor();
            this.initializeSyncAfterLogin();
            return { success: true };
        } catch (error) {
            console.error('❌ SSO Exchange Error:', error);
            return { success: false, message: error.message };
        }
    }

    generateCodeVerifier() {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
    }

    async generateCodeChallenge(verifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const digest = await window.crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    generateState() {
        return 'desktop_' + Math.random().toString(36).substring(2, 15);
    }

    /**
     * Load auth state from localStorage (consistent storage)
     */
    loadAuthState() {
        // Check if session has expired (7 days)
        const sessionExpiry = localStorage.getItem('sessionExpiry');
        if (sessionExpiry && new Date().getTime() > parseInt(sessionExpiry)) {
            console.warn('⚠️ Session expired, logging out...');
            this.clearLocalData();
            return;
        }

        this.token = localStorage.getItem('authToken');
        this.deviceToken = localStorage.getItem('deviceToken');
        this.csrfToken = localStorage.getItem('csrfToken');

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
                if (response.status === 409 && data.error === 'SESSION_CONFLICT') {
                    if (window.electronAPI && window.electronAPI.showSessionConflict) {
                        const conflictRes = await window.electronAPI.showSessionConflict(data);
                        if (conflictRes.action === 'LOGOUT_EXISTING') {
                            const resolveUrl = window.apiConfig.getNestedUrl('auth', 'resolve-conflict') || (window.apiConfig.baseURL + '/auth/resolve-conflict');
                            const resolveRes = await fetch(resolveUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ conflictToken: data.conflictToken, action: 'LOGOUT_EXISTING' })
                            });
                            if (resolveRes.ok) {
                                return await this.login(username, password);
                            } else {
                                return { success: false, message: 'Failed to resolve session conflict.' };
                            }
                        } else {
                            return { success: false, message: 'Login cancelled by user.' };
                        }
                    }
                }
                return {
                    success: false,
                    message: data.message || 'Login failed'
                };
            }

            // Store token, device token and user
            this.token = data.token;
            this.deviceToken = data.deviceToken;
            this.csrfToken = data.csrfToken || this.extractCsrfToken(response);
            this.user = {
                userId: data.userId,
                username: data.username,
                fullName: data.fullName,
                role: data.role,
                licenseNumber: data.licenceNo || data.licenseNumber
            };

            localStorage.setItem('authToken', data.token);
            localStorage.setItem('deviceToken', data.deviceToken);
            if (this.csrfToken) {
                localStorage.setItem('csrfToken', this.csrfToken);
            }
            localStorage.setItem('currentUser', JSON.stringify(this.user));
            localStorage.setItem('loginTime', new Date().toISOString());

            // Set session expiry to 24 hours from now
            const expiry = new Date().getTime() + (24 * 60 * 60 * 1000);
            localStorage.setItem('sessionExpiry', expiry.toString());

            // Store license number separately for easy access during sync validation
            if (this.user.licenseNumber) {
                localStorage.setItem('userLicenseNumber', this.user.licenseNumber.toString());
            }

            // Store subscription/plan data for sync validation
            if (data.subscription) {
                localStorage.setItem('subscription', JSON.stringify(data.subscription));
            }

            // Set token in all future requests
            this.setupTokenInterceptor();

            // Initialize sync system after successful login
            this.initializeSyncAfterLogin();

            return {
                success: true,
                message: 'Login successful',
                token: data.token,
                deviceToken: data.deviceToken,
                user: this.user
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

    async logout(scope = 'CURRENT') {
        try {
            if (this.token) {
                await fetch(window.apiConfig.getNestedUrl('auth', 'logout'), {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${this.token}`, 'X-Device-Token': this.deviceToken || '', 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scope })
                });
            }
        } catch (error) { console.error('Logout API error:', error); }

        this.clearLocalData();
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        if (window.notificationService) window.notificationService.info('You have been logged out');
        
        setTimeout(() => {
            window.location.hash = '#login';
            window.location.reload();
        }, 500);
        return true;
    }

    async refreshToken() {
        if (!this.token) return false;
        try {
            const response = await fetch(window.apiConfig.getNestedUrl('auth', 'refresh'), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (response.ok) {
                this.token = data.token;
                localStorage.setItem('authToken', data.token);
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
