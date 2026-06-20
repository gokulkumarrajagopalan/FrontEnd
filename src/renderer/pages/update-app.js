(function () {
    // Update channels emitted by the main process (electron-updater).
    const UPDATE_CHANNELS = [
        'update-message', 'update-available', 'update-not-available',
        'update-error', 'download-progress', 'update-downloaded'
    ];

    const AUTO_KEY = 'autoUpdateCheck';

    let installedVersion = '—';
    let latestVersion = null;     // set when an update is found
    let listenersBound = false;

    const getUpdateAppTemplate = () => `
        <div style="padding: var(--ds-space-6); width: 100%; box-sizing: border-box;">
            <div style="background: var(--ds-bg-surface); border-radius: var(--ds-radius-xl); box-shadow: var(--ds-shadow-sm); overflow: hidden; border: 1px solid var(--ds-border-default);">
                <div style="padding: var(--ds-space-5) var(--ds-space-6); border-bottom: 1px solid var(--ds-border-default); display: flex; align-items: center; gap: var(--ds-space-4); background: var(--ds-bg-surface-sunken);">
                    <div style="width: 44px; height: 44px; background: var(--ds-primary-50); color: var(--ds-primary-500); border-radius: var(--ds-radius-lg); display: flex; align-items: center; justify-content: center; font-size: var(--ds-text-xl); border: 1px solid var(--ds-primary-100);">
                        <i class="fas fa-arrow-alt-circle-up"></i>
                    </div>
                    <div>
                        <h2 style="font-size: var(--ds-text-2xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-1);">Update App</h2>
                        <p style="color: var(--ds-text-tertiary); font-size: var(--ds-text-sm);">Check for updates and keep your app current</p>
                    </div>
                </div>

                <div style="padding: var(--ds-space-10) var(--ds-space-6); text-align: center;">
                    <div id="updateIcon" style="width: 72px; height: 72px; margin: 0 auto var(--ds-space-6); background: linear-gradient(135deg, var(--ds-success-500) 0%, var(--ds-success-700) 100%); border-radius: var(--ds-radius-full); display: flex; align-items: center; justify-content: center; color: var(--ds-text-inverse); font-size: var(--ds-text-4xl); box-shadow: var(--ds-shadow-md);">
                        <i id="updateIconGlyph" class="fas fa-check"></i>
                    </div>

                    <h3 id="updateHeading" style="font-size: var(--ds-text-3xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-2);">Check for updates</h3>
                    <p id="updateSubtext" style="color: var(--ds-text-tertiary); font-size: var(--ds-text-md); margin-bottom: var(--ds-space-8);">Click below to see if a newer version is available.</p>

                    <!-- Download progress (hidden until an update is downloading) -->
                    <div id="updateProgressWrap" style="display: none; max-width: 420px; margin: 0 auto var(--ds-space-8);">
                        <div style="height: 10px; background: var(--ds-bg-surface-sunken); border-radius: 999px; overflow: hidden; border: 1px solid var(--ds-border-default);">
                            <div id="updateProgressBar" style="height: 100%; width: 0%; background: linear-gradient(90deg, var(--ds-primary-500), var(--ds-primary-700)); transition: width 0.25s ease;"></div>
                        </div>
                        <div id="updateProgressText" style="margin-top: var(--ds-space-2); font-size: var(--ds-text-sm); color: var(--ds-text-tertiary);">0%</div>
                    </div>

                    <div style="background: var(--ds-bg-surface-sunken); padding: var(--ds-space-6); border-radius: var(--ds-radius-xl); margin-bottom: var(--ds-space-8); text-align: left; border: 1px solid var(--ds-border-default);">
                        <h4 style="font-size: var(--ds-text-md); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-4); display: flex; align-items: center; gap: var(--ds-space-2);">
                            <i class="fas fa-list-ul" style="color: var(--ds-primary-500);"></i> Version Details
                        </h4>
                        <div style="display: grid; gap: 0;">
                            <div style="display: flex; justify-content: space-between; padding: var(--ds-space-3) 0;">
                                <span style="color: var(--ds-text-tertiary); font-size: var(--ds-text-sm);">Installed Version</span>
                                <span id="installedVersion" style="color: var(--ds-text-primary); font-weight: var(--ds-weight-semibold); font-size: var(--ds-text-sm);">—</span>
                            </div>
                            <div id="latestVersionRow" style="display: none; justify-content: space-between; padding: var(--ds-space-3) 0; border-top: 1px solid var(--ds-border-default);">
                                <span style="color: var(--ds-text-tertiary); font-size: var(--ds-text-sm);">Latest Version</span>
                                <span id="latestVersion" style="color: var(--ds-primary-600); font-weight: var(--ds-weight-bold); font-size: var(--ds-text-sm);">—</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: var(--ds-space-3) 0; border-top: 1px solid var(--ds-border-default);">
                                <span style="color: var(--ds-text-tertiary); font-size: var(--ds-text-sm);">Last Checked</span>
                                <span id="lastChecked" style="color: var(--ds-text-primary); font-weight: var(--ds-weight-semibold); font-size: var(--ds-text-sm);">Never</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: var(--ds-space-3) 0; border-top: 1px solid var(--ds-border-default);">
                                <span style="color: var(--ds-text-tertiary); font-size: var(--ds-text-sm);">Update Channel</span>
                                <span style="color: var(--ds-text-primary); font-weight: var(--ds-weight-semibold); font-size: var(--ds-text-sm); display: flex; align-items: center; gap: var(--ds-space-2);">
                                    <i class="fas fa-shield-alt" style="font-size: var(--ds-text-xs); color: var(--ds-success-500);"></i> Stable
                                </span>
                            </div>
                        </div>
                    </div>

                    <button id="checkUpdateBtn" class="ds-btn ds-btn-primary">
                        <i class="fas fa-sync-alt"></i> Check for Updates
                    </button>

                    <div style="margin-top: var(--ds-space-8); padding-top: var(--ds-space-6); border-top: 1px solid var(--ds-border-default);">
                        <label style="display: flex; align-items: center; justify-content: center; gap: var(--ds-space-3); cursor: pointer;">
                            <input id="autoUpdateChk" type="checkbox" style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--ds-primary-500);">
                            <span style="color: var(--ds-text-tertiary); font-size: var(--ds-text-sm);">Automatically check for updates in the background</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `;

    // ── UI helpers ──
    const $ = (id) => document.getElementById(id);

    function setIcon(color, glyph, spin = false) {
        const icon = $('updateIcon');
        const glyphEl = $('updateIconGlyph');
        if (icon) icon.style.background = color;
        if (glyphEl) glyphEl.className = `fas ${glyph}${spin ? ' fa-spin' : ''}`;
    }

    const COLORS = {
        success: 'linear-gradient(135deg, var(--ds-success-500) 0%, var(--ds-success-700) 100%)',
        primary: 'linear-gradient(135deg, var(--ds-primary-500) 0%, var(--ds-primary-700) 100%)',
        danger: 'linear-gradient(135deg, var(--ds-danger-500) 0%, var(--ds-danger-700) 100%)'
    };

    function setHeading(title, subtext) {
        if ($('updateHeading')) $('updateHeading').textContent = title;
        if ($('updateSubtext')) $('updateSubtext').textContent = subtext;
    }

    function setButton(label, { disabled = false, icon = 'fa-sync-alt', onClick = null } = {}) {
        const btn = $('checkUpdateBtn');
        if (!btn) return;
        btn.innerHTML = `<i class="fas ${icon}"></i> ${label}`;
        btn.disabled = disabled;
        btn.classList.toggle('btn-loading', disabled);
        // Replace click handler.
        btn.onclick = onClick || onCheckClick;
    }

    function showProgress(show) {
        if ($('updateProgressWrap')) $('updateProgressWrap').style.display = show ? 'block' : 'none';
    }

    function setProgress(percent) {
        const p = Math.max(0, Math.min(100, Math.round(percent || 0)));
        if ($('updateProgressBar')) $('updateProgressBar').style.width = p + '%';
        if ($('updateProgressText')) $('updateProgressText').textContent = p + '%';
    }

    function stampLastChecked() {
        const now = new Date();
        const txt = now.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
        if ($('lastChecked')) $('lastChecked').textContent = txt;
        localStorage.setItem('lastUpdateCheck', now.toISOString());
    }

    function setLatestVersion(v) {
        latestVersion = v;
        if ($('latestVersion')) $('latestVersion').textContent = `v${v}`;
        if ($('latestVersionRow')) $('latestVersionRow').style.display = 'flex';
    }

    // ── States ──
    function stateIdleUpToDate() {
        setIcon(COLORS.success, 'fa-check');
        setHeading("You're up to date!", `Talliffy v${installedVersion} is the latest version available`);
        showProgress(false);
        setButton('Check for Updates', { icon: 'fa-sync-alt' });
    }

    function stateChecking() {
        setIcon(COLORS.primary, 'fa-sync-alt', true);
        setHeading('Checking for updates…', 'Contacting the update server, please wait.');
        showProgress(false);
        setButton('Checking…', { disabled: true, icon: 'fa-spinner' });
    }

    function stateAvailable(version) {
        if (version) setLatestVersion(version);
        setIcon(COLORS.primary, 'fa-cloud-download-alt');
        setHeading('Update available', `Downloading v${version || ''}…`);
        showProgress(true);
        setProgress(0);
        setButton('Downloading…', { disabled: true, icon: 'fa-spinner' });
    }

    function stateDownloaded(version) {
        if (version) setLatestVersion(version);
        setIcon(COLORS.success, 'fa-box-open');
        setHeading('Update ready to install', `v${version || ''} has been downloaded. Restart to apply it.`);
        showProgress(false);
        setButton('Restart & Install', {
            icon: 'fa-rotate-right',
            onClick: () => {
                if (window.electronAPI && window.electronAPI.send) {
                    window.electronAPI.send('quit-and-install-update');
                }
            }
        });
    }

    function stateError(message) {
        setIcon(COLORS.danger, 'fa-triangle-exclamation');
        setHeading('Update check failed', message || 'Could not reach the update server. Try again later.');
        showProgress(false);
        setButton('Retry', { icon: 'fa-sync-alt' });
    }

    // ── Actions ──
    let checkTimeout = null;

    function onCheckClick() {
        if (!window.electronAPI || !window.electronAPI.send) {
            stateError('Updater is unavailable in this environment.');
            return;
        }
        stateChecking();
        stampLastChecked();
        window.electronAPI.send('check-for-updates');

        // Safety: if no event arrives (e.g. dev mode or network stall), recover.
        clearTimeout(checkTimeout);
        checkTimeout = setTimeout(() => {
            // Only fall back if we're still in the "checking" state.
            if ($('updateHeading') && $('updateHeading').textContent.startsWith('Checking')) {
                stateIdleUpToDate();
            }
        }, 20000);
    }

    function bindUpdateListeners() {
        if (listenersBound || !window.electronAPI || !window.electronAPI.on) return;

        // Clear any stale listeners from a previous mount.
        if (window.electronAPI.removeListener) {
            UPDATE_CHANNELS.forEach((c) => window.electronAPI.removeListener(c));
        }

        window.electronAPI.on('update-available', (info) => {
            clearTimeout(checkTimeout);
            stateAvailable(info && info.version);
        });

        window.electronAPI.on('download-progress', (p) => {
            showProgress(true);
            setProgress(p && p.percent);
        });

        window.electronAPI.on('update-downloaded', (info) => {
            clearTimeout(checkTimeout);
            setProgress(100);
            stateDownloaded(info && info.version);
            if (window.notificationService && window.notificationService.system) {
                window.notificationService.system('Talliffy — Update ready',
                    `v${(info && info.version) || ''} downloaded. Restart to install.`);
            }
        });

        window.electronAPI.on('update-not-available', () => {
            clearTimeout(checkTimeout);
            stateIdleUpToDate();
        });

        window.electronAPI.on('update-error', (err) => {
            clearTimeout(checkTimeout);
            stateError(typeof err === 'string' ? err : (err && err.message));
        });

        // Dev mode / informational messages from main.
        window.electronAPI.on('update-message', (payload) => {
            const text = payload && payload.text ? payload.text : '';
            if (text && /dev|skip/i.test(text)) {
                clearTimeout(checkTimeout);
                setIcon(COLORS.primary, 'fa-info-circle');
                setHeading('Update check (dev mode)', text);
                setButton('Check for Updates', { icon: 'fa-sync-alt' });
            }
        });

        listenersBound = true;
    }

    window.initializeUpdateApp = function () {
        console.log('Initializing Update App Page...');
        const content = document.getElementById('page-content');
        if (!content) return;
        content.innerHTML = getUpdateAppTemplate();

        // Real installed version from the main process.
        if (window.electronAPI && window.electronAPI.invoke) {
            window.electronAPI.invoke('get-app-version')
                .then((v) => {
                    installedVersion = v || installedVersion;
                    if ($('installedVersion')) $('installedVersion').textContent = `v${installedVersion}`;
                    setHeading('Check for updates', `You're running Talliffy v${installedVersion}. Click below to check for a newer version.`);
                })
                .catch(() => { /* leave placeholder */ });
        }

        // Restore last-checked + auto-check preference.
        const last = localStorage.getItem('lastUpdateCheck');
        if (last && $('lastChecked')) {
            $('lastChecked').textContent = new Date(last).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
        }
        const autoChk = $('autoUpdateChk');
        const autoEnabled = localStorage.getItem(AUTO_KEY) !== 'false'; // default ON
        if (autoChk) {
            autoChk.checked = autoEnabled;
            autoChk.addEventListener('change', () => {
                localStorage.setItem(AUTO_KEY, autoChk.checked ? 'true' : 'false');
                if (window.electronAPI && window.electronAPI.send) {
                    window.electronAPI.send('set-auto-update', { enabled: autoChk.checked });
                }
            });
        }

        bindUpdateListeners();
        setButton('Check for Updates', { icon: 'fa-sync-alt' });

        // Auto-check on open when enabled (surfaces a new version without a click).
        if (autoEnabled) {
            setTimeout(onCheckClick, 1200);
        }
    };
})();
