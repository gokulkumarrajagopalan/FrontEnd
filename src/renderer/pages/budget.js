(function () {
    const getTemplate = () => `
    <div id="budgetPageContainer" class="space-y-6">
        <div class="page-header">
            <h2>Budget Management</h2>
            <p>Create and track budgets.</p>
        </div>

        <div class="page-actions justify-between">
            <button id="addBudgetBtn" class="btn btn-primary">New Budget</button>
            <div class="relative">
                <input id="budgetSearch" placeholder="Search budgets..." class="w-64 pl-9 px-3 py-2 border border-gray-200 rounded-lg">
                <span class="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>
        </div>

        <div class="table-responsive">
            <table id="budgetTable" class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Period</th>
                        <th>Amount</th>
                        <th>Used</th>
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
        window.API_BASE_URL = window.AppConfig ? window.AppConfig.API_BASE_URL : 'http://localhost:8080/api';
    }

    let budgets = [];

    async function loadBudgets() {
        try {
            const response = await fetch(`${window.API_BASE_URL}/budgets`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });

            if (response.ok) {
                const data = await response.json();
                budgets = Array.isArray(data) ? data : (data.data || []);
                renderBudgets(budgets);
            } else {
                // If 404 or other error, just show empty for now or handle specific errors
                if (response.status === 404) {
                    budgets = [];
                    renderBudgets([]);
                } else {
                    console.error('Failed to load budgets');
                }
            }
        } catch (error) {
            console.error('Error loading budgets:', error);
            const tbody = document.querySelector('#budgetTable tbody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">Error loading budgets</td></tr>';
        }
    }

    function renderBudgets(list) {
        const tbody = document.querySelector('#budgetTable tbody');
        if (!tbody) return;

        if (!Array.isArray(list) || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">No budgets found</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(b => `
            <tr>
                <td>${b.name}</td>
                <td>${b.period || 'N/A'}</td>
                <td>₹${(b.amount || 0).toFixed(2)}</td>
                <td>₹${(b.used || 0).toFixed(2)}</td>
                <td><button class="btn btn-small">View</button></td>
            </tr>
        `).join('');
    }

    function setupEventListeners() {
        document.getElementById('addBudgetBtn')?.addEventListener('click', () => {
            if (window.notificationService) window.notificationService.info('Budget creation coming soon');
        });

        document.getElementById('budgetSearch')?.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = budgets.filter(b => b.name.toLowerCase().includes(q));
            renderBudgets(filtered);
        });
    }

    window.initializeBudget = async function () {
        console.log('Initializing Budget Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getTemplate();
            await loadBudgets();
            setupEventListeners();
        }
    };
})();
