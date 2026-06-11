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
import nodemailer from 'nodemailer'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { Pool } = pg

// Create Express app
const app = express()
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-env'
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://franchise-simulator.vercel.app'

// Email transporter
function createTransporter() {
  console.log('Creating email transporter...')
  
  if (process.env.RESEND_API_KEY) {
    console.log('Using Resend email service')
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
    })
  }

  if (process.env.SENDGRID_API_KEY) {
    console.log('Using SendGrid email service')
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    })
  }

  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    console.log('Using Gmail email service')
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })
  }

  console.error('ERROR: No email service configured!')
  return null
}

const transporter = createTransporter()

async function sendVerificationEmail(email, token, frontendUrl) {
  if (!transporter) {
    throw new Error('Email service not configured')
  }
  
  const verificationUrl = `${frontendUrl}/verify-email?token=${token}`
  const fromEmail = process.env.FROM_EMAIL || 'noreply@franchisesimulator.com'
  const appName = process.env.APP_NAME || 'Franchise Simulator'

  const mailOptions = {
    from: `"${appName}" <${fromEmail}>`,
    to: email,
    subject: `Verify your email for ${appName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6366f1;">Welcome to ${appName}!</h2>
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
  }

  const info = await transporter.sendMail(mailOptions)
  console.log('Verification email sent:', info.messageId)
  return { success: true, messageId: info.messageId }
}

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
      max: 1
    })
  }
  
  if (!tablesCreated) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email_verified BOOLEAN DEFAULT FALSE,
        verification_token TEXT,
        verification_token_expires TIMESTAMP,
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
    res.json({ 
      ok: true, 
      db: 'connected',
      email: {
        configured: !!transporter,
        resend: !!process.env.RESEND_API_KEY,
        sendgrid: !!process.env.SENDGRID_API_KEY,
        gmail: !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
      }
    })
  } catch (error) {
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
    const verificationToken = randomUUID()
    const tokenExpires = new Date()
    tokenExpires.setHours(tokenExpires.getHours() + 24)

    // Create user
    const now = new Date().toISOString()
    const result = await client.query(
      `INSERT INTO users (id, email, password_hash, email_verified, verification_token, verification_token_expires, plan, plan_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [randomUUID(), email.toLowerCase(), await bcrypt.hash(password, 10), false, verificationToken, tokenExpires.toISOString(), 'free', 'active', now, now]
    )

    const user = result.rows[0]
    
    // Send verification email
    let emailSent = false
    try {
      await sendVerificationEmail(user.email, verificationToken, FRONTEND_URL)
      emailSent = true
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
    }
    
    res.status(201).json({ 
      message: emailSent 
        ? 'Registration successful. Please check your email to verify your account.'
        : 'Registration successful but email failed to send. Please contact support.',
      email: user.email,
      requiresVerification: true,
      emailSent
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
      return res.status(400).json({ error: 'Token required' })
    }

    const client = await getPool()
    const result = await client.query(
      'SELECT * FROM users WHERE verification_token = $1 AND verification_token_expires > NOW()',
      [token]
    )
    
    const user = result.rows[0]
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' })
    }

    // Update user as verified
    await client.query(
      'UPDATE users SET email_verified = TRUE, verification_token = NULL, verification_token_expires = NULL WHERE id = $1',
      [user.id]
    )

    const token = jwt.sign({ sub: user.id, email: user.email, plan: user.plan }, JWT_SECRET, { expiresIn: '7d' })
    
    res.json({ 
      message: 'Email verified successfully!',
      token,
      user: { id: user.id, email: user.email, plan: user.plan, planStatus: user.plan_status }
    })
  } catch (error) {
    console.error('Verify email error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Resend verification email
app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ error: 'Email required' })
    }

    const client = await getPool()
    const result = await client.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])
    const user = result.rows[0]
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    if (user.email_verified) {
      return res.status(400).json({ error: 'Email already verified', alreadyVerified: true })
    }

    // Generate new token
    const verificationToken = randomUUID()
    const tokenExpires = new Date()
    tokenExpires.setHours(tokenExpires.getHours() + 24)
    
    await client.query(
      'UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE id = $3',
      [verificationToken, tokenExpires.toISOString(), user.id]
    )

    // Send verification email
    try {
      await sendVerificationEmail(user.email, verificationToken, FRONTEND_URL)
      res.json({ message: 'Verification email sent' })
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      res.status(500).json({ error: 'Failed to send email' })
    }
  } catch (error) {
    console.error('Resend verification error:', error)
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

    if (!user.email_verified) {
      return res.status(403).json({ error: 'Email not verified', needsVerification: true, email: user.email })
    }

    const token = jwt.sign({ sub: user.id, email: user.email, plan: user.plan }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, user: { id: user.id, email: user.email, plan: user.plan, planStatus: user.plan_status } })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get current user
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    const token = authHeader.slice(7)
    const payload = jwt.verify(token, JWT_SECRET)
    
    const client = await getPool()
    const result = await client.query('SELECT id, email, plan, plan_status FROM users WHERE id = $1', [payload.sub])
    const user = result.rows[0]
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    res.json({ user: { ...user, planStatus: user.plan_status } })
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' })
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
  if (req.path.startsWith('/api/') || req.path === '/health') {
    return res.status(404).json({ error: 'Not found' })
  }
  
  const filePath = path.join(distPath, req.path)
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath)
  }
  
  res.sendFile(path.join(distPath, 'index.html'))
})

// Export for Vercel
export default app
