/**
 * Authentication Page Handler with Redux Integration
 * Handles login and signup form submission
 */

console.log('Auth.js loaded');

// Define API_BASE_URL if not already defined
if (typeof API_BASE_URL === 'undefined') {
    window.API_BASE_URL = 'http://localhost:8080/api';
}

console.log('API_BASE_URL set to:', window.API_BASE_URL);

// Wait for Redux store to be available
function getStore() {
    return window.store || (window.reduxStore && window.reduxStore.getState ? window.reduxStore : null);
}

// Setup form handlers immediately
function setupAuthForms() {
    console.log('setupAuthForms called');
    
    // Login form handling
    const loginForm = document.getElementById('loginForm');
    console.log('Login form found:', !!loginForm);
    if (loginForm) {
        setupLoginForm(loginForm);
    }

    // Signup form handling
    const signupForm = document.getElementById('signupForm');
    console.log('Signup form found:', !!signupForm);
    if (signupForm) {
        setupSignupForm(signupForm);
    }
}

/**
 * Setup login form
 */
function setupLoginForm(loginForm) {
    const loginBtn = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const signupLink = document.getElementById('signupLink');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username')?.value.trim() || document.getElementById('email')?.value.trim();
        const password = document.getElementById('password').value.trim();
        const rememberMe = document.getElementById('rememberMe').checked;

        // Clear previous messages
        errorMessage.classList.remove('show');
        successMessage.classList.remove('show');

        // Validation
        if (!username || !password) {
            errorMessage.textContent = 'Please fill in all fields';
            errorMessage.classList.add('show');
            return;
        }

        // Show loading state
        loadingSpinner.classList.add('show');
        loginBtn.disabled = true;

        try {
            console.log('Login attempt started');
            console.log('Sending credentials:', { username, password: '****' });
            
            // Call API with username and password
            const response = await fetch(`${window.API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    username: username,
                    password: password 
                })
            });

            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Login failed');
            }

            if (!data.token) {
                throw new Error('No authentication token received');
            }

            console.log('✅ Login successful - Token received');

            // Store in localStorage
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('currentUser', JSON.stringify({
                username: data.username,
                userId: data.userId,
                fullName: data.fullName,
                role: data.role
            }));
            localStorage.setItem('loginTime', new Date().toISOString());
            localStorage.setItem('isAuthenticated', 'true');

            console.log('✅ User data stored in localStorage');
            console.log('Logged-in user:', { username: data.username, userId: data.userId, fullName: data.fullName });

            if (rememberMe) {
                localStorage.setItem('rememberMe', 'true');
                localStorage.setItem('rememberedUsername', username);
                console.log('Remember me enabled');
            }

            // Dispatch to Redux (if store available)
            const store = getStore();
            if (store && store.dispatch) {
                store.dispatch({
                    type: 'LOGIN_SUCCESS',
                    payload: {
                        user: {
                            username: data.username,
                            userId: data.userId,
                            fullName: data.fullName,
                            role: data.role
                        },
                        token: data.token,
                        isAuthenticated: true
                    }
                });
                console.log('✅ Redux store updated with LOGIN_SUCCESS');
            }

            // Show success message
            successMessage.textContent = 'Login successful! Redirecting...';
            successMessage.classList.add('show');

            console.log('loggedin');
            console.log('=====================================');
            console.log('USER LOGGED IN SUCCESSFULLY');
            console.log('Username:', data.username);
            console.log('Full Name:', data.fullName);
            console.log('Role:', data.role);
            console.log('User ID:', data.userId);
            console.log('=====================================');

            // Redirect to dashboard after 1 second
            setTimeout(() => {
                console.log('🔄 Navigating to dashboard...');

                // Prefer in-app router only when the main app layout is present and visible
                try {
                    const pageContent = document.getElementById('page-content');
                    const appContainer = document.getElementById('app-container');
                    const appVisible = appContainer && window.getComputedStyle ? window.getComputedStyle(appContainer).display !== 'none' : !!appContainer;

                    if (window.router && typeof window.router.navigate === 'function' && pageContent && appVisible) {
                        console.log('Using Router.navigate() (in-app)');
                        window.router.navigate('dashboard');
                        return;
                    }
                } catch (e) {
                    console.warn('Router navigate check failed:', e && e.message);
                }

                // If we reach here, the main app layout is not present (we're on auth page).
                // Reload the full app (index.html) with hash so the app initializes and navigates to dashboard.
                try {
                    const target = './index.html#dashboard';
                    console.log('Reloading app to:', target);
                    // Use href so Electron loads the correct file:// URL (avoids file:///?route=... error)
                    window.location.href = target;
                } catch (e) {
                    console.error('Failed to redirect via href, falling back to hash and reload:', e && e.message);
                    window.location.hash = '#dashboard';
                    setTimeout(() => window.location.reload(), 150);
                }

            }, 1000);

        } catch (error) {
            console.error('❌ Login error:', error);
            console.log('Error details:', error.message);
            
            // Dispatch to Redux (if store available)
            const store = getStore();
            if (store && store.dispatch) {
                store.dispatch({
                    type: 'LOGIN_FAILURE',
                    payload: error.message
                });
                console.log('Redux store updated with LOGIN_FAILURE');
            }

            errorMessage.textContent = error.message || 'Login failed. Please try again.';
            errorMessage.classList.add('show');
        } finally {
            loadingSpinner.classList.remove('show');
            loginBtn.disabled = false;
        }
    });

    // Signup link handler
    if (signupLink) {
        signupLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = '#signup';
            window.location.reload();
        });
    }

    // Pre-fill remembered username
    if (localStorage.getItem('rememberMe') === 'true') {
        const rememberedUsername = localStorage.getItem('rememberedUsername');
        if (rememberedUsername) {
            const usernameField = document.getElementById('username') || document.getElementById('email');
            if (usernameField) {
                usernameField.value = rememberedUsername;
                document.getElementById('rememberMe').checked = true;
            }
        }
    }
}

/**
 * Setup signup form
 */
function setupSignupForm(signupForm) {
    const signupBtn = document.getElementById('signupBtn');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const loginLink = document.getElementById('loginLink');

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Backend expects: username, email, password, fullName
        const username = document.getElementById('username')?.value.trim() || 
                        document.getElementById('firstName')?.value.trim() + 
                        document.getElementById('lastName')?.value.trim();
        const email = document.getElementById('email').value.trim();
        const fullName = document.getElementById('fullName')?.value.trim() || 
                        (document.getElementById('firstName')?.value.trim() + ' ' + 
                         document.getElementById('lastName')?.value.trim());
        const password = document.getElementById('password').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();

        // Clear previous messages
        errorMessage.classList.remove('show');
        successMessage.classList.remove('show');

        // Validation
        if (!username || !email || !password || !confirmPassword || !fullName) {
            errorMessage.textContent = 'Please fill in all required fields';
            errorMessage.classList.add('show');
            return;
        }

        if (!email.includes('@')) {
            errorMessage.textContent = 'Please enter a valid email address';
            errorMessage.classList.add('show');
            return;
        }

        if (password.length < 6) {
            errorMessage.textContent = 'Password must be at least 6 characters';
            errorMessage.classList.add('show');
            return;
        }

        if (password !== confirmPassword) {
            errorMessage.textContent = 'Passwords do not match';
            errorMessage.classList.add('show');
            return;
        }

        // Show loading state
        loadingSpinner.classList.add('show');
        signupBtn.disabled = true;

        try {
            // Call API with backend expected format
            const response = await fetch(`${window.API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    email: email,
                    password: password,
                    fullName: fullName
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            // Show success message
            successMessage.textContent = 'Account created successfully! Redirecting to login...';
            successMessage.classList.add('show');

            // Redirect to login after 2 seconds
            setTimeout(() => {
                window.location.hash = '#login';
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error('Signup error:', error);
            errorMessage.textContent = error.message || 'Registration failed. Please try again.';
            errorMessage.classList.add('show');
        } finally {
            loadingSpinner.classList.remove('show');
            signupBtn.disabled = false;
        }
    });

    // Login link handler
    if (loginLink) {
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = '#login';
            window.location.reload();
        });
    }
}

/**
 * Check if user is authenticated
 * Returns boolean from localStorage
 */
function isUserAuthenticated() {
    return !!localStorage.getItem('authToken') && !!localStorage.getItem('currentUser');
}

/**
 * Get current logged-in user from localStorage or Redux
 */
function getCurrentUser() {
    const store = getStore();
    
    // Try Redux first
    if (store && store.getState && store.getState().user) {
        const userState = store.getState().user;
        if (userState.currentUser) {
            return userState.currentUser;
        }
    }
    
    // Fall back to localStorage
    const userData = localStorage.getItem('currentUser');
    return userData ? JSON.parse(userData) : null;
}

/**
 * Get authentication token
 */
function getAuthToken() {
    return localStorage.getItem('authToken');
}

/**
 * Logout user - clears Redux and localStorage
 */
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginTime');

    const store = getStore();
    if (store && store.dispatch) {
        store.dispatch({
            type: 'LOGOUT'
        });
    }

    window.location.hash = '#login';
    window.location.reload();
}

/**
 * Initialize Redux store with user data from localStorage on app load
 */
function initializeAuthFromStorage() {
    const store = getStore();
    if (!store) return;

    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('currentUser');

    if (token && userStr) {
        const user = JSON.parse(userStr);
        if (store.dispatch) {
            store.dispatch({
                type: 'LOGIN_SUCCESS',
                payload: {
                    user: user,
                    token: token,
                    isAuthenticated: true
                }
            });
        }
    }
}

// Initialize auth forms immediately
console.log('Calling setupAuthForms at end of auth.js');
setupAuthForms();

// Initialize auth from storage on page load
console.log('Calling initializeAuthFromStorage at end of auth.js');
initializeAuthFromStorage();
