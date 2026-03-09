(function () {

    /**
     * Auto-detect if user is in India based on timezone & locale.
     * Returns true for India, false otherwise (GCC / international).
     */
    function isIndianUser() {
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
            if (tz.startsWith('Asia/Kolkata') || tz.startsWith('Asia/Calcutta')) return true;
            const locale = (navigator.language || navigator.userLanguage || '').toLowerCase();
            if (locale.includes('hi') || locale.includes('in') || locale === 'en-in') return true;
        } catch (e) { /* fallback to international */ }
        return false;
    }

    /**
     * Pricing data keyed by region
     * India  : ₹ symbol, prices in INR + Tax
     * Outside: $ symbol, prices in USD
     */
    function getPricing() {
        const india = isIndianUser();
        return {
            isIndia: india,
            currency: india ? '₹' : '$',
            taxNote: india ? ' + Tax' : '',
            basic: {
                '1yr': india ? '2,999' : '89',
                '3yr': india ? '6,999' : '200',
            },
            professional: {
                '1yr': india ? '4,999' : '149',
                '3yr': india ? '11,999' : '350',
            }
        };
    }

    const getPurchaseTemplate = () => {
        const p = getPricing();

        return `
        <div style="padding: var(--ds-space-6); max-width: 960px; margin: 0 auto;">
            <div style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-xl); box-shadow: var(--ds-shadow-sm); overflow: hidden; border: 1px solid var(--ds-border-default);">

                <!-- Header -->
                <div style="padding: var(--ds-space-5) var(--ds-space-6); border-bottom: 1px solid var(--ds-border-default); display: flex; align-items: center; gap: var(--ds-space-4); background: var(--ds-bg-surface-sunken);">
                    <div style="width: 44px; height: 44px; background: var(--ds-primary-50); color: var(--ds-primary-500); border-radius: var(--ds-radius-lg); display: flex; align-items: center; justify-content: center; font-size: var(--ds-text-xl); border: 1px solid var(--ds-primary-100);">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div>
                        <h2 style="font-size: var(--ds-text-2xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-1);">Choose Your Plan</h2>
                        <p style="color: var(--ds-text-tertiary); font-size: var(--ds-text-sm);">Simple, transparent pricing &mdash; ${p.isIndia ? 'prices shown in ₹ (INR)' : 'prices shown in $ (USD)'}</p>
                    </div>
                </div>

                <!-- Duration Toggle -->
                <div style="display: flex; justify-content: center; padding: var(--ds-space-6) var(--ds-space-6) 0;">
                    <div id="durationToggle" style="display: inline-flex; background: var(--ds-bg-surface-sunken); border-radius: var(--ds-radius-full); padding: 4px; gap: 4px; border: 1px solid var(--ds-border-default);">
                        <button data-duration="1yr" class="duration-btn active" style="padding: var(--ds-space-2) var(--ds-space-5); border-radius: var(--ds-radius-full); border: none; cursor: pointer; font-size: var(--ds-text-sm); font-weight: var(--ds-weight-semibold); transition: all var(--ds-duration-base) var(--ds-ease); background: var(--ds-primary-600); color: var(--ds-text-inverse);">
                            1 Year
                        </button>
                        <button data-duration="3yr" class="duration-btn" style="padding: var(--ds-space-2) var(--ds-space-5); border-radius: var(--ds-radius-full); border: none; cursor: pointer; font-size: var(--ds-text-sm); font-weight: var(--ds-weight-semibold); transition: all var(--ds-duration-base) var(--ds-ease); background: transparent; color: var(--ds-text-secondary);">
                            3 Years <span style="font-size: var(--ds-text-2xs); background: var(--ds-success-100); color: var(--ds-success-700); padding: 2px 8px; border-radius: var(--ds-radius-full); margin-left: 4px; font-weight: var(--ds-weight-bold);">SAVE MORE</span>
                        </button>
                    </div>
                </div>

                <!-- Pricing Cards -->
                <div style="padding: var(--ds-space-8) var(--ds-space-6) var(--ds-space-12);">
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--ds-space-6); align-items: stretch; max-width: 780px; margin: 0 auto;">

                        <!-- Basic Plan -->
                        <div style="background: var(--ds-bg-surface); padding: var(--ds-space-8); border-radius: var(--ds-radius-2xl); border: 1px solid var(--ds-border-default); display: flex; flex-direction: column; transition: all var(--ds-duration-base) var(--ds-ease); height: 100%;" class="pricing-card">
                            <div style="width: 40px; height: 40px; background: var(--ds-success-50); color: var(--ds-success-500); border-radius: var(--ds-radius-lg); display: flex; align-items: center; justify-content: center; margin-bottom: var(--ds-space-5); border: 1px solid var(--ds-success-100);">
                                <i class="fas fa-seedling"></i>
                            </div>
                            <h3 style="font-size: var(--ds-text-xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-2);">Basic</h3>
                            <p style="color: var(--ds-text-tertiary); font-size: var(--ds-text-sm); margin-bottom: var(--ds-space-5);">Perfect for small businesses</p>

                            <!-- Price display -->
                            <div style="margin-bottom: var(--ds-space-2);">
                                <span style="font-size: var(--ds-text-4xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary);" id="basicPrice">${p.currency}${p.basic['1yr']}</span>
                                <span style="color: var(--ds-text-tertiary); font-size: var(--ds-text-sm);" id="basicPeriod"> / year</span>
                            </div>
                            <div style="margin-bottom: var(--ds-space-6);">
                                <span style="color: var(--ds-text-tertiary); font-size: var(--ds-text-xs);" id="basicTaxNote">${p.isIndia ? '+ applicable taxes' : 'inclusive of all charges'}</span>
                            </div>

                            <ul style="list-style: none; padding: 0; margin: 0 0 var(--ds-space-8) 0; flex-grow: 1;">
                                <li style="padding: var(--ds-space-2) 0; color: var(--ds-text-secondary); display: flex; align-items: center; gap: var(--ds-space-3); font-size: var(--ds-text-sm);">
                                    <i class="fas fa-check-circle" style="color: var(--ds-success-500); font-size: var(--ds-text-sm);"></i>
                                    <span>1 Company Portfolio</span>
                                </li>
                                <li style="padding: var(--ds-space-2) 0; color: var(--ds-text-secondary); display: flex; align-items: center; gap: var(--ds-space-3); font-size: var(--ds-text-sm);">
                                    <i class="fas fa-check-circle" style="color: var(--ds-success-500); font-size: var(--ds-text-sm);"></i>
                                    <span>Standard Sync Frequency</span>
                                </li>
                                <li style="padding: var(--ds-space-2) 0; color: var(--ds-text-secondary); display: flex; align-items: center; gap: var(--ds-space-3); font-size: var(--ds-text-sm);">
                                    <i class="fas fa-check-circle" style="color: var(--ds-success-500); font-size: var(--ds-text-sm);"></i>
                                    <span>Email Support</span>
                                </li>
                                <li style="padding: var(--ds-space-2) 0; color: var(--ds-text-secondary); display: flex; align-items: center; gap: var(--ds-space-3); font-size: var(--ds-text-sm);">
                                    <i class="fas fa-check-circle" style="color: var(--ds-success-500); font-size: var(--ds-text-sm);"></i>
                                    <span>Automatic Updates</span>
                                </li>
                            </ul>
                            <button class="ds-btn ds-btn-secondary" style="width: 100%;" id="basicBtn">
                                Get Started
                            </button>
                        </div>

                        <!-- Professional Plan -->
                        <div style="background: linear-gradient(135deg, var(--ds-primary-600) 0%, var(--ds-primary-800) 100%); padding: var(--ds-space-10) var(--ds-space-8); border-radius: var(--ds-radius-2xl); border: none; position: relative; color: var(--ds-text-inverse); display: flex; flex-direction: column; box-shadow: var(--ds-shadow-lg); transform: scale(1.03); z-index: 10; height: 100%;" class="pricing-card professional">
                            <div style="position: absolute; top: -14px; right: 24px; background: var(--ds-success-500); color: var(--ds-text-inverse); padding: var(--ds-space-1) var(--ds-space-4); border-radius: var(--ds-radius-full); font-size: var(--ds-text-xs); font-weight: var(--ds-weight-bold); letter-spacing: var(--ds-tracking-wider); box-shadow: var(--ds-shadow-sm);">
                                MOST POPULAR
                            </div>
                            <div style="width: 40px; height: 40px; background: rgba(255, 255, 255, 0.2); color: var(--ds-text-inverse); border-radius: var(--ds-radius-lg); display: flex; align-items: center; justify-content: center; margin-bottom: var(--ds-space-5);">
                                <i class="fas fa-rocket"></i>
                            </div>
                            <h3 style="font-size: var(--ds-text-xl); font-weight: var(--ds-weight-bold); margin-bottom: var(--ds-space-2);">Professional</h3>
                            <p style="opacity: 0.85; font-size: var(--ds-text-sm); margin-bottom: var(--ds-space-5);">For growing & multi-company setups</p>

                            <!-- Price display -->
                            <div style="margin-bottom: var(--ds-space-2);">
                                <span style="font-size: var(--ds-text-5xl); font-weight: var(--ds-weight-bold);" id="proPrice">${p.currency}${p.professional['1yr']}</span>
                                <span style="opacity: 0.8; font-size: var(--ds-text-sm);" id="proPeriod"> / year</span>
                            </div>
                            <div style="margin-bottom: var(--ds-space-6);">
                                <span style="opacity: 0.7; font-size: var(--ds-text-xs);" id="proTaxNote">${p.isIndia ? '+ applicable taxes' : 'inclusive of all charges'}</span>
                            </div>

                            <ul style="list-style: none; padding: 0; margin: 0 0 var(--ds-space-8) 0; flex-grow: 1;">
                                <li style="padding: var(--ds-space-2) 0; display: flex; align-items: center; gap: var(--ds-space-3); font-size: var(--ds-text-sm);">
                                    <i class="fas fa-check-circle" style="color: rgba(255, 255, 255, 0.9); font-size: var(--ds-text-sm);"></i>
                                    <span>Unlimited Companies</span>
                                </li>
                                <li style="padding: var(--ds-space-2) 0; display: flex; align-items: center; gap: var(--ds-space-3); font-size: var(--ds-text-sm);">
                                    <i class="fas fa-check-circle" style="color: rgba(255, 255, 255, 0.9); font-size: var(--ds-text-sm);"></i>
                                    <span>Advanced Sync Management</span>
                                </li>
                                <li style="padding: var(--ds-space-2) 0; display: flex; align-items: center; gap: var(--ds-space-3); font-size: var(--ds-text-sm);">
                                    <i class="fas fa-check-circle" style="color: rgba(255, 255, 255, 0.9); font-size: var(--ds-text-sm);"></i>
                                    <span>Priority 24/7 Support</span>
                                </li>
                                <li style="padding: var(--ds-space-2) 0; display: flex; align-items: center; gap: var(--ds-space-3); font-size: var(--ds-text-sm);">
                                    <i class="fas fa-check-circle" style="color: rgba(255, 255, 255, 0.9); font-size: var(--ds-text-sm);"></i>
                                    <span>Real-time Data Fetching</span>
                                </li>
                                <li style="padding: var(--ds-space-2) 0; display: flex; align-items: center; gap: var(--ds-space-3); font-size: var(--ds-text-sm);">
                                    <i class="fas fa-check-circle" style="color: rgba(255, 255, 255, 0.9); font-size: var(--ds-text-sm);"></i>
                                    <span>REST API Access</span>
                                </li>
                            </ul>
                            <button class="ds-btn" style="width: 100%; background: var(--ds-text-inverse); color: var(--ds-primary-600); border: none; font-weight: var(--ds-weight-bold);" id="proBtn">
                                Choose Professional
                            </button>
                        </div>
                    </div>

                    <!-- Region note -->
                    <div style="text-align: center; margin-top: var(--ds-space-6);">
                        <p style="color: var(--ds-text-tertiary); font-size: var(--ds-text-xs);">
                            <i class="fas fa-globe" style="margin-right: 4px;"></i>
                            Pricing shown for <strong>${p.isIndia ? 'India (INR)' : 'International (USD)'}</strong>.
                            ${p.isIndia ? 'Taxes applicable as per GST regulations.' : 'All prices inclusive.'}
                        </p>
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
        const p = getPricing();
        const toggle = document.getElementById('durationToggle');
        if (!toggle) return;

        toggle.addEventListener('click', (e) => {
            const btn = e.target.closest('.duration-btn');
            if (!btn) return;

            const duration = btn.dataset.duration; // '1yr' or '3yr'

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
            if (basicPrice) basicPrice.textContent = p.currency + p.basic[duration];
            if (basicPeriod) basicPeriod.textContent = duration === '3yr' ? ' / 3 years' : ' / year';

            // Update Professional price
            const proPrice = document.getElementById('proPrice');
            const proPeriod = document.getElementById('proPeriod');
            if (proPrice) proPrice.textContent = p.currency + p.professional[duration];
            if (proPeriod) proPeriod.textContent = duration === '3yr' ? ' / 3 years' : ' / year';
        });
    }

    window.initializePurchase = function () {
        console.log('Initializing Purchase Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getPurchaseTemplate();
            initDurationToggle();
        }
    };
})();
