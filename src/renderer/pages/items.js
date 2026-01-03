(function () {
    const getItemsTemplate = () => `
    <div id="itemsPageContainer" class="space-y-6">
        <div class="page-header">
            <h2>Stock Items</h2>
            <p>Manage inventory items and stock details.</p>
        </div>

        <div class="page-actions justify-between">
            <div class="flex gap-3">
                <button id="addItemBtn" class="btn btn-erp">
                    <span class="mr-2">+</span> Add Item
                </button>
                <div class="relative">
                    <input id="itemSearch" placeholder="Search items..." class="w-64 pl-9">
                    <span class="absolute left-3 top-2.5 text-gray-400">🔍</span>
                </div>
            </div>
             <div class="flex gap-2">
                <select id="categoryFilter" class="w-40">
                    <option value="">All Categories</option>
                    <!-- Populated by JS -->
                </select>
            </div>
        </div>

        <div class="table-responsive">
            <table id="itemsTable" class="table">
                <thead>
                    <tr>
                        <th>Item Name</th>
                        <th>Category</th>
                        <th>Unit</th>
                        <th>Stock</th>
                        <th>Rate</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- Populated by JS -->
                </tbody>
            </table>
        </div>

        <!-- Add/Edit Modal -->
        <div id="itemModal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50 backdrop-blur-sm">
            <div class="modal-content w-full max-w-md m-4 animate-[slideIn_0.2s_ease-out]">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                    <h3 class="text-lg font-bold text-gray-800" id="modalTitle">Add Item</h3>
                    <button class="close-btn text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                </div>
                <form id="itemForm" class="p-6 space-y-4">
                    <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">Item Name *</label>
                        <input type="text" id="itemName" class="w-full px-3 py-2 border border-gray-200 rounded-lg" required>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">Category</label>
                         <input type="text" id="itemCategory" class="w-full px-3 py-2 border border-gray-200 rounded-lg" placeholder="e.g. Electronics">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                            <select id="itemUnit" class="w-full px-3 py-2 border border-gray-200 rounded-lg">
                                <option value="PCS">PCS</option>
                                <option value="BOX">BOX</option>
                                <option value="KG">KG</option>
                                <option value="LTR">LTR</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Rate</label>
                            <input type="number" id="rate" step="0.01" class="w-full px-3 py-2 border border-gray-200 rounded-lg">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-700 mb-1">Opening Stock</label>
                        <input type="number" id="openingStock" step="0.01" class="w-full px-3 py-2 border border-gray-200 rounded-lg">
                    </div>
                    <div class="flex justify-end gap-3 pt-4 border-t border-gray-50">
                        <button type="button" id="cancelBtn" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-erp">Save Item</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;

    if (!window.API_BASE_URL) {
        window.API_BASE_URL = window.AppConfig ? window.AppConfig.API_BASE_URL : 'http://localhost:8080';
    }

    let allItems = [];

    function getAuthHeaders() {
        const token = localStorage.getItem('authToken');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    }

    async function loadItems() {
        try {
            console.log('Loading items...');
            const response = await fetch(`${window.API_BASE_URL}/items`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            allItems = Array.isArray(data) ? data : (data.data || []);

            // Update category filter
            updateCategoryFilter();

            renderItemsTable(allItems);
        } catch (error) {
            console.error('Error loading items:', error);
            const tbody = document.querySelector('#itemsTable tbody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">Error loading items</td></tr>';
        }
    }

    function updateCategoryFilter() {
        const filter = document.getElementById('categoryFilter');
        if (!filter) return;

        const categories = [...new Set(allItems.map(i => i.category).filter(Boolean))];
        const currentValue = filter.value;

        filter.innerHTML = '<option value="">All Categories</option>' +
            categories.map(c => `<option value="${c}">${c}</option>`).join('');

        if (categories.includes(currentValue)) {
            filter.value = currentValue;
        }
    }

    function renderItemsTable(items) {
        const tbody = document.querySelector('#itemsTable tbody');
        if (!tbody) return;

        if (!Array.isArray(items) || items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">No items found</td></tr>';
            return;
        }

        tbody.innerHTML = items.map(item => `
            <tr>
                <td>${item.itemName || 'N/A'}</td>
                <td>${item.category || 'N/A'}</td>
                <td>${item.unit || 'PCS'}</td>
                <td>${(item.openingStock || 0).toFixed(2)}</td>
                <td>₹${(item.rate || 0).toFixed(2)}</td>
                <td>
                    <button class="btn btn-small edit-btn" data-id="${item.id || item._id}">Edit</button>
                    <button class="btn btn-small delete-btn" data-id="${item.id || item._id}">Delete</button>
                </td>
            </tr>
        `).join('');

        attachRowHandlers();
    }

    function setupEventListeners() {
        const modal = document.getElementById('itemModal');
        const addBtn = document.getElementById('addItemBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const closeBtn = document.querySelector('.close-btn');
        const form = document.getElementById('itemForm');
        const searchInput = document.getElementById('itemSearch');
        const categoryFilter = document.getElementById('categoryFilter');

        if (addBtn) {
            addBtn.addEventListener('click', () => {
                document.getElementById('modalTitle').textContent = 'Add Item';
                form.reset();
                delete modal.dataset.editId;
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            });
        }

        const closeModal = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        };

        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const itemData = {
                    itemName: document.getElementById('itemName').value,
                    category: document.getElementById('itemCategory').value,
                    unit: document.getElementById('itemUnit').value,
                    openingStock: parseFloat(document.getElementById('openingStock').value) || 0,
                    rate: parseFloat(document.getElementById('rate').value) || 0
                };

                try {
                    let response;
                    if (modal.dataset.editId) {
                        // Edit
                        response = await fetch(`${window.API_BASE_URL}/items/${modal.dataset.editId}`, {
                            method: 'PUT',
                            headers: getAuthHeaders(),
                            body: JSON.stringify(itemData)
                        });
                    } else {
                        // Add
                        response = await fetch(`${window.API_BASE_URL}/items`, {
                            method: 'POST',
                            headers: getAuthHeaders(),
                            body: JSON.stringify(itemData)
                        });
                    }

                    if (response.ok) {
                        closeModal();
                        showSuccess('Item saved successfully');
                        await loadItems();
                    } else {
                        showError('Failed to save item');
                    }
                } catch (error) {
                    console.error('Error saving item:', error);
                    showError('Error saving item');
                }
            });
        }

        if (searchInput) searchInput.addEventListener('input', () => filterItems());
        if (categoryFilter) categoryFilter.addEventListener('change', () => filterItems());

        window.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    function attachRowHandlers() {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const item = allItems.find(i => (i.id || i._id) == id);
                if (item) openEditModal(item);
            });
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                if (confirm('Delete this item?')) {
                    try {
                        const response = await fetch(`${window.API_BASE_URL}/items/${id}`, {
                            method: 'DELETE',
                            headers: getAuthHeaders()
                        });
                        if (response.ok) {
                            showSuccess('Item deleted successfully');
                            await loadItems();
                        } else {
                            showError('Failed to delete item');
                        }
                    } catch (error) {
                        console.error('Error deleting item:', error);
                        showError('Error deleting item');
                    }
                }
            });
        });
    }

    function openEditModal(item) {
        const modal = document.getElementById('itemModal');
        document.getElementById('modalTitle').textContent = 'Edit Item';
        document.getElementById('itemName').value = item.itemName || '';
        document.getElementById('itemCategory').value = item.category || '';
        document.getElementById('itemUnit').value = item.unit || 'PCS';
        document.getElementById('openingStock').value = item.openingStock || 0;
        document.getElementById('rate').value = item.rate || 0;

        modal.dataset.editId = item.id || item._id;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function filterItems() {
        const search = document.getElementById('itemSearch')?.value.toLowerCase() || '';
        const category = document.getElementById('categoryFilter')?.value || '';

        const filtered = allItems.filter(item => {
            const matchesSearch = (item.itemName || '').toLowerCase().includes(search);
            const matchesCategory = !category || item.category === category;
            return matchesSearch && matchesCategory;
        });

        renderItemsTable(filtered);
    }

    function showError(message) {
        console.error(message);
        const alert = document.createElement('div');
        alert.className = 'fixed top-5 right-5 px-6 py-3 rounded shadow-lg z-50 text-white bg-red-500';
        alert.textContent = message;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 3000);
    }

    function showSuccess(message) {
        console.log(message);
        const alert = document.createElement('div');
        alert.className = 'fixed top-5 right-5 px-6 py-3 rounded shadow-lg z-50 text-white bg-green-500';
        alert.textContent = message;
        document.body.appendChild(alert);
        setTimeout(() => alert.remove(), 3000);
    }

    window.initializeItems = async function () {
        console.log('Initializing Items Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getItemsTemplate();
            await loadItems();
            setupEventListeners();
        }
    };
})();
