(function () {
    const getTutorialTemplate = () => `
        <div style="padding: 1.75rem; max-width: 1100px; margin: 0 auto;">
            <div style="background: white; border-radius: 14px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); overflow: hidden;">
                <div style="padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb;">
                    <h2 style="font-size: 1.35rem; font-weight: 700; color: #1e293b; margin-bottom: 0.3rem;">Tutorial</h2>
                    <p style="color: #64748b; font-size: 0.875rem;">Learn how to use Talliffy effectively</p>
                </div>
                
                <div style="padding: 1.5rem;">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                        <div style="background: #f8f9fb; padding: 1.15rem; border-radius: 10px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                            <div style="font-size: 1.5rem; margin-bottom: 0.6rem;">📥</div>
                            <h3 style="font-size: 0.95rem; font-weight: 700; color: #1e293b; margin-bottom: 0.3rem;">Getting Started</h3>
                            <p style="color: #64748b; font-size: 0.825rem; line-height: 1.5;">Learn how to add your first company and start syncing</p>
                        </div>

                        <div style="background: #f8f9fb; padding: 1.15rem; border-radius: 10px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                            <div style="font-size: 1.5rem; margin-bottom: 0.6rem;">🔄</div>
                            <h3 style="font-size: 0.95rem; font-weight: 700; color: #1e293b; margin-bottom: 0.3rem;">Syncing Data</h3>
                            <p style="color: #64748b; font-size: 0.825rem; line-height: 1.5;">Understand how data synchronization works</p>
                        </div>

                        <div style="background: #f8f9fb; padding: 1.15rem; border-radius: 10px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                            <div style="font-size: 1.5rem; margin-bottom: 0.6rem;">⚙️</div>
                            <h3 style="font-size: 0.95rem; font-weight: 700; color: #1e293b; margin-bottom: 0.3rem;">Configuration</h3>
                            <p style="color: #64748b; font-size: 0.825rem; line-height: 1.5;">Configure Tally connection and sync settings</p>
                        </div>

                        <div style="background: #f8f9fb; padding: 1.15rem; border-radius: 10px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                            <div style="font-size: 1.5rem; margin-bottom: 0.6rem;">🛠️</div>
                            <h3 style="font-size: 0.95rem; font-weight: 700; color: #1e293b; margin-bottom: 0.3rem;">Troubleshooting</h3>
                            <p style="color: #64748b; font-size: 0.825rem; line-height: 1.5;">Common issues and how to resolve them</p>
                        </div>

                        <div style="background: #f8f9fb; padding: 1.15rem; border-radius: 10px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                            <div style="font-size: 1.5rem; margin-bottom: 0.6rem;">📊</div>
                            <h3 style="font-size: 0.95rem; font-weight: 700; color: #1e293b; margin-bottom: 0.3rem;">Best Practices</h3>
                            <p style="color: #64748b; font-size: 0.825rem; line-height: 1.5;">Tips for optimal performance and data integrity</p>
                        </div>

                        <div style="background: #f8f9fb; padding: 1.15rem; border-radius: 10px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                            <div style="font-size: 1.5rem; margin-bottom: 0.6rem;">🎥</div>
                            <h3 style="font-size: 0.95rem; font-weight: 700; color: #1e293b; margin-bottom: 0.3rem;">Video Tutorials</h3>
                            <p style="color: #64748b; font-size: 0.825rem; line-height: 1.5;">Watch step-by-step video guides</p>
                        </div>
                    </div>

                    <div style="margin-top: 1.25rem; padding: 1.15rem; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 10px; color: white; display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.25rem; color: white;">Need More Help?</h3>
                            <p style="opacity: 0.9; color: white; font-size: 0.85rem;">Visit our knowledge base for detailed documentation and guides</p>
                        </div>
                        <button style="padding: 0.55rem 1.15rem; background: white; color: #3b82f6; border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; white-space: nowrap;">
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
