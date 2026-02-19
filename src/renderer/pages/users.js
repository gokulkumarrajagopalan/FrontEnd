(function () {
    const getUsersTemplate = () => {
        const addUserBtn = window.UIComponents.button({
            id: 'addUserBtn',
            text: 'New User',
            icon: '<i class="fas fa-plus"></i>',
            variant: 'primary'
        });

        const searchInput = window.UIComponents.searchInput({
            id: 'userSearch',
            placeholder: 'Search by username, email...',
            width: '100%'
        });

        const roleSelect = window.UIComponents.select({
            id: 'roleFilter',
            placeholder: 'All Roles',
            options: [
                { value: 'ADMIN', label: 'Admin' },
                { value: 'MANAGER', label: 'Manager' },
                { value: 'USER', label: 'User' },
                { value: 'VIEWER', label: 'Viewer' }
            ]
        });

        const statusSelect = window.UIComponents.select({
            id: 'statusFilter',
            placeholder: 'All Status',
            options: [
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' }
            ]
        });

        const userModal = window.UIComponents.modal({
            id: 'userModal',
            title: '<span id="userModalTitle">Add User</span>',
            content: `
                <form id="userForm" style="display: flex; flex-direction: column; gap: var(--ds-space-6);">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--ds-space-4);">
                        ${window.UIComponents.input({ id: 'username', label: 'Username', required: true, placeholder: 'jdoe' })}
                        ${window.UIComponents.input({ id: 'email', label: 'Email', type: 'email', required: true, placeholder: 'john@example.com' })}
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--ds-space-4);">
                        ${window.UIComponents.input({ id: 'firstName', label: 'First Name', required: true, placeholder: 'John' })}
                        ${window.UIComponents.input({ id: 'lastName', label: 'Last Name', placeholder: 'Doe' })}
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--ds-space-4);">
                        ${window.UIComponents.select({
                id: 'userRole',
                label: 'Role',
                required: true,
                options: [
                    { value: 'ADMIN', label: 'Admin' },
                    { value: 'MANAGER', label: 'Manager' },
                    { value: 'USER', label: 'User' },
                    { value: 'VIEWER', label: 'Viewer' }
                ]
            })}
                        ${window.UIComponents.input({ id: 'department', label: 'Department' })}
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--ds-space-4);">
                        <div>
                            ${window.UIComponents.input({ id: 'password', label: 'Password', type: 'password', placeholder: '••••••••' })}
                            <p id="passwordHint" style="font-size: var(--ds-text-3xs); color: var(--ds-text-tertiary); margin-top: var(--ds-space-1);"></p>
                        </div>
                        ${window.UIComponents.input({ id: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: '••••••••' })}
                    </div>
                    <div style="display: flex; align-items: center; gap: var(--ds-space-3); padding: var(--ds-space-2) 0;">
                        <input type="checkbox" id="userActive" style="width: 18px; height: 18px; accent-color: var(--ds-primary-600);" checked>
                        <label for="userActive" style="font-size: var(--ds-text-sm); font-weight: var(--ds-weight-medium); color: var(--ds-text-primary);">Active User Account</label>
                    </div>
                </form>
            `,
            footer: `
                <div style="display: flex; justify-content: flex-end; gap: var(--ds-space-3);">
                    ${window.UIComponents.button({ id: 'cancelUserBtn', text: 'Cancel', variant: 'secondary' })}
                    ${window.UIComponents.button({ id: 'submitUserBtn', text: 'Save User', type: 'submit', variant: 'primary', className: 'submit-trigger' })}
                </div>
            `
        });

        const detailsModal = window.UIComponents.modal({
            id: 'userDetailsModal',
            title: 'User Details',
            size: 'sm',
            content: '<div id="userDetailsContent"></div>',
            footer: `
                <div style="display: flex; justify-content: flex-end;">
                    ${window.UIComponents.button({ text: 'Close', variant: 'secondary', onclick: "document.getElementById('userDetailsModal').style.display='none'" })}
                </div>
            `
        });

        return window.Layout.page({
            title: 'User Management',
            subtitle: 'Directly manage system access, roles, and security permissions',
            headerActions: addUserBtn,
            content: `
                <div style="display: flex; flex-direction: column; gap: var(--ds-space-6);">
                    <div style="display: flex; gap: var(--ds-space-4); background: var(--ds-bg-surface-sunken); padding: var(--ds-space-4); border-radius: var(--ds-radius-2xl);">
                        <div style="flex: 1;">${searchInput}</div>
                        <div style="width: 200px;">${roleSelect}</div>
                        <div style="width: 200px;">${statusSelect}</div>
                    </div>
                    
                    <div id="usersTableContainer">
                        ${window.UIComponents.spinner({ size: 'md', text: 'Loading users...' })}
                    </div>
                </div>
                ${userModal}
                ${detailsModal}
            `
        });
    };

    if (!window.API_BASE_URL) {
        window.API_BASE_URL = window.AppConfig?.API_BASE_URL || window.apiConfig?.baseURL;
    }

    class UserManagementPage {
        constructor() {
            this.users = [];
            this.currentEditId = null;
            this.currentUser = this.getCurrentUserFromStore();
            this.initializePage();
        }

        getCurrentUserFromStore() {
            const userStr = localStorage.getItem('currentUser');
            return userStr ? JSON.parse(userStr) : null;
        }

        initializePage() {
            this.loadUsers();
            this.setupEventListeners();
        }

        async loadUsers() {
            try {
                const response = await fetch(`${window.API_BASE_URL}/users`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                });

                if (response.ok) {
                    this.users = await response.json();
                } else {
                    console.warn('Failed to load users, using empty list');
                    this.users = [];
                }
                this.renderTable();
            } catch (error) {
                console.error('Error loading users:', error);
                this.users = [];
                this.renderTable();
            }
        }

        renderTable(filteredUsers = null) {
            const container = document.getElementById('usersTableContainer');
            if (!container) return;

            const list = filteredUsers || this.users;

            if (list.length === 0) {
                container.innerHTML = window.UIComponents.emptyState({
                    title: 'No users found',
                    message: 'Try adjusting your filters or search query.'
                });
                return;
            }

            container.innerHTML = window.UIComponents.table({
                headers: ['User', 'Contact', 'Role', 'Department', 'Status', 'Actions'],
                rows: list.map(user => [
                    `<div style="display: flex; align-items: center; gap: var(--ds-space-3);">
                        <div style="width: 32px; height: 32px; background: var(--ds-primary-100); color: var(--ds-primary-700); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">
                            ${(user.firstName || 'U').charAt(0)}${(user.lastName || '').charAt(0)}
                        </div>
                        <div>
                            <div style="font-weight: var(--ds-weight-bold);">${user.username}</div>
                            <div style="font-size: 11px; color: var(--ds-text-tertiary);">ID: #${user.id}</div>
                        </div>
                    </div>`,
                    `<div>
                        <div>${user.email}</div>
                        <div style="font-size: 11px; color: var(--ds-text-tertiary);">Last login: ${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</div>
                    </div>`,
                    window.UIComponents.badge({ text: user.role || 'USER', variant: user.role === 'ADMIN' ? 'danger' : 'primary', size: 'sm' }),
                    user.department || '<span style="color: var(--ds-text-quaternary);">Not Assigned</span>',
                    window.UIComponents.badge({ text: user.active ? 'Active' : 'Inactive', variant: user.active ? 'success' : 'neutral', size: 'sm' }),
                    `<div style="display: flex; gap: var(--ds-space-2);">
                        <button title="Edit User" class="ds-btn ds-btn-sm ds-btn-secondary edit-btn" data-id="${user.id}" style="padding: 4px 8px;"><i class="fas fa-edit"></i></button>
                        <button title="View Details" class="ds-btn ds-btn-sm ds-btn-secondary view-btn" data-id="${user.id}" style="padding: 4px 8px;"><i class="fas fa-eye"></i></button>
                        <button title="${user.active ? 'Deactivate' : 'Activate'}" class="ds-btn ds-btn-sm ds-btn-secondary activate-btn" data-id="${user.id}" style="padding: 4px 8px; color: ${user.active ? 'var(--ds-error-500)' : 'var(--ds-success-500)'}"><i class="fas ${user.active ? 'fa-user-slash' : 'fa-user-check'}"></i></button>
                        <button title="Delete User" class="ds-btn ds-btn-sm ds-btn-secondary delete-btn" data-id="${user.id}" style="padding: 4px 8px; color: var(--ds-error-500);"><i class="fas fa-trash"></i></button>
                    </div>`
                ])
            });

            this.attachRowHandlers();
        }

        attachRowHandlers() {
            document.querySelectorAll('.edit-btn').forEach(btn => btn.onclick = (e) => this.openEditModal(this.users.find(u => u.id == btn.dataset.id)));
            document.querySelectorAll('.view-btn').forEach(btn => btn.onclick = (e) => this.viewUserDetails(this.users.find(u => u.id == btn.dataset.id)));
            document.querySelectorAll('.delete-btn').forEach(btn => btn.onclick = (e) => {
                if (confirm('Are you sure you want to delete this user?')) this.deleteUser(btn.dataset.id);
            });
            document.querySelectorAll('.activate-btn').forEach(btn => btn.onclick = (e) => {
                const user = this.users.find(u => u.id == btn.dataset.id);
                this.toggleUserStatus(user.id, user.active);
            });
        }

        setupEventListeners() {
            document.getElementById('addUserBtn').onclick = () => this.openAddModal();
            document.getElementById('userForm').onsubmit = (e) => { e.preventDefault(); this.saveUser(); };
            document.getElementById('cancelUserBtn').onclick = () => this.closeModal();
            document.getElementById('userSearch').oninput = () => this.filterUsers();
            document.getElementById('roleFilter').onchange = () => this.filterUsers();
            document.getElementById('statusFilter').onchange = () => this.filterUsers();
        }

        openAddModal() {
            this.currentEditId = null;
            document.getElementById('userForm').reset();
            document.getElementById('userModalTitle').textContent = 'Add New User';
            document.getElementById('passwordHint').textContent = '* Required for new users';
            document.getElementById('userModal').style.display = 'flex';
        }

        openEditModal(user) {
            if (!user) return;
            this.currentEditId = user.id;
            document.getElementById('username').value = user.username;
            document.getElementById('email').value = user.email;
            document.getElementById('firstName').value = user.firstName || '';
            document.getElementById('lastName').value = user.lastName || '';
            document.getElementById('userRole').value = user.role;
            document.getElementById('department').value = user.department || '';
            document.getElementById('userActive').checked = user.active;
            document.getElementById('userModalTitle').textContent = 'Edit User Account';
            document.getElementById('passwordHint').textContent = 'Leave blank to keep current password';
            document.getElementById('userModal').style.display = 'flex';
        }

        closeModal() {
            document.getElementById('userModal').style.display = 'none';
        }

        async saveUser() {
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password && password !== confirmPassword) {
                window.notificationService?.error('Passwords do not match');
                return;
            }

            const formData = {
                username: document.getElementById('username').value,
                email: document.getElementById('email').value,
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                role: document.getElementById('userRole').value,
                department: document.getElementById('department').value,
                active: document.getElementById('userActive').checked
            };

            if (password) formData.password = password;

            try {
                const response = await fetch(this.currentEditId ? `${window.API_BASE_URL}/users/${this.currentEditId}` : `${window.API_BASE_URL}/users`, {
                    method: this.currentEditId ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
                    body: JSON.stringify(formData)
                });

                if (response.ok) {
                    window.notificationService?.success('User saved successfully');
                    this.closeModal();
                    this.loadUsers();
                } else {
                    const err = await response.json();
                    window.notificationService?.error(err.message || 'Failed to save user');
                }
            } catch (err) {
                window.notificationService?.error('Error saving user');
            }
        }

        async deleteUser(id) {
            try {
                const response = await fetch(`${window.API_BASE_URL}/users/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                });
                if (response.ok) {
                    window.notificationService?.success('User deleted');
                    this.loadUsers();
                }
            } catch (err) {
                window.notificationService?.error('Error deleting user');
            }
        }

        async toggleUserStatus(id, active) {
            try {
                const response = await fetch(`${window.API_BASE_URL}/users/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
                    body: JSON.stringify({ active: !active })
                });
                if (response.ok) {
                    window.notificationService?.success(`User ${!active ? 'activated' : 'deactivated'}`);
                    this.loadUsers();
                }
            } catch (err) {
                window.notificationService?.error('Error toggling status');
            }
        }

        viewUserDetails(user) {
            if (!user) return;
            const content = document.getElementById('userDetailsContent');
            content.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: var(--ds-space-6);">
                    <div style="display: flex; align-items: center; gap: var(--ds-space-4);">
                        <div style="width: 64px; height: 64px; background: var(--ds-primary-100); color: var(--ds-primary-700); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 24px;">
                            ${(user.firstName || 'U').charAt(0)}
                        </div>
                        <div>
                            <h4 style="font-size: var(--ds-text-xl); font-weight: var(--ds-weight-bold); margin: 0;">${user.firstName} ${user.lastName || ''}</h4>
                            <p style="color: var(--ds-text-tertiary); margin: 0;">@${user.username}</p>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr; gap: var(--ds-space-4); background: var(--ds-bg-surface-sunken); padding: var(--ds-space-4); border-radius: var(--ds-radius-xl);">
                        <div><p style="font-size: 10px; color: var(--ds-text-tertiary); text-transform: uppercase; margin: 0;">Email</p><p style="margin: 0; font-weight: var(--ds-weight-medium);">${user.email}</p></div>
                        <div><p style="font-size: 10px; color: var(--ds-text-tertiary); text-transform: uppercase; margin: 0;">Role</p><p style="margin: 0; font-weight: var(--ds-weight-medium);">${user.role}</p></div>
                        <div><p style="font-size: 10px; color: var(--ds-text-tertiary); text-transform: uppercase; margin: 0;">Department</p><p style="margin: 0; font-weight: var(--ds-weight-medium);">${user.department || 'N/A'}</p></div>
                        <div><p style="font-size: 10px; color: var(--ds-text-tertiary); text-transform: uppercase; margin: 0;">Status</p>${window.UIComponents.badge({ text: user.active ? 'Active' : 'Inactive', variant: user.active ? 'success' : 'neutral', size: 'sm' })}</div>
                        <div><p style="font-size: 10px; color: var(--ds-text-tertiary); text-transform: uppercase; margin: 0;">Last Login</p><p style="margin: 0; font-weight: var(--ds-weight-medium);">${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</p></div>
                    </div>
                </div>
            `;
            document.getElementById('userDetailsModal').style.display = 'flex';
        }

        filterUsers() {
            const search = document.getElementById('userSearch').value.toLowerCase();
            const role = document.getElementById('roleFilter').value;
            const status = document.getElementById('statusFilter').value;

            const filtered = this.users.filter(u => {
                const matchesSearch = u.username.toLowerCase().includes(search) || u.email.toLowerCase().includes(search) || (u.firstName + ' ' + u.lastName).toLowerCase().includes(search);
                const matchesRole = !role || u.role === role;
                const matchesStatus = !status || (status === 'ACTIVE' ? u.active : !u.active);
                return matchesSearch && matchesRole && matchesStatus;
            });

            this.renderTable(filtered);
        }
    }

    window.initializeUsers = () => {
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getUsersTemplate();
            new UserManagementPage();
        }
    };
})();
