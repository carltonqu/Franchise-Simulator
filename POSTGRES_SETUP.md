# Vercel Postgres Setup

## Step 1: Create Vercel Postgres Database

1. Go to https://vercel.com/dashboard/stores
2. Click "Create Store" → "Postgres"
3. Select your project or create new
4. Choose region (closest to your users)
5. Click "Create"

## Step 2: Get Connection String

1. In your Vercel Dashboard, go to your project
2. Click "Storage" tab
3. Click your Postgres database
4. Click ".env.local" tab
5. Copy the `POSTGRES_URL` or `DATABASE_URL`

## Step 3: Update Backend Environment

```bash
cd backend

# Remove old Turso variables
vercel env rm DATABASE_URL -y
vercel env rm DATABASE_AUTH_TOKEN -y

# Add PostgreSQL URL
echo "your-postgres-url" | vercel env add DATABASE_URL production
```

## Step 4: Redeploy

```bash
vercel --prod --yes
```

## Local Development

For local development, you can use:
1. Local PostgreSQL (install with Homebrew: `brew install postgresql`)
2. Docker: `docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres`
3. Or use the Vercel Postgres database directly

## Connection String Format

```
postgresql://username:password@host:port/database?sslmode=require
```

## Free Tier Limits

- 256 MB storage
- 60 compute hours/month
- Perfect for small projects!

---

**Note:** You'll need to create the Postgres database in Vercel Dashboard first, then update the environment variable.
