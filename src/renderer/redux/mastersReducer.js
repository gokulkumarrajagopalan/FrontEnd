/**
 * Masters Reducer and Actions
 * Manages master data: Chart of Accounts, Cost Centers, Stock Categories, Units
 */

// Masters Actions
const MASTERS_ACTIONS = {
    // Chart of Accounts
    FETCH_ACCOUNTS_REQUEST: 'MASTERS_FETCH_ACCOUNTS_REQUEST',
    FETCH_ACCOUNTS_SUCCESS: 'MASTERS_FETCH_ACCOUNTS_SUCCESS',
    FETCH_ACCOUNTS_FAILURE: 'MASTERS_FETCH_ACCOUNTS_FAILURE',
    ADD_ACCOUNT: 'MASTERS_ADD_ACCOUNT',
    UPDATE_ACCOUNT: 'MASTERS_UPDATE_ACCOUNT',
    DELETE_ACCOUNT: 'MASTERS_DELETE_ACCOUNT',

    // Cost Centers
    FETCH_COST_CENTERS_REQUEST: 'MASTERS_FETCH_COST_CENTERS_REQUEST',
    FETCH_COST_CENTERS_SUCCESS: 'MASTERS_FETCH_COST_CENTERS_SUCCESS',
    FETCH_COST_CENTERS_FAILURE: 'MASTERS_FETCH_COST_CENTERS_FAILURE',
    ADD_COST_CENTER: 'MASTERS_ADD_COST_CENTER',
    UPDATE_COST_CENTER: 'MASTERS_UPDATE_COST_CENTER',
    DELETE_COST_CENTER: 'MASTERS_DELETE_COST_CENTER',

    // Stock Categories
    FETCH_CATEGORIES_REQUEST: 'MASTERS_FETCH_CATEGORIES_REQUEST',
    FETCH_CATEGORIES_SUCCESS: 'MASTERS_FETCH_CATEGORIES_SUCCESS',
    FETCH_CATEGORIES_FAILURE: 'MASTERS_FETCH_CATEGORIES_FAILURE',
    ADD_CATEGORY: 'MASTERS_ADD_CATEGORY',
    UPDATE_CATEGORY: 'MASTERS_UPDATE_CATEGORY',
    DELETE_CATEGORY: 'MASTERS_DELETE_CATEGORY',

    // Units
    FETCH_UNITS_REQUEST: 'MASTERS_FETCH_UNITS_REQUEST',
    FETCH_UNITS_SUCCESS: 'MASTERS_FETCH_UNITS_SUCCESS',
    FETCH_UNITS_FAILURE: 'MASTERS_FETCH_UNITS_FAILURE',
    ADD_UNIT: 'MASTERS_ADD_UNIT',
    UPDATE_UNIT: 'MASTERS_UPDATE_UNIT',
    DELETE_UNIT: 'MASTERS_DELETE_UNIT'
};

// Masters Action Creators
const mastersActions = {
    // Chart of Accounts
    fetchAccounts: () => async (dispatch, getState) => {
        dispatch({ type: MASTERS_ACTIONS.FETCH_ACCOUNTS_REQUEST });
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/api/masters/accounts', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            dispatch({
                type: MASTERS_ACTIONS.FETCH_ACCOUNTS_SUCCESS,
                payload: data
            });
        } catch (error) {
            dispatch({
                type: MASTERS_ACTIONS.FETCH_ACCOUNTS_FAILURE,
                payload: error.message
            });
        }
    },

    addAccount: (account) => async (dispatch, getState) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/api/masters/accounts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(account)
            });
            const newAccount = await response.json();
            dispatch({
                type: MASTERS_ACTIONS.ADD_ACCOUNT,
                payload: newAccount
            });
            return { success: true, data: newAccount };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    updateAccount: (id, account) => async (dispatch, getState) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8080/api/masters/accounts/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(account)
            });
            const updated = await response.json();
            dispatch({
                type: MASTERS_ACTIONS.UPDATE_ACCOUNT,
                payload: updated
            });
            return { success: true, data: updated };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    deleteAccount: (id) => async (dispatch, getState) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`http://localhost:8080/api/masters/accounts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            dispatch({
                type: MASTERS_ACTIONS.DELETE_ACCOUNT,
                payload: id
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Cost Centers
    fetchCostCenters: () => async (dispatch, getState) => {
        dispatch({ type: MASTERS_ACTIONS.FETCH_COST_CENTERS_REQUEST });
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/api/masters/cost-centers', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            dispatch({
                type: MASTERS_ACTIONS.FETCH_COST_CENTERS_SUCCESS,
                payload: data
            });
        } catch (error) {
            dispatch({
                type: MASTERS_ACTIONS.FETCH_COST_CENTERS_FAILURE,
                payload: error.message
            });
        }
    },

    // Stock Categories
    fetchCategories: () => async (dispatch, getState) => {
        dispatch({ type: MASTERS_ACTIONS.FETCH_CATEGORIES_REQUEST });
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/api/masters/categories', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            dispatch({
                type: MASTERS_ACTIONS.FETCH_CATEGORIES_SUCCESS,
                payload: data
            });
        } catch (error) {
            dispatch({
                type: MASTERS_ACTIONS.FETCH_CATEGORIES_FAILURE,
                payload: error.message
            });
        }
    },

    // Units
    fetchUnits: () => async (dispatch, getState) => {
        dispatch({ type: MASTERS_ACTIONS.FETCH_UNITS_REQUEST });
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/api/masters/units', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            dispatch({
                type: MASTERS_ACTIONS.FETCH_UNITS_SUCCESS,
                payload: data
            });
        } catch (error) {
            dispatch({
                type: MASTERS_ACTIONS.FETCH_UNITS_FAILURE,
                payload: error.message
            });
        }
    }
};

// Initial State
const initialMastersState = {
    accounts: {
        data: [],
        loading: false,
        error: null
    },
    costCenters: {
        data: [],
        loading: false,
        error: null
    },
    categories: {
        data: [],
        loading: false,
        error: null
    },
    units: {
        data: [],
        loading: false,
        error: null
    }
};

// Masters Reducer
function mastersReducer(state = initialMastersState, action) {
    switch (action.type) {
        // Accounts
        case MASTERS_ACTIONS.FETCH_ACCOUNTS_REQUEST:
            return {
                ...state,
                accounts: { ...state.accounts, loading: true, error: null }
            };
        case MASTERS_ACTIONS.FETCH_ACCOUNTS_SUCCESS:
            return {
                ...state,
                accounts: { data: action.payload, loading: false, error: null }
            };
        case MASTERS_ACTIONS.FETCH_ACCOUNTS_FAILURE:
            return {
                ...state,
                accounts: { ...state.accounts, loading: false, error: action.payload }
            };
        case MASTERS_ACTIONS.ADD_ACCOUNT:
            return {
                ...state,
                accounts: {
                    ...state.accounts,
                    data: [...state.accounts.data, action.payload]
                }
            };
        case MASTERS_ACTIONS.UPDATE_ACCOUNT:
            return {
                ...state,
                accounts: {
                    ...state.accounts,
                    data: state.accounts.data.map(acc =>
                        acc.id === action.payload.id ? action.payload : acc
                    )
                }
            };
        case MASTERS_ACTIONS.DELETE_ACCOUNT:
            return {
                ...state,
                accounts: {
                    ...state.accounts,
                    data: state.accounts.data.filter(acc => acc.id !== action.payload)
                }
            };

        // Cost Centers
        case MASTERS_ACTIONS.FETCH_COST_CENTERS_REQUEST:
            return {
                ...state,
                costCenters: { ...state.costCenters, loading: true, error: null }
            };
        case MASTERS_ACTIONS.FETCH_COST_CENTERS_SUCCESS:
            return {
                ...state,
                costCenters: { data: action.payload, loading: false, error: null }
            };
        case MASTERS_ACTIONS.FETCH_COST_CENTERS_FAILURE:
            return {
                ...state,
                costCenters: { ...state.costCenters, loading: false, error: action.payload }
            };

        // Categories
        case MASTERS_ACTIONS.FETCH_CATEGORIES_REQUEST:
            return {
                ...state,
                categories: { ...state.categories, loading: true, error: null }
            };
        case MASTERS_ACTIONS.FETCH_CATEGORIES_SUCCESS:
            return {
                ...state,
                categories: { data: action.payload, loading: false, error: null }
            };
        case MASTERS_ACTIONS.FETCH_CATEGORIES_FAILURE:
            return {
                ...state,
                categories: { ...state.categories, loading: false, error: action.payload }
            };

        // Units
        case MASTERS_ACTIONS.FETCH_UNITS_REQUEST:
            return {
                ...state,
                units: { ...state.units, loading: true, error: null }
            };
        case MASTERS_ACTIONS.FETCH_UNITS_SUCCESS:
            return {
                ...state,
                units: { data: action.payload, loading: false, error: null }
            };
        case MASTERS_ACTIONS.FETCH_UNITS_FAILURE:
            return {
                ...state,
                units: { ...state.units, loading: false, error: action.payload }
            };

        default:
            return state;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mastersReducer, mastersActions, MASTERS_ACTIONS };
}
