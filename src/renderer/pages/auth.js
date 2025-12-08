/**
 * Authentication Page Handler with Redux Integration
 * Handles login and signup form submission and rendering
 */

(function () {
    // Templates
    const getLoginTemplate = () => `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-700 p-4">
        <div class="w-full max-w-md">
            <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div class="p-8">
                    <div class="text-center mb-6">
                        <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mx-auto flex items-center justify-center mb-3 shadow-lg">
                            <span class="text-3xl">📊</span>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-900">Welcome Back</h2>
                        <p class="text-gray-600 mt-1 text-sm">Sign in to your Talliffy account</p>
                    </div>

                    <div id="errorMessage" class="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700 text-sm hidden"></div>
                    <div id="successMessage" class="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg text-green-700 text-sm hidden"></div>

                    <form id="loginForm" class="space-y-5">
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Username</label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span class="text-gray-400">👤</span>
                                </div>
                                <input type="text" id="username" class="w-full pl-10 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-900" placeholder="Enter your username" required>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span class="text-gray-400">🔒</span>
                                </div>
                                <input type="password" id="password" class="w-full pl-10 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-900" placeholder="••••••••" required>
                            </div>
                        </div>

                        <div class="flex items-center justify-between text-sm">
                            <label class="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" id="rememberMe" class="w-4 h-4 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500">
                                <span class="text-gray-700 group-hover:text-gray-900">Remember me</span>
                            </label>
                            <a href="#" class="text-blue-600 hover:text-blue-700 font-semibold hover:underline">Forgot password?</a>
                        </div>

                        <div id="loadingSpinner" class="hidden text-center py-2">
                            <div class="inline-block">
                                <div class="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600"></div>
                            </div>
                        </div>

                        <button type="submit" id="loginBtn" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold shadow-md hover:shadow-lg active:scale-[0.98] transition-all">
                            Sign In
                        </button>
                    </form>

                    <div class="mt-6 pt-6 border-t border-gray-200 text-center">
                        <p class="text-gray-600 text-sm">
                            Don't have an account?
                            <a href="#" id="showSignup" class="text-blue-600 font-semibold hover:text-blue-700 hover:underline ml-1" data-route="signup">Sign Up</a>
                        </p>
                    </div>
                </div>
                <div class="bg-gray-50 px-6 py-3 border-t border-gray-200 text-center">
                    <p class="text-xs text-gray-500">© 2024 Talliffy. All rights reserved.</p>
                </div>
            </div>
        </div>
    </div>
    `;

    const getSignupTemplate = () => `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-700 p-4 py-8">
        <div class="w-full max-w-2xl">
            <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div class="p-8">
                    <div class="text-center mb-6">
                        <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mx-auto flex items-center justify-center mb-3 shadow-lg">
                            <span class="text-3xl">📊</span>
                        </div>
                        <h2 class="text-2xl font-bold text-gray-900">Create Account</h2>
                        <p class="text-gray-600 mt-1 text-sm">Join Talliffy ERP Platform</p>
                    </div>

                    <div id="errorMessage" class="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700 text-sm hidden"></div>
                    <div id="successMessage" class="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg text-green-700 text-sm hidden"></div>

                    <form id="signupForm" class="space-y-5">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">Full Name <span class="text-red-500">*</span></label>
                                <div class="relative">
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span class="text-gray-400">👤</span>
                                    </div>
                                    <input type="text" id="fullName" class="w-full pl-10 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-900" placeholder="John Doe" required>
                                </div>
                            </div>

                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">Username <span class="text-red-500">*</span></label>
                                <div class="relative">
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span class="text-gray-400">@</span>
                                    </div>
                                    <input type="text" id="username" class="w-full pl-10 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-900" placeholder="johndoe" required>
                                </div>
                            </div>

                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">Email Address <span class="text-red-500">*</span></label>
                                <div class="relative">
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span class="text-gray-400">📧</span>
                                    </div>
                                    <input type="email" id="email" class="w-full pl-10 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-900" placeholder="john@example.com" required>
                                </div>
                            </div>

                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">License Number <span class="text-red-500">*</span></label>
                                <div class="relative">
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span class="text-gray-400">🔑</span>
                                    </div>
                                    <input type="number" id="licenceNo" class="w-full pl-10 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-900" placeholder="1001" required min="1">
                                </div>
                                <p class="text-xs text-gray-500 mt-1">Enter your Tally license number</p>
                            </div>

                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">Password <span class="text-red-500">*</span></label>
                                <div class="relative">
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span class="text-gray-400">🔒</span>
                                    </div>
                                    <input type="password" id="password" class="w-full pl-10 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-900" placeholder="••••••••" required minlength="6">
                                </div>
                                <p class="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                            </div>

                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">Confirm Password <span class="text-red-500">*</span></label>
                                <div class="relative">
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span class="text-gray-400">🔒</span>
                                    </div>
                                    <input type="password" id="confirmPassword" class="w-full pl-10 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-900" placeholder="••••••••" required minlength="6">
                                </div>
                            </div>
                        </div>

                        <div class="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <input type="checkbox" id="agreeTerms" class="w-5 h-5 mt-0.5 rounded border-2 border-blue-300 text-blue-600 focus:ring-2 focus:ring-blue-500" required>
                            <label for="agreeTerms" class="text-sm text-gray-700">
                                I agree to the <a href="#" class="text-blue-600 font-semibold hover:underline">Terms of Service</a> and <a href="#" class="text-blue-600 font-semibold hover:underline">Privacy Policy</a>
                            </label>
                        </div>

                        <div id="loadingSpinner" class="hidden text-center py-2">
                            <div class="inline-block">
                                <div class="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600"></div>
                            </div>
                        </div>

                        <button type="submit" id="signupBtn" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold shadow-md hover:shadow-lg active:scale-[0.98] transition-all">
                            Create Account
                        </button>
                    </form>

                    <div class="mt-6 pt-6 border-t border-gray-200 text-center">
                        <p class="text-gray-600 text-sm">
                            Already have an account?
                            <a href="#" id="showLogin" class="text-blue-600 font-semibold hover:text-blue-700 hover:underline ml-1" data-route="login">Sign In</a>
                        </p>
                    </div>
                </div>
                <div class="bg-gray-50 px-6 py-3 border-t border-gray-200 text-center">
                    <p class="text-xs text-gray-500">© 2024 Talliffy. All rights reserved.</p>
                </div>
            </div>
        </div>
    </div>
    `;

    // Shared State & Helpers
    if (typeof window.API_BASE_URL === 'undefined') {
        window.API_BASE_URL = window.AppConfig ? window.AppConfig.API_BASE_URL : 'http://localhost:8080';
    }

    function getStore() {
        return window.store || (window.reduxStore && window.reduxStore.getState ? window.reduxStore : null);
    }

    // Initialization Functions
    window.initializeAuth = function () {
        console.log('Initializing Auth Page...');
        const currentHash = window.location.hash.replace('#', '') || 'login';
        
        if (currentHash === 'signup') {
            window.initializeSignup();
        } else {
            window.initializeLogin();
        }
    };

    window.initializeLogin = function () {
        console.log('Initializing Login Page...');
        const pageContent = document.getElementById('page-content');
        const target = pageContent || document.body;
        target.innerHTML = getLoginTemplate();
        setupLoginForm();

        // Handle link to signup
        const showSignup = document.getElementById('showSignup');
        if (showSignup) {
            showSignup.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.router) {
                    window.router.navigate('signup');
                } else {
                    window.location.hash = '#signup';
                    window.initializeSignup();
                }
            });
        }
    };

    window.initializeSignup = function () {
        console.log('Initializing Signup Page...');
        const pageContent = document.getElementById('page-content');
        const target = pageContent || document.body;
        target.innerHTML = getSignupTemplate();
        setupSignupForm();

        // Handle link to login
        const showLogin = document.getElementById('showLogin');
        if (showLogin) {
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.router) {
                    window.router.navigate('login');
                } else {
                    window.location.hash = '#login';
                    window.initializeLogin();
                }
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

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || result.error || 'Login failed');
                }

                // Extract data from response (backend returns { success, message, data: {...} })
                const data = result.data || result;

                if (!data.token) {
                    throw new Error('No authentication token received');
                }

                // Success - Store token and deviceToken
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('deviceToken', data.deviceToken);
                localStorage.setItem('currentUser', JSON.stringify({
                    username: data.username,
                    userId: data.userId,
                    fullName: data.fullName,
                    role: data.role
                }));
                localStorage.setItem('isAuthenticated', 'true');
                
                console.log('✅ Login successful - Token and device token stored:', {
                    hasToken: !!data.token,
                    hasDeviceToken: !!data.deviceToken,
                    userId: data.userId
                });

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

            const fullName = document.getElementById('fullName')?.value.trim();
            const username = document.getElementById('username')?.value.trim();
            const email = document.getElementById('email')?.value.trim();
            const licenceNo = document.getElementById('licenceNo')?.value.trim();
            const password = document.getElementById('password')?.value.trim();
            const confirmPassword = document.getElementById('confirmPassword')?.value.trim();
            const agreeTerms = document.getElementById('agreeTerms')?.checked;

            errorMessage.classList.add('hidden');
            successMessage.classList.add('hidden');

            // Validation
            if (!fullName || !username || !email || !licenceNo || !password || !confirmPassword) {
                errorMessage.textContent = 'Please fill in all required fields';
                errorMessage.classList.remove('hidden');
                return;
            }

            if (!agreeTerms) {
                errorMessage.textContent = 'Please agree to the Terms of Service and Privacy Policy';
                errorMessage.classList.remove('hidden');
                return;
            }

            if (password.length < 6) {
                errorMessage.textContent = 'Password must be at least 6 characters long';
                errorMessage.classList.remove('hidden');
                return;
            }

            if (password !== confirmPassword) {
                errorMessage.textContent = 'Passwords do not match';
                errorMessage.classList.remove('hidden');
                return;
            }

            const licenceNumber = parseInt(licenceNo);
            if (isNaN(licenceNumber) || licenceNumber < 1) {
                errorMessage.textContent = 'Please enter a valid license number';
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
                        licenceNo: licenceNumber,
                        password,
                        fullName
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Registration failed');
                }

                successMessage.textContent = '✅ Account created successfully! Redirecting to login...';
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

