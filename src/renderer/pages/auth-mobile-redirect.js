// Mobile Verification Integration - TEMPORARILY DISABLED
// This file contains the code needed to enable mobile verification after email OTP

/*
// Add this to auth-new.js after the setupOtpForm function
// Replace the setTimeout redirect in setupOtpForm with this:

// In setupOtpForm, after email verification succeeds, change:
// FROM:
setTimeout(() => {
    if (window.router) {
        window.router.navigate('login');
    } else {
        window.location.hash = '#login';
        window.initializeLogin();
    }
}, 2000);

// TO:
setTimeout(() => {
    // Get phone number from response or user data
    const phone = data.phone || localStorage.getItem('userPhone') || '+1234567890';
    
    // Store for mobile verification
    localStorage.setItem('pendingMobileVerificationEmail', email);
    localStorage.setItem('pendingMobileVerificationLicence', licenceNo);
    localStorage.setItem('pendingMobileVerificationPhone', phone);
    
    // Redirect to mobile verification
    if (window.initializeMobileVerification) {
        window.initializeMobileVerification(email, licenceNo, phone);
    } else {
        // Fallback if mobile verification not loaded
        if (window.router) {
            window.router.navigate('login');
        } else {
            window.location.hash = '#login';
            window.initializeLogin();
        }
    }
}, 2000);

// Also update initializeAuth to handle mobile verification:
window.initializeAuth = function () {
    console.log('Initializing Auth Page...');
    const currentHash = window.location.hash.replace('#', '') || 'login';
    
    if (currentHash === 'signup') {
        window.initializeSignup();
    } else if (currentHash === 'verify-mobile') {
        const email = localStorage.getItem('pendingMobileVerificationEmail');
        const licenceNo = localStorage.getItem('pendingMobileVerificationLicence');
        const phone = localStorage.getItem('pendingMobileVerificationPhone');
        if (email && licenceNo && phone) {
            window.initializeMobileVerification(email, licenceNo, phone);
        } else {
            window.initializeLogin();
        }
    } else if (currentHash === 'verify-otp') {
        const email = localStorage.getItem('pendingVerificationEmail');
        const licenceNo = localStorage.getItem('pendingVerificationLicence');
        if (email && licenceNo) {
            window.initializeOtpVerification(email, licenceNo);
        } else {
            window.initializeLogin();
        }
    } else {
        window.initializeLogin();
    }
};
*/

// CURRENT FLOW (Mobile OTP Disabled):
// Signup → Email OTP Verification → Login

// TO ENABLE MOBILE OTP:
// 1. Uncomment the code above
// 2. Load mobile-verification.js in your HTML
// 3. Update auth-new.js setupOtpForm to use the new redirect logic
// 4. Update initializeAuth to handle verify-mobile route
