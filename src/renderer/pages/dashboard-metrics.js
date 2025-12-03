(function () {
    const getTemplate = () => `
    <div id="metricsPageContainer" class="space-y-6">
        <div class="page-header">
            <h2>Dashboard Metrics</h2>
            <p>Key performance indicators and KPI summaries.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="metricsGrid">
            <div class="card p-6 bg-white rounded-lg shadow-sm border border-gray-100" id="kpiRevenue">
                <p class="text-xs font-medium text-gray-500 uppercase">Revenue</p>
                <strong id="kpiRevenueVal" class="text-2xl text-gray-800 block mt-2">₹0</strong>
            </div>
            <div class="card p-6 bg-white rounded-lg shadow-sm border border-gray-100" id="kpiExpense">
                <p class="text-xs font-medium text-gray-500 uppercase">Expense</p>
                <strong id="kpiExpenseVal" class="text-2xl text-gray-800 block mt-2">₹0</strong>
            </div>
            <div class="card p-6 bg-white rounded-lg shadow-sm border border-gray-100" id="kpiInventory">
                <p class="text-xs font-medium text-gray-500 uppercase">Stock Value</p>
                <strong id="kpiInventoryVal" class="text-2xl text-gray-800 block mt-2">₹0</strong>
            </div>
            <div class="card p-6 bg-white rounded-lg shadow-sm border border-gray-100" id="kpiOutstanding">
                <p class="text-xs font-medium text-gray-500 uppercase">Outstanding</p>
                <strong id="kpiOutstandingVal" class="text-2xl text-gray-800 block mt-2">₹0</strong>
            </div>
        </div>
    </div>
    `;

    if (!window.API_BASE_URL) {
        window.API_BASE_URL = window.AppConfig ? window.AppConfig.API_BASE_URL : 'http://localhost:8080/api';
    }

    async function loadMetrics() {
        try {
            const headers = { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` };

            // Parallel fetch for metrics
            const [revRes, expRes, invRes, outRes] = await Promise.all([
                fetch(`${window.API_BASE_URL}/metrics/revenue`, { headers }).catch(() => null),
                fetch(`${window.API_BASE_URL}/metrics/expense`, { headers }).catch(() => null),
                fetch(`${window.API_BASE_URL}/metrics/inventory`, { headers }).catch(() => null),
                fetch(`${window.API_BASE_URL}/metrics/outstanding`, { headers }).catch(() => null)
            ]);

            const rev = revRes && revRes.ok ? await revRes.json() : { value: 0 };
            const exp = expRes && expRes.ok ? await expRes.json() : { value: 0 };
            const inv = invRes && invRes.ok ? await invRes.json() : { value: 0 };
            const out = outRes && outRes.ok ? await outRes.json() : { value: 0 };

            updateMetric('kpiRevenueVal', rev.value);
            updateMetric('kpiExpenseVal', exp.value);
            updateMetric('kpiInventoryVal', inv.value);
            updateMetric('kpiOutstandingVal', out.value);

        } catch (error) {
            console.error('Error loading metrics:', error);
            if (window.notificationService) window.notificationService.error('Failed to load some metrics');
        }
    }

    function updateMetric(elementId, value) {
        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = `₹${Number(value || 0).toFixed(2)}`;
        }
    }

    window.initializeDashboardMetrics = async function () {
        console.log('Initializing Dashboard Metrics Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getTemplate();
            await loadMetrics();
        }
    };
})();
