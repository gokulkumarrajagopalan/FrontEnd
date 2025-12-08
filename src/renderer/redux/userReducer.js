/**
 * User Reducer and Actions
 * Manages user authentication and profile state
 */

// User Actions
const USER_ACTIONS = {
    LOGIN_REQUEST: 'USER_LOGIN_REQUEST',
    LOGIN_SUCCESS: 'USER_LOGIN_SUCCESS',
    LOGIN_FAILURE: 'USER_LOGIN_FAILURE',
    LOGOUT: 'USER_LOGOUT',
    UPDATE_PROFILE: 'USER_UPDATE_PROFILE',
    FETCH_USER_SUCCESS: 'USER_FETCH_SUCCESS',
    FETCH_USER_FAILURE: 'USER_FETCH_FAILURE'
};

// Action Creators
const userActions = {
    login: (credentials) => async (dispatch, getState) => {
        dispatch({ type: USER_ACTIONS.LOGIN_REQUEST });
        try {
            const response = await fetch(window.apiConfig.getNestedUrl('auth', 'login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                dispatch({
                    type: USER_ACTIONS.LOGIN_SUCCESS,
                    payload: { user: data.user, token: data.token }
                });
                return { success: true };
            } else {
                dispatch({
                    type: USER_ACTIONS.LOGIN_FAILURE,
                    payload: data.message || 'Login failed'
                });
                return { success: false, error: data.message };
            }
        } catch (error) {
            dispatch({
                type: USER_ACTIONS.LOGIN_FAILURE,
                payload: error.message
            });
            return { success: false, error: error.message };
        }
    },

    logout: () => (dispatch) => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        dispatch({ type: USER_ACTIONS.LOGOUT });
    },

    fetchUser: (userId) => async (dispatch, getState) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8080/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const user = await response.json();
            
            if (response.ok) {
                dispatch({
                    type: USER_ACTIONS.FETCH_USER_SUCCESS,
                    payload: user
                });
            } else {
                dispatch({
                    type: USER_ACTIONS.FETCH_USER_FAILURE,
                    payload: 'Failed to fetch user'
                });
            }
        } catch (error) {
            dispatch({
                type: USER_ACTIONS.FETCH_USER_FAILURE,
                payload: error.message
            });
        }
    },

    updateProfile: (userData) => async (dispatch, getState) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8080/users/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(userData)
            });
            const updated = await response.json();
            
            if (response.ok) {
                localStorage.setItem('user', JSON.stringify(updated));
                dispatch({
                    type: USER_ACTIONS.UPDATE_PROFILE,
                    payload: updated
                });
                return { success: true };
            } else {
                return { success: false, error: updated.message };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};

// Initial State
const initialUserState = {
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token') || null,
    loading: false,
    error: null,
    isAuthenticated: !!localStorage.getItem('token')
};

// User Reducer
function userReducer(state = initialUserState, action) {
    switch (action.type) {
        case USER_ACTIONS.LOGIN_REQUEST:
            return { ...state, loading: true, error: null };
        
        case USER_ACTIONS.LOGIN_SUCCESS:
            return {
                ...state,
                loading: false,
                user: action.payload.user,
                token: action.payload.token,
                isAuthenticated: true,
                error: null
            };
        
        case USER_ACTIONS.LOGIN_FAILURE:
            return {
                ...state,
                loading: false,
                error: action.payload,
                isAuthenticated: false
            };
        
        case USER_ACTIONS.LOGOUT:
            return {
                user: null,
                token: null,
                loading: false,
                error: null,
                isAuthenticated: false
            };
        
        case USER_ACTIONS.UPDATE_PROFILE:
            return {
                ...state,
                user: action.payload
            };
        
        case USER_ACTIONS.FETCH_USER_SUCCESS:
            return {
                ...state,
                user: action.payload
            };
        
        case USER_ACTIONS.FETCH_USER_FAILURE:
            return {
                ...state,
                error: action.payload
            };
        
        default:
            return state;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { userReducer, userActions, USER_ACTIONS };
}
