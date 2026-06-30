(function () {
    const getSupportTemplate = () => `
        <style>
            .support-card {
                padding: var(--ds-space-5);
                border-radius: var(--ds-radius-lg);
                border: 1px solid var(--ds-border-default);
                color: var(--ds-text-primary);
                background: var(--ds-bg-surface);
                transition: all var(--ds-duration-base) var(--ds-ease);
            }
            .support-card:hover {
                border-color: var(--ds-primary-400, #818cf8);
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.04);
            }
        </style>

        <div style="padding: var(--ds-space-6); width: 100%; box-sizing: border-box;">
            <div style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-xl); box-shadow: var(--ds-shadow-sm); overflow: hidden; border: 1px solid var(--ds-border-default);">
                <div style="padding: var(--ds-space-5) var(--ds-space-6); border-bottom: 1px solid var(--ds-border-default);">
                    <h2 style="font-size: var(--ds-text-3xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-1);">Support</h2>
                    <p style="color: var(--ds-text-secondary); font-size: var(--ds-text-md);">Get help from our support team</p>
                </div>

                <div style="padding: var(--ds-space-6);">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--ds-space-4); margin-bottom: var(--ds-space-6);">
                        <div class="support-card">
                            <div style="font-size: var(--ds-text-3xl); margin-bottom: var(--ds-space-3); color: var(--ds-primary-500);"><i class="fas fa-phone-alt"></i></div>
                            <div style="font-size: var(--ds-text-base); color: var(--ds-text-tertiary); margin-bottom: var(--ds-space-1); font-weight: var(--ds-weight-semibold);">Call Us</div>
                            <div id="supportPhone" style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold);">Loading...</div>
                        </div>

                        <div class="support-card">
                            <div style="font-size: var(--ds-text-3xl); margin-bottom: var(--ds-space-3); color: var(--ds-primary-500);"><i class="fas fa-envelope"></i></div>
                            <div style="font-size: var(--ds-text-base); color: var(--ds-text-tertiary); margin-bottom: var(--ds-space-1); font-weight: var(--ds-weight-semibold);">Email Us</div>
                            <div id="supportEmail" style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold);">Loading...</div>
                        </div>

                        <div id="supportWhatsappCard" class="support-card" style="cursor: pointer;">
                            <div style="font-size: var(--ds-text-3xl); margin-bottom: var(--ds-space-3); color: #25D366;"><i class="fab fa-whatsapp"></i></div>
                            <div style="font-size: var(--ds-text-base); color: var(--ds-text-tertiary); margin-bottom: var(--ds-space-1); font-weight: var(--ds-weight-semibold);">WhatsApp</div>
                            <div style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold);">Chat with Us</div>
                        </div>
                    </div>

                    <!-- Send Message Form -->
                    <div style="background: var(--ds-bg-surface-sunken); padding: var(--ds-space-6); border-radius: var(--ds-radius-lg);">
                        <h3 style="font-size: var(--ds-text-xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-4);">Send us a message</h3>
                        <div id="supportFormStatus" style="display: none; padding: var(--ds-space-3) var(--ds-space-4); border-radius: var(--ds-radius-md); margin-bottom: var(--ds-space-4); font-size: var(--ds-text-sm);"></div>
                        <form id="supportForm">
                            <div style="margin-bottom: var(--ds-space-4);">
                                <label style="display: block; font-size: var(--ds-text-sm); font-weight: var(--ds-weight-semibold); color: var(--ds-text-secondary); margin-bottom: var(--ds-space-2);">Subject</label>
                                <input type="text" id="supportSubject" class="ds-input" style="width: 100%;" placeholder="How can we help?" required>
                            </div>

                            <div style="margin-bottom: var(--ds-space-4);">
                                <label style="display: block; font-size: var(--ds-text-sm); font-weight: var(--ds-weight-semibold); color: var(--ds-text-secondary); margin-bottom: var(--ds-space-2);">Message</label>
                                <textarea id="supportMessage" class="ds-input" style="width: 100%; min-height: 120px; resize: vertical;" placeholder="Describe your issue..." required></textarea>
                            </div>

                            <button type="submit" id="supportSubmitBtn" class="ds-btn ds-btn-primary">
                                <i class="fas fa-paper-plane"></i> Send Request
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;

    window.initializeSupport = async function () {
        console.log('Initializing Support Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getSupportTemplate();
            setupEventListeners();
            maybeLoadPartnerSection();
            
            try {
                const res = await window.publicApiService.get('/config/support');
                const config = (res.success && res.data) ? res.data : res;
                if (config) {
                    const phoneEl = document.getElementById('supportPhone');
                    const emailEl = document.getElementById('supportEmail');
                    const whatsappCard = document.getElementById('supportWhatsappCard');
                    
                    if (phoneEl && config.phone) phoneEl.textContent = config.phone;
                    if (emailEl && config.email) emailEl.textContent = config.email;
                    if (whatsappCard && config.whatsapp) {
                        const link = `https://wa.me/${config.whatsapp}`;
                        whatsappCard.onclick = () => {
                            (window.electronAPI && window.electronAPI.openExternalUrl) ? window.electronAPI.openExternalUrl(link) : window.open(link, '_blank');
                        };
                    }
                }
            } catch (e) {
                console.error('Failed to load support config:', e);
                // Fallbacks if backend fails
                const phoneEl = document.getElementById('supportPhone');
                const emailEl = document.getElementById('supportEmail');
                if (phoneEl) phoneEl.textContent = '+1 (555) 123-4567';
                if (emailEl) emailEl.textContent = 'support@talliffy.com';
            }
        }
    };

    function setupEventListeners() {
        const form = document.getElementById('supportForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                handleSubmitTicket();
            });
        }
    }

    async function handleSubmitTicket() {
        const subject = document.getElementById('supportSubject')?.value.trim();
        const message = document.getElementById('supportMessage')?.value.trim();
        const submitBtn = document.getElementById('supportSubmitBtn');
        const statusEl = document.getElementById('supportFormStatus');

        if (!subject || !message) {
            showFormStatus(statusEl, 'Please fill in both subject and message.', 'error');
            return;
        }

        const authToken = ((window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function') ? window.electronAPI.secureStoreGet('authToken') : localStorage.getItem('authToken'));
        if (!authToken || !window.apiConfig) {
            showFormStatus(statusEl, 'Not authenticated. Please login again.', 'error');
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        }

        const deviceToken = ((window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function') ? window.electronAPI.secureStoreGet('deviceToken') : localStorage.getItem('deviceToken'));

        try {
            const response = await fetch(window.apiConfig.getUrl('/support/tickets'), {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + authToken,
                    'X-Device-Token': deviceToken || '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ subject, message })
            });

            const result = await response.json();

            if (response.ok && result.success !== false) {
                showFormStatus(statusEl, 'Message sent successfully! We will get back to you soon.', 'success');
                document.getElementById('supportForm').reset();
            } else {
                showFormStatus(statusEl, result.message || 'Failed to send message. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Support message submit error:', error);
            showFormStatus(statusEl, 'Connection error. Please check your internet and try again.', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Request';
            }
        }
    }

    // ── Partner Information section (shown only when user role is PARTNER) ──────

    async function maybeLoadPartnerSection() {
        const authToken = ((window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function') ? window.electronAPI.secureStoreGet('authToken') : localStorage.getItem('authToken'));
        const deviceToken = ((window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function') ? window.electronAPI.secureStoreGet('deviceToken') : localStorage.getItem('deviceToken'));
        if (!authToken || !window.apiConfig) return;

        let role = null;
        try {
            const meRes = await fetch(window.apiConfig.getUrl('/users/me'), {
                headers: { 'Authorization': 'Bearer ' + authToken, 'X-Device-Token': deviceToken || '' }
            });
            if (meRes.ok) {
                const me = await meRes.json();
                role = (me?.data?.role || me?.role || '').toUpperCase();
            }
        } catch { return; }

        if (role !== 'PARTNER') return;

        const sendForm = document.querySelector('#supportForm')?.closest('div[style*="border-radius"]');
        if (!sendForm) return;

        const partnerSection = document.createElement('div');
        partnerSection.id = 'partnerInfoSection';
        partnerSection.style.cssText = 'margin-bottom: var(--ds-space-6);';
        partnerSection.innerHTML = getPartnerSectionHtml();
        sendForm.parentNode.insertBefore(partnerSection, sendForm);

        loadPartnerStats(authToken, deviceToken);
    }

    function getPartnerSectionHtml() {
        return `
            <div style="background: linear-gradient(135deg, rgba(139,92,246,0.06), rgba(99,102,241,0.04)); padding: var(--ds-space-6); border-radius: var(--ds-radius-lg); border: 1px solid rgba(139,92,246,0.2);">
                <div style="display: flex; align-items: center; gap: var(--ds-space-3); margin-bottom: var(--ds-space-5);">
                    <div style="width: 40px; height: 40px; border-radius: var(--ds-radius-lg); background: rgba(139,92,246,0.12); display: flex; align-items: center; justify-content: center; color: #7c3aed; font-size: var(--ds-text-lg);">
                        <i class="fas fa-handshake"></i>
                    </div>
                    <div>
                        <h3 style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin: 0;">Partner Information</h3>
                        <p style="font-size: var(--ds-text-sm); color: var(--ds-text-secondary); margin: 0;">Your referral performance</p>
                    </div>
                </div>

                <div id="partnerStatsGrid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--ds-space-3); margin-bottom: var(--ds-space-4);">
                    <div style="text-align: center; padding: var(--ds-space-3) var(--ds-space-2);">
                        <i class="fas fa-spinner fa-spin" style="color: rgba(139,92,246,0.4); font-size: var(--ds-text-2xl);"></i>
                    </div>
                </div>

                <div style="padding: var(--ds-space-3) var(--ds-space-4); background: rgba(245,243,255,0.8); border-radius: var(--ds-radius-md); border: 1px solid rgba(139,92,246,0.15); font-size: var(--ds-text-sm); color: var(--ds-text-secondary);">
                    <i class="fas fa-info-circle" style="color: #7c3aed; margin-right: 6px;"></i>
                    You can extend each referred user's trial <strong>once</strong>, by at least 7 days. Log in to the Web App to manage extensions.
                </div>
            </div>
        `;
    }

    async function loadPartnerStats(authToken, deviceToken) {
        const grid = document.getElementById('partnerStatsGrid');
        if (!grid) return;

        try {
            const res = await fetch(window.apiConfig.getUrl('/partner/me'), {
                headers: { 'Authorization': 'Bearer ' + authToken, 'X-Device-Token': deviceToken || '' }
            });
            if (!res.ok) throw new Error('Failed');
            const result = await res.json();
            const p = result?.data || {};

            const statCard = (icon, label, value, color) => `
                <div style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-lg); padding: var(--ds-space-4) var(--ds-space-3); text-align: center; border: 1px solid var(--ds-border-default); box-shadow: var(--ds-shadow-sm);">
                    <div style="font-size: var(--ds-text-xl); color: ${color}; margin-bottom: var(--ds-space-2);"><i class="${icon}"></i></div>
                    <div style="font-size: var(--ds-text-2xl); font-weight: var(--ds-weight-extrabold); color: var(--ds-text-primary); line-height: 1;">${value ?? '-'}</div>
                    <div style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary); margin-top: var(--ds-space-1); font-weight: var(--ds-weight-semibold);">${label}</div>
                </div>
            `;

            grid.innerHTML =
                statCard('fas fa-users', 'Total Referred', p.totalReferred, '#6366f1') +
                statCard('fas fa-clock', 'On Trial', p.onTrial, '#f59e0b') +
                statCard('fas fa-check-circle', 'Active Plans', p.active, '#10b981') +
                statCard('fas fa-times-circle', 'Expired', p.expired, '#ef4444');
        } catch {
            if (grid) grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--ds-text-tertiary); font-size: var(--ds-text-sm);">Could not load partner stats.</div>';
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function showFormStatus(el, message, type) {
        if (!el) return;
        el.style.display = 'block';
        el.textContent = message;
        if (type === 'success') {
            el.style.background = 'var(--ds-success-50, #dcfce7)';
            el.style.color = 'var(--ds-success-700, #15803d)';
            el.style.border = '1px solid var(--ds-success-200, #86efac)';
        } else {
            el.style.background = 'var(--ds-error-50, #fef2f2)';
            el.style.color = 'var(--ds-error-700, #b91c1c)';
            el.style.border = '1px solid var(--ds-error-200, #fecaca)';
        }
        setTimeout(() => { el.style.display = 'none'; }, 6000);
    }
})();
