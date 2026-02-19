(function () {
    // API Base URL
    if (typeof window.API_BASE_URL === 'undefined') {
        window.API_BASE_URL = window.AppConfig?.API_BASE_URL || window.apiConfig?.baseURL;
    }

    function getStore() {
        return window.store || (window.reduxStore && window.reduxStore.getState ? window.reduxStore : null);
    }

    // ============= PASSWORD HASHING FOR REMEMBER ME =============
    async function hashPassword(password) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        } catch (error) {
            console.error('Hash error:', error);
            return null;
        }
    }

    async function verifyHashedPassword(inputPassword, storedHash) {
        const inputHash = await hashPassword(inputPassword);
        return inputHash === storedHash;
    }

    // ============= PASSWORD ENCRYPTION FOR AUTO-FILL =============
    function getDeviceKey() {
        // Generate or retrieve device-specific encryption key
        let key = localStorage.getItem('deviceEncryptionKey');
        if (!key) {
            key = Array.from(crypto.getRandomValues(new Uint8Array(32)))
                .map(b => b.toString(16).padStart(2, '0')).join('');
            localStorage.setItem('deviceEncryptionKey', key);
        }
        return key;
    }

    function encryptPassword(password) {
        try {
            const key = getDeviceKey();
            let encrypted = '';
            for (let i = 0; i < password.length; i++) {
                const keyChar = key.charCodeAt(i % key.length);
                const pwdChar = password.charCodeAt(i);
                encrypted += String.fromCharCode(pwdChar ^ keyChar);
            }
            return btoa(encrypted); // Base64 encode
        } catch (error) {
            console.error('Encryption error:', error);
            return null;
        }
    }

    function decryptPassword(encryptedPassword) {
        try {
            const key = getDeviceKey();
            const encrypted = atob(encryptedPassword); // Base64 decode
            let decrypted = '';
            for (let i = 0; i < encrypted.length; i++) {
                const keyChar = key.charCodeAt(i % key.length);
                const encChar = encrypted.charCodeAt(i);
                decrypted += String.fromCharCode(encChar ^ keyChar);
            }
            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }

    // ============= REAL-TIME FORM VALIDATION UTILITY =============
    const FormValidator = {
        // Validation rules
        rules: {
            required: (v) => (v && v.trim().length > 0) ? null : 'This field is required',
            email: (v) => {
                if (!v || !v.trim()) return 'Email is required';
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : 'Please enter a valid email address';
            },
            username: (v) => {
                if (!v || !v.trim()) return 'Username is required';
                if (v.trim().length < 3) return 'Username must be at least 3 characters';
                return /^[a-zA-Z0-9_]+$/.test(v.trim()) ? null : 'Only letters, numbers and underscores allowed';
            },
            password: (v) => {
                if (!v) return 'Password is required';
                if (v.length < 6) return 'Password must be at least 6 characters';
                return null;
            },
            passwordStrength: (v) => {
                if (!v) return 'weak';
                if (v.length >= 8 && /[A-Z]/.test(v) && /[0-9]/.test(v) && /[^A-Za-z0-9]/.test(v)) return 'strong';
                if (v.length >= 6 && (/[A-Z]/.test(v) || /[0-9]/.test(v))) return 'medium';
                return 'weak';
            },
            confirmPassword: (v, password) => {
                if (!v) return 'Please confirm your password';
                return v === password ? null : 'Passwords do not match';
            },
            mobile: (v) => {
                if (!v || !v.trim()) return 'Mobile number is required';
                const digits = v.replace(/\D/g, '');
                return digits.length >= 7 && digits.length <= 15 ? null : 'Enter a valid mobile number (7-15 digits)';
            },
            fullName: (v) => {
                if (!v || !v.trim()) return 'Full name is required';
                return v.trim().length >= 2 ? null : 'Name must be at least 2 characters';
            },
            licenceNo: (v) => {
                if (!v || !v.trim()) return 'Licence number is required';
                return /^\d+$/.test(v.trim()) ? null : 'Enter a valid licence number';
            }
        },

        /**
         * Show validation feedback on an input field
         */
        showFeedback(input, errorMsg) {
            // Remove existing feedback
            this.clearFeedback(input);

            if (errorMsg) {
                // Error state
                input.style.borderColor = 'var(--ds-danger-500)';
                input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
                const errEl = document.createElement('div');
                errEl.className = 'field-validation-msg';
                errEl.style.cssText = 'color:var(--ds-danger-600);font-size:var(--ds-text-xs);margin-top:0.25rem;display:flex;align-items:center;gap:0.2rem;padding-left:0.25rem;';
                errEl.innerHTML = `<i class="fas fa-exclamation-triangle" style="font-size:0.65rem;"></i> ${errorMsg}`;
                input.parentElement.appendChild(errEl);
            } else {
                // Success state
                input.style.borderColor = 'var(--ds-success-500)';
                input.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
            }
        },

        /**
         * Clear validation feedback from an input
         */
        clearFeedback(input) {
            input.style.borderColor = '';
            input.style.boxShadow = '';
            const existing = input.parentElement.querySelector('.field-validation-msg');
            if (existing) existing.remove();
        },

        /**
         * Show/update password strength bar
         */
        showPasswordStrength(input, strength) {
            let container = input.parentElement.querySelector('.password-strength');
            if (!container) {
                container = document.createElement('div');
                container.className = 'password-strength';
                container.style.cssText = 'height:4px;border-radius:2px;margin-top:0.35rem;background:#E5E7EB;overflow:hidden;';
                const bar = document.createElement('div');
                bar.className = 'password-strength-bar';
                bar.style.cssText = 'height:100%;border-radius:2px;transition:width 0.3s ease,background 0.3s ease;';
                container.appendChild(bar);
                input.parentElement.appendChild(container);
            }
            const bar = container.querySelector('.password-strength-bar');
            if (strength === 'strong') { bar.style.width = '100%'; bar.style.background = '#10B981'; }
            else if (strength === 'medium') { bar.style.width = '66%'; bar.style.background = '#F59E0B'; }
            else { bar.style.width = '33%'; bar.style.background = '#EF4444'; }
        },

        /**
         * Attach real-time validation to an input element
         * @param {string} inputId - DOM element id
         * @param {string} ruleName - key in FormValidator.rules
         * @param {Function} [extraArgFn] - optional fn returning extra arg (e.g. password value for confirm)
         */
        attach(inputId, ruleName, extraArgFn) {
            const input = document.getElementById(inputId);
            if (!input) return;

            const validate = () => {
                const value = input.value;
                // Don't validate empty on first focus (only after user starts typing)
                if (!value && !input.dataset.touched) return;
                input.dataset.touched = 'true';

                if (ruleName === 'passwordStrength') {
                    // Special: password strength feedback
                    const strength = this.rules.passwordStrength(value);
                    const error = this.rules.password(value);
                    this.showFeedback(input, error);
                    if (value) this.showPasswordStrength(input, strength);
                } else {
                    const extra = extraArgFn ? extraArgFn() : undefined;
                    const error = this.rules[ruleName](value, extra);
                    this.showFeedback(input, error);
                }
            };

            input.addEventListener('input', validate);
            input.addEventListener('blur', () => {
                input.dataset.touched = 'true';
                validate();
            });
            // Clear feedback when user focuses back in (unless already touched)
            input.addEventListener('focus', () => {
                if (!input.dataset.touched) {
                    this.clearFeedback(input);
                }
            });
        }
    };

    // ============= DUAL-MODE LOGIN TEMPLATE =============
    const getLoginTemplate = () => `
    <div class="auth-background" style="display: flex; min-height: 100vh; background: var(--ds-bg-app);">
        <!-- Left Side - Enhanced Branding Panel -->
        <div style="display: flex; flex-direction: column; justify-content: center; items-center; padding: var(--ds-space-12); position: relative; overflow: hidden; background: linear-gradient(135deg, var(--ds-primary-900) 0%, var(--ds-primary-800) 50%, var(--ds-primary-700) 100%); width: 50%;">
            <!-- Particles Canvas -->
            <canvas id="particlesCanvas" style="position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1;"></canvas>
            
            <div style="position: relative; z-index: 10; text-align: center; max-width: 440px; margin: 0 auto;">
                <!-- Logo with Hover Effect -->
                <div style="margin-bottom: var(--ds-space-8);">
                    <div style="width: 88px; height: 88px; border-radius: var(--ds-radius-2xl); background: linear-gradient(135deg, var(--ds-primary-400), var(--ds-primary-600)); margin: 0 auto; font-size: 44px; display: flex; align-items: center; justify-content: center; box-shadow: var(--ds-shadow-xl); color: white;">
                        <i class="fas fa-chart-bar"></i>
                    </div>
                </div>
                
                <!-- Brand Name -->
                <h1 style="font-size: var(--ds-text-5xl); font-weight: var(--ds-weight-bold); color: white; margin-bottom: var(--ds-space-2);">
                    Talli<span style="color: var(--ds-primary-300);">ffy</span>
                </h1>
                
                <p style="font-size: var(--ds-text-xl); font-weight: var(--ds-weight-semibold); color: white; margin-bottom: var(--ds-space-2);">
                    Tally Prime <i class="fas fa-bolt" style="color: #fbbf24;"></i> Cloud Platform
                </p>
                <p style="font-size: var(--ds-text-sm); color: var(--ds-primary-100); margin-bottom: var(--ds-space-10); opacity: 0.8;">
                    Sync Automatically • Access Anywhere • Real-time Updates
                </p>

                <!-- Feature Highlights -->
                <div style="display: flex; flex-direction: column; gap: var(--ds-space-4); text-align: left;">
                    <div class="feature-card" style="display: flex; align-items: center; gap: var(--ds-space-4); padding: var(--ds-space-4); border-radius: var(--ds-radius-2xl); background: rgba(255, 255, 255, 0.08); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1);">
                        <div style="width: 52px; height: 52px; border-radius: var(--ds-radius-xl); flex-shrink: 0; background: linear-gradient(135deg, var(--ds-primary-300) 0%, var(--ds-primary-600) 100%); display: flex; align-items: center; justify-content: center; font-size: var(--ds-text-2xl); color: white;">
                            <i class="fas fa-sync-alt"></i>
                        </div>
                        <div>
                            <h3 style="font-size: var(--ds-text-base); font-weight: var(--ds-weight-bold); color: white; margin: 0;">Auto Sync with Tally</h3>
                            <p style="font-size: var(--ds-text-xs); color: var(--ds-primary-100); margin: var(--ds-space-0-5) 0 0 0;">Seamless real-time data synchronization</p>
                        </div>
                    </div>
                    <div class="feature-card" style="display: flex; align-items: center; gap: var(--ds-space-4); padding: var(--ds-space-4); border-radius: var(--ds-radius-2xl); background: rgba(255, 255, 255, 0.08); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1);">
                        <div style="width: 52px; height: 52px; border-radius: var(--ds-radius-xl); flex-shrink: 0; background: linear-gradient(135deg, var(--ds-primary-300) 0%, var(--ds-primary-600) 100%); display: flex; align-items: center; justify-content: center; font-size: var(--ds-text-2xl); color: white;">
                            <i class="fas fa-lock"></i>
                        </div>
                        <div>
                            <h3 style="font-size: var(--ds-text-base); font-weight: var(--ds-weight-bold); color: white; margin: 0;">Enterprise Security</h3>
                            <p style="font-size: var(--ds-text-xs); color: var(--ds-primary-100); margin: var(--ds-space-0-5) 0 0 0;">Bank-grade encryption & data protection</p>
                        </div>
                    </div>
                </div>

                <div style="margin-top: var(--ds-space-12); font-size: var(--ds-text-xs); color: var(--ds-primary-200); opacity: 0.6;">
                    © 2026 Talliffy. All rights reserved.
                </div>
            </div>
        </div>

        <!-- Right Side - Auth Forms -->
        <div style="display: flex; align-items: center; justify-content: center; padding: var(--ds-space-8); width: 50%; background: var(--ds-bg-app);">
            <div style="width: 100%; max-width: 420px;">
                <!-- Auth Card -->
                <div style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-3xl); border: 1px solid var(--ds-border-default); padding: var(--ds-space-10); box-shadow: var(--ds-shadow-xl);">
                    <!-- Tab Switcher -->
                    <div style="display: flex; margin-bottom: var(--ds-space-8); padding: var(--ds-space-1); background: var(--ds-bg-surface-sunken); border-radius: var(--ds-radius-2xl); border: 1px solid var(--ds-border-default);">
                        <button id="signinTab" class="ds-tab-btn" style="flex: 1; padding: var(--ds-space-3); font-size: var(--ds-text-sm); font-weight: var(--ds-weight-bold); border: none; background: transparent; color: var(--ds-text-secondary); cursor: pointer; transition: all var(--ds-duration-base) var(--ds-ease); border-radius: var(--ds-radius-xl);">
                            Sign In
                        </button>
                        <button id="signupTab" class="ds-tab-btn" style="flex: 1; padding: var(--ds-space-3); font-size: var(--ds-text-sm); font-weight: var(--ds-weight-bold); border: none; background: transparent; color: var(--ds-text-secondary); cursor: pointer; transition: all var(--ds-duration-base) var(--ds-ease); border-radius: var(--ds-radius-xl);">
                            Sign Up
                        </button>
                    </div>

                    <!-- Sign In Form -->
                    <div id="signinForm">
                        <div style="margin-bottom: var(--ds-space-6);">
                            <h2 style="font-size: var(--ds-text-2xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin: 0;">Welcome Back!</h2>
                            <p style="font-size: var(--ds-text-sm); color: var(--ds-text-tertiary); margin: var(--ds-space-1) 0 0 0;">Sign in to continue your session</p>
                        </div>

                        <!-- Login Mode Toggle -->
                        <div style="margin-bottom: var(--ds-space-6); display: flex; gap: var(--ds-space-1); padding: var(--ds-space-1); background: var(--ds-bg-app); border-radius: var(--ds-radius-xl);">
                            <label style="flex: 1; cursor: pointer;">
                                <input type="radio" name="loginMode" value="username" id="loginModeUsername" checked style="display: none;">
                                <div class="login-mode-btn" style="text-align: center; padding: var(--ds-space-2-5); font-size: var(--ds-text-xs); font-weight: var(--ds-weight-bold); border-radius: var(--ds-radius-lg); transition: all var(--ds-duration-fast); display: flex; align-items: center; justify-content: center; min-height: 40px;">
                                    Username
                                </div>
                            </label>
                            <label style="flex: 1; cursor: pointer;">
                                <input type="radio" name="loginMode" value="email" id="loginModeEmail" style="display: none;">
                                <div class="login-mode-btn" style="text-align: center; padding: var(--ds-space-2-5); font-size: var(--ds-text-xs); font-weight: var(--ds-weight-bold); border-radius: var(--ds-radius-lg); transition: all var(--ds-duration-fast); display: flex; align-items: center; justify-content: center; min-height: 40px;">
                                    Email + Licence
                                </div>
                            </label>
                        </div>
                        
                        <style>
                            input[name="loginMode"]:checked + .login-mode-btn {
                                background: var(--ds-bg-surface);
                                color: var(--ds-primary-600);
                                font-weight: var(--ds-weight-bold);
                                box-shadow: var(--ds-shadow-sm);
                            }
                            input[name="loginMode"]:not(:checked) + .login-mode-btn {
                                color: var(--ds-text-tertiary);
                            }
                        </style>

                        <div id="errorMessage" class="hidden" style="margin-bottom: var(--ds-space-4); padding: var(--ds-space-4); background: var(--ds-error-50); border: 1px solid var(--ds-error-200); border-radius: var(--ds-radius-xl); color: var(--ds-error-700); font-size: var(--ds-text-sm);">
                            <div style="display: flex; align-items: center; gap: var(--ds-space-2);">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span class="msg-text"></span>
                            </div>
                        </div>

                        <div id="successMessage" class="hidden" style="margin-bottom: var(--ds-space-4); padding: var(--ds-space-4); background: var(--ds-success-50); border: 1px solid var(--ds-success-200); border-radius: var(--ds-radius-xl); color: var(--ds-success-700); font-size: var(--ds-text-sm);">
                            <div style="display: flex; align-items: center; gap: var(--ds-space-2);">
                                <i class="fas fa-check-circle"></i>
                                <span class="msg-text"></span>
                            </div>
                        </div>

                        <form id="loginForm" style="display: flex; flex-direction: column; gap: var(--ds-space-5);">
                            <!-- Username Fields -->
                            <div id="usernameFields">
                                ${window.UIComponents.input({
        id: 'username',
        label: 'Username',
        placeholder: 'Enter your username',
        icon: '<i class="fas fa-user"></i>'
    })}
                            </div>

                            <!-- Email Fields -->
                            <div id="emailFields" class="hidden" style="display: flex; flex-direction: column; gap: var(--ds-space-5);">
                                ${window.UIComponents.input({
        id: 'loginEmail',
        type: 'email',
        label: 'Email Address',
        placeholder: 'john@example.com',
        icon: '<i class="fas fa-envelope"></i>'
    })}
                                ${window.UIComponents.input({
        id: 'loginLicenceNo',
        type: 'number',
        label: 'Tally Licence Number',
        placeholder: '100123456',
        icon: '<i class="fas fa-key"></i>'
    })}
                            </div>

                            <!-- Password -->
                            <div style="position: relative;">
                                ${window.UIComponents.input({
        id: 'password',
        type: 'password',
        label: 'Password',
        placeholder: 'Enter password',
        icon: '<i class="fas fa-lock"></i>',
        required: true
    })}
                                <span id="toggleLoginPassword" style="position: absolute; right: var(--ds-space-4); bottom: var(--ds-space-3); cursor: pointer; color: var(--ds-text-tertiary); font-size: var(--ds-text-lg);"><i class="fas fa-eye"></i></span>
                            </div>

                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <label style="display: flex; align-items: center; gap: var(--ds-space-2); cursor: pointer;">
                                    <input type="checkbox" id="rememberMe" style="width: 16px; height: 16px; border-radius: var(--ds-radius-sm); border: 1px solid var(--ds-border-default);">
                                    <span style="font-size: var(--ds-text-xs); color: var(--ds-text-secondary);">Remember me</span>
                                </label>
                                <a href="#" style="font-size: var(--ds-text-xs); font-weight: var(--ds-weight-bold); color: var(--ds-primary-600); text-decoration: none;">Forgot password?</a>
                            </div>

                            <div id="loadingSpinner" class="hidden" style="text-align: center; padding: var(--ds-space-2);">
                                ${window.UIComponents.spinner({ size: 'md' })}
                            </div>

                            <div style="margin-top: var(--ds-space-2);">
                                ${window.UIComponents.button({
        id: 'loginBtn',
        text: 'Sign In',
        icon: '<i class="fas fa-rocket"></i>',
        variant: 'primary',
        type: 'submit',
        fullWidth: true,
        size: 'lg'
    })}
                            </div>
                        </form>
                    </div>

                    <!-- Sign Up Form (Initially Hidden) -->
                    <div id="signupFormContainer" class="hidden">
                        <!-- Content will be injected or toggled via classes -->
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    // ============= REGISTRATION FORM CONTENT ONLY =============
    const getSignupFormContent = () => `
                    <div style="margin-bottom: var(--ds-space-6);">
                        <h2 style="font-size: var(--ds-text-2xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin: 0;">Create Your Account</h2>
                        <p style="font-size: var(--ds-text-sm); color: var(--ds-text-tertiary); margin: var(--ds-space-1) 0 0 0;">Join the Talliffy ecosystem today</p>
                    </div>

                    <div id="signupErrorMessage" class="hidden" style="margin-bottom: var(--ds-space-4); padding: var(--ds-space-4); background: var(--ds-error-50); border: 1px solid var(--ds-error-200); border-radius: var(--ds-radius-xl); color: var(--ds-error-700); font-size: var(--ds-text-sm);">
                        <div style="display: flex; align-items: center; gap: var(--ds-space-2);">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span class="msg-text"></span>
                        </div>
                    </div>

                    <div id="signupSuccessMessage" class="hidden" style="margin-bottom: var(--ds-space-4); padding: var(--ds-space-4); background: var(--ds-success-50); border: 1px solid var(--ds-success-200); border-radius: var(--ds-radius-xl); color: var(--ds-success-700); font-size: var(--ds-text-sm);">
                        <div style="display: flex; align-items: center; gap: var(--ds-space-2);">
                            <i class="fas fa-check-circle"></i>
                            <span class="msg-text"></span>
                        </div>
                    </div>

                    <form id="signupForm" style="display: flex; flex-direction: column; gap: var(--ds-space-4);">
                        <!-- Grid Layout for Fields -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--ds-space-4);">
                            <div>
                                ${window.UIComponents.input({
        id: 'signupFullName',
        label: 'Full Name',
        placeholder: 'John Doe',
        icon: '<i class="fas fa-user-circle"></i>',
        required: true
    })}
                            </div>
                            <div>
                                ${window.UIComponents.input({
        id: 'signupUsername',
        label: 'Username',
        placeholder: 'john_corporate',
        icon: '<i class="fas fa-at"></i>',
        required: true
    })}
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--ds-space-4);">
                            <div>
                                ${window.UIComponents.input({
        id: 'signupEmail',
        type: 'email',
        label: 'Email Address',
        placeholder: 'john@example.com',
        icon: '<i class="fas fa-envelope"></i>',
        required: true
    })}
                            </div>
                            <div>
                                ${window.UIComponents.input({
        id: 'signupLicenceNo',
        type: 'number',
        label: 'Tally Licence Number',
        placeholder: 'Auto-fetching...',
        icon: '<i class="fas fa-key"></i>',
        required: true,
        suffix: `<button type="button" id="refreshLicenseBtn" style="background: none; border: none; color: var(--ds-primary-600); cursor: pointer; font-size: var(--ds-text-base); display: flex; align-items: center; justify-content: center; padding: var(--ds-space-1);"><i class="fas fa-sync-alt"></i></button>`
    })}
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--ds-space-4);">
                            <div>
                                <label style="display: block; font-size: var(--ds-text-xs); font-weight: var(--ds-weight-bold); color: var(--ds-text-secondary); margin-bottom: var(--ds-space-1-5);">Country Code</label>
                                <div style="position: relative;">
                                    <span style="position: absolute; left: var(--ds-space-4); top: 50%; transform: translateY(-50%); color: var(--ds-text-tertiary);"><i class="fas fa-globe"></i></span>
                                    <select id="signupCountryCode" style="width: 100%; padding: var(--ds-space-3) var(--ds-space-4) var(--ds-space-3) var(--ds-space-10); border-radius: var(--ds-radius-xl); border: 2px solid var(--ds-border-default); background: var(--ds-bg-surface); font-size: var(--ds-text-sm); color: var(--ds-text-primary); transition: all var(--ds-duration-fast); appearance: none;">
                                        <option value="+91" selected>+91 (India)</option>
                                        <option value="+971">+971 (UAE)</option>
                                        <option value="+1">+1 (USA)</option>
                                        <option value="+44">+44 (UK)</option>
                                        <option value="+61">+61 (Australia)</option>
                                        <option value="+86">+86 (China)</option>
                                        <option value="+81">+81 (Japan)</option>
                                        <option value="+27">+27 (South Africa)</option>
                                        <option value="+33">+33 (France)</option>
                                        <option value="+49">+49 (Germany)</option>
                                        <option value="+39">+39 (Italy)</option>
                                        <option value="+7">+7 (Russia)</option>
                                        <option value="+55">+55 (Brazil)</option>
                                        <option value="+52">+52 (Mexico)</option>
                                        <option value="+34">+34 (Spain)</option>
                                        <option value="+31">+31 (Netherlands)</option>
                                        <option value="+46">+46 (Sweden)</option>
                                        <option value="+47">+47 (Norway)</option>
                                        <option value="+45">+45 (Denmark)</option>
                                        <option value="+358">+358 (Finland)</option>
                                        <option value="+48">+48 (Poland)</option>
                                        <option value="+41">+41 (Switzerland)</option>
                                        <option value="+43">+43 (Austria)</option>
                                        <option value="+32">+32 (Belgium)</option>
                                        <option value="+351">+351 (Portugal)</option>
                                        <option value="+90">+90 (Turkey)</option>
                                        <option value="+966">+966 (Saudi Arabia)</option>
                                        <option value="+974">+974 (Qatar)</option>
                                        <option value="+973">+973 (Bahrain)</option>
                                        <option value="+968">+968 (Oman)</option>
                                        <option value="+965">+965 (Kuwait)</option>
                                        <option value="+962">+962 (Jordan)</option>
                                        <option value="+961">+961 (Lebanon)</option>
                                        <option value="+20">+20 (Egypt)</option>
                                        <option value="+234">+234 (Nigeria)</option>
                                        <option value="+254">+254 (Kenya)</option>
                                        <option value="+60">+60 (Malaysia)</option>
                                        <option value="+65">+65 (Singapore)</option>
                                        <option value="+66">+66 (Thailand)</option>
                                        <option value="+62">+62 (Indonesia)</option>
                                        <option value="+63">+63 (Philippines)</option>
                                        <option value="+82">+82 (South Korea)</option>
                                        <option value="+852">+852 (Hong Kong)</option>
                                        <option value="+886">+886 (Taiwan)</option>
                                        <option value="+64">+64 (New Zealand)</option>
                                        <option value="+92">+92 (Pakistan)</option>
                                        <option value="+94">+94 (Sri Lanka)</option>
                                        <option value="+880">+880 (Bangladesh)</option>
                                        <option value="+977">+977 (Nepal)</option>
                                        <option value="+84">+84 (Vietnam)</option>
                                        <option value="+57">+57 (Colombia)</option>
                                        <option value="+56">+56 (Chile)</option>
                                        <option value="+54">+54 (Argentina)</option>
                                        <option value="+51">+51 (Peru)</option>
                                        <option value="+353">+353 (Ireland)</option>
                                        <option value="+30">+30 (Greece)</option>
                                        <option value="+36">+36 (Hungary)</option>
                                        <option value="+420">+420 (Czech Republic)</option>
                                        <option value="+40">+40 (Romania)</option>
                                        <option value="+380">+380 (Ukraine)</option>
                                        <option value="+972">+972 (Israel)</option>
                                    </select>
                                    <span style="position: absolute; right: var(--ds-space-4); top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--ds-text-tertiary);"><i class="fas fa-chevron-down" style="font-size: 10px;"></i></span>
                                </div>
                            </div>
                            <div>
                                ${window.UIComponents.input({
        id: 'signupMobile',
        type: 'tel',
        label: 'Mobile Number',
        placeholder: '9876543210',
        icon: '<i class="fas fa-mobile-alt"></i>',
        required: true
    })}
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--ds-space-4);">
                            <div>
                                ${window.UIComponents.input({
        id: 'signupPassword',
        type: 'password',
        label: 'Password',
        placeholder: 'Min 6 chars',
        icon: '<i class="fas fa-lock"></i>',
        required: true,
        suffix: `<span id="toggleSignupPassword" style="cursor: pointer; color: var(--ds-text-tertiary); font-size: var(--ds-text-lg); display: flex; align-items: center; justify-content: center; width: var(--ds-space-8); height: var(--ds-space-8);"><i class="fas fa-eye"></i></span>`
    })}
                                <div id="passwordStrength" style="height: 4px; background: var(--ds-bg-surface-sunken); border-radius: 99px; margin-top: 4px; overflow: hidden;">
                                    <div id="passwordStrengthBar" style="height: 100%; width: 0; transition: all 0.3s; background: var(--ds-danger-500);"></div>
                                </div>
                            </div>
                            <div>
                                ${window.UIComponents.input({
        id: 'signupConfirmPassword',
        type: 'password',
        label: 'Confirm Password',
        placeholder: 'Retype password',
        icon: '<i class="fas fa-shield-alt"></i>',
        required: true,
        suffix: `<span id="toggleSignupConfirmPassword" style="cursor: pointer; color: var(--ds-text-tertiary); font-size: var(--ds-text-lg); display: flex; align-items: center; justify-content: center; width: var(--ds-space-8); height: var(--ds-space-8);"><i class="fas fa-eye"></i></span>`
    })}
                            </div>
                        </div>

                        <div style="padding: var(--ds-space-4); background: var(--ds-bg-surface-sunken); border-radius: var(--ds-radius-xl); border: 1px solid var(--ds-border-default);">
                            <label style="display: flex; align-items: flex-start; gap: var(--ds-space-3); cursor: pointer;">
                                <input type="checkbox" id="signupAgreeTerms" style="width: 18px; height: 18px; border-radius: var(--ds-radius-sm); border: 2px solid var(--ds-border-default); margin-top: 2px;" required>
                                <span style="font-size: var(--ds-text-xs); color: var(--ds-text-secondary); line-height: 1.5;">I agree to the <a href="#" style="color: var(--ds-primary-600); font-weight: var(--ds-weight-bold); text-decoration: none;">Terms of Service</a> and <a href="#" style="color: var(--ds-primary-600); font-weight: var(--ds-weight-bold); text-decoration: none;">Privacy Policy</a>.</span>
                            </label>
                        </div>

                        <div id="loadingSpinner" class="hidden" style="text-align: center; padding: var(--ds-space-2);">
                            ${window.UIComponents.spinner({ size: 'md' })}
                        </div>

                        <div style="margin-top: var(--ds-space-2);">
                            ${window.UIComponents.button({
        id: 'signupBtn',
        text: 'Create My Account',
        icon: '<i class="fas fa-sparkles"></i>',
        variant: 'primary',
        type: 'submit',
        fullWidth: true,
        size: 'lg'
    })}
                        </div>
                    </form>

                    <div style="margin-top: var(--ds-space-6); text-align: center; padding-top: var(--ds-space-6); border-top: 1px solid var(--ds-border-default);">
                        <p style="font-size: var(--ds-text-sm); color: var(--ds-text-secondary);">
                            Already have an account? 
                            <a href="#" id="showLogin" style="color: var(--ds-primary-600); font-weight: var(--ds-weight-bold); text-decoration: none; margin-left: var(--ds-space-1);">Sign In</a>
                        </p>
                    </div>
    `;

    // ============= REGISTRATION TEMPLATE =============
    const getSignupTemplate = () => `
    <div class="auth-background" style="display: flex; min-height: 100vh; background: var(--ds-bg-app); overflow: hidden;">
        <!-- Left Side - Enhanced Branding Panel -->
        <div style="display: flex; flex-direction: column; justify-content: center; items-center; padding: var(--ds-space-12); position: relative; overflow: hidden; background: linear-gradient(135deg, var(--ds-primary-900) 0%, var(--ds-primary-800) 50%, var(--ds-primary-700) 100%); width: 50%;">
            <!-- Particles Canvas -->
            <canvas id="particlesCanvas" style="position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1;"></canvas>
            
            <div style="position: relative; z-index: 10; text-align: center; max-width: 440px; margin: 0 auto;">
                <div style="display: flex; align-items: center; justify-content: center; gap: var(--ds-space-3); margin-bottom: var(--ds-space-8);">
                    <div style="width: 48px; height: 48px; border-radius: var(--ds-radius-xl); background: linear-gradient(135deg, var(--ds-primary-400), var(--ds-primary-600)); font-size: 24px; display: flex; align-items: center; justify-content: center; box-shadow: var(--ds-shadow-lg); color: white;">
                        <i class="fas fa-chart-bar"></i>
                    </div>
                    <h1 style="font-size: var(--ds-text-3xl); font-weight: var(--ds-weight-bold); color: white; margin: 0;">
                        Talli<span style="color: var(--ds-primary-300);">ffy</span>
                    </h1>
                </div>
                
                <div style="text-align: left; margin-bottom: var(--ds-space-10);">
                    <h2 style="font-size: var(--ds-text-4xl); font-weight: var(--ds-weight-bold); color: white; line-height: 1.2; margin-bottom: var(--ds-space-4);">
                        Join Thousands of<br/>Tally Enterprises
                    </h2>
                    <p style="font-size: var(--ds-text-base); color: var(--ds-primary-100); opacity: 0.9;">
                        Start syncing your Tally Prime data in minutes. Access real-time business insights from anywhere.
                    </p>
                </div>

                <!-- Feature Highlights -->
                <div style="display: flex; flex-direction: column; gap: var(--ds-space-4); text-align: left;">
                    <div style="display: flex; align-items: center; gap: var(--ds-space-4); padding: var(--ds-space-4); border-radius: var(--ds-radius-2xl); background: rgba(255, 255, 255, 0.08); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1);">
                        <div style="width: 44px; height: 44px; border-radius: var(--ds-radius-lg); flex-shrink: 0; background: rgba(255, 255, 255, 0.15); display: flex; align-items: center; justify-content: center; font-size: var(--ds-text-xl); color: white;">
                            <i class="fas fa-bolt"></i>
                        </div>
                        <div>
                            <h3 style="font-size: var(--ds-text-sm); font-weight: var(--ds-weight-bold); color: white; margin: 0;">Quick Setup</h3>
                            <p style="font-size: var(--ds-text-xs); color: var(--ds-primary-100); margin: var(--ds-space-0-5) 0 0 0;">Get started in under 5 minutes</p>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: var(--ds-space-4); padding: var(--ds-space-4); border-radius: var(--ds-radius-2xl); background: rgba(255, 255, 255, 0.08); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1);">
                        <div style="width: 44px; height: 44px; border-radius: var(--ds-radius-lg); flex-shrink: 0; background: rgba(255, 255, 255, 0.15); display: flex; align-items: center; justify-content: center; font-size: var(--ds-text-xl); color: white;">
                            <i class="fas fa-sync-alt"></i>
                        </div>
                        <div>
                            <h3 style="font-size: var(--ds-text-sm); font-weight: var(--ds-weight-bold); color: white; margin: 0;">Automated Syncing</h3>
                            <p style="font-size: var(--ds-text-xs); color: var(--ds-primary-100); margin: var(--ds-space-0-5) 0 0 0;">Real-time data at your fingertips</p>
                        </div>
                    </div>
                </div>

                <div style="margin-top: var(--ds-space-12); font-size: var(--ds-text-xs); color: var(--ds-primary-200); opacity: 0.6;">
                    © 2026 Talliffy. Revolutionizing Tally Access.
                </div>
            </div>
        </div>

        <!-- Right Side - Signup Form -->
        <div style="display: flex; align-items: center; justify-content: center; padding: var(--ds-space-8); width: 50%; background: var(--ds-bg-app); overflow-y: auto;">
            <div style="width: 100%; max-width: 520px; padding: var(--ds-space-4) 0;">
                <!-- Auth Card -->
                <div style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-3xl); border: 1px solid var(--ds-border-default); padding: var(--ds-space-10); box-shadow: var(--ds-shadow-xl);">
                    ${getSignupFormContent()}
                </div>
            </div>
        </div>
    </div>
    <style>
        #signupLicenceNo::-webkit-outer-spin-button,
        #signupLicenceNo::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
    </style>
    `;

    // ============= OTP VERIFICATION TEMPLATE =============
    const getOtpVerificationTemplate = (username) => `
    <div class="auth-background" style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: var(--ds-bg-app); padding: var(--ds-space-6);">
        <div style="width: 100%; max-width: 440px; position: relative; z-index: 10;">
            <div style="text-align: center; margin-bottom: var(--ds-space-8);">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: var(--ds-radius-2xl); background: white; box-shadow: var(--ds-shadow-lg); margin-bottom: var(--ds-space-4);">
                    <img src="assets/brand/talliffy-icon.png" style="width: 48px; height: 48px; border-radius: var(--ds-radius-lg);" />
                </div>
                <h1 style="font-size: var(--ds-text-3xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin: 0;">
                    Talli<span style="color: var(--ds-primary-600);">ffy</span>
                </h1>
                <p style="font-size: var(--ds-text-sm); color: var(--ds-text-tertiary); margin-top: var(--ds-space-2);">Verify Your Account</p>
            </div>

            <div style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-3xl); border: 1px solid var(--ds-border-default); padding: var(--ds-space-10); box-shadow: var(--ds-shadow-xl);">
                <div style="text-align: center; margin-bottom: var(--ds-space-8);">
                    <p style="font-size: var(--ds-text-sm); font-weight: var(--ds-weight-medium); color: var(--ds-text-secondary); margin: 0;">Username: <span style="color: var(--ds-primary-700);">${username}</span></p>
                    <p style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary); margin-top: var(--ds-space-1);">We've sent a 6-digit verification code to your email.</p>
                </div>

                <div id="errorMessage" class="hidden" style="margin-bottom: var(--ds-space-6); padding: var(--ds-space-4); background: var(--ds-error-50); border: 1px solid var(--ds-error-200); border-radius: var(--ds-radius-xl); color: var(--ds-error-700); font-size: var(--ds-text-sm);">
                    <div style="display: flex; align-items: center; gap: var(--ds-space-2);">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span class="msg-text"></span>
                    </div>
                </div>

                <div id="successMessage" class="hidden" style="margin-bottom: var(--ds-space-6); padding: var(--ds-space-4); background: var(--ds-success-50); border: 1px solid var(--ds-success-200); border-radius: var(--ds-radius-xl); color: var(--ds-success-700); font-size: var(--ds-text-sm);">
                    <div style="display: flex; align-items: center; gap: var(--ds-space-2);">
                        <i class="fas fa-check-circle"></i>
                        <span class="msg-text"></span>
                    </div>
                </div>

                <form id="otpForm" style="display: flex; flex-direction: column; gap: var(--ds-space-8);">
                    <div>
                        <label style="display: block; font-size: var(--ds-text-xs); font-weight: var(--ds-weight-bold); color: var(--ds-text-secondary); text-align: center; margin-bottom: var(--ds-space-4);">ENTER 6-DIGIT CODE</label>
                        <div style="display: flex; gap: var(--ds-space-2); justify-content: center;">
                            <input type="text" maxlength="1" class="otp-input" style="width: 48px; height: 56px; text-align: center; font-size: 24px; font-weight: var(--ds-weight-bold); border-radius: var(--ds-radius-xl); border: 2px solid var(--ds-border-default); background: var(--ds-bg-surface); color: var(--ds-text-primary); transition: all var(--ds-duration-fast);" data-index="0">
                            <input type="text" maxlength="1" class="otp-input" style="width: 48px; height: 56px; text-align: center; font-size: 24px; font-weight: var(--ds-weight-bold); border-radius: var(--ds-radius-xl); border: 2px solid var(--ds-border-default); background: var(--ds-bg-surface); color: var(--ds-text-primary); transition: all var(--ds-duration-fast);" data-index="1">
                            <input type="text" maxlength="1" class="otp-input" style="width: 48px; height: 56px; text-align: center; font-size: 24px; font-weight: var(--ds-weight-bold); border-radius: var(--ds-radius-xl); border: 2px solid var(--ds-border-default); background: var(--ds-bg-surface); color: var(--ds-text-primary); transition: all var(--ds-duration-fast);" data-index="2">
                            <input type="text" maxlength="1" class="otp-input" style="width: 48px; height: 56px; text-align: center; font-size: 24px; font-weight: var(--ds-weight-bold); border-radius: var(--ds-radius-xl); border: 2px solid var(--ds-border-default); background: var(--ds-bg-surface); color: var(--ds-text-primary); transition: all var(--ds-duration-fast);" data-index="3">
                            <input type="text" maxlength="1" class="otp-input" style="width: 48px; height: 56px; text-align: center; font-size: 24px; font-weight: var(--ds-weight-bold); border-radius: var(--ds-radius-xl); border: 2px solid var(--ds-border-default); background: var(--ds-bg-surface); color: var(--ds-text-primary); transition: all var(--ds-duration-fast);" data-index="4">
                            <input type="text" maxlength="1" class="otp-input" style="width: 48px; height: 56px; text-align: center; font-size: 24px; font-weight: var(--ds-weight-bold); border-radius: var(--ds-radius-xl); border: 2px solid var(--ds-border-default); background: var(--ds-bg-surface); color: var(--ds-text-primary); transition: all var(--ds-duration-fast);" data-index="5">
                        </div>
                    </div>

                    <div style="text-align: center;">
                        <p style="font-size: var(--ds-text-sm); color: var(--ds-text-tertiary); margin: 0;">
                            Code expires in: <span id="otpTimer" style="font-weight: var(--ds-weight-bold); color: var(--ds-primary-600);">05:00</span>
                        </p>
                    </div>

                    <div id="loadingSpinner" class="hidden" style="text-align: center;">
                        ${window.UIComponents.spinner({ size: 'md' })}
                    </div>

                    ${window.UIComponents.button({
        id: 'verifyBtn',
        text: 'Verify Account',
        icon: '<i class="fas fa-check-circle"></i>',
        variant: 'primary',
        fullWidth: true,
        size: 'lg',
        type: 'submit'
    })}
                </form>

                <div style="margin-top: var(--ds-space-8); padding-top: var(--ds-space-6); border-top: 1px solid var(--ds-border-default); text-align: center;">
                    <p style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary); margin-bottom: var(--ds-space-2);">Didn't receive the code?</p>
                    <button id="resendBtn" style="background: none; border: none; font-size: var(--ds-text-sm); font-weight: var(--ds-weight-bold); color: var(--ds-primary-600); cursor: pointer; padding: 0;">Resend OTP</button>
                    <p id="remainingAttempts" style="font-size: 10px; color: var(--ds-text-tertiary); margin-top: var(--ds-space-1);">(3 attempts remaining)</p>
                    <p id="resendTimer" style="display: none; font-size: var(--ds-text-xs); color: var(--ds-text-tertiary); margin-top: var(--ds-space-2);">Wait <span id="resendCountdown">60</span>s to resend</p>
                </div>

                <div style="margin-top: var(--ds-space-6); text-align: center;">
                    <a href="#" id="backToLogin" style="font-size: var(--ds-text-sm); font-weight: var(--ds-weight-medium); color: var(--ds-text-secondary); text-decoration: none;">← Back to Sign In</a>
                </div>
            </div>
        </div>
    </div>
    <style>
        .otp-input:focus {
            border-color: var(--ds-primary-500) !important;
            box-shadow: 0 0 0 4px var(--ds-primary-100) !important;
            outline: none;
        }
    </style>
    `;

    // ============= MOBILE OTP VERIFICATION TEMPLATE =============
    const getMobileOtpVerificationTemplate = (mobile, username) => `
    <div class="auth-background" style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: var(--ds-bg-app); padding: var(--ds-space-6);">
        <div style="width: 100%; max-width: 440px; position: relative; z-index: 10;">
            <!-- Header Card Section -->
            <div style="background: linear-gradient(135deg, var(--ds-primary-700), var(--ds-primary-900)); border-radius: var(--ds-radius-3xl) var(--ds-radius-3xl) 0 0; padding: var(--ds-space-8); text-align: center; border: 1px solid var(--ds-primary-600); border-bottom: none;">
                <div style="width: 72px; height: 72px; border-radius: 99px; background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(8px); display: inline-flex; align-items: center; justify-content: center; margin-bottom: var(--ds-space-4); color: white; font-size: 32px;">
                    <i class="fas fa-mobile-alt"></i>
                </div>
                <h2 style="font-size: var(--ds-text-2xl); font-weight: var(--ds-weight-bold); color: white; margin: 0;">Mobile Verification</h2>
                <p style="font-size: var(--ds-text-sm); color: var(--ds-primary-100); margin-top: var(--ds-space-2); opacity: 0.9;">
                    We've sent a code to ${mobile.replace(/(.{3})(.{4})(.*)/, '$1$2****')}
                </p>
            </div>

            <!-- Content Card Section -->
            <div style="background: var(--ds-bg-surface); border-radius: 0 0 var(--ds-radius-3xl) var(--ds-radius-3xl); border: 1px solid var(--ds-border-default); padding: var(--ds-space-10); box-shadow: var(--ds-shadow-xl); border-top: none;">
                <!-- Alerts Container -->
                <div id="mobile-otp-success" class="hidden" style="margin-bottom: var(--ds-space-6); padding: var(--ds-space-4); background: var(--ds-success-50); border: 1px solid var(--ds-success-200); border-radius: var(--ds-radius-xl); color: var(--ds-success-700); font-size: var(--ds-text-sm);">
                    <div style="display: flex; align-items: center; gap: var(--ds-space-2);">
                        <i class="fas fa-check-circle"></i>
                        <span class="msg-content"></span>
                    </div>
                </div>

                <div id="mobile-otp-error" class="hidden" style="margin-bottom: var(--ds-space-6); padding: var(--ds-space-4); background: var(--ds-error-50); border: 1px solid var(--ds-error-200); border-radius: var(--ds-radius-xl); color: var(--ds-error-700); font-size: var(--ds-text-sm);">
                    <div style="display: flex; align-items: center; gap: var(--ds-space-2);">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span class="msg-content"></span>
                    </div>
                </div>

                <!-- OTP Inputs -->
                <div style="margin-bottom: var(--ds-space-8);">
                    <label style="display: block; font-size: var(--ds-text-xs); font-weight: var(--ds-weight-bold); color: var(--ds-text-secondary); text-align: center; margin-bottom: var(--ds-space-4);">ENTER 6-DIGIT OTP</label>
                    <div style="display: flex; gap: var(--ds-space-2); justify-content: center;" id="mobile-otp-inputs-container">
                        <input type="text" maxlength="1" class="mobile-otp-field" style="width: 48px; height: 56px; text-align: center; font-size: 24px; font-weight: var(--ds-weight-bold); border-radius: var(--ds-radius-xl); border: 2px solid var(--ds-border-default); background: var(--ds-bg-surface); color: var(--ds-text-primary); transition: all 0.2s;" data-index="1" id="mobile-otp-1" />
                        <input type="text" maxlength="1" class="mobile-otp-field" style="width: 48px; height: 56px; text-align: center; font-size: 24px; font-weight: var(--ds-weight-bold); border-radius: var(--ds-radius-xl); border: 2px solid var(--ds-border-default); background: var(--ds-bg-surface); color: var(--ds-text-primary); transition: all 0.2s;" data-index="2" id="mobile-otp-2" />
                        <input type="text" maxlength="1" class="mobile-otp-field" style="width: 48px; height: 56px; text-align: center; font-size: 24px; font-weight: var(--ds-weight-bold); border-radius: var(--ds-radius-xl); border: 2px solid var(--ds-border-default); background: var(--ds-bg-surface); color: var(--ds-text-primary); transition: all 0.2s;" data-index="3" id="mobile-otp-3" />
                        <input type="text" maxlength="1" class="mobile-otp-field" style="width: 48px; height: 56px; text-align: center; font-size: 24px; font-weight: var(--ds-weight-bold); border-radius: var(--ds-radius-xl); border: 2px solid var(--ds-border-default); background: var(--ds-bg-surface); color: var(--ds-text-primary); transition: all 0.2s;" data-index="4" id="mobile-otp-4" />
                        <input type="text" maxlength="1" class="mobile-otp-field" style="width: 48px; height: 56px; text-align: center; font-size: 24px; font-weight: var(--ds-weight-bold); border-radius: var(--ds-radius-xl); border: 2px solid var(--ds-border-default); background: var(--ds-bg-surface); color: var(--ds-text-primary); transition: all 0.2s;" data-index="5" id="mobile-otp-5" />
                        <input type="text" maxlength="1" class="mobile-otp-field" style="width: 48px; height: 56px; text-align: center; font-size: 24px; font-weight: var(--ds-weight-bold); border-radius: var(--ds-radius-xl); border: 2px solid var(--ds-border-default); background: var(--ds-bg-surface); color: var(--ds-text-primary); transition: all 0.2s;" data-index="6" id="mobile-otp-6" />
                    </div>
                </div>

                <!-- Timer info -->
                <div style="text-align: center; margin-bottom: var(--ds-space-8);">
                    <div style="display: inline-flex; align-items: center; gap: var(--ds-space-2); padding: var(--ds-space-2) var(--ds-space-4); background: var(--ds-bg-surface-sunken); border-radius: 99px; border: 1px solid var(--ds-border-default);">
                        <i class="fas fa-clock" style="color: var(--ds-primary-600);"></i>
                        <span style="font-size: var(--ds-text-xs); color: var(--ds-text-secondary);">Time remaining:</span>
                        <span id="mobile-otp-timer" style="font-size: var(--ds-text-sm); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary);">10:00</span>
                    </div>
                </div>

                <!-- Verify Button -->
                ${window.UIComponents.button({
        id: 'mobile-verify-otp-btn',
        text: 'Verify OTP',
        icon: '<i class="fas fa-shield-check"></i>',
        variant: 'primary',
        fullWidth: true,
        size: 'lg'
    })}

                <!-- Action Links -->
                <div style="margin-top: var(--ds-space-8); text-align: center;">
                    <button id="mobile-resend-otp-btn" style="background: none; border: none; font-size: var(--ds-text-sm); font-weight: var(--ds-weight-bold); color: var(--ds-primary-600); cursor: pointer; opacity: 0.5;" disabled>
                        Resend Code <span id="mobile-resend-countdown-group" style="font-weight: normal; color: var(--ds-text-tertiary);">(Wait <span id="mobile-resend-countdown">60</span>s)</span>
                    </button>
                    <div id="mobile-resend-attempts" style="font-size: 10px; color: var(--ds-text-tertiary); margin-top: var(--ds-space-1);">3 attempts maximum</div>
                </div>

                <div style="margin-top: var(--ds-space-8); padding-top: var(--ds-space-6); border-top: 1px solid var(--ds-border-default); text-align: center;">
                    <a href="#login" onclick="window.initializeLogin(); return false;" style="font-size: var(--ds-text-sm); font-weight: var(--ds-weight-medium); color: var(--ds-text-secondary); text-decoration: none;">← Back to Sign In</a>
                </div>
            </div>
        </div>
    </div>
    <style>
        .mobile-otp-field:focus {
            border-color: var(--ds-primary-500) !important;
            box-shadow: 0 0 0 4px var(--ds-primary-100) !important;
            outline: none;
        }
    </style>
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
        cleanupOtpTimers();
        stopParticles();
        const pageContent = document.getElementById('page-content');
        const target = pageContent || document.body;
        target.innerHTML = getLoginTemplate();
        startParticles();
        setupLoginForm();

        // Populate signup form container from shared sub-template
        let signupFormContainer = document.getElementById('signupFormContainer');
        if (signupFormContainer) {
            signupFormContainer.innerHTML = getSignupFormContent();
            setupSignupForm(); // Consolidated setup
        }

        // Tab switching between Sign In and Sign Up
        const signinTab = document.getElementById('signinTab');
        const signupTab = document.getElementById('signupTab');
        const signinForm = document.getElementById('signinForm');
        signupFormContainer = document.getElementById('signupFormContainer');

        // Helper function to set active tab styling
        function setActiveTab(activeTab, inactiveTab) {
            // Active tab styles
            activeTab.style.background = 'white';
            activeTab.style.color = '#1346A8';
            activeTab.style.boxShadow = '0 2px 8px rgba(19, 70, 168, 0.15)';
            activeTab.style.border = '1px solid #e2e8f0';
            activeTab.style.borderRadius = 'var(--ds-radius-xl)';

            // Inactive tab styles
            inactiveTab.style.background = 'transparent';
            inactiveTab.style.color = '#64748b';
            inactiveTab.style.boxShadow = 'none';
            inactiveTab.style.border = '1px solid transparent';
            inactiveTab.style.borderRadius = 'var(--ds-radius-xl)';
        }

        if (signinTab && signupTab) {
            // Set initial active state - Sign In is active by default
            setActiveTab(signinTab, signupTab);

            signinTab.addEventListener('click', () => {
                setActiveTab(signinTab, signupTab);
                signinForm.classList.remove('hidden');
                signupFormContainer.classList.add('hidden');
                // Ensure inline styles don't conflict
                signinForm.style.display = 'block';
                signupFormContainer.style.display = 'none';
            });

            signupTab.addEventListener('click', () => {
                setActiveTab(signupTab, signinTab);
                signinForm.classList.add('hidden');
                signupFormContainer.classList.remove('hidden');
                // Ensure inline styles don't conflict
                signinForm.style.display = 'none';
                signupFormContainer.style.display = 'block';

                // Auto-fetch and populate Tally license number when switching to signup
                setTimeout(() => {
                    fetchAndPopulateLicenseNumber();
                }, 100);
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
                usernameFields.style.display = 'block';
                emailFields.style.display = 'none';
            }
        });

        emailMode.addEventListener('change', () => {
            if (emailMode.checked) {
                usernameFields.classList.add('hidden');
                emailFields.classList.remove('hidden');
                usernameFields.style.display = 'none';
                emailFields.style.display = 'flex';

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
        cleanupOtpTimers();
        stopParticles();
        const pageContent = document.getElementById('page-content');
        const target = pageContent || document.body;
        target.innerHTML = getSignupTemplate();
        startParticles();

        // Verify fields are in DOM
        setTimeout(() => {
            const countryCodeField = document.getElementById('signupCountryCode');
            const mobileField = document.getElementById('signupMobile');

            console.log('🌍 Country Code field visible:', !!countryCodeField);
            console.log('📱 Mobile field visible:', !!mobileField);

            if (!countryCodeField) {
                console.warn('⚠️ countryCodeField not found in DOM');
            }
            if (!mobileField) {
                console.warn('⚠️ mobileField not found in DOM');
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

    async function fetchAndPopulateLicenseNumber() {
        try {
            const licenceNoInput = document.getElementById('signupLicenceNo');
            if (!licenceNoInput) return;

            // Don't override if user already entered a value
            if (licenceNoInput.value && licenceNoInput.value.trim() !== '') {
                console.log('📝 License number already entered by user, skipping auto-fetch');
                return;
            }

            // Get Tally port from settings
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            const tallyPort = appSettings.tallyPort || 9000;

            console.log('🔑 Fetching Tally license number from port:', tallyPort);

            if (window.electronAPI && window.electronAPI.invoke) {
                const response = await window.electronAPI.invoke('fetch-license', { tallyPort });

                if (response.success && response.data && response.data.license_number) {
                    const licenseNumber = response.data.license_number;
                    licenceNoInput.value = licenseNumber;
                    // licenceNoInput.style.borderColor = '#10b981'; // Green border
                    licenceNoInput.style.background = '#f0fdf4'; // Light green background
                    licenceNoInput.readOnly = false; // Allow editing

                    console.log('✅ License number auto-populated from Tally:', licenseNumber);

                    // Show a subtle notification
                    if (window.notificationService && window.notificationService.show) {
                        window.notificationService.show({
                            type: 'success',
                            message: `License number ${licenseNumber} fetched from Tally Prime`,
                            duration: 3000
                        });
                    }
                } else {
                    console.warn('⚠️ License number not available from Tally');
                    licenceNoInput.placeholder = '1001 (Enter manually if Tally is not running)';
                }
            } else {
                console.warn('⚠️ electronAPI not available');
                licenceNoInput.placeholder = 'Enter license number manually';
            }
        } catch (error) {
            console.error('❌ Error fetching license number:', error);
            const licenceNoInput = document.getElementById('licenceNo');
            if (licenceNoInput) {
                licenceNoInput.placeholder = 'Enter manually (Tally not accessible)';
            }
        }
    }

    // ============= PARTICLES ANIMATION =============
    let particlesAnimationId = null;

    function startParticles() {
        const canvas = document.getElementById('particlesCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const parent = canvas.parentElement;
        let particles = [];
        const PARTICLE_COUNT = 60;
        const CONNECT_DISTANCE = 120;
        let mouse = { x: null, y: null };

        function resize() {
            canvas.width = parent.offsetWidth;
            canvas.height = parent.offsetHeight;
        }
        resize();

        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(parent);

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        });
        canvas.addEventListener('mouseleave', () => {
            mouse.x = null;
            mouse.y = null;
        });

        class Particle {
            constructor() {
                this.reset();
            }
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2.5 + 1;
                this.speedX = (Math.random() - 0.5) * 0.8;
                this.speedY = (Math.random() - 0.5) * 0.8;
                this.opacity = Math.random() * 0.12 + 0.08;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                // Mouse interaction — gentle repulsion
                if (mouse.x !== null && mouse.y !== null) {
                    const dx = this.x - mouse.x;
                    const dy = this.y - mouse.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 100) {
                        const force = (100 - dist) / 100 * 0.5;
                        this.x += dx / dist * force;
                        this.y += dy / dist * force;
                    }
                }

                // Wrap around edges
                if (this.x < 0) this.x = canvas.width;
                if (this.x > canvas.width) this.x = 0;
                if (this.y < 0) this.y = canvas.height;
                if (this.y > canvas.height) this.y = 0;
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
                ctx.fill();
            }
        }

        // Initialize particles
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push(new Particle());
        }

        function drawConnections() {
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < CONNECT_DISTANCE) {
                        const opacity = (1 - dist / CONNECT_DISTANCE) * 0.06;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                }
            }

            // Connect particles near mouse
            if (mouse.x !== null && mouse.y !== null) {
                for (const p of particles) {
                    const dx = p.x - mouse.x;
                    const dy = p.y - mouse.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        const opacity = (1 - dist / 150) * 0.12;
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(mouse.x, mouse.y);
                        ctx.strokeStyle = `rgba(147, 197, 253, ${opacity})`;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const p of particles) {
                p.update();
                p.draw();
            }
            drawConnections();
            particlesAnimationId = requestAnimationFrame(animate);
        }

        animate();

        // Store observer so we can disconnect later
        canvas._resizeObserver = resizeObserver;
    }

    function stopParticles() {
        if (particlesAnimationId) {
            cancelAnimationFrame(particlesAnimationId);
            particlesAnimationId = null;
        }
        const canvas = document.getElementById('particlesCanvas');
        if (canvas && canvas._resizeObserver) {
            canvas._resizeObserver.disconnect();
        }
    }

    // Cleanup any running OTP timers to prevent errors when DOM is replaced
    function cleanupOtpTimers() {
        if (window._otpTimerInterval) {
            clearInterval(window._otpTimerInterval);
            window._otpTimerInterval = null;
        }
        if (window._otpResendCooldownInterval) {
            clearInterval(window._otpResendCooldownInterval);
            window._otpResendCooldownInterval = null;
        }
        if (window._mobileOtpTimerInterval) {
            clearInterval(window._mobileOtpTimerInterval);
            window._mobileOtpTimerInterval = null;
        }
        if (window._mobileResendCooldownInterval) {
            clearInterval(window._mobileResendCooldownInterval);
            window._mobileResendCooldownInterval = null;
        }
    }

    window.initializeOtpVerification = function (username) {
        console.log('Initializing OTP Verification...');
        cleanupOtpTimers(); // Clear any previous timers
        const pageContent = document.getElementById('page-content');
        const target = pageContent || document.body;
        target.innerHTML = getOtpVerificationTemplate(username);
        setupOtpForm(username);

        // Handle back to login
        const backToLogin = document.getElementById('backToLogin');
        if (backToLogin) {
            backToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                cleanupOtpTimers();
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

        // ============= AUTO-POPULATE REMEMBERED CREDENTIALS =============
        const rememberMeCheckbox = document.getElementById('rememberMe');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');

        // Load saved credentials if remember me was enabled
        if (localStorage.getItem('rememberMe') === 'true') {
            const savedUsername = localStorage.getItem('rememberedUsername');
            const savedPasswordHash = localStorage.getItem('rememberedPasswordHash');
            const savedPasswordEncrypted = localStorage.getItem('rememberedPasswordEncrypted');

            if (savedUsername && usernameInput) {
                usernameInput.value = savedUsername;
                if (rememberMeCheckbox) rememberMeCheckbox.checked = true;
                console.log('✅ Remembered username auto-populated');
            }

            // Auto-populate password if encrypted version is available
            if (savedPasswordEncrypted && passwordInput) {
                const decryptedPassword = decryptPassword(savedPasswordEncrypted);
                if (decryptedPassword) {
                    passwordInput.value = decryptedPassword;
                    passwordInput.style.borderColor = '#10b981';
                    console.log('✅ Remembered password auto-populated (decrypted)');
                }
            }

            // Store hash for additional validation if needed
            if (savedPasswordHash && passwordInput) {
                passwordInput.dataset.savedHash = savedPasswordHash;
            }
        }

        // Clear saved credentials when remember me is unchecked
        if (rememberMeCheckbox) {
            rememberMeCheckbox.addEventListener('change', (e) => {
                if (!e.target.checked) {
                    localStorage.removeItem('rememberMe');
                    localStorage.removeItem('rememberedUsername');
                    localStorage.removeItem('rememberedPasswordHash');
                    localStorage.removeItem('rememberedPasswordEncrypted');
                    console.log('🗑️ Remembered credentials cleared');
                }
            });
        }

        // Show/Hide password toggle
        const toggleLoginPassword = document.getElementById('toggleLoginPassword');
        if (toggleLoginPassword) {
            toggleLoginPassword.addEventListener('click', () => {
                const pwd = document.getElementById('password');
                if (!pwd) return;
                const isText = pwd.type === 'text';
                pwd.type = isText ? 'password' : 'text';
                toggleLoginPassword.innerHTML = isText ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
            });
        }

        // ── Real-time validation for login fields ──
        FormValidator.attach('username', 'required');
        FormValidator.attach('loginEmail', 'email');
        FormValidator.attach('loginLicenceNo', 'licenceNo');
        FormValidator.attach('password', 'required');

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
            const loginBtnText = loginBtn.querySelector('.ds-btn-text');
            if (loginBtnText) loginBtnText.textContent = 'Signing In...';

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

                // Success - Store credentials in localStorage (persistent for 7 days)
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
                localStorage.setItem('loginTime', new Date().toISOString());

                // Set session expiry (7 days)
                const expiryTime = new Date().getTime() + (7 * 24 * 60 * 60 * 1000);
                localStorage.setItem('sessionExpiry', expiryTime.toString());

                // Extract CSRF token from response if available
                if (data.csrfToken) {
                    localStorage.setItem('csrfToken', data.csrfToken);
                }

                console.log('✅ Login successful:', {
                    hasToken: !!data.token,
                    hasDeviceToken: !!data.deviceToken,
                    userId: data.userId
                });

                // Save credentials with hashed password if remember me is checked
                if (rememberMe && loginMode === 'username') {
                    localStorage.setItem('rememberMe', 'true');
                    localStorage.setItem('rememberedUsername', payload.username);

                    // Hash password for verification
                    const passwordHash = await hashPassword(password);
                    if (passwordHash) {
                        localStorage.setItem('rememberedPasswordHash', passwordHash);
                    }

                    // Encrypt password for auto-fill
                    const passwordEncrypted = encryptPassword(password);
                    if (passwordEncrypted) {
                        localStorage.setItem('rememberedPasswordEncrypted', passwordEncrypted);
                        console.log('🔐 Credentials saved securely (password hashed + encrypted)');
                    }
                } else if (!rememberMe) {
                    // Clear saved credentials if remember me is not checked
                    localStorage.removeItem('rememberMe');
                    localStorage.removeItem('rememberedUsername');
                    localStorage.removeItem('rememberedPasswordHash');
                    localStorage.removeItem('rememberedPasswordEncrypted');
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

    // Unified registration form logic is now handled in setupSignupForm()

    // ============= REGISTRATION FORM SETUP (UPDATED) =============
    function setupSignupForm() {
        const signupForm = document.getElementById('signupForm');
        if (!signupForm) return;

        // Auto-fetch Tally license number when signup form loads
        setTimeout(() => {
            fetchAndPopulateLicenseNumber();
        }, 200);

        const signupBtn = document.getElementById('signupBtn');
        const errorMessage = document.getElementById('signupErrorMessage');
        const successMessage = document.getElementById('signupSuccessMessage');
        const loadingSpinner = document.getElementById('signupLoadingSpinner') || document.getElementById('loadingSpinner');

        // Inline validation helpers
        const emailInput = document.getElementById('signupEmail');
        const emailHelper = document.getElementById('emailHelper');
        const usernameInput = document.getElementById('signupUsername');
        const usernameHelper = document.getElementById('usernameHelper');
        const licenceInput = document.getElementById('signupLicenceNo');
        const licenceHelper = document.getElementById('licenceHelper');
        const countrySelect = document.getElementById('signupCountryCode');
        const countryHelper = document.getElementById('countryHelper');
        const mobileInput = document.getElementById('signupMobile');
        const mobileHelper = document.getElementById('mobileHelper');
        const signupPassword = document.getElementById('signupPassword');
        const passwordHelper = document.getElementById('passwordHelper');
        const passwordStrengthBar = document.getElementById('passwordStrengthBar');
        const signupConfirmPassword = document.getElementById('signupConfirmPassword');
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
                toggleSignupPassword.innerHTML = isText ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
            });
        }
        if (toggleSignupConfirmPassword && signupConfirmPassword) {
            toggleSignupConfirmPassword.addEventListener('click', () => {
                const isText = signupConfirmPassword.type === 'text';
                signupConfirmPassword.type = isText ? 'password' : 'text';
                toggleSignupConfirmPassword.innerHTML = isText ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
            });
        }

        // License refresh button handler
        const refreshLicenseBtn = document.getElementById('refreshLicenseBtn');
        if (refreshLicenseBtn) {
            refreshLicenseBtn.addEventListener('click', async () => {
                const licenceNoInput = document.getElementById('signupLicenceNo');
                if (licenceNoInput) {
                    licenceNoInput.value = ''; // Clear current value
                    refreshLicenseBtn.style.animation = 'spin 1s linear';
                    await fetchAndPopulateLicenseNumber();
                    refreshLicenseBtn.style.animation = '';
                }
            });
        }

        // CSS for refresh button animation
        if (!document.getElementById('licenseRefreshStyle')) {
            const style = document.createElement('style');
            style.id = 'licenseRefreshStyle';
            style.textContent = `
                @keyframes spin {
                    from { transform: translateY(-50%) rotate(0deg); }
                    to { transform: translateY(-50%) rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
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
            ['input', 'blur'].forEach(ev => licenceInput.addEventListener(ev, updateLicence));
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
                const plain = val.replace(/\D/g, '');
                const ok = /^[0-9]{7,15}$/.test(plain);
                setFieldState(mobileInput, ok, mobileHelper, ok ? 'Looks valid' : '7-15 digits required');
            }
        };
        if (mobileInput) {
            ['input', 'blur', 'change'].forEach(ev => mobileInput.addEventListener(ev, validateMobileLive));
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
                const labels = ['Very weak', 'Weak', 'Okay', 'Strong', 'Very strong'];
                const colors = ['#991b1b', '#ef4444', '#ca8a04', '#16a34a', '#065f46'];
                setFieldState(signupPassword, s >= 2, passwordHelper, labels[s]);
                if (passwordHelper) passwordHelper.style.color = colors[s];
                if (passwordStrengthBar) {
                    const widths = ['10%', '25%', '50%', '75%', '100%'];
                    passwordStrengthBar.style.width = widths[s];
                    passwordStrengthBar.style.backgroundColor = colors[s];
                }
            });
        }

        // Confirm password match
        const updateConfirm = () => {
            if (!signupConfirmPassword || !signupPassword) return;
            const ok = signupConfirmPassword.value === signupPassword.value && signupConfirmPassword.value.length >= 6;
            setFieldState(signupConfirmPassword, ok, confirmHelper, ok ? 'Passwords match' : 'Passwords do not match');
        };
        if (signupConfirmPassword) {
            ['input', 'blur'].forEach(ev => signupConfirmPassword.addEventListener(ev, updateConfirm));
            if (signupPassword) signupPassword.addEventListener('input', updateConfirm);
        }

        // CTA disabled until valid
        const signupBtnEl = document.getElementById('signupBtn');
        const agreeTermsEl = document.getElementById('signupAgreeTerms');
        const formIsValid = () => {
            const nameOk = !!document.getElementById('signupFullName')?.value.trim();
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
                mobileOk = /^[0-9]{7,15}$/.test((mv || '').replace(/\D/g, ''));
            }
            const pwd = signupPassword?.value || '';
            const pwdScore = scorePassword(pwd);
            const pwdOk = pwd.length >= 6 && pwdScore >= 2;
            const confirmOk = signupConfirmPassword?.value === pwd && (signupConfirmPassword?.value.length || 0) >= 6;
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
        ['input', 'change', 'blur'].forEach(ev => {
            emailInput && emailInput.addEventListener(ev, updateSignupCta);
            usernameInput && usernameInput.addEventListener(ev, updateSignupCta);
            licenceInput && licenceInput.addEventListener(ev, updateSignupCta);
            countrySelect && countrySelect.addEventListener(ev, updateSignupCta);
            mobileInput && mobileInput.addEventListener(ev, updateSignupCta);
            signupPassword && signupPassword.addEventListener(ev, updateSignupCta);
            signupConfirmPassword && signupConfirmPassword.addEventListener(ev, updateSignupCta);
            agreeTermsEl && agreeTermsEl.addEventListener(ev, updateSignupCta);
        });
        // Initialize state
        updateSignupCta();

        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fullName = document.getElementById('signupFullName')?.value.trim();
            const username = document.getElementById('signupUsername')?.value.trim();
            const email = document.getElementById('signupEmail')?.value.trim();
            const licenceNo = document.getElementById('signupLicenceNo')?.value.trim();
            const countryCode = document.getElementById('signupCountryCode')?.value.trim();
            const mobile = document.getElementById('signupMobile')?.value.trim();
            const password = document.getElementById('signupPassword')?.value.trim();
            const signupConfirmPassword = document.getElementById('signupConfirmPassword')?.value.trim();
            const agreeTerms = document.getElementById('signupAgreeTerms')?.checked;

            if (errorMessage) {
                errorMessage.style.display = 'none';
                const msgText = errorMessage.querySelector('.msg-text');
                if (msgText) msgText.textContent = '';
            }
            if (successMessage) {
                successMessage.style.display = 'none';
                const msgText = successMessage.querySelector('.msg-text');
                if (msgText) msgText.textContent = '';
            }

            // Validation
            if (!fullName || !username || !email || !licenceNo || !countryCode || !mobile || !password || !signupConfirmPassword) {
                if (errorMessage) {
                    const msgText = errorMessage.querySelector('.msg-text');
                    if (msgText) msgText.textContent = 'Please fill in all required fields';
                    errorMessage.style.display = 'block';
                }
                return;
            }

            if (!agreeTerms) {
                if (errorMessage) {
                    const msgText = errorMessage.querySelector('.msg-text');
                    if (msgText) msgText.textContent = 'Please agree to the Terms of Service and Privacy Policy';
                    errorMessage.style.display = 'block';
                }
                return;
            }

            if (password.length < 6) {
                if (errorMessage) {
                    const msgText = errorMessage.querySelector('.msg-text');
                    if (msgText) msgText.textContent = 'Password must be at least 6 characters long';
                    errorMessage.style.display = 'block';
                }
                return;
            }

            if (password !== signupConfirmPassword) {
                if (errorMessage) {
                    const msgText = errorMessage.querySelector('.msg-text');
                    if (msgText) msgText.textContent = 'Passwords do not match';
                    errorMessage.style.display = 'block';
                }
                return;
            }

            const licenceNumber = parseInt(licenceNo);
            if (isNaN(licenceNumber) || licenceNumber < 1) {
                if (errorMessage) {
                    const msgText = errorMessage.querySelector('.msg-text');
                    if (msgText) msgText.textContent = 'Please enter a valid licence number';
                    errorMessage.style.display = 'block';
                }
                return;
            }

            // Validate mobile number using authService
            if (window.authService && typeof window.authService.validateMobileNumber === 'function') {
                const mobileValidation = window.authService.validateMobileNumber(mobile, countryCode);
                if (!mobileValidation.isValid) {
                    if (errorMessage) {
                        const msgText = errorMessage.querySelector('.msg-text');
                        if (msgText) msgText.textContent = `Mobile validation failed: ${mobileValidation.error}`;
                        errorMessage.style.display = 'block';
                    }
                    return;
                }
            } else {
                // Basic validation if authService not available
                if (!/^[0-9]{7,15}$/.test(mobile.replace(/\D/g, ''))) {
                    if (errorMessage) {
                        const msgText = errorMessage.querySelector('.msg-text');
                        if (msgText) msgText.textContent = 'Please enter a valid mobile number';
                        errorMessage.style.display = 'block';
                    }
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
                // Ensure payload is complete and formatted correctly
                const registrationPayload = {
                    username: username.toLowerCase(),
                    email: email.toLowerCase(),
                    licenceNo: licenceNumber,
                    password: password,
                    fullName: fullName,
                    countryCode: countryCode,
                    mobile: mobile.replace(/\D/g, '')
                };

                const response = await fetch(`${window.API_BASE_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(registrationPayload)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Registration failed');
                }

                if (successMessage) {
                    const msgText = successMessage.querySelector('.msg-text') || successMessage.querySelector('.msg-content');
                    if (msgText) msgText.textContent = '✅ Registration successful! Sending email OTP...';
                    successMessage.style.display = 'block';
                    successMessage.classList.remove('hidden');
                }

                // Store credentials for OTP verification
                localStorage.setItem('pendingVerificationUsername', registrationPayload.username);
                localStorage.setItem('pendingVerificationEmail', registrationPayload.email);
                localStorage.setItem('pendingVerificationLicence', registrationPayload.licenceNo);
                localStorage.setItem('pendingVerificationMobile', registrationPayload.mobile);
                localStorage.setItem('pendingVerificationCountryCode', registrationPayload.countryCode);

                // Explicitly send email OTP using username
                const emailOtpResponse = await fetch(`${window.API_BASE_URL}/auth/send-email-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: registrationPayload.username })
                });

                const emailOtpData = await emailOtpResponse.json();
                if (!emailOtpResponse.ok || emailOtpData.success === false) {
                    throw new Error(emailOtpData.message || 'Failed to send email OTP');
                }

                if (successMessage) {
                    const msgText = successMessage.querySelector('.msg-text') || successMessage.querySelector('.msg-content');
                    if (msgText) msgText.textContent = '✅ Email OTP sent! Please verify your account.';
                }

                setTimeout(() => {
                    if (window.router) {
                        window.router.navigate('verify-otp');
                    } else {
                        window.location.hash = '#verify-otp';
                        window.initializeOtpVerification(registrationPayload.username);
                    }
                }, 1500);

            } catch (error) {
                console.error('Signup error:', error);
                if (errorMessage) {
                    const msgText = errorMessage.querySelector('.msg-text') || errorMessage.querySelector('.msg-content');
                    if (msgText) msgText.textContent = error.message || 'Registration failed';
                    errorMessage.style.display = 'block';
                    errorMessage.classList.remove('hidden');
                    errorMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
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

        // OTP Timer — store on window so it can be cleaned up on navigation
        if (window._otpTimerInterval) clearInterval(window._otpTimerInterval);
        const timerInterval = setInterval(() => {
            const timerEl = document.getElementById('otpTimer');
            if (!timerEl) { clearInterval(timerInterval); window._otpTimerInterval = null; return; }
            if (timeLeft > 0) {
                timeLeft--;
                const mins = Math.floor(timeLeft / 60);
                const secs = timeLeft % 60;
                timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            } else {
                clearInterval(timerInterval);
                window._otpTimerInterval = null;
                timerEl.textContent = 'Expired';
                if (errorMessage && errorMessage.isConnected) {
                    errorMessage.querySelector('span:last-child').textContent = 'OTP has expired. Please request a new one.';
                    errorMessage.classList.remove('hidden');
                }
            }
        }, 1000);
        window._otpTimerInterval = timerInterval;

        // Resend Cooldown Timer
        const updateResendButton = () => {
            const resendTimerEl = document.getElementById('resendTimer');
            const resendCountdownEl = document.getElementById('resendCountdown');
            if (!resendTimerEl || !resendCountdownEl) return;
            if (resendCooldown > 0) {
                resendTimerEl.classList.remove('hidden');
                resendCountdownEl.textContent = resendCooldown;
                if (resendBtn) resendBtn.disabled = true;
            } else {
                resendTimerEl.classList.add('hidden');
                if (resendBtn) resendBtn.disabled = resendAttempts <= 0;
                canResend = resendAttempts > 0;
            }
        };

        const startResendCooldown = () => {
            resendCooldown = 60;
            updateResendButton();
            if (window._otpResendCooldownInterval) clearInterval(window._otpResendCooldownInterval);
            const cooldownInterval = setInterval(() => {
                if (!document.getElementById('resendTimer')) { clearInterval(cooldownInterval); window._otpResendCooldownInterval = null; return; }
                resendCooldown--;
                updateResendButton();
                if (resendCooldown <= 0) {
                    clearInterval(cooldownInterval);
                    window._otpResendCooldownInterval = null;
                }
            }, 1000);
            window._otpResendCooldownInterval = cooldownInterval;
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

                // Check if mobile is already verified
                if (data.mobileVerified) {
                    successMessage.querySelector('span:last-child').textContent = 'Email verified successfully! Mobile already verified. Redirecting to login...';
                    successMessage.classList.remove('hidden');

                    // Clear all pending verification data
                    localStorage.removeItem('pendingVerificationEmail');
                    localStorage.removeItem('pendingVerificationLicence');
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
                    return;
                }

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
        cleanupOtpTimers(); // Clear any previous timers
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
        const verifyText = verifyBtn ? verifyBtn.querySelector('.ds-btn-text') : null;
        const resendBtn = document.getElementById('mobile-resend-otp-btn');
        const resendText = resendBtn ? resendBtn.querySelector('.ds-btn-text') : null;
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
            if (window._mobileOtpTimerInterval) clearInterval(window._mobileOtpTimerInterval);
            timerInterval = setInterval(() => {
                if (!timerDisplay || !timerDisplay.isConnected) { clearInterval(timerInterval); window._mobileOtpTimerInterval = null; return; }
                timeLeft--;
                timerDisplay.textContent = formatTime(timeLeft);

                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    window._mobileOtpTimerInterval = null;
                    if (errorMessage && errorMessage.isConnected) {
                        errorMessage.querySelector('span:last-child').textContent = '⏰ OTP expired. Please request a new one.';
                        errorMessage.classList.remove('hidden');
                    }
                    if (verifyBtn) {
                        verifyBtn.disabled = true;
                        verifyBtn.classList.add('opacity-50', 'cursor-not-allowed');
                    }
                }
            }, 1000);
            window._mobileOtpTimerInterval = timerInterval;
        };

        // Start resend cooldown
        const startResendCooldown = () => {
            resendCooldown = 60;
            if (resendBtn) resendBtn.disabled = true;
            if (resendText) resendText.innerHTML = `Resend OTP in <span id="mobile-resend-countdown">${resendCooldown}</span>s`;

            if (window._mobileResendCooldownInterval) clearInterval(window._mobileResendCooldownInterval);
            resendInterval = setInterval(() => {
                resendCooldown--;
                const countdown = document.getElementById('mobile-resend-countdown');
                if (countdown) {
                    countdown.textContent = resendCooldown;
                }

                if (resendCooldown <= 0) {
                    clearInterval(resendInterval);
                    window._mobileResendCooldownInterval = null;
                    if (resendBtn) resendBtn.disabled = false;
                    if (resendText) resendText.textContent = '🔄 Resend OTP';
                }
            }, 1000);
            window._mobileResendCooldownInterval = resendInterval;
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
