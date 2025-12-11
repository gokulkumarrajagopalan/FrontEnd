
(function () {
    const getLoginTemplate = () => `
    <div class="auth-background flex items-center justify-center p-6 relative overflow-hidden" style="background: var(--bg-primary); min-height: 100vh;">

        <div class="w-full max-w-md relative z-10">
            <!-- Logo and Brand -->
            <div class="auth-header mb-6 text-center">
                <div class="auth-logo inline-flex mb-3 transform hover:rotate-6 transition-transform duration-300">
                    <span class="text-5xl">📊</span>
                </div>
                <h1 class="text-4xl font-bold mb-2" style="color: var(--text-primary);">
                    Talli<span class="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">ffy</span>
                </h1>
                <p class="text-sm" style="color: var(--text-tertiary);">Enterprise Resource Planning</p>
            </div>

            <div class="rounded-3xl p-8 shadow-2xl" style="background: var(--card-bg); border: 1px solid var(--card-border);">
                <div class="mb-6">
                    <h2 class="text-2xl font-bold mb-1" style="color: var(--text-primary);">Welcome Back</h2>
                    <p class="text-xs" style="color: var(--text-tertiary);">Sign in to continue to your account</p>
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
                        <label class="block text-xs font-bold mb-2" style="color: var(--text-primary);">Username</label>
                        <div class="relative group">
                            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span class="text-lg">👤</span>
                            </div>
                            <input type="text" id="username" class="w-full pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" style="padding-left: calc(2.75rem + 5px);" placeholder="Enter your username" required>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-800 mb-2">Password</label>
                        <div class="relative group">
                            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span class="text-lg">🔐</span>
                            </div>
                            <input type="password" id="password" class="w-full pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" style="padding-left: calc(2.75rem + 5px);" placeholder="Enter your password" required>
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
                <p class="text-xs" style="color: var(--text-tertiary);">© 2024 Talliffy. All rights reserved.</p>
            </div>
        </div>
    </div>
    `;

    const getSignupTemplate = () => `
    <div class="auth-background flex items-center justify-center p-6 py-8 relative overflow-hidden" style="background: var(--bg-primary); min-height: 100vh;">

        <div class="w-full max-w-3xl relative z-10 mx-auto">
            <!-- Logo and Brand -->
            <div class="auth-header mb-6" style="padding: 1.5rem; border-radius: 1.5rem; text-align: center;">
                <div class="auth-logo inline-flex mb-3 transform hover:rotate-6 transition-transform duration-300">
                    <span class="text-3xl">📊</span>
                </div>
                <h1 class="auth-brand mb-2" style="color: white;">
                    Talli<span style="color: white;">fy</span>
                </h1>
                <p class="auth-tagline" style="color: rgba(255, 255, 255, 0.9);">Enterprise Resource Planning</p>
            </div>

            <div class="auth-card glass-morphism rounded-3xl p-8 mx-auto" style="background: var(--card-bg); max-width: 700px;">
                <div class="mb-6">
                    <h2 class="text-2xl font-bold mb-1" style="color: var(--text-primary);">Create Your Account</h2>
                    <p class="text-xs" style="color: var(--text-secondary);">Join the Talliffy platform and start managing your business</p>
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
                            <label class="block text-xs font-bold mb-2" style="color: var(--text-primary);">Full Name <span class="text-red-500">*</span></label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg">👤</span>
                                </div>
                                <input type="text" id="fullName" class="w-full pr-4 py-2 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" style="padding-left: calc(2.75rem + 5px);" placeholder="John Doe" required>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold mb-2" style="color: var(--text-primary);">Username <span class="text-red-500">*</span></label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg text-purple-500">@</span>
                                </div>
                                <input type="text" id="username" class="w-full pr-4 py-2 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" style="padding-left: calc(2.75rem + 5px);" placeholder="johndoe" required>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold mb-2" style="color: var(--text-primary);">Email Address <span class="text-red-500">*</span></label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg">📧</span>
                                </div>
                                <input type="email" id="email" class="w-full pr-4 py-2 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" style="padding-left: calc(2.75rem + 5px);" placeholder="john@example.com" required>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold mb-2" style="color: var(--text-primary);">License Number <span class="text-red-500">*</span></label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg">🔑</span>
                                </div>
                                <input type="number" id="licenceNo" class="w-full pr-4 py-2 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" style="padding-left: calc(2.75rem + 5px);" placeholder="1001" required min="1">
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold mb-2" style="color: var(--text-primary);">Password <span class="text-red-500">*</span></label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg">🔐</span>
                                </div>
                                <input type="password" id="password" class="w-full pr-4 py-2 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" style="padding-left: calc(2.75rem + 5px);" placeholder="Min 6 characters" required minlength="6">
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold mb-2" style="color: var(--text-primary);">Confirm Password <span class="text-red-500">*</span></label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg">🔐</span>
                                </div>
                                <input type="password" id="confirmPassword" class="w-full pr-4 py-2 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" style="padding-left: calc(2.75rem + 5px);" placeholder="Re-enter password" required minlength="6">
                            </div>
                        </div>
                    </div>

                    <div class="flex items-start gap-3 p-4 rounded-xl border-2" style="background: var(--bg-secondary); border-color: var(--border-color);">
                        <input type="checkbox" id="agreeTerms" class="w-4 h-4 mt-0.5 rounded border-2 cursor-pointer" style="border-color: var(--primary-600); color: var(--primary-600);" required>
                        <label for="agreeTerms" class="text-xs font-medium cursor-pointer" style="color: var(--text-primary);">
                            I agree to the <a href="#" class="font-bold hover:underline" style="color: var(--primary-600);">Terms of Service</a> and <a href="#" class="font-bold hover:underline" style="color: var(--primary-600);">Privacy Policy</a>
                        </label>
                    </div>

                    <div id="loadingSpinner" class="hidden text-center py-3">
                        <div class="inline-block">
                            <div class="animate-spin rounded-full h-8 w-8 border-4" style="border-color: var(--primary-200); border-top-color: var(--primary-600);"></div>
                        </div>
                    </div>

                    <button type="submit" id="signupBtn" class="w-full text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 text-sm mt-6" style="background: var(--primary-600);" onmouseover="this.style.background='var(--primary-700)'" onmouseout="this.style.background='var(--primary-600)'">
                        <span class="text-lg">✨</span>
                        <span>Create My Account</span>
                    </button>
                </form>

                <div class="mt-6 pt-5 border-t" style="border-color: var(--border-color);">
                    <p class="text-center text-xs" style="color: var(--text-secondary);">
                        Already have an account?
                        <a href="#" id="showLogin" class="font-bold hover:underline ml-1" data-route="login" style="color: var(--primary-600);">Sign In</a>
                    </p>
                </div>
            </div>

            <div class="text-center mt-6">
                <p class="text-xs" style="color: var(--text-tertiary);">© 2024 Talliffy. All rights reserved.</p>
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

