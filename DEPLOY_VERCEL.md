# Deploy Franchise Simulator to Vercel

Your app is now configured with Turso database! Here's how to deploy both frontend and backend to Vercel.

## ✅ Current Status

- **Database**: Turso Cloud (configured)
- **Backend**: Express.js with Turso
- **Frontend**: Vite + React

## Step 1: Deploy Backend to Vercel

### 1.1 Install Vercel CLI
```bash
npm i -g vercel
```

### 1.2 Login to Vercel
```bash
vercel login
```

### 1.3 Deploy Backend
```bash
cd backend

# Set environment variables
vercel env add DATABASE_URL
# Enter: libsql://franchise-app-clockroster.aws-ap-northeast-1.turso.io

vercel env add DATABASE_AUTH_TOKEN
# Enter: eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzkzNDQyNjcsImlkIjoiMDE5ZTQ5MjAtNzAwMS03ZTkwLTgzNDgtZmE1MWI1MTI3NDRhIiwicmlkIjoiMmExOGYxMGQtZDI4Ny00Y2NkLWI2ZWYtMWQxNThmMWU2OWJmIn0.nIEO029xG8IfsQKSO9ROCSFvZTforvVe1J2I8V37za_7UKkohoZiwAwVElnfUG_GE4_kR5UDSIkqbUKy_NyfAg

vercel env add JWT_SECRET
# Generate with: openssl rand -base64 32

vercel env add FRONTEND_URL
# Enter: https://franchise-simulator-frontend.vercel.app (we'll update this after frontend deploy)

# Deploy
vercel --prod
```

**Note the backend URL** (e.g., `https://franchise-simulator-backend.vercel.app`)

## Step 2: Deploy Frontend to Vercel

### 2.1 Update Frontend API URL
```bash
cd frontend

# Set the API base URL
vercel env add VITE_API_BASE_URL
# Enter: https://franchise-simulator-backend.vercel.app (from step 1)
```

### 2.2 Deploy Frontend
```bash
vercel --prod
```

**Note the frontend URL** (e.g., `https://franchise-simulator-frontend.vercel.app`)

## Step 3: Update Backend CORS

Go back to backend and update the FRONTEND_URL:

```bash
cd backend
vercel env add FRONTEND_URL
# Enter: https://franchise-simulator-frontend.vercel.app (from step 2)

# Redeploy
vercel --prod
```

## Environment Variables Summary

### Backend (Vercel)
```
DATABASE_URL=libsql://franchise-app-clockroster.aws-ap-northeast-1.turso.io
DATABASE_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
JWT_SECRET=your-generated-secret
FRONTEND_URL=https://franchise-simulator-frontend.vercel.app
# Optional:
# STRIPE_SECRET_KEY=sk_...
# STRIPE_WEBHOOK_SECRET=whsec_...
# STRIPE_PRICE_ID=price_...
# ANTHROPIC_API_KEY=sk-ant-...
```

### Frontend (Vercel)
```
VITE_API_BASE_URL=https://franchise-simulator-backend.vercel.app
```

## Quick Deploy Script

Create `deploy.sh`:

```bash
#!/bin/bash

echo "🚀 Deploying Franchise Simulator to Vercel"
echo "==========================================="

# Backend
echo "📦 Deploying Backend..."
cd backend
vercel --prod
BACKEND_URL=$(vercel --json | jq -r '.url')
echo "Backend URL: $BACKEND_URL"

# Frontend
echo "📦 Deploying Frontend..."
cd ../frontend
vercel env add VITE_API_BASE_URL "$BACKEND_URL"
vercel --prod

echo "✅ Deployment Complete!"
```

## Test Your Deployment

1. Visit your frontend URL
2. Register a new account
3. Run a simulation
4. Check data persists in Turso!

## Troubleshooting

**CORS errors:**
- Make sure FRONTEND_URL matches your actual frontend domain
- Include https://

**Database connection errors:**
- Verify DATABASE_URL and DATABASE_AUTH_TOKEN are correct
- Check Turso dashboard: https://turso.tech/app

**Build errors:**
- Ensure @libsql/client is in dependencies (not devDependencies)
- Check all environment variables are set

## Your Live URLs Will Be:

- **Frontend**: `https://franchise-simulator-frontend.vercel.app`
- **Backend**: `https://franchise-simulator-backend.vercel.app`
- **Database**: Turso Cloud (already configured)

---

Ready to deploy! Run the commands above 🚀
