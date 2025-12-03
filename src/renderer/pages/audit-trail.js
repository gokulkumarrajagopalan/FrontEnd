(function () {
    const getAuditTrailTemplate = () => `
    <div id="auditPageContainer" class="space-y-6">
        <div class="page-header">
            <h2>Audit Trail</h2>
            <p>View system audit logs.</p>
        </div>

        <div class="page-actions">
            <div class="relative w-full max-w-md">
                <input id="auditSearch" placeholder="Search audit logs..." class="w-full pl-9 px-3 py-2 border border-gray-200 rounded-lg">
                <span class="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>
        </div>

        <div class="table-responsive">
            <table id="auditTable" class="table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Entity</th>
                        <th>Details</th>
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

    let audits = [];

    function getAuthHeaders() {
        const token = localStorage.getItem('authToken');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    }

    async function loadAudits() {
        try {
            // Assuming endpoint exists, otherwise empty list
            // If no specific audit endpoint, we might skip or mock
            const response = await fetch(`${window.API_BASE_URL}/audit/logs`, { headers: getAuthHeaders() });
            if (!response.ok) {
                // If 404, maybe feature not enabled, just show empty
                if (response.status === 404) {
                    audits = [];
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } else {
                const data = await response.json();
                audits = Array.isArray(data) ? data : (data.data || []);
            }
            renderAudits(audits);
        } catch (error) {
            console.error('Error loading audits:', error);
            const tbody = document.querySelector('#auditTable tbody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">Error loading audit logs</td></tr>';
        }
    }

    function renderAudits(list) {
        const tbody = document.querySelector('#auditTable tbody');
        if (!tbody) return;

        if (!Array.isArray(list) || list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">No audit logs found</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(a => `
            <tr>
                <td>${a.timestamp ? new Date(a.timestamp).toLocaleString() : 'N/A'}</td>
                <td>${a.user || 'System'}</td>
                <td><span class="status-badge">${a.action || 'Unknown'}</span></td>
                <td>${a.entity || '-'}</td>
                <td class="text-xs text-gray-500 max-w-xs truncate" title="${a.details || ''}">${a.details || '-'}</td>
            </tr>
        `).join('');
    }

    function setupEventListeners() {
        const searchInput = document.getElementById('auditSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const q = searchInput.value.toLowerCase();
                const filtered = audits.filter(a =>
                    (a.user || '').toLowerCase().includes(q) ||
                    (a.action || '').toLowerCase().includes(q) ||
                    (a.entity || '').toLowerCase().includes(q) ||
                    (a.details || '').toLowerCase().includes(q)
                );
                renderAudits(filtered);
            });
        }
    }

    window.initializeAuditTrail = async function () {
        console.log('Initializing Audit Trail Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getAuditTrailTemplate();
            await loadAudits();
            setupEventListeners();
        }
    };
})();
