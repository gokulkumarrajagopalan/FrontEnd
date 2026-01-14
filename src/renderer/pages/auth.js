(function () {
    // API Base URL
    if (typeof window.API_BASE_URL === 'undefined') {
        window.API_BASE_URL = window.AppConfig ? window.AppConfig.API_BASE_URL : 'http://localhost:8080';
    }

    function getStore() {
        return window.store || (window.reduxStore && window.reduxStore.getState ? window.reduxStore : null);
    }

    // ============= DUAL-MODE LOGIN TEMPLATE =============
    const getLoginTemplate = () => `
    <div class="auth-background flex items-center justify-center p-6 relative overflow-hidden" style="background: var(--bg-primary); min-height: 100vh;">
        <div class="w-full max-w-md relative z-10">
            <!-- Logo and Brand -->
            <div class="auth-header mb-6 text-center">
                <div class="auth-logo inline-flex mb-3 transform hover:rotate-6 transition-transform duration-300">
                    <span class="text-5xl">📊</span>
                </div>
                <h1 class="text-4xl font-bold mb-2" style="color: var(--text-primary);">
                    Talli<span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-600">ffy</span>
                </h1>
                <p class="text-sm" style="color: var(--text-tertiary);">Enterprise Resource Planning</p>
            </div>

            <div class="rounded-3xl p-8 shadow-2xl" style="background: var(--card-bg); border: 1px solid var(--card-border);">
                <div class="mb-6">
                    <h2 class="text-2xl font-bold mb-1" style="color: var(--text-primary);">Welcome Back</h2>
                    <p class="text-xs" style="color: var(--text-tertiary);">Sign in to continue to your account</p>
                </div>

                <!-- Login Mode Toggle -->
                <div class="mb-6 flex gap-4 p-2 bg-gray-100 rounded-xl">
                    <label class="flex-1 flex items-center justify-center gap-2 cursor-pointer">
                        <input type="radio" name="loginMode" value="username" id="loginModeUsername" checked class="w-4 h-4 text-blue-600 focus:ring-blue-500">
                        <span class="text-sm font-medium text-gray-700">Username</span>
                    </label>
                    <label class="flex-1 flex items-center justify-center gap-2 cursor-pointer">
                        <input type="radio" name="loginMode" value="email" id="loginModeEmail" class="w-4 h-4 text-blue-600 focus:ring-blue-500">
                        <span class="text-sm font-medium text-gray-700">Email + Licence</span>
                    </label>
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
                    <!-- Username Mode Fields -->
                    <div id="usernameFields">
                        <div>
                            <label class="block text-xs font-bold mb-2" style="color: var(--text-primary);">Username</label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg">👤</span>
                                </div>
                                <input type="text" id="username" class="w-full pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" style="padding-left: 3rem;" placeholder="Enter your username">
                            </div>
                        </div>
                    </div>

                    <!-- Email + Licence Mode Fields -->
                    <div id="emailFields" class="hidden space-y-4">
                        <div>
                            <label for="loginEmail" class="block text-xs font-bold mb-2" style="color: var(--text-primary);">Email Address</label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg">📧</span>
                                </div>
                                <input type="email" id="loginEmail" class="w-full pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" style="padding-left: 3rem;" placeholder="john@example.com">
                            </div>
                        </div>
                        <div>
                            <label for="loginLicenceNo" class="block text-xs font-bold mb-2" style="color: var(--text-primary);">Licence Number</label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg">🔑</span>
                                </div>
                                <input type="number" id="loginLicenceNo" class="w-full pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" style="padding-left: 3rem; -moz-appearance: textfield;" placeholder="1001" min="1">
                                <style>
                                    #loginLicenceNo::-webkit-outer-spin-button,
                                    #loginLicenceNo::-webkit-inner-spin-button {
                                        -webkit-appearance: none;
                                        margin: 0;
                                    }
                                </style>
                            </div>
                        </div>
                    </div>

                    <!-- Password Field (Common) -->
                    <div>
                        <label for="password" class="block text-xs font-bold mb-2" style="color: var(--text-primary);">Password</label>
                        <div class="relative w-full" style="position: relative;">
                            <div class="absolute flex items-center justify-center" style="position: absolute; left: 1rem; top: 0; bottom: 0; pointer-events: none; z-index: 10;">
                                <span class="text-lg">🔐</span>
                            </div>
                            <input type="password" id="password" class="w-full py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" style="padding-left: 3rem; padding-right: 3rem;" placeholder="Enter your password" required>
                            <button type="button" id="toggleLoginPassword" aria-label="Show or hide password" class="absolute flex items-center justify-center text-gray-500 hover:text-gray-700" style="position: absolute; right: 0.75rem; top: 0; bottom: 0; background: none !important; border: none !important; padding: 0 !important; width: 32px !important; min-width: auto !important; box-shadow: none !important; transform: none !important; z-index: 10; cursor: pointer;">👁️</button>
                        </div>
                    </div>

                    <div class="flex items-center justify-between pt-2">
                        <label class="flex items-center gap-2.5 cursor-pointer group">
                            <input type="checkbox" id="rememberMe" class="w-5 h-5 rounded-lg border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer">
                            <span class="text-sm font-medium text-gray-700 group-hover:text-gray-900">Remember me</span>
                        </label>
                        <a href="#" class="text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline">Forgot password?</a>
                    </div>

                    <div id="loadingSpinner" class="hidden text-center py-4">
                        <div class="inline-block">
                            <div class="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
                        </div>
                    </div>

                    <button type="submit" id="loginBtn" class="w-full text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 text-sm mt-6" style="background: #000000 !important;">
                        <span class="text-lg">🚀</span>
                        <span>Sign In to Dashboard</span>
                    </button>
                </form>

                <div class="mt-6 pt-5 border-t border-gray-200">
                    <p class="text-center text-xs text-gray-600">
                        Don't have an account?
                        <a href="#" id="showSignup" class="font-bold text-blue-600 hover:text-blue-700 hover:underline ml-1" data-route="signup">Create Account</a>
                    </p>
                </div>
            </div>

            <div class="text-center mt-6">
                <p class="text-xs" style="color: var(--text-tertiary);">© 2024 Talliffy. All rights reserved.</p>
            </div>
        </div>
    </div>
    `;

    // ============= OTP VERIFICATION TEMPLATE =============
    const getOtpVerificationTemplate = (username) => `
    <div class="auth-background flex items-center justify-center p-6 relative overflow-hidden" style="background: var(--bg-primary); min-height: 100vh;">
        <div class="w-full max-w-md relative z-10">
            <div class="auth-header mb-6 text-center">
                <div class="auth-logo inline-flex mb-3">
                    <span class="text-5xl">📧</span>
                </div>
                <h1 class="text-3xl font-bold mb-2" style="color: var(--text-primary);">Verify Your Email</h1>
                <p class="text-sm" style="color: var(--text-tertiary);">We sent a 6-digit code to your email</p>
            </div>

            <div class="rounded-3xl p-8 shadow-2xl" style="background: var(--card-bg); border: 1px solid var(--card-border);">
                <div class="mb-6 text-center">
                    <p class="text-sm font-medium" style="color: var(--text-secondary);">Username: ${username}</p>
                    <p class="text-xs" style="color: var(--text-tertiary);">Enter the 6-digit code sent to your email.</p>
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

                <form id="otpForm" class="space-y-6">
                    <div>
                        <label class="block text-xs font-bold mb-3 text-center" style="color: var(--text-primary);">Enter 6-Digit OTP Code</label>
                        <div class="flex gap-2 justify-center">
                            <input type="text" maxlength="1" class="otp-input w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all" data-index="0">
                            <input type="text" maxlength="1" class="otp-input w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all" data-index="1">
                            <input type="text" maxlength="1" class="otp-input w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all" data-index="2">
                            <input type="text" maxlength="1" class="otp-input w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all" data-index="3">
                            <input type="text" maxlength="1" class="otp-input w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all" data-index="4">
                            <input type="text" maxlength="1" class="otp-input w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all" data-index="5">
                        </div>
                    </div>

                    <div class="text-center">
                        <p class="text-sm font-medium" style="color: var(--text-secondary);">
                            ⏱ Code expires in: <span id="otpTimer" class="font-bold text-blue-600">5:00</span>
                        </p>
                    </div>

                    <div id="loadingSpinner" class="hidden text-center py-4">
                        <div class="inline-block">
                            <div class="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
                        </div>
                    </div>

                    <button type="submit" id="verifyBtn" class="w-full text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 text-sm" style="background: #000000 !important;">
                        <span class="text-lg">✅</span>
                        <span>Verify OTP</span>
                    </button>
                </form>

                <div class="mt-6 pt-5 border-t border-gray-200 text-center">
                    <p class="text-xs mb-3" style="color: var(--text-secondary);">Didn't receive the code?</p>
                    <button id="resendBtn" class="text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50 disabled:cursor-not-allowed">
                        Resend OTP (<span id="remainingAttempts">3</span> attempts remaining)
                    </button>
                    <p id="resendTimer" class="text-xs mt-2 hidden" style="color: var(--text-tertiary);">Wait <span id="resendCountdown">60</span>s to resend</p>
                </div>

                <div class="mt-4 text-center">
                    <a href="#" id="backToLogin" class="text-sm font-medium text-gray-600 hover:text-gray-800">← Back to Login</a>
                </div>
            </div>
        </div>
    </div>
    `;

    // ============= MOBILE OTP VERIFICATION TEMPLATE =============
    const getMobileOtpVerificationTemplate = (mobile, username) => `
    <div class="flex items-center justify-center min-h-screen" style="background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);">
        <div class="w-full max-w-md mx-4">
            <div class="bg-white rounded-2xl shadow-2xl overflow-hidden text-gray-800">
                <!-- Header -->
                <div class="p-8 pb-6 text-center" style="background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%); color: #000000;">
                    <div class="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-lg">
                        <span class="text-4xl">📱</span>
                    </div>
                    <h2 class="text-2xl font-bold mb-2" style="color: #000000;">Mobile Verification</h2>
                    <p class="text-sm" style="color: #000000;">Enter the OTP sent to ${mobile.replace(/(.{3})(.{4})(.*)/, '$1$2****')}</p>
                </div>

                <!-- OTP Form -->
                <div class="p-8" style="color: #1f2937;">
                    <!-- Success Message -->
                    <div id="mobile-otp-success" class="mb-4 p-4 rounded-lg" style="background-color: #DEF7EC; border: 1px solid #84E1BC; display: none;" role="alert" aria-live="polite">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">✅</span>
                            <span class="text-sm font-medium" style="color: #03543F;"></span>
                        </div>
                    </div>

                    <!-- Error Message -->
                    <div id="mobile-otp-error" class="mb-4 p-4 rounded-lg" style="background-color: #FDE8E8; border: 1px solid #F98080; display: none;" role="alert" aria-live="assertive">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">⚠️</span>
                            <span class="text-sm font-medium" style="color: #9B1C1C;"></span>
                        </div>
                    </div>

                    <!-- OTP Inputs -->
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-800 mb-3">Enter 6-digit OTP</label>
                        <div class="flex gap-2 justify-center" id="mobile-otp-inputs-container">
                            <input type="text" maxlength="1" class="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" inputmode="numeric" pattern="[0-9]" id="mobile-otp-1" />
                            <input type="text" maxlength="1" class="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" inputmode="numeric" pattern="[0-9]" id="mobile-otp-2" />
                            <input type="text" maxlength="1" class="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" inputmode="numeric" pattern="[0-9]" id="mobile-otp-3" />
                            <input type="text" maxlength="1" class="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" inputmode="numeric" pattern="[0-9]" id="mobile-otp-4" />
                            <input type="text" maxlength="1" class="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" inputmode="numeric" pattern="[0-9]" id="mobile-otp-5" />
                            <input type="text" maxlength="1" class="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" inputmode="numeric" pattern="[0-9]" id="mobile-otp-6" />
                        </div>
                    </div>

                    <!-- Timer -->
                    <div class="mb-6 text-center">
                        <div class="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-800">
                            <span class="text-2xl">⏱️</span>
                            <span class="text-sm font-medium">Time remaining:</span>
                            <span id="mobile-otp-timer" class="text-sm font-bold" style="color: var(--primary-color);">10:00</span>
                        </div>
                    </div>

                    <!-- Verify Button -->
                    <button id="mobile-verify-otp-btn" class="w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 mb-4" style="background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%); color: #000000;">
                        <span class="flex items-center justify-center gap-2">
                            <span>🔓</span>
                            <span id="mobile-verify-otp-text">Verify OTP</span>
                        </span>
                    </button>

                    <!-- Resend OTP -->
                    <div class="text-center mb-4">
                        <button id="mobile-resend-otp-btn" class="text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed" style="color: var(--primary-color);" disabled>
                            <span id="mobile-resend-otp-text">Resend OTP in <span id="mobile-resend-countdown">60</span>s</span>
                        </button>
                        <div id="mobile-resend-attempts" class="text-xs text-gray-500 mt-1">3 attempts remaining</div>
                    </div>

                    <!-- Back to Login -->
                    <div class="text-center">
                        <a href="#login" class="text-sm font-medium transition-colors duration-200" style="color: var(--primary-color);" onclick="window.initializeLogin(); return false;">← Back to Login</a>
                    </div>
                </div>
            </div>

            <!-- Help Text -->
            <div class="mt-6 text-center">
                <p class="text-white text-sm opacity-90">Didn't receive the code? Check your SMS or try resending.</p>
            </div>
        </div>
    </div>
    `;

    // ============= REGISTRATION TEMPLATE (UPDATED) =============
    const getSignupTemplate = () => `
    <div class="auth-background flex items-center justify-center p-6 py-8 relative overflow-hidden" style="background: var(--bg-primary); min-height: 100vh;">
        <div class="w-full max-w-3xl relative z-10 mx-auto">
            <div class="auth-header mb-6 text-center">
                <div class="auth-logo inline-flex mb-3">
                    <span class="text-5xl">📊</span>
                </div>
                <h1 class="text-3xl font-bold mb-2" style="color: var(--text-primary);">Create Your Account</h1>
                <p class="text-sm" style="color: var(--text-tertiary);">Join Talliffy - Enterprise Resource Planning</p>
            </div>

            <div class="rounded-3xl p-8 shadow-2xl" style="background: var(--card-bg); border: 1px solid var(--card-border); max-width: 700px; margin: 0 auto;">
                <div id="errorMessage" role="alert" aria-live="assertive" tabindex="-1" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm hidden">
                    <div class="flex items-start gap-3">
                        <span class="text-lg">⚠️</span>
                        <span class="flex-1"></span>
                    </div>
                </div>
                <div id="successMessage" role="status" aria-live="polite" class="mb-4 p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm hidden">
                    <div class="flex items-start gap-3">
                        <span class="text-lg">✅</span>
                        <span class="flex-1"></span>
                    </div>
                </div>

                <form id="signupForm" class="space-y-3">
                    <!-- Full Name Row -->
                    <div class="flex items-center gap-3">
                        <label class="text-xs font-bold whitespace-nowrap" style="color: var(--text-primary); min-width: 100px;">Full Name <span class="text-red-500">*</span></label>
                        <div class="relative group flex-1">
                            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span class="text-lg">👤</span>
                            </div>
                            <input type="text" id="fullName" class="w-full pr-4 py-2 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" style="padding-left: 3rem;" placeholder="John Doe" required>
                        </div>
                    </div>

                    <!-- Username Row -->
                    <div class="flex items-center gap-3">
                        <label class="text-xs font-bold whitespace-nowrap" style="color: var(--text-primary); min-width: 100px;">Username <span class="text-red-500">*</span></label>
                        <div class="flex-1">
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg text-blue-500">@</span>
                                </div>
                                <input type="text" id="username" class="w-full pr-4 py-2 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" style="padding-left: 3rem;" placeholder="john_company_a" required>
                            </div>
                            <p id="usernameHelper" class="text-xs mt-1 ml-2" style="color: var(--text-tertiary);">Unique username for login</p>
                        </div>
                    </div>

                    <!-- Email Address Row -->
                    <div class="flex items-center gap-3">
                        <label for="email" class="text-xs font-bold whitespace-nowrap" style="color: var(--text-primary); min-width: 100px;">Email Address <span class="text-red-500">*</span></label>
                        <div class="flex-1">
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg">📧</span>
                                </div>
                                <input type="email" id="email" class="w-full pr-4 py-2 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" style="padding-left: 3rem;" placeholder="john@example.com" required>
                            </div>
                            <p id="emailHelper" class="text-xs mt-1 ml-2" style="color: var(--text-tertiary);">Can be used for multiple companies</p>
                        </div>
                    </div>

                    <!-- Licence Number Row -->
                    <div class="flex items-center gap-3">
                        <label for="licenceNo" class="text-xs font-bold whitespace-nowrap" style="color: var(--text-primary); min-width: 100px;">Licence Number <span class="text-red-500">*</span></label>
                        <div class="flex-1">
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg">🔑</span>
                                </div>
                                <input type="number" id="licenceNo" class="w-full pr-4 py-2 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" style="padding-left: 3rem; -moz-appearance: textfield;" placeholder="1001" required min="1">
                                <style>
                                    #licenceNo::-webkit-outer-spin-button,
                                    #licenceNo::-webkit-inner-spin-button {
                                        -webkit-appearance: none;
                                        margin: 0;
                                    }
                                </style>
                            </div>
                            <p id="licenceHelper" class="text-xs mt-1 ml-2" style="color: var(--text-tertiary);">Your company's licence number</p>
                        </div>
                    </div>

                    <!-- Country Code Row -->
                    <div class="flex items-center gap-3">
                        <label for="countryCode" class="text-xs font-bold whitespace-nowrap" style="color: var(--text-primary); min-width: 100px;">Country Code <span class="text-red-500">*</span></label>
                        <div class="flex-1">
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                                    <span class="text-lg">🌍</span>
                                </div>
                                <select id="countryCode" class="w-full pr-12 py-2 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400 appearance-none" style="padding-left: 3rem;" required>
                                    <option value="+91" selected>+91 (India)</option>
                                    <option value="+1">+1 (USA)</option>
                                    <option value="+44">+44 (UK)</option>
                                    <option value="+61">+61 (Australia)</option>
                                    <option value="+27">+27 (South Africa)</option>
                                    <option value="+86">+86 (China)</option>
                                    <option value="+81">+81 (Japan)</option>
                                    <option value="+33">+33 (France)</option>
                                    <option value="+49">+49 (Germany)</option>
                                    <option value="+39">+39 (Italy)</option>
                                </select>
                                <style>
                                    #countryCode {
                                        appearance: none;
                                        padding-right: 2.5rem;
                                        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
                                        background-repeat: no-repeat;
                                        background-position: right 0.75rem center;
                                        padding-right: 2rem;
                                    }
                                </style>
                            </div>
                            <p id="countryHelper" class="text-xs mt-1 ml-2" style="color: var(--text-tertiary);"></p>
                        </div>
                    </div>

                    <!-- Mobile Number Row -->
                    <div class="flex items-center gap-3">
                        <label for="mobile" class="text-xs font-bold whitespace-nowrap" style="color: var(--text-primary); min-width: 100px;">Mobile Number <span class="text-red-500">*</span></label>
                        <div class="flex-1">
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg">📱</span>
                                </div>
                                <input type="tel" id="mobile" class="w-full pr-4 py-2 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" style="padding-left: 3rem;" placeholder="1234567890" required pattern="[0-9]{7,15}" aria-describedby="mobileHelper">
                            </div>
                            <p id="mobileHelper" class="text-xs mt-1 ml-2" style="color: var(--text-tertiary);"></p>
                        </div>
                    </div>

                    <!-- Password Row -->
                    <div class="flex items-center gap-3">
                        <label for="signupPassword" class="text-xs font-bold whitespace-nowrap" style="color: var(--text-primary); min-width: 100px;">Password <span class="text-red-500">*</span></label>
                        <div class="flex-1">
                            <div class="relative w-full" style="position: relative;">
                                <div class="absolute flex items-center justify-center" style="position: absolute; left: 1rem; top: 0; bottom: 0; pointer-events: none; z-index: 10;">
                                    <span class="text-lg">🔐</span>
                                </div>
                                <input type="password" id="signupPassword" class="w-full py-2.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" style="padding-left: 3rem; padding-right: 3rem;" placeholder="Min 6 characters" required minlength="6" aria-describedby="passwordHelper">
                                <button type="button" id="toggleSignupPassword" aria-label="Show or hide password" class="absolute flex items-center justify-center text-gray-500 hover:text-gray-700" style="position: absolute; right: 0.75rem; top: 0; bottom: 0; background: none !important; border: none !important; padding: 0 !important; width: 32px !important; min-width: auto !important; box-shadow: none !important; transform: none !important; z-index: 10; cursor: pointer;">👁️</button>
                            </div>
                            <p id="passwordHelper" class="text-[10px] mt-1 ml-2" style="color: var(--text-tertiary);"></p>
                            <div id="passwordStrength" class="mt-1 ml-2 h-1 bg-gray-200 rounded overflow-hidden w-24">
                                <div id="passwordStrengthBar" class="h-1 w-0 bg-red-500 transition-all duration-200"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Confirm Password Row -->
                    <div class="flex items-center gap-3">
                        <label for="confirmPassword" class="text-xs font-bold whitespace-nowrap" style="color: var(--text-primary); min-width: 100px;">Confirm Password <span class="text-red-500">*</span></label>
                        <div class="flex-1">
                            <div class="relative w-full" style="position: relative;">
                                <div class="absolute flex items-center justify-center" style="position: absolute; left: 1rem; top: 0; bottom: 0; pointer-events: none; z-index: 10;">
                                    <span class="text-lg">🔐</span>
                                </div>
                                <input type="password" id="confirmPassword" class="w-full py-2.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-gray-900 bg-white text-sm font-medium placeholder-gray-400" style="padding-left: 3rem; padding-right: 3rem;" placeholder="Re-enter password" required minlength="6" aria-describedby="confirmHelper">
                                <button type="button" id="toggleSignupConfirmPassword" aria-label="Show or hide password" class="absolute flex items-center justify-center text-gray-500 hover:text-gray-700" style="position: absolute; right: 0.75rem; top: 0; bottom: 0; background: none !important; border: none !important; padding: 0 !important; width: 32px !important; min-width: auto !important; box-shadow: none !important; transform: none !important; z-index: 10; cursor: pointer;">👁️</button>
                            </div>
                            <p id="confirmHelper" class="text-[10px] mt-1 ml-2" style="color: var(--text-tertiary);"></p>
                        </div>
                    </div>

                    <div class="flex items-start gap-3 p-4 rounded-xl border-2 bg-gray-50">
                        <input type="checkbox" id="agreeTerms" class="w-4 h-4 mt-0.5 rounded border-2 cursor-pointer text-blue-600 focus:ring-blue-500" required>
                        <label for="agreeTerms" class="text-xs font-medium cursor-pointer" style="color: var(--text-primary);">
                            I agree to the <a href="#" class="font-bold hover:underline text-blue-600">Terms of Service</a> and <a href="#" class="font-bold hover:underline text-blue-600">Privacy Policy</a>
                        </label>
                    </div>

                    <div id="loadingSpinner" class="hidden text-center py-3">
                        <div class="inline-block">
                            <div class="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600"></div>
                        </div>
                    </div>

                    <button type="submit" id="signupBtn" class="w-full text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 text-sm mt-6" style="background: #000000 !important;">
                        <span class="text-lg" id="signupBtnIcon">✨</span>
                        <span id="signupBtnText">Create My Account</span>
                        <span id="signupBtnSpinner" class="hidden ml-2 inline-flex">
                            <span class="animate-spin rounded-full h-5 w-5 border-2 border-blue-200 border-t-white"></span>
                        </span>
                    </button>
                </form>

                <div class="mt-6 pt-5 border-t border-gray-200">
                    <p class="text-center text-xs" style="color: var(--text-secondary);">
                        Already have an account?
                        <a href="#" id="showLogin" class="font-bold text-blue-600 hover:text-blue-700 hover:underline ml-1" data-route="login">Sign In</a>
                    </p>
                </div>
            </div>

            <div class="text-center mt-6">
                <p class="text-xs" style="color: var(--text-tertiary);">© 2024 Talliffy. All rights reserved.</p>
            </div>
        </div>
    </div>
    `;

    // ============= INITIALIZATION FUNCTIONS =============
    window.initializeAuth = function () {
        console.log('Initializing Auth Page...');
        const currentHash = window.location.hash.replace('#', '') || 'login';

        if (currentHash === 'signup') {
            window.initializeSignup();
        } else if (currentHash === 'verify-otp') {
            const username = localStorage.getItem('pendingVerificationUsername');
            if (username) {
                window.initializeOtpVerification(username);
            } else {
                window.initializeLogin();
            }
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

        // Handle login mode toggle
        const usernameMode = document.getElementById('loginModeUsername');
        const emailMode = document.getElementById('loginModeEmail');
        const usernameFields = document.getElementById('usernameFields');
        const emailFields = document.getElementById('emailFields');

        usernameMode.addEventListener('change', () => {
            if (usernameMode.checked) {
                usernameFields.classList.remove('hidden');
                emailFields.classList.add('hidden');
            }
        });

        emailMode.addEventListener('change', () => {
            if (emailMode.checked) {
                usernameFields.classList.add('hidden');
                emailFields.classList.remove('hidden');

                // Auto-fetch and populate license number when switching to Email + Licence mode
                fetchAndPopulateLicenseNumberForLogin();
            }
        });
    };

    // Function to fetch and populate license number in login page
    async function fetchAndPopulateLicenseNumberForLogin() {
        try {
            const licenceNoInput = document.getElementById('loginLicenceNo');
            if (!licenceNoInput) return;

            // Don't override if user already entered a value
            if (licenceNoInput.value && licenceNoInput.value.trim() !== '') {
                return;
            }

            // Get Tally port from settings
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            const tallyPort = appSettings.tallyPort || 9000;

            console.log('🔑 Fetching Tally license number for login...');

            if (window.electronAPI && window.electronAPI.invoke) {
                const response = await window.electronAPI.invoke('fetch-license', { tallyPort });

                if (response.success && response.data && response.data.license_number) {
                    const licenseNumber = response.data.license_number;
                    licenceNoInput.value = licenseNumber;
                    licenceNoInput.style.borderColor = '#10b981'; // Green border
                    licenceNoInput.style.background = '#f0fdf4'; // Light green background

                    console.log('✅ License number auto-populated in login:', licenseNumber);

                    // Show a subtle notification
                    if (window.notificationService) {
                        window.notificationService.success(
                            `License number ${licenseNumber} from Tally has been auto-filled`,
                            'License Auto-Populated',
                            2500
                        );
                    }
                } else {
                    console.warn('⚠️ License number not available from Tally');
                    licenceNoInput.placeholder = '1001';
                }
            } else {
                console.warn('⚠️ electronAPI not available');
            }
        } catch (error) {
            console.error('❌ Error fetching license number for login:', error);
            const licenceNoInput = document.getElementById('loginLicenceNo');
            if (licenceNoInput) {
                licenceNoInput.placeholder = '1001';
            }
        }
    }

    window.initializeSignup = function () {
        console.log('📝 Initializing Signup Page...');
        const pageContent = document.getElementById('page-content');
        const target = pageContent || document.body;
        target.innerHTML = getSignupTemplate();
        
        // Verify fields are in DOM
        setTimeout(() => {
            const countryCodeField = document.getElementById('countryCode');
            const mobileField = document.getElementById('mobile');
            
            console.log('🌍 Country Code field visible:', !!countryCodeField);
            console.log('📱 Mobile field visible:', !!mobileField);
            
            if (!countryCodeField) {
                console.warn('⚠️ Country Code field not found in DOM');
            }
            if (!mobileField) {
                console.warn('⚠️ Mobile field not found in DOM');
            }
        }, 100);
        
        setupSignupForm();

        // Auto-fetch and populate Tally license number
        fetchAndPopulateLicenseNumber();

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

    // Function to fetch and populate license number from Tally
    async function fetchAndPopulateLicenseNumber() {
        try {
            const licenceNoInput = document.getElementById('licenceNo');
            if (!licenceNoInput) return;

            // Get Tally port from settings
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            const tallyPort = appSettings.tallyPort || 9000;

            console.log('🔑 Fetching Tally license number...');

            if (window.electronAPI && window.electronAPI.invoke) {
                const response = await window.electronAPI.invoke('fetch-license', { tallyPort });

                if (response.success && response.data && response.data.license_number) {
                    const licenseNumber = response.data.license_number;
                    licenceNoInput.value = licenseNumber;
                    licenceNoInput.style.borderColor = '#10b981'; // Green border
                    licenceNoInput.style.background = '#f0fdf4'; // Light green background

                    console.log('✅ License number auto-populated:', licenseNumber);

                    // Show a subtle notification
                    if (window.notificationService) {
                        window.notificationService.success(
                            `License number ${licenseNumber} from Tally has been auto-filled`,
                            'License Auto-Populated',
                            3000
                        );
                    }
                } else {
                    console.warn('⚠️ License number not available from Tally');
                    licenceNoInput.placeholder = 'Enter license number manually';
                }
            } else {
                console.warn('⚠️ electronAPI not available');
            }
        } catch (error) {
            console.error('❌ Error fetching license number:', error);
            const licenceNoInput = document.getElementById('licenceNo');
            if (licenceNoInput) {
                licenceNoInput.placeholder = 'Enter license number manually';
            }
        }
    }

    window.initializeOtpVerification = function (username) {
        console.log('Initializing OTP Verification...');
        const pageContent = document.getElementById('page-content');
        const target = pageContent || document.body;
        target.innerHTML = getOtpVerificationTemplate(username);
        setupOtpForm(username);

        // Handle back to login
        const backToLogin = document.getElementById('backToLogin');
        if (backToLogin) {
            backToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('pendingVerificationUsername');
                localStorage.removeItem('pendingVerificationEmail');
                localStorage.removeItem('pendingVerificationLicence');
                if (window.router) {
                    window.router.navigate('login');
                } else {
                    window.location.hash = '#login';
                    window.initializeLogin();
                }
            });
        }
    };

    // ============= DUAL-MODE LOGIN FORM SETUP =============
    function setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        if (!loginForm) return;

        const loginBtn = document.getElementById('loginBtn');
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');
        const loadingSpinner = document.getElementById('loadingSpinner');

        // Show/Hide password toggle
        const toggleLoginPassword = document.getElementById('toggleLoginPassword');
        if (toggleLoginPassword) {
            toggleLoginPassword.addEventListener('click', () => {
                const pwd = document.getElementById('password');
                if (!pwd) return;
                const isText = pwd.type === 'text';
                pwd.type = isText ? 'password' : 'text';
                toggleLoginPassword.textContent = isText ? '👁️' : '🙈';
            });
        }

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const loginMode = document.querySelector('input[name="loginMode"]:checked')?.value;
            const password = document.getElementById('password')?.value.trim();
            const rememberMe = document.getElementById('rememberMe')?.checked || false;

            // UI Reset
            errorMessage.classList.add('hidden');
            successMessage.classList.add('hidden');
            errorMessage.querySelector('span:last-child').textContent = '';
            successMessage.querySelector('span:last-child').textContent = '';

            let payload = {};

            if (loginMode === 'username') {
                const username = document.getElementById('username')?.value.trim();
                if (!username || !password) {
                    errorMessage.querySelector('span:last-child').textContent = 'Please fill in all fields';
                    errorMessage.classList.remove('hidden');
                    return;
                }
                payload = { username, password };
            } else {
                const email = document.getElementById('loginEmail')?.value.trim();
                const licenceNo = document.getElementById('loginLicenceNo')?.value.trim();
                if (!email || !licenceNo || !password) {
                    errorMessage.querySelector('span:last-child').textContent = 'Please fill in all fields';
                    errorMessage.classList.remove('hidden');
                    return;
                }
                payload = { email, licenceNo: parseInt(licenceNo), password };
            }

            loadingSpinner.classList.remove('hidden');
            loginBtn.disabled = true;

            try {
                const response = await fetch(`${window.API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                // Handle 403 - Verification required
                if (response.status === 403) {
                    const pendingUsername = result.username || payload.username || '';
                    const pendingEmail = result.email || '';
                    const pendingLicence = result.licenceNo || '';
                    const pendingMobile = result.mobile || '';
                    const countryCode = result.countryCode || localStorage.getItem('pendingVerificationCountryCode') || '+91';
                    const fullMobile = pendingMobile && pendingMobile.startsWith('+') ? pendingMobile : `${countryCode}${pendingMobile}`;

                    // Explicitly check verification flags from server response
                    const emailVerified = result.emailVerified === true;
                    const mobileVerified = result.mobileVerified === true;

                    console.log('🔐 Login Verification Status:', {
                        emailVerified,
                        mobileVerified,
                        message: result.message,
                        username: pendingUsername
                    });

                    // Case 1: Email not verified - send to email OTP
                    if (!emailVerified) {
                        console.log('📧 Redirecting to Email OTP verification');
                        errorMessage.querySelector('span:last-child').textContent = result.message || 'Email not verified. Sending verification code...';
                        errorMessage.classList.remove('hidden');

                        localStorage.setItem('pendingVerificationUsername', pendingUsername);
                        localStorage.setItem('pendingVerificationEmail', pendingEmail);
                        localStorage.setItem('pendingVerificationLicence', pendingLicence);
                        if (pendingMobile) {
                            localStorage.setItem('pendingVerificationMobile', pendingMobile);
                            localStorage.setItem('pendingVerificationCountryCode', countryCode);
                        }

                        // Send email OTP explicitly
                        try {
                            const otpSendResponse = await fetch(`${window.API_BASE_URL}/auth/send-email-otp`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ username: pendingUsername })
                            });

                            const otpSendData = await otpSendResponse.json();
                            if (!otpSendResponse.ok || otpSendData.success === false) {
                                throw new Error(otpSendData.message || 'Failed to send email OTP');
                            }
                        } catch (otpError) {
                            console.error('Send email OTP (login) error:', otpError);
                        }

                        setTimeout(() => {
                            window.initializeOtpVerification(pendingUsername);
                        }, 1500);
                        return;
                    }

                    // Case 2: Email verified but mobile not verified - send to mobile OTP
                    if (emailVerified && !mobileVerified) {
                        console.log('📱 Redirecting to Mobile OTP verification');
                        errorMessage.querySelector('span:last-child').textContent = result.message || 'Mobile not verified. Sending verification code...';
                        errorMessage.classList.remove('hidden');

                        localStorage.setItem('pendingVerificationUsername', pendingUsername);
                        if (pendingMobile) {
                            localStorage.setItem('pendingVerificationMobile', pendingMobile);
                            localStorage.setItem('pendingVerificationCountryCode', countryCode);
                        }

                        // Send mobile OTP
                        try {
                            const mobileOtpResponse = await fetch(`${window.API_BASE_URL}/sns/send-mobile-otp`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ username: pendingUsername })
                            });

                            const mobileOtpData = await mobileOtpResponse.json();
                            if (!mobileOtpResponse.ok || mobileOtpData.success === false) {
                                throw new Error(mobileOtpData.message || 'Failed to send mobile OTP');
                            }
                        } catch (mobileOtpError) {
                            console.error('Send mobile OTP (login) error:', mobileOtpError);
                        }

                        setTimeout(() => {
                            window.initializeMobileOtpVerification(fullMobile || pendingMobile, pendingUsername);
                        }, 1500);
                        return;
                    }

                    // Case 3: Both verified (shouldn't reach here with 403, but handle it)
                    if (emailVerified && mobileVerified) {
                        console.log('✅ Both email and mobile verified - this shouldn\'t trigger 403');
                        errorMessage.querySelector('span:last-child').textContent = 'All verifications complete. Please try logging in again.';
                        errorMessage.classList.remove('hidden');
                        return;
                    }

                    // Fallback
                    console.log('⚠️ Unknown verification state');
                    errorMessage.querySelector('span:last-child').textContent = result.message || 'Verification required.';
                    errorMessage.classList.remove('hidden');
                    return;
                }

                if (!response.ok) {
                    throw new Error(result.message || result.error || 'Login failed');
                }

                // Extract data from response
                const data = result.data || result;

                if (!data.token) {
                    throw new Error('No authentication token received');
                }

                // Success - Store credentials in sessionStorage (secure, cleared on app close)
                sessionStorage.setItem('authToken', data.token);
                sessionStorage.setItem('deviceToken', data.deviceToken);
                sessionStorage.setItem('currentUser', JSON.stringify({
                    username: data.username,
                    userId: data.userId,
                    fullName: data.fullName,
                    email: data.email,
                    licenceNo: data.licenceNo,
                    role: data.role
                }));
                sessionStorage.setItem('loginTime', new Date().toISOString());
                
                // Extract CSRF token from response if available
                if (data.csrfToken) {
                    sessionStorage.setItem('csrfToken', data.csrfToken);
                }

                console.log('✅ Login successful:', {
                    hasToken: !!data.token,
                    hasDeviceToken: !!data.deviceToken,
                    userId: data.userId
                });

                if (rememberMe && loginMode === 'username') {
                    localStorage.setItem('rememberMe', 'true');
                    localStorage.setItem('rememberedUsername', payload.username);
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

                successMessage.querySelector('span:last-child').textContent = 'Login successful! Redirecting...';
                successMessage.classList.remove('hidden');

                setTimeout(() => {
                    if (window.syncScheduler) {
                        window.syncScheduler.start();
                    }
                    window.location.href = 'index.html';
                }, 1000);

            } catch (error) {
                console.error('Login error:', error);
                errorMessage.querySelector('span:last-child').textContent = error.message || 'Login failed';
                errorMessage.classList.remove('hidden');
            } finally {
                loadingSpinner.classList.add('hidden');
                loginBtn.disabled = false;
            }
        });
    }

    // ============= REGISTRATION FORM SETUP (UPDATED) =============
    function setupSignupForm() {
        const signupForm = document.getElementById('signupForm');
        if (!signupForm) return;

        const signupBtn = document.getElementById('signupBtn');
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');
        const loadingSpinner = document.getElementById('loadingSpinner');

        // Inline validation helpers
        const emailInput = document.getElementById('email');
        const emailHelper = document.getElementById('emailHelper');
        const usernameInput = document.getElementById('username');
        const usernameHelper = document.getElementById('usernameHelper');
        const licenceInput = document.getElementById('licenceNo');
        const licenceHelper = document.getElementById('licenceHelper');
        const countrySelect = document.getElementById('countryCode');
        const countryHelper = document.getElementById('countryHelper');
        const mobileInput = document.getElementById('mobile');
        const mobileHelper = document.getElementById('mobileHelper');
        const signupPassword = document.getElementById('signupPassword');
        const passwordHelper = document.getElementById('passwordHelper');
        const passwordStrengthBar = document.getElementById('passwordStrengthBar');
        const confirmPassword = document.getElementById('confirmPassword');
        const confirmHelper = document.getElementById('confirmHelper');
        const toggleSignupPassword = document.getElementById('toggleSignupPassword');
        const toggleSignupConfirmPassword = document.getElementById('toggleSignupConfirmPassword');

        const setFieldState = (inputEl, isValid, helperEl, msg) => {
            if (!inputEl) return;
            inputEl.style.borderColor = isValid ? '#10b981' : '#ef4444';
            inputEl.style.background = isValid ? '#f0fdf4' : '#fef2f2';
            if (helperEl) {
                helperEl.textContent = msg || '';
                helperEl.style.color = isValid ? '#065f46' : '#991b1b';
            }
        };

        if (toggleSignupPassword && signupPassword) {
            toggleSignupPassword.addEventListener('click', () => {
                const isText = signupPassword.type === 'text';
                signupPassword.type = isText ? 'password' : 'text';
                toggleSignupPassword.textContent = isText ? '👁️' : '🙈';
            });
        }
        if (toggleSignupConfirmPassword && confirmPassword) {
            toggleSignupConfirmPassword.addEventListener('click', () => {
                const isText = confirmPassword.type === 'text';
                confirmPassword.type = isText ? 'password' : 'text';
                toggleSignupConfirmPassword.textContent = isText ? '👁️' : '🙈';
            });
        }

        // Email validation
        if (emailInput) {
            emailInput.addEventListener('input', () => {
                const val = emailInput.value.trim();
                const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
                setFieldState(emailInput, ok, emailHelper, ok ? 'Looks good' : 'Invalid email address');
            });
        }

        // Username validation (alphanumeric/underscore, min 3)
        if (usernameInput) {
            usernameInput.addEventListener('input', () => {
                const val = usernameInput.value.trim();
                const ok = /^[A-Za-z0-9_]{3,}$/.test(val);
                setFieldState(usernameInput, ok, usernameHelper, ok ? 'Available format' : 'Min 3 chars, letters/numbers/_');
            });
        }

        // Licence validation (positive integer)
        if (licenceInput) {
            const updateLicence = () => {
                const n = parseInt(licenceInput.value, 10);
                const ok = !isNaN(n) && n > 0;
                setFieldState(licenceInput, ok, licenceHelper, ok ? 'Valid licence number' : 'Enter a positive number');
            };
            ['input','blur'].forEach(ev => licenceInput.addEventListener(ev, updateLicence));
        }

        // Country helper
        if (countrySelect && countryHelper) {
            countrySelect.addEventListener('change', () => {
                countryHelper.textContent = `Selected ${countrySelect.value}`;
            });
        }

        // Mobile validation + preview formatting
        const validateMobileLive = () => {
            if (!mobileInput) return;
            const val = mobileInput.value.trim();
            const cc = countrySelect ? countrySelect.value.trim() : '';
            if (window.authService && typeof window.authService.validateMobileNumber === 'function') {
                const res = window.authService.validateMobileNumber(val, cc);
                setFieldState(mobileInput, !!res.isValid, mobileHelper, res.isValid ? `Format: ${res.e164 || res.formatted || val}` : (res.error || 'Invalid number'));
            } else {
                const plain = val.replace(/\D/g,'');
                const ok = /^[0-9]{7,15}$/.test(plain);
                setFieldState(mobileInput, ok, mobileHelper, ok ? 'Looks valid' : '7-15 digits required');
            }
        };
        if (mobileInput) {
            ['input','blur','change'].forEach(ev => mobileInput.addEventListener(ev, validateMobileLive));
            if (countrySelect) countrySelect.addEventListener('change', validateMobileLive);
        }

        // Password strength
        const scorePassword = (p) => {
            let score = 0;
            if (!p) return 0;
            if (p.length >= 6) score++;
            if (p.length >= 10) score++;
            if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
            if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
            return Math.min(score, 4);
        };
        if (signupPassword) {
            signupPassword.addEventListener('input', () => {
                const s = scorePassword(signupPassword.value);
                const labels = ['Very weak','Weak','Okay','Strong','Very strong'];
                const colors = ['#991b1b','#ef4444','#ca8a04','#16a34a','#065f46'];
                setFieldState(signupPassword, s >= 2, passwordHelper, labels[s]);
                if (passwordHelper) passwordHelper.style.color = colors[s];
                if (passwordStrengthBar) {
                    const widths = ['10%','25%','50%','75%','100%'];
                    passwordStrengthBar.style.width = widths[s];
                    passwordStrengthBar.style.backgroundColor = colors[s];
                }
            });
        }

        // Confirm password match
        const updateConfirm = () => {
            if (!confirmPassword || !signupPassword) return;
            const ok = confirmPassword.value === signupPassword.value && confirmPassword.value.length >= 6;
            setFieldState(confirmPassword, ok, confirmHelper, ok ? 'Passwords match' : 'Passwords do not match');
        };
        if (confirmPassword) {
            ['input','blur'].forEach(ev => confirmPassword.addEventListener(ev, updateConfirm));
            if (signupPassword) signupPassword.addEventListener('input', updateConfirm);
        }

        // CTA disabled until valid
        const signupBtnEl = document.getElementById('signupBtn');
        const agreeTermsEl = document.getElementById('agreeTerms');
        const formIsValid = () => {
            const nameOk = !!document.getElementById('fullName')?.value.trim();
            const userOk = /^[A-Za-z0-9_]{3,}$/.test(usernameInput?.value.trim() || '');
            const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput?.value.trim() || '');
            const licStr = licenceInput?.value.trim() || '';
            const licNum = parseInt(licStr, 10);
            const licenceOk = !isNaN(licNum) && licNum > 0;
            const cc = countrySelect?.value.trim() || '';
            let mobileOk = false;
            const mv = mobileInput?.value.trim() || '';
            if (window.authService && typeof window.authService.validateMobileNumber === 'function') {
                const res = window.authService.validateMobileNumber(mv, cc);
                mobileOk = !!res.isValid;
            } else {
                mobileOk = /^[0-9]{7,15}$/.test((mv || '').replace(/\D/g,''));
            }
            const pwd = signupPassword?.value || '';
            const pwdScore = scorePassword(pwd);
            const pwdOk = pwd.length >= 6 && pwdScore >= 2;
            const confirmOk = confirmPassword?.value === pwd && (confirmPassword?.value.length || 0) >= 6;
            const termsOk = !!agreeTermsEl?.checked;
            return nameOk && userOk && emailOk && licenceOk && mobileOk && pwdOk && confirmOk && termsOk;
        };
        const updateSignupCta = () => {
            if (!signupBtnEl) return;
            const ok = formIsValid();
            signupBtnEl.disabled = !ok;
            signupBtnEl.style.opacity = ok ? '1' : '0.6';
            signupBtnEl.style.cursor = ok ? 'pointer' : 'not-allowed';
        };
        ['input','change','blur'].forEach(ev => {
            emailInput && emailInput.addEventListener(ev, updateSignupCta);
            usernameInput && usernameInput.addEventListener(ev, updateSignupCta);
            licenceInput && licenceInput.addEventListener(ev, updateSignupCta);
            countrySelect && countrySelect.addEventListener(ev, updateSignupCta);
            mobileInput && mobileInput.addEventListener(ev, updateSignupCta);
            signupPassword && signupPassword.addEventListener(ev, updateSignupCta);
            confirmPassword && confirmPassword.addEventListener(ev, updateSignupCta);
            agreeTermsEl && agreeTermsEl.addEventListener(ev, updateSignupCta);
        });
        // Initialize state
        updateSignupCta();

        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fullName = document.getElementById('fullName')?.value.trim();
            const username = document.getElementById('username')?.value.trim();
            const email = document.getElementById('email')?.value.trim();
            const licenceNo = document.getElementById('licenceNo')?.value.trim();
            const countryCode = document.getElementById('countryCode')?.value.trim();
            const mobile = document.getElementById('mobile')?.value.trim();
            const password = document.getElementById('signupPassword')?.value.trim();
            const confirmPassword = document.getElementById('confirmPassword')?.value.trim();
            const agreeTerms = document.getElementById('agreeTerms')?.checked;

            errorMessage.classList.add('hidden');
            successMessage.classList.add('hidden');

            // Validation
            if (!fullName || !username || !email || !licenceNo || !countryCode || !mobile || !password || !confirmPassword) {
                errorMessage.querySelector('span:last-child').textContent = 'Please fill in all required fields';
                errorMessage.classList.remove('hidden');
                return;
            }

            if (!agreeTerms) {
                errorMessage.querySelector('span:last-child').textContent = 'Please agree to the Terms of Service and Privacy Policy';
                errorMessage.classList.remove('hidden');
                return;
            }

            if (password.length < 6) {
                errorMessage.querySelector('span:last-child').textContent = 'Password must be at least 6 characters long';
                errorMessage.classList.remove('hidden');
                return;
            }

            if (password !== confirmPassword) {
                errorMessage.querySelector('span:last-child').textContent = 'Passwords do not match';
                errorMessage.classList.remove('hidden');
                return;
            }

            const licenceNumber = parseInt(licenceNo);
            if (isNaN(licenceNumber) || licenceNumber < 1) {
                errorMessage.querySelector('span:last-child').textContent = 'Please enter a valid licence number';
                errorMessage.classList.remove('hidden');
                return;
            }

            // Validate mobile number using authService
            if (window.authService && typeof window.authService.validateMobileNumber === 'function') {
                const mobileValidation = window.authService.validateMobileNumber(mobile, countryCode);
                if (!mobileValidation.isValid) {
                    errorMessage.querySelector('span:last-child').textContent = `Mobile validation failed: ${mobileValidation.error}`;
                    errorMessage.classList.remove('hidden');
                    return;
                }
            } else {
                // Basic validation if authService not available
                if (!/^[0-9]{7,15}$/.test(mobile.replace(/\D/g, ''))) {
                    errorMessage.querySelector('span:last-child').textContent = 'Please enter a valid mobile number';
                    errorMessage.classList.remove('hidden');
                    return;
                }
            }

            loadingSpinner.classList.remove('hidden');
            signupBtn.disabled = true;
            const signupBtnSpinner = document.getElementById('signupBtnSpinner');
            const signupBtnIcon = document.getElementById('signupBtnIcon');
            const signupBtnText = document.getElementById('signupBtnText');
            if (signupBtnSpinner) signupBtnSpinner.classList.remove('hidden');
            if (signupBtnIcon) signupBtnIcon.classList.add('hidden');
            if (signupBtnText) signupBtnText.textContent = 'Creating...';
            signupBtn.setAttribute('aria-busy', 'true');

            try {
                const response = await fetch(`${window.API_BASE_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username,
                        email,
                        licenceNo: licenceNumber,
                        password,
                        fullName,
                        countryCode,
                        mobile
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Registration failed');
                }

                successMessage.querySelector('span:last-child').textContent = '✅ Registration successful! Sending email OTP...';
                successMessage.classList.remove('hidden');

                // Store credentials for OTP verification
                localStorage.setItem('pendingVerificationUsername', username);
                localStorage.setItem('pendingVerificationEmail', email);
                localStorage.setItem('pendingVerificationLicence', licenceNumber);
                localStorage.setItem('pendingVerificationMobile', mobile);
                localStorage.setItem('pendingVerificationCountryCode', countryCode);

                // Explicitly send email OTP using username
                const emailOtpResponse = await fetch(`${window.API_BASE_URL}/auth/send-email-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username })
                });

                const emailOtpData = await emailOtpResponse.json();
                if (!emailOtpResponse.ok || emailOtpData.success === false) {
                    throw new Error(emailOtpData.message || 'Failed to send email OTP');
                }

                successMessage.querySelector('span:last-child').textContent = '✅ Email OTP sent! Please verify.';

                setTimeout(() => {
                    window.initializeOtpVerification(username);
                }, 1200);

            } catch (error) {
                console.error('Signup error:', error);
                errorMessage.querySelector('span:last-child').textContent = error.message || 'Registration failed';
                errorMessage.classList.remove('hidden');
                // Announce and scroll to error
                errorMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
                errorMessage.focus();
            } finally {
                loadingSpinner.classList.add('hidden');
                signupBtn.disabled = false;
                if (signupBtnSpinner) signupBtnSpinner.classList.add('hidden');
                if (signupBtnIcon) signupBtnIcon.classList.remove('hidden');
                if (signupBtnText) signupBtnText.textContent = 'Create My Account';
                signupBtn.removeAttribute('aria-busy');
            }
        });
    }

    // ============= OTP FORM SETUP =============
    function setupOtpForm(username) {
        const otpForm = document.getElementById('otpForm');
        const otpInputs = document.querySelectorAll('.otp-input');
        const verifyBtn = document.getElementById('verifyBtn');
        const resendBtn = document.getElementById('resendBtn');
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');
        const loadingSpinner = document.getElementById('loadingSpinner');

        let timeLeft = 300; // 5 minutes
        let resendAttempts = 3;
        let canResend = true;
        let resendCooldown = 0;

        // OTP Input handling
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                if (value.length === 1 && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });

            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedData = e.clipboardData.getData('text').slice(0, 6);
                pastedData.split('').forEach((char, i) => {
                    if (i < otpInputs.length && /^\d$/.test(char)) {
                        otpInputs[i].value = char;
                    }
                });
                if (pastedData.length === 6) {
                    otpInputs[5].focus();
                }
            });
        });

        // OTP Timer
        const timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                const mins = Math.floor(timeLeft / 60);
                const secs = timeLeft % 60;
                document.getElementById('otpTimer').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            } else {
                clearInterval(timerInterval);
                document.getElementById('otpTimer').textContent = 'Expired';
                errorMessage.querySelector('span:last-child').textContent = 'OTP has expired. Please request a new one.';
                errorMessage.classList.remove('hidden');
            }
        }, 1000);

        // Resend Cooldown Timer
        const updateResendButton = () => {
            if (resendCooldown > 0) {
                document.getElementById('resendTimer').classList.remove('hidden');
                document.getElementById('resendCountdown').textContent = resendCooldown;
                resendBtn.disabled = true;
            } else {
                document.getElementById('resendTimer').classList.add('hidden');
                resendBtn.disabled = resendAttempts <= 0;
                canResend = resendAttempts > 0;
            }
        };

        const startResendCooldown = () => {
            resendCooldown = 60;
            updateResendButton();
            const cooldownInterval = setInterval(() => {
                resendCooldown--;
                updateResendButton();
                if (resendCooldown <= 0) {
                    clearInterval(cooldownInterval);
                }
            }, 1000);
        };

        // Verify OTP
        otpForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const otp = Array.from(otpInputs).map(input => input.value).join('');

            if (otp.length !== 6) {
                errorMessage.querySelector('span:last-child').textContent = 'Please enter all 6 digits';
                errorMessage.classList.remove('hidden');
                return;
            }

            errorMessage.classList.add('hidden');
            loadingSpinner.classList.remove('hidden');
            verifyBtn.disabled = true;

            try {
                const response = await fetch(`${window.API_BASE_URL}/auth/verify-email-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, otp })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'OTP verification failed');
                }

                clearInterval(timerInterval);
                successMessage.querySelector('span:last-child').textContent = 'Email verified successfully! Verifying mobile...';
                successMessage.classList.remove('hidden');

                // Clear email verification data
                localStorage.removeItem('pendingVerificationEmail');
                localStorage.removeItem('pendingVerificationLicence');

                // Get mobile number for mobile OTP verification (for display)
                const mobile = localStorage.getItem('pendingVerificationMobile');
                const countryCode = localStorage.getItem('pendingVerificationCountryCode') || '+91';
                const fullMobile = mobile && mobile.startsWith('+') ? mobile : `${countryCode}${mobile || ''}`;

                if (!mobile) {
                    errorMessage.querySelector('span:last-child').textContent = 'Mobile number not found. Please try again.';
                    errorMessage.classList.remove('hidden');
                    setTimeout(() => {
                        if (window.router) {
                            window.router.navigate('login');
                        } else {
                            window.location.hash = '#login';
                            window.initializeLogin();
                        }
                    }, 3000);
                    return;
                }

                // Trigger mobile OTP
                setTimeout(async () => {
                    try {
                        const mobileOtpResponse = await fetch(`${window.API_BASE_URL}/sns/send-mobile-otp`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                username: username
                            })
                        });

                        const mobileOtpData = await mobileOtpResponse.json();

                        if (!mobileOtpResponse.ok || !mobileOtpData.success) {
                            throw new Error(mobileOtpData.message || 'Failed to send mobile OTP');
                        }

                        // Initialize mobile OTP verification
                        window.initializeMobileOtpVerification(fullMobile, username);

                    } catch (error) {
                        console.error('Mobile OTP error:', error);
                        errorMessage.querySelector('span:last-child').textContent = error.message || 'Failed to send mobile OTP. Redirecting to login...';
                        errorMessage.classList.remove('hidden');
                        successMessage.classList.add('hidden');

                        setTimeout(() => {
                            if (window.router) {
                                window.router.navigate('login');
                            } else {
                                window.location.hash = '#login';
                                window.initializeLogin();
                            }
                        }, 3000);
                    }
                }, 1500);

            } catch (error) {
                console.error('OTP verification error:', error);
                errorMessage.querySelector('span:last-child').textContent = error.message || 'Verification failed';
                errorMessage.classList.remove('hidden');
                // Clear inputs
                otpInputs.forEach(input => input.value = '');
                otpInputs[0].focus();
            } finally {
                loadingSpinner.classList.add('hidden');
                verifyBtn.disabled = false;
            }
        });

        // Resend OTP
        resendBtn.addEventListener('click', async () => {
            if (!canResend || resendAttempts <= 0 || resendCooldown > 0) return;

            errorMessage.classList.add('hidden');
            resendBtn.disabled = true;

            try {
                const response = await fetch(`${window.API_BASE_URL}/auth/send-email-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Failed to resend OTP');
                }

                resendAttempts--;
                document.getElementById('remainingAttempts').textContent = resendAttempts;

                // Reset timer
                timeLeft = 300;

                // Start cooldown
                startResendCooldown();

                successMessage.querySelector('span:last-child').textContent = '✅ OTP has been resent to your email';
                successMessage.classList.remove('hidden');

                setTimeout(() => successMessage.classList.add('hidden'), 3000);

            } catch (error) {
                console.error('Resend OTP error:', error);
                errorMessage.querySelector('span:last-child').textContent = error.message || 'Failed to resend OTP';
                errorMessage.classList.remove('hidden');
            } finally {
                updateResendButton();
            }
        });

        // Auto-focus first input
        otpInputs[0].focus();
    }

    // ============= MOBILE OTP VERIFICATION INITIALIZATION =============
    window.initializeMobileOtpVerification = (mobile, username) => {
        const pageContent = document.getElementById('page-content');
        const target = pageContent || document.body;
        target.innerHTML = getMobileOtpVerificationTemplate(mobile, username);
        setupMobileOtpForm(mobile, username);
    };

    // ============= MOBILE OTP FORM SETUP =============
    function setupMobileOtpForm(mobile, username) {
        const otpInputs = [
            document.getElementById('mobile-otp-1'),
            document.getElementById('mobile-otp-2'),
            document.getElementById('mobile-otp-3'),
            document.getElementById('mobile-otp-4'),
            document.getElementById('mobile-otp-5'),
            document.getElementById('mobile-otp-6')
        ];

        const verifyBtn = document.getElementById('mobile-verify-otp-btn');
        const verifyText = document.getElementById('mobile-verify-otp-text');
        const resendBtn = document.getElementById('mobile-resend-otp-btn');
        const resendText = document.getElementById('mobile-resend-otp-text');
        const resendCountdown = document.getElementById('mobile-resend-countdown');
        const resendAttempts = document.getElementById('mobile-resend-attempts');
        const timerDisplay = document.getElementById('mobile-otp-timer');
        const successMessage = document.getElementById('mobile-otp-success');
        const errorMessage = document.getElementById('mobile-otp-error');

        let timeLeft = 600; // 10 minutes
        let resendCooldown = 60;
        let attemptsLeft = 3;
        let timerInterval;
        let resendInterval;

        // Format time display
        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        // Start countdown timer
        const startTimer = () => {
            timerInterval = setInterval(() => {
                timeLeft--;
                timerDisplay.textContent = formatTime(timeLeft);

                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    errorMessage.querySelector('span:last-child').textContent = '⏰ OTP expired. Please request a new one.';
                    errorMessage.classList.remove('hidden');
                    verifyBtn.disabled = true;
                    verifyBtn.classList.add('opacity-50', 'cursor-not-allowed');
                }
            }, 1000);
        };

        // Start resend cooldown
        const startResendCooldown = () => {
            resendCooldown = 60;
            resendBtn.disabled = true;
            resendText.innerHTML = `Resend OTP in <span id="mobile-resend-countdown">${resendCooldown}</span>s`;

            resendInterval = setInterval(() => {
                resendCooldown--;
                const countdown = document.getElementById('mobile-resend-countdown');
                if (countdown) {
                    countdown.textContent = resendCooldown;
                }

                if (resendCooldown <= 0) {
                    clearInterval(resendInterval);
                    resendBtn.disabled = false;
                    resendText.textContent = '🔄 Resend OTP';
                }
            }, 1000);
        };

        // Start timer and cooldown
        startTimer();
        startResendCooldown();

        // OTP Input handling
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;

                // Only allow numbers
                if (!/^[0-9]$/.test(value)) {
                    e.target.value = '';
                    return;
                }

                // Move to next input
                if (value && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }

                // Clear error when user starts typing
                errorMessage.classList.add('hidden');
            });

            input.addEventListener('keydown', (e) => {
                // Handle backspace
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });

            // Handle paste
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedData = e.clipboardData.getData('text').trim();

                if (/^[0-9]{6}$/.test(pastedData)) {
                    pastedData.split('').forEach((char, i) => {
                        if (otpInputs[i]) {
                            otpInputs[i].value = char;
                        }
                    });
                    otpInputs[5].focus();
                }
            });
        });

        // Verify OTP
        verifyBtn.addEventListener('click', async () => {
            const otp = otpInputs.map(input => input.value).join('');

            if (otp.length !== 6) {
                errorMessage.querySelector('span:last-child').textContent = '⚠️ Please enter all 6 digits';
                errorMessage.classList.remove('hidden');
                return;
            }

            // Disable button and show loading
            verifyBtn.disabled = true;
            verifyText.textContent = 'Verifying...';
            successMessage.classList.add('hidden');
            errorMessage.classList.add('hidden');

            try {
                const response = await fetch(`${window.API_BASE_URL}/sns/verify-mobile-otp`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username,
                        otp: otp
                    })
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Mobile OTP verification failed');
                }

                clearInterval(timerInterval);
                successMessage.querySelector('span:last-child').textContent = '✅ Mobile verified successfully! Redirecting to login...';
                successMessage.classList.remove('hidden');

                // Clear all pending verification data
                localStorage.removeItem('pendingVerificationMobile');
                localStorage.removeItem('pendingVerificationCountryCode');
                localStorage.removeItem('pendingVerificationUsername');

                setTimeout(() => {
                    if (window.router) {
                        window.router.navigate('login');
                    } else {
                        window.location.hash = '#login';
                        window.initializeLogin();
                    }
                }, 2000);

            } catch (error) {
                console.error('Mobile OTP verification error:', error);
                errorMessage.querySelector('span:last-child').textContent = error.message || '❌ Verification failed. Please try again.';
                errorMessage.classList.remove('hidden');
                verifyBtn.disabled = false;
                verifyText.textContent = 'Verify OTP';

                // Clear inputs
                otpInputs.forEach(input => input.value = '');
                otpInputs[0].focus();
            }
        });

        // Resend OTP
        resendBtn.addEventListener('click', async () => {
            if (attemptsLeft <= 0) {
                errorMessage.querySelector('span:last-child').textContent = '❌ Maximum resend attempts reached';
                errorMessage.classList.remove('hidden');
                return;
            }

            resendBtn.disabled = true;
            successMessage.classList.add('hidden');
            errorMessage.classList.add('hidden');

            try {
                const response = await fetch(`${window.API_BASE_URL}/sns/send-mobile-otp`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username
                    })
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Failed to resend OTP');
                }

                attemptsLeft--;
                resendAttempts.textContent = `${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining`;

                // Clear inputs
                otpInputs.forEach(input => input.value = '');
                otpInputs[0].focus();

                // Reset timer
                timeLeft = 600;

                // Start cooldown
                startResendCooldown();

                successMessage.querySelector('span:last-child').textContent = '✅ OTP has been resent to your mobile';
                successMessage.classList.remove('hidden');

            } catch (error) {
                console.error('Resend OTP error:', error);
                errorMessage.querySelector('span:last-child').textContent = error.message || '❌ Failed to resend OTP';
                errorMessage.classList.remove('hidden');
                resendBtn.disabled = false;
            }
        });

        // Auto-focus first input
        otpInputs[0].focus();
    }

})();
