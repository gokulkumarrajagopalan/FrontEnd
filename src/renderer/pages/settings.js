(function () {
    const getSettingsTemplate = () => `
    <div id="settingsPageContainer" class="space-y-6">
        <div class="page-header">
            <h2>Settings</h2>
            <p>Configure Tally connection and application preferences</p>
        </div>

        <style>
            /* Remove spinner arrows from number inputs */
            input[type=number]::-webkit-inner-spin-button,
            input[type=number]::-webkit-outer-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }
            input[type=number] {
                -moz-appearance: textfield;
            }
        </style>

        <div class="grid grid-cols-1 gap-6">
            <!-- Tally Connection -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 class="font-bold text-gray-800 mb-4">🔌 Tally Prime Connection</h3>
                <form class="settings-form space-y-4" id="connectionForm">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                            <span class="inline-flex items-center gap-1">
                                🔌 Tally Prime Port
                                <span class="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Dynamic</span>
                            </span>
                        </label>
                        <input type="number" id="tallyPort" class="w-full px-3 py-2 border border-gray-200 rounded-lg" value="9000" min="1" max="65535">
                        <small class="text-gray-500">
                            Port number for Tally Prime ODBC/HTTP Server (default: 9000)
                            <br>
                            <span class="text-amber-600">⚠️ Changes apply immediately to all sync operations</span>
                        </small>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                            <span class="inline-flex items-center gap-1">
                                🔄 Auto Sync Interval (minutes)
                                <span class="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">Optional</span>
                            </span>
                        </label>
                        <input type="number" id="syncInterval" class="w-full px-3 py-2 border border-gray-200 rounded-lg" value="30" min="0" max="1440" placeholder="30">
                        <small class="text-gray-500">
                            Automatically sync data from Tally at specified intervals (0 to disable)
                            <br>
                            <span class="text-blue-600">💡 Recommended: 15-30 minutes for active businesses</span>
                        </small>
                        
                        <!-- Auto-Sync Status Display -->
                        <div id="autoSyncStatus" class="mt-2 p-2 rounded-lg text-xs" style="display: none;">
                            <div class="flex items-center gap-2">
                                <span id="syncStatusIndicator">⏸️</span>
                                <span id="syncStatusText">Auto-sync disabled</span>
                            </div>
                            <div id="syncLastTime" class="text-gray-600 mt-1" style="display: none;"></div>
                            <div id="syncNextTime" class="text-gray-600" style="display: none;"></div>
                        </div>
                    </div>
                    
                    <button type="button" class="btn btn-primary w-full" id="saveConnectionBtn">💾 Save Settings</button>
                    <div id="connectionStatus" class="hidden p-3 rounded-lg text-sm"></div>
                </form>
            </div>

            <!-- About -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 class="font-bold text-gray-800 mb-4">About</h3>
                <div class="bg-gray-50 p-4 rounded-lg space-y-2 text-sm text-gray-700">
                    <p><strong>Talliffy</strong></p>
                    <p>Professional Tally Sync Application</p>
                    <p><strong>Version:</strong> 1.0.0</p>
                    <p><strong>Built with:</strong> Electron + Spring Boot</p>
                    <p><strong>License:</strong> MIT</p>
                </div>
            </div>
        </div>
    </div>
    `;

    if (!window.API_BASE_URL) {
        window.API_BASE_URL = window.AppConfig ? window.AppConfig.API_BASE_URL : 'http://localhost:8080';
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

    function setupEventListeners() {
        // Tally Connection
        const saveConnectionBtn = document.getElementById('saveConnectionBtn');
        if (saveConnectionBtn) {
            saveConnectionBtn.addEventListener('click', () => {
                const tallyPortInput = document.getElementById('tallyPort').value;
                const tallyPort = parseInt(tallyPortInput, 10);
                
                const syncIntervalInput = document.getElementById('syncInterval').value;
                const syncInterval = parseInt(syncIntervalInput, 10) || 30;
                
                console.log('💾 Saving Settings:');
                console.log('   Tally Port:', tallyPort);
                console.log('   Sync Interval:', syncInterval, 'minutes');
                
                const settings = {
                    tallyPort: tallyPort,
                    syncInterval: syncInterval
                };
                
                saveSettings(settings);
                
                console.log('✅ Settings saved to localStorage:', JSON.stringify(settings));
                console.log('📦 Full appSettings now:', localStorage.getItem('appSettings'));
                
                if (window.notificationService) {
                    let message = `✅ Settings saved: Port ${tallyPort}`;
                    if (syncInterval > 0) {
                        message += `, Auto-sync every ${syncInterval} minutes`;
                    } else {
                        message += `, Auto-sync disabled`;
                    }
                    window.notificationService.success(message);
                }
                
                // Restart sync scheduler with new interval
                if (window.syncScheduler) {
                    console.log('🔄 Restarting sync scheduler with new interval...');
                    window.syncScheduler.restart();
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
            
            // Update status every 5 seconds
            setInterval(updateSyncStatus, 5000);
            setupEventListeners();
        }
    };
})();
