(function () {
    // 🛑 The Admin panel is for SaaS Operators, not Tenant Admins.
    const ADMIN_ROLES = ['SUPER_ADMIN'];

    function currentUserIsAdmin() {
        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
            return user.role && ADMIN_ROLES.includes((user.role || '').toUpperCase());
        } catch (_) { return false; }
    }

    function authHeaders() {
        return window.authService ? window.authService.getHeaders() : {};
    }

    // ─── Template ─────────────────────────────────────────────────────────────

    function getTemplate() {
        return `
        <div style="display:flex; flex-direction:column; gap:var(--ds-space-6); width:100%;">

            <!-- Stats row -->
            <div id="adminStatsRow" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:var(--ds-space-4);">
                ${['Total Users','Trial','Active','Expired'].map(label => `
                <div style="background:var(--ds-bg-surface); border:1px solid var(--ds-border-default); border-radius:var(--ds-radius-xl); padding:var(--ds-space-4);">
                    <div style="font-size:var(--ds-text-xs); color:var(--ds-text-tertiary); font-weight:600; text-transform:uppercase; margin-bottom:4px;">${label}</div>
                    <div id="adminStat${label.replace(' ','')}" style="font-size:var(--ds-text-2xl); font-weight:700; color:var(--ds-text-primary);">—</div>
                </div>`).join('')}
            </div>

            <!-- Search + filter bar -->
            <div style="display:flex; gap:var(--ds-space-3); background:var(--ds-bg-surface-sunken); padding:var(--ds-space-4); border-radius:var(--ds-radius-2xl); border:1px solid var(--ds-border-default);">
                <input id="adminSearch" type="text" placeholder="Search by name, email, licence…"
                    style="flex:1; background:var(--ds-bg-surface); border:1px solid var(--ds-border-default); border-radius:var(--ds-radius-lg); padding:8px 12px; font-size:var(--ds-text-sm); color:var(--ds-text-primary); outline:none;">
                <select id="adminStatusFilter"
                    style="background:var(--ds-bg-surface); border:1px solid var(--ds-border-default); border-radius:var(--ds-radius-lg); padding:8px 12px; font-size:var(--ds-text-sm); color:var(--ds-text-primary);">
                    <option value="">All Status</option>
                    <option value="TRIAL">Trial</option>
                    <option value="ACTIVE">Active</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="NONE">No Subscription</option>
                </select>
            </div>

            <!-- User table -->
            <div style="background:var(--ds-bg-surface); border:1px solid var(--ds-border-default); border-radius:var(--ds-radius-xl); overflow:hidden;">
                <div style="overflow-x:auto;">
                    <table id="adminUserTable" style="width:100%; border-collapse:collapse; text-align:left;">
                        <thead>
                            <tr style="background:var(--ds-bg-surface-sunken); border-bottom:1px solid var(--ds-border-default);">
                                <th style="padding:12px 16px; font-size:var(--ds-text-xs); font-weight:700; color:var(--ds-text-tertiary); text-transform:uppercase;">User</th>
                                <th style="padding:12px 16px; font-size:var(--ds-text-xs); font-weight:700; color:var(--ds-text-tertiary); text-transform:uppercase;">Licence</th>
                                <th style="padding:12px 16px; font-size:var(--ds-text-xs); font-weight:700; color:var(--ds-text-tertiary); text-transform:uppercase;">Plan</th>
                                <th style="padding:12px 16px; font-size:var(--ds-text-xs); font-weight:700; color:var(--ds-text-tertiary); text-transform:uppercase;">Status</th>
                                <th style="padding:12px 16px; font-size:var(--ds-text-xs); font-weight:700; color:var(--ds-text-tertiary); text-transform:uppercase;">Trial Ends</th>
                                <th style="padding:12px 16px; font-size:var(--ds-text-xs); font-weight:700; color:var(--ds-text-tertiary); text-transform:uppercase;">Days Left</th>
                                <th style="padding:12px 16px; font-size:var(--ds-text-xs); font-weight:700; color:var(--ds-text-tertiary); text-transform:uppercase;">Joined</th>
                                <th style="padding:12px 16px; font-size:var(--ds-text-xs); font-weight:700; color:var(--ds-text-tertiary); text-transform:uppercase;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="adminUserTableBody">
                            <tr><td colspan="8" style="padding:40px; text-align:center; color:var(--ds-text-tertiary);">Loading users…</td></tr>
                        </tbody>
                    </table>
                </div>
                <div id="adminPagination" style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-top:1px solid var(--ds-border-default);">
                    <span id="adminPageInfo" style="font-size:var(--ds-text-sm); color:var(--ds-text-tertiary);"></span>
                    <div style="display:flex; gap:8px;">
                        <button id="adminPrevBtn" onclick="window._adminPrevPage()" style="padding:6px 14px; border:1px solid var(--ds-border-default); border-radius:var(--ds-radius-lg); background:var(--ds-bg-surface); color:var(--ds-text-primary); cursor:pointer; font-size:var(--ds-text-sm);">Previous</button>
                        <button id="adminNextBtn" onclick="window._adminNextPage()" style="padding:6px 14px; border:1px solid var(--ds-border-default); border-radius:var(--ds-radius-lg); background:var(--ds-bg-surface); color:var(--ds-text-primary); cursor:pointer; font-size:var(--ds-text-sm);">Next</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Extend Trial Modal -->
        <div id="extendTrialModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:1000; align-items:center; justify-content:center;">
            <div style="background:var(--ds-bg-surface); border-radius:var(--ds-radius-2xl); padding:var(--ds-space-8); width:380px; box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <h3 style="font-size:var(--ds-text-lg); font-weight:700; color:var(--ds-text-primary); margin:0 0 4px;">Extend Trial</h3>
                <p id="extendTrialUserName" style="font-size:var(--ds-text-sm); color:var(--ds-text-tertiary); margin:0 0 20px;"></p>
                <label style="display:block; font-size:var(--ds-text-sm); font-weight:600; color:var(--ds-text-secondary); margin-bottom:6px;">Extension Days</label>
                <input id="extendDaysInput" type="number" min="1" max="365" value="7"
                    style="width:100%; box-sizing:border-box; padding:10px 12px; border:1px solid var(--ds-border-default); border-radius:var(--ds-radius-lg); font-size:var(--ds-text-sm); color:var(--ds-text-primary); background:var(--ds-bg-surface); margin-bottom:20px; outline:none;">
                <div style="display:flex; gap:12px;">
                    <button onclick="window._adminCloseExtendModal()" style="flex:1; padding:10px; border:1px solid var(--ds-border-default); border-radius:var(--ds-radius-lg); background:transparent; color:var(--ds-text-primary); cursor:pointer; font-size:var(--ds-text-sm);">Cancel</button>
                    <button id="extendTrialConfirmBtn" onclick="window._adminConfirmExtend()" style="flex:1; padding:10px; border:none; border-radius:var(--ds-radius-lg); background:var(--ds-primary-600,#4f46e5); color:#fff; cursor:pointer; font-size:var(--ds-text-sm); font-weight:600;">Extend Trial</button>
                </div>
            </div>
        </div>
        `;
    }

    // ─── State ────────────────────────────────────────────────────────────────

    let allUsers = [];
    let filteredUsers = [];
    let currentPage = 0;
    const PAGE_SIZE = 15;
    let extendTargetUserId = null;

    // ─── Data loading ─────────────────────────────────────────────────────────

    async function loadStats() {
        try {
            const resp = await fetch(window.apiConfig.getUrl('/admin/users/stats'), { headers: authHeaders() });
            if (!resp.ok) return;
            const result = await resp.json();
            const data = result.data || {};
            const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val ?? '—'; };
            set('adminStatTotalUsers', data.total);
            set('adminStatTrial', data.trial);
            set('adminStatActive', data.active);
            set('adminStatExpired', data.expired);
        } catch (_) {}
    }

    async function loadUsers() {
        try {
            const resp = await fetch(window.apiConfig.getUrl('/admin/users?size=1000'), { headers: authHeaders() });
            if (!resp.ok) return;
            const result = await resp.json();
            const data = result.data || {};
            allUsers = data.users || [];
            applyFilter();
        } catch (_) {
            const tbody = document.getElementById('adminUserTableBody');
            if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="padding:40px; text-align:center; color:#ef4444;">Failed to load users.</td></tr>';
        }
    }

    function applyFilter() {
        const search = (document.getElementById('adminSearch')?.value || '').toLowerCase();
        const status = document.getElementById('adminStatusFilter')?.value || '';
        filteredUsers = allUsers.filter(u => {
            const matchSearch = !search ||
                (u.fullName || '').toLowerCase().includes(search) ||
                (u.email || '').toLowerCase().includes(search) ||
                (u.username || '').toLowerCase().includes(search) ||
                String(u.licenceNo || '').includes(search);
            const matchStatus = !status || (u.subscriptionStatus || 'NONE') === status;
            return matchSearch && matchStatus;
        });
        currentPage = 0;
        renderTable();
    }

    // ─── Rendering ────────────────────────────────────────────────────────────

    function renderTable() {
        const tbody = document.getElementById('adminUserTableBody');
        const pageInfo = document.getElementById('adminPageInfo');
        const prevBtn = document.getElementById('adminPrevBtn');
        const nextBtn = document.getElementById('adminNextBtn');
        if (!tbody) return;

        const from = currentPage * PAGE_SIZE;
        const to = Math.min(from + PAGE_SIZE, filteredUsers.length);
        const page = filteredUsers.slice(from, to);

        if (page.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="padding:40px; text-align:center; color:var(--ds-text-tertiary);">No users found.</td></tr>';
        } else {
            tbody.innerHTML = page.map(u => renderRow(u)).join('');
        }

        if (pageInfo) pageInfo.textContent = `Showing ${from + 1}–${to} of ${filteredUsers.length}`;
        if (prevBtn) prevBtn.disabled = currentPage === 0;
        if (nextBtn) nextBtn.disabled = to >= filteredUsers.length;
    }

    function renderRow(u) {
        const status = u.subscriptionStatus || 'NONE';
        const statusColor = { TRIAL:'#92400e', ACTIVE:'#065f46', EXPIRED:'#991b1b', CANCELLED:'#6b7280', NONE:'#6b7280' }[status] || '#6b7280';
        const statusBg   = { TRIAL:'rgba(245,158,11,0.12)', ACTIVE:'rgba(16,185,129,0.12)', EXPIRED:'rgba(239,68,68,0.12)', CANCELLED:'rgba(107,114,128,0.12)', NONE:'rgba(107,114,128,0.12)' }[status] || 'rgba(107,114,128,0.12)';
        const isActive = (u.isActive || 'Y').toUpperCase() === 'Y';

        const trialEnd = formatDate(u.trialEndDate);
        const daysLeft = u.daysRemaining != null ? u.daysRemaining : '—';
        const daysColor = (typeof daysLeft === 'number' && daysLeft <= 3) ? '#ef4444' : (typeof daysLeft === 'number' && daysLeft <= 7) ? '#f59e0b' : 'var(--ds-text-primary)';

        return `<tr style="border-bottom:1px solid var(--ds-border-default); ${isActive ? '' : 'opacity:0.5;'}">
            <td style="padding:12px 16px;">
                <div style="font-size:var(--ds-text-sm); font-weight:600; color:var(--ds-text-primary);">${esc(u.fullName || u.username || '—')}</div>
                <div style="font-size:var(--ds-text-xs); color:var(--ds-text-tertiary);">${esc(u.email || '')}</div>
            </td>
            <td style="padding:12px 16px; font-size:var(--ds-text-sm); color:var(--ds-text-secondary); font-family:var(--ds-font-mono);">${u.licenceNo || '—'}</td>
            <td style="padding:12px 16px; font-size:var(--ds-text-sm); color:var(--ds-text-secondary);">${esc(u.planName || '—')}</td>
            <td style="padding:12px 16px;">
                <span style="display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:999px; background:${statusBg}; color:${statusColor}; font-size:11px; font-weight:600;">
                    ${status}
                </span>
            </td>
            <td style="padding:12px 16px; font-size:var(--ds-text-sm); color:var(--ds-text-secondary);">${trialEnd}</td>
            <td style="padding:12px 16px; font-size:var(--ds-text-sm); font-weight:600; color:${daysColor};">${typeof daysLeft === 'number' ? daysLeft + ' day' + (daysLeft !== 1 ? 's' : '') : '—'}</td>
            <td style="padding:12px 16px; font-size:var(--ds-text-sm); color:var(--ds-text-tertiary);">${formatDate(u.createdAt)}</td>
            <td style="padding:12px 16px;">
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button onclick="window._adminOpenExtendModal(${u.userId}, '${esc(u.fullName || u.email || '')}')"
                        style="padding:4px 10px; border:1px solid var(--ds-primary-500,#6366f1); border-radius:var(--ds-radius-lg); background:transparent; color:var(--ds-primary-600,#4f46e5); cursor:pointer; font-size:12px; white-space:nowrap;">
                        Extend Trial
                    </button>
                    <button onclick="window._adminToggleUser(${u.userId})"
                        style="padding:4px 10px; border:1px solid var(--ds-border-default); border-radius:var(--ds-radius-lg); background:transparent; color:${isActive ? '#ef4444' : '#10b981'}; cursor:pointer; font-size:12px; white-space:nowrap;">
                        ${isActive ? 'Disable' : 'Enable'}
                    </button>
                </div>
            </td>
        </tr>`;
    }

    // ─── Actions ──────────────────────────────────────────────────────────────

    window._adminOpenExtendModal = function(userId, userName) {
        extendTargetUserId = userId;
        const modal = document.getElementById('extendTrialModal');
        const nameEl = document.getElementById('extendTrialUserName');
        if (nameEl) nameEl.textContent = userName;
        if (modal) modal.style.display = 'flex';
        const inp = document.getElementById('extendDaysInput');
        if (inp) { inp.value = 7; inp.focus(); }
    };

    window._adminCloseExtendModal = function() {
        const modal = document.getElementById('extendTrialModal');
        if (modal) modal.style.display = 'none';
        extendTargetUserId = null;
    };

    window._adminConfirmExtend = async function() {
        if (!extendTargetUserId) return;
        const days = parseInt(document.getElementById('extendDaysInput')?.value || '7', 10);
        if (isNaN(days) || days < 1) {
            if (window.notificationService) window.notificationService.error('Enter a valid number of days.');
            return;
        }
        const btn = document.getElementById('extendTrialConfirmBtn');
        if (btn) btn.disabled = true;

        try {
            const resp = await fetch(window.apiConfig.getUrl(`/admin/users/${extendTargetUserId}/trial`), {
                method: 'PUT',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ extensionDays: days })
            });
            const result = await resp.json();
            if (resp.ok) {
                if (window.notificationService) window.notificationService.success(`Trial extended by ${days} day${days !== 1 ? 's' : ''}.`);
                window._adminCloseExtendModal();
                // Update the local user list row
                const updated = result.data;
                if (updated) {
                    const idx = allUsers.findIndex(u => u.userId === extendTargetUserId);
                    if (idx !== -1) allUsers[idx] = updated;
                    applyFilter();
                }
                await loadStats();
            } else {
                if (window.notificationService) window.notificationService.error(result.message || 'Failed to extend trial.');
            }
        } catch (e) {
            if (window.notificationService) window.notificationService.error('Network error. Please try again.');
        } finally {
            if (btn) btn.disabled = false;
        }
    };

    window._adminToggleUser = async function(userId) {
        try {
            const resp = await fetch(window.apiConfig.getUrl(`/admin/users/${userId}/toggle`), {
                method: 'PUT',
                headers: authHeaders()
            });
            const result = await resp.json();
            if (resp.ok) {
                const updated = result.data;
                if (updated) {
                    const idx = allUsers.findIndex(u => u.userId === userId);
                    if (idx !== -1) allUsers[idx] = updated;
                    applyFilter();
                }
                if (window.notificationService) window.notificationService.success('User status updated.');
            } else {
                if (window.notificationService) window.notificationService.error(result.message || 'Failed to update user.');
            }
        } catch (_) {
            if (window.notificationService) window.notificationService.error('Network error.');
        }
    };

    window._adminPrevPage = function() { if (currentPage > 0) { currentPage--; renderTable(); } };
    window._adminNextPage = function() { if ((currentPage + 1) * PAGE_SIZE < filteredUsers.length) { currentPage++; renderTable(); } };

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function formatDate(raw) {
        if (!raw) return '—';
        try {
            let d;
            if (Array.isArray(raw)) {
                const [y, mo, day] = raw;
                d = new Date(y, mo - 1, day);
            } else {
                d = new Date(raw);
            }
            if (isNaN(d)) return '—';
            return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (_) { return '—'; }
    }

    function esc(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ─── Event listeners ──────────────────────────────────────────────────────

    function setupEventListeners() {
        let searchTimer;
        const searchEl = document.getElementById('adminSearch');
        if (searchEl) {
            searchEl.addEventListener('input', () => {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(applyFilter, 250);
            });
        }

        const filterEl = document.getElementById('adminStatusFilter');
        if (filterEl) filterEl.addEventListener('change', applyFilter);

        // Close modal on backdrop click
        const modal = document.getElementById('extendTrialModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) window._adminCloseExtendModal();
            });
        }

        // Enter key in days input triggers confirm
        const daysInput = document.getElementById('extendDaysInput');
        if (daysInput) {
            daysInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') window._adminConfirmExtend(); });
        }
    }

    // ─── Entry point ──────────────────────────────────────────────────────────

    window.initializeAdmin = async function () {
        const content = document.getElementById('page-content');
        if (!content) return;

        if (!currentUserIsAdmin()) {
            content.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:center; height:400px;">
                <div style="text-align:center;">
                    <i class="fas fa-lock" style="font-size:48px; color:var(--ds-text-tertiary); margin-bottom:16px;"></i>
                    <div style="font-size:var(--ds-text-xl); font-weight:700; color:var(--ds-text-primary); margin-bottom:8px;">Access Denied</div>
                    <div style="font-size:var(--ds-text-sm); color:var(--ds-text-tertiary);">You need admin privileges to view this page.</div>
                </div>
            </div>`;
            return;
        }

        content.innerHTML = window.Layout.page({
            title: 'Admin Panel',
            subtitle: 'Manage users, subscriptions, and trial extensions',
            content: getTemplate()
        });

        setupEventListeners();
        await Promise.all([loadStats(), loadUsers()]);
    };
})();
