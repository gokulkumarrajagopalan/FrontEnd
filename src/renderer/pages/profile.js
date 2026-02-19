(function () {
    // ============ PROFILE PAGE TEMPLATE ============
    const getProfileTemplate = () => `
        <div style="padding: var(--ds-space-10); max-width: 900px; margin: 0 auto;">
            <!-- Loading State -->
            <div id="profileLoading" style="text-align: center; padding: var(--ds-space-12);">
                <div style="font-size: var(--ds-text-4xl); margin-bottom: var(--ds-space-4); color: var(--ds-primary-500);"><i class="fas fa-spinner fa-spin"></i></div>
                <p style="color: var(--ds-text-tertiary);">Loading profile...</p>
            </div>

            <!-- Profile Content (hidden until loaded) -->
            <div id="profileContent" style="display: none;">
                <!-- Profile Header Card -->
                <div style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-2xl); box-shadow: var(--ds-shadow-sm); overflow: hidden; margin-bottom: var(--ds-space-6); border: 1px solid var(--ds-border-default);">
                    <div style="padding: var(--ds-space-8); border-bottom: 1px solid var(--ds-border-default);">
                        <h2 style="font-size: var(--ds-text-4xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-2);">Profile</h2>
                        <p style="color: var(--ds-text-tertiary); font-size: var(--ds-text-md);">Manage your account information and security</p>
                    </div>
                    
                    <div style="padding: var(--ds-space-8);">
                        <div style="display: flex; align-items: center; gap: var(--ds-space-8);">
                            <div style="width: 96px; height: 96px; border-radius: var(--ds-radius-full); background: linear-gradient(135deg, var(--ds-primary-500) 0%, var(--ds-primary-700) 100%); display: flex; align-items: center; justify-content: center; color: var(--ds-text-inverse); font-size: var(--ds-text-4xl); font-weight: var(--ds-weight-bold); flex-shrink: 0; box-shadow: var(--ds-shadow-md);">
                                <span id="profileInitial">U</span>
                            </div>
                            <div style="flex: 1;">
                                <h3 style="font-size: var(--ds-text-3xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-1);" id="profileName">Loading...</h3>
                                <p style="color: var(--ds-text-tertiary); font-size: var(--ds-text-md); margin-bottom: var(--ds-space-2);">@<span id="profileUsername">username</span></p>
                                <span id="profileRole" class="ds-badge ds-badge-primary">USER</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Account Details Card -->
                <div style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-2xl); box-shadow: var(--ds-shadow-sm); overflow: hidden; margin-bottom: var(--ds-space-6); border: 1px solid var(--ds-border-default);">
                    <div style="padding: var(--ds-space-4) var(--ds-space-8); border-bottom: 1px solid var(--ds-border-default); background: var(--ds-bg-surface-sunken);">
                        <h3 style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary);"><i class="fas fa-id-card mr-2" style="color: var(--ds-primary-500);"></i> Account Details</h3>
                    </div>
                    <div style="padding: var(--ds-space-6) var(--ds-space-8);">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--ds-space-5);">
                            <div style="padding: var(--ds-space-4); background: var(--ds-bg-surface-sunken); border-radius: var(--ds-radius-lg); border: 1px solid var(--ds-border-default);">
                                <label style="display: block; font-size: var(--ds-text-2xs); font-weight: var(--ds-weight-bold); color: var(--ds-text-tertiary); margin-bottom: var(--ds-space-1); text-transform: uppercase; letter-spacing: var(--ds-tracking-wider);">Full Name</label>
                                <p id="detailFullName" style="font-size: var(--ds-text-md); font-weight: var(--ds-weight-semibold); color: var(--ds-text-primary); margin: 0;">—</p>
                            </div>
                            <div style="padding: var(--ds-space-4); background: var(--ds-bg-surface-sunken); border-radius: var(--ds-radius-lg); border: 1px solid var(--ds-border-default);">
                                <label style="display: block; font-size: var(--ds-text-2xs); font-weight: var(--ds-weight-bold); color: var(--ds-text-tertiary); margin-bottom: var(--ds-space-1); text-transform: uppercase; letter-spacing: var(--ds-tracking-wider);">License Number</label>
                                <p id="detailLicenceNo" style="font-size: var(--ds-text-md); font-weight: var(--ds-weight-semibold); color: var(--ds-text-primary); margin: 0;">—</p>
                            </div>
                            <div style="padding: var(--ds-space-4); background: var(--ds-bg-surface-sunken); border-radius: var(--ds-radius-lg); border: 1px solid var(--ds-border-default);">
                                <label style="display: block; font-size: var(--ds-text-2xs); font-weight: var(--ds-weight-bold); color: var(--ds-text-tertiary); margin-bottom: var(--ds-space-1); text-transform: uppercase; letter-spacing: var(--ds-tracking-wider);">Account Created</label>
                                <p id="detailCreatedAt" style="font-size: var(--ds-text-md); font-weight: var(--ds-weight-semibold); color: var(--ds-text-primary); margin: 0;">—</p>
                            </div>
                            <div style="padding: var(--ds-space-4); background: var(--ds-bg-surface-sunken); border-radius: var(--ds-radius-lg); border: 1px solid var(--ds-border-default);">
                                <label style="display: block; font-size: var(--ds-text-2xs); font-weight: var(--ds-weight-bold); color: var(--ds-text-tertiary); margin-bottom: var(--ds-space-1); text-transform: uppercase; letter-spacing: var(--ds-tracking-wider);">Account Status</label>
                                <p id="detailEnabled" style="font-size: var(--ds-text-md); font-weight: var(--ds-weight-semibold); color: var(--ds-text-primary); margin: 0;">—</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Email Section Card (Read-Only) -->
                <div style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-2xl); box-shadow: var(--ds-shadow-sm); overflow: hidden; margin-bottom: var(--ds-space-6); border: 1px solid var(--ds-border-default);">
                    <div style="padding: var(--ds-space-4) var(--ds-space-8); border-bottom: 1px solid var(--ds-border-default); display: flex; align-items: center; justify-content: space-between; background: var(--ds-bg-surface-sunken);">
                        <h3 style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary);"><i class="fas fa-envelope mr-2" style="color: var(--ds-primary-500);"></i> Email Address</h3>
                        <span id="emailVerifiedBadge" class="ds-badge">—</span>
                    </div>
                    <div style="padding: var(--ds-space-6) var(--ds-space-8);">
                        <p id="emailDisplay" style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-semibold); color: var(--ds-text-primary); margin: 0 0 var(--ds-space-1) 0;">—</p>
                        <p style="font-size: var(--ds-text-sm); color: var(--ds-text-tertiary); margin: 0;">Email is used for password change verification</p>
                    </div>
                </div>

                <!-- Mobile Section Card -->
                <div style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-2xl); box-shadow: var(--ds-shadow-sm); overflow: hidden; margin-bottom: var(--ds-space-6); border: 1px solid var(--ds-border-default);">
                    <div style="padding: var(--ds-space-4) var(--ds-space-8); border-bottom: 1px solid var(--ds-border-default); display: flex; align-items: center; justify-content: space-between; background: var(--ds-bg-surface-sunken);">
                        <h3 style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary);"><i class="fas fa-mobile-alt mr-2" style="color: var(--ds-primary-500);"></i> Mobile Number</h3>
                        <span id="mobileVerifiedBadge" class="ds-badge">—</span>
                    </div>
                    <div style="padding: var(--ds-space-6) var(--ds-space-8);">
                        <!-- Display Mode -->
                        <div id="mobileDisplayMode">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <div>
                                    <p id="mobileDisplay" style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-semibold); color: var(--ds-text-primary); margin: 0 0 var(--ds-space-1) 0;">—</p>
                                    <p style="font-size: var(--ds-text-sm); color: var(--ds-text-tertiary); margin: 0;">Mobile changes require SMS OTP verification</p>
                                </div>
                                 <button id="editMobileBtn" class="ds-btn ds-btn-secondary ds-btn-sm">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                            </div>
                        </div>
                        <!-- Edit Mode -->
                        <div id="mobileEditMode" style="display: none;">
                            <div id="mobileEditStatus" style="display: none; padding: var(--ds-space-3) var(--ds-space-4); border-radius: var(--ds-radius-md); margin-bottom: var(--ds-space-4); font-size: var(--ds-text-sm);"></div>
                            <!-- Step 1: Enter New Mobile -->
                            <div id="mobileStep1">
                                <label style="display: block; font-size: var(--ds-text-sm); font-weight: var(--ds-weight-bold); color: var(--ds-text-secondary); margin-bottom: var(--ds-space-2);">New Mobile Number</label>
                                <div style="display: flex; gap: var(--ds-space-2);">
                                    <select id="countryCodeSelect" class="ds-input" style="width: 120px;">
                                        <option value="+91">+91 (India)</option>
                                        <option value="+971">+971 (UAE)</option>
                                        <option value="+1">+1 (USA)</option>
                                        <option value="+44">+44 (UK)</option>
                                        <option value="+61">+61 (Australia)</option>
                                        <option value="+86">+86 (China)</option>
                                        <option value="+81">+81 (Japan)</option>
                                        <option value="+27">+27 (S. Africa)</option>
                                        <option value="+33">+33 (France)</option>
                                        <option value="+49">+49 (Germany)</option>
                                        <option value="+39">+39 (Italy)</option>
                                        <option value="+7">+7 (Russia)</option>
                                        <option value="+55">+55 (Brazil)</option>
                                        <option value="+52">+52 (Mexico)</option>
                                        <option value="+34">+34 (Spain)</option>
                                        <option value="+31">+31 (Netherlands)</option>
                                        <option value="+46">+46 (Sweden)</option>
                                        <option value="+47">+47 (Norway)</option>
                                        <option value="+45">+45 (Denmark)</option>
                                        <option value="+358">+358 (Finland)</option>
                                        <option value="+48">+48 (Poland)</option>
                                        <option value="+41">+41 (Switzerland)</option>
                                        <option value="+43">+43 (Austria)</option>
                                        <option value="+32">+32 (Belgium)</option>
                                        <option value="+351">+351 (Portugal)</option>
                                        <option value="+90">+90 (Turkey)</option>
                                        <option value="+966">+966 (Saudi Arabia)</option>
                                        <option value="+974">+974 (Qatar)</option>
                                        <option value="+973">+973 (Bahrain)</option>
                                        <option value="+968">+968 (Oman)</option>
                                        <option value="+965">+965 (Kuwait)</option>
                                        <option value="+962">+962 (Jordan)</option>
                                        <option value="+961">+961 (Lebanon)</option>
                                        <option value="+20">+20 (Egypt)</option>
                                        <option value="+234">+234 (Nigeria)</option>
                                        <option value="+254">+254 (Kenya)</option>
                                        <option value="+60">+60 (Malaysia)</option>
                                        <option value="+65">+65 (Singapore)</option>
                                        <option value="+66">+66 (Thailand)</option>
                                        <option value="+62">+62 (Indonesia)</option>
                                        <option value="+63">+63 (Philippines)</option>
                                        <option value="+82">+82 (S. Korea)</option>
                                        <option value="+852">+852 (Hong Kong)</option>
                                        <option value="+886">+886 (Taiwan)</option>
                                        <option value="+64">+64 (New Zealand)</option>
                                        <option value="+92">+92 (Pakistan)</option>
                                        <option value="+94">+94 (Sri Lanka)</option>
                                        <option value="+880">+880 (Bangladesh)</option>
                                        <option value="+977">+977 (Nepal)</option>
                                        <option value="+84">+84 (Vietnam)</option>
                                        <option value="+57">+57 (Colombia)</option>
                                        <option value="+56">+56 (Chile)</option>
                                        <option value="+54">+54 (Argentina)</option>
                                        <option value="+51">+51 (Peru)</option>
                                        <option value="+353">+353 (Ireland)</option>
                                        <option value="+30">+30 (Greece)</option>
                                        <option value="+36">+36 (Hungary)</option>
                                        <option value="+420">+420 (Czech Rep.)</option>
                                        <option value="+40">+40 (Romania)</option>
                                        <option value="+380">+380 (Ukraine)</option>
                                        <option value="+972">+972 (Israel)</option>
                                    </select>
                                    <input type="tel" id="newMobileInput" class="ds-input" style="flex: 1;" placeholder="Enter mobile number">
                                    <button id="sendMobileOtpBtn" class="ds-btn ds-btn-primary">
                                        Send OTP
                                    </button>
                                    <button id="cancelMobileEditBtn" class="ds-btn ds-btn-secondary">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                            <!-- Step 2: Enter OTP -->
                            <div id="mobileStep2" style="display: none;">
                                <p style="font-size: var(--ds-text-sm); color: var(--ds-text-secondary); margin-bottom: var(--ds-space-3);">OTP sent to your new mobile number. Enter the code below:</p>
                                <div style="display: flex; gap: var(--ds-space-3);">
                                    <input type="text" id="mobileOtpInput" maxlength="6" class="ds-input" style="flex: 1; font-size: var(--ds-text-xl); font-weight: var(--ds-weight-bold); letter-spacing: var(--ds-tracking-widest); text-align: center;" placeholder="000000">
                                    <button id="verifyMobileOtpBtn" class="ds-btn ds-btn-success">
                                        Verify & Update
                                    </button>
                                    <button id="cancelMobileOtpBtn" class="ds-btn ds-btn-secondary">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Security Card: Password -->
                <div style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-2xl); box-shadow: var(--ds-shadow-sm); overflow: hidden; margin-bottom: var(--ds-space-6); border: 1px solid var(--ds-border-default);">
                    <div style="padding: var(--ds-space-4) var(--ds-space-8); border-bottom: 1px solid var(--ds-border-default); background: var(--ds-bg-surface-sunken);">
                        <h3 style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary);"><i class="fas fa-shield-alt mr-2" style="color: var(--ds-primary-500);"></i> Security</h3>
                    </div>
                    <div style="padding: var(--ds-space-6) var(--ds-space-8);">
                        <!-- Display Mode -->
                        <div id="passwordDisplayMode">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <div>
                                    <p style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-semibold); color: var(--ds-text-primary); margin: 0 0 var(--ds-space-1) 0;">Password</p>
                                    <p style="font-size: var(--ds-text-sm); color: var(--ds-text-tertiary); margin: 0;">••••••••••••</p>
                                </div>
                                 <button id="changePasswordBtn" class="ds-btn ds-btn-secondary" style="background: var(--ds-warning-50); color: var(--ds-warning-700); border-color: var(--ds-warning-200);">
                                    <i class="fas fa-key"></i> Change Password
                                </button>
                            </div>
                        </div>
                        <!-- Edit Mode -->
                        <div id="passwordEditMode" style="display: none;">
                            <div id="passwordEditStatus" style="display: none; padding: var(--ds-space-3) var(--ds-space-4); border-radius: var(--ds-radius-md); margin-bottom: var(--ds-space-4); font-size: var(--ds-text-sm);"></div>
                            <!-- Step 1: Enter current password only -->
                            <div id="pwdStep1">
                                <div style="display: grid; gap: var(--ds-space-4); max-width: 400px;">
                                    <div>
                                        <label style="display: block; font-size: var(--ds-text-sm); font-weight: var(--ds-weight-bold); color: var(--ds-text-secondary); margin-bottom: var(--ds-space-2);">Current Password</label>
                                        <input type="password" id="currentPasswordInput" class="ds-input" placeholder="Enter current password">
                                    </div>
                                    <div style="display: flex; gap: var(--ds-space-3); margin-top: var(--ds-space-2);">
                                        <button id="verifyCurrentPwdBtn" class="ds-btn ds-btn-primary">
                                            Verify Password
                                        </button>
                                        <button id="cancelPasswordBtn" class="ds-btn ds-btn-secondary">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <!-- Step 2: Enter new password -->
                            <div id="pwdStep2" style="display: none;">
                                <div style="display: grid; gap: var(--ds-space-4); max-width: 400px;">
                                     <div style="padding: var(--ds-space-3) var(--ds-space-4); background: var(--ds-success-50); border-radius: var(--ds-radius-md); border: 1px solid var(--ds-success-200); display: flex; align-items: center; gap: var(--ds-space-3);">
                                        <i class="fas fa-check-circle" style="color: var(--ds-success-600);"></i>
                                        <p style="font-size: var(--ds-text-sm); color: var(--ds-success-700); margin: 0;">Current password verified successfully</p>
                                    </div>
                                    <div>
                                        <label style="display: block; font-size: var(--ds-text-sm); font-weight: var(--ds-weight-bold); color: var(--ds-text-secondary); margin-bottom: var(--ds-space-2);">New Password</label>
                                        <input type="password" id="newPasswordInput" class="ds-input" placeholder="Enter new password (min 8 chars)">
                                    </div>
                                    <div>
                                        <label style="display: block; font-size: var(--ds-text-sm); font-weight: var(--ds-weight-bold); color: var(--ds-text-secondary); margin-bottom: var(--ds-space-2);">Confirm New Password</label>
                                        <input type="password" id="confirmPasswordInput" class="ds-input" placeholder="Confirm new password">
                                    </div>
                                    <div style="display: flex; gap: var(--ds-space-3); margin-top: var(--ds-space-2);">
                                        <button id="sendPwdOtpBtn" class="ds-btn ds-btn-primary">
                                            Submit & Send OTP
                                        </button>
                                        <button id="cancelPwdStep2Btn" class="ds-btn ds-btn-secondary">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <!-- Step 3: Email OTP verification -->
                            <div id="pwdStep3" style="display: none;">
                                <div style="max-width: 400px;">
                                     <div style="padding: var(--ds-space-4); background: var(--ds-info-50); border-radius: var(--ds-radius-lg); border: 1px solid var(--ds-info-200); margin-bottom: var(--ds-space-4); display: flex; gap: var(--ds-space-3);">
                                        <i class="fas fa-envelope-open-text" style="color: var(--ds-info-600); margin-top: 3px;"></i>
                                        <p style="font-size: var(--ds-text-sm); color: var(--ds-info-700); margin: 0;">OTP sent to <strong id="pwdOtpEmail">your email</strong>. Enter the 6-digit code to confirm password change.</p>
                                    </div>
                                    <label style="display: block; font-size: var(--ds-text-sm); font-weight: var(--ds-weight-bold); color: var(--ds-text-secondary); margin-bottom: var(--ds-space-2);">Enter Email OTP</label>
                                    <div style="display: flex; gap: var(--ds-space-3);">
                                        <input type="text" id="pwdOtpInput" maxlength="6" class="ds-input" style="flex: 1; font-size: var(--ds-text-xl); font-weight: var(--ds-weight-bold); letter-spacing: var(--ds-tracking-widest); text-align: center;" placeholder="000000">
                                        <button id="verifyPwdOtpBtn" class="ds-btn ds-btn-success">
                                            Confirm Change
                                        </button>
                                        <button id="cancelPwdOtpBtn" class="ds-btn ds-btn-secondary">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // ============ STATE ============
    let profileData = null;
    let pendingNewMobile = null;
    let pendingCountryCode = null;
    let pendingCurrentPassword = null;
    let pendingNewPassword = null;

    // ============ INITIALIZE ============
    window.initializeProfile = function () {
        console.log('Initializing Profile Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getProfileTemplate();
            fetchAndPopulateProfile();
        }
    };

    // ============ FETCH /me AND POPULATE ============
    async function fetchAndPopulateProfile() {
        const loading = document.getElementById('profileLoading');
        const profileContent = document.getElementById('profileContent');

        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                showInlineError('profileLoading', 'Not authenticated. Please login again.');
                return;
            }

            const response = await fetch(window.apiConfig.getUrl('/auth/me'), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Failed to fetch profile');
            }

            profileData = result.data;
            populateProfile(profileData);

            if (loading) loading.style.display = 'none';
            if (profileContent) profileContent.style.display = 'block';

            setupAllEventHandlers();

        } catch (error) {
            console.error('Profile fetch error:', error);
            if (loading) {
                loading.innerHTML = `
                    <div style="font-size: 2rem; margin-bottom: 1rem;">❌</div>
                    <p style="color: #ef4444; font-weight: 600;">Failed to load profile</p>
                    <p style="color: var(--text-tertiary); font-size: 0.875rem;">${error.message}</p>
                    <button onclick="fetchAndPopulateProfile()" style="margin-top: 1rem; padding: 0.5rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;">Retry</button>
                `;
            }
        }
    }

    // Make retry available globally
    window.fetchAndPopulateProfile = fetchAndPopulateProfile;

    // ============ POPULATE UI WITH DATA ============
    function populateProfile(data) {
        setText('profileInitial', (data.fullName || data.username || 'U')[0].toUpperCase());
        setText('profileName', data.fullName || data.username || 'User');
        setText('profileUsername', data.username || '—');

        const roleBadge = document.getElementById('profileRole');
        if (roleBadge) {
            const role = data.role || 'USER';
            roleBadge.textContent = role;
            const colors = { ADMIN: { bg: '#dcfce7', text: '#15803d' }, MANAGER: { bg: '#fef3c7', text: '#b45309' }, USER: { bg: '#dbeafe', text: '#1d4ed8' } };
            const c = colors[role] || colors.USER;
            roleBadge.style.background = c.bg;
            roleBadge.style.color = c.text;
        }

        setText('detailFullName', data.fullName || '—');
        setText('detailLicenceNo', data.licenceNo || '—');
        setText('detailCreatedAt', formatDate(data.createdAt));

        const enabledEl = document.getElementById('detailEnabled');
        if (enabledEl) {
            enabledEl.innerHTML = data.enabled
                ? '<span style="color: #16a34a; display: flex; align-items: center; gap: 0.25rem;"><i class="fas fa-check-circle"></i> Active</span>'
                : '<span style="color: #dc2626; display: flex; align-items: center; gap: 0.25rem;"><i class="fas fa-times-circle"></i> Disabled</span>';
        }

        // Email
        setText('emailDisplay', data.email || '—');
        setVerifiedBadge('emailVerifiedBadge', data.emailVerified);

        // Mobile
        const mobileText = data.mobile
            ? (data.countryCode ? `${data.countryCode} ${data.mobile}` : data.mobile)
            : 'Not set';
        setText('mobileDisplay', mobileText);
        setVerifiedBadge('mobileVerifiedBadge', data.mobileVerified);

        // Pre-select country code
        const ccSelect = document.getElementById('countryCodeSelect');
        if (ccSelect && data.countryCode) {
            const cc = data.countryCode.startsWith('+') ? data.countryCode : `+${data.countryCode}`;
            ccSelect.value = cc;
        }

        // Update localStorage with latest data
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        currentUser.email = data.email;
        currentUser.fullName = data.fullName;
        currentUser.licenceNo = data.licenceNo;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }

    // ============ EVENT HANDLERS SETUP ============
    function setupAllEventHandlers() {
        // Mobile Edit
        addClick('editMobileBtn', () => showMobileEdit());
        addClick('cancelMobileEditBtn', () => hideMobileEdit());
        addClick('cancelMobileOtpBtn', () => hideMobileEdit());
        addClick('sendMobileOtpBtn', () => handleSendMobileOtp());
        addClick('verifyMobileOtpBtn', () => handleVerifyMobileOtp());

        // Password (3-step: verify current → new password → email OTP)
        addClick('changePasswordBtn', () => showPasswordEdit());
        addClick('cancelPasswordBtn', () => hidePasswordEdit());
        addClick('verifyCurrentPwdBtn', () => handleVerifyCurrentPassword());
        addClick('sendPwdOtpBtn', () => handleSendPwdOtp());
        addClick('cancelPwdStep2Btn', () => hidePasswordEdit());
        addClick('verifyPwdOtpBtn', () => handleVerifyPwdOtp());
        addClick('cancelPwdOtpBtn', () => hidePasswordEdit());

        // OTP input: digits only 
        setupOtpInput('mobileOtpInput');
        setupOtpInput('pwdOtpInput');
    }

    // ============ MOBILE EDIT FLOW ============
    function showMobileEdit() {
        hide('mobileDisplayMode');
        show('mobileEditMode');
        show('mobileStep1');
        hide('mobileStep2');
        hideStatus('mobileEditStatus');
        const input = document.getElementById('newMobileInput');
        if (input) { input.value = ''; input.focus(); }
    }

    function hideMobileEdit() {
        hide('mobileEditMode');
        show('mobileDisplayMode');
        pendingNewMobile = null;
        pendingCountryCode = null;
    }

    async function handleSendMobileOtp() {
        const mobile = document.getElementById('newMobileInput')?.value.trim().replace(/\D/g, '');
        const countryCode = document.getElementById('countryCodeSelect')?.value || '+91';

        if (!mobile || mobile.length < 7 || mobile.length > 15) {
            showStatus('mobileEditStatus', 'Please enter a valid mobile number (7-15 digits)', 'error');
            return;
        }

        pendingNewMobile = mobile;
        pendingCountryCode = countryCode;
        const btn = document.getElementById('sendMobileOtpBtn');
        setButtonLoading(btn, true, 'Sending...');

        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(window.apiConfig.getUrl('/auth/request-mobile-change'), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile, countryCode })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showStatus('mobileEditStatus', 'OTP sent to your new mobile number. Enter the code below.', 'success');
                hide('mobileStep1');
                show('mobileStep2');
                document.getElementById('mobileOtpInput')?.focus();
            } else {
                showStatus('mobileEditStatus', `<i class="fas fa-exclamation-circle"></i> ${result.message || 'Failed to send OTP'}`, 'error');
            }
        } catch (error) {
            showStatus('mobileEditStatus', `<i class="fas fa-exclamation-circle"></i> Connection error: ${error.message}`, 'error');
        } finally {
            setButtonLoading(btn, false, 'Send OTP');
        }
    }

    async function handleVerifyMobileOtp() {
        const otp = document.getElementById('mobileOtpInput')?.value.trim();
        if (!otp || otp.length !== 6) {
            showStatus('mobileEditStatus', 'Please enter the 6-digit OTP', 'error');
            return;
        }

        const btn = document.getElementById('verifyMobileOtpBtn');
        setButtonLoading(btn, true, 'Verifying...');

        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(window.apiConfig.getUrl('/auth/verify-mobile-change'), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ otp, mobile: pendingNewMobile, countryCode: pendingCountryCode })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showStatus('mobileEditStatus', 'Mobile number updated successfully!', 'success');
                profileData.mobile = pendingNewMobile;
                profileData.countryCode = pendingCountryCode;
                setText('mobileDisplay', `${pendingCountryCode} ${pendingNewMobile}`);
                setVerifiedBadge('mobileVerifiedBadge', true);
                setTimeout(() => hideMobileEdit(), 2000);
            } else {
                showStatus('mobileEditStatus', `<i class="fas fa-exclamation-circle"></i> ${result.message || 'Invalid or expired OTP'}`, 'error');
            }
        } catch (error) {
            showStatus('mobileEditStatus', `<i class="fas fa-exclamation-circle"></i> Connection error: ${error.message}`, 'error');
        } finally {
            setButtonLoading(btn, false, 'Verify & Update');
        }
    }

    // ============ PASSWORD CHANGE (3-step: verify current → new password → email OTP) ============
    function showPasswordEdit() {
        hide('passwordDisplayMode');
        show('passwordEditMode');
        show('pwdStep1');
        hide('pwdStep2');
        hide('pwdStep3');
        hideStatus('passwordEditStatus');
        clearPasswordFields();
        document.getElementById('currentPasswordInput')?.focus();
    }

    function hidePasswordEdit() {
        hide('passwordEditMode');
        show('passwordDisplayMode');
        clearPasswordFields();
        pendingCurrentPassword = null;
        pendingNewPassword = null;
    }

    function clearPasswordFields() {
        const fields = ['currentPasswordInput', 'newPasswordInput', 'confirmPasswordInput', 'pwdOtpInput'];
        fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    }

    // Step 1: Validate current password only
    async function handleVerifyCurrentPassword() {
        const currentPass = document.getElementById('currentPasswordInput')?.value.trim();

        if (!currentPass) {
            showStatus('passwordEditStatus', 'Please enter your current password', 'error');
            return;
        }

        const btn = document.getElementById('verifyCurrentPwdBtn');
        setButtonLoading(btn, true, 'Verifying...');

        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(window.apiConfig.getUrl('/auth/validate-current-password'), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: currentPass })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                pendingCurrentPassword = currentPass;
                hideStatus('passwordEditStatus');
                hide('pwdStep1');
                show('pwdStep2');
                document.getElementById('newPasswordInput')?.focus();
            } else {
                showStatus('passwordEditStatus', `<i class="fas fa-exclamation-circle"></i> ${result.message || 'Current password is incorrect'}`, 'error');
            }
        } catch (error) {
            showStatus('passwordEditStatus', `<i class="fas fa-exclamation-circle"></i> Connection error: ${error.message}`, 'error');
        } finally {
            setButtonLoading(btn, false, 'Verify Password');
        }
    }

    // Step 2: Validate new password and send email OTP
    async function handleSendPwdOtp() {
        const newPass = document.getElementById('newPasswordInput')?.value.trim();
        const confirmPass = document.getElementById('confirmPasswordInput')?.value.trim();

        if (!newPass || newPass.length < 8) {
            showStatus('passwordEditStatus', 'New password must be at least 8 characters', 'error');
            return;
        }
        if (newPass !== confirmPass) {
            showStatus('passwordEditStatus', 'Passwords do not match', 'error');
            return;
        }
        if (pendingCurrentPassword === newPass) {
            showStatus('passwordEditStatus', 'New password must be different from current password', 'error');
            return;
        }

        pendingNewPassword = newPass;

        const btn = document.getElementById('sendPwdOtpBtn');
        setButtonLoading(btn, true, 'Sending OTP...');

        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(window.apiConfig.getUrl('/auth/change-password'), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: pendingCurrentPassword, newPassword: newPass })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                const maskedEmail = result.data?.email || profileData?.email || 'your email';
                setText('pwdOtpEmail', maskedEmail);
                showStatus('passwordEditStatus', 'OTP sent to your email.', 'success');
                hide('pwdStep2');
                show('pwdStep3');
                document.getElementById('pwdOtpInput')?.focus();
            } else {
                showStatus('passwordEditStatus', `<i class="fas fa-exclamation-circle"></i> ${result.message || 'Failed to send OTP'}`, 'error');
            }
        } catch (error) {
            showStatus('passwordEditStatus', `<i class="fas fa-exclamation-circle"></i> Connection error: ${error.message}`, 'error');
        } finally {
            setButtonLoading(btn, false, 'Submit & Send OTP');
        }
    }

    // Step 3: Verify OTP and apply password change
    async function handleVerifyPwdOtp() {
        const otp = document.getElementById('pwdOtpInput')?.value.trim();
        if (!otp || otp.length !== 6) {
            showStatus('passwordEditStatus', 'Please enter the 6-digit OTP', 'error');
            return;
        }

        if (!pendingCurrentPassword || !pendingNewPassword) {
            showStatus('passwordEditStatus', 'Session expired. Please start over.', 'error');
            setTimeout(() => { hidePasswordEdit(); showPasswordEdit(); }, 1500);
            return;
        }

        const btn = document.getElementById('verifyPwdOtpBtn');
        setButtonLoading(btn, true, 'Updating...');

        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(window.apiConfig.getUrl('/auth/verify-password-change'), {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    otp,
                    currentPassword: pendingCurrentPassword,
                    newPassword: pendingNewPassword
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showStatus('passwordEditStatus', 'Password updated successfully!', 'success');
                pendingCurrentPassword = null;
                pendingNewPassword = null;
                setTimeout(() => hidePasswordEdit(), 2000);
            } else {
                showStatus('passwordEditStatus', `<i class="fas fa-exclamation-circle"></i> ${result.message || 'Invalid or expired OTP'}`, 'error');
            }
        } catch (error) {
            showStatus('passwordEditStatus', `<i class="fas fa-exclamation-circle"></i> Connection error: ${error.message}`, 'error');
        } finally {
            setButtonLoading(btn, false, 'Confirm Change');
        }
    }

    // ============ UTILITY HELPERS ============
    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function show(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = '';
    }

    function hide(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    }

    function addClick(id, handler) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', handler);
    }

    function showStatus(id, message, type) {
        const el = document.getElementById(id);
        if (!el) return;
        const styles = {
            success: { bg: '#dcfce7', text: '#166534', border: '#22c55e' },
            error: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
            info: { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' }
        };
        const s = styles[type] || styles.info;
        el.style.display = 'block';
        el.style.background = s.bg;
        el.style.color = s.text;
        el.style.borderLeft = `4px solid ${s.border}`;
        el.textContent = message;
    }

    function hideStatus(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    }

    function setVerifiedBadge(id, verified) {
        const el = document.getElementById(id);
        if (!el) return;
        if (verified) {
            el.innerHTML = '<i class="fas fa-check-circle"></i> Verified';
            el.style.background = '#dcfce7';
            el.style.color = '#15803d';
        } else {
            el.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Not Verified';
            el.style.background = '#fef3c7';
            el.style.color = '#92400e';
        }
    }

    function setButtonLoading(btn, loading, text) {
        if (!btn) return;
        btn.disabled = loading;
        btn.textContent = text;
        btn.style.opacity = loading ? '0.6' : '1';
    }

    function setupOtpInput(id) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
            });
        }
    }

    function formatDate(dateStr) {
        if (!dateStr) return '—';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch { return '—'; }
    }

    function showInlineError(containerId, message) {
        const el = document.getElementById(containerId);
        if (el) {
            el.innerHTML = `
                <div style="font-size: 2rem; margin-bottom: 1rem; color: #ef4444;"><i class="fas fa-times-circle"></i></div>
                <p style="color: #ef4444; font-weight: 600;">${message}</p>
            `;
        }
    }
})();
