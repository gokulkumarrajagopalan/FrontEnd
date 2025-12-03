(function () {
    const getTemplate = () => `
    <div id="paymentPageContainer" class="space-y-6">
        <div class="page-header">
            <h2>Payment Tracking</h2>
            <p>Track payments and statuses.</p>
        </div>

        <div class="page-actions justify-between">
            <div class="relative">
                <input id="paymentsSearch" placeholder="Search payments..." class="w-64 pl-9 px-3 py-2 border border-gray-200 rounded-lg">
                <span class="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>
            <button id="refreshPayments" class="btn btn-secondary">Refresh</button>
        </div>

        <div class="table-responsive">
            <table id="paymentsTable" class="table">
                <thead>
                    <tr>
                        <th>Ref</th>
                        <th>Date</th>
                        <th>Party</th>
                        <th>Amount</th>
                        <th>Status</th>
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

    let payments = [];

    async function loadPayments() {
        try {
            const response = await fetch(`${window.API_BASE_URL}/payments`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });

            if (response.ok) {
                const data = await response.json();
                payments = Array.isArray(data) ? data : (data.data || []);
                renderPayments(payments);
            } else {
                if (response.status === 404) {
                    payments = [];
                    renderPayments([]);
                } else {
                    console.error('Failed to load payments');
                }
            }
        } catch (error) {
            console.error('Error loading payments:', error);
            const tbody = document.querySelector('#paymentsTable tbody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">Error loading payments</td></tr>';
        }
    }

    function renderPayments(list) {
        const tbody = document.querySelector('#paymentsTable tbody');
        if (!tbody) return;

        if (!Array.isArray(list) || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">No payments found</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(p => `
            <tr>
                <td>${p.ref || p.id}</td>
                <td>${p.date ? new Date(p.date).toLocaleDateString() : 'N/A'}</td>
                <td>${p.party || ''}</td>
                <td>₹${(p.amount || 0).toFixed(2)}</td>
                <td><span class="status-badge ${getStatusClass(p.status)}">${p.status || 'Pending'}</span></td>
                <td><button class="btn btn-small" data-id="${p.id || p.ref}">View</button></td>
            </tr>
        `).join('');
    }

    function getStatusClass(status) {
        switch ((status || '').toLowerCase()) {
            case 'completed': return 'active';
            case 'pending': return 'warning';
            case 'failed': return 'inactive';
            default: return '';
        }
    }

    function setupEventListeners() {
        document.getElementById('refreshPayments')?.addEventListener('click', () => {
            loadPayments();
            if (window.notificationService) window.notificationService.info('Refreshing payments...');
        });

        document.getElementById('paymentsSearch')?.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = payments.filter(p =>
                (p.ref || '').toLowerCase().includes(q) ||
                (p.party || '').toLowerCase().includes(q)
            );
            renderPayments(filtered);
        });
    }

    window.initializePayments = async function () {
        console.log('Initializing Payments Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getTemplate();
            await loadPayments();
            setupEventListeners();
        }
    };
})();
