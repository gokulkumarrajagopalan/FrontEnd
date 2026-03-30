(function () {
    const TUTORIAL_SECTIONS = {
        "getting-started": {
            title: "Getting Started",
            icon: "fas fa-rocket",
            color: "blue",
            content: `
                <div class="tutorial-detail-content">
                    <section style="margin-bottom: var(--ds-space-8);">
                        <h4 style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold); margin-bottom: var(--ds-space-4); color: var(--ds-primary-600);">1. Connect Tally</h4>
                        <p style="margin-bottom: var(--ds-space-3); line-height: 1.6;">Ensure Tally Prime or Tally.ERP 9 is running on your computer. Your Tally must be configured to allow HTTP services (ODBC port, usually 9000).</p>
                        <div style="background: var(--ds-bg-subtle); padding: var(--ds-space-4); border-radius: var(--ds-radius-lg); border-left: 4px solid var(--ds-primary-500); font-size: var(--ds-text-sm);">
                            <i class="fas fa-info-circle mr-2"></i> Go to <b>F1: Help > Settings > Connectivity</b> in Tally to verify the port settings.
                        </div>
                    </section>
                    <section style="margin-bottom: var(--ds-space-8);">
                        <h4 style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold); margin-bottom: var(--ds-space-4); color: var(--ds-primary-600);">2. Add Your Company</h4>
                        <p style="margin-bottom: var(--ds-space-3); line-height: 1.6;">Navigate to the 'Companies' page and click on <b>'Add Company'</b>. Talliffy will automatically detect companies currently open in Tally.</p>
                    </section>
                    <section>
                        <h4 style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold); margin-bottom: var(--ds-space-4); color: var(--ds-primary-600);">3. Start Initial Sync</h4>
                        <p style="margin-bottom: var(--ds-space-3); line-height: 1.6;">Once added, click 'Sync Now' to begin pulling your masters and vouchers. Depending on the data size, this may take a few minutes for the first time.</p>
                    </section>
                </div>
            `
        },
        "syncing-data": {
            title: "Syncing Data",
            icon: "fas fa-sync-alt",
            color: "green",
            content: `
                <div class="tutorial-detail-content">
                    <section style="margin-bottom: var(--ds-space-8);">
                        <h4 style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold); margin-bottom: var(--ds-space-4); color: var(--ds-success-600);">How Synchronization Works</h4>
                        <p style="margin-bottom: var(--ds-space-3); line-height: 1.6;">Talliffy uses a sophisticated dual-sync approach to ensure your data is always accurate and up-to-date with minimal resource usage.</p>
                    </section>
                    <ul style="list-style: none; padding: 0;">
                        <li style="display: flex; gap: var(--ds-space-4); margin-bottom: var(--ds-space-6);">
                            <div style="width: 32px; height: 32px; background: var(--ds-success-50); color: var(--ds-success-500); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><i class="fas fa-bolt"></i></div>
                            <div>
                                <b style="display: block; margin-bottom: 4px;">Incremental Sync</b>
                                <span style="font-size: var(--ds-text-sm); color: var(--ds-text-tertiary);">Only new or modified records are fetched using Tally's 'AlterID' mechanism, making syncs lightning fast.</span>
                            </div>
                        </li>
                        <li style="display: flex; gap: var(--ds-space-4); margin-bottom: var(--ds-space-6);">
                            <div style="width: 32px; height: 32px; background: var(--ds-success-50); color: var(--ds-success-500); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><i class="fas fa-clock"></i></div>
                            <div>
                                <b style="display: block; margin-bottom: 4px;">Background Scheduling</b>
                                <span style="font-size: var(--ds-text-sm); color: var(--ds-text-tertiary);">The dashboard automatically schedules sync tasks based on your preferences, running quietly in the background.</span>
                            </div>
                        </li>
                    </ul>
                </div>
            `
        },
        "configuration": {
            title: "Configuration",
            icon: "fas fa-cog",
            color: "indigo",
            content: `
                <div class="tutorial-detail-content">
                    <p style="margin-bottom: var(--ds-space-6); line-height: 1.6;">Customize how Talliffy interacts with your system to match your workflow requirements.</p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--ds-space-4);">
                        <div style="padding: var(--ds-space-4); border: 1px solid var(--ds-border-default); border-radius: var(--ds-radius-lg);">
                            <h5 style="font-weight: var(--ds-weight-bold); margin-bottom: var(--ds-space-2);"><i class="fas fa-network-wired mr-2"></i> Connectivity</h5>
                            <p style="font-size: var(--ds-text-sm); color: var(--ds-text-tertiary);">Set your Tally Host (usually localhost) and Port (default 9000).</p>
                        </div>
                        <div style="padding: var(--ds-space-4); border: 1px solid var(--ds-border-default); border-radius: var(--ds-radius-lg);">
                            <h5 style="font-weight: var(--ds-weight-bold); margin-bottom: var(--ds-space-2);"><i class="fas fa-history mr-2"></i> Sync Window</h5>
                            <p style="font-size: var(--ds-text-sm); color: var(--ds-text-tertiary);">Configure data fetch ranges (e.g., current year, last 30 days).</p>
                        </div>
                    </div>
                </div>
            `
        },
        "troubleshooting": {
            title: "Troubleshooting",
            icon: "fas fa-tools",
            color: "amber",
            content: `
                <div class="tutorial-detail-content">
                    <p style="margin-bottom: var(--ds-space-6); line-height: 1.6;">Facing issues? Here are the most common solutions for connection or data problems.</p>
                    <div style="background: var(--ds-warning-50); padding: var(--ds-space-6); border-radius: var(--ds-radius-xl);">
                        <div style="margin-bottom: var(--ds-space-4); display: flex; gap: var(--ds-space-3);">
                            <i class="fas fa-exclamation-triangle" style="color: var(--ds-warning-500); margin-top: 4px;"></i>
                            <div>
                                <b style="display: block; margin-bottom: 2px;">Cannot connect to Tally</b>
                                <span style="font-size: var(--ds-text-sm);">1. Check if Tally is open. 2. Verify port 9000 is open. 3. Check firewall settings.</span>
                            </div>
                        </div>
                        <div style="display: flex; gap: var(--ds-space-3);">
                            <i class="fas fa-database" style="color: var(--ds-warning-500); margin-top: 4px;"></i>
                            <div>
                                <b style="display: block; margin-bottom: 2px;">Sync feels stuck</b>
                                <span style="font-size: var(--ds-text-sm);">If syncing a very large volume (>50,000 vouchers), Tally may take several minutes to generate the response.</span>
                            </div>
                        </div>
                    </div>
                </div>
            `
        },
        "best-practices": {
            title: "Best Practices",
            icon: "fas fa-chart-line",
            color: "purple",
            content: `
                <div class="tutorial-detail-content">
                    <ul style="list-style: none; padding: 0;">
                        <li style="margin-bottom: var(--ds-space-4); padding: var(--ds-space-4); background: var(--ds-bg-surface); border-radius: var(--ds-radius-lg); border: 1px solid var(--ds-border-default);">
                            <b>Maintain Consistent Connectivity:</b> Keep Tally open and active on the host machine during business hours to ensure background syncs never fail.
                        </li>
                        <li style="margin-bottom: var(--ds-space-4); padding: var(--ds-space-4); background: var(--ds-bg-surface); border-radius: var(--ds-radius-lg); border: 1px solid var(--ds-border-default);">
                            <b>Monitor Log Outputs:</b> Check the 'Logs' tab periodically to ensure all data modules are synchronizing without errors.
                        </li>
                    </ul>
                </div>
            `
        },
        "video-tutorials": {
            title: "Video Tutorials",
            icon: "fas fa-video",
            color: "red",
            content: `
                <div class="tutorial-detail-content">
                    <p style="margin-bottom: var(--ds-space-6); line-height: 1.6;">Watch our step-by-step visual guides to master Talliffy features quickly.</p>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--ds-space-4);">
                        <div style="aspect-ratio: 16/9; background: #000; border-radius: var(--ds-radius-lg); position: relative; display: flex; align-items: center; justify-content: center; background-image: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('https://img.youtube.com/vi/placeholder/0.jpg'); background-size: cover; cursor: pointer;">
                            <i class="fas fa-play" style="color: white; font-size: 32px;"></i>
                            <span style="position: absolute; bottom: 8px; left: 8px; color: white; font-size: 10px; font-weight: bold;">Setting up Tally ODBC</span>
                        </div>
                        <div style="aspect-ratio: 16/9; background: #000; border-radius: var(--ds-radius-lg); position: relative; display: flex; align-items: center; justify-content: center; background-image: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('https://img.youtube.com/vi/placeholder/0.jpg'); background-size: cover; cursor: pointer;">
                            <i class="fas fa-play" style="color: white; font-size: 32px;"></i>
                            <span style="position: absolute; bottom: 8px; left: 8px; color: white; font-size: 10px; font-weight: bold;">Incremental Sync Deep Dive</span>
                        </div>
                    </div>
                </div>
            `
        }
    };

    const getTutorialTemplate = () => `
        <div class="tutorial-container" style="padding: var(--ds-space-6); max-width: 1000px; margin: 0 auto; transition: all 0.3s ease;">
            <div id="tutorial-main-view">
                <!-- HEADER -->
                <div class="tutorial-header" style="margin-bottom: var(--ds-space-10); text-align: left;">
                    <h1 style="font-size: var(--ds-text-4xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-2); display: flex; align-items: center; gap: var(--ds-space-4);">
                        <i class="fas fa-graduation-cap" style="color: var(--ds-primary-500);"></i> Tutorial
                    </h1>
                    <p style="color: var(--ds-text-tertiary); font-size: var(--ds-text-lg);">
                        Master Talliffy with our comprehensive guides and resources
                    </p>
                </div>

                <!-- CONTENT GRID -->
                <div class="tutorial-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--ds-space-6); margin-bottom: var(--ds-space-10);">
                    ${tutorialCard("fas fa-rocket", "Getting Started", "Learn how to add your first company and start syncing", "blue", "getting-started")}
                    ${tutorialCard("fas fa-sync-alt", "Syncing Data", "Understand how data synchronization works seamlessly", "green", "syncing-data")}
                    ${tutorialCard("fas fa-cog", "Configuration", "Fine-tune your Tally connection and sync preferences", "indigo", "configuration")}
                    ${tutorialCard("fas fa-tools", "Troubleshooting", "Quick solutions for common connection and data issues", "amber", "troubleshooting")}
                    ${tutorialCard("fas fa-chart-line", "Best Practices", "Expert tips for optimal performance and data integrity", "purple", "best-practices")}
                    ${tutorialCard("fas fa-video", "Video Tutorials", "Step-by-step visual guides for all core features", "red", "video-tutorials")}
                </div>

                <!-- HELP BANNER -->
                <div class="help-banner" style="padding: var(--ds-space-10); background: linear-gradient(135deg, var(--ds-primary-600) 0%, var(--ds-primary-800) 100%); border-radius: var(--ds-radius-2xl); color: var(--ds-text-inverse); display: flex; align-items: center; justify-content: space-between; gap: var(--ds-space-6); box-shadow: var(--ds-shadow-lg);">
                    <div style="display: flex; align-items: center; gap: var(--ds-space-8);">
                        <div style="width: 64px; height: 64px; background: rgba(255, 255, 255, 0.2); border-radius: var(--ds-radius-full); display: flex; align-items: center; justify-content: center; font-size: var(--ds-text-3xl); flex-shrink: 0; box-shadow: var(--ds-shadow-sm);">
                            <i class="fas fa-book-open"></i>
                        </div>
                        <div>
                            <h3 style="font-size: var(--ds-text-xl); font-weight: var(--ds-weight-bold); margin-bottom: var(--ds-space-1);">
                                Need More Help?
                            </h3>
                            <p style="opacity: 0.9; font-size: var(--ds-text-md); line-height: 1.5; max-width: 440px;">
                                Our extensive knowledge base contains detailed documentation, FAQs, and developer guides.
                            </p>
                        </div>
                    </div>

                    <button class="ds-btn" style="background: var(--ds-text-inverse); color: var(--ds-primary-600); border: none; font-weight: var(--ds-weight-bold); padding: var(--ds-space-3) var(--ds-space-6); box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        Visit Knowledge Base <i class="fas fa-external-link-alt ml-2"></i>
                    </button>
                </div>
            </div>
            <div id="tutorial-detail-view" style="display: none;">
                <!-- Content will be injected here -->
            </div>
        </div>
    `;

    const getDetailTemplate = (section) => {
        const colors = {
            blue: 'var(--ds-primary-500)',
            green: 'var(--ds-success-500)',
            indigo: 'var(--ds-indigo-500)',
            amber: 'var(--ds-warning-500)',
            purple: 'var(--ds-purple-500)',
            red: 'var(--ds-error-500)'
        };
        const color = colors[section.color] || colors.blue;

        return `
            <div class="detail-container">
                <button id="tutorial-back-btn" style="background: none; border: none; color: var(--ds-text-tertiary); cursor: pointer; display: flex; align-items: center; gap: var(--ds-space-2); margin-bottom: var(--ds-space-8); padding: var(--ds-space-2) 0; font-weight: var(--ds-weight-medium); transition: color 0.2s;">
                    <i class="fas fa-arrow-left"></i> Back to Tutorials
                </button>

                <div style="display: flex; align-items: center; gap: var(--ds-space-6); margin-bottom: var(--ds-space-10);">
                    <div style="width: 72px; height: 72px; background: var(--ds-bg-surface); color: ${color}; border-radius: var(--ds-radius-2xl); display: flex; align-items: center; justify-content: center; font-size: 32px; box-shadow: var(--ds-shadow-sm); border: 1px solid var(--ds-border-default);">
                        <i class="${section.icon}"></i>
                    </div>
                    <div>
                        <h2 style="font-size: var(--ds-text-3xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: 4px;">${section.title}</h2>
                        <div style="height: 4px; width: 48px; background: ${color}; border-radius: 2px;"></div>
                    </div>
                </div>

                <div style="background: var(--ds-bg-surface); border: 1px solid var(--ds-border-default); border-radius: var(--ds-radius-2xl); padding: var(--ds-space-10); box-shadow: var(--ds-shadow-sm);">
                    ${section.content}
                </div>
            </div>
        `;
    };

    const tutorialCard = (iconClass, title, desc, colorTheme, sectionKey) => {
        const colors = {
            blue: { bg: 'var(--ds-primary-50)', icon: 'var(--ds-primary-500)', border: 'var(--ds-primary-100)' },
            green: { bg: 'var(--ds-success-50)', icon: 'var(--ds-success-500)', border: 'var(--ds-success-100)' },
            indigo: { bg: 'var(--ds-indigo-50)', icon: 'var(--ds-indigo-500)', border: 'var(--ds-indigo-100)' },
            amber: { bg: 'var(--ds-warning-50)', icon: 'var(--ds-warning-500)', border: 'var(--ds-warning-100)' },
            purple: { bg: 'var(--ds-purple-50)', icon: 'var(--ds-purple-500)', border: 'var(--ds-purple-100)' },
            red: { bg: 'var(--ds-error-50)', icon: 'var(--ds-error-500)', border: 'var(--ds-error-100)' }
        };
        const theme = colors[colorTheme] || colors.blue;

        return `
            <div class="tutorial-card" data-section="${sectionKey}" style="background: var(--ds-bg-surface); padding: var(--ds-space-8); border-radius: var(--ds-radius-2xl); border: 1px solid var(--ds-border-default); cursor: pointer; transition: all var(--ds-duration-base) var(--ds-ease); display: flex; flex-direction: column; align-items: flex-start; text-align: left; position: relative; overflow: hidden; box-shadow: var(--ds-shadow-sm);"
            onmouseover="this.style.borderColor='${theme.icon}'; this.style.transform='translateY(-4px)'; this.style.boxShadow='var(--ds-shadow-md)'"
            onmouseout="this.style.borderColor='var(--ds-border-default)'; this.style.transform='translateY(0)'; this.style.boxShadow='var(--ds-shadow-sm)'">
                
                <div style="width: 50px; height: 50px; background: ${theme.bg}; color: ${theme.icon}; border-radius: var(--ds-radius-xl); display: flex; align-items: center; justify-content: center; font-size: var(--ds-text-xl); margin-bottom: var(--ds-space-5); transition: all var(--ds-duration-base) var(--ds-ease); border: 1px solid ${theme.border};">
                    <i class="${iconClass}"></i>
                </div>
                
                <h3 style="font-size: var(--ds-text-lg); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); margin-bottom: var(--ds-space-2);">
                    ${title}
                </h3>
                
                <p style="color: var(--ds-text-tertiary); font-size: var(--ds-text-sm); line-height: 1.6;">
                    ${desc}
                </p>

                <div class="learn-more-link" style="margin-top: auto; padding-top: var(--ds-space-4); color: ${theme.icon}; font-size: var(--ds-text-xs); font-weight: var(--ds-weight-bold); display: flex; align-items: center; gap: var(--ds-space-2); opacity: 0; transition: opacity var(--ds-duration-base) var(--ds-ease);">
                    Learn More <i class="fas fa-arrow-right"></i>
                </div>
            </div>
        `;
    };

    window.initializeTutorial = function () {
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getTutorialTemplate();

            const mainView = document.getElementById('tutorial-main-view');
            const detailView = document.getElementById('tutorial-detail-view');
            const cards = content.querySelectorAll('.tutorial-card');

            cards.forEach(card => {
                // Hover effect for Learn More
                card.addEventListener('mouseenter', () => {
                    const arrow = card.querySelector('.learn-more-link');
                    if (arrow) arrow.style.opacity = '1';
                });
                card.addEventListener('mouseleave', () => {
                    const arrow = card.querySelector('.learn-more-link');
                    if (arrow) arrow.style.opacity = '0';
                });

                // Click to view detail
                card.addEventListener('click', () => {
                    const sectionKey = card.getAttribute('data-section');
                    const section = TUTORIAL_SECTIONS[sectionKey];
                    if (section) {
                        detailView.innerHTML = getDetailTemplate(section);
                        mainView.style.display = 'none';
                        detailView.style.display = 'block';

                        // Hook up back button
                        const backBtn = document.getElementById('tutorial-back-btn');
                        backBtn.addEventListener('click', () => {
                            detailView.style.display = 'none';
                            mainView.style.display = 'block';
                        });

                        // Hover for back button
                        backBtn.addEventListener('mouseenter', () => backBtn.style.color = 'var(--ds-primary-500)');
                        backBtn.addEventListener('mouseleave', () => backBtn.style.color = 'var(--ds-text-tertiary)');
                    }
                });
            });
        }
    };
})();

