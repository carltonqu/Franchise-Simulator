# Franchise Simulator + Turso Setup

This guide sets up the Franchise Simulator with Turso (serverless SQLite) database for Vercel deployment.

## Quick Setup

### 1. Install Turso CLI
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

### 2. Login to Turso
```bash
turso auth login
```

### 3. Create Database
```bash
# Create the database
turso db create franchise-simulator

# Get the database URL
export DATABASE_URL=$(turso db show franchise-simulator --url)
echo $DATABASE_URL
# Output: libsql://franchise-simulator-YOURNAME.turso.io

# Create auth token
export DATABASE_AUTH_TOKEN=$(turso db tokens create franchise-simulator)
echo $DATABASE_AUTH_TOKEN
```

### 4. Setup Backend Environment

Create `backend/.env`:
```bash
cd backend
cat > .env << EOF
PORT=8787
JWT_SECRET=$(openssl rand -base64 32)
FRONTEND_URL=http://localhost:5174
DATABASE_URL=$DATABASE_URL
DATABASE_AUTH_TOKEN=$DATABASE_AUTH_TOKEN
# Add your other keys:
# STRIPE_SECRET_KEY=sk_...
# STRIPE_WEBHOOK_SECRET=whsec_...
# STRIPE_PRICE_ID=price_...
# ANTHROPIC_API_KEY=sk-ant-...
EOF
```

### 5. Install & Run

```bash
# Install backend dependencies
cd backend
npm install

# Run backend
npm run dev
```

The database will auto-initialize on first run!

## Deploy to Vercel

### Backend (Serverless Function)

1. **Create `backend/api/index.js`**:
```javascript
import app from '../src/server.js'
export default app
```

2. **Update `backend/package.json`**:
```json
{
  "scripts": {
    "dev": "node src/server.js",
    "start": "node src/server.js",
    "vercel-build": "echo 'Build complete'"
  }
}
```

3. **Add `backend/vercel.json`**:
```json
{
  "version": 2,
  "builds": [
    { "src": "api/index.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "api/index.js" }
  ]
}
```

4. **Deploy Backend**:
```bash
cd backend
vercel --prod
```

### Frontend

The frontend is already configured for Vercel in `vercel.json`.

```bash
cd frontend
vercel --prod
```

## Environment Variables for Production

### Backend (Vercel)
```
DATABASE_URL=libsql://franchise-simulator-YOURNAME.turso.io
DATABASE_AUTH_TOKEN=your-token
JWT_SECRET=your-secret
FRONTEND_URL=https://franchise-simulator-frontend.vercel.app
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
ANTHROPIC_API_KEY=sk-ant-...
```

### Frontend (Vercel)
```
VITE_API_BASE_URL=https://franchise-simulator-backend.vercel.app
```

## Turso CLI Commands

```bash
# List databases
turso db list

# Show database info
turso db show franchise-simulator

# Open SQL shell
turso db shell franchise-simulator

# Create new token
turso db tokens create franchise-simulator

# Rotate/invalidate old tokens
turso db tokens rotate franchise-simulator

# Destroy database (careful!)
turso db destroy franchise-simulator
```

## Database Schema

The app creates two tables automatically:

**users**
- id (TEXT PRIMARY KEY)
- email (TEXT UNIQUE)
- password_hash (TEXT)
- plan (TEXT: 'free' or 'pro')
- plan_status (TEXT)
- stripe_customer_id (TEXT)
- created_at (DATETIME)
- updated_at (DATETIME)

**simulations**
- id (TEXT PRIMARY KEY)
- user_id (TEXT)
- input_json (TEXT)
- result_json (TEXT)
- ai_report_json (TEXT)
- is_shallow (INTEGER)
- created_at (DATETIME)
- updated_at (DATETIME)

## Local Development vs Production

**Local:**
```env
DATABASE_URL=file:./data/local.db
# No DATABASE_AUTH_TOKEN needed
```

**Production (Turso):**
```env
DATABASE_URL=libsql://franchise-simulator-YOURNAME.turso.io
DATABASE_AUTH_TOKEN=your-token
```

The code automatically detects which to use!

## Troubleshooting

**"Authentication failed" error:**
- Check `DATABASE_AUTH_TOKEN` is correct
- Generate new token: `turso db tokens create franchise-simulator`

**"Database not found" error:**
- Verify database exists: `turso db list`
- Check URL is correct: `turso db show franchise-simulator --url`

**Build fails on Vercel:**
- Ensure `@libsql/client` is in dependencies (not devDependencies)
- Check all environment variables are set

## Free Tier Limits

**Turso:**
- 500 databases
- 9GB total storage
- 1 billion row reads/month
- 25 million row writes/month

**Vercel:**
- 100GB bandwidth
- 6,000 execution hours
- Serverless functions

More than enough for this app!

---

Ready to deploy! 🚀
