(function () {
    const getUpdateAppTemplate = () => `
        <div style="padding: 1.75rem; max-width: 750px; margin: 0 auto;">
            <div style="background: white; border-radius: 14px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); overflow: hidden;">
                <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb;">
                    <h2 style="font-size: 1.35rem; font-weight: 700; color: #1e293b; margin-bottom: 0.3rem;">Update App</h2>
                    <p style="color: #64748b; font-size: 0.875rem;">Check for updates and keep your app current</p>
                </div>
                
                <div style="padding: 1.5rem; text-align: center;">
                    <div style="width: 64px; height: 64px; margin: 0 auto 1.15rem; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.75rem;">
                        ✓
                    </div>
                    
                    <h3 style="font-size: 1.25rem; font-weight: 700; color: #1e293b; margin-bottom: 0.4rem;">You're up to date!</h3>
                    <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 1.5rem;">Talliffy v8.4.32 is the latest version</p>
                    
                    <div style="background: #f8f9fb; padding: 1.25rem; border-radius: 10px; margin-bottom: 1.5rem; text-align: left;">
                        <h4 style="font-size: 1rem; font-weight: 700; color: #1e293b; margin-bottom: 0.75rem;">Current Version Details</h4>
                        <div style="display: grid; gap: 0;">
                            <div style="display: flex; justify-content: space-between; padding: 0.55rem 0;">
                                <span style="color: #64748b; font-size: 0.875rem;">Version</span>
                                <span style="color: #1e293b; font-weight: 600; font-size: 0.875rem;">8.4.32</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 0.55rem 0; border-top: 1px solid #e5e7eb;">
                                <span style="color: #64748b; font-size: 0.875rem;">Release Date</span>
                                <span style="color: #1e293b; font-weight: 600; font-size: 0.875rem;">February 3, 2026</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 0.55rem 0; border-top: 1px solid #e5e7eb;">
                                <span style="color: #64748b; font-size: 0.875rem;">Channel</span>
                                <span style="color: #1e293b; font-weight: 600; font-size: 0.875rem;">Stable</span>
                            </div>
                        </div>
                    </div>
                    
                    <button id="checkUpdateBtn" style="padding: 0.6rem 1.75rem; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                        Check for Updates
                    </button>
                    
                    <div style="margin-top: 1.25rem; padding-top: 1.25rem; border-top: 1px solid #e5e7eb;">
                        <label style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer;">
                            <input type="checkbox" checked style="width: 16px; height: 16px; cursor: pointer;">
                            <span style="color: #64748b; font-size: 0.85rem;">Automatically check for updates</span>
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
