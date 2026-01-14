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
     * Load auth state from sessionStorage (consistent storage)
     */
    loadAuthState() {
        this.token = sessionStorage.getItem('authToken');
        this.deviceToken = sessionStorage.getItem('deviceToken');
        this.csrfToken = sessionStorage.getItem('csrfToken');
        
        try {
            this.user = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
        } catch (error) {
            console.error('⚠️ Corrupted user data in sessionStorage:', error);
            this.user = null;
            sessionStorage.removeItem('currentUser');
        }
    }

    /**
     * Login user
     * @param {string} username 
     * @param {string} password 
     * @returns {Promise<{success: boolean, message: string, token?: string, deviceToken?: string, user?: object}>}
     */
    async login(username, password) {
        try {
            const response = await fetch(window.apiConfig.getNestedUrl('auth', 'login'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
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

            sessionStorage.setItem('authToken', data.token);
            sessionStorage.setItem('deviceToken', data.deviceToken);
            if (this.csrfToken) {
                sessionStorage.setItem('csrfToken', this.csrfToken);
            }
            sessionStorage.setItem('currentUser', JSON.stringify(this.user));
            sessionStorage.setItem('loginTime', new Date().toISOString());
            
            // Store license number separately for easy access during sync validation
            if (this.user.licenseNumber) {
                localStorage.setItem('userLicenseNumber', this.user.licenseNumber.toString());
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
     * @param {string} mobile - Mobile number (without country code)
     * @param {string} countryCode - Country code (e.g., '+91', 'IN')
     * @returns {object} - { isValid: boolean, formatted: string, error: string }
     */
    validateMobileNumber(mobile, countryCode) {
        try {
            // Remove any special characters from mobile
            const cleanMobile = mobile.replace(/\D/g, '');
            
            // Extract country code (remove '+' if present)
            const cc = countryCode.replace('+', '');
            
            // Country code length validation
            const countryCodeLengths = {
                '91': { minLength: 10, maxLength: 10, country: 'India' },
                '1': { minLength: 10, maxLength: 10, country: 'USA' },
                '44': { minLength: 10, maxLength: 11, country: 'UK' },
                '61': { minLength: 9, maxLength: 9, country: 'Australia' },
                '27': { minLength: 9, maxLength: 9, country: 'South Africa' },
                '86': { minLength: 11, maxLength: 11, country: 'China' },
                '81': { minLength: 10, maxLength: 11, country: 'Japan' },
                '33': { minLength: 9, maxLength: 9, country: 'France' },
                '49': { minLength: 10, maxLength: 11, country: 'Germany' },
                '39': { minLength: 10, maxLength: 10, country: 'Italy' },
            };

            const validation = countryCodeLengths[cc];
            
            if (!validation) {
                return {
                    isValid: false,
                    formatted: null,
                    error: `Unsupported country code: +${cc}`
                };
            }

            // Check length
            if (cleanMobile.length < validation.minLength || cleanMobile.length > validation.maxLength) {
                return {
                    isValid: false,
                    formatted: null,
                    error: `Invalid mobile number for ${validation.country}. Expected ${validation.minLength}-${validation.maxLength} digits, got ${cleanMobile.length}`
                };
            }

            // Validate that it only contains digits
            if (!/^\d+$/.test(cleanMobile)) {
                return {
                    isValid: false,
                    formatted: null,
                    error: 'Mobile number should only contain digits'
                };
            }

            // Format as E.164
            const e164 = `+${cc}${cleanMobile}`;
            const international = `+${cc} ${cleanMobile.slice(0, validation.minLength === 10 ? 5 : 6)} ${cleanMobile.slice(validation.minLength === 10 ? 5 : 6)}`;

            return {
                isValid: true,
                formatted: international,
                e164: e164,
                national: cleanMobile,
                country: validation.country,
                error: null
            };
        } catch (error) {
            console.error('❌ Mobile validation error:', error);
            return {
                isValid: false,
                formatted: null,
                error: error.message
            };
        }
    }

    /**
     * Register new user
     * @param {object} userData - Should include username, email, password, licenceNo, fullName, countryCode, mobile
     * @returns {Promise<object>}
     */
    async register(userData) {
        try {
            // Validate mobile number
            const mobileValidation = this.validateMobileNumber(userData.mobile, userData.countryCode || '+91');
            
            if (!mobileValidation.isValid) {
                return {
                    success: false,
                    message: `Mobile validation failed: ${mobileValidation.error}`
                };
            }

            const registrationPayload = {
                username: userData.username,
                email: userData.email,
                password: userData.password,
                licenceNo: userData.licenceNo,
                fullName: userData.fullName,
                countryCode: userData.countryCode || '+91',
                mobile: mobileValidation.e164,  // Use E.164 format for backend
                mobileFormatted: mobileValidation.formatted
            };

            const response = await fetch(window.apiConfig.getNestedUrl('auth', 'register'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(registrationPayload)
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Registration failed'
                };
            }

            return {
                success: true,
                message: 'Registration successful. Please login.',
                user: data.user,
                mobile: mobileValidation.e164,
                licenceNo: userData.licenceNo
            };
        } catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                message: 'Connection error: ' + error.message
            };
        }
    }

    /**
     * Request mobile OTP after email verification
     * @param {string} mobile - Mobile number
     * @param {string} licenceNo - License number
     * @returns {Promise<object>}
     */
    async requestMobileOTP(mobile, licenceNo) {
        try {
            const response = await fetch('http://localhost:8080/sns/mobile-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mobile: mobile,
                    licenceNo: licenceNo
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('❌ Mobile OTP request failed:', data);
                return {
                    success: false,
                    message: data.message || 'Failed to send mobile OTP'
                };
            }

            console.log('✅ Mobile OTP sent successfully to:', mobile);
            return {
                success: true,
                message: 'OTP sent to mobile',
                data: data
            };
        } catch (error) {
            console.error('❌ Mobile OTP request error:', error);
            return {
                success: false,
                message: 'Connection error: ' + error.message
            };
        }
    }

    /**
     * Verify email and trigger mobile OTP
     * @param {string} email - Email to verify
     * @param {string} verificationCode - Email verification code
     * @param {string} mobile - Mobile number for OTP
     * @param {string} licenceNo - License number
     * @returns {Promise<object>}
     */
    async verifyEmailAndSendMobileOTP(email, verificationCode, mobile, licenceNo) {
        try {
            // First verify email with backend
            const verifyResponse = await fetch(window.apiConfig.getNestedUrl('auth', 'verify-email'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    verificationCode: verificationCode
                })
            });

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok) {
                return {
                    success: false,
                    message: verifyData.message || 'Email verification failed'
                };
            }

            console.log('✅ Email verified successfully');

            // After email verification, send mobile OTP
            const otpResult = await this.requestMobileOTP(mobile, licenceNo);
            
            return {
                success: true,
                message: 'Email verified. OTP sent to mobile.',
                emailVerified: true,
                otpSent: otpResult.success
            };
        } catch (error) {
            console.error('❌ Email verification error:', error);
            return {
                success: false,
                message: 'Connection error: ' + error.message
            };
        }
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            // Call logout API to clear device token
            if (this.token) {
                const response = await fetch(window.apiConfig.getNestedUrl('auth', 'logout'), {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'X-Device-Token': this.deviceToken || '',
                        'Content-Type': 'application/json'
                    }
                });
                if (response.status === 401 || response.status === 403) {
                    console.warn('Logout API returned ' + response.status + ', continuing with local logout');
                }
            }
        } catch (error) {
            console.error('Logout API error:', error);
        }

        this.token = null;
        this.deviceToken = null;
        this.csrfToken = null;
        this.user = null;

        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('deviceToken');
        sessionStorage.removeItem('csrfToken');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('loginTime');
        localStorage.removeItem('userLicenseNumber');

        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Show notification
        if (window.notificationService) {
            window.notificationService.info('You have been logged out', 'Logout Successful', 2000);
        }

        // Redirect to login after a short delay
        setTimeout(() => {
            window.location.hash = '#login';
            window.location.reload();
        }, 500);

        return true;
    }

    /**
     * Refresh token
     * @returns {Promise<boolean>}
     */
    async refreshToken() {
        if (!this.token) return false;

        try {
            const response = await fetch(window.apiConfig.getNestedUrl('auth', 'refresh'), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                sessionStorage.setItem('authToken', data.token);
                return true;
            }

            // Token refresh failed, logout user
            this.logout();
            return false;
        } catch (error) {
            console.error('Token refresh error:', error);
            return false;
        }
    }

    /**
     * Setup automatic token refresh
     */
    setupTokenInterceptor() {
        // Refresh token every 55 minutes (before 1 hour expiration)
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            if (this.token) {
                this.refreshToken();
            }
        }, 55 * 60 * 1000);
    }

    /**
     * Get authorization headers
     * @returns {object}
     */
    getHeaders() {
        this.loadAuthState();
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token && !this.isTokenExpired()) {
            headers['Authorization'] = `Bearer ${this.token}`;
        } else if (this.token && this.isTokenExpired()) {
            console.warn('⚠️ Token expired in getHeaders(), clearing...');
            this.loadAuthState();
        }
        
        if (this.deviceToken) {
            headers['X-Device-Token'] = this.deviceToken;
        }

        if (this.csrfToken) {
            headers['X-CSRF-Token'] = this.csrfToken;
        }
        
        return headers;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    /**
     * Initialize sync system after successful login
     * This ensures sync only runs when user is properly authenticated
     */
    initializeSyncAfterLogin() {
        try {
            console.log('🔄 Initializing sync system after login...');
            
            // Verify we have valid auth credentials
            if (!this.token || !this.deviceToken || !this.user) {
                console.warn('⚠️ Missing auth credentials, cannot initialize sync');
                return;
            }

            // Initialize AppInitializer if available
            if (window.AppInitializer && typeof window.AppInitializer.initialize === 'function') {
                // Use setTimeout to avoid blocking login flow
                setTimeout(() => {
                    window.AppInitializer.initialize()
                        .then(() => {
                            console.log('✅ Sync system initialized successfully after login');
                        })
                        .catch(error => {
                            console.error('❌ Error initializing sync system:', error);
                        });
                }, 1000); // 1 second delay to allow app to fully load
            } else {
                console.warn('⚠️ AppInitializer not available');
            }
        } catch (error) {
            console.error('❌ Error in initializeSyncAfterLogin:', error);
        }
    }

    /**
     * Get current user
     * @returns {object|null}
     */
    getCurrentUser() {
        return this.user;
    }

    /**
     * Get token
     * @returns {string|null}
     */
    getToken() {
        return this.token;
    }

    /**
     * Get device token
     * @returns {string|null}
     */
    getDeviceToken() {
        return this.deviceToken;
    }

    /**
     * Check if JWT token is expired (client-side check)
     * @returns {boolean}
     */
    isTokenExpired() {
        if (!this.token) return true;

        try {
            const parts = this.token.split('.');
            if (parts.length !== 3) return true;

            const decoded = JSON.parse(atob(parts[1]));
            const exp = decoded.exp;
            
            if (!exp) return false;
            
            const now = Math.floor(Date.now() / 1000);
            const isExpired = now >= exp;
            
            if (isExpired) {
                console.warn('⚠️ Token is expired');
            }
            
            return isExpired;
        } catch (error) {
            console.error('❌ Error decoding token:', error);
            return true;
        }
    }

    /**
     * Validate token
     * @returns {Promise<boolean>}
     */
    async validateToken() {
        if (!this.token) return false;

        if (this.isTokenExpired()) {
            console.warn('⚠️ Token is expired, attempting refresh...');
            return await this.refreshToken();
        }

        try {
            const response = await fetch(window.apiConfig.getNestedUrl('auth', 'validate'), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.success;
            }

            return false;
        } catch (error) {
            console.error('Token validation error:', error);
            return false;
        }
    }

    /**
     * Extract CSRF token from response headers
     * @param {Response} response 
     * @returns {string|null}
     */
    extractCsrfToken(response) {
        // Try common CSRF header names
        const csrfHeaders = [
            'x-csrf-token',
            'x-xsrf-token',
            'csrf-token',
            'xsrf-token'
        ];

        for (const header of csrfHeaders) {
            const token = response.headers.get(header);
            if (token) {
                console.log(`✅ CSRF token extracted from header: ${header}`);
                return token;
            }
        }

        return null;
    }
}

// Create singleton instance
const authService = new AuthService();

// Export to window for global access
window.authService = authService;

// Also make AuthService class available globally
window.AuthService = AuthService;
