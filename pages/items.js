// Items script
const API_BASE_URL = 'http://localhost:8080/api';
let allItems = [];

async function initializeItems() {
    try {
        await loadItems();
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing items:', error);
    }
}

async function loadItems() {
    try {
        const response = await fetch(`${API_BASE_URL}/items`);
        allItems = await response.json() || [];
        renderItemsTable(allItems);
    } catch (error) {
        console.error('Error loading items:', error);
        document.getElementById('itemsTable').innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">Error loading items</td></tr>';
    }
}

function renderItemsTable(items) {
    const table = document.getElementById('itemsTable');
    if (!Array.isArray(items) || items.length === 0) {
        table.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">No items found</td></tr>';
        return;
    }

    table.innerHTML = items.map(item => `
        <tr>
            <td>${item.itemName || 'N/A'}</td>
            <td>${item.category || 'N/A'}</td>
            <td>${item.unit || 'PCS'}</td>
            <td>${(item.openingStock || 0).toFixed(2)}</td>
            <td>₹${(item.rate || 0).toFixed(2)}</td>
            <td>
                <button class="btn btn-small edit-btn" data-id="${item.id}">Edit</button>
                <button class="btn btn-small delete-btn" data-id="${item.id}">Delete</button>
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

    addBtn.addEventListener('click', () => {
        document.getElementById('modalTitle').textContent = 'Add Item';
        document.getElementById('itemForm').reset();
        modal.classList.add('active');
    });

    cancelBtn.addEventListener('click', () => modal.classList.remove('active'));
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));

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
            const response = await fetch(`${API_BASE_URL}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemData)
            });

            if (response.ok) {
                modal.classList.remove('active');
                await loadItems();
            }
        } catch (error) {
            console.error('Error saving item:', error);
        }
    });

    searchInput.addEventListener('input', () => filterItems());
    categoryFilter.addEventListener('change', () => filterItems());

    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
}

function attachRowHandlers() {
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this item?')) {
                try {
                    await fetch(`${API_BASE_URL}/items/${id}`, { method: 'DELETE' });
                    await loadItems();
                } catch (error) {
                    console.error('Error deleting item:', error);
                }
            }
        });
    });
}

function filterItems() {
    const search = document.getElementById('itemSearch').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value.toLowerCase();

    const filtered = allItems.filter(item => {
        const matchesSearch = item.itemName.toLowerCase().includes(search);
        const matchesCategory = !category || item.category.toLowerCase().includes(category);
        return matchesSearch && matchesCategory;
    });

    renderItemsTable(filtered);
}

initializeItems();
