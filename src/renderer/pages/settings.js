(function () {
    const getSettingsTemplate = () => {
        const tallyHostInput = window.UIComponents.input({
            id: 'tallyHost',
            type: 'text',
            label: 'Tally Server Host/IP',
            icon: '<i class="fas fa-server"></i>',
            placeholder: 'localhost',
            value: 'localhost',
            required: true
        });

        const tallyPortInput = window.UIComponents.input({
            id: 'tallyPort',
            type: 'number',
            label: 'Tally Server Port',
            icon: '<i class="fas fa-plug"></i>',
            placeholder: '9000',
            value: '9000',
            required: true
        });

        const syncIntervalInput = window.UIComponents.input({
            id: 'syncInterval',
            type: 'number',
            label: 'Auto Sync Interval (minutes)',
            icon: '<i class="fas fa-sync"></i>',
            placeholder: '30',
            value: '30',
            required: false
        });

        const saveButton = window.UIComponents.button({
            id: 'saveConnectionBtn',
            text: 'Save Settings',
            icon: '<i class="fas fa-save"></i>',
            variant: 'primary',
            fullWidth: true
        });

        const connectionCard = window.UIComponents.card({
            title: 'Tally Connection',
            content: `
                <form id="connectionForm" style="display: flex; flex-direction: column; gap: var(--ds-space-6);">
                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: var(--ds-space-4);">
                        <div>
                            ${tallyHostInput}
                        </div>
                        <div>
                            ${tallyPortInput}
                        </div>
                    </div>
                    <p style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary); margin-top: var(--ds-space--4);">
                        Enter the host/IP address and port where Tally Prime is running (default: localhost:9000)
                    </p>
                    
                    <div>
                        ${syncIntervalInput}
                        <p style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary); margin-top: var(--ds-space-2);">
                            Automatically sync data from Tally at specified intervals (minimum 5 minutes)
                        </p>
                        
                        <div id="autoSyncStatus" style="display: none; margin-top: var(--ds-space-4);">
                            <!-- Status content -->
                        </div>
                    </div>
                    
                    ${saveButton}
                    <div id="connectionStatus" style="margin-top: var(--ds-space-4);"></div>
                </form>
            `
        });

        const appearanceCard = window.UIComponents.card({
            title: 'Appearance',
            content: `
                <div style="display: flex; flex-direction: column; gap: var(--ds-space-6);">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <h4 style="font-size: var(--ds-text-sm); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin: 0;">Application Theme</h4>
                            <p style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary); margin: 0;">Switch between light and dark modes</p>
                        </div>
                        <div style="display: flex; gap: var(--ds-space-2);">
                            ${window.UIComponents.button({ id: 'lightThemeBtn', text: 'Light', icon: '☀️', variant: 'secondary', size: 'sm' })}
                            ${window.UIComponents.button({ id: 'darkThemeBtn', text: 'Dark', icon: '🌙', variant: 'secondary', size: 'sm' })}
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--ds-border-default); pt: var(--ds-space-4); padding-top: var(--ds-space-4);">
                        <div>
                            <h4 style="font-size: var(--ds-text-sm); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin: 0;">Font Size</h4>
                            <p style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary); margin: 0;">Adjust UI text scale</p>
                        </div>
                        <div style="display: flex; align-items: center; gap: var(--ds-space-3);">
                            <input type="range" id="fontSizeSlider" min="12" max="20" step="1" style="width: 100px; accent-color: var(--ds-primary-500);">
                            <span id="fontSizeValue" style="font-size: var(--ds-text-xs); font-weight: var(--ds-weight-bold); color: var(--ds-primary-600); min-width: 40px;">15 px</span>
                        </div>
                    </div>
                </div>
            `
        });

        const aboutCard = window.UIComponents.card({
            title: 'System Information',
            content: `
                <div style="display: flex; flex-direction: column; gap: var(--ds-space-4);">
                    <div style="display: flex; align-items: center; gap: var(--ds-space-4);">
                        <div style="width: 48px; height: 48px; background: var(--ds-primary-500); border-radius: var(--ds-radius-xl); display: flex; align-items: center; justify-content: center; font-size: var(--ds-text-2xl); color: white;">
                            🚀
                        </div>
                        <div>
                            <h4 style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin: 0;">Talliffy Enterprise</h4>
                            <p style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary); margin: 0;">Professional Tally synchronization suite</p>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--ds-space-4); border-top: 1px solid var(--ds-border-default); padding-top: var(--ds-space-4);">
                        <div>
                            <p style="font-size: var(--ds-text-3xs); color: var(--ds-text-tertiary); text-transform: uppercase;">Version</p>
                            <p style="font-weight: var(--ds-weight-bold); color: var(--ds-text-primary);">1.2.4 Build 2026</p>
                        </div>
                        <div>
                            <p style="font-size: var(--ds-text-3xs); color: var(--ds-text-tertiary); text-transform: uppercase;">License</p>
                            <p style="font-weight: var(--ds-weight-bold); color: var(--ds-text-primary);">Enterprise MIT</p>
                        </div>
                        <div style="grid-column: span 2;">
                            <p style="font-size: var(--ds-text-3xs); color: var(--ds-text-tertiary); text-transform: uppercase;">Platform</p>
                            <p style="font-weight: var(--ds-weight-bold); color: var(--ds-text-primary);">Electron 28 (Chromium) + Spring Boot Node</p>
                        </div>
                    </div>
                </div>
            `
        });

        return window.Layout.page({
            title: 'Application Settings',
            subtitle: 'Configure your connection and personalize the terminal experience',
            content: `
                <div style="display: flex; flex-direction: column; gap: var(--ds-space-8);">
                    ${window.Layout.grid({
                columns: 2,
                gap: 8,
                items: [connectionCard, appearanceCard]
            })}
                    ${aboutCard}
                </div>
            `
        });
    };

    if (!window.API_BASE_URL) {
        window.API_BASE_URL = window.AppConfig?.API_BASE_URL || window.apiConfig?.baseURL;
    }

    function loadSettings() {
        const settings = localStorage.getItem('appSettings');
        if (settings) {
            const data = JSON.parse(settings);
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };

            setVal('tallyHost', data.tallyHost || 'localhost');
            setVal('tallyPort', data.tallyPort || '9000');
            setVal('syncInterval', data.syncInterval || '30');
        }
    }

    function validateSettings(tallyHost, tallyPort, syncInterval) {
        if (!tallyHost || tallyHost.trim() === '') {
            throw new Error('Tally Host cannot be empty');
        }
        if (/^\d+$/.test(tallyHost.trim())) {
            throw new Error('Tally Host must be a valid IP or hostname (e.g. localhost), not a port number.');
        }
        if (isNaN(tallyPort) || tallyPort < 1 || tallyPort > 65535) {
            throw new Error('Port must be between 1 and 65535');
        }
        if (isNaN(syncInterval) || syncInterval < 5) {
            throw new Error('Sync Interval must be at least 5 minutes');
        }
        return true;
    }

    function setupEventListeners() {
        const lightThemeBtn = document.getElementById('lightThemeBtn');
        const darkThemeBtn = document.getElementById('darkThemeBtn');
        const fontSlider = document.getElementById('fontSizeSlider');
        const fontValue = document.getElementById('fontSizeValue');

        function applyFontSize(px) {
            document.documentElement.style.fontSize = px + 'px';
            localStorage.setItem('appFontSize', px);

            if (fontValue) {
                fontValue.textContent = px + ' px';
            }
        }

        // Load saved font size
        const savedFontSize = localStorage.getItem('appFontSize') || '15';
        applyFontSize(savedFontSize);

        if (fontSlider) {
            fontSlider.value = savedFontSize;

            fontSlider.addEventListener('input', (e) => {
                const size = e.target.value;
                applyFontSize(size);
                window.notificationService?.success(`Font size set to ${size}px`);
            });
        }


        function updateThemeButtons() {
            const currentTheme = window.themeManager
                ? window.themeManager.getTheme()
                : 'light';

            if (!lightThemeBtn || !darkThemeBtn) return;

            // RESET
            [lightThemeBtn, darkThemeBtn].forEach(btn => {
                btn.style.borderColor = 'var(--border-primary)';
                btn.style.background = 'var(--card-bg)';
                btn.style.color = 'var(--text-primary)';
            });

            // ACTIVE STATE
            if (currentTheme === 'light') {
                lightThemeBtn.style.borderColor = '#3b82f6';
                lightThemeBtn.style.background = 'rgba(59, 130, 246, 0.12)';
                lightThemeBtn.style.color = '#2563eb';
            } else {
                darkThemeBtn.style.borderColor = '#3b82f6';
                darkThemeBtn.style.background = 'rgba(59, 130, 246, 0.12)';
                darkThemeBtn.style.color = '#2563eb';
            }
        }

        if (lightThemeBtn) {
            lightThemeBtn.addEventListener('click', () => {
                if (window.themeManager) {
                    window.themeManager.setTheme('light');
                    updateThemeButtons();
                    if (window.notificationService) {
                        window.notificationService.success('Light theme activated ☀️');
                    }
                }
            });
        }

        if (darkThemeBtn) {
            darkThemeBtn.addEventListener('click', () => {
                if (window.themeManager) {
                    window.themeManager.setTheme('dark');
                    updateThemeButtons();
                    if (window.notificationService) {
                        window.notificationService.success('Dark theme activated 🌙');
                    }
                }
            });
        }

        updateThemeButtons();
        window.addEventListener('theme-applied', updateThemeButtons);

        const saveConnectionBtn = document.getElementById('saveConnectionBtn');
        if (saveConnectionBtn) {
            saveConnectionBtn.addEventListener('click', () => {
                try {
                    let tallyHost = document.getElementById('tallyHost').value.trim() || 'localhost';
                    tallyHost = tallyHost.replace(/^https?:\/\//i, '');
                    const tallyPort = parseInt(document.getElementById('tallyPort').value, 10);
                    const syncInterval = parseInt(document.getElementById('syncInterval').value, 10) || 30;

                    validateSettings(tallyHost, tallyPort, syncInterval);

                    console.log('💾 Saving Settings:');
                    console.log('   Tally Host:', tallyHost);
                    console.log('   Tally Port:', tallyPort);
                    console.log('   Sync Interval:', syncInterval, 'minutes');

                    const settings = {
                        tallyHost: tallyHost,
                        tallyPort: tallyPort,
                        syncInterval: syncInterval
                    };

                    saveSettings(settings);

                    console.log('✅ Settings saved');

                    // Show success message
                    if (window.notificationService) {
                        window.notificationService.success('Settings saved successfully!');
                    }

                    // Also show inline success message
                    const connectionStatus = document.getElementById('connectionStatus');
                    if (connectionStatus) {
                        connectionStatus.innerHTML = `
                            <div class="mt-4 p-3 rounded-xl text-sm flex items-center gap-2" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%); border: 1px solid rgba(16, 185, 129, 0.3); color: #059669;">
                                <span style="font-size: 18px;">✅</span>
                                <span class="font-semibold">Settings saved successfully!</span>
                            </div>
                        `;
                        connectionStatus.classList.remove('hidden');

                        // Auto-hide after 3 seconds
                        setTimeout(() => {
                            connectionStatus.classList.add('hidden');
                        }, 3000);
                    }

                    if (window.electronAPI && window.electronAPI.send) {
                        window.electronAPI.send('update-sync-settings', settings);
                    }

                    if (window.syncScheduler) {
                        console.log('🔄 Restarting sync scheduler with new interval...');
                        window.syncScheduler.restart();
                    }
                } catch (error) {
                    console.error('❌ Settings validation error:', error.message);
                    if (window.notificationService) {
                        window.notificationService.error('❌ ' + error.message);
                    }

                    // Show inline error message
                    const connectionStatus = document.getElementById('connectionStatus');
                    if (connectionStatus) {
                        connectionStatus.innerHTML = `
                            <div class="mt-4 p-3 rounded-xl text-sm flex items-center gap-2" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%); border: 1px solid rgba(239, 68, 68, 0.3); color: #dc2626;">
                                <span style="font-size: 18px;">❌</span>
                                <span class="font-semibold">${error.message}</span>
                            </div>
                        `;
                        connectionStatus.classList.remove('hidden');
                    }
                }
            });
        }
    }

    function saveSettings(newSettings) {
        const current = JSON.parse(localStorage.getItem('appSettings') || '{}');
        localStorage.setItem('appSettings', JSON.stringify({ ...current, ...newSettings }));
    }

    function updateSyncStatus() {
        if (!window.syncScheduler) return;

        const status = window.syncScheduler.getStatus();
        const statusDiv = document.getElementById('autoSyncStatus');
        const indicator = document.getElementById('syncStatusIndicator');
        const statusText = document.getElementById('syncStatusText');
        const lastTimeDiv = document.getElementById('syncLastTime');
        const nextTimeDiv = document.getElementById('syncNextTime');

        if (!statusDiv) return;

        statusDiv.style.display = 'block';

        if (status.isRunning) {
            statusDiv.className = 'mt-2 p-2 rounded-lg text-xs bg-green-50 border border-green-200';
            indicator.textContent = status.isSyncing ? '🔄' : '✅';
            statusText.textContent = status.isSyncing
                ? 'Syncing now...'
                : `Auto-sync active (every ${status.syncInterval} min)`;

            if (status.lastSyncTime) {
                lastTimeDiv.style.display = 'block';
                lastTimeDiv.textContent = `Last sync: ${status.lastSyncTime.toLocaleString()}`;
            }

            if (status.nextSyncTime) {
                nextTimeDiv.style.display = 'block';
                nextTimeDiv.textContent = `Next sync: ${status.nextSyncTime.toLocaleString()}`;
            }
        } else {
            statusDiv.className = 'mt-2 p-2 rounded-lg text-xs bg-gray-50 border border-gray-200';
            indicator.textContent = '⏸️';
            statusText.textContent = 'Auto-sync disabled';
            lastTimeDiv.style.display = 'none';
            nextTimeDiv.style.display = 'none';
        }
    }

    window.initializeSettings = function () {
        console.log('Initializing Settings Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getSettingsTemplate();
            loadSettings();
            updateSyncStatus();

            setInterval(updateSyncStatus, 5000);
            setupEventListeners();
        }
    };
})();
