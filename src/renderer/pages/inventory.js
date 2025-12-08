(function () {
    const getInventoryTemplate = () => `
    <div id="inventoryPageContainer" class="space-y-6">
        <div class="page-header">
            <h2>Inventory Management</h2>
            <p>Track stock and movements.</p>
        </div>

        <div class="page-actions justify-between">
            <div class="flex gap-3">
                <button id="adjustStockBtn" class="btn btn-secondary">Adjust Stock</button>
                <button id="stockTakeBtn" class="btn btn-secondary">Stock Take</button>
            </div>
            <div class="relative">
                <input id="inventorySearch" placeholder="Search items..." class="w-64 pl-9">
                <span class="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>
        </div>

        <div class="table-responsive">
            <table id="inventoryTable" class="table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>SKU</th>
                        <th>Stock</th>
                        <th>Unit</th>
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

    let inventoryItems = [];

    function getAuthHeaders() {
        const token = localStorage.getItem('authToken');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    }

    async function loadInventory() {
        try {
            console.log('Loading inventory...');
            const response = await fetch(`${window.API_BASE_URL}/inventory`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            inventoryItems = Array.isArray(data) ? data : (data.data || []);
            renderInventoryTable(inventoryItems);
        } catch (error) {
            console.error('Error loading inventory:', error);
            const tbody = document.querySelector('#inventoryTable tbody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">Error loading inventory</td></tr>';
            if (window.notificationService) window.notificationService.error('Failed to load inventory');
        }
    }

    function renderInventoryTable(items) {
        const tbody = document.querySelector('#inventoryTable tbody');
        if (!tbody) return;

        if (!Array.isArray(items) || items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">No items found</td></tr>';
            return;
        }

        tbody.innerHTML = items.map(item => `
            <tr>
                <td>${item.itemName || item.name || 'N/A'}</td>
                <td>${item.sku || ''}</td>
                <td>${(item.stock || 0).toFixed ? (item.stock || 0).toFixed(2) : (item.stock || 0)}</td>
                <td>${item.unit || 'PCS'}</td>
                <td>
                    <button class="btn btn-small btn-secondary adjust-btn" data-id="${item.id || item._id}">Adjust</button>
                </td>
            </tr>
        `).join('');

        attachRowHandlers();
    }

    function setupEventListeners() {
        const searchInput = document.getElementById('inventorySearch');
        const adjustBtn = document.getElementById('adjustStockBtn');
        const stockTakeBtn = document.getElementById('stockTakeBtn');

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const query = searchInput.value.toLowerCase();
                const filtered = inventoryItems.filter(item =>
                    (item.itemName || item.name || '').toLowerCase().includes(query) ||
                    (item.sku || '').toLowerCase().includes(query)
                );
                renderInventoryTable(filtered);
            });
        }

        if (adjustBtn) {
            adjustBtn.addEventListener('click', () => {
                // TODO: Implement Adjust Stock Modal
                console.log('Adjust Stock clicked');
                if (window.notificationService) window.notificationService.info('Stock Adjustment feature coming soon');
            });
        }

        if (stockTakeBtn) {
            stockTakeBtn.addEventListener('click', () => {
                // TODO: Implement Stock Take
                console.log('Stock Take clicked');
                if (window.notificationService) window.notificationService.info('Stock Take feature coming soon');
            });
        }
    }

    function attachRowHandlers() {
        document.querySelectorAll('.adjust-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                console.log('Adjust item', id);
                // TODO: Open adjust modal for specific item
            });
        });
    }

    window.initializeInventory = async function () {
        console.log('Initializing Inventory Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getInventoryTemplate();
            await loadInventory();
            setupEventListeners();
        }
    };
})();
