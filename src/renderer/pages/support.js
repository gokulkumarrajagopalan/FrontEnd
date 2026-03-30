(function () {
    const getSupportTemplate = () => `
        <div style="padding: var(--ds-space-6); max-width: 1100px; margin: 0 auto;">
            <div style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-xl); box-shadow: var(--ds-shadow-sm); overflow: hidden; border: 1px solid var(--ds-border-default);">
                <div style="padding: var(--ds-space-5) var(--ds-space-6); border-bottom: 1px solid var(--ds-border-default);">
                    <h2 style="font-size: var(--ds-text-3xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-1);">Support</h2>
                    <p style="color: var(--ds-text-secondary); font-size: var(--ds-text-md);">Get help from our support team</p>
                </div>
                
                <div style="padding: var(--ds-space-6);">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--ds-space-4); margin-bottom: var(--ds-space-6);">
                        <div style="padding: var(--ds-space-5); border-radius: var(--ds-radius-lg); border: 1px solid var(--ds-border-default); color: var(--ds-text-primary); background: var(--ds-bg-surface); transition: all var(--ds-duration-base) var(--ds-ease);" class="support-card">
                            <div style="font-size: var(--ds-text-3xl); margin-bottom: var(--ds-space-3); color: var(--ds-primary-500);"><i class="fas fa-phone-alt"></i></div>
                            <div style="font-size: var(--ds-text-base); color: var(--ds-text-tertiary); margin-bottom: var(--ds-space-1); font-weight: var(--ds-weight-semibold);">Call Us</div>
                            <div style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold);">+1 (555) 123-4567</div>
                        </div>

                        <div style="padding: var(--ds-space-5); border-radius: var(--ds-radius-lg); border: 1px solid var(--ds-border-default); color: var(--ds-text-primary); background: var(--ds-bg-surface); transition: all var(--ds-duration-base) var(--ds-ease);" class="support-card">
                            <div style="font-size: var(--ds-text-3xl); margin-bottom: var(--ds-space-3); color: var(--ds-primary-500);"><i class="fas fa-envelope"></i></div>
                            <div style="font-size: var(--ds-text-base); color: var(--ds-text-tertiary); margin-bottom: var(--ds-space-1); font-weight: var(--ds-weight-semibold);">Email Us</div>
                            <div style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold);">support@talliffy.com</div>
                        </div>

                        <div style="padding: var(--ds-space-5); border-radius: var(--ds-radius-lg); border: 1px solid var(--ds-border-default); color: var(--ds-text-primary); background: var(--ds-bg-surface); transition: all var(--ds-duration-base) var(--ds-ease);" class="support-card">
                            <div style="font-size: var(--ds-text-3xl); margin-bottom: var(--ds-space-3); color: var(--ds-primary-500);"><i class="fas fa-comments"></i></div>
                            <div style="font-size: var(--ds-text-base); color: var(--ds-text-tertiary); margin-bottom: var(--ds-space-1); font-weight: var(--ds-weight-semibold);">Live Chat</div>
                            <div style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold);">Available 24/7</div>
                        </div>
                    </div>

                    <!-- Send Message Form -->
                    <div style="background: var(--ds-bg-surface-sunken); padding: var(--ds-space-6); border-radius: var(--ds-radius-lg); margin-bottom: var(--ds-space-6);">
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
                                <i class="fas fa-paper-plane"></i> Send Message
                            </button>
                        </form>
                    </div>

                    <!-- Ticket History -->
                    <div style="background: var(--ds-bg-surface-sunken); padding: var(--ds-space-6); border-radius: var(--ds-radius-lg);">
                        <h3 style="font-size: var(--ds-text-xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-4);"><i class="fas fa-history" style="color: var(--ds-primary-500); margin-right: var(--ds-space-2);"></i>Your Tickets</h3>
                        <div id="ticketHistoryContainer">
                            <div style="text-align: center; padding: var(--ds-space-6); color: var(--ds-text-tertiary);">
                                <i class="fas fa-spinner fa-spin"></i> Loading tickets...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    window.initializeSupport = function () {
        console.log('Initializing Support Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getSupportTemplate();
            setupEventListeners();
            loadTicketHistory();
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

        const authToken = localStorage.getItem('authToken');
        if (!authToken || !window.apiConfig) {
            showFormStatus(statusEl, 'Not authenticated. Please login again.', 'error');
            return;
        }

        // Disable button
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        }

        const deviceToken = localStorage.getItem('deviceToken');

        try {
            const response = await fetch(window.apiConfig.getUrl('/api/support/tickets'), {
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
                showFormStatus(statusEl, 'Support ticket created successfully! We will get back to you soon.', 'success');
                document.getElementById('supportForm').reset();
                loadTicketHistory();
            } else {
                showFormStatus(statusEl, result.message || 'Failed to submit ticket. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Support ticket submit error:', error);
            showFormStatus(statusEl, 'Connection error. Please check your internet and try again.', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
            }
        }
    }

    async function loadTicketHistory() {
        const container = document.getElementById('ticketHistoryContainer');
        if (!container) return;

        const authToken = localStorage.getItem('authToken');
        if (!authToken || !window.apiConfig) {
            container.innerHTML = '<div style="text-align: center; padding: var(--ds-space-6); color: var(--ds-text-tertiary);">Please login to view tickets.</div>';
            return;
        }

        const deviceToken = localStorage.getItem('deviceToken');

        try {
            const response = await fetch(window.apiConfig.getUrl('/api/support/tickets'), {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + authToken,
                    'X-Device-Token': deviceToken || '',
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok) {
                const tickets = result.data || [];
                if (tickets.length === 0) {
                    container.innerHTML = '<div style="text-align: center; padding: var(--ds-space-6); color: var(--ds-text-tertiary);"><i class="fas fa-ticket-alt" style="font-size: var(--ds-text-3xl); margin-bottom: var(--ds-space-2); display: block;"></i>No support tickets yet.</div>';
                    return;
                }
                container.innerHTML = tickets.map(ticket => renderTicketCard(ticket)).join('');
            } else {
                container.innerHTML = '<div style="text-align: center; padding: var(--ds-space-6); color: var(--ds-text-tertiary);">Failed to load tickets.</div>';
            }
        } catch (error) {
            console.error('Load tickets error:', error);
            container.innerHTML = '<div style="text-align: center; padding: var(--ds-space-6); color: var(--ds-text-tertiary);">Could not connect to server.</div>';
        }
    }

    function renderTicketCard(ticket) {
        const statusColors = {
            OPEN: { bg: 'var(--ds-warning-50, #fef3c7)', text: 'var(--ds-warning-700, #b45309)', border: 'var(--ds-warning-200, #fcd34d)' },
            IN_PROGRESS: { bg: 'var(--ds-info-50, #dbeafe)', text: 'var(--ds-info-700, #1d4ed8)', border: 'var(--ds-info-200, #93c5fd)' },
            RESOLVED: { bg: 'var(--ds-success-50, #dcfce7)', text: 'var(--ds-success-700, #15803d)', border: 'var(--ds-success-200, #86efac)' },
            CLOSED: { bg: 'var(--ds-bg-surface-sunken)', text: 'var(--ds-text-tertiary)', border: 'var(--ds-border-default)' }
        };
        const sc = statusColors[ticket.status] || statusColors.OPEN;
        const createdAt = ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

        return `
            <div style="background: var(--ds-bg-surface); border: 1px solid var(--ds-border-default); border-radius: var(--ds-radius-lg); padding: var(--ds-space-4); margin-bottom: var(--ds-space-3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--ds-space-2);">
                    <div style="font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); font-size: var(--ds-text-md);">${escapeHtml(ticket.subject)}</div>
                    <span style="padding: 2px 10px; border-radius: var(--ds-radius-full); font-size: var(--ds-text-xs); font-weight: var(--ds-weight-bold); background: ${sc.bg}; color: ${sc.text}; border: 1px solid ${sc.border};">${ticket.status}</span>
                </div>
                <div style="color: var(--ds-text-secondary); font-size: var(--ds-text-sm); margin-bottom: var(--ds-space-2); white-space: pre-line; max-height: 60px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(ticket.message)}</div>
                <div style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary);"><i class="fas fa-clock"></i> ${createdAt}</div>
            </div>
        `;
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
