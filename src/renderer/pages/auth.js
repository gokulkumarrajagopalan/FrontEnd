(function () {
    // Shared variables for state management
    let particlesAnimationId = null;

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

    const AUTH_SHARED_STYLES = `
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        html, body { height: 100%; overflow: hidden; }

        .auth-background {
            --a-blue:       #2563eb;
            --a-blue-deep:  #1d4ed8;
            --a-indigo:     #4f46e5;
            --a-blue-light: #eff6ff;
            --a-blue-mid:   #dbeafe;
            --a-ink:        #0f172a;
            --a-ink-2:      #334155;
            --a-ink-3:      #64748b;
            --a-ink-4:      #94a3b8;
            --a-white:      #ffffff;
            --a-surface:    #f8fafc;
            --a-border:     #e2e8f0;
            --a-border-2:   #cbd5e1;
            --a-green:      #10b981;

            font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif;
            height: 100vh;
            overflow: hidden;
            background: var(--a-white);
            color: var(--a-ink);
            -webkit-font-smoothing: antialiased;
        }

        /* Full-height shell, no scroll */
        .auth-shell {
            display: flex;
            height: 100vh;
            overflow: hidden;
        }

        /* ═══════════ LEFT HERO ═══════════ */
        .auth-hero {
            position: relative;
            width: 55%;
            height: 100vh;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 36px 52px;
            background:
                radial-gradient(ellipse 80% 60% at 0% 0%,   #c7d9ff 0%, transparent 55%),
                radial-gradient(ellipse 70% 60% at 100% 100%, #bdd0fc 0%, transparent 55%),
                linear-gradient(160deg, #e8f0fe 0%, #eef4ff 40%, #f5f8ff 100%);
        }

        /* Dot grid */
        .auth-hero::before {
            content: '';
            position: absolute;
            inset: 0;
            background-image: radial-gradient(circle, rgba(37,99,235,0.11) 1px, transparent 1px);
            background-size: 28px 28px;
            mask-image: radial-gradient(ellipse 85% 85% at 40% 40%, #000 30%, transparent 100%);
            -webkit-mask-image: radial-gradient(ellipse 85% 85% at 40% 40%, #000 30%, transparent 100%);
            z-index: 0;
        }

        /* Glowing orb */
        .auth-hero::after {
            content: '';
            position: absolute;
            top: -100px; left: -70px;
            width: 380px; height: 380px;
            background: radial-gradient(circle, rgba(99,130,255,0.20) 0%, transparent 70%);
            border-radius: 50%;
            z-index: 0;
            animation: auth-orb 6s ease-in-out infinite alternate;
        }

        @keyframes auth-orb {
            from { transform: scale(1);    opacity: 0.7; }
            to   { transform: scale(1.12); opacity: 1;   }
        }

        .auth-hero-content {
            position: relative;
            z-index: 2;
            max-width: 500px;
            width: 100%;
        }

        /* Brand lockup */
        .auth-lockup {
            display: flex;
            align-items: center;
            gap: 13px;
            margin-bottom: 22px;
        }

        .auth-lockup-mark {
            width: 44px; height: 44px;
            border-radius: 13px;
            box-shadow: 0 6px 18px -4px rgba(37,99,235,0.32);
            flex-shrink: 0;
            transition: transform 0.3s ease;
        }
        .auth-lockup-mark:hover { transform: scale(1.06) rotate(-2deg); }

        .auth-lockup-name {
            font-size: 1.35rem;
            font-weight: 800;
            letter-spacing: -0.03em;
            color: var(--a-ink);
            line-height: 1.1;
        }
        .auth-lockup-name span { color: var(--a-blue); }

        .auth-lockup-tag {
            font-size: 0.72rem;
            color: var(--a-ink-3);
            font-weight: 500;
            margin-top: 3px;
        }

        /* Badge */
        .auth-badge {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            padding: 5px 13px;
            border-radius: 999px;
            margin-bottom: 16px;
            background: rgba(37,99,235,0.08);
            border: 1px solid rgba(37,99,235,0.18);
            color: var(--a-blue-deep);
            font-size: 0.68rem;
            font-weight: 700;
            letter-spacing: 0.07em;
            text-transform: uppercase;
        }

        /* Headline */
        .auth-hero-title {
            font-size: 1.65rem;
            font-weight: 900;
            line-height: 1.15;
            letter-spacing: -0.03em;
            color: var(--a-ink);
            margin-bottom: 10px;
            white-space: nowrap;
        }

        .auth-hero-title .hl {
            background: linear-gradient(135deg, var(--a-blue) 0%, var(--a-indigo) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .auth-hero-sub {
            font-size: 0.84rem;
            line-height: 1.55;
            color: var(--a-ink-2);
            max-width: 52ch;
            margin-bottom: 24px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        /* Feature cards */
        .auth-feature-list {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 24px;
        }

        .auth-feature-card {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 14px 14px;
            background: rgba(255,255,255,0.70);
            border: 1px solid rgba(255,255,255,0.9);
            border-radius: 16px;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 6px 18px -10px rgba(37,99,235,0.12);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .auth-feature-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 4px 6px rgba(0,0,0,0.04), 0 16px 32px -12px rgba(37,99,235,0.2);
        }

        .auth-feature-icon {
            width: 32px; height: 32px;
            border-radius: 9px;
            background: linear-gradient(135deg, var(--a-blue-light) 0%, var(--a-blue-mid) 100%);
            color: var(--a-blue);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.85rem;
            box-shadow: 0 3px 6px -2px rgba(37,99,235,0.16);
        }

        .auth-feature-card h3 {
            font-size: 0.82rem;
            font-weight: 700;
            color: var(--a-ink);
            letter-spacing: -0.01em;
        }
        .auth-feature-card p {
            font-size: 0.76rem;
            color: var(--a-ink-3);
            line-height: 1.45;
        }

        /* Trust row */
        .auth-trust-row {
            display: flex;
            align-items: center;
            gap: 16px;
            flex-wrap: wrap;
        }
        .auth-trust-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.76rem;
            font-weight: 600;
            color: var(--a-ink-2);
        }
        .auth-trust-item i { color: var(--a-green); font-size: 0.78rem; }
        .auth-trust-divider { width: 1px; height: 14px; background: var(--a-border-2); }

        /* ═══════════ RIGHT PANEL ═══════════ */
        .auth-panel {
            width: 45%;
            height: 100vh;
            display: flex;
            flex-direction: column;
            padding: 40px 36px;
            background: var(--a-surface);
            position: relative;
            overflow-y: auto;
            overflow-x: hidden;
        }

        .auth-panel::before {
            content: '';
            position: absolute;
            bottom: -80px; right: -80px;
            width: 300px; height: 300px;
            background: radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%);
            border-radius: 50%;
        }

        .auth-panel-inner {
            width: 100%;
            max-width: 440px;
            margin: auto;
            position: relative;
            z-index: 1;
        }

        /* Card */
        .auth-card {
            background: var(--a-white);
            border: 1px solid var(--a-border);
            border-radius: 24px;
            padding: 32px 30px 28px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 20px 56px -14px rgba(0,0,0,0.10);
            position: relative;
            overflow: hidden;
        }

        /* Top accent bar */
        .auth-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--a-blue) 0%, var(--a-indigo) 100%);
            border-radius: 24px 24px 0 0;
        }

        /* Card logo */
        .auth-card-logo {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
        }
        .auth-card-logo img {
            width: 34px; height: 34px;
            border-radius: 10px;
            box-shadow: 0 3px 10px -2px rgba(37,99,235,0.22);
        }
        .auth-card-logo-name {
            font-weight: 800;
            font-size: 0.95rem;
            letter-spacing: -0.02em;
            color: var(--a-ink);
        }
        .auth-card-logo-name span { color: var(--a-blue); }

        /* Heading */
        .auth-heading { margin-bottom: 18px; }
        .auth-heading h2 {
            font-size: 1.2rem;
            font-weight: 800;
            color: var(--a-ink);
            letter-spacing: -0.025em;
            margin-bottom: 4px;
        }
        .auth-heading p {
            font-size: 0.78rem;
            color: var(--a-ink-3);
            line-height: 1.5;
        }

        /* Benefit list */
        .auth-benefit-list {
            list-style: none;
            margin-bottom: 20px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .auth-benefit-list li {
            display: flex;
            align-items: center;
            gap: 9px;
            font-size: 0.82rem;
            font-weight: 500;
            color: var(--a-ink-2);
        }
        .auth-benefit-list .benefit-icon {
            width: 20px; height: 20px;
            border-radius: 50%;
            background: linear-gradient(135deg, #dcfce7, #bbf7d0);
            color: #15803d;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.6rem;
            flex-shrink: 0;
        }

        /* SSO box */
        .auth-sso-box {
            background: linear-gradient(160deg, #f8faff 0%, #f0f6ff 100%);
            border: 1px solid rgba(37,99,235,0.12);
            border-radius: 16px;
            padding: 20px 18px;
            text-align: center;
            margin-bottom: 16px;
        }
        .auth-sso-box p {
            font-size: 0.81rem;
            color: var(--a-ink-3);
            line-height: 1.5;
            margin-bottom: 14px;
        }

        /* SSO button */
        .auth-sso-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 9px;
            width: 100%;
            padding: 13px 20px;
            background: linear-gradient(135deg, var(--a-blue) 0%, var(--a-indigo) 100%);
            color: #fff;
            font-family: 'Inter', sans-serif;
            font-size: 0.9rem;
            font-weight: 700;
            letter-spacing: -0.01em;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.22s ease;
            box-shadow: 0 4px 6px -1px rgba(37,99,235,0.25), 0 10px 22px -6px rgba(37,99,235,0.32);
            position: relative;
            overflow: hidden;
        }
        .auth-sso-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 8px -1px rgba(37,99,235,0.30), 0 18px 30px -6px rgba(37,99,235,0.38);
            background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
        }
        .auth-sso-btn:active { transform: translateY(0); }

        /* Shimmer */
        .auth-sso-btn::after {
            content: '';
            position: absolute;
            top: 0; left: -100%;
            width: 60%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent);
            transform: skewX(-20deg);
            animation: auth-shimmer 3.5s ease-in-out infinite;
        }
        @keyframes auth-shimmer {
            0%  { left: -100%; }
            40% { left: 140%; }
            100%{ left: 140%; }
        }

        /* ds-btn-primary override */
        .auth-background .ds-btn-primary {
            background: linear-gradient(135deg, var(--a-blue) 0%, var(--a-indigo) 100%);
            color: #fff;
            border: none;
            border-radius: 12px;
            font-weight: 700;
            box-shadow: 0 4px 6px -1px rgba(37,99,235,0.25);
        }
        .auth-background .ds-btn-primary:hover:not(:disabled) {
            transform: translateY(-2px);
            background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
        }

        /* Secure note */
        .auth-secure-note {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: 0.73rem;
            color: var(--a-ink-4);
            font-weight: 500;
        }
        .auth-secure-note i { color: var(--a-ink-3); }

        /* Misc */
        .auth-loading {
            padding: 10px;
            border-radius: 10px;
            background: var(--a-surface);
            border: 1px solid var(--a-border);
        }
        .auth-link-btn { color: var(--a-blue); font-weight: 600; text-decoration: none; }
        .auth-link-btn:hover { text-decoration: underline; }

        /* Responsive: hide hero on small screens */
        @media (max-width: 860px) {
            .auth-hero  { display: none; }
            .auth-panel { width: 100%; }
        }

        /* Grid layout for form fields */
        .auth-field-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
        }
        @media (max-width: 600px) {
            .auth-field-grid { grid-template-columns: 1fr; }
        }

        /* Refresh License Button inside input */
        .auth-refresh-btn {
            background: transparent !important;
            color: var(--ds-text-tertiary) !important;
            border: none !important;
            border-radius: 8px !important;
            width: 32px !important; height: 32px !important;
            display: flex !important; align-items: center !important; justify-content: center !important;
            cursor: pointer !important; transition: background 0.2s ease, color 0.2s ease !important;
            box-shadow: none !important;
        }
        .auth-refresh-btn:hover {
            background: var(--ds-bg-surface-hover) !important;
            color: var(--ds-primary-600) !important;
            box-shadow: none !important;
        }
    </style>
`;

    // ============= DUAL-MODE LOGIN TEMPLATE =============
    const getLoginTemplate = () => `
    ${AUTH_SHARED_STYLES}
    <div class="auth-background">
      <div class="auth-shell">

        <!-- ═══ LEFT HERO ═══ -->
        <div class="auth-hero">
          <div class="auth-hero-content">

            <div class="auth-lockup">
              <img class="auth-lockup-mark" src="assets/brand/talliffy-icon.png" alt="Talliffy" />
              <div>
                <div class="auth-lockup-name">Talli<span>ffy</span></div>
                <div class="auth-lockup-tag">Tally, reimagined for the cloud</div>
              </div>
            </div>

            <div class="auth-badge">
              <i class="fas fa-shield-alt"></i>
              NEXT-GEN AUTHENTICATION
            </div>

            <h1 class="auth-hero-title">
              The future of <span class="hl">Tally Operations</span> is here.
            </h1>
            <p class="auth-hero-sub">Keep your books in sync, open live reports from anywhere, and make faster decisions — all from one secure workspace built on Tally.</p>

            <div class="auth-feature-list">
              <div class="auth-feature-card">
                <div class="auth-feature-icon"><i class="fas fa-sync-alt"></i></div>
                <div>
                  <h3>Continuous Sync</h3>
                  <p>Tally data stays current, automatically.</p>
                </div>
              </div>
              <div class="auth-feature-card">
                <div class="auth-feature-icon"><i class="fas fa-cloud"></i></div>
                <div>
                  <h3>Work Anywhere</h3>
                  <p>Access reports from any modern browser.</p>
                </div>
              </div>
              <div class="auth-feature-card">
                <div class="auth-feature-icon"><i class="fas fa-bolt"></i></div>
                <div>
                  <h3>Faster Decisions</h3>
                  <p>Turn vouchers into insights in seconds.</p>
                </div>
              </div>
              <div class="auth-feature-card">
                <div class="auth-feature-icon"><i class="fas fa-building"></i></div>
                <div>
                  <h3>Multi-Company</h3>
                  <p>Manage unlimited Tally companies.</p>
                </div>
              </div>
            </div>

            <div class="auth-trust-row">
              <div class="auth-trust-item"><i class="fas fa-lock"></i> Bank-grade encryption</div>
              <div class="auth-trust-divider"></div>
              <div class="auth-trust-item"><i class="fas fa-bolt"></i> Real-time sync</div>
              <div class="auth-trust-divider"></div>
              <div class="auth-trust-item"><i class="fas fa-headset"></i> Priority support</div>
            </div>

          </div>
        </div>

        <!-- ═══ RIGHT PANEL ═══ -->
        <div class="auth-panel">
          <div class="auth-panel-inner">
            <div class="auth-card">
              <div id="signinForm">

                <div class="auth-card-logo">
                  <img src="assets/brand/talliffy-icon.png" alt="Talliffy" />
                  <span class="auth-card-logo-name">Talli<span>ffy</span></span>
                </div>

                <div class="auth-heading">
                  <h2>Welcome back</h2>
                  <p>Pick up where your team left off with a cleaner, faster workspace.</p>
                </div>

                <div id="errorMessage" class="hidden" style="margin-bottom:14px;padding:12px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;color:#b91c1c;font-size:0.82rem;display:flex;align-items:center;gap:8px;">
                  <i class="fas fa-exclamation-triangle"></i><span class="msg-text"></span>
                </div>
                <div id="successMessage" class="hidden" style="margin-bottom:14px;padding:12px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;color:#15803d;font-size:0.82rem;display:flex;align-items:center;gap:8px;">
                  <i class="fas fa-check-circle"></i><span class="msg-text"></span>
                </div>

                <form id="loginForm" style="display:flex;flex-direction:column;gap:14px;">
                  <div>
                    <label style="display:block;font-size:0.74rem;font-weight:700;color:var(--a-ink-2);margin-bottom:6px;">Username</label>
                    <div style="position:relative;">
                      <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--a-ink-4);"><i class="fas fa-user"></i></span>
                      <input id="username" name="username" type="text" autocomplete="username" placeholder="Enter your Username" required
                        style="width:100%;padding:12px 14px 12px 40px;border:1px solid var(--a-border);border-radius:12px;background:var(--a-surface);font-size:0.85rem;color:var(--a-ink);outline:none;" />
                    </div>
                  </div>

                  <div>
                    <label style="display:block;font-size:0.74rem;font-weight:700;color:var(--a-ink-2);margin-bottom:6px;">Password</label>
                    <div style="position:relative;">
                      <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--a-ink-4);"><i class="fas fa-lock"></i></span>
                      <input id="password" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required
                        style="width:100%;padding:12px 40px 12px 40px;border:1px solid var(--a-border);border-radius:12px;background:var(--a-surface);font-size:0.85rem;color:var(--a-ink);outline:none;" />
                      <span id="toggleLoginPassword" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);cursor:pointer;color:var(--a-ink-4);"><i class="fas fa-eye"></i></span>
                    </div>
                  </div>

                  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                    <label style="display:flex;align-items:center;gap:8px;font-size:0.76rem;color:var(--a-ink-2);cursor:pointer;">
                      <input type="checkbox" id="rememberMe" style="width:16px;height:16px;" /> Remember me on this device
                    </label>
                    <a href="#" id="forgotPasswordLink" class="auth-link-btn" style="font-size:0.76rem;">Forgot password?</a>
                  </div>

                  <div id="loadingSpinner" class="hidden auth-loading" style="text-align:center;">Signing in…</div>

                  <button id="loginBtn" type="submit" class="ds-btn-primary" style="width:100%;padding:13px 20px;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
                    <i class="fas fa-right-to-bracket"></i> Sign In
                  </button>
                </form>

                <div class="auth-secure-note" style="margin-top:14px;">
                  <i class="fas fa-lock"></i>
                  Shared accounts &amp; data
                </div>

                <div style="margin-top:18px;text-align:center;padding-top:16px;border-top:1px solid var(--a-border);">
                  <p style="font-size:0.78rem;color:var(--a-ink-3);">New to Talliffy?
                    <a href="#" id="signupPromptBtn" class="auth-link-btn" style="margin-left:4px;">Create an account</a>
                  </p>
                </div>

              </div>
              <div id="signupFormContainer" class="hidden"></div>
            </div>
          </div>
        </div>

      </div>
    </div>
`;

    // ============= REGISTRATION FORM CONTENT ONLY =============
    const getSignupFormContent = () => `
                    <div class="auth-heading">
                        <h2>Create your account</h2>
                        <p>Set up a polished Talliffy workspace for your team in a few quick steps.</p>
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
                        <div class="auth-field-grid">
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

                        <div class="auth-field-grid">
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
        suffix: `<button type="button" id="refreshLicenseBtn" class="auth-refresh-btn" aria-label="Refresh licence number"><i class="fas fa-sync-alt"></i></button>`
    })}
                            </div>
                        </div>

                        <div class="auth-field-grid">
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

                        <div>
                            <label style="display: block; font-size: var(--ds-text-xs); font-weight: var(--ds-weight-bold); color: var(--ds-text-secondary); margin-bottom: var(--ds-space-1-5);">Country</label>
                            <div style="position: relative;">
                                <span style="position: absolute; left: var(--ds-space-4); top: 50%; transform: translateY(-50%); color: var(--ds-text-tertiary);"><i class="fas fa-money-bill-wave"></i></span>
                                <select id="signupCountry" style="width: 100%; padding: var(--ds-space-3) var(--ds-space-4) var(--ds-space-3) var(--ds-space-10); border-radius: var(--ds-radius-xl); border: 2px solid var(--ds-border-default); background: var(--ds-bg-surface); font-size: var(--ds-text-sm); color: var(--ds-text-primary); transition: all var(--ds-duration-fast); appearance: none;">
                                    <option value="IN" selected>India (₹ INR)</option>
                                    <option value="AE">United Arab Emirates (د.إ AED)</option>
                                    <option value="US">United States ($ USD)</option>
                                    <option value="GB">United Kingdom ($ USD)</option>
                                    <option value="SG">Singapore ($ USD)</option>
                                    <option value="OT">Other ($ USD)</option>
                                </select>
                                <span style="position: absolute; right: var(--ds-space-4); top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--ds-text-tertiary);"><i class="fas fa-chevron-down" style="font-size: 10px;"></i></span>
                            </div>
                            <p style="font-size: var(--ds-text-2xs); color: var(--ds-text-tertiary); margin-top: 4px;">Sets your billing currency.</p>
                        </div>

                        <div class="auth-field-grid">
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

                        <div class="auth-panel-note">
                            <label style="display: flex; align-items: flex-start; gap: var(--ds-space-3); cursor: pointer;">
                                <input type="checkbox" id="signupAgreeTerms" style="width: 18px; height: 18px; border-radius: var(--ds-radius-sm); border: 2px solid var(--ds-border-default); margin-top: 2px;" required>
                                <span style="font-size: var(--ds-text-xs); color: var(--ds-text-secondary); line-height: 1.6;">I agree to the <a href="#" id="signupTermsLink" class="auth-link-btn">Terms of Service</a> and <a href="#" id="signupPrivacyLink" class="auth-link-btn">Privacy Policy</a>.</span>
                            </label>
                        </div>

                        <div id="loadingSpinner" class="hidden auth-loading" style="text-align: center;">
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
                            <a href="#" id="showLogin" class="auth-link-btn" style="margin-left: var(--ds-space-1);">Sign In</a>
                        </p>
                    </div>
    `;

    // ============= REGISTRATION TEMPLATE =============
    const getSignupTemplate = () => `
    ${AUTH_SHARED_STYLES}
    <div class="auth-background" style="overflow: hidden;">
        <div class="auth-shell">
            <div class="auth-hero">
                <canvas id="particlesCanvas" style="position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1;"></canvas>
                <div class="auth-hero-content">
                    <div class="auth-brand">
                        <div class="auth-brand-mark">
                            <img src="assets/brand/talliffy-icon.png" alt="Talliffy logo" />
                        </div>
                        <div class="auth-brand-copy">
                            <h1>Talliffy</h1>
                            <p>Cloud sync platform</p>
                        </div>
                    </div>

                    <div class="auth-badge">
                        <i class="fas fa-bolt"></i>
                        Setup that feels current from the first screen
                    </div>

                    <h2 class="auth-hero-title">Bring your client into a sharper, more premium Talliffy experience.</h2>
                    <p class="auth-hero-copy">Get the account live quickly, auto-pull licence details, and keep the whole onboarding flow feeling polished and trustworthy.</p>

                    <div class="auth-feature-list">
                        <div class="auth-feature-card">
                            <div class="auth-feature-icon">
                                <i class="fas fa-bolt"></i>
                            </div>
                            <div>
                                <h3>Quick setup</h3>
                                <p>Clear fields, better spacing, and fewer rough edges while registering new accounts.</p>
                            </div>
                        </div>
                        <div class="auth-feature-card">
                            <div class="auth-feature-icon">
                                <i class="fas fa-sync-alt"></i>
                            </div>
                            <div>
                                <h3>Automated syncing</h3>
                                <p>Real-time data foundations and a much more current brand feel throughout the first-run journey.</p>
                            </div>
                        </div>
                    </div>

                    <div class="auth-footer-copy">(c) 2026 Talliffy. Modernizing Tally access.</div>
                </div>
            </div>

            <div class="auth-panel auth-panel-scroll">
                <div class="auth-panel-inner auth-panel-wide" style="padding: var(--ds-space-4) 0;">
                    <div class="auth-card">
                        ${getSignupFormContent()}
                    </div>
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
    ${AUTH_SHARED_STYLES}
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
    ${AUTH_SHARED_STYLES}
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
        } else if (currentHash === 'forgot-password') {
            window.initializeForgotPassword();
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

            // Wire the embedded signup's "Sign In" link back to the credential form
            const showLogin = document.getElementById('showLogin');
            const signinFormEl = document.getElementById('signinForm');
            if (showLogin && signinFormEl) {
                showLogin.addEventListener('click', (e) => {
                    e.preventDefault();
                    signupFormContainer.classList.add('hidden');
                    signupFormContainer.style.display = 'none';
                    signinFormEl.classList.remove('hidden');
                    signinFormEl.style.display = 'block';
                });
            }
        }

        // Tab switching between Sign In and Sign Up
        const signinTab = document.getElementById('signinTab');
        const signupTab = document.getElementById('signupTab');
        const signinForm = document.getElementById('signinForm');
        signupFormContainer = document.getElementById('signupFormContainer');

        // Helper function to set active tab styling
        function setActiveTab(activeTab, inactiveTab) {
            // Quiet Ledger: neutral graphite-ink tab states (no blue)
            activeTab.style.background = '#ffffff';
            activeTab.style.color = '#1c1917';
            activeTab.style.boxShadow = '0 1px 2px rgba(28, 25, 23, 0.06), 0 0 0 1px #e7e5e4';
            activeTab.style.border = '1px solid transparent';
            activeTab.style.borderRadius = '10px';
            activeTab.style.transform = 'translateY(0)';

            inactiveTab.style.background = 'transparent';
            inactiveTab.style.color = '#8a8a85';
            inactiveTab.style.boxShadow = 'none';
            inactiveTab.style.border = '1px solid transparent';
            inactiveTab.style.borderRadius = '10px';
            inactiveTab.style.transform = 'translateY(0)';
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

            // Supporting sign-up prompt row beneath the card mirrors the Sign Up tab
            const signupPromptBtn = document.getElementById('signupPromptBtn');
            if (signupPromptBtn) {
                signupPromptBtn.addEventListener('click', () => {
                    signupTab.click();
                });
            }
        }

                        // Handle login mode toggle (legacy fall-back)
        const usernameMode = document.getElementById('loginModeUsername');
        const emailMode = document.getElementById('loginModeEmail');
        const usernameFields = document.getElementById('usernameFields');
        const emailFields = document.getElementById('emailFields');

        if (usernameMode && emailMode && usernameFields && emailFields) {
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
        }
    };

    // Function to fetch and populate license number in login page
    async function fetchAndPopulateLicenseNumberForLogin() {
        try {
            const licenceNoInput = document.getElementById('loginLicenceNo');
            if (!licenceNoInput) return;
            if (licenceNoInput.value && licenceNoInput.value.trim() !== '') return;

            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            const tallyPort = appSettings.tallyPort || 9000;

            if (window.electronAPI && window.electronAPI.invoke) {
                const response = await window.electronAPI.invoke('fetch-license', { tallyPort });
                if (response.success && response.data && response.data.license_number) {
                    const licenseNumber = response.data.license_number;
                    licenceNoInput.value = licenseNumber;
                    licenceNoInput.style.background = '#f0fdf4';
                }
            }
        } catch (error) {
            console.error('Error fetching license number for login:', error);
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
        setupSignupForm();
        fetchAndPopulateLicenseNumber();

        const showLogin = document.getElementById('showLogin');
        if (showLogin) {
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.hash = '#login'; window.initializeLogin();
            });
        }
    };

    async function fetchAndPopulateLicenseNumber() {
        try {
            const licenceNoInput = document.getElementById('signupLicenceNo');
            if (!licenceNoInput) return;
            if (licenceNoInput.value && licenceNoInput.value.trim() !== '') return;

            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            const tallyPort = appSettings.tallyPort || 9000;

            if (window.electronAPI && window.electronAPI.invoke) {
                const response = await window.electronAPI.invoke('fetch-license', { tallyPort });
                if (response.success && response.data && response.data.license_number) {
                    const licenseNumber = response.data.license_number;
                    licenceNoInput.value = licenseNumber;
                    licenceNoInput.style.background = '#f0fdf4';
                }
            }
        } catch (error) {
            console.error('Error fetching license number:', error);
        }
    }

    // Populate the billing-country <select> from the backend (DB-driven).
    // Falls back silently to the static options already in the markup.
    async function populateSignupCountries() {
        try {
            const sel = document.getElementById('signupCountry');
            if (!sel || !window.publicApiService) return;
            const resp = await window.publicApiService.get('/subscription/countries');
            const list = (resp && resp.data && resp.data.data) || (resp && resp.data) || [];
            if (!Array.isArray(list) || list.length === 0) return;
            const current = sel.value;
            sel.innerHTML = list.map(c =>
                `<option value="${c.code}">${c.name} (${c.symbol} ${c.currency})</option>`
            ).join('');
            if (current && list.some(c => c.code === current)) sel.value = current;
        } catch (e) {
            // keep static fallback options
        }
    }

    // ============= PARTICLES ANIMATION =============
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
                        ctx.strokeStyle = `rgba(245, 245, 244, ${opacity})`;
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
                window.location.hash = '#login'; window.initializeLogin();
            });
        }
    };

    // ============= FORGOT PASSWORD TEMPLATE =============
    const getForgotPasswordTemplate = () => `
    ${AUTH_SHARED_STYLES}
    <div class="auth-background" style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: var(--ds-bg-app); padding: var(--ds-space-6);">
        <div style="width: 100%; max-width: 440px; position: relative; z-index: 10;">
            <div style="text-align: center; margin-bottom: var(--ds-space-8);">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: var(--ds-radius-2xl); background: white; box-shadow: var(--ds-shadow-lg); margin-bottom: var(--ds-space-4);">
                    <img src="assets/brand/talliffy-icon.png" style="width: 48px; height: 48px; border-radius: var(--ds-radius-lg);" />
                </div>
                <h1 style="font-size: var(--ds-text-3xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin: 0;">
                    Talli<span style="color: var(--ds-primary-600);">ffy</span>
                </h1>
                <p style="font-size: var(--ds-text-sm); color: var(--ds-text-tertiary); margin-top: var(--ds-space-2);">Reset Your Password</p>
            </div>

            <div style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-3xl); border: 1px solid var(--ds-border-default); padding: var(--ds-space-10); box-shadow: var(--ds-shadow-xl);">
                <div id="forgotIntro" style="text-align: center; margin-bottom: var(--ds-space-8);">
                    <p id="forgotSubtitle" style="font-size: var(--ds-text-sm); color: var(--ds-text-tertiary); margin: 0;">Enter your registered email to receive a reset code.</p>
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

                <form id="forgotEmailForm" style="display: flex; flex-direction: column; gap: var(--ds-space-6);">
                    <div>
                        <label style="display:block;font-size:0.8rem;font-weight:var(--ds-weight-bold);color:var(--ds-text-secondary);margin-bottom:6px;">Email Address</label>
                        <input id="forgotEmail" name="email" type="email" autocomplete="email" placeholder="you@company.com" required
                            style="width:100%;padding:12px 14px;font-size:0.9rem;border-radius:var(--ds-radius-xl);border:2px solid var(--ds-border-default);background:var(--ds-bg-surface);color:var(--ds-text-primary);" />
                    </div>
                    <div id="loadingSpinner" class="hidden" style="text-align:center;">${window.UIComponents.spinner({ size: 'md' })}</div>
                    ${window.UIComponents.button({ id: 'sendCodeBtn', text: 'Send Reset Code', icon: '<i class="fas fa-paper-plane"></i>', variant: 'primary', fullWidth: true, size: 'lg', type: 'submit' })}
                </form>

                <form id="forgotResetForm" class="hidden" style="display: flex; flex-direction: column; gap: var(--ds-space-6);">
                    <div>
                        <label style="display:block;font-size:0.8rem;font-weight:var(--ds-weight-bold);color:var(--ds-text-secondary);margin-bottom:6px;">Reset Code</label>
                        <input id="forgotOtp" name="otp" type="text" inputmode="numeric" maxlength="6" placeholder="Enter 6-digit code" required
                            style="width:100%;padding:12px 14px;font-size:0.9rem;letter-spacing:4px;border-radius:var(--ds-radius-xl);border:2px solid var(--ds-border-default);background:var(--ds-bg-surface);color:var(--ds-text-primary);" />
                    </div>
                    <div>
                        <label style="display:block;font-size:0.8rem;font-weight:var(--ds-weight-bold);color:var(--ds-text-secondary);margin-bottom:6px;">New Password</label>
                        <div style="position:relative;">
                            <input id="forgotNewPassword" name="newPassword" type="password" autocomplete="new-password" placeholder="At least 8 characters" required
                                style="width:100%;padding:12px 40px 12px 14px;font-size:0.9rem;border-radius:var(--ds-radius-xl);border:2px solid var(--ds-border-default);background:var(--ds-bg-surface);color:var(--ds-text-primary);" />
                            <span id="toggleForgotPassword" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);cursor:pointer;color:var(--a-ink-4);"><i class="fas fa-eye"></i></span>
                        </div>
                    </div>
                    <div>
                        <label style="display:block;font-size:0.8rem;font-weight:var(--ds-weight-bold);color:var(--ds-text-secondary);margin-bottom:6px;">Confirm Password</label>
                        <input id="forgotConfirmPassword" name="confirmPassword" type="password" autocomplete="new-password" placeholder="Re-enter new password" required
                            style="width:100%;padding:12px 14px;font-size:0.9rem;border-radius:var(--ds-radius-xl);border:2px solid var(--ds-border-default);background:var(--ds-bg-surface);color:var(--ds-text-primary);" />
                    </div>
                    <div id="loadingSpinnerReset" class="hidden" style="text-align:center;">${window.UIComponents.spinner({ size: 'md' })}</div>
                    ${window.UIComponents.button({ id: 'resetBtn', text: 'Reset Password', icon: '<i class="fas fa-key"></i>', variant: 'primary', fullWidth: true, size: 'lg', type: 'submit' })}
                    <div style="text-align:center;">
                        <button type="button" id="resendResetCode" style="background:none;border:none;font-size:var(--ds-text-sm);font-weight:var(--ds-weight-bold);color:var(--ds-primary-600);cursor:pointer;padding:0;">Resend Code</button>
                    </div>
                </form>

                <div style="margin-top: var(--ds-space-6); text-align: center;">
                    <a href="#" id="backToLogin" style="font-size: var(--ds-text-sm); font-weight: var(--ds-weight-medium); color: var(--ds-text-secondary); text-decoration: none;">← Back to Sign In</a>
                </div>
            </div>
        </div>
    </div>
    `;

    window.initializeForgotPassword = function () {
        console.log('Initializing Forgot Password Page...');
        cleanupOtpTimers();
        stopParticles();
        const pageContent = document.getElementById('page-content');
        const target = pageContent || document.body;
        target.innerHTML = getForgotPasswordTemplate();

        const emailForm = document.getElementById('forgotEmailForm');
        const resetForm = document.getElementById('forgotResetForm');
        const subtitle = document.getElementById('forgotSubtitle');
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');
        const emailInput = document.getElementById('forgotEmail');
        let resetEmail = '';
        let resendCooldown = 0;

        const showError = (msg) => {
            if (!errorMessage) return;
            const span = errorMessage.querySelector('.msg-text');
            if (span) span.textContent = msg;
            errorMessage.classList.remove('hidden');
            if (successMessage) successMessage.classList.add('hidden');
        };
        const showSuccess = (msg) => {
            if (!successMessage) return;
            const span = successMessage.querySelector('.msg-text');
            if (span) span.textContent = msg;
            successMessage.classList.remove('hidden');
            if (errorMessage) errorMessage.classList.add('hidden');
        };

        const sendCode = async () => {
            const email = (emailInput && emailInput.value || '').trim();
            if (!email) { showError('Please enter your email address.'); return false; }
            const sendBtn = document.getElementById('sendCodeBtn');
            const spinner = document.getElementById('loadingSpinner');
            if (sendBtn) sendBtn.disabled = true;
            if (spinner) spinner.classList.remove('hidden');
            try {
                const res = await window.authService.forgotPassword(email);
                if (res.success) {
                    resetEmail = email;
                    showSuccess(res.message || 'Reset code sent to your email.');
                    if (window.notificationService) window.notificationService.success('Reset code sent to your email.');
                    emailForm.classList.add('hidden');
                    resetForm.classList.remove('hidden');
                    if (subtitle) subtitle.textContent = 'We sent a code to ' + email + '. Enter it below with your new password.';
                    return true;
                }
                showError(res.message || 'Failed to send reset code.');
                return false;
            } catch (err) {
                showError(err.message || 'Failed to send reset code.');
                return false;
            } finally {
                if (sendBtn) sendBtn.disabled = false;
                if (spinner) spinner.classList.add('hidden');
            }
        };

        if (emailForm) {
            emailForm.addEventListener('submit', (e) => { e.preventDefault(); sendCode(); });
        }

        // Show/Hide new password
        const togglePw = document.getElementById('toggleForgotPassword');
        const newPwInput = document.getElementById('forgotNewPassword');
        if (togglePw && newPwInput) {
            togglePw.addEventListener('click', () => {
                const isText = newPwInput.type === 'text';
                newPwInput.type = isText ? 'password' : 'text';
                togglePw.innerHTML = isText ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
            });
        }

        if (resetForm) {
            resetForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const otp = (document.getElementById('forgotOtp').value || '').trim();
                const newPassword = document.getElementById('forgotNewPassword').value || '';
                const confirmPassword = document.getElementById('forgotConfirmPassword').value || '';

                if (!otp) { showError('Please enter the reset code.'); return; }
                if (newPassword.length < 8) { showError('Password must be at least 8 characters.'); return; }
                if (newPassword !== confirmPassword) { showError('Passwords do not match.'); return; }

                const resetBtn = document.getElementById('resetBtn');
                const spinner = document.getElementById('loadingSpinnerReset');
                if (resetBtn) resetBtn.disabled = true;
                if (spinner) spinner.classList.remove('hidden');
                try {
                    const res = await window.authService.resetPassword(resetEmail, otp, newPassword);
                    if (res.success) {
                        showSuccess('Password reset successfully! Redirecting to login...');
                        if (window.notificationService) window.notificationService.success('Password reset successfully! Please log in.');
                        setTimeout(() => {
                            window.location.hash = '#login';
                            window.initializeLogin();
                        }, 1500);
                    } else {
                        showError(res.message || 'Failed to reset password.');
                    }
                } catch (err) {
                    showError(err.message || 'Failed to reset password.');
                } finally {
                    if (resetBtn) resetBtn.disabled = false;
                    if (spinner) spinner.classList.add('hidden');
                }
            });
        }

        // Resend code with 60s cooldown
        const resendBtn = document.getElementById('resendResetCode');
        if (resendBtn) {
            resendBtn.addEventListener('click', async () => {
                if (resendCooldown > 0) return;
                const ok = await sendCode();
                if (ok) {
                    resendCooldown = 60;
                    const tick = () => {
                        if (resendCooldown <= 0) {
                            resendBtn.textContent = 'Resend Code';
                            resendBtn.disabled = false;
                            return;
                        }
                        resendBtn.disabled = true;
                        resendBtn.textContent = 'Resend in ' + resendCooldown + 's';
                        resendCooldown -= 1;
                        setTimeout(tick, 1000);
                    };
                    tick();
                }
            });
        }

        // Back to login
        const backToLogin = document.getElementById('backToLogin');
        if (backToLogin) {
            backToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.hash = '#login';
                window.initializeLogin();
            });
        }
    };

    // ============= DUAL-MODE LOGIN FORM SETUP =============
    function setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');
        const loadingSpinner = document.getElementById('loadingSpinner');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const rememberMeCheckbox = document.getElementById('rememberMe');

        const showError = (msg) => {
            if (!errorMessage) return;
            const span = errorMessage.querySelector('.msg-text');
            if (span) span.textContent = msg;
            errorMessage.classList.remove('hidden');
            if (successMessage) successMessage.classList.add('hidden');
        };
        const showSuccess = (msg) => {
            if (!successMessage) return;
            const span = successMessage.querySelector('.msg-text');
            if (span) span.textContent = msg;
            successMessage.classList.remove('hidden');
            if (errorMessage) errorMessage.classList.add('hidden');
        };

        // Auto-populate remembered credentials
        if (localStorage.getItem('rememberMe') === 'true') {
            const savedUsername = localStorage.getItem('rememberedUsername');
            const savedPasswordEncrypted = localStorage.getItem('rememberedPasswordEncrypted');
            if (savedUsername && usernameInput) {
                usernameInput.value = savedUsername;
                if (rememberMeCheckbox) rememberMeCheckbox.checked = true;
            }
            if (savedPasswordEncrypted && passwordInput) {
                const decrypted = decryptPassword(savedPasswordEncrypted);
                if (decrypted) passwordInput.value = decrypted;
            }
        }

        if (rememberMeCheckbox) {
            rememberMeCheckbox.addEventListener('change', (e) => {
                if (!e.target.checked) {
                    localStorage.removeItem('rememberMe');
                    localStorage.removeItem('rememberedUsername');
                    localStorage.removeItem('rememberedPasswordHash');
                    localStorage.removeItem('rememberedPasswordEncrypted');
                }
            });
        }

        // Show/Hide password toggle
        const toggleLoginPassword = document.getElementById('toggleLoginPassword');
        if (toggleLoginPassword && passwordInput) {
            toggleLoginPassword.addEventListener('click', () => {
                const isText = passwordInput.type === 'text';
                passwordInput.type = isText ? 'password' : 'text';
                toggleLoginPassword.innerHTML = isText ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
            });
        }

        // "Create an account" → reveal the embedded signup form
        const signupPromptBtn = document.getElementById('signupPromptBtn');
        const signinForm = document.getElementById('signinForm');
        const signupFormContainer = document.getElementById('signupFormContainer');
        if (signupPromptBtn && signinForm && signupFormContainer) {
            signupPromptBtn.addEventListener('click', (e) => {
                e.preventDefault();
                signinForm.classList.add('hidden');
                signinForm.style.display = 'none';
                signupFormContainer.classList.remove('hidden');
                signupFormContainer.style.display = 'block';
                setTimeout(() => fetchAndPopulateLicenseNumber(), 100);
            });
        }

        // "Forgot password?" → reset-password flow
        const forgotPasswordLink = document.getElementById('forgotPasswordLink');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.hash = '#forgot-password';
                window.initializeForgotPassword();
            });
        }

        // Real-time validation
        if (typeof FormValidator !== 'undefined' && FormValidator.attach) {
            FormValidator.attach('username', 'required');
            FormValidator.attach('password', 'required');
        }

        if (!loginForm) return;

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = (usernameInput && usernameInput.value || '').trim();
            const password = (passwordInput && passwordInput.value) || '';

            if (!username || !password) {
                showError('Please enter your username and password.');
                return;
            }

            const loginBtn = document.getElementById('loginBtn');
            const originalBtnHtml = loginBtn ? loginBtn.innerHTML : '';
            if (loginBtn) { loginBtn.disabled = true; loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...'; }
            if (loadingSpinner) loadingSpinner.classList.remove('hidden');
            if (errorMessage) errorMessage.classList.add('hidden');

            try {
                const result = await window.authService.login(username, password);
                if (!result || !result.success) {
                    throw new Error((result && result.message) || 'Login failed');
                }

                // Check if mobile is verified
                if (result.mobileVerified === false || result.mobileVerified === 'N') {
                    showError('Mobile number not verified. Redirecting to verification...');
                    if (loginBtn) { loginBtn.disabled = false; loginBtn.innerHTML = originalBtnHtml; }
                    if (loadingSpinner) loadingSpinner.classList.add('hidden');
                    
                    localStorage.setItem('pendingVerificationUsername', username);
                    localStorage.setItem('pendingVerificationMobile', result.mobile || '');
                    localStorage.setItem('pendingVerificationCountryCode', result.countryCode || '');
                    
                    // Trigger mobile OTP
                    try {
                        await window.publicApiService.post('/sns/send-mobile-otp', { username });
                    } catch (e) {
                        console.error('Failed to send mobile OTP during login redirect:', e);
                    }
                    
                    setTimeout(() => {
                        window.location.hash = '#verify-mobile-otp';
                        const fullMobile = result.mobile && result.mobile.startsWith('+') ? result.mobile : `${result.countryCode || '+91'}${result.mobile || ''}`;
                        window.initializeMobileOtpVerification(fullMobile, username);
                    }, 1500);
                    return;
                }

                // Persist credentials when "Remember me" is checked
                if (rememberMeCheckbox && rememberMeCheckbox.checked) {
                    localStorage.setItem('rememberMe', 'true');
                    localStorage.setItem('rememberedUsername', username);
                    const enc = encryptPassword(password);
                    if (enc) localStorage.setItem('rememberedPasswordEncrypted', enc);
                    const hash = await hashPassword(password);
                    if (hash) localStorage.setItem('rememberedPasswordHash', hash);
                } else {
                    localStorage.removeItem('rememberMe');
                    localStorage.removeItem('rememberedUsername');
                    localStorage.removeItem('rememberedPasswordHash');
                    localStorage.removeItem('rememberedPasswordEncrypted');
                }

                showSuccess('Login successful! Loading your workspace...');
                if (window.notificationService) window.notificationService.success('Welcome back!', 'Logged in');

                // The login screen renders standalone (no app shell / router yet).
                // Boot the authenticated app in-place — mirror App.init()'s authed
                // branch so the layout renders, the router is wired, and we land on
                // the correct initial route (company-sync / import-company).
                setTimeout(() => {
                    try {
                        if (window.app && typeof window.app.renderAppLayout === 'function') {
                            window.location.hash = '';
                            window.app.renderAppLayout();
                            if (typeof window.app.initializeAutoUpdater === 'function') window.app.initializeAutoUpdater();
                            if (typeof window.app.initializeTallyData === 'function') window.app.initializeTallyData();
                        } else {
                            // Fallback: reload so App.init() takes the authenticated branch.
                            window.location.hash = '';
                            window.location.reload();
                        }
                    } catch (err) {
                        console.error('Post-login boot failed, reloading:', err);
                        window.location.reload();
                    }
                }, 600);
            } catch (error) {
                showError(error.message || 'Login failed. Please check your credentials.');
                if (loginBtn) { loginBtn.disabled = false; loginBtn.innerHTML = originalBtnHtml; }
                if (loadingSpinner) loadingSpinner.classList.add('hidden');
            }
        });
    }

    // ============= REGISTRATION FORM SETUP (UPDATED) =============
    function setupSignupForm() {
        const signupForm = document.getElementById('signupForm');
        if (!signupForm) return;

        // Auto-fetch Tally license number when signup form loads
        setTimeout(() => {
            fetchAndPopulateLicenseNumber();
        }, 200);

        // Populate the billing-country dropdown from the backend (DB-driven).
        populateSignupCountries();

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
                    licenceNoInput.value = '';
                    refreshLicenseBtn.classList.add('refreshing');
                    refreshLicenseBtn.setAttribute('aria-busy', 'true');
                    try {
                        await fetchAndPopulateLicenseNumber();
                    } finally {
                        refreshLicenseBtn.classList.remove('refreshing');
                        refreshLicenseBtn.setAttribute('aria-busy', 'false');
                    }
                }
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
                const billingCountry = document.getElementById('signupCountry')?.value.trim() || 'IN';
                const registrationPayload = {
                    username: username.toLowerCase(),
                    email: email.toLowerCase(),
                    licenceNo: licenceNumber,
                    password: password,
                    fullName: fullName,
                    countryCode: countryCode,
                    mobile: mobile.replace(/\D/g, ''),
                    country: billingCountry // ISO2 billing country -> drives currency
                };

                const apiResult = await window.publicApiService.post('/auth/register', registrationPayload);
                
                if (!apiResult.success) {
                    throw new Error(apiResult.error || 'Registration failed');
                }

                const data = apiResult.data || apiResult;

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

                // Backend automatically sends OTP during registration.
                // We can just proceed to the verification screen.

                if (successMessage) {
                    const msgText = successMessage.querySelector('.msg-text') || successMessage.querySelector('.msg-content');
                    if (msgText) msgText.textContent = '✅ Email OTP sent! Please verify your account.';
                }

                setTimeout(() => {
                    window.location.hash = '#verify-otp'; window.initializeOtpVerification(registrationPayload.username);
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
                const apiResult = await window.publicApiService.post('/auth/verify-email-otp', { username, otp });
                
                if (!apiResult.success) {
                    throw new Error(apiResult.error || 'OTP verification failed');
                }

                const data = apiResult.data || apiResult;

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
                        window.location.hash = '#login'; window.initializeLogin();
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
                        window.location.hash = '#login'; window.initializeLogin();
                    }, 3000);
                    return;
                }

                // Trigger mobile OTP
                setTimeout(async () => {
                    try {
                        const mobileOtpResult = await window.publicApiService.post('/sns/send-mobile-otp', {
                            username: username
                        });

                        if (!mobileOtpResult.success) {
                            throw new Error(mobileOtpResult.error || 'Failed to send mobile OTP');
                        }

                        // Initialize mobile OTP verification
                        window.initializeMobileOtpVerification(fullMobile, username);

                    } catch (error) {
                        console.error('Mobile OTP error:', error);
                        errorMessage.querySelector('span:last-child').textContent = error.message || 'Failed to send mobile OTP. Redirecting to login...';
                        errorMessage.classList.remove('hidden');
                        successMessage.classList.add('hidden');

                        setTimeout(() => {
                            window.location.hash = '#login'; window.initializeLogin();
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
                const apiResult = await window.publicApiService.post('/auth/resend-otp', { username });

                if (!apiResult.success) {
                    throw new Error(apiResult.error || 'Failed to resend OTP');
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
                const apiResult = await window.publicApiService.post('/sns/verify-mobile-otp', {
                    username: username,
                    otp: otp
                });

                if (!apiResult.success) {
                    throw new Error(apiResult.error || 'Mobile OTP verification failed');
                }

                const data = apiResult.data || apiResult;

                clearInterval(timerInterval);
                successMessage.querySelector('span:last-child').textContent = '✅ Mobile verified successfully! Redirecting to login...';
                successMessage.classList.remove('hidden');

                // Clear all pending verification data
                localStorage.removeItem('pendingVerificationMobile');
                localStorage.removeItem('pendingVerificationCountryCode');
                localStorage.removeItem('pendingVerificationUsername');

                setTimeout(() => {
                    window.location.hash = '#login'; window.initializeLogin();
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
                const apiResult = await window.publicApiService.post('/sns/send-mobile-otp', {
                    username: username
                });

                if (!apiResult.success) {
                    throw new Error(apiResult.error || 'Failed to resend OTP');
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

    // ============= GLOBAL EVENT DELEGATION FOR LEGAL LINKS =============
    // Open the Terms of Service / Privacy Policy web pages in the user's
    // default browser. Never hardcode the host - read apiConfig.WEB_APP_URL.
    const openLegalPage = (path) => {
        const base = (window.apiConfig && window.apiConfig.WEB_APP_URL) || '';
        const url = `${base}${path}`;
        if (window.electronAPI && window.electronAPI.openExternalUrl) {
            window.electronAPI.openExternalUrl(url);
        } else {
            window.open(url, '_blank');
        }
    };

    // Use event delegation on document body to catch clicks even if
    // the signup form HTML is dynamically re-rendered by initializeSignup.
    document.body.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        if (link.id === 'signupTermsLink') {
            e.preventDefault();
            openLegalPage('/terms');
        } else if (link.id === 'signupPrivacyLink') {
            e.preventDefault();
            openLegalPage('/privacy');
        }
    });

})();



