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
                            <button id="updatePasswordBtn" style="padding: 0.625rem 1.25rem; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                                🔒 Update Password
                            </button>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
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

            <!-- Update Password Modal -->
            <div id="updatePasswordModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); z-index: 1000; align-items: center; justify-content: center;">
                <div style="background: white; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); max-width: 500px; width: 90%; margin: 0 auto; animation: slideIn 0.3s ease-out;">
                    <div style="padding: 1.5rem 2rem; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between;">
                        <h3 style="font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0;">🔒 Update Password</h3>
                        <button id="closeModalBtn" style="background: none; border: none; font-size: 1.5rem; color: #64748b; cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: all 0.2s;">
                            ×
                        </button>
                    </div>
                    
                    <div style="padding: 2rem;">
                        <div id="passwordUpdateStatus" style="display: none; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: 0.875rem;"></div>
                        
                        <div style="margin-bottom: 1.25rem;">
                            <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem;">Current Password</label>
                            <input type="password" id="currentPassword" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem;" placeholder="Enter current password">
                        </div>
                        
                        <div style="margin-bottom: 1.25rem;">
                            <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem;">New Password</label>
                            <input type="password" id="newPassword" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem;" placeholder="Enter new password">
                            <p style="font-size: 0.75rem; color: #64748b; margin-top: 0.25rem;">Password must be at least 8 characters</p>
                        </div>
                        
                        <div style="margin-bottom: 1.5rem;">
                            <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem;">Confirm New Password</label>
                            <input type="password" id="confirmPassword" style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.9375rem;" placeholder="Confirm new password">
                        </div>
                        
                        <div style="display: flex; gap: 1rem;">
                            <button id="cancelPasswordBtn" style="flex: 1; padding: 0.75rem 1.5rem; background: #f1f5f9; color: #475569; border: none; border-radius: 8px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                                Cancel
                            </button>
                            <button id="savePasswordBtn" style="flex: 1; padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 0.9375rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                                Update Password
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                #closeModalBtn:hover {
                    background: #f1f5f9;
                }
                #updatePasswordBtn:hover {
                    background: #2563eb;
                }
                #savePasswordBtn:hover {
                    background: #2563eb;
                }
                #cancelPasswordBtn:hover {
                    background: #e2e8f0;
                }
            </style>
        </div>
    `;

    window.initializeProfile = function () {
        console.log('Initializing Profile Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getProfileTemplate();
            loadUserProfile();
            setupPasswordModalHandlers();
        }
    };

    function loadUserProfile() {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        const profileInitial = document.getElementById('profileInitial');

        if (user) {
            if (profileName) profileName.textContent = user.fullName || user.username || 'User';
            if (profileEmail) profileEmail.textContent = user.email || 'user@example.com';
            if (profileInitial) profileInitial.textContent = (user.fullName || user.username || 'U')[0].toUpperCase();
        }
    }

    function setupPasswordModalHandlers() {
        const updatePasswordBtn = document.getElementById('updatePasswordBtn');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
        const savePasswordBtn = document.getElementById('savePasswordBtn');
        const modal = document.getElementById('updatePasswordModal');

        // Open modal
        if (updatePasswordBtn) {
            updatePasswordBtn.addEventListener('click', () => {
                if (modal) {
                    modal.style.display = 'flex';
                    clearPasswordFields();
                }
            });
        }

        // Close modal handlers
        const closeModal = () => {
            if (modal) {
                modal.style.display = 'none';
                clearPasswordFields();
            }
        };

        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        if (cancelPasswordBtn) cancelPasswordBtn.addEventListener('click', closeModal);

        // Close on background click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });
        }

        // Save password
        if (savePasswordBtn) {
            savePasswordBtn.addEventListener('click', handlePasswordUpdate);
        }
    }

    function clearPasswordFields() {
        const currentPassword = document.getElementById('currentPassword');
        const newPassword = document.getElementById('newPassword');
        const confirmPassword = document.getElementById('confirmPassword');
        const status = document.getElementById('passwordUpdateStatus');

        if (currentPassword) currentPassword.value = '';
        if (newPassword) newPassword.value = '';
        if (confirmPassword) confirmPassword.value = '';
        if (status) status.style.display = 'none';
    }

    function showPasswordStatus(message, type = 'info') {
        const status = document.getElementById('passwordUpdateStatus');
        if (!status) return;

        const colors = {
            success: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
            error: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
            info: { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' }
        };

        const color = colors[type] || colors.info;
        status.style.display = 'block';
        status.style.background = color.bg;
        status.style.color = color.text;
        status.style.borderLeft = `4px solid ${color.border}`;
        status.textContent = message;
    }

    async function handlePasswordUpdate() {
        const currentPassword = document.getElementById('currentPassword');
        const newPassword = document.getElementById('newPassword');
        const confirmPassword = document.getElementById('confirmPassword');
        const saveBtn = document.getElementById('savePasswordBtn');

        if (!currentPassword || !newPassword || !confirmPassword) return;

        const currentPass = currentPassword.value.trim();
        const newPass = newPassword.value.trim();
        const confirmPass = confirmPassword.value.trim();

        // Validation
        if (!currentPass) {
            showPasswordStatus('❌ Please enter your current password', 'error');
            return;
        }

        if (!newPass) {
            showPasswordStatus('❌ Please enter a new password', 'error');
            return;
        }

        if (newPass.length < 8) {
            showPasswordStatus('❌ New password must be at least 8 characters', 'error');
            return;
        }

        if (newPass !== confirmPass) {
            showPasswordStatus('❌ Passwords do not match', 'error');
            return;
        }

        if (currentPass === newPass) {
            showPasswordStatus('❌ New password must be different from current password', 'error');
            return;
        }

        // Disable button during update
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Updating...';
        }

        try {
            // Get auth token
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                throw new Error('Authentication required. Please login again.');
            }

            // Call API to update password
            const response = await fetch(window.apiConfig.getUrl('/auth/change-password'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    currentPassword: currentPass,
                    newPassword: newPass
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showPasswordStatus('✅ Password updated successfully!', 'success');
                setTimeout(() => {
                    const modal = document.getElementById('updatePasswordModal');
                    if (modal) modal.style.display = 'none';
                    clearPasswordFields();
                }, 2000);
            } else {
                throw new Error(result.message || 'Failed to update password');
            }
        } catch (error) {
            console.error('Password update error:', error);
            showPasswordStatus(`❌ ${error.message}`, 'error');
        } finally {
            // Re-enable button
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Update Password';
            }
        }
    }
})();
