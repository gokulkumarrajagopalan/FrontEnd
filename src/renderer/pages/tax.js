(function () {
    const getTemplate = () => `
    <div id="taxPageContainer" class="space-y-6">
        <div class="page-header">
            <h2>Tax Management</h2>
            <p>Manage GST/Tax settings and calculations.</p>
        </div>

        <div class="page-actions justify-between">
            <button id="taxCalcBtn" class="btn btn-secondary">Calculate Tax Demo</button>
            <div class="relative">
                <input id="taxSearch" placeholder="Search tax rules..." class="w-64 pl-9 px-3 py-2 border border-gray-200 rounded-lg">
                <span class="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>
        </div>

        <div class="table-responsive">
            <table id="taxTable" class="table">
                <thead>
                    <tr>
                        <th>Rule</th>
                        <th>Rate</th>
                        <th>Type</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- Populated by JS -->
                </tbody>
            </table>
        </div>
    </div>
    `;

    if (!window.API_BASE_URL) {
        window.API_BASE_URL = window.AppConfig ? window.AppConfig.API_BASE_URL : 'http://localhost:8080';
    }

    let taxRules = [];

    async function loadTaxRules() {
        try {
            const response = await fetch(`${window.API_BASE_URL}/tax/rules`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });

            if (response.ok) {
                const data = await response.json();
                taxRules = Array.isArray(data) ? data : (data.data || []);
                renderTaxRules(taxRules);
            } else {
                if (response.status === 404) {
                    taxRules = [];
                    renderTaxRules([]);
                } else {
                    console.error('Failed to load tax rules');
                }
            }
        } catch (error) {
            console.error('Error loading tax rules:', error);
            const tbody = document.querySelector('#taxTable tbody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999;">Error loading tax rules</td></tr>';
        }
    }

    function renderTaxRules(list) {
        const tbody = document.querySelector('#taxTable tbody');
        if (!tbody) return;

        if (!Array.isArray(list) || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999;">No tax rules found</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(r => `
            <tr>
                <td>${r.name}</td>
                <td>${r.rate}%</td>
                <td>${r.type || 'GST'}</td>
                <td><button class="btn btn-small">Edit</button></td>
            </tr>
        `).join('');
    }

    function setupEventListeners() {
        document.getElementById('taxCalcBtn')?.addEventListener('click', () => {
            if (window.notificationService) window.notificationService.info('Tax calculation demo: use invoice total * rate');
        });

        document.getElementById('taxSearch')?.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = taxRules.filter(r => r.name.toLowerCase().includes(q));
            renderTaxRules(filtered);
        });
    }

    window.initializeTax = async function () {
        console.log('Initializing Tax Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getTemplate();
            await loadTaxRules();
            setupEventListeners();
        }
    };
})();
