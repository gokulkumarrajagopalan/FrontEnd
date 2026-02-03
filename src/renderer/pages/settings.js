(function () {
    const getSettingsTemplate = () => {
        const tallyPortInput = window.UIComponents.input({
            id: 'tallyPort',
            type: 'number',
            label: '🔌 Tally Prime Port',
            placeholder: '9000',
            value: '9000',
            required: true
        });

        const syncIntervalInput = window.UIComponents.input({
            id: 'syncInterval',
            type: 'number',
            label: '🔄 Auto Sync Interval (minutes)',
            placeholder: '30',
            value: '30',
            required: false
        });

        const saveButton = window.UIComponents.button({
            id: 'saveConnectionBtn',
            text: 'Save Settings',
            icon: '💾',
            variant: 'primary',
            fullWidth: true
        });

        const tallyConnectionCard = window.UIComponents.card({
            title: '🔌 Tally Prime Connection',
            content: `
                <style>
                    input[type=number]::-webkit-inner-spin-button,
                    input[type=number]::-webkit-outer-spin-button {
                        -webkit-appearance: none;
                        margin: 0;
                    }
                    input[type=number] {
                        -moz-appearance: textfield;
                    }
                </style>
                <form id="connectionForm" class="space-y-6">
                    <div>
                        ${tallyPortInput}
                        <small class="text-xs text-gray-600 mt-2 block">
                            Port number for Tally Prime ODBC/HTTP Server (default: 9000)
                            <br>
                            <span class="text-amber-600">⚠️ Changes apply immediately to all sync operations</span>
                        </small>
                    </div>
                    
                    <div>
                        ${syncIntervalInput}
                        <small class="text-xs text-gray-600 mt-2 block">
                            Automatically sync data from Tally at specified intervals (0 to disable)
                            <br>
                            <span class="text-blue-600">💡 Recommended: 15-30 minutes for active businesses</span>
                        </small>
                        
                        <div id="autoSyncStatus" class="mt-3 p-3 rounded-xl text-xs" style="display: none;">
                            <div class="flex items-center gap-2">
                                <span id="syncStatusIndicator">⏸️</span>
                                <span id="syncStatusText" class="font-semibold">Auto-sync disabled</span>
                            </div>
                            <div id="syncLastTime" class="text-gray-600 mt-1" style="display: none;"></div>
                            <div id="syncNextTime" class="text-gray-600" style="display: none;"></div>
                        </div>
                    </div>
                    
                    ${saveButton}
                    <div id="connectionStatus" class="hidden"></div>
                </form>
            `
        });

        const aboutCard = window.UIComponents.card({
            title: 'ℹ️ About',
            content: `
                <div class="space-y-3">
                    <div class="flex items-center gap-3">
                        <div class="text-3xl">🚀</div>
                        <div>
                            <h4 class="font-bold" style="color: var(--text-primary);">Talliffy</h4>
                            <p class="text-sm" style="color: var(--text-tertiary);">Professional Tally Sync Application</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4 pt-4" style="border-top: 1px solid var(--border-primary);">
                        <div>
                            <p class="text-xs" style="color: var(--text-tertiary);">Version</p>
                            <p class="font-semibold" style="color: var(--text-primary);">1.0.0</p>
                        </div>
                        <div>
                            <p class="text-xs" style="color: var(--text-tertiary);">License</p>
                            <p class="font-semibold" style="color: var(--text-primary);">MIT</p>
                        </div>
                        <div class="col-span-2">
                            <p class="text-xs" style="color: var(--text-tertiary);">Built with</p>
                            <p class="font-semibold" style="color: var(--text-primary);">Electron + Spring Boot</p>
                        </div>
                    </div>
                </div>
            `
        });

        const themeCard = window.UIComponents.card({
    title: '🎨 Appearance',
    content: `
        <div class="space-y-4 text-sm">

            <!-- THEME -->
            <div class="flex items-center justify-between">
                <span class="font-semibold" style="color: var(--text-primary);">
                    Theme
                </span>
                <div class="flex gap-2">
                    <button type="button" id="lightThemeBtn"
                        class="px-3 py-1 rounded-md border text-sm theme-btn">
                        ☀️ Light
                    </button>

                    <button type="button" id="darkThemeBtn"
                        class="px-3 py-1 rounded-md border text-sm theme-btn">
                        🌙 Dark
                    </button>
                </div>
            </div>
        </div>
    `
});


        return window.Layout.page({
    title: 'Settings',
    subtitle: 'Configure Tally connection and application preferences',
    content: `
        <div>

            <!-- FORCE TWO COLUMNS -->
            <div style="
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 24px;
                align-items: stretch;
            ">

                <!-- LEFT -->
                <div style="min-width: 0;">
                    ${tallyConnectionCard}
                </div>

                <!-- RIGHT -->
                <div style="min-width: 0;">
                    ${themeCard}
                </div>

            </div>

            <!-- ABOUT FULL WIDTH -->
            <div style="margin-top: 24px;">
                ${aboutCard}
            </div>

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

            setVal('tallyPort', data.tallyPort || '9000');
            setVal('syncInterval', data.syncInterval || '30');
        }
    }

    function validateSettings(tallyPort, syncInterval) {
        if (isNaN(tallyPort) || tallyPort < 1 || tallyPort > 65535) {
            throw new Error('Port must be between 1 and 65535');
        }
        if (isNaN(syncInterval) || syncInterval < 0) {
            throw new Error('Interval must be a positive number');
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
        lightThemeBtn.style.borderColor = 'var(--primary-600)';
        lightThemeBtn.style.background = 'rgba(94, 134, 186, 0.12)';
        lightThemeBtn.style.color = 'var(--primary-700)';
    } else {
        darkThemeBtn.style.borderColor = 'var(--primary-600)';
        darkThemeBtn.style.background = 'rgba(94, 134, 186, 0.12)';
        darkThemeBtn.style.color = 'var(--primary-700)';
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
                    const tallyPort = parseInt(document.getElementById('tallyPort').value, 10);
                    const syncInterval = parseInt(document.getElementById('syncInterval').value, 10) || 30;

                    validateSettings(tallyPort, syncInterval);

                    console.log('💾 Saving Settings:');
                    console.log('   Tally Port:', tallyPort);
                    console.log('   Sync Interval:', syncInterval, 'minutes');

                    const settings = {
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
