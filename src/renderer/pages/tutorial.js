(function () {

    /* ── color palette (resolved from ds vars with safe hex fallbacks) ── */
    const THEME = {
        blue:   { bg: '#EFF6FF', icon: '#3B82F6', border: '#BFDBFE', text: '#1D4ED8' },
        green:  { bg: '#F0FDF4', icon: '#22C55E', border: '#BBF7D0', text: '#15803D' },
        indigo: { bg: '#EEF2FF', icon: '#6366F1', border: '#C7D2FE', text: '#4338CA' },
        amber:  { bg: '#FFFBEB', icon: '#F59E0B', border: '#FDE68A', text: '#B45309' },
        purple: { bg: '#FAF5FF', icon: '#A855F7', border: '#E9D5FF', text: '#7E22CE' },
        teal:   { bg: '#F0FDFA', icon: '#14B8A6', border: '#99F6E4', text: '#0F766E' },
    };

    /* ── section definitions ─────────────────────────────────────────── */
    const SECTIONS = [
        {
            key: 'getting-started',
            title: 'Getting Started',
            icon: 'fas fa-rocket',
            color: 'blue',
            desc: 'Connect Tally, add your company, and run your first sync in minutes.',
            content: () => `
                <div class="tut-steps">
                    ${step(1, 'blue', 'fas fa-plug', 'Open Tally Prime',
                        `Make sure Tally Prime is running and HTTP services are enabled.
                         Go to <b>F1: Help → Settings → Connectivity</b> and confirm the port
                         (default <code style="background:#EFF6FF;padding:1px 6px;border-radius:4px;font-size:12px;">9000</code>)
                         is active.`)}
                    ${step(2, 'blue', 'fas fa-building', 'Add Your Company',
                        `Click <b>Add Company</b> in the sidebar. Talliffy will automatically detect
                         companies currently open in Tally. Select the correct company and confirm.`)}
                    ${step(3, 'blue', 'fas fa-database', 'Run the Initial Sync',
                        `Click <b>Sync Now</b> on the company card. The first sync pulls all masters
                         (ledgers, groups, stock items, voucher types, etc.) and all vouchers for the
                         selected date range. Depending on data size this may take a few minutes.`)}
                    ${step(4, 'blue', 'fas fa-chart-bar', 'Explore Your Dashboard',
                        `Once sync completes, navigate to the company to access Trial Balance,
                         Profit & Loss, Balance Sheet, Ledger reports, and Vouchers — all powered
                         by your live Tally data.`)}
                </div>
                ${callout('blue', 'fas fa-info-circle',
                    'Subsequent syncs are incremental and usually complete in seconds, using Tally\'s AlterID mechanism to fetch only changed records.')}
            `
        },
        {
            key: 'syncing-data',
            title: 'Syncing Data',
            icon: 'fas fa-sync-alt',
            color: 'green',
            desc: 'Understand how masters, vouchers and reports stay in sync automatically.',
            content: () => `
                ${sectionHeading('green', 'What gets synced?')}
                <div class="tut-grid-2" style="margin-bottom:24px;">
                    ${infoBox('green', 'fas fa-layer-group', 'Masters',
                        'Groups, Ledgers, Stock Items, Stock Groups, Units, Godowns, Voucher Types, Cost Centres, Cost Categories, Tax Units, Currency')}
                    ${infoBox('green', 'fas fa-file-invoice', 'Vouchers',
                        'All voucher types — Sales, Purchase, Payment, Receipt, Journal, Contra — with full ledger entries, inventory lines, bill allocations, and batch details')}
                </div>
                ${sectionHeading('green', 'How the sync works')}
                <div class="tut-timeline">
                    ${timelineItem('green', 'fas fa-bolt', 'Incremental Sync (default)',
                        'Every sync compares Tally\'s <b>AlterID</b> watermark with the last saved value. Only records modified since then are fetched — keeping syncs fast and light.')}
                    ${timelineItem('green', 'fas fa-check-double', 'Reconciliation on Every Sync',
                        'After fetching changed records, Talliffy compares the full Tally record set against the database to detect any missing, stale, or deleted records and corrects them automatically.')}
                    ${timelineItem('green', 'fas fa-clock', 'Background Scheduling',
                        'Sync runs automatically at the interval you configure in Settings. You can also trigger a manual sync at any time from the company card.')}
                </div>
            `
        },
        {
            key: 'configuration',
            title: 'Configuration',
            icon: 'fas fa-sliders-h',
            color: 'indigo',
            desc: 'Fine-tune your Tally connection, sync interval, and date range.',
            content: () => `
                ${sectionHeading('indigo', 'Connection Settings')}
                <div class="tut-grid-2" style="margin-bottom:28px;">
                    ${infoBox('indigo', 'fas fa-network-wired', 'Tally Host',
                        'Usually <code style="background:#EEF2FF;padding:1px 6px;border-radius:4px;font-size:12px;">localhost</code> when Tally is on the same machine. Enter the IP address if Tally runs on a separate server on your network.')}
                    ${infoBox('indigo', 'fas fa-hashtag', 'Tally Port',
                        'Default is <code style="background:#EEF2FF;padding:1px 6px;border-radius:4px;font-size:12px;">9000</code>. Change only if you configured a custom port in Tally\'s Connectivity settings.')}
                </div>
                ${sectionHeading('indigo', 'Sync Settings')}
                <div class="tut-grid-2" style="margin-bottom:8px;">
                    ${infoBox('indigo', 'fas fa-history', 'Sync Interval',
                        'How often automatic background sync runs. Shorter intervals keep data more up-to-date; longer intervals reduce system load.')}
                    ${infoBox('indigo', 'fas fa-calendar-alt', 'Date Range',
                        'Controls the voucher window fetched from Tally (e.g. current financial year). Masters are always synced in full regardless of date range.')}
                </div>
                ${callout('indigo', 'fas fa-lock', 'Your authentication tokens are stored securely and never exposed in process listings or logs.')}
            `
        },
        {
            key: 'troubleshooting',
            title: 'Troubleshooting',
            icon: 'fas fa-tools',
            color: 'amber',
            desc: 'Quick fixes for the most common connection and data sync issues.',
            content: () => `
                ${issue('Cannot connect to Tally',
                    ['Confirm Tally Prime is open and not minimised to tray.',
                     'Go to <b>F1: Help → Settings → Connectivity</b> and verify HTTP port is enabled.',
                     'Check your firewall — port 9000 must be accessible from Talliffy.',
                     'If Tally is on a different machine, ensure the host IP in Settings is correct.'])}
                ${issue('Sync stuck or very slow',
                    ['Large initial syncs (>50 k vouchers) can take several minutes — this is normal.',
                     'Talliffy syncs vouchers in monthly chunks; watch the log for per-chunk progress.',
                     'If stuck for >10 min, click <b>Stop Sync</b>, restart Tally, then retry.'])}
                ${issue('Data not updating after a change in Tally',
                    ['Trigger a manual sync using the <b>Sync Now</b> button.',
                     'Ensure background sync is enabled and the interval has not been set too high.',
                     'If a record is still stale, the next reconciliation cycle will detect and fix it.'])}
                ${issue('Company not appearing when adding',
                    ['The company must be open (not just loaded) in Tally at the time of detection.',
                     'Open the company in Tally, then click <b>Refresh</b> on the Add Company screen.'])}
            `
        },
        {
            key: 'best-practices',
            title: 'Best Practices',
            icon: 'fas fa-star',
            color: 'purple',
            desc: 'Tips for reliable syncs, clean data, and optimal performance.',
            content: () => `
                <div class="tut-practices">
                    ${practice('purple', 'fas fa-power-off',    'Keep Tally open during business hours',  'Talliffy\'s background sync depends on Tally\'s HTTP service. Closing Tally pauses all automatic syncs.')}
                    ${practice('purple', 'fas fa-calendar-check','Sync before generating reports',          'Always run a manual sync before opening financial reports to ensure you\'re viewing the latest data from Tally.')}
                    ${practice('purple', 'fas fa-list-alt',      'Review the sync log periodically',       'Open <b>Logs</b> from the sidebar to verify that all entities are syncing without errors or warnings.')}
                    ${practice('purple', 'fas fa-building',      'One company per Tally instance',         'If you manage multiple companies, open them one at a time in Tally when syncing to avoid cross-company data issues.')}
                    ${practice('purple', 'fas fa-wifi',          'Stable network for remote Tally',        'When Tally runs on a server, a stable LAN connection is essential. Wireless or VPN connections may cause timeout errors during large syncs.')}
                </div>
            `
        },
        {
            key: 'whats-synced',
            title: "What's Synced",
            icon: 'fas fa-table',
            color: 'teal',
            desc: 'Full list of every entity Talliffy pulls from Tally and stores.',
            content: () => `
                ${sectionHeading('teal', 'Master Data')}
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:28px;">
                    ${badge('teal','Groups')}${badge('teal','Ledgers')}${badge('teal','Stock Items')}
                    ${badge('teal','Stock Groups')}${badge('teal','Stock Categories')}${badge('teal','Units')}
                    ${badge('teal','Godowns')}${badge('teal','Voucher Types')}${badge('teal','Cost Centres')}
                    ${badge('teal','Cost Categories')}${badge('teal','Tax Units')}${badge('teal','Currency')}
                </div>
                ${sectionHeading('teal', 'Voucher Data')}
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:28px;">
                    ${badge('teal','Voucher Headers')}${badge('teal','Ledger Entries')}${badge('teal','Bill Allocations')}
                    ${badge('teal','Inventory Entries')}${badge('teal','Batch Allocations')}${badge('teal','Cost Allocations')}
                </div>
                ${sectionHeading('teal', 'Reports')}
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:8px;">
                    ${badge('teal','Trial Balance')}${badge('teal','Profit & Loss')}${badge('teal','Balance Sheet')}
                    ${badge('teal','Bills Receivable')}${badge('teal','Bills Payable')}
                </div>
            `
        },
    ];

    /* ── reusable component helpers ──────────────────────────────────── */
    function step(num, color, icon, title, body) {
        const t = THEME[color];
        return `
            <div style="display:flex;gap:16px;margin-bottom:24px;align-items:flex-start;">
                <div style="min-width:40px;height:40px;background:${t.bg};border:1px solid ${t.border};border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:${t.text};font-size:15px;flex-shrink:0;">${num}</div>
                <div>
                    <div style="font-weight:600;color:var(--ds-text-primary,#111827);margin-bottom:4px;display:flex;align-items:center;gap:8px;">
                        <i class="${icon}" style="color:${t.icon};font-size:13px;"></i>${title}
                    </div>
                    <p style="font-size:14px;line-height:1.65;color:var(--ds-text-secondary,#4B5563);margin:0;">${body}</p>
                </div>
            </div>`;
    }

    function callout(color, icon, text) {
        const t = THEME[color];
        return `
            <div style="background:${t.bg};border-left:4px solid ${t.icon};border-radius:8px;padding:14px 16px;display:flex;gap:10px;align-items:flex-start;margin-top:8px;">
                <i class="${icon}" style="color:${t.icon};margin-top:2px;flex-shrink:0;"></i>
                <span style="font-size:13px;line-height:1.6;color:${t.text};">${text}</span>
            </div>`;
    }

    function sectionHeading(color, text) {
        const t = THEME[color];
        return `<h4 style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${t.icon};margin:0 0 14px;">${text}</h4>`;
    }

    function infoBox(color, icon, title, body) {
        const t = THEME[color];
        return `
            <div style="padding:16px;border:1px solid ${t.border};border-radius:12px;background:${t.bg};">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                    <i class="${icon}" style="color:${t.icon};font-size:14px;"></i>
                    <span style="font-weight:600;font-size:14px;color:var(--ds-text-primary,#111827);">${title}</span>
                </div>
                <p style="font-size:13px;line-height:1.6;color:var(--ds-text-secondary,#4B5563);margin:0;">${body}</p>
            </div>`;
    }

    function timelineItem(color, icon, title, body) {
        const t = THEME[color];
        return `
            <div style="display:flex;gap:14px;margin-bottom:20px;">
                <div style="min-width:34px;height:34px;background:${t.bg};border:1px solid ${t.border};border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="${icon}" style="color:${t.icon};font-size:13px;"></i>
                </div>
                <div>
                    <div style="font-weight:600;font-size:14px;color:var(--ds-text-primary,#111827);margin-bottom:4px;">${title}</div>
                    <p style="font-size:13px;line-height:1.65;color:var(--ds-text-secondary,#4B5563);margin:0;">${body}</p>
                </div>
            </div>`;
    }

    function issue(title, items) {
        return `
            <div style="margin-bottom:20px;border:1px solid #FDE68A;border-radius:12px;overflow:hidden;">
                <div style="background:#FFFBEB;padding:12px 16px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #FDE68A;">
                    <i class="fas fa-exclamation-triangle" style="color:#F59E0B;font-size:13px;"></i>
                    <span style="font-weight:600;font-size:14px;color:#92400E;">${title}</span>
                </div>
                <div style="padding:14px 16px;background:#fff;">
                    <ol style="margin:0;padding-left:18px;">
                        ${items.map(i => `<li style="font-size:13px;line-height:1.65;color:var(--ds-text-secondary,#4B5563);margin-bottom:6px;">${i}</li>`).join('')}
                    </ol>
                </div>
            </div>`;
    }

    function practice(color, icon, title, body) {
        const t = THEME[color];
        return `
            <div style="display:flex;gap:14px;align-items:flex-start;padding:16px;border:1px solid var(--ds-border-default,#E5E7EB);border-radius:12px;margin-bottom:12px;">
                <div style="min-width:36px;height:36px;background:${t.bg};border:1px solid ${t.border};border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="${icon}" style="color:${t.icon};font-size:14px;"></i>
                </div>
                <div>
                    <div style="font-weight:600;font-size:14px;color:var(--ds-text-primary,#111827);margin-bottom:4px;">${title}</div>
                    <p style="font-size:13px;line-height:1.6;color:var(--ds-text-secondary,#4B5563);margin:0;">${body}</p>
                </div>
            </div>`;
    }

    function badge(color, label) {
        const t = THEME[color];
        return `<div style="padding:8px 12px;background:${t.bg};border:1px solid ${t.border};border-radius:8px;font-size:13px;font-weight:500;color:${t.text};text-align:center;">${label}</div>`;
    }

    /* ── card for the main grid ──────────────────────────────────────── */
    function tutorialCard(s) {
        const t = THEME[s.color];
        return `
            <div class="tut-card" data-section="${s.key}"
                style="background:var(--ds-bg-surface,#fff);padding:24px;border-radius:16px;border:1px solid var(--ds-border-default,#E5E7EB);cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;align-items:flex-start;box-shadow:0 1px 3px rgba(0,0,0,.06);"
                onmouseover="this.style.borderColor='${t.icon}';this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,.10)'"
                onmouseout="this.style.borderColor='var(--ds-border-default,#E5E7EB)';this.style.transform='translateY(0)';this.style.boxShadow='0 1px 3px rgba(0,0,0,.06)'">
                <div style="width:48px;height:48px;background:${t.bg};color:${t.icon};border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;margin-bottom:16px;border:1px solid ${t.border};">
                    <i class="${s.icon}"></i>
                </div>
                <h3 style="font-size:15px;font-weight:700;color:var(--ds-text-primary,#111827);margin:0 0 6px;">${s.title}</h3>
                <p style="font-size:13px;color:var(--ds-text-tertiary,#6B7280);line-height:1.55;margin:0 0 auto;flex:1;">${s.desc}</p>
                <div class="tut-learn" style="margin-top:16px;color:${t.icon};font-size:12px;font-weight:700;display:flex;align-items:center;gap:6px;opacity:0;transition:opacity 0.2s;">
                    Learn more <i class="fas fa-arrow-right" style="font-size:10px;"></i>
                </div>
            </div>`;
    }

    /* ── main grid template ──────────────────────────────────────────── */
    function getMainTemplate() {
        return `
            <div style="padding:32px;max-width:1100px;">
                <!-- page header -->
                <div style="margin-bottom:32px;">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
                        <div style="width:40px;height:40px;background:#EFF6FF;border-radius:10px;display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-graduation-cap" style="color:#3B82F6;font-size:18px;"></i>
                        </div>
                        <h1 style="font-size:24px;font-weight:700;color:var(--ds-text-primary,#111827);margin:0;">Tutorial</h1>
                    </div>
                    <p style="color:var(--ds-text-tertiary,#6B7280);font-size:14px;margin:0 0 0 52px;">Master Talliffy with step-by-step guides and reference material</p>
                </div>

                <!-- card grid -->
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;margin-bottom:32px;">
                    ${SECTIONS.map(tutorialCard).join('')}
                </div>

                <!-- help banner -->
                <div style="background:linear-gradient(135deg,#1D4ED8 0%,#4338CA 100%);border-radius:16px;padding:28px 32px;display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;box-shadow:0 4px 16px rgba(59,130,246,.3);">
                    <div style="display:flex;align-items:center;gap:20px;">
                        <div style="width:52px;height:52px;background:rgba(255,255,255,.15);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">
                            <i class="fas fa-headset" style="color:#fff;"></i>
                        </div>
                        <div>
                            <h3 style="font-size:16px;font-weight:700;color:#fff;margin:0 0 4px;">Need personalised help?</h3>
                            <p style="font-size:13px;color:rgba(255,255,255,.8);margin:0;max-width:420px;">Contact our support team or browse the knowledge base for detailed documentation and FAQs.</p>
                        </div>
                    </div>
                    <button id="tut-support-btn" style="background:#fff;color:#1D4ED8;border:none;border-radius:10px;font-weight:700;font-size:13px;padding:10px 22px;cursor:pointer;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.12);">
                        Contact Support <i class="fas fa-external-link-alt" style="margin-left:6px;font-size:11px;"></i>
                    </button>
                </div>
            </div>`;
    }

    /* ── detail view template ────────────────────────────────────────── */
    function getDetailTemplate(s) {
        const t = THEME[s.color];
        return `
            <div style="padding:32px;max-width:860px;">
                <!-- back button -->
                <button id="tut-back-btn"
                    style="display:inline-flex;align-items:center;gap:8px;background:var(--ds-bg-subtle,#F9FAFB);border:1px solid var(--ds-border-default,#E5E7EB);border-radius:8px;padding:7px 14px;font-size:13px;font-weight:600;color:var(--ds-text-secondary,#4B5563);cursor:pointer;margin-bottom:28px;transition:all 0.15s;"
                    onmouseover="this.style.borderColor='${t.icon}';this.style.color='${t.icon}'"
                    onmouseout="this.style.borderColor='var(--ds-border-default,#E5E7EB)';this.style.color='var(--ds-text-secondary,#4B5563)'">
                    <i class="fas fa-arrow-left" style="font-size:11px;"></i> Back to Tutorials
                </button>

                <!-- section header -->
                <div style="display:flex;align-items:center;gap:16px;margin-bottom:28px;">
                    <div style="width:60px;height:60px;background:${t.bg};color:${t.icon};border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:24px;border:1px solid ${t.border};flex-shrink:0;">
                        <i class="${s.icon}"></i>
                    </div>
                    <div>
                        <h2 style="font-size:22px;font-weight:700;color:var(--ds-text-primary,#111827);margin:0 0 6px;">${s.title}</h2>
                        <p style="font-size:14px;color:var(--ds-text-tertiary,#6B7280);margin:0;">${s.desc}</p>
                    </div>
                </div>

                <!-- content card -->
                <div style="background:var(--ds-bg-surface,#fff);border:1px solid var(--ds-border-default,#E5E7EB);border-radius:16px;padding:28px;box-shadow:0 1px 4px rgba(0,0,0,.06);">
                    <style>
                        .tut-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
                        @media(max-width:600px){.tut-grid-2{grid-template-columns:1fr;}}
                    </style>
                    ${s.content()}
                </div>
            </div>`;
    }

    /* ── init ────────────────────────────────────────────────────────── */
    window.initializeTutorial = function () {
        const root = document.getElementById('page-content');
        if (!root) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'tut-wrapper';

        const mainEl  = document.createElement('div');
        mainEl.id     = 'tut-main';
        mainEl.innerHTML = getMainTemplate();

        const detailEl = document.createElement('div');
        detailEl.id   = 'tut-detail';
        detailEl.style.display = 'none';

        wrapper.appendChild(mainEl);
        wrapper.appendChild(detailEl);
        root.innerHTML = '';
        root.appendChild(wrapper);

        /* card clicks */
        mainEl.querySelectorAll('.tut-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                const link = card.querySelector('.tut-learn');
                if (link) link.style.opacity = '1';
            });
            card.addEventListener('mouseleave', () => {
                const link = card.querySelector('.tut-learn');
                if (link) link.style.opacity = '0';
            });
            card.addEventListener('click', () => {
                const s = SECTIONS.find(x => x.key === card.dataset.section);
                if (!s) return;
                detailEl.innerHTML = getDetailTemplate(s);
                mainEl.style.display  = 'none';
                detailEl.style.display = 'block';

                const backBtn = document.getElementById('tut-back-btn');
                if (backBtn) {
                    backBtn.addEventListener('click', () => {
                        detailEl.style.display = 'none';
                        mainEl.style.display   = 'block';
                    });
                }

                /* scroll detail to top */
                root.scrollTop = 0;
            });
        });

        /* support button */
        const supportBtn = document.getElementById('tut-support-btn');
        if (supportBtn) {
            supportBtn.addEventListener('click', () => {
                if (window.app && window.app.navigate) window.app.navigate('support');
            });
        }
    };
})();
