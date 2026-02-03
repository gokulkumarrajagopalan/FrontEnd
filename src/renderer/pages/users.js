(function () {
    const getUsersTemplate = () => `
    <div id="usersPageContainer" class="space-y-6" style="padding: 2.5rem; max-width: 1400px; margin: 0 auto; box-sizing: border-box;">
        <div class="page-header flex justify-between items-center">
            <div>
                <h2>User Management</h2>
                <p>Manage application users and their roles</p>
            </div>
            <button id="addUserBtn" class="btn btn-erp">+ New User</button>
        </div>

        <div class="flex gap-4 mb-6">
            <input type="text" id="userSearch" placeholder="Search by username, email..." class="flex-1 px-4 py-2 border border-gray-200 rounded-lg">
            <select id="roleFilter" class="px-4 py-2 border border-gray-200 rounded-lg">
                <option value="">All Roles</option>
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="USER">User</option>
                <option value="VIEWER">Viewer</option>
            </select>
            <select id="statusFilter" class="px-4 py-2 border border-gray-200 rounded-lg">
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
            </select>
        </div>

        <div class="table-responsive">
            <table class="table w-full">
                <thead>
                    <tr>
                        <th class="text-left p-3">Username</th>
                        <th class="text-left p-3">Email</th>
                        <th class="text-left p-3">Role</th>
                        <th class="text-left p-3">Department</th>
                        <th class="text-left p-3">Last Login</th>
                        <th class="text-left p-3">Status</th>
                    </tr>
                </thead>
                <tbody id="usersTableBody">
                    <!-- Populated by JS -->
                </tbody>
            </table>
        </div>

        <!-- Add/Edit Modal -->
        <div id="userModal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50">
            <div class="bg-white rounded-xl w-full max-w-2xl mx-4 overflow-hidden">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 id="userModalTitle" class="font-bold text-gray-800">Add User</h3>
                    <button class="text-gray-400 hover:text-gray-600 text-2xl" id="closeUserModal">&times;</button>
                </div>
                <form id="userForm" class="p-6 space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                            <input type="text" id="username" class="w-full px-3 py-2 border border-gray-200 rounded-lg" required placeholder="username">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                            <input type="email" id="email" class="w-full px-3 py-2 border border-gray-200 rounded-lg" required placeholder="user@example.com">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                            <input type="text" id="firstName" class="w-full px-3 py-2 border border-gray-200 rounded-lg" required placeholder="First Name">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                            <input type="text" id="lastName" class="w-full px-3 py-2 border border-gray-200 rounded-lg" placeholder="Last Name">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                            <select id="userRole" class="w-full px-3 py-2 border border-gray-200 rounded-lg" required>
                                <option value="">Select Role</option>
                                <option value="ADMIN">Admin</option>
                                <option value="MANAGER">Manager</option>
                                <option value="USER">User</option>
                                <option value="VIEWER">Viewer</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Department</label>
                            <input type="text" id="department" class="w-full px-3 py-2 border border-gray-200 rounded-lg" placeholder="Department">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Password <span id="passwordHint" class="text-xs text-gray-500">(Leave blank to keep current)</span> *</label>
                            <input type="password" id="password" class="w-full px-3 py-2 border border-gray-200 rounded-lg" placeholder="Password">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                            <input type="password" id="confirmPassword" class="w-full px-3 py-2 border border-gray-200 rounded-lg" placeholder="Confirm Password">
                        </div>
                    </div>
                    <div>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" id="userActive" class="rounded text-primary-600" checked>
                            <span class="text-sm font-medium text-gray-700">Active User</span>
                        </label>
                    </div>
                    <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg" id="cancelUserBtn">Cancel</button>
                        <button type="submit" class="px-4 py-2 text-white rounded-lg" style="background: linear-gradient(135deg, #1346A8 0%, #5AB3FF 100%);">Save User</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- User Details Modal -->
        <div id="userDetailsModal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50">
            <div class="bg-white rounded-xl w-full max-w-md mx-4 overflow-hidden">
                <div class="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 class="font-bold text-gray-800">User Details</h3>
                    <button class="text-gray-400 hover:text-gray-600 text-2xl" id="closeUserDetailsModal">&times;</button>
                </div>
                <div id="userDetailsContent" class="p-6 space-y-4">
                    <!-- Populated by JS -->
                </div>
            </div>
        </div>
    </div>
    `;

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
            if (window.store && window.store.getState) {
                const state = window.store.getState();
                if (state && state.user && state.user.currentUser) {
                    return state.user.currentUser;
                }
            }
            const userStr = localStorage.getItem('currentUser');
            return userStr ? JSON.parse(userStr) : null;
        }

        initializePage() {
            this.loadUsers();
            this.setupEventListeners();
            this.displayCurrentUserInfo();
        }

        displayCurrentUserInfo() {
            if (!this.currentUser) return;
            const pageTitle = document.querySelector('#page-title');
            if (pageTitle) {
                pageTitle.textContent = `User Management - Logged in as: ${this.currentUser.firstName} ${this.currentUser.lastName}`;
            }
        }

        async loadUsers() {
            try {
                // Mock data if API fails or for dev
                // this.users = [
                //     { id: 1, username: 'admin', email: 'admin@example.com', role: 'ADMIN', department: 'IT', active: true, lastLogin: new Date() },
                //     { id: 2, username: 'manager', email: 'manager@example.com', role: 'MANAGER', department: 'Sales', active: true, lastLogin: new Date() }
                // ];
                // this.renderTable();
                // return;

                const response = await fetch(`${window.API_BASE_URL}/users`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                });

                if (response.ok) {
                    this.users = await response.json();
                    this.renderTable();
                } else {
                    // Fallback for demo if API not ready
                    console.warn('Failed to load users, using empty list');
                    this.users = [];
                    this.renderTable();
                }
            } catch (error) {
                console.error('Error loading users:', error);
                this.users = [];
                this.renderTable();
            }
        }

        renderTable() {
            const tbody = document.getElementById('usersTableBody');
            if (!tbody) return;

            if (this.users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">No users found</td></tr>';
                return;
            }

            tbody.innerHTML = this.users.map(user => `
                <tr class="border-b border-gray-50 hover:bg-gray-50">
                    <td class="p-3">${user.username || 'N/A'}</td>
                    <td class="p-3">${user.email || 'N/A'}</td>
                    <td class="p-3"><span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">${user.role || 'USER'}</span></td>
                    <td class="p-3">${user.department || '-'}</td>
                    <td class="p-3">${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
                    <td class="p-3">
                        <span class="px-2 py-1 rounded text-xs font-semibold ${user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            ${user.active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td class="p-3">
                        <div class="flex gap-2">
                            <button class="text-blue-600 hover:text-blue-800 edit-btn" data-id="${user.id}">Edit</button>
                            <button class="text-gray-600 hover:text-gray-800 view-btn" data-id="${user.id}">View</button>
                            <button class="${user.active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'} activate-btn" data-id="${user.id}">
                                ${user.active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button class="text-red-600 hover:text-red-800 delete-btn" data-id="${user.id}">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');

            this.attachRowHandlers();
        }

        attachRowHandlers() {
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    const user = this.users.find(u => u.id == id);
                    if (user) this.openEditModal(user);
                });
            });

            document.querySelectorAll('.view-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    const user = this.users.find(u => u.id == id);
                    if (user) this.viewUserDetails(user);
                });
            });

            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    if (confirm('Delete this user? This action cannot be undone.')) {
                        this.deleteUser(id);
                    }
                });
            });

            document.querySelectorAll('.activate-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    const user = this.users.find(u => u.id == id);
                    if (user) {
                        this.toggleUserStatus(id, user.active);
                    }
                });
            });
        }

        setupEventListeners() {
            document.getElementById('addUserBtn')?.addEventListener('click', () => this.openAddModal());
            document.getElementById('userForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveUser();
            });
            document.getElementById('closeUserModal')?.addEventListener('click', () => this.closeModal());
            document.getElementById('closeUserDetailsModal')?.addEventListener('click', () => this.closeDetailsModal());
            document.getElementById('cancelUserBtn')?.addEventListener('click', () => this.closeModal());
            document.getElementById('userSearch')?.addEventListener('input', () => this.filterUsers());
            document.getElementById('roleFilter')?.addEventListener('change', () => this.filterUsers());
            document.getElementById('statusFilter')?.addEventListener('change', () => this.filterUsers());
        }

        openAddModal() {
            this.currentEditId = null;
            document.getElementById('userForm').reset();
            const pwd = document.getElementById('password');
            if (pwd) pwd.required = true;
            const hint = document.getElementById('passwordHint');
            if (hint) hint.textContent = '*';

            document.getElementById('userModalTitle').textContent = 'Add New User';
            document.getElementById('userModal').classList.remove('hidden');
            document.getElementById('userModal').classList.add('flex');
        }

        openEditModal(user) {
            this.currentEditId = user.id;
            document.getElementById('username').value = user.username;
            document.getElementById('email').value = user.email;
            document.getElementById('firstName').value = user.firstName || '';
            document.getElementById('lastName').value = user.lastName || '';
            document.getElementById('userRole').value = user.role;
            document.getElementById('department').value = user.department || '';
            document.getElementById('userActive').checked = user.active;

            const pwd = document.getElementById('password');
            if (pwd) pwd.required = false;
            const hint = document.getElementById('passwordHint');
            if (hint) hint.textContent = '(Leave blank to keep current)';

            document.getElementById('userModalTitle').textContent = 'Edit User';
            document.getElementById('userModal').classList.remove('hidden');
            document.getElementById('userModal').classList.add('flex');
        }

        async saveUser() {
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password && password !== confirmPassword) {
                this.showAlert('Passwords do not match', 'error');
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

            if (password) {
                formData.password = password;
            }

            try {
                const method = this.currentEditId ? 'PUT' : 'POST';
                const url = this.currentEditId
                    ? `${window.API_BASE_URL}/users/${this.currentEditId}`
                    : `${window.API_BASE_URL}/users`;

                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify(formData)
                });

                if (response.ok) {
                    this.showAlert('User saved successfully', 'success');
                    this.closeModal();
                    this.loadUsers();
                } else {
                    const error = await response.json();
                    this.showAlert(error.message || 'Failed to save user', 'error');
                }
            } catch (error) {
                this.showAlert('Error: ' + error.message, 'error');
            }
        }

        async deleteUser(id) {
            try {
                const response = await fetch(`${window.API_BASE_URL}/users/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
                });

                if (response.ok) {
                    this.showAlert('User deleted successfully', 'success');
                    this.loadUsers();
                } else {
                    this.showAlert('Failed to delete user', 'error');
                }
            } catch (error) {
                this.showAlert('Error: ' + error.message, 'error');
            }
        }

        async toggleUserStatus(id, currentStatus) {
            try {
                const response = await fetch(`${window.API_BASE_URL}/users/${id}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify({ active: !currentStatus })
                });

                if (response.ok) {
                    this.showAlert(`User ${!currentStatus ? 'activated' : 'deactivated'}`, 'success');
                    this.loadUsers();
                }
            } catch (error) {
                this.showAlert('Error: ' + error.message, 'error');
            }
        }

        viewUserDetails(user) {
            const content = document.getElementById('userDetailsContent');
            content.innerHTML = `
                <div class="space-y-4">
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-700 mb-2">Personal Information</h4>
                        <div class="grid grid-cols-2 gap-2 text-sm">
                            <p><span class="text-gray-500">Username:</span> <span class="font-medium">${user.username}</span></p>
                            <p><span class="text-gray-500">Email:</span> <span class="font-medium">${user.email}</span></p>
                            <p><span class="text-gray-500">Name:</span> <span class="font-medium">${user.firstName} ${user.lastName || ''}</span></p>
                            <p><span class="text-gray-500">Department:</span> <span class="font-medium">${user.department || 'N/A'}</span></p>
                        </div>
                    </div>
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-700 mb-2">System Information</h4>
                        <div class="grid grid-cols-2 gap-2 text-sm">
                            <p><span class="text-gray-500">Role:</span> <span class="font-medium">${user.role}</span></p>
                            <p><span class="text-gray-500">Status:</span> <span class="px-2 py-0.5 rounded text-xs font-semibold ${user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${user.active ? 'Active' : 'Inactive'}</span></p>
                            <p><span class="text-gray-500">Created:</span> <span class="font-medium">${new Date(user.createdAt || Date.now()).toLocaleDateString()}</span></p>
                            <p><span class="text-gray-500">Last Login:</span> <span class="font-medium">${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</span></p>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('userDetailsModal').classList.remove('hidden');
            document.getElementById('userDetailsModal').classList.add('flex');
        }

        filterUsers() {
            const search = document.getElementById('userSearch').value.toLowerCase();
            const roleFilter = document.getElementById('roleFilter').value;
            const statusFilter = document.getElementById('statusFilter').value;

            const filtered = this.users.filter(user => {
                const matchesSearch = user.username.toLowerCase().includes(search) ||
                    user.email.toLowerCase().includes(search);
                const matchesRole = !roleFilter || user.role === roleFilter;
                const matchesStatus = !statusFilter || (statusFilter === 'ACTIVE' ? user.active : !user.active);
                return matchesSearch && matchesRole && matchesStatus;
            });

            const tbody = document.getElementById('usersTableBody');
            if (!tbody) return;

            tbody.innerHTML = filtered.map(user => `
                <tr class="border-b border-gray-50 hover:bg-gray-50">
                    <td class="p-3">${user.username}</td>
                    <td class="p-3">${user.email}</td>
                    <td class="p-3"><span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">${user.role}</span></td>
                    <td class="p-3">${user.department || '-'}</td>
                    <td class="p-3">${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
                    <td class="p-3"><span class="px-2 py-1 rounded text-xs font-semibold ${user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${user.active ? 'Active' : 'Inactive'}</span></td>
                    <td class="p-3">
                        <div class="flex gap-2">
                            <button class="text-blue-600 hover:text-blue-800 edit-btn" data-id="${user.id}">Edit</button>
                            <button class="text-gray-600 hover:text-gray-800 view-btn" data-id="${user.id}">View</button>
                            <button class="${user.active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'} activate-btn" data-id="${user.id}">
                                ${user.active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button class="text-red-600 hover:text-red-800 delete-btn" data-id="${user.id}">Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');

            this.attachRowHandlers();
        }

        closeModal() {
            document.getElementById('userModal').classList.add('hidden');
            document.getElementById('userModal').classList.remove('flex');
            this.currentEditId = null;
        }

        closeDetailsModal() {
            document.getElementById('userDetailsModal').classList.add('hidden');
            document.getElementById('userDetailsModal').classList.remove('flex');
        }

        showAlert(message, type = 'info') {
            const alertDiv = document.createElement('div');
            alertDiv.className = `fixed top-5 right-5 px-6 py-3 rounded shadow-lg z-50 text-white ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`;
            alertDiv.textContent = message;
            document.body.appendChild(alertDiv);
            setTimeout(() => alertDiv.remove(), 3000);
        }
    }

    window.initializeUsers = function () {
        console.log('Initializing Users Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getUsersTemplate();
            new UserManagementPage();
        }
    };
})();
