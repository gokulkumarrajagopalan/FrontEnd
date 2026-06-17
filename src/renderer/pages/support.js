(function () {
    let loadedTickets = [];
    let activeTicketId = null;

    const getSupportTemplate = () => `
        <style>
            .ticket-card {
                background: var(--ds-bg-surface);
                border: 1px solid var(--ds-border-default);
                border-radius: var(--ds-radius-lg);
                padding: var(--ds-space-4);
                margin-bottom: var(--ds-space-3);
                cursor: pointer;
                transition: all var(--ds-duration-base) var(--ds-ease);
            }
            .ticket-card:hover {
                border-color: var(--ds-primary-300, #a5b4fc) !important;
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.06);
                transform: translateY(-1px);
            }
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
            .comment-bubble {
                border-radius: var(--ds-radius-lg);
                padding: var(--ds-space-3) var(--ds-space-4);
                max-width: 85%;
                font-size: var(--ds-text-sm);
                line-height: 1.5;
            }
            .comment-user {
                background: var(--ds-bg-surface-sunken);
                border: 1px solid var(--ds-border-default);
                align-self: flex-end;
            }
            .comment-support {
                background: rgba(99, 102, 241, 0.06);
                border: 1px solid rgba(99, 102, 241, 0.15);
                align-self: flex-start;
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
                            <div style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold);">+1 (555) 123-4567</div>
                        </div>

                        <div class="support-card">
                            <div style="font-size: var(--ds-text-3xl); margin-bottom: var(--ds-space-3); color: var(--ds-primary-500);"><i class="fas fa-envelope"></i></div>
                            <div style="font-size: var(--ds-text-base); color: var(--ds-text-tertiary); margin-bottom: var(--ds-space-1); font-weight: var(--ds-weight-semibold);">Email Us</div>
                            <div style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold);">support@talliffy.com</div>
                        </div>

                        <div class="support-card">
                            <div style="font-size: var(--ds-text-3xl); margin-bottom: var(--ds-space-3); color: var(--ds-primary-500);"><i class="fas fa-comments"></i></div>
                            <div style="font-size: var(--ds-text-base); color: var(--ds-text-tertiary); margin-bottom: var(--ds-space-1); font-weight: var(--ds-weight-semibold);">Live Chat</div>
                            <div style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold);">Available 24/7</div>
                        </div>
                    </div>
 
                    <!-- send Request Form -->
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
                                <i class="fas fa-paper-plane"></i> send Request
                            </button>
                        </form>
                    </div>

                    <!-- Ticket History -->
                    <div style="background: var(--ds-bg-surface-sunken); padding: var(--ds-space-6); border-radius: var(--ds-radius-lg);">
                        <h3 style="font-size: var(--ds-text-xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-4);"><i class="fas fa-history" style="color: var(--ds-primary-500); margin-right: var(--ds-space-2);"></i>Your Tickets</h3>
                        <div id="ticketHistoryContainer">
                            <div style="display: flex; justify-content: center; align-items: center; padding: var(--ds-space-8);">
                                ${window.UIComponents ? window.UIComponents.spinner({ size: 'md', text: 'Loading...' }) : 'Loading...'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Ticket Details & Comments Modal -->
        <div id="ticketDetailsModal" class="hidden" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center; z-index: 1000; padding: var(--ds-space-4);">
            <div style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-2xl); border: 1px solid var(--ds-border-default); width: 100%; max-width: 650px; box-shadow: var(--ds-shadow-2xl); display: flex; flex-direction: column; max-height: 85vh; overflow: hidden; animation: modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);">
                <!-- Header -->
                <div style="padding: var(--ds-space-4) var(--ds-space-6); border-bottom: 1px solid var(--ds-border-default); display: flex; justify-content: space-between; align-items: center;">
                    <h3 id="modalTicketSubject" style="margin: 0; font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); max-width: 80%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Ticket Details</h3>
                    <button id="closeDetailsModal" style="background: none; border: none; cursor: pointer; color: var(--ds-text-tertiary); font-size: var(--ds-text-lg); display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%;" aria-label="Close details">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <!-- Body (Scrollable) -->
                <div style="padding: var(--ds-space-6); overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: var(--ds-space-5);">
                    <!-- Original Message card -->
                    <div style="background: var(--ds-bg-surface-sunken); padding: var(--ds-space-4); border-radius: var(--ds-radius-lg); border: 1px solid var(--ds-border-default);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--ds-space-2);">
                            <span id="modalTicketDate" style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary);"><i class="fas fa-clock"></i> </span>
                            <span id="modalTicketStatus" style="padding: 2px 10px; border-radius: var(--ds-radius-full); font-size: var(--ds-text-xs); font-weight: var(--ds-weight-bold);"></span>
                        </div>
                        <p id="modalTicketMessage" style="margin: 0; font-size: var(--ds-text-sm); color: var(--ds-text-secondary); white-space: pre-line; line-height: 1.6;"></p>
                    </div>
                    
                    <!-- Comments section -->
                    <div style="display: flex; flex-direction: column; flex: 1;">
                        <h4 style="margin: 0 0 var(--ds-space-3) 0; font-size: var(--ds-text-sm); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); border-bottom: 1px solid var(--ds-border-default); padding-bottom: var(--ds-space-2);">Updates & Conversation</h4>
                        <div id="commentsContainer" style="display: flex; flex-direction: column; gap: var(--ds-space-3); min-height: 100px;">
                            <!-- Comments go here -->
                        </div>
                    </div>
                </div>
                <!-- Footer (Reply form) -->
                <div style="padding: var(--ds-space-4) var(--ds-space-6); border-top: 1px solid var(--ds-border-default); background: var(--ds-bg-surface-sunken);">
                    <form id="commentForm" style="display: flex; gap: var(--ds-space-3); align-items: flex-end;">
                        <div style="flex: 1;">
                            <textarea id="commentText" class="ds-input" style="width: 100%; min-height: 44px; max-height: 120px; height: 44px; resize: vertical; padding: 10px 14px; font-size: var(--ds-text-sm); border-radius: var(--ds-radius-xl);" placeholder="Type an update or comment..." required></textarea>
                        </div>
                        <button type="submit" class="ds-btn ds-btn-primary" style="padding: 0 var(--ds-space-4); height: 44px; display: inline-flex; align-items: center; gap: 8px; border-radius: var(--ds-radius-xl);">
                            <i class="fas fa-reply"></i> Send
                        </button>
                    </form>
                </div>
            </div>
        </div>

        <style>
            @keyframes modalFadeIn {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
        </style>
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

        const historyContainer = document.getElementById('ticketHistoryContainer');
        if (historyContainer) {
            historyContainer.addEventListener('click', (e) => {
                const card = e.target.closest('.ticket-card');
                if (card) {
                    const ticketId = card.getAttribute('data-id');
                    openTicketDetails(ticketId);
                }
            });
        }

        const closeBtn = document.getElementById('closeDetailsModal');
        const modal = document.getElementById('ticketDetailsModal');
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
                modal.style.display = 'none';
                activeTicketId = null;
            });
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                    modal.style.display = 'none';
                    activeTicketId = null;
                }
            });
        }

        const commentForm = document.getElementById('commentForm');
        if (commentForm) {
            commentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                handleSubmitComment();
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
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> send Request';
            }
        }
    }

    function getDisplayStatus(status) {
        if (!status) return 'PENDING';
        const s = String(status).toUpperCase();
        // Map backend 'OPEN' to 'PENDING' for UI presentation as requested by user
        if (s === 'OPEN') return 'PENDING';
        return s;
    }

    async function loadTicketHistory() {
        const container = document.getElementById('ticketHistoryContainer');
        if (!container) return;

        const authToken = ((window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function') ? window.electronAPI.secureStoreGet('authToken') : localStorage.getItem('authToken'));
        if (!authToken || !window.apiConfig) {
            container.innerHTML = '<div style="text-align: center; padding: var(--ds-space-6); color: var(--ds-text-tertiary);">Please login to view tickets.</div>';
            return;
        }

        const deviceToken = ((window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function') ? window.electronAPI.secureStoreGet('deviceToken') : localStorage.getItem('deviceToken'));

        try {
            const response = await fetch(window.apiConfig.getUrl('/support/tickets'), {
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
                loadedTickets = tickets;
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
            PENDING: { bg: 'var(--ds-warning-50, #fef3c7)', text: 'var(--ds-warning-700, #b45309)', border: 'var(--ds-warning-200, #fcd34d)' },
            'OPEN PENDING': { bg: 'var(--ds-warning-50, #fef3c7)', text: 'var(--ds-warning-700, #b45309)', border: 'var(--ds-warning-200, #fcd34d)' },
            IN_PROGRESS: { bg: 'var(--ds-info-50, #dbeafe)', text: 'var(--ds-info-700, #1d4ed8)', border: 'var(--ds-info-200, #93c5fd)' },
            RESOLVED: { bg: 'var(--ds-success-50, #dcfce7)', text: 'var(--ds-success-700, #15803d)', border: 'var(--ds-success-200, #86efac)' },
            CLOSED: { bg: 'var(--ds-bg-surface-sunken)', text: 'var(--ds-text-tertiary)', border: 'var(--ds-border-default)' }
        };
        const displayStatus = getDisplayStatus(ticket.status);
        const sc = statusColors[displayStatus] || statusColors.PENDING;
        const createdAt = ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '\u2014';

        return `
            <div class="ticket-card" data-id="${ticket.id}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--ds-space-2);">
                    <div style="font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); font-size: var(--ds-text-md);">${escapeHtml(ticket.subject)}</div>
                    <span style="padding: 2px 10px; border-radius: var(--ds-radius-full); font-size: var(--ds-text-xs); font-weight: var(--ds-weight-bold); background: ${sc.bg}; color: ${sc.text}; border: 1px solid ${sc.border};">${displayStatus}</span>
                </div>
                <div style="color: var(--ds-text-secondary); font-size: var(--ds-text-sm); margin-bottom: var(--ds-space-2); white-space: pre-line; max-height: 60px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(ticket.message)}</div>
                <div style="font-size: var(--ds-text-xs); color: var(--ds-text-tertiary); display: flex; justify-content: space-between; align-items: center;">
                    <span><i class="fas fa-clock"></i> ${createdAt}</span>
                    <span style="color: var(--ds-primary-600); font-weight: var(--ds-weight-semibold);"><i class="fas fa-comments"></i> View Thread</span>
                </div>
            </div>
        `;
    }

    function openTicketDetails(ticketId) {
        const ticket = loadedTickets.find(t => String(t.id) === String(ticketId));
        if (!ticket) return;

        activeTicketId = ticketId;

        const modal = document.getElementById('ticketDetailsModal');
        const modalSubject = document.getElementById('modalTicketSubject');
        const modalDate = document.getElementById('modalTicketDate');
        const modalStatus = document.getElementById('modalTicketStatus');
        const modalMessage = document.getElementById('modalTicketMessage');
        const commentText = document.getElementById('commentText');

        if (!modal) return;

        if (modalSubject) modalSubject.textContent = ticket.subject;
        if (modalDate) modalDate.innerHTML = `<i class="fas fa-clock"></i> ${ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '\u2014'}`;
        
        const statusColors = {
            PENDING: { bg: 'var(--ds-warning-50, #fef3c7)', text: 'var(--ds-warning-700, #b45309)', border: 'var(--ds-warning-200, #fcd34d)' },
            'OPEN PENDING': { bg: 'var(--ds-warning-50, #fef3c7)', text: 'var(--ds-warning-700, #b45309)', border: 'var(--ds-warning-200, #fcd34d)' },
            IN_PROGRESS: { bg: 'var(--ds-info-50, #dbeafe)', text: 'var(--ds-info-700, #1d4ed8)', border: 'var(--ds-info-200, #93c5fd)' },
            RESOLVED: { bg: 'var(--ds-success-50, #dcfce7)', text: 'var(--ds-success-700, #15803d)', border: 'var(--ds-success-200, #86efac)' },
            CLOSED: { bg: 'var(--ds-bg-surface-sunken)', text: 'var(--ds-text-tertiary)', border: 'var(--ds-border-default)' }
        };
        const displayStatus = getDisplayStatus(ticket.status);
        const sc = statusColors[displayStatus] || statusColors.PENDING;
        
        if (modalStatus) {
            modalStatus.textContent = displayStatus;
            modalStatus.style.background = sc.bg;
            modalStatus.style.color = sc.text;
            modalStatus.style.border = `1px solid ${sc.border}`;
        }
        
        if (modalMessage) modalMessage.textContent = ticket.message;
        if (commentText) commentText.value = '';

        modal.classList.remove('hidden');
        modal.style.display = 'flex';

        loadComments(ticketId);
    }

    function getLocalComments(ticketId) {
        try {
            const key = `ticket_comments_${ticketId}`;
            return JSON.parse(localStorage.getItem(key) || '[]');
        } catch (e) {
            return [];
        }
    }

    function saveLocalComment(ticketId, comment) {
        try {
            const comments = getLocalComments(ticketId);
            comments.push(comment);
            localStorage.setItem(`ticket_comments_${ticketId}`, JSON.stringify(comments));
            return true;
        } catch (e) {
            return false;
        }
    }

    async function loadComments(ticketId) {
        const container = document.getElementById('commentsContainer');
        if (!container) return;

        container.innerHTML = '<div style="text-align: center; padding: var(--ds-space-4); color: var(--ds-text-tertiary);"><i class="fas fa-spinner fa-spin"></i> Loading updates...</div>';

        const authToken = ((window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function') ? window.electronAPI.secureStoreGet('authToken') : localStorage.getItem('authToken'));
        const deviceToken = ((window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function') ? window.electronAPI.secureStoreGet('deviceToken') : localStorage.getItem('deviceToken'));

        let comments = [];

        try {
            if (authToken && window.apiConfig) {
                const response = await fetch(window.apiConfig.getUrl(`/support/tickets/${ticketId}/comments`), {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + authToken,
                        'X-Device-Token': deviceToken || '',
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const result = await response.json();
                    comments = result.data || result || [];
                } else if (response.status === 404) {
                    comments = getLocalComments(ticketId);
                } else {
                    throw new Error('Server error');
                }
            } else {
                comments = getLocalComments(ticketId);
            }
        } catch (error) {
            console.warn('Error loading comments from backend, using local storage fallback:', error);
            comments = getLocalComments(ticketId);
        }

        renderComments(comments);
    }

    function renderComments(comments) {
        const container = document.getElementById('commentsContainer');
        if (!container) return;

        if (!comments || comments.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: var(--ds-space-4); color: var(--ds-text-tertiary); font-size: var(--ds-text-xs);">No replies or updates yet.</div>';
            return;
        }

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: var(--ds-space-3);">
                ${comments.map(comment => {
                    const isSystem = comment.isSystem || comment.role === 'admin' || comment.role === 'support' || comment.sender === 'Support';
                    const senderName = isSystem ? 'Support Team' : (comment.senderName || 'You');
                    const bubbleClass = isSystem ? 'comment-support' : 'comment-user';
                    const alignStyle = isSystem ? 'align-self: flex-start;' : 'align-self: flex-end;';
                    const time = comment.createdAt ? new Date(comment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '\u2014';
                    
                    return `
                        <div class="comment-bubble ${bubbleClass}" style="${alignStyle}">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; gap: 12px;">
                                <span style="font-weight: var(--ds-weight-bold); font-size: 11px; color: ${isSystem ? 'var(--ds-primary-700)' : 'var(--ds-text-primary)'};">
                                    ${isSystem ? '<i class="fas fa-user-shield"></i> ' : ''}${escapeHtml(senderName)}
                                </span>
                                <span style="font-size: 9px; color: var(--ds-text-tertiary);">${time}</span>
                            </div>
                            <div style="font-size: 13px; color: var(--ds-text-secondary); white-space: pre-line; word-break: break-word;">${escapeHtml(comment.message || comment.text || '')}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    async function handleSubmitComment() {
        const text = document.getElementById('commentText')?.value.trim();
        const submitBtn = document.querySelector('#commentForm button[type="submit"]');

        if (!text || !activeTicketId) return;

        const authToken = ((window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function') ? window.electronAPI.secureStoreGet('authToken') : localStorage.getItem('authToken'));
        const deviceToken = ((window.electronAPI && typeof window.electronAPI.secureStoreGet === 'function') ? window.electronAPI.secureStoreGet('deviceToken') : localStorage.getItem('deviceToken'));

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }

        const newComment = {
            id: 'c_' + Date.now(),
            ticketId: activeTicketId,
            message: text,
            senderName: 'You',
            role: 'user',
            createdAt: new Date().toISOString(),
            isSystem: false
        };

        try {
            let success = false;
            if (authToken && window.apiConfig) {
                try {
                    const response = await fetch(window.apiConfig.getUrl(`/support/tickets/${activeTicketId}/comments`), {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + authToken,
                            'X-Device-Token': deviceToken || '',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ message: text })
                    });

                    if (response.ok) {
                        success = true;
                    } else if (response.status === 404) {
                        success = saveLocalComment(activeTicketId, newComment);
                    }
                } catch (e) {
                    success = saveLocalComment(activeTicketId, newComment);
                }
            } else {
                success = saveLocalComment(activeTicketId, newComment);
            }

            if (success) {
                document.getElementById('commentText').value = '';
                loadComments(activeTicketId);
            }
        } catch (error) {
            console.error('Submit comment error:', error);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-reply"></i> Send';
            }
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
