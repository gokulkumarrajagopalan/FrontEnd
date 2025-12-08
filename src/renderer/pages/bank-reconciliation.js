(function () {
    const getBankReconciliationTemplate = () => `
    <div id="bankPageContainer" class="space-y-6">
        <div class="page-header">
            <h2>Bank Reconciliation</h2>
            <p>Match bank statement lines to ledger transactions.</p>
        </div>

        <div class="page-actions justify-between">
            <div class="relative">
                <input id="bankSearch" placeholder="Search bank statement..." class="w-64 pl-9 px-3 py-2 border border-gray-200 rounded-lg">
                <span class="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>
            <button id="importBank" class="btn btn-primary">Import CSV</button>
        </div>

        <div class="table-responsive">
            <table id="bankTable" class="table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Suggested Match</th>
                        <th>Action</th>
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

    let bankLines = [];

    function getAuthHeaders() {
        const token = localStorage.getItem('authToken');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    }

    async function loadBankLines() {
        try {
            const response = await fetch(`${window.API_BASE_URL}/bank/statements`, { headers: getAuthHeaders() });
            if (!response.ok) {
                if (response.status === 404) {
                    bankLines = [];
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } else {
                const data = await response.json();
                bankLines = Array.isArray(data) ? data : (data.data || []);
            }
            renderBankTable(bankLines);
        } catch (error) {
            console.error('Error loading bank lines:', error);
            const tbody = document.querySelector('#bankTable tbody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">Error loading bank statements</td></tr>';
        }
    }

    function renderBankTable(lines) {
        const tbody = document.querySelector('#bankTable tbody');
        if (!tbody) return;

        if (!Array.isArray(lines) || lines.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">No bank lines found</td></tr>';
            return;
        }

        tbody.innerHTML = lines.map(l => `
            <tr>
                <td>${l.date ? new Date(l.date).toLocaleDateString() : 'N/A'}</td>
                <td>${l.description || ''}</td>
                <td>₹${(l.amount || 0).toFixed(2)}</td>
                <td>${suggestMatch(l) || '<span class="text-gray-400">-</span>'}</td>
                <td>
                    <button class="btn btn-small match-btn" data-id="${l.id || l._id}">Match</button>
                </td>
            </tr>
        `).join('');

        attachRowHandlers();
    }

    function suggestMatch(line) {
        // Simple heuristic matching
        // In a real app, this would likely be more sophisticated or server-side
        // For now, we just check if any ledger name is part of the description
        // This requires access to ledgers, which we might not have loaded here.
        // We'll skip complex logic for now or assume a global cache if available.
        return null;
    }

    function attachRowHandlers() {
        document.querySelectorAll('.match-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                if (window.notificationService) window.notificationService.info(`Matching functionality for ${id} coming soon`);
            });
        });
    }

    function setupEventListeners() {
        const searchInput = document.getElementById('bankSearch');
        const importBtn = document.getElementById('importBank');

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const q = searchInput.value.toLowerCase();
                const filtered = bankLines.filter(l =>
                    (l.description || '').toLowerCase().includes(q)
                );
                renderBankTable(filtered);
            });
        }

        if (importBtn) {
            importBtn.addEventListener('click', () => {
                if (window.notificationService) window.notificationService.info('Import CSV feature coming soon');
            });
        }
    }

    window.initializeBankReconciliation = async function () {
        console.log('Initializing Bank Reconciliation Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getBankReconciliationTemplate();
            await loadBankLines();
            setupEventListeners();
        }
    };
})();
