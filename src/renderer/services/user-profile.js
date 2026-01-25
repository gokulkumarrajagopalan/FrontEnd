/**
 * User Profile Service
 * Handles fetching and displaying user profile information
 */

class UserProfileService {
    constructor() {
        this.isLoading = false;
        this.loadingPopupId = null;
    }

    /**
     * Show user profile popup with user details fetched from API
     */
    async showProfile() {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            
            const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
            const userId = currentUser.userId;
            const loginTime = sessionStorage.getItem('loginTime');

            if (!userId) {
                console.error('❌ No userId found in session');
                this.showError('User ID not found. Please login again.');
                return;
            }

            // Show loading popup
            this.showLoading();

            // Fetch user details from API
            const user = await this.fetchUserDetails(userId);
            
            // Close loading popup first
            this.closeLoading();
            
            if (!user) return;

            // Build and show profile popup
            const profileContent = this.buildProfileContent(user, userId, loginTime);
            this.showProfilePopup(profileContent);

        } catch (error) {
            console.error('❌ Error showing user profile:', error);
            this.closeLoading();
            this.showError(`Failed to load user profile: ${error.message}`);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Fetch user details from API
     * @param {number} userId 
     * @returns {Promise<Object|null>}
     */
    async fetchUserDetails(userId) {
        try {
            const endpoint = window.apiConfig.getUrl(`/auth/user/${userId}`);
            console.log('📡 Fetching user profile from:', endpoint);

            const response = await fetch(endpoint, {
                method: 'GET',
                headers: window.authService.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch user details: HTTP ${response.status}`);
            }

            const result = await response.json();
            console.log('📦 User profile API response:', result);

            if (!result.success || !result.data) {
                throw new Error(result.message || 'Failed to fetch user details');
            }

            return result.data;
        } catch (error) {
            console.error('❌ Error fetching user details:', error);
            this.showError(`Failed to load user profile: ${error.message}`);
            return null;
        }
    }

    /**
     * Build profile content HTML
     * @param {Object} user - User data from API
     * @param {number} userId - User ID
     * @param {string} loginTime - Login timestamp
     * @returns {string} HTML content
     */
    buildProfileContent(user, userId, loginTime) {
        // Format login time
        const loginTimeFormatted = this.formatDateTime(loginTime);

        // Format created at date
        const createdAtFormatted = this.formatDateTime(user.createdAt);

        // Format mobile with country code
        const mobileDisplay = user.mobile 
            ? (user.countryCode ? `${user.countryCode} ${user.mobile}` : user.mobile) 
            : 'N/A';

        // Get role badge colors
        const roleColors = this.getRoleColors(user.role);

        return `
            <div style="min-width: 360px;">
                <!-- User Avatar & Basic Info -->
                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
                    <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 28px; font-weight: bold; flex-shrink: 0;">
                        ${(user.fullName || user.username || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div style="overflow: hidden;">
                        <h3 style="margin: 0; font-size: 1.25rem; font-weight: 600; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user.fullName || 'N/A'}</h3>
                        <p style="margin: 4px 0 0 0; font-size: 0.875rem; color: #6b7280;">@${user.username || 'N/A'}</p>
                        <span style="display: inline-block; margin-top: 6px; padding: 2px 10px; background: ${roleColors.bg}; color: ${roleColors.text}; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                            ${user.role || 'USER'}
                        </span>
                    </div>
                </div>
                
                <!-- User Details -->
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${this.buildInfoRow('👤', 'Full Name', user.fullName || 'N/A')}
                    ${this.buildInfoRow('📧', 'Email', user.email || 'N/A', true)}
                    ${this.buildInfoRow('📱', 'Mobile', mobileDisplay)}
                    ${this.buildInfoRow('🎫', 'License No.', user.licenceNo || 'N/A')}
                    ${this.buildInfoRow('📅', 'Account Created', createdAtFormatted, true)}
                    ${this.buildInfoRow('🕐', 'Login at', loginTimeFormatted, true)}
                </div>
            </div>
        `;
    }

    /**
     * Build an info row HTML
     * @param {string} icon - Emoji icon
     * @param {string} label - Field label
     * @param {string} value - Field value
     * @param {boolean} smallText - Use smaller text for value
     * @returns {string} HTML
     */
    buildInfoRow(icon, label, value, smallText = false) {
        const fontSize = smallText ? '0.8rem' : '0.875rem';
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #f9fafb; border-radius: 8px;">
                <span style="color: #6b7280; font-size: 0.875rem;">${icon} ${label}</span>
                <span style="font-weight: 500; color: #1f2937; font-size: ${fontSize}; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${value}</span>
            </div>
        `;
    }

    /**
     * Get role-based colors
     * @param {string} role 
     * @returns {Object} { bg, text }
     */
    getRoleColors(role) {
        const colors = {
            'ADMIN': { bg: '#dcfce7', text: '#15803d' },
            'MANAGER': { bg: '#fef3c7', text: '#b45309' },
            'USER': { bg: '#dbeafe', text: '#1d4ed8' }
        };
        return colors[role] || colors['USER'];
    }

    /**
     * Format date time string
     * @param {string} dateStr 
     * @returns {string}
     */
    formatDateTime(dateStr) {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short'
            });
        } catch {
            return 'N/A';
        }
    }

    /**
     * Show loading popup
     */
    showLoading() {
        // Generate a unique ID for the loading popup
        this.loadingPopupId = 'userProfileLoading_' + Date.now();
        
        const popupHtml = `
            <div id="${this.loadingPopupId}" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
                    <div class="p-6">
                        <div class="flex items-start gap-4">
                            <div class="flex-1">
                                <h3 class="text-xl font-bold text-gray-900 mb-2">Loading...</h3>
                                <div class="text-gray-600">
                                    <div style="text-align: center; padding: 20px;">
                                        <div style="font-size: 32px;">⏳</div>
                                        <p>Fetching user details...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', popupHtml);
    }

    /**
     * Close loading popup
     */
    closeLoading() {
        if (this.loadingPopupId) {
            const popup = document.getElementById(this.loadingPopupId);
            if (popup) {
                popup.remove();
            }
            this.loadingPopupId = null;
        }
    }

    /**
     * Show profile popup
     * @param {string} content - HTML content
     */
    showProfilePopup(content) {
        if (window.Popup) {
            window.Popup.alert({
                title: 'User Profile',
                message: content,
                icon: '',
                okText: 'Close',
                variant: 'primary'
            });
        }
    }

    /**
     * Show error popup
     * @param {string} message 
     */
    showError(message) {
        if (window.Popup) {
            window.Popup.alert({
                title: 'Error',
                message: message,
                icon: '❌',
                variant: 'danger'
            });
        }
    }
}

// Create and export singleton instance
window.userProfileService = new UserProfileService();

console.log('✅ UserProfileService loaded');
