/**
 * Authentication Service
 * Handles user login, logout, token management, and session
 */

class AuthService {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.deviceToken = localStorage.getItem('deviceToken');
        this.user = JSON.parse(localStorage.getItem('currentUser') || 'null');
        this.refreshInterval = null;
        
        // Log initialization for debugging
        console.log('🔐 AuthService initialized:', {
            hasToken: !!this.token,
            hasDeviceToken: !!this.deviceToken,
            hasUser: !!this.user,
            userId: this.user?.userId
        });
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
            this.user = {
                userId: data.userId,
                username: data.username,
                fullName: data.fullName,
                role: data.role
            };

            localStorage.setItem('authToken', data.token);
            localStorage.setItem('deviceToken', data.deviceToken);
            localStorage.setItem('currentUser', JSON.stringify(this.user));
            localStorage.setItem('loginTime', new Date().toISOString());

            // Set token in all future requests
            this.setupTokenInterceptor();

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
     * Register new user
     * @param {object} userData 
     * @returns {Promise<object>}
     */
    async register(userData) {
        try {
            const response = await fetch(window.apiConfig.getNestedUrl('auth', 'register'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
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
                user: data.user
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
        this.user = null;

        localStorage.removeItem('authToken');
        localStorage.removeItem('deviceToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('loginTime');

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
                localStorage.setItem('authToken', data.token);
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
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        if (this.deviceToken) {
            headers['X-Device-Token'] = this.deviceToken;
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
     * Validate token
     * @returns {Promise<boolean>}
     */
    async validateToken() {
        if (!this.token) return false;

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
}

// Create singleton instance
const authService = new AuthService();

// Export to window for global access
window.authService = authService;

// Also make AuthService class available globally
window.AuthService = AuthService;
