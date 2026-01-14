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
                    Talli<span class="text-transparent bg-clip-text bg-gradient-to-r" style="background: linear-gradient(to right, var(--primary-600), var(--primary-500));">ffy</span>
                </h1>
                <p class="text-sm" style="color: var(--text-tertiary);">Enterprise Resource Planning</p>
            </div>

            <div class="rounded-3xl p-8 shadow-2xl" style="background: var(--card-bg); border: 1px solid var(--card-border);">
                <div class="mb-6">
                    <h2 class="text-2xl font-bold mb-1" style="color: var(--text-primary);">Welcome Back</h2>
                    <p class="text-xs" style="color: var(--text-tertiary);">Sign in to continue to your account</p>
                </div>

                <!-- Login Mode Toggle -->
                <div class="mb-6 flex gap-4 p-2 rounded-xl" style="background: var(--bg-tertiary);">
                    <label class="flex-1 flex items-center justify-center gap-2 cursor-pointer">
                        <input type="radio" name="loginMode" value="username" id="loginModeUsername" checked class="w-4 h-4" style="accent-color: var(--primary-600);">
                        <span class="text-sm font-medium" style="color: var(--text-secondary);">Username</span>
                    </label>
                    <label class="flex-1 flex items-center justify-center gap-2 cursor-pointer">
                        <input type="radio" name="loginMode" value="email" id="loginModeEmail" class="w-4 h-4" style="accent-color: var(--primary-600);">
                        <span class="text-sm font-medium" style="color: var(--text-secondary);">Email + Licence</span>
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
                                <input type="text" id="username" class="w-full pr-4 py-3 rounded-xl border-2 transition-all text-sm font-medium" style="padding-left: calc(2.75rem + 5px); border-color: var(--border-primary); background: var(--input-bg); color: var(--input-text); placeholder-color: var(--input-placeholder);" placeholder="Enter your username">
                                <style>
                                    #username:focus {
                                        border-color: var(--border-focus);
                                        box-shadow: 0 0 0 3px rgba(94, 134, 186, 0.1);
                                        outline: none;
                                    }
                                </style>
                            </div>
                        </div>
                    </div>

                    <!-- Email + Licence Mode Fields -->
                    <div id="emailFields" class="hidden space-y-4">
                        <div>
                            <label class="block text-xs font-bold mb-2" style="color: var(--text-primary);">Email Address</label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg">📧</span>
                                </div>
                                <input type="email" id="loginEmail" class="w-full pr-4 py-3 rounded-xl border-2 transition-all text-sm font-medium" style="padding-left: calc(2.75rem + 5px); border-color: var(--border-primary); background: var(--input-bg); color: var(--input-text);" placeholder="john@example.com">
                                <style>
                                    #loginEmail:focus {
                                        border-color: var(--border-focus);
                                        box-shadow: 0 0 0 3px rgba(94, 134, 186, 0.1);
                                        outline: none;
                                    }
                                </style>
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-bold mb-2" style="color: var(--text-primary);">Licence Number</label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg">🔑</span>
                                </div>
                                <input type="number" id="loginLicenceNo" class="w-full pr-4 py-3 rounded-xl border-2 transition-all text-sm font-medium" style="padding-left: calc(2.75rem + 5px); border-color: var(--border-primary); background: var(--input-bg); color: var(--input-text);" placeholder="1001" min="1">
                                <style>
                                    #loginLicenceNo:focus {
                                        border-color: var(--border-focus);
                                        box-shadow: 0 0 0 3px rgba(94, 134, 186, 0.1);
                                        outline: none;
                                    }
                                </style>
                            </div>
                        </div>
                    </div>

                    <!-- Password Field (Common) -->
                    <div>
                        <label class="block text-xs font-bold mb-2" style="color: var(--text-primary);">Password</label>
                        <div class="relative group">
                            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span class="text-lg">🔐</span>
                            </div>
                            <input type="password" id="password" class="w-full pr-4 py-3 rounded-xl border-2 transition-all text-sm font-medium" style="padding-left: calc(2.75rem + 5px); border-color: var(--border-primary); background: var(--input-bg); color: var(--input-text);" placeholder="Enter your password" required>
                            <style>
                                #password:focus {
                                    border-color: var(--border-focus);
                                    box-shadow: 0 0 0 3px rgba(94, 134, 186, 0.1);
                                    outline: none;
                                }
                            </style>
                        </div>
                    </div>

                    <div class="flex items-center justify-between pt-2">
                        <label class="flex items-center gap-2.5 cursor-pointer group">
                            <input type="checkbox" id="rememberMe" class="w-5 h-5 rounded-lg border-2 cursor-pointer" style="border-color: var(--border-primary); accent-color: var(--primary-600);">
                            <span class="text-sm font-medium group-hover:opacity-80" style="color: var(--text-secondary);">Remember me</span>
                        </label>
                        <a href="#" class="text-sm font-bold hover:underline" style="color: var(--primary-600);">Forgot password?</a>
                    </div>

                    <div id="loadingSpinner" class="hidden text-center py-4">
                        <div class="inline-block">
                            <div class="animate-spin rounded-full h-10 w-10 border-4" style="border-color: rgba(94, 134, 186, 0.2); border-top-color: var(--primary-600);"></div>
                        </div>
                    </div>

                    <button type="submit" id="loginBtn" class="w-full font-bold py-3 rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 text-sm mt-6" style="background: var(--primary-600); color: white; border: none; cursor: pointer;">
                        <span class="text-lg">🚀</span>
                        <span>Sign In to Dashboard</span>
                    </button>
                    <style>
                        #loginBtn:hover {
                            background: var(--primary-700);
                        }
                        #loginBtn:disabled {
                            opacity: 0.5;
                            cursor: not-allowed;
                        }
                    </style>
                </form>

                <div class="mt-6 pt-5" style="border-top: 1px solid var(--border-primary);">
                    <p class="text-center text-xs" style="color: var(--text-tertiary);">
                        Don't have an account?
                        <a href="#" id="showSignup" class="font-bold hover:underline ml-1" style="color: var(--primary-600);" data-route="signup">Create Account</a>
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
    const getOtpVerificationTemplate = (email, licenceNo) => `
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
                    <p class="text-sm font-medium" style="color: var(--text-secondary);">${email}</p>
                    <p class="text-xs" style="color: var(--text-tertiary);">Licence Number: ${licenceNo}</p>
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
                            <input type="text" maxlength="1" class="otp-input w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all" style="border-color: var(--border-primary); background: var(--input-bg); color: var(--input-text);" data-index="0">
                            <input type="text" maxlength="1" class="otp-input w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all" style="border-color: var(--border-primary); background: var(--input-bg); color: var(--input-text);" data-index="1">
                            <input type="text" maxlength="1" class="otp-input w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all" style="border-color: var(--border-primary); background: var(--input-bg); color: var(--input-text);" data-index="2">
                            <input type="text" maxlength="1" class="otp-input w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all" style="border-color: var(--border-primary); background: var(--input-bg); color: var(--input-text);" data-index="3">
                            <input type="text" maxlength="1" class="otp-input w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all" style="border-color: var(--border-primary); background: var(--input-bg); color: var(--input-text);" data-index="4">
                            <input type="text" maxlength="1" class="otp-input w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all" style="border-color: var(--border-primary); background: var(--input-bg); color: var(--input-text);" data-index="5">
                        </div>
                        <style>
                            .otp-input:focus {
                                border-color: var(--border-focus) !important;
                                box-shadow: 0 0 0 3px rgba(94, 134, 186, 0.1);
                                outline: none;
                            }
                        </style>
                    </div>

                    <div class="text-center">
                        <p class="text-sm font-medium" style="color: var(--text-secondary);">
                            ⏱ Code expires in: <span id="otpTimer" class="font-bold" style="color: var(--primary-600);">5:00</span>
                        </p>
                    </div>

                    <div id="loadingSpinner" class="hidden text-center py-4">
                        <div class="inline-block">
                            <div class="animate-spin rounded-full h-10 w-10 border-4" style="border-color: rgba(94, 134, 186, 0.2); border-top-color: var(--primary-600);"></div>
                        </div>
                    </div>

                    <button type="submit" id="verifyBtn" class="w-full font-bold py-3 rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 text-sm" style="background: var(--primary-600); color: white; border: none; cursor: pointer;">
                        <span class="text-lg">✅</span>
                        <span>Verify OTP</span>
                    </button>
                    <style>
                        #verifyBtn:hover {
                            background: var(--primary-700);
                        }
                        #verifyBtn:disabled {
                            opacity: 0.5;
                            cursor: not-allowed;
                        }
                    </style>
                </form>

                <div class="mt-6 pt-5" style="border-top: 1px solid var(--border-primary);">
                    <p class="text-xs mb-3" style="color: var(--text-secondary);">Didn't receive the code?</p>
                    <button id="resendBtn" class="text-sm font-bold hover:underline disabled:opacity-50 disabled:cursor-not-allowed" style="color: var(--primary-600); background: none; border: none; cursor: pointer;">
                        Resend OTP (<span id="remainingAttempts">3</span> attempts remaining)
                    </button>
                    <p id="resendTimer" class="text-xs mt-2 hidden" style="color: var(--text-tertiary);">Wait <span id="resendCountdown">60</span>s to resend</p>
                </div>

                <div class="mt-4 text-center">
                    <a href="#" id="backToLogin" class="text-sm font-medium hover:opacity-80" style="color: var(--text-secondary);">← Back to Login</a>
                </div>
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
                                <input type="text" id="fullName" class="w-full pr-4 py-2 rounded-xl border-2 transition-all text-sm font-medium" style="padding-left: calc(2.75rem + 5px); border-color: var(--border-primary); background: var(--input-bg); color: var(--input-text);" placeholder="John Doe" required>
                                <style>
                                    #fullName:focus {
                                        border-color: var(--border-focus);
                                        box-shadow: 0 0 0 3px rgba(94, 134, 186, 0.1);
                                        outline: none;
                                    }
                                </style>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold mb-2" style="color: var(--text-primary);">Username <span class="text-red-500">*</span></label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg" style="color: var(--primary-600);">@</span>
                                </div>
                                <input type="text" id="signup-username" class="w-full pr-4 py-2 rounded-xl border-2 transition-all text-sm font-medium" style="padding-left: calc(2.75rem + 5px); border-color: var(--border-primary); background: var(--input-bg); color: var(--input-text);" placeholder="john_company_a" required>
                                <style>
                                    #signup-username:focus {
                                        border-color: var(--border-focus);
                                        box-shadow: 0 0 0 3px rgba(94, 134, 186, 0.1);
                                        outline: none;
                                    }
                                </style>
                            </div>
                            <p class="text-xs mt-1" style="color: var(--text-tertiary);">Unique username for login</p>
                        </div>

                        <div>
                            <label class="block text-xs font-bold mb-2" style="color: var(--text-primary);">Email Address <span class="text-red-500">*</span></label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg">📧</span>
                                </div>
                                <input type="email" id="signup-email" class="w-full pr-4 py-2 rounded-xl border-2 transition-all text-sm font-medium" style="padding-left: calc(2.75rem + 5px); border-color: var(--border-primary); background: var(--input-bg); color: var(--input-text);" placeholder="john@example.com" required>
                                <style>
                                    #signup-email:focus {
                                        border-color: var(--border-focus);
                                        box-shadow: 0 0 0 3px rgba(94, 134, 186, 0.1);
                                        outline: none;
                                    }
                                </style>
                            </div>
                            <p class="text-xs mt-1" style="color: var(--text-tertiary);">Can be used for multiple companies</p>
                        </div>

                        <div>
                            <label class="block text-xs font-bold mb-2" style="color: var(--text-primary);">Licence Number <span class="text-red-500">*</span></label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg">🔑</span>
                                </div>
                                <input type="number" id="signup-licenceNo" class="w-full pr-4 py-2 rounded-xl border-2 transition-all text-sm font-medium" style="padding-left: calc(2.75rem + 5px); border-color: var(--border-primary); background: var(--input-bg); color: var(--input-text);" placeholder="1001" required min="1">
                                <style>
                                    #signup-licenceNo:focus {
                                        border-color: var(--border-focus);
                                        box-shadow: 0 0 0 3px rgba(94, 134, 186, 0.1);
                                        outline: none;
                                    }
                                </style>
                            </div>
                            <p class="text-xs mt-1" style="color: var(--text-tertiary);">Your company's licence number</p>
                        </div>

                        <div>
                            <label class="block text-xs font-bold mb-2" style="color: var(--text-primary);">Country Code <span class="text-red-500">*</span></label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                                    <span class="text-lg">🌍</span>
                                </div>
                                <select id="signup-countryCode" class="w-full pr-4 py-2 rounded-xl border-2 transition-all text-sm font-medium appearance-none" style="padding-left: calc(2.75rem + 5px); border-color: var(--border-primary); background: var(--input-bg); color: var(--input-text);" required>
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
                                    #signup-countryCode {
                                        appearance: none;
                                        padding-right: 2.5rem;
                                        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
                                        background-repeat: no-repeat;
                                        background-position: right 0.75rem center;
                                        padding-right: 2rem;
                                    }
                                    #signup-countryCode:focus {
                                        border-color: var(--border-focus);
                                        box-shadow: 0 0 0 3px rgba(94, 134, 186, 0.1);
                                        outline: none;
                                    }
                                </style>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold mb-2" style="color: var(--text-primary);">Mobile Number <span class="text-red-500">*</span></label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg">📱</span>
                                </div>
                                <input type="tel" id="signup-mobile" class="w-full pr-4 py-2 rounded-xl border-2 transition-all text-sm font-medium" style="padding-left: calc(2.75rem + 5px); border-color: var(--border-primary); background: var(--input-bg); color: var(--input-text);" placeholder="0987654321" required pattern="[0-9]{7,15}">
                                <style>
                                    #signup-mobile:focus {
                                        border-color: var(--border-focus);
                                        box-shadow: 0 0 0 3px rgba(94, 134, 186, 0.1);
                                        outline: none;
                                    }
                                </style>
                            </div>
                            <p class="text-xs mt-1" style="color: var(--text-tertiary);">Mobile number for OTP verification</p>
                        </div>

                        <div>
                            <label class="block text-xs font-bold mb-2" style="color: var(--text-primary);">Password <span class="text-red-500">*</span></label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg">🔐</span>
                                </div>
                                <input type="password" id="signup-password" class="w-full pr-4 py-2 rounded-xl border-2 transition-all text-sm font-medium" style="padding-left: calc(2.75rem + 5px); border-color: var(--border-primary); background: var(--input-bg); color: var(--input-text);" placeholder="Min 6 characters" required minlength="6">
                                <style>
                                    #signup-password:focus {
                                        border-color: var(--border-focus);
                                        box-shadow: 0 0 0 3px rgba(94, 134, 186, 0.1);
                                        outline: none;
                                    }
                                </style>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold mb-2" style="color: var(--text-primary);">Confirm Password <span class="text-red-500">*</span></label>
                            <div class="relative group">
                                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span class="text-lg">🔐</span>
                                </div>
                                <input type="password" id="signup-confirmPassword" class="w-full pr-4 py-2 rounded-xl border-2 transition-all text-sm font-medium" style="padding-left: calc(2.75rem + 5px); border-color: var(--border-primary); background: var(--input-bg); color: var(--input-text);" placeholder="Re-enter password" required minlength="6">
                                <style>
                                    #signup-confirmPassword:focus {
                                        border-color: var(--border-focus);
                                        box-shadow: 0 0 0 3px rgba(94, 134, 186, 0.1);
                                        outline: none;
                                    }
                                </style>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-start gap-3 p-4 rounded-xl border-2" style="background: var(--bg-tertiary); border-color: var(--border-primary);">
                        <input type="checkbox" id="agreeTerms" class="w-4 h-4 mt-0.5 rounded border-2 cursor-pointer" style="border-color: var(--border-primary); accent-color: var(--primary-600);" required>
                        <label for="agreeTerms" class="text-xs font-medium cursor-pointer" style="color: var(--text-primary);">
                            I agree to the <a href="#" class="font-bold hover:underline" style="color: var(--primary-600);">Terms of Service</a> and <a href="#" class="font-bold hover:underline" style="color: var(--primary-600);">Privacy Policy</a>
                        </label>
                    </div>

                    <div id="loadingSpinner" class="hidden text-center py-3">
                        <div class="inline-block">
                            <div class="animate-spin rounded-full h-8 w-8 border-4" style="border-color: rgba(94, 134, 186, 0.2); border-top-color: var(--primary-600);"></div>
                        </div>
                    </div>

                    <button type="submit" id="signupBtn" class="w-full font-bold py-3 rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 text-sm mt-6" style="background: var(--primary-600); color: white; border: none; cursor: pointer;">
                        <span class="text-lg">✨</span>
                        <span>Create My Account</span>
                    </button>
                    <style>
                        #signupBtn:hover {
                            background: var(--primary-700);
                        }
                        #signupBtn:disabled {
                            opacity: 0.5;
                            cursor: not-allowed;
                        }
                    </style>
                </form>

                <div class="mt-6 pt-5" style="border-top: 1px solid var(--border-primary);">
                    <p class="text-center text-xs" style="color: var(--text-secondary);">
                        Already have an account?
                        <a href="#" id="showLogin" class="font-bold hover:underline ml-1" style="color: var(--primary-600);" data-route="login">Sign In</a>
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
        console.log('🔐 Initializing Auth Page...');
        const currentHash = window.location.hash.replace('#', '') || 'login';
        console.log('📍 Current route:', currentHash);
        
        if (currentHash === 'signup') {
            window.initializeSignup();
        } else if (currentHash === 'verify-otp') {
            const email = localStorage.getItem('pendingVerificationEmail');
            const licenceNo = localStorage.getItem('pendingVerificationLicence');
            if (email && licenceNo) {
                window.initializeOtpVerification(email, licenceNo);
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
            }
        });
    };

    window.initializeSignup = function () {
        console.log('📝 Initializing Signup Page...');
        const pageContent = document.getElementById('page-content');
        const target = pageContent || document.body;
        target.innerHTML = getSignupTemplate();
        
        // Verify fields are in DOM
        setTimeout(() => {
            const countryCodeField = document.getElementById('signup-countryCode');
            const mobileField = document.getElementById('signup-mobile');
            
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

    window.initializeOtpVerification = function (email, licenceNo) {
        console.log('Initializing OTP Verification...');
        const pageContent = document.getElementById('page-content');
        const target = pageContent || document.body;
        target.innerHTML = getOtpVerificationTemplate(email, licenceNo);
        setupOtpForm(email, licenceNo);

        // Handle back to login
        const backToLogin = document.getElementById('backToLogin');
        if (backToLogin) {
            backToLogin.addEventListener('click', (e) => {
                e.preventDefault();
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

                // Handle 403 - Email not verified
                if (response.status === 403) {
                    errorMessage.querySelector('span:last-child').textContent = result.message || 'Email not verified. Redirecting to OTP verification...';
                    errorMessage.classList.remove('hidden');
                    
                    // Store credentials and redirect to OTP verification
                    localStorage.setItem('pendingVerificationEmail', result.email);
                    localStorage.setItem('pendingVerificationLicence', result.licenceNo);
                    
                    setTimeout(() => {
                        window.initializeOtpVerification(result.email, result.licenceNo);
                    }, 2000);
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

                // Success - Store credentials
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('deviceToken', data.deviceToken);
                localStorage.setItem('currentUser', JSON.stringify({
                    username: data.username,
                    userId: data.userId,
                    fullName: data.fullName,
                    email: data.email,
                    licenceNo: data.licenceNo,
                    role: data.role
                }));
                localStorage.setItem('isAuthenticated', 'true');
                
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

        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fullName = document.getElementById('fullName')?.value.trim();
            const username = document.getElementById('signup-username')?.value.trim();
            const email = document.getElementById('signup-email')?.value.trim();
            const licenceNo = document.getElementById('signup-licenceNo')?.value.trim();
            const countryCode = document.getElementById('signup-countryCode')?.value.trim();
            const mobile = document.getElementById('signup-mobile')?.value.trim();
            const password = document.getElementById('signup-password')?.value.trim();
            const confirmPassword = document.getElementById('signup-confirmPassword')?.value.trim();
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

                successMessage.querySelector('span:last-child').textContent = '✅ Registration successful! Please check your email for OTP verification code.';
                successMessage.classList.remove('hidden');

                // Store credentials for OTP verification
                localStorage.setItem('pendingVerificationEmail', email);
                localStorage.setItem('pendingVerificationLicence', licenceNumber);
                localStorage.setItem('pendingVerificationMobile', mobile);
                localStorage.setItem('pendingVerificationCountryCode', countryCode);

                setTimeout(() => {
                    window.initializeOtpVerification(email, licenceNumber);
                }, 2000);

            } catch (error) {
                console.error('Signup error:', error);
                errorMessage.querySelector('span:last-child').textContent = error.message || 'Registration failed';
                errorMessage.classList.remove('hidden');
            } finally {
                loadingSpinner.classList.add('hidden');
                signupBtn.disabled = false;
            }
        });
    }

    // ============= OTP FORM SETUP =============
    function setupOtpForm(email, licenceNo) {
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
                const response = await fetch(`${window.API_BASE_URL}/auth/verify-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, licenceNo: parseInt(licenceNo), otp })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'OTP verification failed');
                }

                clearInterval(timerInterval);
                successMessage.querySelector('span:last-child').textContent = '✅ Email verified successfully! Redirecting to login...';
                successMessage.classList.remove('hidden');

                // Clear pending verification
                localStorage.removeItem('pendingVerificationEmail');
                localStorage.removeItem('pendingVerificationLicence');

                setTimeout(() => {
                    if (window.router) {
                        window.router.navigate('login');
                    } else {
                        window.location.hash = '#login';
                        window.initializeLogin();
                    }
                }, 2000);

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
                const response = await fetch(`${window.API_BASE_URL}/auth/resend-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, licenceNo: parseInt(licenceNo) })
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

})();
