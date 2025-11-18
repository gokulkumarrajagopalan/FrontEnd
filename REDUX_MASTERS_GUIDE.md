# Redux State Management & Masters Implementation Guide

## Overview
This document describes the new Redux state management system, Masters data screens, and User Management features added to the Tally Prime application.

## Redux Store Architecture

### Files Created
```
redux/
├── store.js              # Redux store configuration
├── userReducer.js        # User authentication and profile state
├── mastersReducer.js     # Masters data state (accounts, cost centers, categories, units)
└── rootReducer.js        # Combined root reducer
```

### Redux Store Features

#### 1. **User Management (userReducer.js)**
Manages:
- User authentication (login/logout)
- User profile information
- Authentication tokens
- Login state and errors

**Actions:**
```javascript
userActions.login(credentials)              // Login user
userActions.logout()                        // Logout user
userActions.fetchUser(userId)               // Get user details
userActions.updateProfile(userData)         // Update user profile
```

**State Structure:**
```javascript
{
  user: { /* user object */ },
  token: string,
  loading: boolean,
  error: null | string,
  isAuthenticated: boolean
}
```

#### 2. **Masters Data (mastersReducer.js)**
Manages:
- Chart of Accounts
- Cost Centers
- Stock Categories
- Units of Measurement

**State Structure:**
```javascript
{
  accounts: { data: [], loading: false, error: null },
  costCenters: { data: [], loading: false, error: null },
  categories: { data: [], loading: false, error: null },
  units: { data: [], loading: false, error: null }
}
```

**Actions Available:**
```javascript
// Chart of Accounts
mastersActions.fetchAccounts()
mastersActions.addAccount(account)
mastersActions.updateAccount(id, account)
mastersActions.deleteAccount(id)

// Cost Centers
mastersActions.fetchCostCenters()

// Stock Categories
mastersActions.fetchCategories()

// Units
mastersActions.fetchUnits()
```

## New Master Screens

### 1. **Chart of Accounts** (`masters-accounts`)
**Path:** `pages/masters-accounts.html` & `pages/masters-accounts.js`

**Features:**
- Create, read, update, delete accounting masters
- Filter by account type (Asset, Liability, Equity, Revenue, Expense)
- Search by code or name
- Display opening and current balances
- Account status management

**API Endpoints:**
```
GET    /api/masters/accounts           # List all accounts
GET    /api/masters/accounts/{id}      # Get account details
POST   /api/masters/accounts           # Create account
PUT    /api/masters/accounts/{id}      # Update account
DELETE /api/masters/accounts/{id}      # Delete account
```

**Account Object Structure:**
```javascript
{
  id: number,
  code: string,
  name: string,
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE',
  openingBalance: number,
  currentBalance: number,
  description: string,
  active: boolean
}
```

### 2. **Cost Centers** (`masters-costcenters`)
**Path:** `pages/masters-costcenters.html` & `pages/masters-costcenters.js`

**Features:**
- Manage organizational cost centers
- Set budget allocations
- Track cost center status
- Search and filter functionality

**API Endpoints:**
```
GET    /api/masters/cost-centers       # List all cost centers
GET    /api/masters/cost-centers/{id}  # Get cost center details
POST   /api/masters/cost-centers       # Create cost center
PUT    /api/masters/cost-centers/{id}  # Update cost center
DELETE /api/masters/cost-centers/{id}  # Delete cost center
```

**Cost Center Object:**
```javascript
{
  id: number,
  code: string,
  name: string,
  description: string,
  budget: number,
  active: boolean
}
```

### 3. **Stock Categories** (`masters-categories`)
**Path:** `pages/masters-categories.html` & `pages/masters-categories.js`

**Features:**
- Define product/item categories
- Manage HSN codes for GST compliance
- Set tax rates per category
- Category status tracking

**API Endpoints:**
```
GET    /api/masters/categories         # List all categories
GET    /api/masters/categories/{id}    # Get category details
POST   /api/masters/categories         # Create category
PUT    /api/masters/categories/{id}    # Update category
DELETE /api/masters/categories/{id}    # Delete category
```

**Category Object:**
```javascript
{
  id: number,
  name: string,
  description: string,
  hsnCode: string,
  taxRate: number,
  active: boolean
}
```

### 4. **Units of Measurement** (`masters-units`)
**Path:** `pages/masters-units.html` & `pages/masters-units.js`

**Features:**
- Define measurement units (Kg, Liter, Meter, etc.)
- Manage unit types (Weight, Length, Volume, Quantity, Area)
- Unit symbol management
- Search by name or symbol

**API Endpoints:**
```
GET    /api/masters/units              # List all units
GET    /api/masters/units/{id}         # Get unit details
POST   /api/masters/units              # Create unit
PUT    /api/masters/units/{id}         # Update unit
DELETE /api/masters/units/{id}         # Delete unit
```

**Unit Object:**
```javascript
{
  id: number,
  name: string,
  symbol: string,
  type: 'WEIGHT' | 'LENGTH' | 'VOLUME' | 'QUANTITY' | 'AREA' | 'OTHER',
  description: string,
  active: boolean
}
```

## User Management Screen

**Path:** `pages/users.html` & `pages/users.js`

### Features
- Create and manage application users
- Role-based access control (Admin, Manager, User, Viewer)
- User activation/deactivation
- View user details and login history
- Change passwords
- Search and filter by role and status

### API Endpoints
```
GET    /api/users                      # List all users
GET    /api/users/{id}                 # Get user details
POST   /api/users                      # Create user
PUT    /api/users/{id}                 # Update user
DELETE /api/users/{id}                 # Delete user
PUT    /api/users/{id}/status          # Activate/deactivate user
PUT    /api/users/{id}/password        # Change password
GET    /api/users/profile              # Get current user profile
```

### User Object Structure
```javascript
{
  id: number,
  username: string,
  email: string,
  firstName: string,
  lastName: string,
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER',
  department: string,
  active: boolean,
  lastLogin: date,
  lastPasswordChange: date,
  createdAt: date
}
```

## API Service Extensions

The `api.js` file has been extended with new methods:

### Masters API Methods
```javascript
ApiService.getAccounts()
ApiService.getAccountById(id)
ApiService.createAccount(account)
ApiService.updateAccount(id, account)
ApiService.deleteAccount(id)

ApiService.getCostCenters()
ApiService.getCostCenterById(id)
ApiService.createCostCenter(costCenter)
ApiService.updateCostCenter(id, costCenter)
ApiService.deleteCostCenter(id)

ApiService.getCategories()
ApiService.getCategoryById(id)
ApiService.createCategory(category)
ApiService.updateCategory(id, category)
ApiService.deleteCategory(id)

ApiService.getUnits()
ApiService.getUnitById(id)
ApiService.createUnit(unit)
ApiService.updateUnit(id, unit)
ApiService.deleteUnit(id)
```

### User Management API Methods
```javascript
ApiService.getUsers()
ApiService.getUserById(id)
ApiService.createUser(user)
ApiService.updateUser(id, user)
ApiService.deleteUser(id)
ApiService.updateUserStatus(id, status)
ApiService.changePassword(id, passwordData)
ApiService.getUserProfile()
```

## Navigation Updates

### New Menu Items
The sidebar navigation has been reorganized:

**Masters Section:**
- Chart of Accounts
- Cost Centers
- Stock Categories
- Units of Measurement

**Administration Section:**
- User Management
- Settings

### CSS Classes Added
- `.nav-section` - Section header styling
- `.nav-section-title` - Section title styling

## Implementation Examples

### Using Redux Actions in Components

```javascript
// Example: In a component file
import { mastersActions } from './redux/mastersReducer.js';

// Dispatch action to fetch accounts
store.dispatch(mastersActions.fetchAccounts());

// Subscribe to state changes
const unsubscribe = store.subscribe(() => {
    const state = store.getState();
    const accounts = state.masters.accounts.data;
    console.log('Accounts updated:', accounts);
});
```

### API Usage with Redux

```javascript
// In component
async function saveAccount(account) {
    const result = await store.dispatch(
        mastersActions.addAccount(account)
    );
    if (result.success) {
        console.log('Account saved:', result.data);
    }
}
```

## Backend Requirements

The backend API should provide the following endpoints:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token

### Masters Endpoints
- `/api/masters/accounts/*` - Chart of Accounts
- `/api/masters/cost-centers/*` - Cost Centers
- `/api/masters/categories/*` - Stock Categories
- `/api/masters/units/*` - Units of Measurement

### User Management
- `/api/users/*` - User CRUD operations

### Request Headers
```
Content-Type: application/json
Authorization: Bearer <token>
```

## Dependencies

Updated `package.json`:
```json
{
  "dependencies": {
    "redux": "^4.2.1",
    "redux-thunk": "^2.4.2"
  }
}
```

## Error Handling

All screens include error handling with user-friendly alerts:
- API errors display in red alert boxes
- Form validation errors
- Network connectivity issues
- Authorization errors with redirect to login

## Features Summary

✅ Redux state management for centralized app state
✅ Four new Master data screens (Accounts, Cost Centers, Categories, Units)
✅ Comprehensive User Management system
✅ Role-based user roles (Admin, Manager, User, Viewer)
✅ Search and filter functionality
✅ CRUD operations for all masters
✅ User activation/deactivation
✅ Enhanced navigation with organized menu sections
✅ Consistent error handling and alerts
✅ Token-based API authentication

## Future Enhancements

- Redux middleware for logging and debugging
- Offline caching using Redux persist
- Real-time updates using WebSockets
- Advanced filtering and pagination
- Bulk operations on masters
- User permission management per module
- Audit logging for changes
