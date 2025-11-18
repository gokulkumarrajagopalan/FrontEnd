/**
 * Redux Store Configuration
 * Central state management for the application
 */

// Simple Redux implementation for state management
class ReduxStore {
    constructor(rootReducer, initialState = {}) {
        this.reducer = rootReducer;
        this.state = initialState;
        this.listeners = [];
        this.middlewares = [];
    }

    getState() {
        return this.state;
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    dispatch(action) {
        if (typeof action === 'function') {
            return action(this.dispatch.bind(this), this.getState.bind(this));
        }

        this.state = this.reducer(this.state, action);
        this.listeners.forEach(listener => listener());
        return action;
    }

    applyMiddleware(middlewares) {
        this.middlewares = middlewares;
    }
}

// Export store creator
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReduxStore;
}
