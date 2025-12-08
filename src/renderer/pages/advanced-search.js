(function () {
    const getAdvancedSearchTemplate = () => `
    <div id="searchPageContainer" class="space-y-6">
        <div class="page-header">
            <h2>Advanced Search</h2>
            <p>Search across entities with filters.</p>
        </div>

        <div class="page-actions gap-3">
            <select id="searchEntity" class="w-40 px-3 py-2 border border-gray-200 rounded-lg bg-white">
                <option value="invoices">Invoices</option>
                <option value="items">Items</option>
                <option value="ledgers">Ledgers</option>
                <option value="vouchers">Vouchers</option>
            </select>
            <div class="relative flex-1 max-w-lg">
                <input id="searchQuery" placeholder="Enter search query..." class="w-full pl-9 px-3 py-2 border border-gray-200 rounded-lg">
                <span class="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>
            <button id="doSearch" class="btn btn-primary">Search</button>
        </div>

        <div id="searchResults" class="space-y-4 mt-4">
            <!-- Results will appear here -->
        </div>
    </div>
    `;

    if (!window.API_BASE_URL) {
        window.API_BASE_URL = window.AppConfig ? window.AppConfig.API_BASE_URL : 'http://localhost:8080';
    }

    function getAuthHeaders() {
        const token = localStorage.getItem('authToken');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    }

    function initializeAdvancedSearch() {
        const searchBtn = document.getElementById('doSearch');
        const queryInput = document.getElementById('searchQuery');

        if (searchBtn) {
            searchBtn.addEventListener('click', performSearch);
        }

        if (queryInput) {
            queryInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') performSearch();
            });
        }
    }

    async function performSearch() {
        const entity = document.getElementById('searchEntity').value;
        const query = document.getElementById('searchQuery').value;
        const resultsDiv = document.getElementById('searchResults');

        if (!query.trim()) {
            if (window.notificationService) window.notificationService.warning('Please enter a search term');
            return;
        }

        resultsDiv.innerHTML = '<div class="text-center p-4 text-gray-500">Searching...</div>';

        try {
            // Simulating search API call structure since generic search endpoint might vary
            // Adjust endpoint based on actual API capability or specific entity endpoints
            let url = `${window.API_BASE_URL}/${entity}`;
            // If the backend supports a generic search param, use it. Otherwise we might need to fetch all and filter client side (not ideal but functional for small datasets)
            // Assuming a simple filter pattern for now or specific search endpoint

            const response = await fetch(url, { headers: getAuthHeaders() });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const list = Array.isArray(data) ? data : (data.data || []);

            // Client-side filtering if API doesn't support direct search query param
            const filtered = list.filter(item => {
                const str = JSON.stringify(item).toLowerCase();
                return str.includes(query.toLowerCase());
            });

            renderResults(filtered, entity);

        } catch (error) {
            console.error('Search failed:', error);
            resultsDiv.innerHTML = '<div class="text-center p-4 text-red-500">Search failed. Please try again.</div>';
        }
    }

    function renderResults(results, entity) {
        const resultsDiv = document.getElementById('searchResults');

        if (results.length === 0) {
            resultsDiv.innerHTML = '<div class="text-center p-4 text-gray-500">No results found.</div>';
            return;
        }

        const html = results.map(item => {
            let title = 'Item';
            let details = '';

            switch (entity) {
                case 'invoices':
                    title = `Invoice #${item.id || item._id}`;
                    details = `Customer: ${item.customer || 'N/A'} | Amount: ${item.amount}`;
                    break;
                case 'items':
                    title = item.itemName || item.name;
                    details = `SKU: ${item.sku || 'N/A'} | Stock: ${item.stock}`;
                    break;
                case 'ledgers':
                    title = item.ledgerName || item.name;
                    details = `Group: ${item.groupName || 'N/A'}`;
                    break;
                case 'vouchers':
                    title = `Voucher #${item.id || item._id}`;
                    details = `Type: ${item.type} | Amount: ${item.amount}`;
                    break;
                default:
                    title = JSON.stringify(item);
            }

            return `
                <div class="bg-white p-4 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <h3 class="font-bold text-gray-800">${title}</h3>
                    <p class="text-sm text-gray-600 mt-1">${details}</p>
                    <div class="mt-2 text-xs text-gray-400 bg-gray-50 p-2 rounded overflow-hidden text-ellipsis whitespace-nowrap">
                        ${JSON.stringify(item)}
                    </div>
                </div>
            `;
        }).join('');

        resultsDiv.innerHTML = `<div class="grid gap-4">${html}</div>`;
    }

    window.initializeAdvancedSearch = function () {
        console.log('Initializing Advanced Search Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getAdvancedSearchTemplate();
            initializeAdvancedSearch();
        }
    };
})();
