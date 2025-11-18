# Authentication Backend Integration Summary

## Backend Requirements (Java 21 Spring Boot)

### Login Endpoint: `/auth/login`
**Request:**
```json
{
    "username": "string",
    "password": "string"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Login successful",
    "token": "jwt_token",
    "username": "string",
    "userId": "long",
    "role": "string",
    "fullName": "string"
}
```

### Register Endpoint: `/auth/register`
**Request:**
```json
{
    "username": "string",
    "email": "string",
    "password": "string",
    "fullName": "string"
}
```

**Response:**
```json
{
    "success": true,
    "message": "User registered successfully",
    "userId": "long",
    "username": "string"
}
```

---

## UI Changes Made

### 1. **Login Form (`pages/login.html`)**
- Changed field from `email` to `username`
- Updated label and placeholder text
- Updated demo credentials to show username example

### 2. **Signup Form (`pages/signup.html`)**
- Added `username` field (required)
- Kept `email` field (required by backend)
- Kept `firstName` and `lastName` fields (combined for fullName)
- Removed optional `company` field
- Form now collects: username, firstName, lastName, email, password

### 3. **Auth Handler (`pages/auth.js`)**

#### Login Handler Updates:
- Reads `username` field instead of `email`
- Sends only `username` and `password` to backend
- Stores response data: `username`, `userId`, `fullName`, `role`
- Uses `rememberedUsername` instead of `rememberedEmail`
- Parses JWT token from response

#### Signup Handler Updates:
- Collects all required fields: `username`, `email`, `password`, `fullName`
- Combines firstName and lastName to create fullName
- Sends correct payload to `/auth/register`:
  ```javascript
  {
      username: username,
      email: email,
      password: password,
      fullName: fullName
  }
  ```
- Redirects to login after successful registration

---

## Form Fields Mapping

### Login Form
| UI Field | API Field | Type |
|----------|-----------|------|
| username | username | text |
| password | password | password |

### Signup Form
| UI Field | API Field | Notes |
|----------|-----------|-------|
| firstName | firstName (local) | Combines with lastName |
| lastName | lastName (local) | Combines with firstName |
| username | username | Required, unique |
| email | email | Required, unique |
| password | password | Min 6 chars |
| confirmPassword | N/A | Client-side validation only |

---

## Storage in LocalStorage

After successful login:
```javascript
{
    authToken: "jwt_token",
    currentUser: {
        username: "string",
        userId: "number",
        fullName: "string",
        role: "string"
    },
    loginTime: "ISO timestamp",
    isAuthenticated: "true",
    rememberMe: "true" (if checked),
    rememberedUsername: "string" (if checked)
}
```

---

## Redux State After Login

```javascript
{
    user: {
        isAuthenticated: true,
        currentUser: {
            username: "string",
            userId: "number",
            fullName: "string",
            role: "string"
        },
        token: "jwt_token",
        error: null
    }
}
```

---

## Testing

### Test Login:
1. Create a test user via the signup form
2. Or use curl to register:
   ```bash
   curl -X POST http://localhost:8080/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "username": "testuser",
       "email": "test@example.com",
       "password": "password123",
       "fullName": "Test User"
     }'
   ```
3. Login with username and password

### Test Signup:
1. Fill in all fields in signup form
2. Submit
3. Should see success message and redirect to login
4. Check backend console for user creation

---

## Files Modified

- ✅ `pages/login.html` - Updated form field from email to username
- ✅ `pages/signup.html` - Added username field, removed company field
- ✅ `pages/auth.js` - Updated login and signup handlers to match backend

---

## Next Steps

1. Ensure backend is running on `http://localhost:8080`
2. Test login functionality
3. Test signup functionality
4. Verify JWT token storage
5. Test dashboard redirect after login
