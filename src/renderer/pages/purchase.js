(function () {

    // UI duration token -> backend billing_period
    const PERIOD = { '1yr': '1YR', '3yr': '3YR' };

    // Normalized pricing loaded from the backend (subscription_plan/plan_price/
    // plan_feature). Populated by loadPricing() before the page renders.
    let PRICING = null;
    let SUBSCRIPTION = null;
    // True when the API responded successfully but returned zero plans — meaning
    // no plans have been configured in the DB yet (beta / pre-launch state).
    let NO_PLANS_IN_DB = false;

    /** Best-effort locale guess used only when the backend can't resolve currency. */
    function guessCountryFromLocale() {
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
            if (tz.startsWith('Asia/Kolkata') || tz.startsWith('Asia/Calcutta')) return 'IN';
            if (tz.startsWith('Asia/Dubai')) return 'AE';
            const locale = (navigator.language || navigator.userLanguage || '').toLowerCase();
            if (locale.endsWith('-in')) return 'IN';
            if (locale.endsWith('-ae')) return 'AE';
        } catch (e) { /* ignore */ }
        return null;
    }

    function symbolFor(currency) {
        if (currency === 'INR') return '₹';
        if (currency === 'AED') return 'د.إ';
        return '$';
    }

    /** Static fallback so the page still renders if the API is unreachable. */
    function fallbackPricing() {
        const country = guessCountryFromLocale();
        const india = country === 'IN';
        const currency = india ? 'INR' : (country === 'AE' ? 'AED' : 'USD');
        const mk = (amt, tax) => ({ amount: amt, taxNote: tax });
        const tax = india ? '+ applicable taxes' : 'inclusive of all charges';
        return {
            currency,
            currencySymbol: symbolFor(currency),
            currencyLocale: india ? 'en-IN' : (currency === 'AED' ? 'en-AE' : 'en-US'),
            betaMode: false,
            plans: [
                {
                    code: 'BASIC', name: 'Basic', description: 'Perfect for small businesses', popular: false,
                    prices: india ? { '1YR': mk('2,999', tax), '3YR': mk('6,999', tax) }
                                  : (currency === 'AED' ? { '1YR': mk('329', tax), '3YR': mk('735', tax) }
                                                        : { '1YR': mk('89', tax), '3YR': mk('200', tax) }),
                    features: [
                        { key: 'companies', value: '1', label: '1 Company Portfolio' },
                        { key: 'sync', value: 'STD', label: 'Standard Sync Frequency' },
                        { key: 'support', value: 'EMAIL', label: 'Email Support' },
                        { key: 'updates', value: '1', label: 'Automatic Updates' },
                    ],
                },
                {
                    code: 'PROFESSIONAL', name: 'Professional', description: 'For growing & multi-company setups', popular: true,
                    prices: india ? { '1YR': mk('4,999', tax), '3YR': mk('11,999', tax) }
                                  : (currency === 'AED' ? { '1YR': mk('549', tax), '3YR': mk('1,285', tax) }
                                                        : { '1YR': mk('149', tax), '3YR': mk('350', tax) }),
                    features: [
                        { key: 'companies', value: 'UNLIMITED', label: 'Unlimited Companies' },
                        { key: 'sync', value: 'ADV', label: 'Advanced Sync Management' },
                        { key: 'support', value: 'PRIORITY', label: 'Priority 24/7 Support' },
                        { key: 'realtime', value: '1', label: 'Real-time Data Fetching' },
                        { key: 'api', value: '1', label: 'REST API Access' },
                    ],
                },
            ],
        };
    }

    async function apiGet(url) {
        if (!window.apiConfig || typeof window.apiConfig.getUrl !== 'function') {
            throw new Error('API configuration not loaded');
        }
        const headers = (window.authService && typeof window.authService.getHeaders === 'function')
            ? window.authService.getHeaders()
            : { 'Content-Type': 'application/json' };
        const res = await fetch(window.apiConfig.getUrl(url), { method: 'GET', headers });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
        return json; // backend ApiResponse { success, message, data }
    }

    /** Load subscription (for currency + trial banner) then dynamic pricing. */
    async function loadPricing() {
        // Current subscription: gives us the stored currency and trial state.
        try {
            const subResp = await apiGet('/subscription/me');
            SUBSCRIPTION = subResp.data || subResp;
        } catch (e) {
            SUBSCRIPTION = null;
        }
        const qs = SUBSCRIPTION && SUBSCRIPTION.currency
            ? `?currency=${encodeURIComponent(SUBSCRIPTION.currency)}`
            : (guessCountryFromLocale() ? `?country=${guessCountryFromLocale()}` : '');
        try {
            const resp = await apiGet('/subscription/pricing' + qs);
            PRICING = resp.data || resp;
            if (!PRICING || !Array.isArray(PRICING.plans) || PRICING.plans.length === 0) {
                // API is reachable but no plans exist in the DB yet → beta/pre-launch
                NO_PLANS_IN_DB = true;
                PRICING = fallbackPricing();
            }
        } catch (e) {
            console.warn('Pricing API failed, using fallback:', e.message);
            PRICING = fallbackPricing();
        }
    }

    function planByCode(code) {
        return (PRICING && PRICING.plans || []).find(p => p.code === code) || null;
    }

    function formatAmount(price, currency) {
        if (!price || price.amount == null) return '—';
        const raw = price.amount;
        // Backend sends numbers; the fallback sends pre-formatted strings.
        if (typeof raw === 'string') return raw;
        // Locale comes from the backend currency_config; fall back per-currency.
        const locale = (PRICING && PRICING.currencyLocale) || (currency === 'INR' ? 'en-IN' : 'en-US');
        const n = Number(raw);
        return Number.isNaN(n) ? String(raw) : n.toLocaleString(locale);
    }

    /** Included features = those whose value isn't an explicit "off" flag. */
    function featureListHtml(plan, light) {
        const color = light ? 'rgba(255, 255, 255, 0.9)' : 'var(--ds-success-500)';
        const textColor = light ? '' : 'color: var(--ds-text-secondary);';
        return (plan.features || [])
            .filter(f => f.value !== '0' && f.value !== 'false')
            .map(f => `
                <li style="padding: var(--ds-space-2) 0; ${textColor} display: flex; align-items: center; gap: var(--ds-space-3); font-size: var(--ds-text-sm);">
                    <i class="fas fa-check-circle" style="color: ${color}; font-size: var(--ds-text-sm);"></i>
                    <span>${f.label || f.key}</span>
                </li>`)
            .join('');
    }

    function trialBannerHtml() {
        if (!SUBSCRIPTION || SUBSCRIPTION.status === 'NONE' || !SUBSCRIPTION.status) return '';
        let text;
        if (SUBSCRIPTION.betaMode) {
            text = "You're on the Beta — all features unlocked, free, until launch.";
        } else if (SUBSCRIPTION.status === 'TRIAL') {
            const d = SUBSCRIPTION.daysRemaining;
            text = `Free trial active${d != null ? ` — ${d} day${d === 1 ? '' : 's'} remaining` : ''}.`;
        } else if (SUBSCRIPTION.status === 'ACTIVE') {
            text = `Your ${SUBSCRIPTION.planName || SUBSCRIPTION.planCode || ''} plan is active.`;
        } else if (SUBSCRIPTION.status === 'EXPIRED') {
            text = 'Your trial has expired — choose a plan to continue.';
        } else {
            return '';
        }
        return `
            <div style="text-align:center; padding: var(--ds-space-4) var(--ds-space-6) 0;">
                <span style="display:inline-flex; align-items:center; gap:6px; background: var(--ds-primary-50); color: var(--ds-primary-600); border:1px solid var(--ds-primary-100); font-size: var(--ds-text-xs); font-weight: var(--ds-weight-bold); padding: 4px 14px; border-radius: 999px;">
                    <i class="fas fa-star" style="font-size: 9px;"></i> ${text}
                </span>
            </div>`;
    }

    const getPurchaseTemplate = () => {
        const p = PRICING || fallbackPricing();
        const isIndia = p.currency === 'INR';
        const basic = planByCode('BASIC') || p.plans[0];
        const pro = planByCode('PROFESSIONAL') || p.plans[1] || p.plans[0];
        const basicPriceObj = basic && basic.prices ? basic.prices['1YR'] : null;
        const proPriceObj = pro && pro.prices ? pro.prices['1YR'] : null;
        const sym = p.currencySymbol || symbolFor(p.currency);

        return `
        <div style="padding: var(--ds-space-6); width: 100%; box-sizing: border-box;">
            <div style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-xl); box-shadow: var(--ds-shadow-sm); overflow: hidden; border: 1px solid var(--ds-border-default);">

                <!-- Header -->
                <div style="padding: var(--ds-space-5) var(--ds-space-6); border-bottom: 1px solid var(--ds-border-default); display: flex; align-items: center; gap: var(--ds-space-4); background: var(--ds-bg-surface-sunken);">
                    <div style="width: 44px; height: 44px; background: var(--ds-primary-50); color: var(--ds-primary-500); border-radius: var(--ds-radius-lg); display: flex; align-items: center; justify-content: center; font-size: var(--ds-text-xl); border: 1px solid var(--ds-primary-100);">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div>
                        <h2 style="font-size: var(--ds-text-2xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-1);">Choose Your Plan</h2>
                        <p style="color: var(--ds-text-tertiary); font-size: var(--ds-text-sm);">Simple, transparent pricing &mdash; prices shown in ${sym} (${p.currency})</p>
                    </div>
                </div>

                ${trialBannerHtml()}

                <!-- Plans Coming Soon -->
                <div style="text-align: center; padding: var(--ds-space-12) var(--ds-space-6);">
                    <div style="display: inline-flex; align-items: center; gap: 8px; background: var(--ds-primary-50); padding: var(--ds-space-2) var(--ds-space-4); border-radius: var(--ds-radius-full); margin-bottom: var(--ds-space-6);">
                        <i class="fas fa-shopping-cart" style="color: var(--ds-primary-500);"></i>
                        <span style="font-size: var(--ds-text-xs); font-weight: var(--ds-weight-bold); color: var(--ds-primary-600); text-transform: uppercase; letter-spacing: var(--ds-tracking-wider);">PRICING</span>
                    </div>

                    <h2 style="font-size: var(--ds-text-3xl); font-weight: var(--ds-weight-extrabold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-4);">
                        Plans &amp; Pricing <span style="color: var(--ds-primary-500);">Coming Soon</span>
                    </h2>

                    <p style="color: var(--ds-text-secondary); font-size: var(--ds-text-base); margin-bottom: var(--ds-space-8); max-width: 32rem; margin-left: auto; margin-right: auto; line-height: 1.5;">
                        We are finalising our plans. In the meantime, enjoy full access during the beta period &mdash; no credit card required.
                    </p>

                    <div style="display: inline-flex; align-items: center; gap: 12px; padding: var(--ds-space-3) var(--ds-space-6); background: var(--ds-success-50); border: 1px solid var(--ds-success-200); border-radius: var(--ds-radius-2xl); color: var(--ds-success-700); font-weight: var(--ds-weight-bold); font-size: var(--ds-text-sm);">
                        <i class="fas fa-check-circle" style="color: var(--ds-success-500); font-size: var(--ds-text-lg);"></i>
                        Free Beta Access &mdash; No Payment Required
                    </div>
                </div>
                </div>
            </div>
        </div>
    `;
    };

    /**
     * Wire up the 1-Year / 3-Year duration toggle and update prices dynamically.
     */
    function initDurationToggle() {
        const p = PRICING || fallbackPricing();
        const sym = p.currencySymbol || symbolFor(p.currency);
        const basic = planByCode('BASIC') || p.plans[0];
        const pro = planByCode('PROFESSIONAL') || p.plans[1] || p.plans[0];
        const toggle = document.getElementById('durationToggle');
        if (!toggle) return;

        toggle.addEventListener('click', (e) => {
            const btn = e.target.closest('.duration-btn');
            if (!btn) return;

            const duration = btn.dataset.duration; // '1yr' or '3yr'
            const period = PERIOD[duration];

            // Update active styles
            toggle.querySelectorAll('.duration-btn').forEach(b => {
                b.style.background = 'transparent';
                b.style.color = 'var(--ds-text-secondary)';
                b.classList.remove('active');
            });
            btn.style.background = 'var(--ds-primary-600)';
            btn.style.color = 'var(--ds-text-inverse)';
            btn.classList.add('active');

            // Update Basic price
            const basicPrice = document.getElementById('basicPrice');
            const basicPeriod = document.getElementById('basicPeriod');
            if (basicPrice) basicPrice.textContent = sym + formatAmount(basic && basic.prices ? basic.prices[period] : null, p.currency);
            if (basicPeriod) basicPeriod.textContent = duration === '3yr' ? ' / 3 years' : ' / year';

            // Update Professional price
            const proPrice = document.getElementById('proPrice');
            const proPeriod = document.getElementById('proPeriod');
            if (proPrice) proPrice.textContent = sym + formatAmount(pro && pro.prices ? pro.prices[period] : null, p.currency);
            if (proPeriod) proPeriod.textContent = duration === '3yr' ? ' / 3 years' : ' / year';
        });
    }

    function showBetaTrialPopup(planName) {
        if (SUBSCRIPTION && SUBSCRIPTION.betaMode) {
            const popupId = window.Popup.show({
                title: '',
                size: 'sm',
                closeable: true,
                content: `
                    <div style="text-align: center; padding: var(--ds-space-2) 0;">
                        <div style="width: 72px; height: 72px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; color: #fff; margin: 0 auto var(--ds-space-5); box-shadow: 0 8px 24px rgba(16,185,129,0.35);">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.2); font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 4px 14px; border-radius: 999px; margin-bottom: var(--ds-space-4);">
                            <i class="fas fa-star" style="font-size: 9px;"></i> Active
                        </div>
                        <h2 style="font-size: var(--ds-text-2xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-3);">Beta Trial Active!</h2>
                        <p style="color: var(--ds-text-secondary); font-size: var(--ds-text-sm); line-height: 1.6; margin-bottom: var(--ds-space-6);">
                            You are already in the <strong>Beta Trial</strong>. All features are unlocked and completely <span style="color: #10b981; font-weight: 700;">free</span>.
                        </p>
                        <button id="betaGotItBtn" style="width: 100%; padding: 12px 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; border: none; border-radius: var(--ds-radius-lg); font-size: var(--ds-text-sm); font-weight: var(--ds-weight-bold); cursor: pointer; box-shadow: 0 4px 14px rgba(16,185,129,0.35);">
                            Okay, Got it!
                        </button>
                    </div>
                `
            });
            setTimeout(() => {
                document.getElementById('betaGotItBtn')?.addEventListener('click', () => {
                    window.Popup.close(popupId);
                });
            }, 50);
            return;
        }

        // Beta state is owned by the backend (app_config.feature.beta.mode); no
        // client-side flag is persisted.
        const popupId = window.Popup.show({
            title: '',
            size: 'sm',
            closeable: true,
            content: `
                <div style="text-align: center; padding: var(--ds-space-2) 0;">
                    <!-- Icon -->
                    <div style="position: relative; display: inline-flex; align-items: center; justify-content: center; width: 72px; height: 72px; margin: 0 auto var(--ds-space-5);">
                        <div style="position: absolute; inset: 0; background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(79,70,229,0.15)); border-radius: 50%; animation: pulse 2s infinite;"></div>
                        <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #7c3aed, #4f46e5); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; color: #fff; box-shadow: 0 8px 24px rgba(99,70,229,0.35);">
                            <i class="fas fa-flask"></i>
                        </div>
                    </div>

                    <!-- Badge -->
                    <div style="display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 4px 14px; border-radius: 999px; margin-bottom: var(--ds-space-4);">
                        <i class="fas fa-star" style="font-size: 9px;"></i> Beta Trial
                    </div>

                    <!-- Heading -->
                    <h2 style="font-size: var(--ds-text-2xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-2);">
                        Beta Trial Available
                    </h2>
                    <p style="color: var(--ds-text-secondary); font-size: var(--ds-text-sm); margin-bottom: var(--ds-space-6); line-height: 1.6;">
                        Talliffy is currently in <strong>Beta</strong>. Enjoy all <strong>${planName}</strong> features completely
                        <span style="color: #7c3aed; font-weight: 700;">free</span> during this period. No payment needed.
                    </p>

                    <!-- Feature highlights -->
                    <div style="background: linear-gradient(135deg, rgba(139,92,246,0.06), rgba(79,70,229,0.06)); border: 1px solid rgba(139,92,246,0.2); border-radius: var(--ds-radius-xl); padding: var(--ds-space-4) var(--ds-space-5); margin-bottom: var(--ds-space-6); text-align: left;">
                        <div style="display: flex; flex-direction: column; gap: var(--ds-space-2);">
                            <div style="display: flex; align-items: center; gap: var(--ds-space-3); font-size: var(--ds-text-sm); color: var(--ds-text-secondary);">
                                <i class="fas fa-check-circle" style="color: #7c3aed; font-size: 14px; flex-shrink: 0;"></i>
                                <span>All features unlocked at no cost</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: var(--ds-space-3); font-size: var(--ds-text-sm); color: var(--ds-text-secondary);">
                                <i class="fas fa-check-circle" style="color: #7c3aed; font-size: 14px; flex-shrink: 0;"></i>
                                <span>No credit card required</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: var(--ds-space-3); font-size: var(--ds-text-sm); color: var(--ds-text-secondary);">
                                <i class="fas fa-check-circle" style="color: #7c3aed; font-size: 14px; flex-shrink: 0;"></i>
                                <span>Access continues until official launch</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: var(--ds-space-3); font-size: var(--ds-text-sm); color: var(--ds-text-secondary);">
                                <i class="fas fa-check-circle" style="color: #7c3aed; font-size: 14px; flex-shrink: 0;"></i>
                                <span>Help shape the product with your feedback</span>
                            </div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div style="display: flex; flex-direction: column; gap: var(--ds-space-3);">
                        <button id="betaActivateBtn" style="width: 100%; padding: 12px 20px; background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); color: #fff; border: none; border-radius: var(--ds-radius-lg); font-size: var(--ds-text-sm); font-weight: var(--ds-weight-bold); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 14px rgba(99,70,229,0.4); transition: opacity 0.15s;">
                            <i class="fas fa-rocket"></i> Activate Beta Trial
                        </button>
                        <button id="betaCancelBtn" style="width: 100%; padding: 11px 20px; background: transparent; color: var(--ds-text-secondary); border: 1px solid var(--ds-border-default); border-radius: var(--ds-radius-lg); font-size: var(--ds-text-sm); font-weight: var(--ds-weight-medium); cursor: pointer; transition: background 0.15s;">
                            Maybe Later
                        </button>
                    </div>

                    <!-- Footer note -->
                    <p style="margin-top: var(--ds-space-5); font-size: var(--ds-text-2xs); color: var(--ds-text-tertiary); line-height: 1.5;">
                        <i class="fas fa-lock" style="margin-right: 4px;"></i>
                        Your data is always secure. Beta access is subject to our terms of service.
                    </p>
                </div>
            `
        });

        setTimeout(() => {
            document.getElementById('betaActivateBtn')?.addEventListener('click', () => {
                window.Popup.close(popupId);
                const successPopupId = window.Popup.show({
                    title: 'Beta Trial Activated!',
                    size: 'sm',
                    closeable: true,
                    content: `
                        <div style="text-align: center; padding: var(--ds-space-4) 0;">
                            <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; color: #fff; margin: 0 auto var(--ds-space-5); box-shadow: 0 8px 24px rgba(16,185,129,0.35);">
                                <i class="fas fa-check"></i>
                            </div>
                            <h2 style="font-size: var(--ds-text-xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-3);">You're all set!</h2>
                            <p style="color: var(--ds-text-secondary); font-size: var(--ds-text-sm); line-height: 1.6; margin-bottom: var(--ds-space-6);">
                                Your <strong>${planName}</strong> beta trial is now active. Enjoy all features at no cost. We'll notify you before the trial ends.
                            </p>
                            <button id="betaDoneBtn" style="width: 100%; padding: 12px 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; border: none; border-radius: var(--ds-radius-lg); font-size: var(--ds-text-sm); font-weight: var(--ds-weight-bold); cursor: pointer; box-shadow: 0 4px 14px rgba(16,185,129,0.35);">
                                <i class="fas fa-thumbs-up"></i> Great, Let's Go!
                            </button>
                        </div>
                    `
                });
                setTimeout(() => {
                    document.getElementById('betaDoneBtn')?.addEventListener('click', () => {
                        window.Popup.close(successPopupId);
                    });
                }, 50);
            });

            document.getElementById('betaCancelBtn')?.addEventListener('click', () => {
                window.Popup.close(popupId);
            });
        }, 50);
    }

    function getBetaVersionTemplate() {
        const daysLeft = SUBSCRIPTION && SUBSCRIPTION.daysRemaining != null ? SUBSCRIPTION.daysRemaining : null;
        const daysText = daysLeft != null
            ? `<span style="color: var(--ds-primary-600); font-weight: var(--ds-weight-bold);">${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining</span> in your trial.`
            : 'You have full access during the beta period.';

        return `
        <div style="padding: var(--ds-space-6); width: 100%; box-sizing: border-box;">
            <div style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-xl); box-shadow: var(--ds-shadow-sm); overflow: hidden; border: 1px solid var(--ds-border-default);">

                <!-- Header -->
                <div style="padding: var(--ds-space-5) var(--ds-space-6); border-bottom: 1px solid var(--ds-border-default); display: flex; align-items: center; gap: var(--ds-space-4); background: var(--ds-bg-surface-sunken);">
                    <div style="width: 44px; height: 44px; background: var(--ds-primary-50); color: var(--ds-primary-500); border-radius: var(--ds-radius-lg); display: flex; align-items: center; justify-content: center; font-size: var(--ds-text-xl); border: 1px solid var(--ds-primary-100);">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div>
                        <h2 style="font-size: var(--ds-text-2xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-1);">Purchase</h2>
                        <p style="color: var(--ds-text-tertiary); font-size: var(--ds-text-sm);">Subscription &amp; plan details</p>
                    </div>
                </div>

                <!-- Beta Banner -->
                <div style="padding: var(--ds-space-10) var(--ds-space-8); display: flex; flex-direction: column; align-items: center; text-align: center;">

                    <!-- Icon -->
                    <div style="position: relative; display: inline-flex; align-items: center; justify-content: center; width: 80px; height: 80px; margin-bottom: var(--ds-space-6);">
                        <div style="position: absolute; inset: 0; background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(79,70,229,0.15)); border-radius: 50%;"></div>
                        <div style="width: 72px; height: 72px; background: linear-gradient(135deg, #7c3aed, #4f46e5); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; color: #fff; box-shadow: 0 8px 28px rgba(99,70,229,0.35);">
                            <i class="fas fa-flask"></i>
                        </div>
                    </div>

                    <!-- Badge -->
                    <div style="display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 5px 16px; border-radius: 999px; margin-bottom: var(--ds-space-5); box-shadow: 0 4px 12px rgba(99,70,229,0.3);">
                        <i class="fas fa-star" style="font-size: 9px;"></i> Beta Version
                    </div>

                    <!-- Heading -->
                    <h2 style="font-size: var(--ds-text-3xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-3);">
                        You're on the Beta!
                    </h2>
                    <p style="color: var(--ds-text-secondary); font-size: var(--ds-text-base); line-height: 1.7; max-width: 420px; margin-bottom: var(--ds-space-6);">
                        Talliffy is currently in <strong>Beta</strong>. All features are
                        <span style="color: #7c3aed; font-weight: 700;">completely free</span>
                        during this period. ${daysText}
                    </p>

                    <!-- Feature list -->
                    <div style="background: linear-gradient(135deg, rgba(139,92,246,0.06), rgba(79,70,229,0.04)); border: 1px solid rgba(139,92,246,0.2); border-radius: var(--ds-radius-xl); padding: var(--ds-space-5) var(--ds-space-6); margin-bottom: var(--ds-space-6); text-align: left; width: 100%; max-width: 400px;">
                        <p style="font-size: var(--ds-text-xs); font-weight: var(--ds-weight-bold); color: #7c3aed; text-transform: uppercase; letter-spacing: 1px; margin-bottom: var(--ds-space-4);">What's included</p>
                        <div style="display: flex; flex-direction: column; gap: var(--ds-space-3);">
                            ${[
                                'All reports — Balance Sheet, P&amp;L, Ledger, Daybook',
                                'Unlimited company sync',
                                'Desktop, Web &amp; Mobile access',
                                'No credit card required',
                                'Full access until official launch',
                            ].map(f => `
                                <div style="display: flex; align-items: center; gap: var(--ds-space-3); font-size: var(--ds-text-sm); color: var(--ds-text-secondary);">
                                    <i class="fas fa-check-circle" style="color: #7c3aed; font-size: 14px; flex-shrink: 0;"></i>
                                    <span>${f}</span>
                                </div>`).join('')}
                        </div>
                    </div>

                    <!-- Note -->
                    <p style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary); line-height: 1.5; max-width: 380px;">
                        <i class="fas fa-bell" style="margin-right: 4px; color: var(--ds-primary-400);"></i>
                        Paid plans will be introduced when we officially launch. You'll be notified in advance.
                    </p>
                </div>
            </div>
        </div>`;
    }

    window.initializePurchase = async function () {
        console.log('Initializing Purchase Page...');
        const content = document.getElementById('page-content');
        if (!content) return;

        // Lightweight loading state while dynamic pricing is fetched.
        content.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:center; min-height:240px; color: var(--ds-text-tertiary); font-size: var(--ds-text-sm);">
                <i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i> Loading plans…
            </div>`;

        await loadPricing();

        // No plans in DB → still in beta / pre-launch; show beta screen instead of pricing.
        if (NO_PLANS_IN_DB || (SUBSCRIPTION && SUBSCRIPTION.betaMode)) {
            content.innerHTML = getBetaVersionTemplate();
            return;
        }

        content.innerHTML = getPurchaseTemplate();
        initDurationToggle();

        const basicName = (planByCode('BASIC') || {}).name || 'Basic';
        const proName = (planByCode('PROFESSIONAL') || {}).name || 'Professional';
        document.getElementById('basicBtn')?.addEventListener('click', () => {
            showBetaTrialPopup(basicName);
        });
        document.getElementById('proBtn')?.addEventListener('click', () => {
            showBetaTrialPopup(proName);
        });
    };
})();
