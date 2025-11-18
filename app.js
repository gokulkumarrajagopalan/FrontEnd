// Tally Prime-like Accounting Application with Spring Boot Backend

const API_BASE_URL = 'http://localhost:8080/api';

// Redux Store Setup (if not already initialized)
function initializeReduxStore() {
    if (window.store) return; // Already initialized

    // Simple Redux store implementation
    class SimpleReduxStore {
        constructor(rootReducer) {
            this.reducer = rootReducer;
            this.state = {
                user: {
                    isAuthenticated: false,
                    currentUser: null,
                    token: null,
                    error: null
                },
                masters: {
                    accounts: [],
                    costCenters: [],
                    categories: [],
                    units: []
                }
            };
            this.listeners = [];
        }

        getState() {
            return this.state;
        }

        dispatch(action) {
            this.state = this.reducer(this.state, action);
            this.listeners.forEach(listener => listener(this.state));
            return action;
        }

        subscribe(listener) {
            this.listeners.push(listener);
            return () => {
                this.listeners = this.listeners.filter(l => l !== listener);
            };
        }
    }

    // User Reducer
    function userReducer(state = {}, action) {
        if (!state || typeof state !== 'object') {
            state = {
                isAuthenticated: false,
                currentUser: null,
                token: null,
                error: null
            };
        }

        switch (action.type) {
            case 'LOGIN_SUCCESS':
                return {
                    ...state,
                    isAuthenticated: true,
                    currentUser: action.payload.user,
                    token: action.payload.token,
                    error: null
                };
            case 'LOGIN_FAILURE':
                return {
                    ...state,
                    isAuthenticated: false,
                    currentUser: null,
                    token: null,
                    error: action.payload
                };
            case 'LOGOUT':
                return {
                    isAuthenticated: false,
                    currentUser: null,
                    token: null,
                    error: null
                };
            default:
                return state;
        }
    }

    // Masters Reducer
    function mastersReducer(state = {}, action) {
        if (!state || typeof state !== 'object') {
            state = {
                accounts: [],
                costCenters: [],
                categories: [],
                units: []
            };
        }

        switch (action.type) {
            case 'LOAD_ACCOUNTS':
                return { ...state, accounts: action.payload };
            case 'LOAD_COST_CENTERS':
                return { ...state, costCenters: action.payload };
            case 'LOAD_CATEGORIES':
                return { ...state, categories: action.payload };
            case 'LOAD_UNITS':
                return { ...state, units: action.payload };
            default:
                return state;
        }
    }

    // Root Reducer
    function rootReducer(state = {}, action) {
        return {
            user: userReducer(state.user, action),
            masters: mastersReducer(state.masters, action)
        };
    }

    // Create and store Redux instance
    window.store = new SimpleReduxStore(rootReducer);

    // Initialize user from localStorage
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('currentUser');
    if (token && userStr) {
        const user = JSON.parse(userStr);
        window.store.dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user, token, isAuthenticated: true }
        });
    }
}

class TallyApp {
    constructor() {
        this.data = {
            groups: [],
            ledgers: [],
            vouchers: [],
            items: [],
            units: []
        };
        this.initializeApp();
    }

    // Initialize Application
    initializeApp() {
        // Initialize Redux first
        initializeReduxStore();

        // Check if user is authenticated
        const isAuthenticated = localStorage.getItem('authToken');
        if (!isAuthenticated) {
            // Redirect to login
            window.location.hash = '#login';
            return;
        }

        this.setupEventListeners();
        this.loadDataFromServer();
        this.renderDashboard();
    }

    // Load data from backend
    async loadDataFromServer() {
        try {
            const [groups, ledgers, vouchers] = await Promise.all([
                this.fetchData(`${API_BASE_URL}/groups`),
                this.fetchData(`${API_BASE_URL}/ledgers`),
                this.fetchData(`${API_BASE_URL}/vouchers`)
            ]);
            
            this.data.groups = groups || [];
            this.data.ledgers = ledgers || [];
            this.data.vouchers = vouchers || [];
        } catch (error) {
            console.error('Error loading data from server:', error);
            this.showAlert('Could not connect to backend server', 'error');
        }
    }

    // Generic fetch method
    async fetchData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            return null;
        }
    }

    // Generic POST method
    async postData(url, data) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Post error:', error);
            throw error;
        }
    }

    // Generic DELETE method
    async deleteData(url) {
        try {
            const response = await fetch(url, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return true;
        } catch (error) {
            console.error('Delete error:', error);
            throw error;
        }
    }

    // Event Listeners
    setupEventListeners() {
        // Tab Navigation
        const navTabs = document.querySelectorAll('.nav-tab');
        navTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
    }

    // Placeholder method for dashboard rendering
    renderDashboard() {
        const pageContent = document.getElementById('page-content');
        if (pageContent) {
            pageContent.innerHTML = '<h2>Dashboard</h2><p>Welcome to Tally Prime!</p>';
        }
    }

    // Show alert helper
    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        const container = document.querySelector('.alert-container');
        if (container) {
            container.appendChild(alertDiv);
            setTimeout(() => alertDiv.remove(), 3000);
        }
    }
}

// Initialize App
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TallyApp();
});
