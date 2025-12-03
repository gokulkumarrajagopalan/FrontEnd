/**
 * Authentication Page Handler with Redux Integration
 * Handles login and signup form submission and rendering
 */

(function () {
    // Templates
    const getLoginTemplate = () => `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 to-sidebar p-4">
        <div class="w-full max-w-md">
            <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div class="p-8">
                    <div class="text-center mb-8">
                        <div class="w-16 h-16 bg-primary-600 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-primary-500/30">
                            <span class="text-3xl">📊</span>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800">Welcome Back</h2>
                        <p class="text-gray-500 mt-2">Sign in to Tally Prime ERP</p>
                    </div>

                    <div id="errorMessage" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm hidden"></div>
                    <div id="successMessage" class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm hidden"></div>

                    <form id="loginForm" class="space-y-6">
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Username</label>
                            <input type="text" id="username" class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all" placeholder="Enter your username" required>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Password</label>
                            <input type="password" id="password" class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all" placeholder="••••••••" required>
                        </div>

                        <div class="flex items-center justify-between text-sm">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" id="rememberMe" class="rounded text-primary-600 focus:ring-primary-500">
                                <span class="text-gray-600">Remember me</span>
                            </label>
                            <a href="#" class="text-primary-600 hover:text-primary-700 font-medium">Forgot password?</a>
                        </div>

                        <div id="loadingSpinner" class="hidden text-center">
                            <div class="inline-block">
                                <div class="animate-spin">
                                    <svg class="w-6 h-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <button type="submit" id="loginBtn" class="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold shadow-lg shadow-primary-500/30 hover:bg-primary-700 hover:shadow-primary-500/40 active:scale-[0.98] transition-all">
                            Sign In
                        </button>
                    </form>

                    <div class="mt-8 text-center">
                        <p class="text-gray-500 text-sm">
                            Don't have an account?
                            <a href="#" id="showSignup" class="text-primary-600 font-semibold hover:text-primary-700" data-route="signup">Create Account</a>
                        </p>
                    </div>
                </div>
                <div class="bg-gray-50 px-8 py-4 border-t border-gray-100 text-center">
                    <p class="text-xs text-gray-400">© 2024 Tally Prime. Secure Enterprise System.</p>
                </div>
            </div>
        </div>
    </div>
    `;

    const getSignupTemplate = () => `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 to-sidebar p-4">
        <div class="w-full max-w-md">
            <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div class="p-8">
                    <div class="text-center mb-8">
                        <div class="w-16 h-16 bg-primary-600 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-primary-500/30">
                            <span class="text-3xl">📊</span>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-800">Create Account</h2>
                        <p class="text-gray-500 mt-2">Join Tally Prime ERP</p>
                    </div>

                    <div id="errorMessage" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm hidden"></div>
                    <div id="successMessage" class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm hidden"></div>

                    <form id="signupForm" class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">First Name</label>
                                <input type="text" id="firstName" class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all" placeholder="John" required>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Last Name</label>
                                <input type="text" id="lastName" class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all" placeholder="Doe" required>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Username</label>
                            <input type="text" id="username" class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all" placeholder="Choose your username" required>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Email</label>
                            <input type="email" id="email" class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all" placeholder="Enter your email" required>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Password</label>
                            <input type="password" id="password" class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all" placeholder="••••••••" required>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Confirm Password</label>
                            <input type="password" id="confirmPassword" class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all" placeholder="••••••••" required>
                        </div>

                        <div id="loadingSpinner" class="hidden text-center">
                            <div class="inline-block">
                                <div class="animate-spin">
                                    <svg class="w-6 h-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <button type="submit" id="signupBtn" class="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold shadow-lg shadow-primary-500/30 hover:bg-primary-700 hover:shadow-primary-500/40 active:scale-[0.98] transition-all">
                            Create Account
                        </button>
                    </form>

                    <div class="mt-6 text-center">
                        <p class="text-gray-500 text-sm">
                            Already have an account?
                            <a href="#" id="showLogin" class="text-primary-600 font-semibold hover:text-primary-700" data-route="login">Sign In</a>
                        </p>
                    </div>
                </div>
                <div class="bg-gray-50 px-8 py-4 border-t border-gray-100 text-center">
                    <p class="text-xs text-gray-400">© 2024 Tally Prime. Secure Enterprise System.</p>
                </div>
            </div>
        </div>
    </div>
    `;

    // Shared State & Helpers
    if (typeof window.API_BASE_URL === 'undefined') {
        window.API_BASE_URL = 'http://localhost:8080/api';
    }

    function getStore() {
        return window.store || (window.reduxStore && window.reduxStore.getState ? window.reduxStore : null);
    }

    // Initialization Functions
    window.initializeLogin = function () {
        console.log('Initializing Login Page...');
        document.body.innerHTML = getLoginTemplate();
        setupLoginForm();

        // Handle link to signup
        const showSignup = document.getElementById('showSignup');
        if (showSignup) {
            showSignup.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.router) window.router.navigate('signup');
            });
        }
    };

    window.initializeSignup = function () {
        console.log('Initializing Signup Page...');
        document.body.innerHTML = getSignupTemplate();
        setupSignupForm();

        // Handle link to login
        const showLogin = document.getElementById('showLogin');
        if (showLogin) {
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.router) window.router.navigate('login');
            });
        }
    };

    // Form Setup Logic
    function setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        if (!loginForm) return;

        const loginBtn = document.getElementById('loginBtn');
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');
        const loadingSpinner = document.getElementById('loadingSpinner');

        // Pre-fill remembered username
        if (localStorage.getItem('rememberMe') === 'true') {
            const rememberedUsername = localStorage.getItem('rememberedUsername');
            if (rememberedUsername) {
                const usernameField = document.getElementById('username');
                if (usernameField) {
                    usernameField.value = rememberedUsername;
                    document.getElementById('rememberMe').checked = true;
                }
            }
        }

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('username')?.value.trim();
            const password = document.getElementById('password')?.value.trim();
            const rememberMe = document.getElementById('rememberMe')?.checked || false;

            // UI Reset
            errorMessage.classList.add('hidden');
            successMessage.classList.add('hidden');
            errorMessage.textContent = '';
            successMessage.textContent = '';

            if (!username || !password) {
                errorMessage.textContent = 'Please fill in all fields';
                errorMessage.classList.remove('hidden');
                return;
            }

            loadingSpinner.classList.remove('hidden');
            loginBtn.disabled = true;

            try {
                const response = await fetch(`${window.API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || data.error || 'Login failed');
                }

                if (!data.token) {
                    throw new Error('No authentication token received');
                }

                // Success
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('currentUser', JSON.stringify({
                    username: data.username,
                    userId: data.userId,
                    fullName: data.fullName,
                    role: data.role
                }));
                localStorage.setItem('isAuthenticated', 'true');

                if (rememberMe) {
                    localStorage.setItem('rememberMe', 'true');
                    localStorage.setItem('rememberedUsername', username);
                } else {
                    localStorage.removeItem('rememberMe');
                    localStorage.removeItem('rememberedUsername');
                }

                // Redux
                const store = getStore();
                if (store && store.dispatch) {
                    store.dispatch({
                        type: 'LOGIN_SUCCESS',
                        payload: {
                            user: data,
                            token: data.token,
                            isAuthenticated: true
                        }
                    });
                }

                successMessage.textContent = 'Login successful! Redirecting...';
                successMessage.classList.remove('hidden');

                setTimeout(() => {
                    // Reload to initialize full app
                    window.location.href = 'index.html';
                }, 1000);

            } catch (error) {
                console.error('Login error:', error);
                errorMessage.textContent = error.message || 'Login failed';
                errorMessage.classList.remove('hidden');
            } finally {
                loadingSpinner.classList.add('hidden');
                loginBtn.disabled = false;
            }
        });
    }

    function setupSignupForm() {
        const signupForm = document.getElementById('signupForm');
        if (!signupForm) return;

        const signupBtn = document.getElementById('signupBtn');
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');
        const loadingSpinner = document.getElementById('loadingSpinner');

        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const firstName = document.getElementById('firstName')?.value.trim() || '';
            const lastName = document.getElementById('lastName')?.value.trim() || '';
            const username = document.getElementById('username')?.value.trim();
            const email = document.getElementById('email')?.value.trim();
            const fullName = (firstName + ' ' + lastName).trim();
            const password = document.getElementById('password')?.value.trim();
            const confirmPassword = document.getElementById('confirmPassword')?.value.trim();

            errorMessage.classList.add('hidden');
            successMessage.classList.add('hidden');

            if (!username || !email || !password || !confirmPassword) {
                errorMessage.textContent = 'Please fill in all required fields';
                errorMessage.classList.remove('hidden');
                return;
            }

            if (password !== confirmPassword) {
                errorMessage.textContent = 'Passwords do not match';
                errorMessage.classList.remove('hidden');
                return;
            }

            loadingSpinner.classList.remove('hidden');
            signupBtn.disabled = true;

            try {
                const response = await fetch(`${window.API_BASE_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username,
                        email,
                        password,
                        fullName
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Registration failed');
                }

                successMessage.textContent = 'Account created successfully! Redirecting to login...';
                successMessage.classList.remove('hidden');

                setTimeout(() => {
                    if (window.router) window.router.navigate('login');
                }, 2000);

            } catch (error) {
                console.error('Signup error:', error);
                errorMessage.textContent = error.message || 'Registration failed';
                errorMessage.classList.remove('hidden');
            } finally {
                loadingSpinner.classList.add('hidden');
                signupBtn.disabled = false;
            }
        });
    }

})();

