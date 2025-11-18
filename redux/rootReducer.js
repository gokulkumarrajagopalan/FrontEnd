/**
 * Root Reducer
 * Combines all reducers for the Redux store
 */

// Combine reducers - simple implementation
function combineReducers(reducers) {
    return function rootReducer(state = {}, action) {
        const newState = {};
        for (const key in reducers) {
            newState[key] = reducers[key](state[key], action);
        }
        return newState;
    };
}

// Initialize root reducer with user and masters reducers
const rootReducer = combineReducers({
    user: typeof userReducer !== 'undefined' ? userReducer : (state = {}, action) => state,
    masters: typeof mastersReducer !== 'undefined' ? mastersReducer : (state = {}, action) => state
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { rootReducer, combineReducers };
}
