(function () {
    const getSystemInfoTemplate = () => `
        <div style="padding: 1.75rem; max-width: 1100px; margin: 0 auto;">
            <div style="background: white; border-radius: 14px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); overflow: hidden;">
                <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb;">
                    <h2 style="font-size: 1.35rem; font-weight: 700; color: #1e293b; margin-bottom: 0.3rem;">System Information</h2>
                    <p style="color: #64748b; font-size: 0.875rem;">View system and application details</p>
                </div>
                
                <div style="padding: 1.5rem;">
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                        <div style="background: #f8f9fb; padding: 1.15rem; border-radius: 10px;">
                            <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 0.35rem;">Application Version</div>
                            <div style="font-size: 1.25rem; font-weight: 700; color: #1e293b;">v1.0</div>
                        </div>
                        <div style="background: #f8f9fb; padding: 1.15rem; border-radius: 10px;">
                            <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 0.35rem;">Platform</div>
                            <div style="font-size: 1.25rem; font-weight: 700; color: #1e293b;" id="platform">Windows</div>
                        </div>
                    </div>

                    <div style="background: #f8f9fb; padding: 1.25rem; border-radius: 10px;">
                        <h3 style="font-size: 1rem; font-weight: 700; color: #1e293b; margin-bottom: 0.85rem;">System Details</h3>
                        <div style="display: grid; gap: 0;">
                            <div style="display: flex; justify-content: space-between; padding: 0.6rem 0; border-bottom: 1px solid #e5e7eb;">
                                <span style="color: #64748b; font-weight: 500; font-size: 0.875rem;">Operating System</span>
                                <span style="color: #1e293b; font-weight: 600; font-size: 0.875rem;" id="os">Windows 11</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 0.6rem 0; border-bottom: 1px solid #e5e7eb;">
                                <span style="color: #64748b; font-weight: 500; font-size: 0.875rem;">Architecture</span>
                                <span style="color: #1e293b; font-weight: 600; font-size: 0.875rem;" id="arch">x64</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 0.6rem 0; border-bottom: 1px solid #e5e7eb;">
                                <span style="color: #64748b; font-weight: 500; font-size: 0.875rem;">Total Memory</span>
                                <span style="color: #1e293b; font-weight: 600; font-size: 0.875rem;" id="memory">16 GB</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 0.6rem 0;">
                                <span style="color: #64748b; font-weight: 500; font-size: 0.875rem;">CPU Cores</span>
                                <span style="color: #1e293b; font-weight: 600; font-size: 0.875rem;" id="cpus">8</span>
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
                document.getElementById('os').textContent = info.os || 'Windows 11';
                document.getElementById('arch').textContent = info.arch || 'x64';
                document.getElementById('memory').textContent = info.memory || '16 GB';
                document.getElementById('cpus').textContent = info.cpus || '8';
            });
        }
    }
})();
