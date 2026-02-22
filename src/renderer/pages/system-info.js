(function () {
    const getSystemInfoTemplate = () => `
        <div style="padding: var(--ds-space-6); max-width: 1100px; margin: 0 auto;">
            <div style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-xl); box-shadow: var(--ds-shadow-sm); overflow: hidden; border: 1px solid var(--ds-border-default);">
                <div style="padding: var(--ds-space-5) var(--ds-space-6); border-bottom: 1px solid var(--ds-border-default); display: flex; align-items: center; gap: var(--ds-space-4); background: var(--ds-bg-surface-sunken);">
                    <div style="width: 44px; height: 44px; background: var(--ds-primary-50); color: var(--ds-primary-500); border-radius: var(--ds-radius-lg); display: flex; align-items: center; justify-content: center; font-size: var(--ds-text-xl); border: 1px solid var(--ds-primary-100);">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div>
                        <h2 style="font-size: var(--ds-text-2xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-1);">System Information</h2>
                        <p style="color: var(--ds-text-tertiary); font-size: var(--ds-text-sm);">View system and application details</p>
                    </div>
                </div>
                
                <div style="padding: var(--ds-space-6);">
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--ds-space-4); margin-bottom: var(--ds-space-6);">
                        <div style="background: var(--ds-bg-surface-sunken); padding: var(--ds-space-5); border-radius: var(--ds-radius-lg); display: flex; align-items: center; gap: var(--ds-space-4); border: 1px solid var(--ds-border-default);">
                            <div style="font-size: var(--ds-text-3xl); color: var(--ds-primary-500); opacity: 0.8;"><i class="fas fa-code-branch"></i></div>
                            <div>
                                <div style="font-size: var(--ds-text-2xs); color: var(--ds-text-tertiary); margin-bottom: var(--ds-space-1); text-transform: uppercase; font-weight: var(--ds-weight-bold); letter-spacing: var(--ds-tracking-wider);">Application Version</div>
                                <div style="font-size: var(--ds-text-xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary);">v1.0</div>
                            </div>
                        </div>
                        <div style="background: var(--ds-bg-surface-sunken); padding: var(--ds-space-5); border-radius: var(--ds-radius-lg); display: flex; align-items: center; gap: var(--ds-space-4); border: 1px solid var(--ds-border-default);">
                            <div style="font-size: var(--ds-text-3xl); color: var(--ds-primary-500); opacity: 0.8;"><i class="fas fa-desktop"></i></div>
                            <div>
                                <div style="font-size: var(--ds-text-2xs); color: var(--ds-text-tertiary); margin-bottom: var(--ds-space-1); text-transform: uppercase; font-weight: var(--ds-weight-bold); letter-spacing: var(--ds-tracking-wider);">Platform</div>
                                <div style="font-size: var(--ds-text-xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary);" id="platform">Windows</div>
                            </div>
                        </div>
                    </div>

                    <div style="background: var(--ds-bg-surface-sunken); padding: var(--ds-space-6); border-radius: var(--ds-radius-lg); border: 1px solid var(--ds-border-default);">
                        <h3 style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-4); display: flex; align-items: center; gap: var(--ds-space-2);">
                            <i class="fas fa-microchip" style="color: var(--ds-primary-500);"></i> Hardware Details
                        </h3>
                        <div style="display: grid; gap: 0;">
                            <div style="display: flex; justify-content: space-between; padding: var(--ds-space-3) 0; border-bottom: 1px solid var(--ds-border-default);">
                                <span style="color: var(--ds-text-tertiary); font-weight: var(--ds-weight-medium); font-size: var(--ds-text-sm); display: flex; align-items: center; gap: var(--ds-space-2);">
                                    <i class="fas fa-network-wired" style="width: 16px;"></i> Hostname
                                </span>
                                <span style="color: var(--ds-text-primary); font-weight: var(--ds-weight-semibold); font-size: var(--ds-text-sm);" id="sysHostname">—</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: var(--ds-space-3) 0; border-bottom: 1px solid var(--ds-border-default);">
                                <span style="color: var(--ds-text-tertiary); font-weight: var(--ds-weight-medium); font-size: var(--ds-text-sm); display: flex; align-items: center; gap: var(--ds-space-2);">
                                    <i class="fas fa-cpu" style="width: 16px;"></i> Processor
                                </span>
                                <span style="color: var(--ds-text-primary); font-weight: var(--ds-weight-semibold); font-size: var(--ds-text-sm); max-width: 60%; text-align: right;" id="sysProcessor">—</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: var(--ds-space-3) 0; border-bottom: 1px solid var(--ds-border-default);">
                                <span style="color: var(--ds-text-tertiary); font-weight: var(--ds-weight-medium); font-size: var(--ds-text-sm); display: flex; align-items: center; gap: var(--ds-space-2);">
                                    <i class="fas fa-laptop-code" style="width: 16px;"></i> Operating System
                                </span>
                                <span style="color: var(--ds-text-primary); font-weight: var(--ds-weight-semibold); font-size: var(--ds-text-sm);" id="os">Windows 11</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: var(--ds-space-3) 0; border-bottom: 1px solid var(--ds-border-default);">
                                <span style="color: var(--ds-text-tertiary); font-weight: var(--ds-weight-medium); font-size: var(--ds-text-sm); display: flex; align-items: center; gap: var(--ds-space-2);">
                                    <i class="fas fa-fingerprint" style="width: 16px;"></i> Architecture
                                </span>
                                <span style="color: var(--ds-text-primary); font-weight: var(--ds-weight-semibold); font-size: var(--ds-text-sm);" id="arch">x64</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: var(--ds-space-3) 0; border-bottom: 1px solid var(--ds-border-default);">
                                <span style="color: var(--ds-text-tertiary); font-weight: var(--ds-weight-medium); font-size: var(--ds-text-sm); display: flex; align-items: center; gap: var(--ds-space-2);">
                                    <i class="fas fa-memory" style="width: 16px;"></i> Total Memory
                                </span>
                                <span style="color: var(--ds-text-primary); font-weight: var(--ds-weight-semibold); font-size: var(--ds-text-sm);" id="memory">16 GB</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: var(--ds-space-3) 0;">
                                <span style="color: var(--ds-text-tertiary); font-weight: var(--ds-weight-medium); font-size: var(--ds-text-sm); display: flex; align-items: center; gap: var(--ds-space-2);">
                                    <i class="fas fa-heartbeat" style="width: 16px;"></i> CPU Cores
                                </span>
                                <span style="color: var(--ds-text-primary); font-weight: var(--ds-weight-semibold); font-size: var(--ds-text-sm);" id="cpus">8</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    window.initializeSystemInfo = function () {
        console.log('Initializing System Info Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getSystemInfoTemplate();
            loadSystemInfo();
        }
    };

    function loadSystemInfo() {
        const api = window.electronAPI || {};
        // Populate hostname and processor from preload
        const hostnameEl = document.getElementById('sysHostname');
        const processorEl = document.getElementById('sysProcessor');
        if (hostnameEl) hostnameEl.textContent = api.hostname || '—';
        if (processorEl) processorEl.textContent = api.processor || '—';
        // Platform display name
        const platformEl = document.getElementById('platform');
        if (platformEl) {
            const p = api.platform || '';
            platformEl.textContent = { win32: 'Windows', darwin: 'macOS', linux: 'Linux' }[p] || p || 'Windows';
        }
    }
})();
