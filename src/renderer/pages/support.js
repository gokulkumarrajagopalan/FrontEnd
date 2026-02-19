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

                    <div style="background: var(--ds-bg-surface-sunken); padding: var(--ds-space-6); border-radius: var(--ds-radius-lg);">
                        <h3 style="font-size: var(--ds-text-xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-4);">Send us a message</h3>
                        <form id="supportForm">
                            <div style="margin-bottom: var(--ds-space-4);">
                                <label style="display: block; font-size: var(--ds-text-sm); font-weight: var(--ds-weight-semibold); color: var(--ds-text-secondary); margin-bottom: var(--ds-space-2);">Subject</label>
                                <input type="text" class="ds-input" style="width: 100%;" placeholder="How can we help?" required>
                            </div>
                            
                            <div style="margin-bottom: var(--ds-space-4);">
                                <label style="display: block; font-size: var(--ds-text-sm); font-weight: var(--ds-weight-semibold); color: var(--ds-text-secondary); margin-bottom: var(--ds-space-2);">Message</label>
                                <textarea class="ds-input" style="width: 100%; min-height: 120px; resize: vertical;" placeholder="Describe your issue..." required></textarea>
                            </div>
                            
                            <button type="submit" class="ds-btn ds-btn-primary">
                                Send Message
                            </button>
                        </form>
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
        }
    };

    function setupEventListeners() {
        const form = document.getElementById('supportForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                if (window.Toast) {
                    window.Toast.success('Thank you for contacting support! We will get back to you soon.', 'Message Sent');
                } else {
                    alert('Thank you for contacting support! We will get back to you soon.');
                }
                form.reset();
            });
        }
    }
})();
