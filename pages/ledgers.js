// Ledgers script
const API_BASE_URL = 'http://localhost:8080/api';
let allLedgers = [];
let allGroups = [];

async function initializeLedgers() {
    try {
        await loadGroups();
        await loadLedgers();
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing ledgers:', error);
    }
}

async function loadGroups() {
    try {
        const response = await fetch(`${API_BASE_URL}/groups`);
        allGroups = await response.json() || [];
        
        // Populate group filter
        const groupFilter = document.getElementById('groupFilter');
        allGroups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.groupName;
            groupFilter.appendChild(option);
        });

        // Populate group dropdown in form
        const ledgerGroup = document.getElementById('ledgerGroup');
        allGroups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.groupName;
            ledgerGroup.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading groups:', error);
    }
}

async function loadLedgers() {
    try {
        const response = await fetch(`${API_BASE_URL}/ledgers`);
        allLedgers = await response.json() || [];
        renderLedgersTable(allLedgers);
    } catch (error) {
        console.error('Error loading ledgers:', error);
        document.getElementById('ledgersTable').innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">Error loading ledgers</td></tr>';
    }
}

function renderLedgersTable(ledgers) {
    const table = document.getElementById('ledgersTable');
    if (!Array.isArray(ledgers) || ledgers.length === 0) {
        table.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">No ledgers found</td></tr>';
        return;
    }

    table.innerHTML = ledgers.map(ledger => `
        <tr>
            <td>${ledger.ledgerName || 'N/A'}</td>
            <td>${ledger.groupName || 'N/A'}</td>
            <td>₹${(ledger.openingBalance || 0).toFixed(2)}</td>
            <td>₹${(ledger.closingBalance || 0).toFixed(2)}</td>
            <td>
                <button class="btn btn-small edit-btn" data-id="${ledger.id}">Edit</button>
                <button class="btn btn-small delete-btn" data-id="${ledger.id}">Delete</button>
            </td>
        </tr>
    `).join('');

    attachRowHandlers();
}

function setupEventListeners() {
    const modal = document.getElementById('ledgerModal');
    const addBtn = document.getElementById('addLedgerBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const closeBtn = document.querySelector('.close-btn');
    const form = document.getElementById('ledgerForm');
    const searchInput = document.getElementById('ledgerSearch');
    const groupFilter = document.getElementById('groupFilter');

    addBtn.addEventListener('click', () => {
        document.getElementById('modalTitle').textContent = 'Add Ledger';
        document.getElementById('ledgerForm').reset();
        modal.classList.add('active');
    });

    cancelBtn.addEventListener('click', () => modal.classList.remove('active'));
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const ledgerData = {
            ledgerName: document.getElementById('ledgerName').value,
            groupId: document.getElementById('ledgerGroup').value,
            openingBalance: parseFloat(document.getElementById('openingBalance').value) || 0,
            description: document.getElementById('ledgerDescription').value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/ledgers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ledgerData)
            });

            if (response.ok) {
                modal.classList.remove('active');
                await loadLedgers();
            }
        } catch (error) {
            console.error('Error saving ledger:', error);
        }
    });

    searchInput.addEventListener('input', () => filterLedgers());
    groupFilter.addEventListener('change', () => filterLedgers());

    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
}

function attachRowHandlers() {
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this ledger?')) {
                try {
                    await fetch(`${API_BASE_URL}/ledgers/${id}`, { method: 'DELETE' });
                    await loadLedgers();
                } catch (error) {
                    console.error('Error deleting ledger:', error);
                }
            }
        });
    });
}

function filterLedgers() {
    const search = document.getElementById('ledgerSearch').value.toLowerCase();
    const groupId = document.getElementById('groupFilter').value;

    const filtered = allLedgers.filter(ledger => {
        const matchesSearch = ledger.ledgerName.toLowerCase().includes(search);
        const matchesGroup = !groupId || ledger.groupId == groupId;
        return matchesSearch && matchesGroup;
    });

    renderLedgersTable(filtered);
}

initializeLedgers();
