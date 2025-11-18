// Groups script
const API_BASE_URL = 'http://localhost:8080/api';
let allGroups = [];

async function initializeGroups() {
    try {
        await loadGroups();
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing groups:', error);
    }
}

async function loadGroups() {
    try {
        const response = await fetch(`${API_BASE_URL}/groups`);
        allGroups = await response.json() || [];
        renderGroupsTable(allGroups);
    } catch (error) {
        console.error('Error loading groups:', error);
        document.getElementById('groupsTable').innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999;">Error loading groups</td></tr>';
    }
}

function renderGroupsTable(groups) {
    const table = document.getElementById('groupsTable');
    if (!Array.isArray(groups) || groups.length === 0) {
        table.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999;">No groups found</td></tr>';
        return;
    }

    table.innerHTML = groups.map(group => `
        <tr>
            <td>${group.groupName || 'N/A'}</td>
            <td><span class="type-badge">${group.groupType || 'N/A'}</span></td>
            <td>${group.description || '-'}</td>
            <td>
                <button class="btn btn-small edit-btn" data-id="${group.id}">Edit</button>
                <button class="btn btn-small delete-btn" data-id="${group.id}">Delete</button>
            </td>
        </tr>
    `).join('');

    attachRowHandlers();
}

function setupEventListeners() {
    const modal = document.getElementById('groupModal');
    const addBtn = document.getElementById('addGroupBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const closeBtn = document.querySelector('.close-btn');
    const form = document.getElementById('groupForm');
    const searchInput = document.getElementById('groupSearch');
    const typeFilter = document.getElementById('groupTypeFilter');

    addBtn.addEventListener('click', () => {
        document.getElementById('modalTitle').textContent = 'Add Group';
        document.getElementById('groupForm').reset();
        modal.classList.add('active');
    });

    cancelBtn.addEventListener('click', () => modal.classList.remove('active'));
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const groupData = {
            groupName: document.getElementById('groupName').value,
            groupType: document.getElementById('groupType').value,
            description: document.getElementById('groupDescription').value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(groupData)
            });

            if (response.ok) {
                modal.classList.remove('active');
                await loadGroups();
            }
        } catch (error) {
            console.error('Error saving group:', error);
        }
    });

    searchInput.addEventListener('input', (e) => filterGroups());
    typeFilter.addEventListener('change', () => filterGroups());

    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
}

function attachRowHandlers() {
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            if (confirm('Are you sure?')) {
                try {
                    await fetch(`${API_BASE_URL}/groups/${id}`, { method: 'DELETE' });
                    await loadGroups();
                } catch (error) {
                    console.error('Error deleting group:', error);
                }
            }
        });
    });
}

function filterGroups() {
    const search = document.getElementById('groupSearch').value.toLowerCase();
    const type = document.getElementById('groupTypeFilter').value;

    const filtered = allGroups.filter(group => {
        const matchesSearch = group.groupName.toLowerCase().includes(search);
        const matchesType = !type || group.groupType === type;
        return matchesSearch && matchesType;
    });

    renderGroupsTable(filtered);
}

// Add type badge styling
const style = document.createElement('style');
style.textContent = `
    .type-badge {
        background: #667eea;
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.85em;
    }
`;
document.head.appendChild(style);

initializeGroups();
