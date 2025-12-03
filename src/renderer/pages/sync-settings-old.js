/**
 * Sync Settings Page
 * Configure Tally server connection and sync behavior
 */

class SyncSettingsPage {
    constructor() {
        this.config = syncController?.getStatus().config || {
            host: 'localhost',
            port: 9000,
            interval: 30,
            autosync: false,
            debug: false
        };
    }

    /**
     * Render settings UI
     */
    render() {
        return `
            <div class="sync-settings-container">
                <div class="settings-header">
                    <h1>📡 Tally Sync Settings</h1>
                    <p class="subtitle">Configure your Tally server connection</p>
                </div>

                <div class="settings-content">
                    <!-- Connection Settings -->
                    <div class="settings-section">
                        <h2>Connection Settings</h2>
                        
                        <div class="form-group">
                            <label for="tallyHost">Tally Server Host</label>
                            <div class="input-group">
                                <input 
                                    id="tallyHost" 
                                    type="text" 
                                    class="form-input" 
                                    placeholder="localhost"
                                    value="${this.config.host}"
                                >
                                <span class="input-hint">IP address or hostname of Tally server</span>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="tallyPort">Tally Server Port</label>
                            <div class="input-group">
                                <input 
                                    id="tallyPort" 
                                    type="number" 
                                    class="form-input" 
                                    placeholder="9000"
                                    value="${this.config.port}"
                                    min="1"
                                    max="65535"
                                >
                                <span class="input-hint">Port number for Tally server (1-65535)</span>
                            </div>
                        </div>
                    </div>

                    <!-- Sync Behavior -->
                    <div class="settings-section">
                        <h2>Sync Behavior</h2>

                        <div class="form-group">
                            <label for="syncInterval">Sync Interval (seconds)</label>
                            <div class="input-group">
                                <input 
                                    id="syncInterval" 
                                    type="number" 
                                    class="form-input" 
                                    placeholder="30"
                                    value="${this.config.interval}"
                                    min="5"
                                    max="300"
                                >
                                <span class="input-hint">Check Tally connection every N seconds</span>
                            </div>
                        </div>

                        <div class="form-group checkbox-group">
                            <label for="autosyncEnabled">
                                <input 
                                    id="autosyncEnabled" 
                                    type="checkbox" 
                                    ${this.config.autosync ? 'checked' : ''}
                                >
                                <span>Enable Auto-Sync on Startup</span>
                            </label>
                            <span class="input-hint">Automatically start syncing when app launches</span>
                        </div>

                        <div class="form-group checkbox-group">
                            <label for="debugMode">
                                <input 
                                    id="debugMode" 
                                    type="checkbox" 
                                    ${this.config.debug ? 'checked' : ''}
                                >
                                <span>Enable Debug Mode</span>
                            </label>
                            <span class="input-hint">Log detailed sync information to console</span>
                        </div>
                    </div>

                    <!-- Connection Test -->
                    <div class="settings-section">
                        <h2>Connection Test</h2>
                        <button id="testConnectionBtn" class="btn btn-primary">
                            🧪 Test Connection
                        </button>
                        <div id="testResult" class="test-result" style="display:none;"></div>
                    </div>

                    <!-- Actions -->
                    <div class="settings-section">
                        <h2>Actions</h2>
                        <div class="button-group">
                            <button id="saveSettingsBtn" class="btn btn-success">
                                💾 Save Settings
                            </button>
                            <button id="resetSettingsBtn" class="btn btn-secondary">
                                🔄 Reset to Defaults
                            </button>
                        </div>
                    </div>

                    <!-- Current Status - LIVE DISPLAY -->
                    <div class="settings-section status-display-section">
                        <h2>📊 Connection Status</h2>
                        <div class="status-display">
                            <div class="status-card">
                                <div class="status-icon">🌐</div>
                                <div id="internetStatus" class="status-content">
                                    <span class="status-label">Internet</span>
                                    <span class="status-badge offline">❌ DISCONNECTED</span>
                                </div>
                            </div>
                            <div class="status-card">
                                <div class="status-icon">🗄️</div>
                                <div id="tallyStatus" class="status-content">
                                    <span class="status-label">Tally Server</span>
                                    <span class="status-badge offline">❌ DISCONNECTED</span>
                                </div>
                            </div>
                        </div>
                        <div class="last-update">
                            <span class="label">Last Update:</span>
                            <span id="lastUpdateTime" class="value">Never</span>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .sync-settings-container {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
                    color: #e0e0e0;
                    border-radius: 12px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                }

                .settings-header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #444;
                }

                .settings-header h1 {
                    margin: 0 0 10px 0;
                    font-size: 28px;
                    color: #61dafb;
                }

                .subtitle {
                    margin: 0;
                    color: #999;
                    font-size: 14px;
                }

                .settings-section {
                    margin-bottom: 30px;
                    padding: 20px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid #444;
                    border-radius: 8px;
                }

                .settings-section h2 {
                    margin-top: 0;
                    margin-bottom: 20px;
                    color: #61dafb;
                    font-size: 18px;
                }

                .form-group {
                    margin-bottom: 15px;
                }

                .form-group label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 500;
                    color: #e0e0e0;
                }

                .input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }

                .form-input {
                    padding: 10px 12px;
                    background: #2d2d44;
                    border: 1px solid #444;
                    border-radius: 6px;
                    color: #e0e0e0;
                    font-size: 14px;
                    transition: all 0.3s ease;
                }

                .form-input:focus {
                    outline: none;
                    border-color: #61dafb;
                    box-shadow: 0 0 8px rgba(97, 218, 251, 0.3);
                }

                .input-hint {
                    font-size: 12px;
                    color: #888;
                }

                .checkbox-group label {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    cursor: pointer;
                    margin-bottom: 8px;
                }

                .checkbox-group input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                    accent-color: #61dafb;
                }

                .button-group {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                }

                .btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .btn-primary {
                    background: #61dafb;
                    color: #000;
                }

                .btn-primary:hover {
                    background: #4db8d8;
                    transform: translateY(-2px);
                }

                .btn-success {
                    background: #51cf66;
                    color: #000;
                }

                .btn-success:hover {
                    background: #40c057;
                    transform: translateY(-2px);
                }

                .btn-secondary {
                    background: #555;
                    color: #e0e0e0;
                }

                .btn-secondary:hover {
                    background: #666;
                    transform: translateY(-2px);
                }

                .test-result {
                    margin-top: 15px;
                    padding: 15px;
                    border-radius: 6px;
                    font-size: 14px;
                    background: rgba(255, 255, 255, 0.05);
                }

                .test-result.success {
                    border-left: 4px solid #51cf66;
                    color: #51cf66;
                }

                .test-result.error {
                    border-left: 4px solid #ff6b6b;
                    color: #ff6b6b;
                }

                .status-display-section {
                    background: linear-gradient(135deg, rgba(97, 218, 251, 0.05) 0%, rgba(51, 204, 102, 0.05) 100%) !important;
                    border: 2px solid rgba(97, 218, 251, 0.2) !important;
                }

                .status-display {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin-bottom: 20px;
                }

                .status-card {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 20px;
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid rgba(97, 218, 251, 0.3);
                    border-radius: 8px;
                    transition: all 0.3s ease;
                }

                .status-card:hover {
                    background: rgba(97, 218, 251, 0.1);
                    border-color: rgba(97, 218, 251, 0.5);
                    transform: translateY(-2px);
                }

                .status-card .status-icon {
                    font-size: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 60px;
                    height: 60px;
                    background: rgba(97, 218, 251, 0.1);
                    border-radius: 8px;
                }

                .status-content {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .status-label {
                    font-size: 14px;
                    font-weight: 600;
                    color: #e0e0e0;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    width: fit-content;
                }

                .status-badge.online {
                    background: rgba(81, 207, 102, 0.2);
                    color: #51cf66;
                    border: 1px solid rgba(81, 207, 102, 0.5);
                    box-shadow: 0 0 10px rgba(81, 207, 102, 0.2);
                }

                .status-badge.offline {
                    background: rgba(255, 107, 107, 0.2);
                    color: #ff6b6b;
                    border: 1px solid rgba(255, 107, 107, 0.5);
                    box-shadow: 0 0 10px rgba(255, 107, 107, 0.2);
                }

                .last-update {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px;
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 6px;
                    border-left: 4px solid #61dafb;
                }

                .last-update .label {
                    font-weight: 500;
                    color: #999;
                }

                .last-update .value {
                    font-weight: 600;
                    color: #61dafb;
                    font-size: 16px;
                }

                .status-info {
                    display: grid;
                    gap: 10px;
                }

                .status-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px;
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 4px;
                }

                .status-item .label {
                    font-weight: 500;
                    color: #999;
                }

                .status-item .value {
                    color: #61dafb;
                }
            </style>
        `;
    }

    /**
     * Attach event listeners
     */
    attachListeners() {
        // Save settings
        const saveBtn = document.getElementById('saveSettingsBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings());
        }

        // Reset settings
        const resetBtn = document.getElementById('resetSettingsBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSettings());
        }

        // Test connection
        const testBtn = document.getElementById('testConnectionBtn');
        if (testBtn) {
            testBtn.addEventListener('click', () => this.testConnection());
        }

        // Listen for sync status updates
        window.addEventListener('sync-status-updated', (e) => {
            this.updateStatusDisplay(e.detail);
        });

        // Initial status display
        if (window.syncController) {
            const lastStatus = window.syncController.getLastStatus();
            window.syncController.updateStatusDisplay();
        }
    }

    /**
     * Save current settings
     */
    saveSettings() {
        const config = {
            host: document.getElementById('tallyHost')?.value || 'localhost',
            port: parseInt(document.getElementById('tallyPort')?.value || 9000),
            interval: parseInt(document.getElementById('syncInterval')?.value || 30),
            autosync: document.getElementById('autosyncEnabled')?.checked || false,
            debug: document.getElementById('debugMode')?.checked || false
        };

        // Validate
        if (config.port < 1 || config.port > 65535) {
            alert('❌ Invalid port number. Use 1-65535.');
            return;
        }

        if (config.interval < 5 || config.interval > 300) {
            alert('❌ Invalid interval. Use 5-300 seconds.');
            return;
        }

        // Update controller
        if (syncController) {
            syncController.updateConfig(config);
            alert('✅ Settings saved successfully!');
        }
    }

    /**
     * Reset to default settings
     */
    resetSettings() {
        if (!confirm('Are you sure? This will reset all settings to defaults.')) {
            return;
        }

        const defaults = {
            host: 'localhost',
            port: 9000,
            interval: 30,
            autosync: false,
            debug: false
        };

        document.getElementById('tallyHost').value = defaults.host;
        document.getElementById('tallyPort').value = defaults.port;
        document.getElementById('syncInterval').value = defaults.interval;
        document.getElementById('autosyncEnabled').checked = defaults.autosync;
        document.getElementById('debugMode').checked = defaults.debug;

        if (syncController) {
            syncController.updateConfig(defaults);
        }

        alert('✅ Settings reset to defaults');
    }

    /**
     * Test connection to Tally server
     */
    async testConnection() {
        const testBtn = document.getElementById('testConnectionBtn');
        const testResult = document.getElementById('testResult');
        const host = document.getElementById('tallyHost')?.value || 'localhost';
        const port = document.getElementById('tallyPort')?.value || 9000;

        if (testBtn) testBtn.disabled = true;
        testBtn.textContent = '⏳ Testing...';

        try {
            // Trigger manual sync to test connection
            if (syncController) {
                syncController.triggerSync();
                
                // Wait a bit for response
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                testResult.style.display = 'block';
                testResult.className = 'test-result success';
                testResult.innerHTML = `
                    ✅ Connection successful!<br>
                    Server: ${host}:${port}
                `;
            }
        } catch (error) {
            testResult.style.display = 'block';
            testResult.className = 'test-result error';
            testResult.innerHTML = `
                ❌ Connection failed:<br>
                ${error.message}
            `;
        } finally {
            if (testBtn) {
                testBtn.disabled = false;
                testBtn.textContent = '🧪 Test Connection';
            }
        }
    }

    /**
     * Update status display with latest sync info
     */
    updateStatusDisplay(status) {
        const statusEl = document.getElementById('currentSyncStatus');
        const timeEl = document.getElementById('lastUpdateTime');

        if (statusEl) {
            const internet = status.internet.includes('✅') ? '✅' : '❌';
            const tally = status.tally.includes('✅') ? '✅' : '❌';
            statusEl.textContent = `${internet} Internet | ${tally} Tally`;
        }

        if (timeEl) {
            timeEl.textContent = status.timestamp;
        }
    }

    /**
     * Mount component to DOM
     */
    mount(selector) {
        const container = document.querySelector(selector);
        if (container) {
            container.innerHTML = this.render();
            this.attachListeners();
        }
    }
}

// Export for use
window.SyncSettingsPage = SyncSettingsPage;
