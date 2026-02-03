(function () {
    const getProfileTemplate = () => `
        <div style="padding: 2.5rem; max-width: 1200px; margin: 0 auto;">
            <div style="background: white; border-radius: 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); overflow: hidden;">
                <div style="padding: 2rem; border-bottom: 1px solid #e5e7eb;">
                    <h2 style="font-size: 1.875rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">Profile</h2>
                    <p style="color: #64748b; font-size: 0.9375rem;">Manage your account information and preferences</p>
                </div>
                
                <div style="padding: 2rem;">
                    <div style="display: flex; align-items: center; gap: 2rem; margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid #e5e7eb;">
                        <div style="width: 96px; height: 96px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 2.5rem; font-weight: 700;">
                            <span id="profileInitial">U</span>
                        </div>
                        <div style="flex: 1;">
                            <h3 style="font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-bottom: 0.25rem;" id="profileName">User Name</h3>
                            <p style="color: #64748b; font-size: 0.9375rem; margin-bottom: 0.75rem;" id="profileEmail">user@example.com</p>
                            <button style="padding: 0.625rem 1.25rem; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                                Update password
                            </button>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                        <div>
                            <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem;">Full Name</label>
                            <input type="text" id="fullName" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem;" placeholder="Enter full name">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem;">Email</label>
                            <input type="email" id="email" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem;" placeholder="Enter email">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem;">Phone</label>
                            <input type="tel" id="phone" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem;" placeholder="Enter phone number">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem;">Company</label>
                            <input type="text" id="company" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem;" placeholder="Enter company name">
                        </div>
                    </div>

                    <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 1rem;">
                        <button style="padding: 0.75rem 1.5rem; background: #f1f5f9; color: #475569; border: none; border-radius: 8px; font-size: 0.9375rem; font-weight: 600; cursor: pointer;">
                            Cancel
                        </button>
                        <button style="padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 0.9375rem; font-weight: 600; cursor: pointer;">
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    window.initializeProfile = function () {
        console.log('Initializing Profile Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getProfileTemplate();
            loadUserProfile();
        }
    };

    function loadUserProfile() {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        const profileInitial = document.getElementById('profileInitial');
        const fullName = document.getElementById('fullName');
        const email = document.getElementById('email');

        if (user) {
            if (profileName) profileName.textContent = user.fullName || user.username || 'User';
            if (profileEmail) profileEmail.textContent = user.email || 'user@example.com';
            if (profileInitial) profileInitial.textContent = (user.fullName || user.username || 'U')[0].toUpperCase();
            if (fullName) fullName.value = user.fullName || user.username || '';
            if (email) email.value = user.email || '';
        }
    }
})();
