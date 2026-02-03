(function () {
    const getTutorialTemplate = () => `
        <div style="padding: 2.5rem; max-width: 1200px; margin: 0 auto;">
            <div style="background: white; border-radius: 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); overflow: hidden;">
                <div style="padding: 2rem; border-bottom: 1px solid #e5e7eb;">
                    <h2 style="font-size: 1.875rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">Tutorial</h2>
                    <p style="color: #64748b; font-size: 0.9375rem;">Learn how to use Talliffy effectively</p>
                </div>
                
                <div style="padding: 2rem;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
                        <div style="background: #f8f9fb; padding: 1.5rem; border-radius: 12px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                            <div style="font-size: 2rem; margin-bottom: 1rem;">📥</div>
                            <h3 style="font-size: 1.125rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">Getting Started</h3>
                            <p style="color: #64748b; font-size: 0.875rem;">Learn how to add your first company and start syncing</p>
                        </div>

                        <div style="background: #f8f9fb; padding: 1.5rem; border-radius: 12px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                            <div style="font-size: 2rem; margin-bottom: 1rem;">🔄</div>
                            <h3 style="font-size: 1.125rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">Syncing Data</h3>
                            <p style="color: #64748b; font-size: 0.875rem;">Understand how data synchronization works</p>
                        </div>

                        <div style="background: #f8f9fb; padding: 1.5rem; border-radius: 12px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                            <div style="font-size: 2rem; margin-bottom: 1rem;">⚙️</div>
                            <h3 style="font-size: 1.125rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">Configuration</h3>
                            <p style="color: #64748b; font-size: 0.875rem;">Configure Tally connection and sync settings</p>
                        </div>

                        <div style="background: #f8f9fb; padding: 1.5rem; border-radius: 12px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                            <div style="font-size: 2rem; margin-bottom: 1rem;">🛠️</div>
                            <h3 style="font-size: 1.125rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">Troubleshooting</h3>
                            <p style="color: #64748b; font-size: 0.875rem;">Common issues and how to resolve them</p>
                        </div>

                        <div style="background: #f8f9fb; padding: 1.5rem; border-radius: 12px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                            <div style="font-size: 2rem; margin-bottom: 1rem;">📊</div>
                            <h3 style="font-size: 1.125rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">Best Practices</h3>
                            <p style="color: #64748b; font-size: 0.875rem;">Tips for optimal performance and data integrity</p>
                        </div>

                        <div style="background: #f8f9fb; padding: 1.5rem; border-radius: 12px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                            <div style="font-size: 2rem; margin-bottom: 1rem;">🎥</div>
                            <h3 style="font-size: 1.125rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">Video Tutorials</h3>
                            <p style="color: #64748b; font-size: 0.875rem;">Watch step-by-step video guides</p>
                        </div>
                    </div>

                    <div style="margin-top: 2rem; padding: 1.5rem; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 12px; color: white;">
                        <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 0.5rem; color: white;">Need More Help?</h3>
                        <p style="margin-bottom: 1rem; opacity: 0.9; color: white;">Visit our knowledge base for detailed documentation and guides</p>
                        <button style="padding: 0.625rem 1.25rem; background: white; color: #3b82f6; border: none; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer;">
                            Visit Knowledge Base
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    window.initializeTutorial = function () {
        console.log('Initializing Tutorial Page...');
        const content = document.getElementById('page-content');
        if (content) {
            content.innerHTML = getTutorialTemplate();
        }
    };
})();
