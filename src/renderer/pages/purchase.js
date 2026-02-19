(function () {
    const getPurchaseTemplate = () => `
        <div style="padding: var(--ds-space-6); max-width: 1100px; margin: 0 auto;">
            <div style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-xl); box-shadow: var(--ds-shadow-sm); overflow: hidden; border: 1px solid var(--ds-border-default);">
                <div style="padding: var(--ds-space-5) var(--ds-space-6); border-bottom: 1px solid var(--ds-border-default); display: flex; align-items: center; gap: var(--ds-space-4); background: var(--ds-bg-surface-sunken);">
                    <div style="width: 44px; height: 44px; background: var(--ds-primary-50); color: var(--ds-primary-500); border-radius: var(--ds-radius-lg); display: flex; align-items: center; justify-content: center; font-size: var(--ds-text-xl); border: 1px solid var(--ds-primary-100);">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div>
                        <h2 style="font-size: var(--ds-text-2xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-1);">Choose Your Plan</h2>
                        <p style="color: var(--ds-text-tertiary); font-size: var(--ds-text-sm);">Flexible pricing for teams of all sizes</p>
                    </div>
                </div>
                
                <div style="padding: var(--ds-space-8) var(--ds-space-6) var(--ds-space-12);">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--ds-space-6); align-items: stretch;">
                        <!-- Basic Plan -->
                        <div style="background: var(--ds-bg-surface); padding: var(--ds-space-8); border-radius: var(--ds-radius-2xl); border: 1px solid var(--ds-border-default); display: flex; flex-direction: column; transition: all var(--ds-duration-base) var(--ds-ease); height: 100%;" class="pricing-card">
                            <div style="width: 40px; height: 40px; background: var(--ds-success-50); color: var(--ds-success-500); border-radius: var(--ds-radius-lg); display: flex; align-items: center; justify-content: center; margin-bottom: var(--ds-space-5); border: 1px solid var(--ds-success-100);">
                                <i class="fas fa-seedling"></i>
                            </div>
                            <h3 style="font-size: var(--ds-text-xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-2);">Basic</h3>
                            <div style="margin-bottom: var(--ds-space-6);">
                                <span style="font-size: var(--ds-text-4xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary);">$29</span>
                                <span style="color: var(--ds-text-tertiary); font-size: var(--ds-text-sm);">/month</span>
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
                            <button class="ds-btn ds-btn-secondary" style="width: 100%;">
                                Get Started
                            </button>
                        </div>

                        <!-- Professional Plan -->
                        <div style="background: linear-gradient(135deg, var(--ds-primary-600) 0%, var(--ds-primary-800) 100%); padding: var(--ds-space-10) var(--ds-space-8); border-radius: var(--ds-radius-2xl); border: none; position: relative; color: var(--ds-text-inverse); display: flex; flex-direction: column; box-shadow: var(--ds-shadow-lg); transform: scale(1.05); z-index: 10; height: 100%;" class="pricing-card professional">
                            <div style="position: absolute; top: -14px; right: 24px; background: var(--ds-success-500); color: var(--ds-text-inverse); padding: var(--ds-space-1) var(--ds-space-4); border-radius: var(--ds-radius-full); font-size: var(--ds-text-xs); font-weight: var(--ds-weight-bold); letter-spacing: var(--ds-tracking-wider); box-shadow: var(--ds-shadow-sm);">
                                MOST POPULAR
                            </div>
                            <div style="width: 40px; height: 40px; background: rgba(255, 255, 255, 0.2); color: var(--ds-text-inverse); border-radius: var(--ds-radius-lg); display: flex; align-items: center; justify-content: center; margin-bottom: var(--ds-space-5);">
                                <i class="fas fa-rocket"></i>
                            </div>
                            <h3 style="font-size: var(--ds-text-xl); font-weight: var(--ds-weight-bold); margin-bottom: var(--ds-space-2);">Professional</h3>
                            <div style="margin-bottom: var(--ds-space-6);">
                                <span style="font-size: var(--ds-text-5xl); font-weight: var(--ds-weight-bold);">$79</span>
                                <span style="opacity: 0.8; font-size: var(--ds-text-sm);">/month</span>
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
                            <button class="ds-btn" style="width: 100%; background: var(--ds-text-inverse); color: var(--ds-primary-600); border: none; font-weight: var(--ds-weight-bold);">
                                Choose Professional
                            </button>
                        </div>

                        <!-- Enterprise Plan -->
                        <div style="background: var(--ds-bg-surface); padding: var(--ds-space-8); border-radius: var(--ds-radius-2xl); border: 1px solid var(--ds-border-default); display: flex; flex-direction: column; transition: all var(--ds-duration-base) var(--ds-ease); height: 100%;" class="pricing-card">
                            <div style="width: 40px; height: 40px; background: var(--ds-primary-50); color: var(--ds-primary-500); border-radius: var(--ds-radius-lg); display: flex; align-items: center; justify-content: center; margin-bottom: var(--ds-space-5); border: 1px solid var(--ds-primary-100);">
                                <i class="fas fa-building"></i>
                            </div>
                            <h3 style="font-size: var(--ds-text-xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-2);">Enterprise</h3>
                            <div style="margin-bottom: var(--ds-space-6);">
                                <span style="font-size: var(--ds-text-4xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary);">Custom</span>
                            </div>
                            <ul style="list-style: none; padding: 0; margin: 0 0 var(--ds-space-8) 0; flex-grow: 1;">
                                <li style="padding: var(--ds-space-2) 0; color: var(--ds-text-secondary); display: flex; align-items: center; gap: var(--ds-space-3); font-size: var(--ds-text-sm);">
                                    <i class="fas fa-check-circle" style="color: var(--ds-success-500); font-size: var(--ds-text-sm);"></i>
                                    <span>Everything in Pro</span>
                                </li>
                                <li style="padding: var(--ds-space-2) 0; color: var(--ds-text-secondary); display: flex; align-items: center; gap: var(--ds-space-3); font-size: var(--ds-text-sm);">
                                    <i class="fas fa-check-circle" style="color: var(--ds-success-500); font-size: var(--ds-text-sm);"></i>
                                    <span>Dedicated Account Team</span>
                                </li>
                                <li style="padding: var(--ds-space-2) 0; color: var(--ds-text-secondary); display: flex; align-items: center; gap: var(--ds-space-3); font-size: var(--ds-text-sm);">
                                    <i class="fas fa-check-circle" style="color: var(--ds-success-500); font-size: var(--ds-text-sm);"></i>
                                    <span>On-Premise Deployment</span>
                                </li>
                                <li style="padding: var(--ds-space-2) 0; color: var(--ds-text-secondary); display: flex; align-items: center; gap: var(--ds-space-3); font-size: var(--ds-text-sm);">
                                    <i class="fas fa-check-circle" style="color: var(--ds-success-500); font-size: var(--ds-text-sm);"></i>
                                    <span>SLA & Legal Coverage</span>
                                </li>
                            </ul>
                            <button class="ds-btn ds-btn-secondary" style="width: 100%;">
                                Contact Sales
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    window.initializePurchase = function () {
        console.log('Initializing Purchase Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getPurchaseTemplate();
        }
    };
})();
