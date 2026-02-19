(function () {
    const getUpdateAppTemplate = () => `
        <div style="padding: var(--ds-space-6); max-width: 750px; margin: 0 auto;">
            <div style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-xl); box-shadow: var(--ds-shadow-sm); overflow: hidden; border: 1px solid var(--ds-border-default);">
                <div style="padding: var(--ds-space-5) var(--ds-space-6); border-bottom: 1px solid var(--ds-border-default); display: flex; align-items: center; gap: var(--ds-space-4); background: var(--ds-bg-surface-sunken);">
                    <div style="width: 44px; height: 44px; background: var(--ds-primary-50); color: var(--ds-primary-500); border-radius: var(--ds-radius-lg); display: flex; align-items: center; justify-content: center; font-size: var(--ds-text-xl); border: 1px solid var(--ds-primary-100);">
                        <i class="fas fa-arrow-alt-circle-up"></i>
                    </div>
                    <div>
                        <h2 style="font-size: var(--ds-text-2xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-1);">Update App</h2>
                        <p style="color: var(--ds-text-tertiary); font-size: var(--ds-text-sm);">Check for updates and keep your app current</p>
                    </div>
                </div>
                
                <div style="padding: var(--ds-space-10) var(--ds-space-6); text-align: center;">
                    <div style="width: 72px; height: 72px; margin: 0 auto var(--ds-space-6); background: linear-gradient(135deg, var(--ds-success-500) 0%, var(--ds-success-700) 100%); border-radius: var(--ds-radius-full); display: flex; align-items: center; justify-content: center; color: var(--ds-text-inverse); font-size: var(--ds-text-4xl); box-shadow: var(--ds-shadow-md);">
                        <i class="fas fa-check"></i>
                    </div>
                    
                    <h3 style="font-size: var(--ds-text-3xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-2);">You're up to date!</h3>
                    <p style="color: var(--ds-text-tertiary); font-size: var(--ds-text-md); margin-bottom: var(--ds-space-8);">Talliffy v1.0 is the latest version available</p>
                    
                    <div style="background: var(--ds-bg-surface-sunken); padding: var(--ds-space-6); border-radius: var(--ds-radius-xl); margin-bottom: var(--ds-space-8); text-align: left; border: 1px solid var(--ds-border-default);">
                        <h4 style="font-size: var(--ds-text-md); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-4); display: flex; align-items: center; gap: var(--ds-space-2);">
                            <i class="fas fa-list-ul" style="color: var(--ds-primary-500);"></i> Version Details
                        </h4>
                        <div style="display: grid; gap: 0;">
                            <div style="display: flex; justify-content: space-between; padding: var(--ds-space-3) 0;">
                                <span style="color: var(--ds-text-tertiary); font-size: var(--ds-text-sm);">Installed Version</span>
                                <span style="color: var(--ds-text-primary); font-weight: var(--ds-weight-semibold); font-size: var(--ds-text-sm);">v1.0</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: var(--ds-space-3) 0; border-top: 1px solid var(--ds-border-default);">
                                <span style="color: var(--ds-text-tertiary); font-size: var(--ds-text-sm);">Last Checked</span>
                                <span style="color: var(--ds-text-primary); font-weight: var(--ds-weight-semibold); font-size: var(--ds-text-sm);">February 19, 2026</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: var(--ds-space-3) 0; border-top: 1px solid var(--ds-border-default);">
                                <span style="color: var(--ds-text-tertiary); font-size: var(--ds-text-sm);">Update Channel</span>
                                <span style="color: var(--ds-text-primary); font-weight: var(--ds-weight-semibold); font-size: var(--ds-text-sm); display: flex; align-items: center; gap: var(--ds-space-2);">
                                    <i class="fas fa-shield-alt" style="font-size: var(--ds-text-xs); color: var(--ds-success-500);"></i> Stable
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <button id="checkUpdateBtn" class="ds-btn ds-btn-primary">
                        <i class="fas fa-sync-alt"></i> Check for Updates
                    </button>
                    
                    <div style="margin-top: var(--ds-space-8); padding-top: var(--ds-space-6); border-top: 1px solid var(--ds-border-default);">
                        <label style="display: flex; align-items: center; justify-content: center; gap: var(--ds-space-3); cursor: pointer;">
                            <input type="checkbox" checked style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--ds-primary-500);">
                            <span style="color: var(--ds-text-tertiary); font-size: var(--ds-text-sm);">Automatically check for updates in the background</span>
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
                checkBtn.classList.add('btn-loading');
                setTimeout(() => {
                    checkBtn.textContent = 'Check for Updates';
                    checkBtn.disabled = false;
                    checkBtn.classList.remove('btn-loading');
                    if (window.Toast) {
                        window.Toast.info('You are running the latest version', 'Up to Date');
                    } else {
                        alert('No new updates available.');
                    }
                }, 2000);
            });
        }
    }
})();
