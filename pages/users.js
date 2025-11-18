/**
 * User Management - Screen
 * Manage application users, roles, and permissions
 * Integrated with Redux for state management
 */

const API_BASE_URL = 'http://localhost:8080/api';

class UserManagementPage {
    constructor() {
        this.users = [];
        this.currentEditId = null;
        this.currentUser = this.getCurrentUserFromStore();
        this.initializePage();
    }

    /**
     * Get current logged-in user from Redux store or localStorage
     */
    getCurrentUserFromStore() {
        // Try Redux store first
        if (window.store && window.store.getState) {
            const state = window.store.getState();
            if (state && state.user && state.user.currentUser) {
                return state.user.currentUser;
            }
        }

        // Fall back to localStorage
        const userStr = localStorage.getItem('currentUser');
        return userStr ? JSON.parse(userStr) : null;
    }

    initializePage() {
        this.loadUsers();
        this.setupEventListeners();
        this.displayCurrentUserInfo();
    }

    /**
     * Display current logged-in user information
     */
    displayCurrentUserInfo() {
        if (!this.currentUser) return;

        const pageTitle = document.querySelector('#page-title');
        if (pageTitle) {
            pageTitle.textContent = `User Management - Logged in as: ${this.currentUser.firstName} ${this.currentUser.lastName}`;
        }
    }

    async loadUsers() {
        try {
            const response = await fetch(`${API_BASE_URL}/users`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            
            if (response.ok) {
                this.users = await response.json();
                this.renderTable();
            } else {
                this.showAlert('Failed to load users', 'error');
            }
        } catch (error) {
            this.showAlert('Error: ' + error.message, 'error');
        }
    }

    renderTable() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.users.map(user => `
            <tr>
                <td>${user.username || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td><span class="badge">${user.role || 'USER'}</span></td>
                <td>${user.department || '-'}</td>
                <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
                <td><span class="status-badge ${user.active ? 'active' : 'inactive'}">${user.active ? 'Active' : 'Inactive'}</span></td>
                <td class="actions">
                    <button class="btn btn-small edit-btn" data-id="${user.id}">Edit</button>
                    <button class="btn btn-small view-btn" data-id="${user.id}">View</button>
                    <button class="btn btn-small ${user.active ? 'deactivate-btn' : 'activate-btn'}" data-id="${user.id}">
                        ${user.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="btn btn-small delete-btn" data-id="${user.id}">Delete</button>
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

        document.querySelectorAll('.activate-btn, .deactivate-btn').forEach(btn => {
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
        document.getElementById('password').required = true;
        document.getElementById('passwordHint').textContent = '*';
        document.getElementById('userModalTitle').textContent = 'Add New User';
        document.getElementById('userModal').classList.add('active');
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
        document.getElementById('password').required = false;
        document.getElementById('passwordHint').textContent = '(Leave blank to keep current)';
        document.getElementById('userModalTitle').textContent = 'Edit User';
        document.getElementById('userModal').classList.add('active');
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
                ? `${API_BASE_URL}/users/${this.currentEditId}`
                : `${API_BASE_URL}/users`;

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
            const response = await fetch(`${API_BASE_URL}/users/${id}`, {
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
            const response = await fetch(`${API_BASE_URL}/users/${id}/status`, {
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
            <div class="details-section">
                <h4>Personal Information</h4>
                <p><strong>Username:</strong> ${user.username}</p>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Name:</strong> ${user.firstName} ${user.lastName || ''}</p>
                <p><strong>Department:</strong> ${user.department || 'N/A'}</p>
            </div>
            <div class="details-section">
                <h4>System Information</h4>
                <p><strong>Role:</strong> ${user.role}</p>
                <p><strong>Status:</strong> <span class="status-badge ${user.active ? 'active' : 'inactive'}">${user.active ? 'Active' : 'Inactive'}</span></p>
                <p><strong>Created:</strong> ${new Date(user.createdAt).toLocaleDateString()}</p>
                <p><strong>Last Login:</strong> ${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</p>
                <p><strong>Last Password Change:</strong> ${user.lastPasswordChange ? new Date(user.lastPasswordChange).toLocaleDateString() : 'Never'}</p>
            </div>
        `;
        document.getElementById('userDetailsModal').classList.add('active');
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

        document.getElementById('usersTableBody').innerHTML = filtered.map(user => `
            <tr>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td><span class="badge">${user.role}</span></td>
                <td>${user.department || '-'}</td>
                <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
                <td><span class="status-badge ${user.active ? 'active' : 'inactive'}">${user.active ? 'Active' : 'Inactive'}</span></td>
                <td class="actions">
                    <button class="btn btn-small edit-btn" data-id="${user.id}">Edit</button>
                    <button class="btn btn-small view-btn" data-id="${user.id}">View</button>
                    <button class="btn btn-small ${user.active ? 'deactivate-btn' : 'activate-btn'}" data-id="${user.id}">
                        ${user.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="btn btn-small delete-btn" data-id="${user.id}">Delete</button>
                </td>
            </tr>
        `).join('');

        this.attachRowHandlers();
    }

    closeModal() {
        document.getElementById('userModal').classList.remove('active');
        this.currentEditId = null;
    }

    closeDetailsModal() {
        document.getElementById('userDetailsModal').classList.remove('active');
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        alertDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 15px 20px; border-radius: 4px; z-index: 1000; min-width: 300px;';
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 3000);
    }
}

let userManagementPage;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        userManagementPage = new UserManagementPage();
    });
} else {
    userManagementPage = new UserManagementPage();
}
