# Authentication Setup Guide

This document explains how the authentication system works in the Franchise Simulator app.

## Overview

The authentication system includes:
- User registration and login
- JWT token-based authentication
- Protected routes for authenticated features
- User state management via React Context

## File Structure

```
frontend/src/
├── auth/
│   └── AuthContext.jsx      # Authentication state management
├── pages/
│   ├── LoginPage.jsx        # Login form
│   ├── RegisterPage.jsx     # Registration form
│   └── ...
├── styles/
│   └── Auth.css             # Authentication page styles
└── utils/
    └── api.js               # API utilities with auth headers
```

## Backend API Endpoints

The backend already provides these endpoints:

- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Sign in
- `GET /api/me` - Get current user info
- `POST /api/simulations` - Save simulation (protected)
- `GET /api/simulations` - Get user's simulations (protected)

## Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:8787
```

For production, set this to your deployed backend URL.

## Features

### Public Pages (No login required)
- Home page with simulator form
- View simulation results
- Login/Register pages

### Protected Pages (Login required)
- History page (`/history`)
- Export reports page (`/results/export`)

### User Menu
When logged in, users see:
- Email address
- Plan badge (free/pro)
- Logout button

### Free vs Pro
- **Free users**: Can save up to 3 simulations
- **Pro users**: Unlimited saves, detailed AI reports

## Usage Example

```jsx
import { useAuth } from './auth/AuthContext'

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth()
  
  if (!isAuthenticated) {
    return <a href="/login">Please sign in</a>
  }
  
  return (
    <div>
      <p>Welcome, {user.email}!</p>
      <p>Plan: {user.plan}</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

## Protected Routes

To protect a route, wrap it with the `ProtectedRoute` component:

```jsx
<Route path="/history" element={
  <ProtectedRoute>
    <HistoryPage />
  </ProtectedRoute>
} />
```

## Testing

1. Start the backend: `cd backend && npm run dev`
2. Start the frontend: `cd frontend && npm run dev`
3. Open http://localhost:5174
4. Click "Create Account" to register
5. Try accessing `/history` when logged out (should redirect to login)

## Security Notes

- JWT tokens are stored in localStorage
- Tokens expire after 7 days
- All API requests include the Authorization header
- 401 responses automatically clear the token and redirect to login
