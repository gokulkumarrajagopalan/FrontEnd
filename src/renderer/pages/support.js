(function () {
    const getSupportTemplate = () => `
        <div style="padding: 1.75rem; max-width: 1100px; margin: 0 auto;">
            <div style="background: white; border-radius: 14px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); overflow: hidden;">
                <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb;">
                    <h2 style="font-size: 1.35rem; font-weight: 700; color: #1e293b; margin-bottom: 0.3rem;">Support</h2>
                    <p style="color: #64748b; font-size: 0.875rem;">Get help from our support team</p>
                </div>
                
                <div style="padding: 1.5rem;">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                        <div style="padding: 1.15rem; border-radius: 10px; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.1); color: #111827; background: #ffffff;">
                            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">📞</div>
                            <div style="font-size: 0.8rem; opacity: 0.8; margin-bottom: 0.3rem;">Call Us</div>
                            <div style="font-size: 1rem; font-weight: 700;">+1 (555) 123-4567</div>
                        </div>

                        <div style="padding: 1.15rem; border-radius: 10px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1); color: #111827; background: #ffffff;">
                            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">✉️</div>
                            <div style="font-size: 0.8rem; opacity: 0.8; margin-bottom: 0.3rem;">Email Us</div>
                            <div style="font-size: 1rem; font-weight: 700;">support@talliffy.com</div>
                        </div>

                        <div style="padding: 1.15rem; border-radius: 10px; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.1); color: #111827; background: #ffffff;">
                            <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">💬</div>
                            <div style="font-size: 0.8rem; opacity: 0.8; margin-bottom: 0.3rem;">Live Chat</div>
                            <div style="font-size: 1rem; font-weight: 700;">Available 24/7</div>
                        </div>
                    </div>

                    <div style="background: #f8f9fb; padding: 1.5rem; border-radius: 10px;">
                        <h3 style="font-size: 1.05rem; font-weight: 700; color: #1e293b; margin-bottom: 1.15rem;">Send us a message</h3>
                        <form id="supportForm">
                            <div style="margin-bottom: 1rem;">
                                <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #475569; margin-bottom: 0.4rem;">Subject</label>
                                <input type="text" style="width: 100%; padding: 0.6rem 0.85rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.875rem;" placeholder="How can we help?" required>
                            </div>
                            
                            <div style="margin-bottom: 1rem;">
                                <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #475569; margin-bottom: 0.4rem;">Message</label>
                                <textarea style="width: 100%; padding: 0.6rem 0.85rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.875rem; min-height: 100px; resize: vertical;" placeholder="Describe your issue..." required></textarea>
                            </div>
                            
                            <button type="submit" style="padding: 0.6rem 1.75rem; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
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
                alert('Thank you for contacting support! We will get back to you soon.');
                form.reset();
            });
        }
    }
})();
