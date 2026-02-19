// Mobile Verification Template - TEMPORARILY DISABLED
/*
const getMobileVerificationTemplate = (email, licenceNo, phone) => `
<div class="auth-background flex items-center justify-center p-6 relative overflow-hidden" style="background: var(--bg-primary); min-height: 100vh;">
    <div class="w-full max-w-md relative z-10">
        <div class="auth-header mb-6 text-center">
            <div class="auth-logo inline-flex mb-3">
                <span class="text-5xl">📱</span>
            </div>
            <h1 class="text-3xl font-bold mb-2" style="color: var(--text-primary);">Verify Your Mobile</h1>
            <p class="text-sm" style="color: var(--text-tertiary);">We sent a 6-digit code to your phone</p>
        </div>

        <div class="rounded-3xl p-8 shadow-2xl" style="background: var(--card-bg); border: 1px solid var(--card-border);">
            <div class="mb-6 text-center">
                <p class="text-sm font-medium" style="color: var(--text-secondary);">${phone}</p>
                <p class="text-xs" style="color: var(--text-tertiary);">Email: ${email}</p>
            </div>

            <div id="errorMessage" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm hidden">
                <div class="flex items-start gap-3">
                    <span class="text-lg">⚠️</span>
                    <span class="flex-1"></span>
                </div>
            </div>
            <div id="successMessage" class="mb-4 p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm hidden">
                <div class="flex items-start gap-3">
                    <span class="text-lg">✅</span>
                    <span class="flex-1"></span>
                </div>
            </div>

            <form id="mobileOtpForm" class="space-y-6">
                <div>
                    <label class="block text-xs font-bold mb-3 text-center" style="color: var(--text-primary);">Enter 6-Digit OTP Code</label>
                    <div class="flex gap-2 justify-center">
                        <input type="text" maxlength="1" class="mobile-otp-input w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all" data-index="0">
                        <input type="text" maxlength="1" class="mobile-otp-input w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all" data-index="1">
                        <input type="text" maxlength="1" class="mobile-otp-input w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all" data-index="2">
                        <input type="text" maxlength="1" class="mobile-otp-input w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all" data-index="3">
                        <input type="text" maxlength="1" class="mobile-otp-input w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all" data-index="4">
                        <input type="text" maxlength="1" class="mobile-otp-input w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all" data-index="5">
                    </div>
                </div>

                <div class="text-center">
                    <p class="text-sm font-medium" style="color: var(--text-secondary);">
                        ⏱ Code expires in: <span id="mobileOtpTimer" class="font-bold text-blue-600">5:00</span>
                    </p>
                </div>

                <div id="loadingSpinner" class="hidden text-center py-4">
                    <div class="inline-block">
                        <div class="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
                    </div>
                </div>

                <button type="submit" id="mobileVerifyBtn" class="w-full font-bold py-3 rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 text-sm" style="background: #3b82f6; color: white; border: none; cursor: pointer;">
                    <span class="text-lg">✅</span>
                    <span>Verify Mobile OTP</span>
                </button>
            </form>

            <div class="mt-6 pt-5 border-t border-gray-200 text-center">
                <p class="text-xs mb-3" style="color: var(--text-secondary);">Didn't receive the code?</p>
                <button id="mobileResendBtn" class="text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50 disabled:cursor-not-allowed">
                    Resend OTP (<span id="mobileRemainingAttempts">3</span> attempts remaining)
                </button>
                <p id="mobileResendTimer" class="text-xs mt-2 hidden" style="color: var(--text-tertiary);">Wait <span id="mobileResendCountdown">60</span>s to resend</p>
            </div>

            <div class="mt-4 text-center">
                <a href="#" id="skipMobileVerification" class="text-sm font-medium text-gray-600 hover:text-gray-800">Skip for now</a>
            </div>
        </div>
    </div>
</div>
`;

// Initialize Mobile Verification - DISABLED
window.initializeMobileVerification = function (email, licenceNo, phone) {
    console.log('Mobile Verification - TEMPORARILY DISABLED');
    // Redirect to login instead
    if (window.router) {
        window.router.navigate('login');
    } else {
        window.location.hash = '#login';
        window.initializeLogin();
    }
};

// Setup Mobile OTP Form - DISABLED
function setupMobileOtpForm(email, licenceNo, phone) {
    console.log('Mobile OTP Form - TEMPORARILY DISABLED');
}
*/
