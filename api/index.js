import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID, randomBytes } from 'crypto'
import pg from 'pg'

dotenv.config()

const { Pool } = pg

// Create Express app
const app = express()
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-env'

// Middleware
app.use(cors())
app.use(express.json({ limit: '1mb' }))

// Database pool (lazy initialization)
let pool = null
let tablesCreated = false

async function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL not set')
    }
    pool = new Pool({
      connectionString: connectionString,
      ssl: { rejectUnauthorized: false },
      max: 1 // Limit connections for serverless
    })
  }
  
  // Create tables on first use
  if (!tablesCreated) {
    // Users table with email verification
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email_verified BOOLEAN DEFAULT FALSE,
        email_verification_token TEXT,
        email_verification_expires TIMESTAMP,
        plan TEXT DEFAULT 'free',
        plan_status TEXT DEFAULT 'active',
        stripe_customer_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Add email verification columns if they don't exist (for existing tables)
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`)
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT`)
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP`)
    } catch (e) {
      // Columns might already exist, ignore error
    }
    
    tablesCreated = true
  }
  
  return pool
}

// Resend email sending function
async function sendVerificationEmail(email, token) {
  const verificationUrl = `${process.env.FRONTEND_URL || 'https://franchise-simulator.vercel.app'}/verify-email?token=${token}`
  
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev'
  
  if (!RESEND_API_KEY) {
    console.log('========================================')
    console.log('EMAIL VERIFICATION (NO API KEY - LOGGING ONLY)')
    console.log('To:', email)
    console.log('Verification URL:', verificationUrl)
    console.log('========================================')
    return { success: true, verificationUrl, mock: true }
  }
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: 'Verify your email for Franchise Simulator',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #6366f1;">Welcome to Franchise Simulator!</h2>
            <p>Thank you for creating an account. Please verify your email address to start using the app.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: linear-gradient(90deg, #8b5cf6 0%, #6366f1 100%); 
                        color: white; 
                        padding: 14px 28px; 
                        text-decoration: none; 
                        border-radius: 8px; 
                        font-weight: 600;
                        display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <a href="${verificationUrl}" style="color: #6366f1;">${verificationUrl}</a>
            </p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
        `,
        text: `Welcome to Franchise Simulator!\n\nThank you for creating an account. Please verify your email address to start using the app.\n\nClick the link below to verify your email:\n${verificationUrl}\n\nThis link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.`
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('Resend API error:', error)
      throw new Error('Failed to send email')
    }
    
    const data = await response.json()
    console.log('Email sent successfully:', data.id)
    return { success: true, emailId: data.id }
  } catch (error) {
    console.error('Failed to send email:', error)
    // Still return success but log the error - user can request resend
    return { success: true, verificationUrl, error: error.message }
  }
}

// Health check - simple version
app.get('/health', (req, res) => {
  res.json({ ok: true, message: 'Franchise Simulator API is running' })
})

// Database health check
app.get('/health/db', async (req, res) => {
  try {
    const client = await getPool()
    await client.query('SELECT 1')
    res.json({ ok: true, db: 'connected' })
  } catch (error) {
    console.error('DB Error:', error)
    res.status(500).json({ ok: false, error: error.message })
  }
})

// Register with email verification
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

    // Generate verification token
    const verificationToken = randomBytes(32).toString('hex')
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours

    // Create user
    const now = new Date().toISOString()
    const result = await client.query(
      `INSERT INTO users (id, email, password_hash, email_verified, email_verification_token, email_verification_expires, plan, plan_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [randomUUID(), email.toLowerCase(), await bcrypt.hash(password, 10), false, verificationToken, verificationExpires, 'free', 'active', now, now]
    )

    const user = result.rows[0]
    
    // Send verification email
    const emailResult = await sendVerificationEmail(user.email, verificationToken)
    
    res.status(201).json({ 
      message: 'Registration successful. Please check your email to verify your account.',
      email: user.email,
      emailVerified: false,
      // In development, include the verification URL
      ...(process.env.NODE_ENV !== 'production' && { verificationUrl: emailResult.verificationUrl })
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Verify email
app.get('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.query
    
    if (!token) {
      return res.status(400).json({ error: 'Verification token required' })
    }

    const client = await getPool()
    
    // Find user with this token
    const result = await client.query(
      'SELECT * FROM users WHERE email_verification_token = $1 AND email_verification_expires > NOW()',
      [token]
    )
    
    const user = result.rows[0]
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' })
    }

    // Mark email as verified
    await client.query(
      `UPDATE users SET email_verified = TRUE, email_verification_token = NULL, email_verification_expires = NULL, updated_at = NOW() WHERE id = $1`,
      [user.id]
    )

    // Generate auth token
    const authToken = jwt.sign({ sub: user.id, email: user.email, plan: user.plan }, JWT_SECRET, { expiresIn: '7d' })
    
    res.json({ 
      message: 'Email verified successfully!',
      token: authToken,
      user: { 
        id: user.id, 
        email: user.email, 
        plan: user.plan, 
        planStatus: user.plan_status,
        emailVerified: true
      }
    })
  } catch (error) {
    console.error('Verify email error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Resend verification email
app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body || {}
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' })
    }

    const client = await getPool()
    
    // Find user
    const result = await client.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])
    const user = result.rows[0]
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email already verified' })
    }

    // Generate new verification token
    const verificationToken = randomBytes(32).toString('hex')
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    // Update user with new token
    await client.query(
      `UPDATE users SET email_verification_token = $1, email_verification_expires = $2, updated_at = NOW() WHERE id = $3`,
      [verificationToken, verificationExpires, user.id]
    )

    // Send verification email
    const emailResult = await sendVerificationEmail(user.email, verificationToken)
    
    res.json({ 
      message: 'Verification email sent. Please check your inbox.',
      // In development, include the verification URL
      ...(process.env.NODE_ENV !== 'production' && { verificationUrl: emailResult.verificationUrl })
    })
  } catch (error) {
    console.error('Resend verification error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Login (requires verified email)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    const client = await getPool()
    
    const result = await client.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])
    const user = result.rows[0]
    
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({ 
        error: 'Email not verified. Please check your email for verification link.',
        emailVerified: false,
        email: user.email
      })
    }

    const token = jwt.sign({ sub: user.id, email: user.email, plan: user.plan }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        plan: user.plan, 
        planStatus: user.plan_status,
        emailVerified: user.email_verified
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Admin bypass login - allows login without email verification
app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { email, password, adminKey } = req.body || {}
    
    // Simple admin key check - you should change this to a secure key
    const ADMIN_KEY = process.env.ADMIN_KEY || 'admin-secret-key-2024'
    
    if (adminKey !== ADMIN_KEY) {
      return res.status(403).json({ error: 'Invalid admin key' })
    }
    
    const client = await getPool()
    
    const result = await client.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])
    const user = result.rows[0]
    
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Auto-verify email if not verified
    if (!user.email_verified) {
      await client.query(
        `UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = $1`,
        [user.id]
      )
      user.email_verified = true
    }

    const token = jwt.sign({ sub: user.id, email: user.email, plan: user.plan }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        plan: user.plan, 
        planStatus: user.plan_status,
        emailVerified: true
      }
    })
  } catch (error) {
    console.error('Admin login error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get current user
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET)
    
    const client = await getPool()
    const result = await client.query('SELECT id, email, plan, plan_status, email_verified, created_at FROM users WHERE id = $1', [decoded.sub])
    const user = result.rows[0]
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(401).json({ error: 'Invalid token' })
  }
})

// Export for Vercel
export default app
