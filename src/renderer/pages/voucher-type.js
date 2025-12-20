
(function () {
    // State
    let voucherTypes = [];
    let selectedCompanyId = null;

    // HTML Template (adapted from Groups)
    const getTemplate = () => `
    <div id="voucherTypePageContainer" class="space-y-6">
        <div class="page-header flex justify-between items-center">
            <div>
                <h2>Voucher Types</h2>
                <p>Manage voucher types fetched from Tally</p>
            </div>
            <div class="flex gap-3">
                <button id="syncVoucherTypesBtn" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-2 uppercase">
                    <span>🔄</span>
                    <span>Sync From Tally</span>
                </button>
            </div>
        </div>

        <div class="flex gap-4 mb-6 items-center">
            <div class="relative flex-grow" style="min-width: 400px;">
                <input type="text" id="voucherTypeSearch" placeholder="Search voucher types..." class="w-full px-4 py-2.5 pl-10 border border-gray-200 rounded-lg">
                <span class="absolute left-3 top-3 text-gray-400">🔍</span>
            </div>
        </div>

        <div class="table-responsive bg-white rounded-xl shadow-sm border border-gray-100">
            <table class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Parent</th>
                        <th>Mailing Name</th>
                        <th>Active</th>
                        <th>GUID</th>
                    </tr>
                </thead>
                <tbody id="voucherTypeTable">
                    <tr><td colspan="5" class="text-center py-8 text-gray-400">Loading voucher types...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
    `;

    // Styles (optional, for badge or table tweaks)
    const injectStyles = () => {
        if (document.getElementById('voucher-type-page-styles')) return;
        const style = document.createElement('style');
        style.id = 'voucher-type-page-styles';
        style.textContent = `
            .type-badge {
                background: #667eea;
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.85em;
            }
        `;
        document.head.appendChild(style);
    };

    // Initialization
    window.initializeVoucherType = async function () {
        const content = document.getElementById('page-content');
        if (!content) return;
        content.innerHTML = getTemplate();
        injectStyles();

        // Use global company selector if available
        const savedCompanyId = localStorage.getItem('selectedCompanyId');
        selectedCompanyId = window.selectedCompanyId || (savedCompanyId ? parseInt(savedCompanyId) : null);

        // Listen for global company changes
        window.addEventListener('companyChanged', async (e) => {
            selectedCompanyId = e.detail.companyId;
            await loadVoucherTypes();
        });

        await loadVoucherTypes();
        setupEventListeners();
    };

    async function loadVoucherTypes() {
        const table = document.getElementById('voucherTypeTable');
        if (!selectedCompanyId) {
            if (table) table.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-400">Please select a company to view voucher types</td></tr>';
            return;
        }
        try {
            showLoading();
            // Fetch from local Python server (or backend API if available)
            const response = await fetch('http://localhost:9000/vouchertypes');
            if (!response.ok) throw new Error('Failed to fetch voucher types');
            const data = await response.json();
            voucherTypes = data || [];
            renderVoucherTypesTable(voucherTypes);
        } catch (error) {
            if (table) table.innerHTML = `<tr><td colspan="5" class="text-center text-red-500 py-8">${error.message}</td></tr>`;
            showError('Failed to load voucher types: ' + error.message);
        }
    }

    function showLoading() {
        const table = document.getElementById('voucherTypeTable');
        if (table) table.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-400"><span class="animate-pulse">Loading voucher types...</span></td></tr>';
    }

    function renderVoucherTypesTable(data) {
        const table = document.getElementById('voucherTypeTable');
        if (!table) return;
        if (!Array.isArray(data) || data.length === 0) {
            table.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-400">No voucher types found for this company</td></tr>';
            return;
        }
        table.innerHTML = data.map(vt => `
            <tr class="hover:bg-gray-50">
                <td class="font-medium text-gray-900">${vt.NAME || 'N/A'}</td>
                <td class="text-gray-700">${vt.PARENT || '-'}</td>
                <td class="text-gray-700">${vt.MAILINGNAME || '-'}</td>
                <td>${vt.ISACTIVE === 'Yes' ? '<span class="text-green-600 font-medium">✓ Yes</span>' : '<span class="text-gray-400">✗ No</span>'}</td>
                <td class="font-mono text-xs text-gray-500">${vt.GUID ? vt.GUID.substring(0, 20) + '...' : 'N/A'}</td>
            </tr>
        `).join('');
    }

    function setupEventListeners() {
        const syncBtn = document.getElementById('syncVoucherTypesBtn');
        const searchInput = document.getElementById('voucherTypeSearch');
        if (syncBtn) syncBtn.addEventListener('click', syncVoucherTypesFromTally);
        if (searchInput) searchInput.addEventListener('input', filterVoucherTypes);
    }

    async function syncVoucherTypesFromTally() {
        if (!selectedCompanyId) {
            showError('Please select a company first');
            return;
        }
        const syncBtn = document.getElementById('syncVoucherTypesBtn');
        const originalContent = syncBtn.innerHTML;
        try {
            syncBtn.disabled = true;
            syncBtn.innerHTML = '<span class="animate-pulse">🔄 Syncing...</span>';
            // Call Python sync via Electron API if available, else fallback
            if (!window.electronAPI || !window.electronAPI.syncVoucherTypes) {
                throw new Error('Electron API not available. Please restart the application.');
            }
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            const authToken = localStorage.getItem('authToken');
            const deviceToken = localStorage.getItem('deviceToken');
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            const tallyPort = appSettings.tallyPort || 9000;
            const backendUrl = window.apiConfig?.baseURL || window.AppConfig?.API_BASE_URL || 'http://localhost:8080';
            const result = await window.electronAPI.syncVoucherTypes({
                companyId: selectedCompanyId,
                userId: currentUser?.userId || 1,
                authToken: authToken,
                deviceToken: deviceToken,
                tallyPort: tallyPort,
                backendUrl: backendUrl
            });
            if (result.success) {
                showSuccess(`✅ Successfully synced ${result.count || ''} voucher types from Tally!`);
                await loadVoucherTypes();
            } else {
                let errorMessage = 'Failed to sync voucher types: ' + (result.message || 'Sync failed');
                if (result.stderr) errorMessage += '\n\n❌ Error details:\n' + result.stderr;
                if (result.stdout && !result.stderr) errorMessage += '\n\n📄 Output:\n' + result.stdout;
                if (result.exitCode) errorMessage += '\n\nExit code: ' + result.exitCode;
                showError(errorMessage);
                return;
            }
        } catch (error) {
            let errorMessage = 'Failed to sync voucher types: ';
            if (error.message && error.message.includes('Electron API not available')) {
                errorMessage += error.message;
            } else {
                errorMessage += (error.message || 'Unknown error');
            }
            showError(errorMessage);
        } finally {
            syncBtn.disabled = false;
            syncBtn.innerHTML = originalContent;
        }
    }

    function filterVoucherTypes() {
        const search = document.getElementById('voucherTypeSearch').value.toLowerCase();
        const filtered = voucherTypes.filter(vt => {
            return (vt.NAME || '').toLowerCase().includes(search) ||
                (vt.PARENT || '').toLowerCase().includes(search) ||
                (vt.MAILINGNAME || '').toLowerCase().includes(search);
        });
        renderVoucherTypesTable(filtered);
    }

    function showError(message) {
        console.error(message);
        if (window.notificationService) {
            window.notificationService.error(message);
        } else {
            alert('❌ ' + message);
        }
    }

    function showSuccess(message) {
        console.log('✅', message);
        if (window.notificationService) {
            window.notificationService.success(message);
        } else {
            const msg = document.createElement('div');
            msg.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
            msg.textContent = message;
            document.body.appendChild(msg);
            setTimeout(() => msg.remove(), 3000);
        }
    }

})();
