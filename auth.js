/**
 * Authentication Service
 * Handles user login, logout, token management, and session
 */

// Define API_BASE_URL if not already defined
if (typeof API_BASE_URL === 'undefined') {
    window.API_BASE_URL = 'http://localhost:8080/api';
}

class AuthService {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.user = JSON.parse(localStorage.getItem('currentUser') || 'null');
        this.refreshInterval = null;
    }

    /**
     * Login user
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<{success: boolean, message: string, token?: string, user?: object}>}
     */
    async login(email, password) {
        try {
            const response = await fetch(`${window.API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: email, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || 'Login failed'
                };
            }

            // Store token and user
            this.token = data.token;
            this.user = data.user;
            
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            localStorage.setItem('loginTime', new Date().toISOString());

            // Set token in all future requests
            this.setupTokenInterceptor();

            return {
                success: true,
                message: 'Login successful',
                token: data.token,
                user: data.user
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
            const response = await fetch(`${window.API_BASE_URL}/auth/register`, {
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
    logout() {
        this.token = null;
        this.user = null;
        
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('loginTime');

        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        return true;
    }

    /**
     * Refresh token
     * @returns {Promise<boolean>}
     */
    async refreshToken() {
        if (!this.token) return false;

        try {
            const response = await fetch(`${window.API_BASE_URL}/auth/refresh`, {
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
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };
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
}

// Create singleton instance
const authService = new AuthService();
