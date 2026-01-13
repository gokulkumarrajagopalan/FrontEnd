/**
 * License Validation Service
 * Validates that Tally license matches user's license before allowing sync
 */

class LicenseValidator {
    /**
     * Get user's license number from all possible locations
     * Supports both legacy (sessionStorage) and new (localStorage) auth flows
     * @returns {string|null}
     */
    static getUserLicenseNumber() {
        try {
            // 1) AuthService (preferred when available)
            if (window.authService && typeof window.authService.getCurrentUser === 'function') {
                const u = window.authService.getCurrentUser();
                const v = u?.licenseNumber || u?.licenceNo || u?.licence_number;
                if (v) return String(v);
            }

            // 2) sessionStorage currentUser (services/auth.js flow)
            try {
                const su = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
                const sv = su?.licenseNumber || su?.licenceNo || su?.licence_number;
                if (sv) return String(sv);
            } catch (_) {}

            // 3) localStorage currentUser (auth-new.js flow)
            try {
                const lu = JSON.parse(localStorage.getItem('currentUser') || 'null');
                const lv = lu?.licenseNumber || lu?.licenceNo || lu?.licence_number;
                if (lv) return String(lv);
            } catch (_) {}

            // 4) explicit cache
            const cached = localStorage.getItem('userLicenseNumber');
            if (cached) return String(cached);

            // 5) pending OTP verification cache (fallback)
            const pending = localStorage.getItem('pendingVerificationLicence');
            if (pending) return String(pending);

            return null;
        } catch (error) {
            console.warn('⚠️ getUserLicenseNumber error:', error);
            return null;
        }
    }
    /**
     * Validate Tally license against user's license
     * @param {string|number} userLicenseNumber - User's license number from authentication
     * @param {number} tallyPort - Tally port number
     * @returns {Promise<{isValid: boolean, message: string, tallyLicense?: string, userLicense?: string}>}
     */
    static async validateLicense(userLicenseNumber, tallyPort = 9000) {
        try {
            console.log('🔐 Starting license validation...');
            console.log(`   User License: ${userLicenseNumber}`);
            console.log(`   Tally Port: ${tallyPort}`);

            // Get user's license number
            const resolvedUserLicense = userLicenseNumber ?? this.getUserLicenseNumber();
            if (!resolvedUserLicense) {
                return {
                    isValid: false,
                    message: 'User license number not found. Please login again.',
                    userLicense: null,
                    tallyLicense: null
                };
            }

            // Fetch license from Tally
            const tallyLicense = await this.fetchTallyLicense(tallyPort);

            if (!tallyLicense) {
                return {
                    isValid: false,
                    message: 'Unable to fetch license from Tally. Please ensure Tally is running.',
                    userLicense: userLicenseNumber?.toString(),
                    tallyLicense: null
                };
            }

            // Normalize both license numbers for comparison
            const normalizedUserLicense = this.normalizeLicense(resolvedUserLicense);
            const normalizedTallyLicense = this.normalizeLicense(tallyLicense);

            console.log(`   Normalized User License: ${normalizedUserLicense}`);
            console.log(`   Normalized Tally License: ${normalizedTallyLicense}`);

            // Compare licenses
            const isValid = normalizedUserLicense === normalizedTallyLicense;

            if (isValid) {
                console.log('✅ License validation successful');
                return {
                    isValid: true,
                    message: 'License validation successful',
                    userLicense: resolvedUserLicense?.toString(),
                    tallyLicense: tallyLicense
                };
            } else {
                console.warn('❌ License mismatch detected');
                return {
                    isValid: false,
                    message: `License mismatch! Tally license (${tallyLicense}) does not match your user license (${resolvedUserLicense}).`,
                    userLicense: resolvedUserLicense?.toString(),
                    tallyLicense: tallyLicense
                };
            }
        } catch (error) {
            console.error('❌ Error during license validation:', error);
            return {
                isValid: false,
                message: `License validation failed: ${error.message}`,
                userLicense: (userLicenseNumber ?? this.getUserLicenseNumber())?.toString(),
                tallyLicense: null
            };
        }
    }

    /**
     * Fetch license number from Tally
     * @param {number} tallyPort - Tally port number
     * @returns {Promise<string|null>}
     */
    static async fetchTallyLicense(tallyPort) {
        try {
            if (!window.electronAPI || !window.electronAPI.invoke) {
                throw new Error('Electron API not available');
            }

            const response = await window.electronAPI.invoke('fetch-license', { tallyPort });

            if (response.success && response.data && response.data.license_number) {
                return response.data.license_number;
            }

            console.warn('⚠️ License number not available from Tally:', response.error);
            return null;
        } catch (error) {
            console.error('❌ Error fetching Tally license:', error);
            return null;
        }
    }

    /**
     * Normalize license number for comparison (remove spaces, convert to string, uppercase)
     * @param {string|number} license - License number
     * @returns {string}
     */
    static normalizeLicense(license) {
        if (license === null || license === undefined) {
            return '';
        }
        return String(license).trim().toUpperCase().replace(/\s+/g, '');
    }

    /**
     * Show license mismatch popup
     * @param {string} userLicense - User's license number
     * @param {string} tallyLicense - Tally's license number
     * @returns {Promise<void>}
     */
    static async showLicenseMismatchPopup(userLicense, tallyLicense) {
        const message = `
            <div class="text-left">
                <p class="mb-4 text-gray-700">Sync cannot proceed because the Tally license does not match your user license.</p>
                <div class="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
                    <div class="flex items-start gap-3">
                        <span class="text-2xl">⚠️</span>
                        <div class="flex-1">
                            <p class="text-sm font-bold text-red-800 mb-2">License Mismatch Detected</p>
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Your License:</span>
                                    <span class="font-bold text-gray-900">${userLicense || 'Not Available'}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Tally License:</span>
                                    <span class="font-bold text-gray-900">${tallyLicense || 'Not Available'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <p class="text-sm text-gray-600">
                    Please ensure you are logged in with the correct account that matches the Tally license, or contact your administrator.
                </p>
            </div>
        `;

        // Use Popup component if available (single-button alert)
        if (window.Popup && typeof window.Popup.alert === 'function') {
            await window.Popup.alert({
                title: '🚫 Sync Not Allowed',
                message: message,
                okText: 'OK',
                variant: 'danger',
                closeOnBackdrop: false
            });
        } else if (window.notificationService) {
            // Fallback to notification service
            window.notificationService.error(
                `License mismatch! User: ${userLicense}, Tally: ${tallyLicense}`,
                'Sync Not Allowed',
                10000
            );
        } else {
            // Final fallback to alert
            alert(`Sync Not Allowed\n\nLicense mismatch detected!\nYour License: ${userLicense}\nTally License: ${tallyLicense}\n\nPlease ensure you are using the correct license.`);
        }
    }

    /**
     * Validate and show popup if invalid
     * @param {string|number} userLicenseNumber - User's license number
     * @param {number} tallyPort - Tally port number
     * @returns {Promise<boolean>} - Returns true if valid, false if invalid
     */
    static async validateAndNotify(userLicenseNumber, tallyPort = 9000) {
        const result = await this.validateLicense(userLicenseNumber, tallyPort);

        if (!result.isValid) {
            await this.showLicenseMismatchPopup(result.userLicense, result.tallyLicense);
            return false;
        }

        return true;
    }
}

// Export to window for global access
window.LicenseValidator = LicenseValidator;

console.log('✅ LicenseValidator loaded');
