import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import pg from 'pg'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { Pool } = pg

// Create Express app
const app = express()
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-env'

// Middleware
app.use(cors())
app.use(express.json({ limit: '1mb' }))

// Serve static files from the dist folder
const distPath = path.join(__dirname, '../dist')
app.use(express.static(distPath))

// Database pool (lazy initialization)
let pool = null
let tablesCreated = false

async function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1 // Limit connections for serverless
    })
  }
  
  // Create tables on first use
  if (!tablesCreated) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        plan TEXT DEFAULT 'free',
        plan_status TEXT DEFAULT 'active',
        stripe_customer_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    tablesCreated = true
  }
  
  return pool
}

// Health check
app.get('/health', async (req, res) => {
  try {
    const client = await getPool()
    await client.query('SELECT 1')
    res.json({ ok: true, db: 'connected' })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: 'Email and password (min 6 chars) required' })
    }

    const client = await getPool()
    
    // Check if user exists
    const existing = await client.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists' })
    }

    // Create user
    const now = new Date().toISOString()
    const result = await client.query(
      `INSERT INTO users (id, email, password_hash, plan, plan_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [randomUUID(), email.toLowerCase(), await bcrypt.hash(password, 10), 'free', 'active', now, now]
    )

    const user = result.rows[0]
    const token = jwt.sign({ sub: user.id, email: user.email, plan: user.plan }, JWT_SECRET, { expiresIn: '7d' })
    
    res.status(201).json({ token, user: { id: user.id, email: user.email, plan: user.plan, planStatus: user.plan_status } })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    const client = await getPool()
    
    const result = await client.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])
    const user = result.rows[0]
    
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign({ sub: user.id, email: user.email, plan: user.plan }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, user: { id: user.id, email: user.email, plan: user.plan, planStatus: user.plan_status } })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Serve landing.html at root
app.get('/', (req, res) => {
  const landingPath = path.join(distPath, 'landing.html')
  if (fs.existsSync(landingPath)) {
    res.sendFile(landingPath)
  } else {
    res.json({ message: 'Franchise Simulator API', status: 'ok' })
  }
})

// Serve specific HTML files
app.get('/landing.html', (req, res) => {
  res.sendFile(path.join(distPath, 'landing.html'))
})

app.get('/onboarding.html', (req, res) => {
  res.sendFile(path.join(distPath, 'onboarding.html'))
})

app.get('/onboarding-2.html', (req, res) => {
  res.sendFile(path.join(distPath, 'onboarding-2.html'))
})

// Catch-all: Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/') || req.path === '/health') {
    return res.status(404).json({ error: 'Not found' })
  }
  
  // Check if requesting a static file
  const filePath = path.join(distPath, req.path)
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath)
  }
  
  // Serve index.html for SPA routes
  res.sendFile(path.join(distPath, 'index.html'))
})

// Export for Vercel
export default app
