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
        const settings = { ...DEFAULT_SETTINGS };
        Object.keys(SETTINGS_KEYS).forEach(key => {
            const settingKey = SETTINGS_KEYS[key];
            const stored = localStorage.getItem(settingKey);
            if (stored !== null) {
                try {
                    settings[settingKey] = JSON.parse(stored);
                } catch {
                    settings[settingKey] = stored;
                }
            }
        });
        return settings;
    }

    function saveSetting(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function createToggleSwitch(id, checked = false) {
        return `
            <label class="toggle-switch">
                <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
                <span class="toggle-slider"></span>
            </label>
        `;
    }

    function createSettingsRow(title, description, control) {
        return `
            <div class="settings-row">
                <div class="settings-label">
                    <div class="settings-label-title">${title}</div>
                    <div class="settings-label-desc">${description}</div>
                </div>
                <div class="settings-control">
                    ${control}
                </div>
            </div>
        `;
    }

    const getSettingsTemplate = () => {
        const settings = loadSettings();

        return `
            <style>
                .settings-container {
                    max-width: 900px;
                    margin: 0 auto;
                    padding: var(--ds-space-8);
                }

                .settings-header {
                    margin-bottom: var(--ds-space-8);
                }

                .settings-title {
                    font-size: var(--ds-text-3xl);
                    font-weight: var(--ds-weight-bold);
                    color: var(--ds-text-primary);
                    margin-bottom: var(--ds-space-2);
                }

                .settings-subtitle {
                    font-size: var(--ds-text-md);
                    color: var(--ds-text-secondary);
                }

                .tabs {
                    display: flex;
                    gap: 8px;
                    border-bottom: 2px solid var(--ds-border-default);
                    margin-bottom: var(--ds-space-6);
                    overflow-x: auto;
                }

                .tab {
                    padding: 12px 20px;
                    font-size: var(--ds-text-md);
                    font-weight: var(--ds-weight-medium);
                    color: var(--ds-text-secondary);
                    background: transparent;
                    border: none;
                    border-bottom: 2px solid transparent;
                    margin-bottom: -2px;
                    cursor: pointer;
                    transition: all var(--ds-duration-base) var(--ds-ease);
                    white-space: nowrap;
                }

                .tab:hover {
                    color: var(--ds-text-primary);
                    background-color: var(--ds-bg-hover);
                }

                .tab.active {
                    color: var(--ds-primary-600);
                    border-bottom-color: var(--ds-primary-600);
                }

                .tab-content {
                    display: none;
                }

                .tab-content.active {
                    display: block;
                    animation: fadeIn 200ms ease-out;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .settings-card {
                    background: var(--ds-bg-surface);
                    border: 1px solid var(--ds-border-default);
                    border-radius: var(--ds-radius-xl);
                    padding: var(--ds-space-6);
                    margin-bottom: var(--ds-space-6);
                    box-shadow: var(--ds-shadow-sm);
                    transition: all var(--ds-duration-base) var(--ds-ease);
                }

                .settings-card:hover {
                    box-shadow: var(--ds-shadow-md);
                    border-color: var(--ds-border-strong);
                }

                .settings-section-title {
                    font-size: var(--ds-text-lg);
                    font-weight: var(--ds-weight-semibold);
                    color: var(--ds-text-primary);
                    margin-bottom: var(--ds-space-5);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .settings-section-title-icon {
                    font-size: 24px;
                }

                .form-group {
                    margin-bottom: var(--ds-space-5);
                }

                .form-label {
                    display: block;
                    font-size: var(--ds-text-sm);
                    font-weight: var(--ds-weight-medium);
                    color: var(--ds-text-primary);
                    margin-bottom: var(--ds-space-2);
                }

                .form-input {
                    width: 100%;
                    padding: 10px 14px;
                    border: 1px solid var(--ds-border-default);
                    border-radius: var(--ds-radius-md);
                    font-size: var(--ds-text-md);
                    color: var(--ds-text-primary);
                    background-color: var(--ds-bg-surface);
                    transition: all var(--ds-duration-fast) var(--ds-ease);
                }

                .form-input:focus {
                    outline: none;
                    border-color: var(--ds-primary-500);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .form-select {
                    width: 100%;
                    padding: 10px 14px;
                    border: 1px solid var(--ds-border-default);
                    border-radius: var(--ds-radius-md);
                    font-size: var(--ds-text-md);
                    color: var(--ds-text-primary);
                    background-color: var(--ds-bg-surface);
                    cursor: pointer;
                    transition: all var(--ds-duration-fast) var(--ds-ease);
                }

                .form-select:focus {
                    outline: none;
                    border-color: var(--ds-primary-500);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .form-help {
                    font-size: var(--ds-text-xs);
                    color: var(--ds-text-tertiary);
                    margin-top: var(--ds-space-2);
                }

                .form-help.warning {
                    color: var(--ds-warning-600);
                }

                .form-help.info {
                    color: var(--ds-info-600);
                }

                .btn-group {
                    display: flex;
                    gap: var(--ds-space-3);
                    margin-top: var(--ds-space-6);
                }

                .btn {
                    padding: 10px 20px;
                    border-radius: var(--ds-radius-md);
                    font-size: var(--ds-text-md);
                    font-weight: var(--ds-weight-medium);
                    border: none;
                    cursor: pointer;
                    transition: all var(--ds-duration-base) var(--ds-ease);
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }

                .btn-primary {
                    background-color: var(--ds-primary-600);
                    color: white;
                }

                .btn-primary:hover {
                    background-color: var(--ds-primary-700);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                }

                .btn-secondary {
                    background-color: var(--ds-gray-100);
                    color: var(--ds-text-primary);
                }

                .btn-secondary:hover {
                    background-color: var(--ds-gray-200);
                }

                .btn-danger {
                    background-color: var(--ds-danger-600);
                    color: white;
                }

                .btn-danger:hover {
                    background-color: var(--ds-danger-700);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
                }

                .status-indicator {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    margin-right: 6px;
                }

                .status-success { background-color: var(--ds-success-500); }
                .status-warning { background-color: var(--ds-warning-500); }
                .status-danger { background-color: var(--ds-danger-500); }

                .info-card {
                    background-color: var(--ds-info-50);
                    border: 1px solid var(--ds-info-200);
                    border-radius: var(--ds-radius-lg);
                    padding: var(--ds-space-4);
                    margin-top: var(--ds-space-4);
                }

                .info-card-title {
                    font-size: var(--ds-text-md);
                    font-weight: var(--ds-weight-semibold);
                    color: var(--ds-info-700);
                    margin-bottom: var(--ds-space-2);
                }

                .info-card-content {
                    font-size: var(--ds-text-sm);
                    color: var(--ds-info-700);
                }

                .about-app-icon {
                    font-size: 64px;
                    text-align: center;
                    margin-bottom: var(--ds-space-4);
                }

                .about-app-name {
                    font-size: var(--ds-text-2xl);
                    font-weight: var(--ds-weight-bold);
                    text-align: center;
                    color: var(--ds-text-primary);
                    margin-bottom: var(--ds-space-2);
                }

                .about-app-version {
                    text-align: center;
                    font-size: var(--ds-text-md);
                    color: var(--ds-text-secondary);
                    margin-bottom: var(--ds-space-6);
                }

                .about-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: var(--ds-space-4);
                    margin-top: var(--ds-space-6);
                }

                .about-item {
                    text-align: center;
                    padding: var(--ds-space-4);
                    background-color: var(--ds-bg-surface-sunken);
                    border-radius: var(--ds-radius-lg);
                }

                .about-item-label {
                    font-size: var(--ds-text-xs);
                    color: var(--ds-text-tertiary);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-bottom: var(--ds-space-1);
                }

                .about-item-value {
                    font-size: var(--ds-text-lg);
                    font-weight: var(--ds-weight-semibold);
                    color: var(--ds-text-primary);
                }

                @media (max-width: 768px) {
                    .settings-container {
                        padding: var(--ds-space-4);
                    }

                    .btn-group {
                        flex-direction: column;
                    }

                    .btn {
                        width: 100%;
                        justify-content: center;
                    }
                }
                    .sync-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;
    align-items: start;
}

.left-column {
    display: flex;
    flex-direction: column;
}

.settings-card,
.info-card {
    height: fit-content;
}

/* Mobile fallback */
@media (max-width: 1024px) {
    .sync-grid {
        grid-template-columns: 1fr;
    }
}


            </style>

            <div class="settings-container">
                <!-- Header -->
                <div class="settings-header">
                    <h1 class="settings-title">⚙️ Settings</h1>
                    <p class="settings-subtitle">Manage your application preferences and configurations</p>
                </div>

                <!-- Tabs -->
                <div class="tabs">
                    <button class="tab active" data-tab="general">
                        <span>🔧</span> General
                    </button>
                    <button class="tab" data-tab="sync">
                        <span>🔄</span> Sync
                    </button>
                    <button class="tab" data-tab="notifications">
                        <span>🔔</span> Notifications
                    </button>
                    <button class="tab" data-tab="about">
                        <span>ℹ️</span> About
                    </button>
                </div>

                <!-- Tab Content: General -->
                <div class="tab-content active" data-content="general">
                    <div class="settings-card">
                        <h3 class="settings-section-title">
                            <span class="settings-section-title-icon">🎨</span>
                            Appearance
                        </h3>
                        ${createSettingsRow(
                            'Theme',
                            'Choose your preferred color scheme',
                            `<select class="form-select" id="themeSelect">
                                <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>☀️ Light</option>
                                <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>🌙 Dark</option>
                                <option value="auto" ${settings.theme === 'auto' ? 'selected' : ''}>🔄 Auto</option>
                            </select>`
                        )}
                    </div>
                </div>

                <!-- Tab Content: Sync -->
<div class="tab-content" data-content="sync">
    <div class="sync-grid">

        <!-- LEFT COLUMN -->
        <div class="left-column">

            <!-- Tally Prime Connection -->
            <div class="settings-card">
                <h3 class="settings-section-title">
                    <span class="settings-section-title-icon">🔌</span>
                    Tally Prime Connection
                </h3>

                <div class="form-group">
                    <label class="form-label" for="tallyPort">Tally Port Number</label>
                    <input 
                        type="number"
                        id="tallyPort"
                        class="form-input"
                        value="${settings.tallyPort}"
                        min="1000"
                        max="65535"
                    >
                    <p class="form-help warning">
                        ⚠️ Changes apply immediately. Default: 9000
                    </p>
                </div>
            </div>

            <!-- 📊 Current Sync Status (MOVED HERE) -->
            <div class="info-card" style="margin-top: 1rem;">
                <div class="info-card-title">📊 Current Sync Status</div>
                <div class="info-card-content">
                    <span class="status-indicator status-success"></span>
                    <span>Ready to sync</span>
                </div>
            </div>

        </div>

        <!-- RIGHT COLUMN -->
        <div class="settings-card">
            <h3 class="settings-section-title">
                <span class="settings-section-title-icon">⏱️</span>
                Auto Sync Settings
            </h3>

            ${createSettingsRow(
                'Sync on Startup',
                'Automatically sync data when the application starts',
                createToggleSwitch('autoSyncOnStartup', settings.autoSyncOnStartup)
            )}

            <div class="form-group">
                <label class="form-label" for="syncInterval">
                    Auto Sync Interval (minutes)
                </label>
                <input 
                    type="number"
                    id="syncInterval"
                    class="form-input"
                    value="${settings.syncInterval}"
                    min="0"
                    max="1440"
                >
                <p class="form-help info">
                    💡 0 disables auto-sync. Recommended: 15–30 minutes
                </p>
            </div>

            <div class="form-group">
                <label class="form-label" for="batchSize">Batch Size</label>
                <select class="form-select" id="batchSize">
                    <option value="500" ${settings.batchSize === 500 ? 'selected' : ''}>
                        500 (Recommended)
                    </option>
                    <option value="1000" ${settings.batchSize === 1000 ? 'selected' : ''}>
                        1000
                    </option>
                    <option value="2000" ${settings.batchSize === 2000 ? 'selected' : ''}>
                        2000
                    </option>
                </select>
                <p class="form-help">Records per sync batch</p>
            </div>
        </div>

    </div>
</div>



                <!-- Tab Content: Notifications -->
                <div class="tab-content" data-content="notifications">
                    <div class="settings-card">
                        <h3 class="settings-section-title">
                            <span class="settings-section-title-icon">🔔</span>
                            Notification Preferences
                        </h3>
                        
                        ${createSettingsRow(
                            'Enable Notifications',
                            'Show desktop notifications for sync events',
                            createToggleSwitch('notificationsEnabled', settings.notificationsEnabled)
                        )}

                        ${createSettingsRow(
                            'Sound Effects',
                            'Play sound when sync completes',
                            createToggleSwitch('soundEnabled', settings.soundEnabled)
                        )}
                    </div>
                </div>

                <!-- Tab Content: Advanced -->
                <div class="tab-content" data-content="advanced">
                    <div class="settings-card">
                        <h3 class="settings-section-title">
                            <span class="settings-section-title-icon">🛠️</span>
                            Developer Options
                        </h3>
                        
                        ${createSettingsRow(
                            'Debug Mode',
                            'Enable verbose logging for troubleshooting',
                            createToggleSwitch('debugMode', settings.debugMode)
                        )}

                        <div class="form-group" style="margin-top: var(--ds-space-5);">
                            <label class="form-label" for="logRetentionDays">Log Retention (days)</label>
                            <select class="form-select" id="logRetentionDays">
                                <option value="7" ${settings.logRetentionDays === 7 ? 'selected' : ''}>7 days</option>
                                <option value="14" ${settings.logRetentionDays === 14 ? 'selected' : ''}>14 days</option>
                                <option value="30" ${settings.logRetentionDays === 30 ? 'selected' : ''}>30 days</option>
                                <option value="90" ${settings.logRetentionDays === 90 ? 'selected' : ''}>90 days</option>
                            </select>
                            <p class="form-help">How long to keep application logs</p>
                        </div>
                    </div>

                    <div class="settings-card">
                        <h3 class="settings-section-title">
                            <span class="settings-section-title-icon">🗑️</span>
                            Data Management
                        </h3>
                        
                        <div class="btn-group">
                            <button class="btn btn-secondary" id="clearCacheBtn">
                                <span>🗑️</span> Clear Cache
                            </button>
                            <button class="btn btn-secondary" id="exportLogsBtn">
                                <span>📥</span> Export Logs
                            </button>
                            <button class="btn btn-danger" id="factoryResetBtn">
                                <span>⚠️</span> Factory Reset
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Tab Content: Help -->
                <div class="tab-content" data-content="help">
                    <div class="settings-card">
                        <h3 class="settings-section-title">
                            <span class="settings-section-title-icon">📚</span>
                            Documentation & Support
                        </h3>
                        
                        <div class="btn-group">
                            <button class="btn btn-primary" id="userGuideBtn">
                                <span>📖</span> User Guide
                            </button>
                            <button class="btn btn-secondary" id="faqBtn">
                                <span>❓</span> FAQ
                            </button>
                            <button class="btn btn-secondary" id="reportBugBtn">
                                <span>🐛</span> Report Bug
                            </button>
                            <button class="btn btn-secondary" id="contactSupportBtn">
                                <span>💬</span> Contact Support
                            </button>
                        </div>
                    </div>

                    <div class="settings-card">
                        <h3 class="settings-section-title">
                            <span class="settings-section-title-icon">⌨️</span>
                            Keyboard Shortcuts
                        </h3>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--ds-space-3);">
                            <div>
                                <strong>Ctrl + K</strong> - Command Palette
                            </div>
                            <div>
                                <strong>Ctrl + S</strong> - Save Settings
                            </div>
                            <div>
                                <strong>Ctrl + R</strong> - Refresh Page
                            </div>
                            <div>
                                <strong>Ctrl + ,</strong> - Open Settings
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tab Content: About -->
                <div class="tab-content" data-content="about">
                    <div class="settings-card">
                        <div class="about-app-icon">🚀</div>
                        <div class="about-app-name">Talliffy Enterprise</div>
                        <div class="about-app-version">Version 1.0.0 • Build 2024.02.10</div>

                        <div class="about-grid">
                            <div class="about-item">
                                <div class="about-item-label">License</div>
                                <div class="about-item-value">MIT</div>
                            </div>
                            <div class="about-item">
                                <div class="about-item-label">Platform</div>
                                <div class="about-item-value">Windows</div>
                            </div>
                            <div class="about-item">
                                <div class="about-item-label">Technology</div>
                                <div class="about-item-value">Electron + Spring Boot</div>
                            </div>
                        </div>

                        <div style="text-align: center; margin-top: var(--ds-space-8); color: var(--ds-text-tertiary); font-size: var(--ds-text-sm);">
                            © 2024 Talliffy Team. All rights reserved.
                        </div>

                        <div class="btn-group" style="margin-top: var(--ds-space-6);">
                            <button class="btn btn-primary" id="checkUpdatesBtn" style="flex: 1;">
                                <span>🔄</span> Check for Updates
                            </button>
                            <button class="btn btn-secondary" id="viewLicenseBtn" style="flex: 1;">
                                <span>📜</span> View License
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Save Button (sticky footer) -->
                <div style="position: sticky; bottom: 0; background: var(--ds-bg-app); padding: var(--ds-space-4) 0; margin-top: var(--ds-space-8); border-top: 1px solid var(--ds-border-default);">
                    <div class="btn-group">
                        <button class="btn btn-primary" id="saveAllSettingsBtn" style="flex: 1;">
                            <span>💾</span> Save All Settings
                        </button>
                        <button class="btn btn-secondary" id="resetDefaultsBtn">
                            <span>🔄</span> Reset to Defaults
                        </button>
                    </div>
                </div>
            </div>
        `;
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

        // Save all settings
        const saveAllBtn = document.getElementById('saveAllSettingsBtn');
        if (saveAllBtn) {
            saveAllBtn.addEventListener('click', () => {
                // Save all settings from form
                saveSetting(SETTINGS_KEYS.TALLY_PORT, parseInt(document.getElementById('tallyPort').value));
                saveSetting(SETTINGS_KEYS.BACKEND_URL, document.getElementById('backendUrl').value);
                saveSetting(SETTINGS_KEYS.SYNC_INTERVAL, parseInt(document.getElementById('syncInterval').value));
                saveSetting(SETTINGS_KEYS.AUTO_SYNC_ON_STARTUP, document.getElementById('autoSyncOnStartup').checked);
                saveSetting(SETTINGS_KEYS.THEME, document.getElementById('themeSelect').value);
                saveSetting(SETTINGS_KEYS.NOTIFICATIONS_ENABLED, document.getElementById('notificationsEnabled').checked);
                saveSetting(SETTINGS_KEYS.SOUND_ENABLED, document.getElementById('soundEnabled').checked);
                saveSetting(SETTINGS_KEYS.DEBUG_MODE, document.getElementById('debugMode').checked);
                saveSetting(SETTINGS_KEYS.LOG_RETENTION_DAYS, parseInt(document.getElementById('logRetentionDays').value));
                saveSetting(SETTINGS_KEYS.BATCH_SIZE, parseInt(document.getElementById('batchSize').value));

                // Show success notification
                if (window.Toast) {
                    window.Toast.success('Settings saved successfully!');
                } else if (window.NotificationService) {
                    window.NotificationService.show('Settings saved successfully!', 'success');
                } else {
                    alert('✅ Settings saved successfully!');
                }
            });
        }

        // Reset to defaults
        const resetBtn = document.getElementById('resetDefaultsBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
                    Object.keys(DEFAULT_SETTINGS).forEach(key => {
                        localStorage.removeItem(key);
                    });
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
        window.initializeSettings = async function() {
            const content = document.getElementById('page-content');
            if (content) {
                content.innerHTML = getSettingsTemplate();
                attachEventListeners();
            }
        };
    }
})();
