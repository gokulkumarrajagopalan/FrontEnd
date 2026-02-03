(function () {
    const getUpdateAppTemplate = () => `
        <div style="padding: 2.5rem; max-width: 800px; margin: 0 auto;">
            <div style="background: white; border-radius: 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); overflow: hidden;">
                <div style="padding: 2rem; border-bottom: 1px solid #e5e7eb;">
                    <h2 style="font-size: 1.875rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">Update App</h2>
                    <p style="color: #64748b; font-size: 0.9375rem;">Check for updates and keep your app current</p>
                </div>
                
                <div style="padding: 2rem; text-align: center;">
                    <div style="width: 80px; height: 80px; margin: 0 auto 1.5rem; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 2.5rem;">
                        ✓
                    </div>
                    
                    <h3 style="font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-bottom: 0.75rem;">You're up to date!</h3>
                    <p style="color: #64748b; font-size: 1rem; margin-bottom: 2rem;">Talliffy v8.4.32 is the latest version</p>
                    
                    <div style="background: #f8f9fb; padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem; text-align: left;">
                        <h4 style="font-size: 1.125rem; font-weight: 700; color: #1e293b; margin-bottom: 1rem;">Current Version Details</h4>
                        <div style="display: grid; gap: 0.75rem;">
                            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0;">
                                <span style="color: #64748b;">Version</span>
                                <span style="color: #1e293b; font-weight: 600;">8.4.32</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-top: 1px solid #e5e7eb;">
                                <span style="color: #64748b;">Release Date</span>
                                <span style="color: #1e293b; font-weight: 600;">February 3, 2026</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-top: 1px solid #e5e7eb;">
                                <span style="color: #64748b;">Channel</span>
                                <span style="color: #1e293b; font-weight: 600;">Stable</span>
                            </div>
                        </div>
                    </div>
                    
                    <button id="checkUpdateBtn" style="padding: 0.75rem 2rem; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                        Check for Updates
                    </button>
                    
                    <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #e5e7eb;">
                        <label style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer;">
                            <input type="checkbox" checked style="width: 18px; height: 18px; cursor: pointer;">
                            <span style="color: #64748b; font-size: 0.875rem;">Automatically check for updates</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `;

    window.initializeUpdateApp = function () {
        console.log('Initializing Update App Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getUpdateAppTemplate();
            setupEventListeners();
        }
    };

    function setupEventListeners() {
        const checkBtn = document.getElementById('checkUpdateBtn');
        if (checkBtn) {
            checkBtn.addEventListener('click', () => {
                checkBtn.textContent = 'Checking...';
                checkBtn.disabled = true;
                setTimeout(() => {
                    checkBtn.textContent = 'Check for Updates';
                    checkBtn.disabled = false;
                    alert('No new updates available.');
                }, 2000);
            });
        }
    }
})();
