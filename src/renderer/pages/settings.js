(function () {
    const getSettingsTemplate = () => `
    <div id="settingsPageContainer" class="space-y-6">
        <div class="page-header">
            <h2>Settings</h2>
            <p>Application settings and preferences</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Application Settings -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 class="font-bold text-gray-800 mb-4">Application Settings</h3>
                <form class="settings-form space-y-4" id="appSettingsForm">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Application Name</label>
                        <input type="text" id="appName" class="w-full px-3 py-2 border border-gray-200 rounded-lg" value="Tally Prime">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                        <input type="text" id="orgName" class="w-full px-3 py-2 border border-gray-200 rounded-lg" placeholder="Your organization name">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Financial Year Start</label>
                        <input type="date" id="fyStart" class="w-full px-3 py-2 border border-gray-200 rounded-lg">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Financial Year End</label>
                        <input type="date" id="fyEnd" class="w-full px-3 py-2 border border-gray-200 rounded-lg">
                    </div>
                    <button type="submit" class="btn btn-primary w-full">Save Settings</button>
                </form>
            </div>

            <!-- Backend Connection -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 class="font-bold text-gray-800 mb-4">Backend Connection</h3>
                <form class="settings-form space-y-4" id="connectionForm">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">API Base URL</label>
                        <input type="text" id="apiUrl" class="w-full px-3 py-2 border border-gray-200 rounded-lg" value="http://localhost:8080">
                        <small class="text-gray-500">API endpoint for backend services</small>
                    </div>
                    <button type="button" class="btn btn-secondary w-full" id="testConnectionBtn">Test Connection</button>
                    <div id="connectionStatus" class="hidden p-3 rounded-lg text-sm"></div>
                </form>
            </div>

            <!-- Display Settings -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 class="font-bold text-gray-800 mb-4">Display Settings</h3>
                <form class="settings-form space-y-4" id="displaySettingsForm">
                    <div class="flex items-center gap-2">
                        <input type="checkbox" id="darkMode" class="w-4 h-4">
                        <label for="darkMode" class="text-sm font-medium text-gray-700">Dark Mode</label>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Currency Symbol</label>
                        <select id="currency" class="w-full px-3 py-2 border border-gray-200 rounded-lg">
                            <option value="₹">Indian Rupee (₹)</option>
                            <option value="$">US Dollar ($)</option>
                            <option value="€">Euro (€)</option>
                            <option value="£">British Pound (£)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Decimal Places</label>
                        <select id="decimalPlaces" class="w-full px-3 py-2 border border-gray-200 rounded-lg">
                            <option value="2">2 Decimal Places</option>
                            <option value="3">3 Decimal Places</option>
                            <option value="4">4 Decimal Places</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary w-full">Save Display Settings</button>
                </form>
            </div>

            <!-- Data Management -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 border-l-4 border-l-red-500">
                <h3 class="font-bold text-gray-800 mb-4">Data Management</h3>
                <div class="space-y-4">
                    <div class="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-yellow-800 text-sm">
                        ⚠️ Be careful with these operations. They may result in data loss.
                    </div>
                    <button type="button" class="btn btn-danger w-full" id="exportBtn">Export Data</button>
                    <button type="button" class="btn btn-danger w-full" id="backupBtn">Create Backup</button>
                    <button type="button" class="btn btn-danger w-full" id="resetBtn">Reset Application</button>
                </div>
            </div>

            <!-- About -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
                <h3 class="font-bold text-gray-800 mb-4">About</h3>
                <div class="bg-gray-50 p-4 rounded-lg space-y-2 text-sm text-gray-700">
                    <p><strong>Tally Prime</strong></p>
                    <p>Professional Accounting & ERP System</p>
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

            setVal('appName', data.appName || 'Tally Prime');
            setVal('orgName', data.orgName || '');
            setVal('fyStart', data.fyStart || '');
            setVal('fyEnd', data.fyEnd || '');
            setVal('apiUrl', data.apiUrl || window.AppConfig.API_BASE_URL);
            setVal('currency', data.currency || '₹');
            setVal('decimalPlaces', data.decimalPlaces || '2');

            const dm = document.getElementById('darkMode');
            if (dm) dm.checked = data.darkMode || false;
        }
    }

    function setupEventListeners() {
        // Application Settings Form
        const appForm = document.getElementById('appSettingsForm');
        if (appForm) {
            appForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const settings = {
                    appName: document.getElementById('appName').value,
                    orgName: document.getElementById('orgName').value,
                    fyStart: document.getElementById('fyStart').value,
                    fyEnd: document.getElementById('fyEnd').value
                };
                saveSettings(settings);
                if (window.notificationService) window.notificationService.success('Settings saved successfully');
            });
        }

        // Backend Connection
        const testBtn = document.getElementById('testConnectionBtn');
        if (testBtn) {
            testBtn.addEventListener('click', async () => {
                const apiUrl = document.getElementById('apiUrl').value;
                const statusEl = document.getElementById('connectionStatus');

                statusEl.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800');
                statusEl.textContent = 'Testing connection...';
                statusEl.classList.remove('hidden');

                try {
                    const response = await fetch(`${apiUrl}/groups`);
                    if (response.ok) {
                        statusEl.classList.add('bg-green-100', 'text-green-800');
                        statusEl.textContent = '✓ Connection successful!';
                    } else {
                        throw new Error('Server returned ' + response.status);
                    }
                } catch (error) {
                    statusEl.classList.add('bg-red-100', 'text-red-800');
                    statusEl.textContent = `✗ Connection failed: ${error.message}`;
                }
            });
        }

        // Display Settings
        const displayForm = document.getElementById('displaySettingsForm');
        if (displayForm) {
            displayForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const settings = {
                    currency: document.getElementById('currency').value,
                    decimalPlaces: document.getElementById('decimalPlaces').value,
                    darkMode: document.getElementById('darkMode').checked
                };
                saveSettings(settings);
                if (window.notificationService) window.notificationService.success('Display settings saved');

                if (settings.darkMode) {
                    document.body.classList.add('dark-mode');
                } else {
                    document.body.classList.remove('dark-mode');
                }
            });
        }

        // Data Management
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', async () => {
                try {
                    if (window.notificationService) window.notificationService.info('Exporting data...');
                    const [groups, ledgers, vouchers, items] = await Promise.all([
                        fetch(`${window.API_BASE_URL}/groups`).then(r => r.json()).catch(() => []),
                        fetch(`${window.API_BASE_URL}/ledgers`).then(r => r.json()).catch(() => []),
                        fetch(`${window.API_BASE_URL}/vouchers`).then(r => r.json()).catch(() => []),
                        fetch(`${window.API_BASE_URL}/items`).then(r => r.json()).catch(() => [])
                    ]);

                    const data = { groups, ledgers, vouchers, items };
                    const dataStr = JSON.stringify(data, null, 2);
                    const blob = new Blob([dataStr], { type: 'application/json' });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `tally-backup-${new Date().toISOString().split('T')[0]}.json`;
                    link.click();
                    if (window.notificationService) window.notificationService.success('Data exported successfully');
                } catch (error) {
                    console.error(error);
                    if (window.notificationService) window.notificationService.error('Error exporting data');
                }
            });
        }

        const backupBtn = document.getElementById('backupBtn');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => {
                if (window.notificationService) window.notificationService.info('Backup feature coming soon');
            });
        }

        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Are you sure? This will reset the application to its default state. This action cannot be undone.')) {
                    localStorage.clear();
                    if (window.notificationService) window.notificationService.warning('Application reset. Please refresh the page.');
                    setTimeout(() => location.reload(), 1500);
                }
            });
        }
    }

    function saveSettings(newSettings) {
        const current = JSON.parse(localStorage.getItem('appSettings') || '{}');
        localStorage.setItem('appSettings', JSON.stringify({ ...current, ...newSettings }));
    }

    window.initializeSettings = function () {
        console.log('Initializing Settings Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getSettingsTemplate();
            loadSettings();
            setupEventListeners();
        }
    };
})();
