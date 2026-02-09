(function () {
    const getPurchaseTemplate = () => `
        <div style="padding: 1.75rem; max-width: 1100px; margin: 0 auto;">
            <div style="background: white; border-radius: 14px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); overflow: hidden;">
                <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb;">
                    <h2 style="font-size: 1.35rem; font-weight: 700; color: #1e293b; margin-bottom: 0.3rem;">Purchase</h2>
                    <p style="color: #64748b; font-size: 0.875rem;">Choose a plan that fits your needs</p>
                </div>
                
                <div style="padding: 1.5rem;">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.15rem; align-items: start;">
                        <!-- Basic Plan -->
                        <div style="background: #f8f9fb; padding: 1.5rem; border-radius: 10px; border: 2px solid transparent; transition: all 0.2s;">
                            <h3 style="font-size: 1.2rem; font-weight: 700; color: #1e293b; margin-bottom: 0.4rem;">Basic</h3>
                            <div style="margin-bottom: 1.15rem;">
                                <span style="font-size: 2rem; font-weight: 700; color: #1e293b;">$29</span>
                                <span style="color: #64748b; font-size: 0.85rem;">/month</span>
                            </div>
                            <ul style="list-style: none; padding: 0; margin: 0 0 1.25rem 0;">
                                <li style="padding: 0.4rem 0; color: #475569; display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
                                    <span style="color: #10b981; font-size: 1rem;">✓</span>
                                    <span>1 Company</span>
                                </li>
                                <li style="padding: 0.4rem 0; color: #475569; display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
                                    <span style="color: #10b981; font-size: 1rem;">✓</span>
                                    <span>Basic Sync Features</span>
                                </li>
                                <li style="padding: 0.4rem 0; color: #475569; display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
                                    <span style="color: #10b981; font-size: 1rem;">✓</span>
                                    <span>Email Support</span>
                                </li>
                                <li style="padding: 0.4rem 0; color: #475569; display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
                                    <span style="color: #10b981; font-size: 1rem;">✓</span>
                                    <span>Monthly Updates</span>
                                </li>
                            </ul>
                            <button style="width: 100%; padding: 0.6rem; background: white; color: #3b82f6; border: 2px solid #3b82f6; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                                Get Started
                            </button>
                        </div>

                        <!-- Professional Plan -->
                        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 1.5rem; border-radius: 10px; border: 2px solid #3b82f6; position: relative; color: white;">
                            <div style="position: absolute; top: -11px; right: 16px; background: #10b981; color: white; padding: 0.2rem 0.7rem; border-radius: 10px; font-size: 0.7rem; font-weight: 600;">
                                POPULAR
                            </div>
                            <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.4rem; color: white;">Professional</h3>
                            <div style="margin-bottom: 1.15rem;">
                                <span style="font-size: 2rem; font-weight: 700;">$79</span>
                                <span style="opacity: 0.9; font-size: 0.85rem;">/month</span>
                            </div>
                            <ul style="list-style: none; padding: 0; margin: 0 0 1.25rem 0;">
                                <li style="padding: 0.4rem 0; display: flex; align-items: center; gap: 0.5rem; opacity: 0.95; font-size: 0.875rem;">
                                    <span style="font-size: 1rem;">✓</span>
                                    <span>Unlimited Companies</span>
                                </li>
                                <li style="padding: 0.4rem 0; display: flex; align-items: center; gap: 0.5rem; opacity: 0.95; font-size: 0.875rem;">
                                    <span style="font-size: 1rem;">✓</span>
                                    <span>Advanced Sync Features</span>
                                </li>
                                <li style="padding: 0.4rem 0; display: flex; align-items: center; gap: 0.5rem; opacity: 0.95; font-size: 0.875rem;">
                                    <span style="font-size: 1rem;">✓</span>
                                    <span>Priority Support</span>
                                </li>
                                <li style="padding: 0.4rem 0; display: flex; align-items: center; gap: 0.5rem; opacity: 0.95; font-size: 0.875rem;">
                                    <span style="font-size: 1rem;">✓</span>
                                    <span>Real-time Sync</span>
                                </li>
                                <li style="padding: 0.4rem 0; display: flex; align-items: center; gap: 0.5rem; opacity: 0.95; font-size: 0.875rem;">
                                    <span style="font-size: 1rem;">✓</span>
                                    <span>API Access</span>
                                </li>
                            </ul>
                            <button style="width: 100%; padding: 0.6rem; background: white; color: #3b82f6; border: 2px solid white; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                                Get Started
                            </button>
                        </div>

                        <!-- Enterprise Plan -->
                        <div style="background: #f8f9fb; padding: 1.5rem; border-radius: 10px; border: 2px solid transparent; transition: all 0.2s;">
                            <h3 style="font-size: 1.2rem; font-weight: 700; color: #1e293b; margin-bottom: 0.4rem;">Enterprise</h3>
                            <div style="margin-bottom: 1.15rem;">
                                <span style="font-size: 2rem; font-weight: 700; color: #1e293b;">Custom</span>
                            </div>
                            <ul style="list-style: none; padding: 0; margin: 0 0 1.25rem 0;">
                                <li style="padding: 0.4rem 0; color: #475569; display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
                                    <span style="color: #10b981; font-size: 1rem;">✓</span>
                                    <span>Everything in Pro</span>
                                </li>
                                <li style="padding: 0.4rem 0; color: #475569; display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
                                    <span style="color: #10b981; font-size: 1rem;">✓</span>
                                    <span>Dedicated Support</span>
                                </li>
                                <li style="padding: 0.4rem 0; color: #475569; display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
                                    <span style="color: #10b981; font-size: 1rem;">✓</span>
                                    <span>Custom Integration</span>
                                </li>
                                <li style="padding: 0.4rem 0; color: #475569; display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
                                    <span style="color: #10b981; font-size: 1rem;">✓</span>
                                    <span>On-premise Option</span>
                                </li>
                                <li style="padding: 0.4rem 0; color: #475569; display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
                                    <span style="color: #10b981; font-size: 1rem;">✓</span>
                                    <span>SLA Guarantee</span>
                                </li>
                            </ul>
                            <button style="width: 100%; padding: 0.6rem; background: white; color: #3b82f6; border: 2px solid #3b82f6; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
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
