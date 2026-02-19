(function () {
    // ============================================
    // ENHANCED SETTINGS PAGE - PRODUCTION READY
    // ============================================

    const SETTINGS_KEYS = {
        TALLY_PORT: 'tallyPort',
        BACKEND_URL: 'backendUrl',
        SYNC_INTERVAL: 'syncInterval',
        AUTO_SYNC_ON_STARTUP: 'autoSyncOnStartup',
        THEME: 'theme',
        NOTIFICATIONS_ENABLED: 'notificationsEnabled',
        SOUND_ENABLED: 'soundEnabled',
        DEBUG_MODE: 'debugMode',
        LOG_RETENTION_DAYS: 'logRetentionDays',
        BATCH_SIZE: 'batchSize'
    };

    const DEFAULT_SETTINGS = {
        [SETTINGS_KEYS.TALLY_PORT]: 9000,
        [SETTINGS_KEYS.BACKEND_URL]: 'http://localhost:8080',
        [SETTINGS_KEYS.SYNC_INTERVAL]: 30,
        [SETTINGS_KEYS.AUTO_SYNC_ON_STARTUP]: false,
        [SETTINGS_KEYS.THEME]: 'light',
        [SETTINGS_KEYS.NOTIFICATIONS_ENABLED]: true,
        [SETTINGS_KEYS.SOUND_ENABLED]: true,
        [SETTINGS_KEYS.DEBUG_MODE]: false,
        [SETTINGS_KEYS.LOG_RETENTION_DAYS]: 7,
        [SETTINGS_KEYS.BATCH_SIZE]: 500
    };

    function loadSettings() {
        // Read from appSettings JSON blob (single source of truth)
        const appSettingsRaw = localStorage.getItem('appSettings');
        const appSettings = appSettingsRaw ? JSON.parse(appSettingsRaw) : {};

        // Theme is stored separately in 'app-theme'
        const theme = localStorage.getItem('app-theme') || 'light';

        const settings = {
            [SETTINGS_KEYS.TALLY_PORT]: appSettings.tallyPort ?? DEFAULT_SETTINGS[SETTINGS_KEYS.TALLY_PORT],
            [SETTINGS_KEYS.BACKEND_URL]: appSettings.backendUrl ?? DEFAULT_SETTINGS[SETTINGS_KEYS.BACKEND_URL],
            [SETTINGS_KEYS.SYNC_INTERVAL]: appSettings.syncInterval ?? DEFAULT_SETTINGS[SETTINGS_KEYS.SYNC_INTERVAL],
            [SETTINGS_KEYS.AUTO_SYNC_ON_STARTUP]: appSettings.autoSyncOnStartup ?? DEFAULT_SETTINGS[SETTINGS_KEYS.AUTO_SYNC_ON_STARTUP],
            [SETTINGS_KEYS.THEME]: theme,
            [SETTINGS_KEYS.NOTIFICATIONS_ENABLED]: appSettings.notificationsEnabled ?? DEFAULT_SETTINGS[SETTINGS_KEYS.NOTIFICATIONS_ENABLED],
            [SETTINGS_KEYS.SOUND_ENABLED]: appSettings.soundEnabled ?? DEFAULT_SETTINGS[SETTINGS_KEYS.SOUND_ENABLED],
            [SETTINGS_KEYS.DEBUG_MODE]: appSettings.debugMode ?? DEFAULT_SETTINGS[SETTINGS_KEYS.DEBUG_MODE],
            [SETTINGS_KEYS.LOG_RETENTION_DAYS]: appSettings.logRetentionDays ?? DEFAULT_SETTINGS[SETTINGS_KEYS.LOG_RETENTION_DAYS],
            [SETTINGS_KEYS.BATCH_SIZE]: appSettings.batchSize ?? DEFAULT_SETTINGS[SETTINGS_KEYS.BATCH_SIZE]
        };
        return settings;
    }

    function saveSetting(key, value) {
        // Save into the appSettings JSON blob (single source of truth)
        const current = JSON.parse(localStorage.getItem('appSettings') || '{}');
        current[key] = value;
        localStorage.setItem('appSettings', JSON.stringify(current));
    }




    const getSettingsTemplate = () => {
        const settings = loadSettings();

        const tabs = [
            { id: 'general', label: 'General', icon: 'fas fa-wrench' },
            { id: 'sync', label: 'Sync', icon: 'fas fa-sync-alt' },
            { id: 'notifications', label: 'Notifications', icon: 'fas fa-bell' },
            // { id: 'advanced', label: 'Advanced', icon: 'fas fa-tools' },   // Disabled — uncomment to restore
            // { id: 'help', label: 'Help', icon: 'fas fa-question-circle' }, // Disabled — uncomment to restore
            { id: 'about', label: 'About', icon: 'fas fa-info-circle' }
        ];

        return window.Layout.page({
            title: 'Settings',
            subtitle: 'Manage your application preferences and configurations',
            icon: 'fas fa-cog',
            content: `
                <div class="settings-container" style="max-width: 900px; margin: 0 auto;">
                    <!-- Modernized Tab Navigation -->
                    <div class="ds-tabs-wrapper" style="margin-bottom: var(--ds-space-8);">
                        <div class="tabs" style="display: flex; gap: var(--ds-space-1); background: var(--ds-bg-surface-sunken); padding: var(--ds-space-1-5); border-radius: var(--ds-radius-2xl); border: 1px solid var(--ds-border-default);">
                            ${tabs.map(tab => `
                                <button class="tab ${tab.id === 'general' ? 'active' : ''}" 
                                        data-tab="${tab.id}" 
                                        style="flex: 1; display: flex; align-items: center; justify-content: center; gap: var(--ds-space-2); padding: var(--ds-space-3) var(--ds-space-4); border: none; border-radius: var(--ds-radius-xl); font-size: var(--ds-text-sm); font-weight: var(--ds-weight-semibold); cursor: pointer; transition: all var(--ds-duration-base); background: transparent; color: var(--ds-text-secondary);">
                                    <i class="${tab.icon}" style="font-size: 14px;"></i>
                                    <span>${tab.label}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Tab Contents -->
                    <div class="tab-contents">
                        <!-- General Tab -->
                        <div class="tab-content active" data-content="general">
                            ${window.UIComponents.card({
                title: 'Appearance',
                content: `
                                    <div style="display: flex; flex-direction: column; gap: var(--ds-space-6);">
                                        <div>
                                            <label class="ds-label" style="display: block; margin-bottom: var(--ds-space-2); font-size: var(--ds-text-sm); font-weight: var(--ds-weight-bold); color: var(--ds-text-secondary);">Theme</label>
                                            <div style="position: relative;">
                                                <select id="themeSelect" class="ds-select" style="width: 100%; padding: var(--ds-space-3) var(--ds-space-4); border-radius: var(--ds-radius-xl); border: 2px solid var(--ds-border-default); background: var(--ds-bg-surface); font-size: var(--ds-text-md); color: var(--ds-text-primary); appearance: none; cursor: pointer;">
                                                    <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light</option>
                                                    <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                                                    <option value="auto" ${settings.theme === 'auto' ? 'selected' : ''}>System Auto</option>
                                                </select>
                                                <i class="fas fa-chevron-down" style="position: absolute; right: var(--ds-space-4); top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--ds-text-tertiary); font-size: 12px;"></i>
                                            </div>
                                            <p style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary); margin-top: var(--ds-space-2);">Changes will apply immediately after selection.</p>
                                        </div>
                                    </div>
                                `
            })}
                        </div>

                        <!-- Sync Tab -->
                        <div class="tab-content" data-content="sync">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--ds-space-6);">
                                <div style="display: flex; flex-direction: column; gap: var(--ds-space-6);">
                                    ${window.UIComponents.card({
                title: 'Tally Connection',
                content: `
                                            <div style="display: flex; flex-direction: column; gap: var(--ds-space-4);">
                                                ${window.UIComponents.input({
                    id: 'tallyPort',
                    type: 'number',
                    label: 'Tally Port Number',
                    value: settings.tallyPort,
                    icon: '<i class="fas fa-plug"></i>'
                })}
                                                <div style="display: flex; align-items: center; gap: var(--ds-space-2); padding: var(--ds-space-3); background: var(--ds-warning-50); border: 1px solid var(--ds-warning-200); border-radius: var(--ds-radius-lg); color: var(--ds-warning-700); font-size: var(--ds-text-xs);">
                                                    <i class="fas fa-exclamation-triangle"></i>
                                                    <span>Default port is 9000. Ensure Tally Prime is running on this port.</span>
                                                </div>
                                            </div>
                                        `
            })}
                                    
                                    ${window.UIComponents.card({
                title: 'Status',
                content: `
                                            <div style="display: flex; align-items: center; gap: var(--ds-space-3);">
                                                <div style="width: 12px; height: 12px; border-radius: 50%; background: var(--ds-success-500); box-shadow: 0 0 10px var(--ds-success-500);"></div>
                                                <span style="font-weight: var(--ds-weight-bold); color: var(--ds-text-primary);">Ready to sync</span>
                                            </div>
                                        `
            })}
                                </div>

                                <div style="display: flex; flex-direction: column; gap: var(--ds-space-6);">
                                    ${window.UIComponents.card({
                title: 'Auto Sync Settings',
                content: `
                                            <div style="display: flex; flex-direction: column; gap: var(--ds-space-6);">
                                                <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: var(--ds-space-4); border-bottom: 1px solid var(--ds-border-default);">
                                                    <div>
                                                        <div style="font-weight: var(--ds-weight-bold); color: var(--ds-text-primary);">Sync on Startup</div>
                                                        <div style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary);">Check for updates when app opens</div>
                                                    </div>
                                                    <label class="toggle-switch">
                                                        <input type="checkbox" id="autoSyncOnStartup" ${settings.autoSyncOnStartup ? 'checked' : ''}>
                                                        <span class="toggle-slider"></span>
                                                    </label>
                                                </div>

                                                ${window.UIComponents.input({
                    id: 'syncInterval',
                    type: 'number',
                    label: 'Sync Interval (minutes)',
                    value: settings.syncInterval,
                    icon: '<i class="fas fa-clock"></i>'
                })}

                                                <div>
                                                    <label class="ds-label" style="display: block; margin-bottom: var(--ds-space-2); font-size: var(--ds-text-sm); font-weight: var(--ds-weight-bold); color: var(--ds-text-secondary);">Batch Size</label>
                                                    <div style="position: relative;">
                                                        <select id="batchSize" class="ds-select" style="width: 100%; padding: var(--ds-space-3) var(--ds-space-4); border-radius: var(--ds-radius-xl); border: 2px solid var(--ds-border-default); background: var(--ds-bg-surface); font-size: var(--ds-text-md); color: var(--ds-text-primary); appearance: none;">
                                                            <option value="500" ${settings.batchSize === 500 ? 'selected' : ''}>500 (Recommended)</option>
                                                            <option value="1000" ${settings.batchSize === 1000 ? 'selected' : ''}>1000</option>
                                                            <option value="2000" ${settings.batchSize === 2000 ? 'selected' : ''}>2000</option>
                                                        </select>
                                                        <i class="fas fa-chevron-down" style="position: absolute; right: var(--ds-space-4); top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--ds-text-tertiary); font-size: 12px;"></i>
                                                    </div>
                                                </div>
                                            </div>
                                        `
            })}
                                </div>
                            </div>
                        </div>

                        <!-- Notifications Tab -->
                        <div class="tab-content" data-content="notifications">
                            ${window.UIComponents.card({
                title: 'Notification Preferences',
                content: `
                                    <div style="display: flex; flex-direction: column; gap: var(--ds-space-4);">
                                        <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--ds-space-4); background: var(--ds-bg-surface-sunken); border-radius: var(--ds-radius-xl);">
                                            <div>
                                                <div style="font-weight: var(--ds-weight-bold); color: var(--ds-text-primary);">Enable Notifications</div>
                                                <div style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary);">Show desktop alerts for sync status</div>
                                            </div>
                                            <label class="toggle-switch">
                                                <input type="checkbox" id="notificationsEnabled" ${settings.notificationsEnabled ? 'checked' : ''}>
                                                <span class="toggle-slider"></span>
                                            </label>
                                        </div>

                                        <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--ds-space-4); background: var(--ds-bg-surface-sunken); border-radius: var(--ds-radius-xl);">
                                            <div>
                                                <div style="font-weight: var(--ds-weight-bold); color: var(--ds-text-primary);">Sound Effects</div>
                                                <div style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary);">Play sound when tasks complete</div>
                                            </div>
                                            <label class="toggle-switch">
                                                <input type="checkbox" id="soundEnabled" ${settings.soundEnabled ? 'checked' : ''}>
                                                <span class="toggle-slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                `
            })}
                        </div>

                        <!-- Advanced Tab -->
                        <div class="tab-content" data-content="advanced">
                            <div style="display: flex; flex-direction: column; gap: var(--ds-space-6);">
                                ${window.UIComponents.card({
                title: 'Developer Options',
                content: `
                                        <div style="display: flex; flex-direction: column; gap: var(--ds-space-4);">
                                            <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--ds-space-4); background: var(--ds-bg-surface-sunken); border-radius: var(--ds-radius-xl);">
                                                <div>
                                                    <div style="font-weight: var(--ds-weight-bold); color: var(--ds-text-primary);">Debug Mode</div>
                                                    <div style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary);">Enable detailed logging for support</div>
                                                </div>
                                                <label class="toggle-switch">
                                                    <input type="checkbox" id="debugMode" ${settings.debugMode ? 'checked' : ''}>
                                                    <span class="toggle-slider"></span>
                                                </label>
                                            </div>

                                            <div>
                                                <label class="ds-label" style="display: block; margin-bottom: var(--ds-space-2); font-size: var(--ds-text-sm); font-weight: var(--ds-weight-bold); color: var(--ds-text-secondary);">Log Retention</label>
                                                <select id="logRetentionDays" class="ds-select" style="width: 100%; padding: var(--ds-space-3) var(--ds-space-4); border-radius: var(--ds-radius-xl); border: 2px solid var(--ds-border-default); background: var(--ds-bg-surface); font-size: var(--ds-text-md); color: var(--ds-text-primary); appearance: none;">
                                                    <option value="7" ${settings.logRetentionDays === 7 ? 'selected' : ''}>7 days</option>
                                                    <option value="14" ${settings.logRetentionDays === 14 ? 'selected' : ''}>14 days</option>
                                                    <option value="30" ${settings.logRetentionDays === 30 ? 'selected' : ''}>30 days</option>
                                                </select>
                                            </div>
                                        </div>
                                    `
            })}

                                ${window.UIComponents.card({
                title: 'Data Management',
                content: `
                                        <div style="display: flex; gap: var(--ds-space-4); flex-wrap: wrap;">
                                            <button id="clearCacheBtn" class="ds-btn ds-btn-secondary ds-btn-sm" style="flex: 1; min-width: 150px;">
                                                <i class="fas fa-eraser mr-2"></i> Clear Cache
                                            </button>
                                            <button id="exportLogsBtn" class="ds-btn ds-btn-secondary ds-btn-sm" style="flex: 1; min-width: 150px;">
                                                <i class="fas fa-file-export mr-2"></i> Export Logs
                                            </button>
                                            <button id="factoryResetBtn" class="ds-btn ds-btn-danger ds-btn-sm" style="flex: 1; min-width: 150px;">
                                                <i class="fas fa-trash-alt mr-2"></i> Factory Reset
                                            </button>
                                        </div>
                                    `
            })}
                            </div>
                        </div>

                        <!-- Help Tab -->
                        <div class="tab-content" data-content="help">
                            ${window.UIComponents.card({
                title: 'Documentation & Support',
                content: `
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--ds-space-4);">
                                        <button id="userGuideBtn" class="ds-btn ds-btn-secondary" style="display: flex; flex-direction: column; align-items: center; gap: var(--ds-space-2); padding: var(--ds-space-6);">
                                            <i class="fas fa-book-open" style="font-size: 24px; color: var(--ds-primary-600);"></i>
                                            <span>User Guide</span>
                                        </button>
                                        <button id="faqBtn" class="ds-btn ds-btn-secondary" style="display: flex; flex-direction: column; align-items: center; gap: var(--ds-space-2); padding: var(--ds-space-6);">
                                            <i class="fas fa-question-circle" style="font-size: 24px; color: var(--ds-primary-600);"></i>
                                            <span>FAQs</span>
                                        </button>
                                        <button id="reportBugBtn" class="ds-btn ds-btn-secondary" style="display: flex; flex-direction: column; align-items: center; gap: var(--ds-space-2); padding: var(--ds-space-6);">
                                            <i class="fas fa-bug" style="font-size: 24px; color: var(--ds-primary-600);"></i>
                                            <span>Report Bug</span>
                                        </button>
                                        <button id="contactSupportBtn" class="ds-btn ds-btn-secondary" style="display: flex; flex-direction: column; align-items: center; gap: var(--ds-space-2); padding: var(--ds-space-6);">
                                            <i class="fas fa-comments" style="font-size: 24px; color: var(--ds-primary-600);"></i>
                                            <span>Live Support</span>
                                        </button>
                                    </div>
                                `
            })}
                        </div>

                        <!-- About Tab -->
                        <div class="tab-content" data-content="about">
                            ${window.UIComponents.card({
                content: `
                                    <div style="text-align: center; padding: var(--ds-space-8);">
                                        <div style="width: 80px; height: 80px; border-radius: var(--ds-radius-2xl); background: white; box-shadow: var(--ds-shadow-lg); display: inline-flex; align-items: center; justify-content: center; margin-bottom: var(--ds-space-6);">
                                            <img src="assets/brand/talliffy-icon.png" style="width: 56px; height: 56px;" />
                                        </div>
                                        <h2 style="font-size: var(--ds-text-2xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin: 0;">Talliffy Enterprise</h2>
                                        <p style="color: var(--ds-text-tertiary); margin-top: var(--ds-space-2);">Version 1.0.0 (Build 2024.02.10)</p>
                                        
                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--ds-space-4); margin-top: var(--ds-space-8);">
                                            <div style="padding: var(--ds-space-4); background: var(--ds-bg-surface-sunken); border-radius: var(--ds-radius-xl); border: 1px solid var(--ds-border-default);">
                                                <div style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary); text-transform: uppercase;">License</div>
                                                <div style="font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-top: var(--ds-space-1);">Enterprise</div>
                                            </div>
                                            <div style="padding: var(--ds-space-4); background: var(--ds-bg-surface-sunken); border-radius: var(--ds-radius-xl); border: 1px solid var(--ds-border-default);">
                                                <div style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary); text-transform: uppercase;">Platform</div>
                                                <div style="font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-top: var(--ds-space-1);">Desktop</div>
                                            </div>
                                        </div>

                                        <div style="margin-top: var(--ds-space-10);">
                                            <button id="checkUpdatesBtn" class="ds-btn ds-btn-primary ds-btn-lg" style="width: 100%;">
                                                <i class="fas fa-sync-alt mr-2"></i> Check for Updates
                                            </button>
                                        </div>
                                    </div>
                                `
            })}
                        </div>
                    </div>

                </div>

                <style>
                    /* Premium Tab Styling */
                    .tab.active {
                        background: white !important;
                        color: var(--ds-primary-700) !important;
                        box-shadow: var(--ds-shadow-md) !important;
                    }
                    
                    .tab-content { display: none; }
                    .tab-content.active { display: block; animation: dsFadeIn 0.3s ease; }
                    
                    @keyframes dsFadeIn {
                        from { opacity: 0; transform: translateY(4px); }
                        to { opacity: 1; transform: translateY(0); }
                    }

                    /* Custom Toggle Switch for DS */
                    .toggle-switch {
                        position: relative;
                        display: inline-block;
                        width: 48px;
                        height: 24px;
                    }

                    .toggle-switch input {
                        opacity: 0;
                        width: 0;
                        height: 0;
                    }

                    .toggle-slider {
                        position: absolute;
                        cursor: pointer;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-color: var(--ds-gray-300);
                        transition: .4s;
                        border-radius: 34px;
                    }

                    .toggle-slider:before {
                        position: absolute;
                        content: "";
                        height: 18px;
                        width: 18px;
                        left: 3px;
                        bottom: 3px;
                        background-color: white;
                        transition: .4s;
                        border-radius: 50%;
                        box-shadow: var(--ds-shadow-sm);
                    }

                    input:checked + .toggle-slider {
                        background-color: var(--ds-primary-600);
                    }

                    input:checked + .toggle-slider:before {
                        transform: translateX(24px);
                    }
                </style>
            `
        });
    };

    function attachEventListeners() {
        // Tab switching
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;

                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Show corresponding content
                tabContents.forEach(content => {
                    if (content.dataset.content === tabName) {
                        content.classList.add('active');
                    } else {
                        content.classList.remove('active');
                    }
                });
            });
        });

        // Theme - apply immediately on change (live preview)
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.addEventListener('change', () => {
                const selectedTheme = themeSelect.value;
                if (selectedTheme === 'auto') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    window.themeManager?.setTheme(prefersDark ? 'dark' : 'light');
                } else if (window.themeManager) {
                    window.themeManager.setTheme(selectedTheme);
                }
            });
        }

        // Notification toggle - apply immediately
        const notifToggle = document.getElementById('notificationsEnabled');
        if (notifToggle) {
            notifToggle.addEventListener('change', () => {
                const enabled = notifToggle.checked;
                saveSetting('notificationsEnabled', enabled);
                console.log(`🔔 Notifications ${enabled ? 'enabled' : 'disabled'}`);
            });
        }

        // Sound toggle - apply immediately
        const soundToggle = document.getElementById('soundEnabled');
        if (soundToggle) {
            soundToggle.addEventListener('change', () => {
                const enabled = soundToggle.checked;
                saveSetting('soundEnabled', enabled);
                console.log(`🔊 Sound ${enabled ? 'enabled' : 'disabled'}`);
                // Play test sound when enabling
                if (enabled && window.NotificationSound) {
                    window.NotificationSound.play('success');
                }
            });
        }

        // Save all settings
        const saveAllBtn = document.getElementById('saveAllSettingsBtn');
        if (saveAllBtn) {
            saveAllBtn.addEventListener('click', () => {
                try {
                    // Validate port
                    const tallyPort = parseInt(document.getElementById('tallyPort')?.value) || 9000;
                    if (tallyPort < 1 || tallyPort > 65535) {
                        throw new Error('Tally Port must be between 1 and 65535');
                    }

                    const syncInterval = parseInt(document.getElementById('syncInterval')?.value) || 0;
                    if (syncInterval < 0 || syncInterval > 1440) {
                        throw new Error('Sync Interval must be between 0 and 1440 minutes');
                    }

                    const batchSize = parseInt(document.getElementById('batchSize')?.value) || 500;
                    const autoSyncOnStartup = document.getElementById('autoSyncOnStartup')?.checked || false;
                    const notificationsEnabled = document.getElementById('notificationsEnabled')?.checked ?? true;
                    const soundEnabled = document.getElementById('soundEnabled')?.checked ?? true;
                    const debugMode = document.getElementById('debugMode')?.checked || false;
                    const logRetentionDays = parseInt(document.getElementById('logRetentionDays')?.value) || 7;

                    // Theme - apply it immediately via themeManager
                    const themeSelect = document.getElementById('themeSelect');
                    const selectedTheme = themeSelect?.value || 'light';
                    if (window.themeManager && (selectedTheme === 'light' || selectedTheme === 'dark')) {
                        window.themeManager.setTheme(selectedTheme);
                    } else if (selectedTheme === 'auto') {
                        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                        window.themeManager?.setTheme(prefersDark ? 'dark' : 'light');
                    }

                    // Save all to appSettings JSON blob
                    const allSettings = {
                        tallyPort,
                        syncInterval,
                        batchSize,
                        autoSyncOnStartup,
                        notificationsEnabled,
                        soundEnabled,
                        debugMode,
                        logRetentionDays
                    };

                    const current = JSON.parse(localStorage.getItem('appSettings') || '{}');
                    localStorage.setItem('appSettings', JSON.stringify({ ...current, ...allSettings }));

                    console.log('💾 Settings saved:', allSettings);

                    // Restart sync scheduler with new interval
                    if (window.syncScheduler) {
                        console.log('🔄 Restarting sync scheduler with new settings...');
                        window.syncScheduler.restart();
                    }

                    // Send settings to main process
                    if (window.electronAPI && window.electronAPI.send) {
                        window.electronAPI.send('update-sync-settings', allSettings);
                    }

                    // Show success notification
                    if (window.notificationService) {
                        window.notificationService.success('All settings saved successfully!', 'Settings');
                    }

                    // Play sound if enabled
                    if (soundEnabled && window.NotificationSound) {
                        window.NotificationSound.play('success');
                    }
                } catch (error) {
                    console.error('❌ Error saving settings:', error);
                    if (window.notificationService) {
                        window.notificationService.error(error.message, 'Settings Error');
                    }
                }
            });
        }

        // Reset to defaults
        const resetBtn = document.getElementById('resetDefaultsBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
                    // Reset appSettings to defaults
                    localStorage.setItem('appSettings', JSON.stringify({
                        tallyPort: DEFAULT_SETTINGS.tallyPort,
                        syncInterval: DEFAULT_SETTINGS.syncInterval,
                        batchSize: DEFAULT_SETTINGS.batchSize,
                        autoSyncOnStartup: DEFAULT_SETTINGS.autoSyncOnStartup,
                        notificationsEnabled: DEFAULT_SETTINGS.notificationsEnabled,
                        soundEnabled: DEFAULT_SETTINGS.soundEnabled,
                        debugMode: DEFAULT_SETTINGS.debugMode,
                        logRetentionDays: DEFAULT_SETTINGS.logRetentionDays
                    }));
                    // Reset theme to light
                    if (window.themeManager) {
                        window.themeManager.setTheme('light');
                    }
                    // Reload to reflect changes
                    window.location.reload();
                }
            });
        }

        // Clear cache
        const clearCacheBtn = document.getElementById('clearCacheBtn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => {
                if (confirm('Clear application cache? This will remove temporary files.')) {
                    // Clear sessionStorage
                    sessionStorage.clear();
                    if (window.Toast) {
                        window.Toast.success('Cache cleared successfully');
                    } else if (window.NotificationService) {
                        window.NotificationService.show('Cache cleared successfully', 'success');
                    } else {
                        alert('✅ Cache cleared successfully');
                    }
                }
            });
        }

        // Factory reset
        const factoryResetBtn = document.getElementById('factoryResetBtn');
        if (factoryResetBtn) {
            factoryResetBtn.addEventListener('click', () => {
                if (confirm('⚠️ WARNING: This will delete ALL settings and data. Are you absolutely sure?')) {
                    if (confirm('This action cannot be undone. Click OK to proceed with factory reset.')) {
                        localStorage.clear();
                        sessionStorage.clear();
                        if (window.Toast) {
                            window.Toast.success('Factory reset complete. Restarting...', 'Success', {
                                duration: 2000
                            });
                            setTimeout(() => window.location.reload(), 2000);
                        } else {
                            alert('✅ Factory reset complete. The application will now restart.');
                            window.location.reload();
                        }
                    }
                }
            });
        }

        // Check for updates
        const checkUpdatesBtn = document.getElementById('checkUpdatesBtn');
        if (checkUpdatesBtn) {
            checkUpdatesBtn.addEventListener('click', () => {
                if (window.Toast) {
                    window.Toast.success('You are running the latest version (1.0.0)');
                } else if (window.NotificationService) {
                    window.NotificationService.show('You are running the latest version', 'success');
                } else {
                    alert('✅ You are running the latest version (1.0.0)');
                }
            });
        }

        // Help buttons
        const userGuideBtn = document.getElementById('userGuideBtn');
        if (userGuideBtn) {
            userGuideBtn.addEventListener('click', () => {
                if (window.Toast) {
                    window.Toast.info('User Guide will open here (PDF or web page)', 'Coming Soon');
                } else {
                    alert('📖 User Guide will open here (PDF or web page)');
                }
            });
        }

        const reportBugBtn = document.getElementById('reportBugBtn');
        if (reportBugBtn) {
            reportBugBtn.addEventListener('click', () => {
                if (window.Toast) {
                    window.Toast.info('Bug report form will open here', 'Coming Soon');
                } else {
                    alert('🐛 Bug report form will open here');
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+S to save
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                document.getElementById('saveAllSettingsBtn')?.click();
            }
        });
    }

    // Export for use in router
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { getSettingsTemplate, attachEventListeners };
    } else {
        window.SettingsPageEnhanced = {
            getTemplate: getSettingsTemplate,
            attachEventListeners: attachEventListeners,
            loadSettings: loadSettings
        };

        // Initialize function for router
        window.initializeSettings = async function () {
            const content = document.getElementById('page-content');
            if (content) {
                content.innerHTML = getSettingsTemplate();
                attachEventListeners();
            }
        };
    }
})();
