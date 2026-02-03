(function () {
    const getSupportTemplate = () => `
        <div style="padding: 2.5rem; max-width: 1200px; margin: 0 auto;">
            <div style="background: white; border-radius: 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); overflow: hidden;">
                <div style="padding: 2rem; border-bottom: 1px solid #e5e7eb;">
                    <h2 style="font-size: 1.875rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">Support</h2>
                    <p style="color: #64748b; font-size: 0.9375rem;">Get help from our support team</p>
                </div>
                
                <div style="padding: 2rem;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                        <div style="
                            padding: 1.5rem;
                            border-radius: 12px;
                            box-shadow: 0 8px 24px rgba(139, 92, 246, 0.15);
                            color: #111827;
                            background: #ffffff;
                        ">
                            <div style="font-size: 1.875rem; margin-bottom: 0.75rem;">📞</div>
                            <div style="font-size: 0.875rem; opacity: 0.8; margin-bottom: 0.5rem;">Call Us</div>
                            <div style="font-size: 1.25rem; font-weight: 700;">+1 (555) 123-4567</div>
                        </div>

                        <div style="
                            padding: 1.5rem;
                            border-radius: 12px;
                            box-shadow: 0 8px 24px rgba(59, 130, 246, 0.15);
                            color: #111827;
                            background: #ffffff;
                        ">
                            <div style="font-size: 1.875rem; margin-bottom: 0.75rem;">✉️</div>
                            <div style="font-size: 0.875rem; opacity: 0.8; margin-bottom: 0.5rem;">Email Us</div>
                            <div style="font-size: 1.25rem; font-weight: 700;">support@talliffy.com</div>
                        </div>

                        <div style="
                            padding: 1.5rem;
                            border-radius: 12px;
                            box-shadow: 0 8px 24px rgba(139, 92, 246, 0.15);
                            color: #111827;
                            background: #ffffff;
                        ">
                            <div style="font-size: 1.875rem; margin-bottom: 0.75rem;">💬</div>
                            <div style="font-size: 0.875rem; opacity: 0.8; margin-bottom: 0.5rem;">Live Chat</div>
                            <div style="font-size: 1.25rem; font-weight: 700;">Available 24/7</div>
                        </div>

                    </div>

                    <div style="background: #f8f9fb; padding: 2rem; border-radius: 12px;">
                        <h3 style="font-size: 1.25rem; font-weight: 700; color: #1e293b; margin-bottom: 1.5rem;">Send us a message</h3>
                        <form id="supportForm">
                            <div style="margin-bottom: 1.25rem;">
                                <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem;">Name</label>
                                <input type="text" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem;" placeholder="Your name" required>
                            </div>
                            
                            <div style="margin-bottom: 1.25rem;">
                                <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem;">Email</label>
                                <input type="email" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem;" placeholder="your@email.com" required>
                            </div>
                            
                            <div style="margin-bottom: 1.25rem;">
                                <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem;">Subject</label>
                                <input type="text" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem;" placeholder="How can we help?" required>
                            </div>
                            
                            <div style="margin-bottom: 1.25rem;">
                                <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem;">Message</label>
                                <textarea style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem; min-height: 120px; resize: vertical;" placeholder="Describe your issue..." required></textarea>
                            </div>
                            
                            <button type="submit" style="padding: 0.75rem 2rem; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
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
