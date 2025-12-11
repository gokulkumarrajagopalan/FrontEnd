/**
 * Authentication Page Handler with Redux Integration
 * Handles login and signup form submission and rendering
 */

(function () {
    // Templates
    const getLoginTemplate = () => `
    <style>
        @keyframes blob {
            0%, 100% { transform: translate(0, 0) scale(1); }
            25% { transform: translate(20px, -50px) scale(1.1); }
            50% { transform: translate(-20px, 20px) scale(0.9); }
            75% { transform: translate(50px, 50px) scale(1.05); }
        }
        .animate-blob {
            animation: blob 15s infinite;
        }
        .animation-delay-2000 {
            animation-delay: 2s;
        }
        .animation-delay-4000 {
            animation-delay: 4s;
        }
        .glass-morphism {
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
    </style>
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 relative overflow-hidden">
        <!-- Animated Background Elements -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none">
            <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            <div class="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
            <div class="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div class="w-full max-w-md relative z-10">
            <!-- Logo and Brand -->
            <div class="text-center mb-6">
                <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl shadow-2xl mb-3 transform hover:rotate-6 transition-transform duration-300">
                    <span class="text-3xl">📊</span>
                </div>
                <h1 class="text-3xl font-extrabold text-white mb-2 tracking-tight">
                    Talli<span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">ffy</span>
                </h1>
                <p class="text-purple-200 text-xs font-medium">Enterprise Resource Planning</p>
            </div>

            <div class="glass-morphism rounded-3xl p-8">
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-gray-900 mb-1">Welcome Back</h2>
                    <p class="text-gray-600 text-xs">Sign in to continue to your account</p>
                </div>

                <div id="errorMessage" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm hidden">
                    <div class="flex items-start gap-3">
                        <span class="text-lg">⚠️</span>
                        <span class="flex-1"></span>
                    </div>
                </div>
                <div id="successMessage" class="mb-4 p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm hidden">
                    <div class="flex items-start gap-3">
                        <span class="text-lg">✅</span>
                        <span class="flex-1"></span>
                    </div>
                </div>

                <form id="loginForm" class="space-y-5">
                    <div>
                        <label class="block text-xs font-bold text-gray-800 mb-2">Username</label>
                        <div class="relative group">
                            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span class="text-lg">👤</span>
                            </div>
                            <input type="text" id="username" class="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" placeholder="Enter your username" required>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-800 mb-2">Password</label>
                        <div class="relative group">
                            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span class="text-lg">🔐</span>
                            </div>
                            <input type="password" id="password" class="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" placeholder="Enter your password" required>
                        </div>
                    </div>

                    <div class="flex items-center justify-between pt-2">
                        <label class="flex items-center gap-2.5 cursor-pointer group">
                            <input type="checkbox" id="rememberMe" class="w-5 h-5 rounded-lg border-2 border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500 cursor-pointer">
                            <span class="text-sm font-medium text-gray-700 group-hover:text-gray-900">Remember me</span>
                        </label>
                        <a href="#" class="text-sm font-bold text-purple-600 hover:text-purple-700 hover:underline">Forgot password?</a>
                    </div>

                    <div id="loadingSpinner" class="hidden text-center py-4">
                        <div class="inline-block">
                            <div class="animate-spin rounded-full h-10 w-10 border-4 border-purple-200 border-t-purple-600"></div>
                        </div>
                    </div>

                    <button type="submit" id="loginBtn" class="w-full bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 hover:from-purple-700 hover:via-blue-700 hover:to-purple-700 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 text-sm mt-6">
                        <span class="text-lg">🚀</span>
                        <span>Sign In to Dashboard</span>
                    </button>
                </form>

                <div class="mt-6 pt-5 border-t border-gray-200">
                    <p class="text-center text-xs text-gray-600">
                        Don't have an account?
                        <a href="#" id="showSignup" class="font-bold text-purple-600 hover:text-purple-700 hover:underline ml-1" data-route="signup">Create Account</a>
                    </p>
                </div>
            </div>

            <div class="text-center mt-6">
                <p class="text-xs text-purple-200">© 2024 Talliffy. All rights reserved.</p>
            </div>
        </div>
    </div>
    `;

    const getSignupTemplate = () => `
    <style>
        @keyframes blob {
            0%, 100% { transform: translate(0, 0) scale(1); }
            25% { transform: translate(20px, -50px) scale(1.1); }
            50% { transform: translate(-20px, 20px) scale(0.9); }
            75% { transform: translate(50px, 50px) scale(1.05); }
        }
        .animate-blob {
            animation: blob 15s infinite;
        }
        .animation-delay-2000 {
            animation-delay: 2s;
        }
        .animation-delay-4000 {
            animation-delay: 4s;
        }
        .glass-morphism {
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
    </style>
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 py-8 relative overflow-hidden">
        <!-- Animated Background Elements -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none">
            <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            <div class="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
            <div class="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div class="w-full max-w-3xl relative z-10">
            <!-- Logo and Brand -->
            <div class="text-center mb-6">
                <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl shadow-2xl mb-3 transform hover:rotate-6 transition-transform duration-300">
                    <span class="text-3xl">📊</span>
                </div>
                <h1 class="text-3xl font-extrabold text-white mb-2 tracking-tight">
                    Talli<span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">ffy</span>
                </h1>
                <p class="text-purple-200 text-xs font-medium">Enterprise Resource Planning</p>
            </div>

            <div class="glass-morphism rounded-3xl p-8">
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-gray-900 mb-1">Create Your Account</h2>
                    <p class="text-gray-600 text-xs">Join the Talliffy platform and start managing your business</p>
                </div>

                <div id="errorMessage" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm hidden">
                    <div class="flex items-start gap-3">
                        <span class="text-lg">⚠️</span>
                        <span class="flex-1"></span>
                    </div>
                </div>
                <div id="successMessage" class="mb-4 p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm hidden">
                    <div class="flex items-start gap-3">
                        <span class="text-lg">✅</span>
                        <span class="flex-1"></span>
                    </div>
                </div>

                <form id="signupForm" class="space-y-5">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label class="block text-xs font-bold text-gray-800 mb-2">Full Name <span class="text-red-500">*</span></label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg">👤</span>
                                </div>
                                <input type="text" id="fullName" class="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" placeholder="John Doe" required>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-gray-800 mb-2">Username <span class="text-red-500">*</span></label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg text-purple-500">@</span>
                                </div>
                                <input type="text" id="username" class="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" placeholder="johndoe" required>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-gray-800 mb-2">Email Address <span class="text-red-500">*</span></label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg">📧</span>
                                </div>
                                <input type="email" id="email" class="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" placeholder="john@example.com" required>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-gray-800 mb-2">License Number <span class="text-red-500">*</span></label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg">🔑</span>
                                </div>
                                <input type="number" id="licenceNo" class="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" placeholder="1001" required min="1">
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-gray-800 mb-2">Password <span class="text-red-500">*</span></label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg">🔐</span>
                                </div>
                                <input type="password" id="password" class="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" placeholder="Min 6 characters" required minlength="6">
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-gray-800 mb-2">Confirm Password <span class="text-red-500">*</span></label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg">🔐</span>
                                </div>
                                <input type="password" id="confirmPassword" class="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" placeholder="Re-enter password" required minlength="6">
                            </div>
                        </div>
                    </div>

                    <div class="flex items-start gap-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border-2 border-purple-100">
                        <input type="checkbox" id="agreeTerms" class="w-4 h-4 mt-0.5 rounded border-2 border-purple-300 text-purple-600 focus:ring-2 focus:ring-purple-500 cursor-pointer" required>
                        <label for="agreeTerms" class="text-xs text-gray-700 font-medium cursor-pointer">
                            I agree to the <a href="#" class="text-purple-600 font-bold hover:underline">Terms of Service</a> and <a href="#" class="text-purple-600 font-bold hover:underline">Privacy Policy</a>
                        </label>
                    </div>

                    <div id="loadingSpinner" class="hidden text-center py-3">
                        <div class="inline-block">
                            <div class="animate-spin rounded-full h-8 w-8 border-4 border-purple-200 border-t-purple-600"></div>
                        </div>
                    </div>

                    <button type="submit" id="signupBtn" class="w-full bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 hover:from-purple-700 hover:via-blue-700 hover:to-purple-700 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 text-sm mt-6">
                        <span class="text-lg">✨</span>
                        <span>Create My Account</span>
                    </button>
                </form>

                <div class="mt-6 pt-5 border-t border-gray-200">
                    <p class="text-center text-xs text-gray-600">
                        Already have an account?
                        <a href="#" id="showLogin" class="font-bold text-purple-600 hover:text-purple-700 hover:underline ml-1" data-route="login">Sign In</a>
                    </p>
                </div>
            </div>

            <div class="text-center mt-6">
                <p class="text-xs text-purple-200">© 2024 Talliffy. All rights reserved.</p>
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
                    // Start sync scheduler before redirecting
                    if (window.syncScheduler) {
                        console.log('🔄 Starting auto-sync scheduler after login...');
                        window.syncScheduler.start();
                    }
                    
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

