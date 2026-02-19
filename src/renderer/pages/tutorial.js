(function () {
    const getTutorialTemplate = () => `
        <div class="tutorial-container" style="padding: var(--ds-space-6); max-width: 1000px; margin: 0 auto;">
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
                ${tutorialCard("fas fa-rocket", "Getting Started", "Learn how to add your first company and start syncing", "blue")}
                ${tutorialCard("fas fa-sync-alt", "Syncing Data", "Understand how data synchronization works seamlessly", "green")}
                ${tutorialCard("fas fa-cog", "Configuration", "Fine-tune your Tally connection and sync preferences", "indigo")}
                ${tutorialCard("fas fa-tools", "Troubleshooting", "Quick solutions for common connection and data issues", "amber")}
                ${tutorialCard("fas fa-chart-line", "Best Practices", "Expert tips for optimal performance and data integrity", "purple")}
                ${tutorialCard("fas fa-video", "Video Tutorials", "Step-by-step visual guides for all core features", "red")}
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

                <button class="ds-btn" style="background: var(--ds-text-inverse); color: var(--ds-primary-600); border: none; font-weight: var(--ds-weight-bold); padding: var(--ds-space-3) var(--ds-space-6);">
                    Visit Knowledge Base <i class="fas fa-external-link-alt ml-2"></i>
                </button>
            </div>
        </div>
    `;

    const tutorialCard = (iconClass, title, desc, colorTheme) => {
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
            <div class="tutorial-card" style="background: var(--ds-bg-surface); padding: var(--ds-space-8); border-radius: var(--ds-radius-2xl); border: 1px solid var(--ds-border-default); cursor: pointer; transition: all var(--ds-duration-base) var(--ds-ease); display: flex; flex-direction: column; align-items: flex-start; text-align: left; position: relative; overflow: hidden; box-shadow: var(--ds-shadow-sm);"
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

                <div style="margin-top: var(--ds-space-4); padding-top: var(--ds-space-4); color: ${theme.icon}; font-size: var(--ds-text-xs); font-weight: var(--ds-weight-bold); display: flex; align-items: center; gap: var(--ds-space-2); opacity: 0; transition: opacity var(--ds-duration-base) var(--ds-ease);">
                    Learn More <i class="fas fa-arrow-right"></i>
                </div>
            </div>
        `;
    };

    window.initializeTutorial = function () {
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getTutorialTemplate();
            // Apply a small script to handle the "Learn More" reveal on hover
            const cards = content.querySelectorAll('.tutorial-card');
            cards.forEach(card => {
                card.addEventListener('mouseenter', () => {
                    const arrow = card.querySelector('div:last-child');
                    if (arrow) arrow.style.opacity = '1';
                });
                card.addEventListener('mouseleave', () => {
                    const arrow = card.querySelector('div:last-child');
                    if (arrow) arrow.style.opacity = '0';
                });
            });
        }
    };
})();

