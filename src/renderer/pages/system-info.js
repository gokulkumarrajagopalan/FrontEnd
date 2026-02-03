(function () {
    const getSystemInfoTemplate = () => `
        <div style="padding: 2.5rem; max-width: 1200px; margin: 0 auto;">
            <div style="background: white; border-radius: 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); overflow: hidden;">
                <div style="padding: 2rem; border-bottom: 1px solid #e5e7eb;">
                    <h2 style="font-size: 1.875rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">System Information</h2>
                    <p style="color: #64748b; font-size: 0.9375rem;">View system and application details</p>
                </div>
                
                <div style="padding: 2rem;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
                        <div style="background: #f8f9fb; padding: 1.5rem; border-radius: 12px;">
                            <div style="font-size: 0.875rem; color: #64748b; margin-bottom: 0.5rem;">Application Version</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: #1e293b;">v8.4.32</div>
                        </div>
                        <div style="background: #f8f9fb; padding: 1.5rem; border-radius: 12px;">
                            <div style="font-size: 0.875rem; color: #64748b; margin-bottom: 0.5rem;">Platform</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: #1e293b;" id="platform">Windows</div>
                        </div>
                        <div style="background: #f8f9fb; padding: 1.5rem; border-radius: 12px;">
                            <div style="font-size: 0.875rem; color: #64748b; margin-bottom: 0.5rem;">Node Version</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: #1e293b;" id="nodeVersion">Loading...</div>
                        </div>
                        <div style="background: #f8f9fb; padding: 1.5rem; border-radius: 12px;">
                            <div style="font-size: 0.875rem; color: #64748b; margin-bottom: 0.5rem;">Electron Version</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: #1e293b;" id="electronVersion">Loading...</div>
                        </div>
                    </div>

                    <div style="background: #f8f9fb; padding: 1.5rem; border-radius: 12px;">
                        <h3 style="font-size: 1.125rem; font-weight: 700; color: #1e293b; margin-bottom: 1rem;">System Details</h3>
                        <div style="display: grid; gap: 0.75rem;">
                            <div style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #e5e7eb;">
                                <span style="color: #64748b; font-weight: 500;">Operating System</span>
                                <span style="color: #1e293b; font-weight: 600;" id="os">Windows 11</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #e5e7eb;">
                                <span style="color: #64748b; font-weight: 500;">Architecture</span>
                                <span style="color: #1e293b; font-weight: 600;" id="arch">x64</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid #e5e7eb;">
                                <span style="color: #64748b; font-weight: 500;">Total Memory</span>
                                <span style="color: #1e293b; font-weight: 600;" id="memory">16 GB</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 0.75rem 0;">
                                <span style="color: #64748b; font-weight: 500;">CPU Cores</span>
                                <span style="color: #1e293b; font-weight: 600;" id="cpus">8</span>
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
        if (window.electronAPI && window.electronAPI.getSystemInfo) {
            window.electronAPI.getSystemInfo().then(info => {
                document.getElementById('platform').textContent = info.platform || 'Windows';
                document.getElementById('nodeVersion').textContent = info.nodeVersion || 'N/A';
                document.getElementById('electronVersion').textContent = info.electronVersion || 'N/A';
                document.getElementById('os').textContent = info.os || 'Windows 11';
                document.getElementById('arch').textContent = info.arch || 'x64';
                document.getElementById('memory').textContent = info.memory || '16 GB';
                document.getElementById('cpus').textContent = info.cpus || '8';
            });
        }
    }
})();
