// Router for handling page navigation
class Router {
    constructor() {
        this.currentRoute = 'home';
        this.routes = {
            'login': {
                template: () => this.loadTemplate('pages/login.html'),
                script: () => this.loadScript('pages/auth.js')
            },
            'signup': {
                template: () => this.loadTemplate('pages/signup.html'),
                script: () => this.loadScript('pages/auth.js')
            },
            'home': {
                template: () => this.loadTemplate('pages/home.html'),
                script: () => this.loadScript('pages/home.js')
            },
            'dashboard': {
                template: () => this.loadTemplate('pages/dashboard.html'),
                script: () => this.loadScript('pages/dashboard.js')
            },
            'groups': {
                template: () => this.loadTemplate('pages/groups.html'),
                script: () => this.loadScript('pages/groups.js')
            },
            'ledgers': {
                template: () => this.loadTemplate('pages/ledgers.html'),
                script: () => this.loadScript('pages/ledgers.js')
            },
            'vouchers': {
                template: () => this.loadTemplate('pages/vouchers.html'),
                script: () => this.loadScript('pages/vouchers.js')
            },
            'items': {
                template: () => this.loadTemplate('pages/items.html'),
                script: () => this.loadScript('pages/items.js')
            },
            'reports': {
                template: () => this.loadTemplate('pages/reports.html'),
                script: () => this.loadScript('pages/reports.js')
            },
            'settings': {
                template: () => this.loadTemplate('pages/settings.html'),
                script: () => this.loadScript('pages/settings.js')
            },
            // Masters
            'masters-accounts': {
                template: () => this.loadTemplate('pages/masters-accounts.html'),
                script: () => this.loadScript('pages/masters-accounts.js')
            },
            'masters-costcenters': {
                template: () => this.loadTemplate('pages/masters-costcenters.html'),
                script: () => this.loadScript('pages/masters-costcenters.js')
            },
            'masters-categories': {
                template: () => this.loadTemplate('pages/masters-categories.html'),
                script: () => this.loadScript('pages/masters-categories.js')
            },
            'masters-units': {
                template: () => this.loadTemplate('pages/masters-units.html'),
                script: () => this.loadScript('pages/masters-units.js')
            },
            // User Management
            'users': {
                template: () => this.loadTemplate('pages/users.html'),
                script: () => this.loadScript('pages/users.js')
            }
        };
        this.setupNavigation();
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
        if (!this.routes[route]) {
            console.error(`Route not found: ${route}`);
            return;
        }

        console.log('Navigating to route:', route);
        this.currentRoute = route;
        
        try {
            // Check if this is an auth page (login/signup)
            if (route === 'login' || route === 'signup') {
                console.log('Loading auth page:', route);
                
                // Load template
                const template = await this.routes[route].template();
                
                // Replace entire body with auth page
                document.body.innerHTML = template;
                
                // Load and execute script
                await this.routes[route].script();
                
                console.log('Auth page loaded:', route);
                return;
            }
            
            // For regular pages, use page-content
            const content = document.getElementById('page-content');
            if (!content) {
                console.error(`Page content container not found for route '${route}'. This usually means the main app layout is not loaded (you may be on an auth page). If you intended to load the full app, reload ` +
                    `the app (e.g. index.html) or navigate to the home route.`);
                return;
            }
            
            content.innerHTML = '';

            // Load template
            const template = await this.routes[route].template();
            content.innerHTML = template;

            // Load and execute script
            await this.routes[route].script();

            // Update active nav
            document.querySelectorAll('[data-route]').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('data-route') === route) {
                    link.classList.add('active');
                }
            });

            // Scroll to top
            content.scrollTop = 0;
        } catch (error) {
            console.error(`Error loading route ${route}:`, error);
            const content = document.getElementById('page-content');
            if (content) {
                content.innerHTML = `<div class="error-page">
                    <h1>Error Loading Page</h1>
                    <p>${error.message}</p>
                </div>`;
            }
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
        if (initialHash && this.routes[initialHash]) {
            console.log('Initial route from hash:', initialHash);
            this.navigate(initialHash);
        }
    }

    async loadTemplate(path) {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Failed to load template: ${path}`);
        return await response.text();
    }

    async loadScript(path) {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Failed to load script: ${path}`);
        const script = await response.text();
        // Execute the script in the current context
        eval(script);
    }
}

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Router;
}
