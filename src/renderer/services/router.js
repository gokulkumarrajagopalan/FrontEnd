// Router for handling page navigation
class Router {
    constructor() {
        this.currentRoute = 'home';
        this.pages = {}; // Store page modules
        console.log('✅ Router created');
    }

    // Register all page modules
    registerPages(pagesMap) {
        this.pages = pagesMap;
        console.log('Pages registered:', Object.keys(this.pages));
    }

    setupNavigation() {
        document.addEventListener('click', (e) => {
            const navLink = e.target.closest('[data-route]');
            if (navLink) {
                e.preventDefault();
                const route = navLink.getAttribute('data-route');
                this.navigate(route);
            }
        });
    }

    async navigate(route) {
        if (!this.pages[route]) {
            console.error(`Route not found: ${route}`);
            return;
        }

        console.log('Navigating to route:', route);

        // Cleanup previous page if it exists
        if (window.currentPage && typeof window.currentPage.cleanup === 'function') {
            console.log('Cleaning up previous page:', this.currentRoute);
            window.currentPage.cleanup();
        }

        this.currentRoute = route;

        // Reset scroll position to top
        const content = document.getElementById('page-content');
        if (content) {
            content.scrollTop = 0;
        }

        try {
            // Initialize the page
            await this.initializePage(route);

            // Add fade-in animation to page content
            if (content) {
                content.classList.remove('fade-in');
                void content.offsetWidth; // Trigger reflow
                content.classList.add('fade-in');
            }

            // Update Active Nav
            document.querySelectorAll('[data-route]').forEach(link => {
                link.classList.remove('active');
                link.style.backgroundColor = '';
                link.style.color = '';
                if (link.getAttribute('data-route') === route) {
                    link.classList.add('active');
                }
            });

            // Update page title
            const pageTitle = route
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            const titleEl = document.getElementById('page-title');
            if (titleEl) {
                titleEl.textContent = pageTitle;
            }

        } catch (error) {
            console.error(`Error loading route ${route}:`, error);
            const content = document.getElementById('page-content');
            if (content) {
                content.innerHTML = `<div class="error-page" style="padding: 2rem; text-align: center;">
                    <h1>Error Loading Page</h1>
                    <p>${error.message}</p>
                </div>`;
            }
        }
    }

    async initializePage(route) {
        const pageModule = this.pages[route];
        if (!pageModule) {
            throw new Error(`Page module not found for ${route}`);
        }

        // Call the page's init function
        if (typeof pageModule.init === 'function') {
            console.log(`📄 Initializing page: ${route}`);
            const pageContent = document.getElementById('page-content');
            console.log(`   page-content exists: ${!!pageContent}`);
            if (pageContent) {
                console.log(`   Current content length: ${pageContent.innerHTML.length} chars`);
            }
            await pageModule.init();
            if (pageContent) {
                console.log(`   Updated content length: ${pageContent.innerHTML.length} chars`);
            }
            console.log(`✅ Page ${route} initialized`);
        } else {
            console.warn(`No init function found for page: ${route}`);
        }
    }

    // Setup hash-based routing for auth pages
    setupHashRouting() {
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1) || 'home';
            console.log('Hash changed to:', hash);
            this.navigate(hash);
        });

        // Check initial hash
        const initialHash = window.location.hash.slice(1);
        if (initialHash && this.pages[initialHash]) {
            console.log('Initial route from hash:', initialHash);
            this.navigate(initialHash);
        }
    }
}

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Router;
}
