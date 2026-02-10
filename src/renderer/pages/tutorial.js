(function () {
    const getTutorialTemplate = () => `
        <!-- FULL WIDTH WRAPPER -->
       <div style="
            padding: 2rem;
            width: 100%;
            min-height: 100vh;
            box-sizing: border-box;
        ">


            <!-- MAIN CARD -->
            <div style="
                background: white;
                border-radius: 16px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
                width: 100%;
                min-height: 100%;
                display: flex;
                flex-direction: column;
            ">

                <!-- HEADER -->
                <div style="padding: 1.75rem 2.25rem; border-bottom: 1px solid #e5e7eb;">
                    <h2 style="font-size: 1.6rem; font-weight: 700; color: #1e293b; margin-bottom: 0.4rem;">
                        Tutorial
                    </h2>
                    <p style="color: #64748b; font-size: 0.95rem;">
                        Learn how to use Talliffy effectively
                    </p>
                </div>

                <!-- CONTENT -->
                <div style="padding: 2.25rem; flex: 1;">

                    <!-- FULL PAGE GRID -->
                    <div style="
                        display: grid;
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                        gap: 1.75rem;
                    ">

                        ${tutorialCard("📥", "Getting Started", "Learn how to add your first company and start syncing")}
                        ${tutorialCard("🔄", "Syncing Data", "Understand how data synchronization works")}
                        ${tutorialCard("⚙️", "Configuration", "Configure Tally connection and sync settings")}
                        ${tutorialCard("🛠️", "Troubleshooting", "Common issues and how to resolve them")}
                        ${tutorialCard("📊", "Best Practices", "Tips for optimal performance and data integrity")}
                        ${tutorialCard("🎥", "Video Tutorials", "Watch step-by-step video guides")}

                    </div>

                    <!-- HELP BANNER -->
                    <div style="
                        margin-top: 2.25rem;
                        padding: 1.25rem 1.75rem;
                        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                        border-radius: 12px;
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 1.25rem;
                    ">

                        <div>
                            <h3 style="
                                font-size: 1rem;
                                font-weight: 700;
                                margin-bottom: 0.3rem;
                            ">
                                Need More Help?
                            </h3>
                            <p style="
                                opacity: 0.9;
                                font-size: 0.85rem;
                                line-height: 1.4;
                            ">
                                Visit our knowledge base for detailed documentation and guides
                            </p>
                        </div>

                        <button style="
                            padding: 0.55rem 1.4rem;
                            background: white;
                            color: #2563eb;
                            border: none;
                            border-radius: 8px;
                            font-size: 0.85rem;
                            font-weight: 600;
                            cursor: pointer;
                            white-space: nowrap;
                        ">
                            Visit Knowledge Base
                        </button>

                    </div>

                </div>
            </div>
        </div>
    `;

    const tutorialCard = (icon, title, desc) => `
        <div style="
            background: #f8f9fb;
            padding: 1.75rem;
            border-radius: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
            min-height: 185px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        "
        onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 18px rgba(0,0,0,0.1)'"
        onmouseout="this.style.transform=''; this.style.boxShadow=''">

            <div style="font-size: 2rem; margin-bottom: 0.9rem;">${icon}</div>
            <h3 style="font-size: 1.1rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">
                ${title}
            </h3>
            <p style="color: #64748b; font-size: 0.95rem; line-height: 1.6;">
                ${desc}
            </p>
        </div>
    `;

    window.initializeTutorial = function () {
        const content = document.getElementById('page-content');
        if (content) content.innerHTML = getTutorialTemplate();
    };
})();
