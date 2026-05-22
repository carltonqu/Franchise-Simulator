import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import Stripe from 'stripe'
import { randomUUID } from 'crypto'
import { initDb, createUser, getUserByEmail, getUserById, getUserByVerificationToken, updateUser, createSimulation, getSimulationsByUser, sanitizeUser } from './db.js'
import { sendVerificationEmail, sendWelcomeEmail } from './email.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 8787
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-env'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5174'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

// Initialize database (lazy init on first request)
let dbInitialized = false
async function ensureDb() {
  if (!dbInitialized) {
    await initDb()
    dbInitialized = true
  }
}

function createToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, plan: user.plan, emailVerified: user.email_verified }, JWT_SECRET, { expiresIn: '7d' })
}

async function authOptional(req, _res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    req.user = null
    return next()
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = await getUserById(payload.sub)
  } catch {
    req.user = null
  }
  next()
}

async function requireAuth(req, res, next) {
  await authOptional(req, res, () => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
    if (!req.user.email_verified) return res.status(403).json({ error: 'Email not verified', needsVerification: true })
    next()
  })
}

function requirePlan(plan) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
    if (!req.user.email_verified) return res.status(403).json({ error: 'Email not verified', needsVerification: true })
    if (req.user.plan !== plan || req.user.plan_status !== 'active') {
      return res.status(402).json({ error: `Upgrade required: ${plan}` })
    }
    next()
  }
}

// Stripe webhook needs raw body
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(400).json({ error: 'Stripe not configured' })

  const sig = req.headers['stripe-signature']
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.metadata?.userId
    if (userId) {
      await updateUser(userId, {
        plan: 'pro',
        plan_status: 'active',
        stripe_customer_id: session.customer
      })
    }
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const sub = event.data.object
    // Find user by stripe_customer_id
    const { getPool } = await import('./db.js')
    const result = await getPool().query(
      'SELECT * FROM users WHERE stripe_customer_id = $1',
      [sub.customer]
    )
    const user = result.rows[0]
    if (user) {
      const active = ['active', 'trialing'].includes(sub.status)
      await updateUser(user.id, {
        plan: active ? 'pro' : 'free',
        plan_status: active ? 'active' : 'inactive'
      })
    }
  }

  res.json({ received: true })
})

app.use(cors())
app.use(express.json({ limit: '1mb' }))

const extractJson = (raw) => {
  if (!raw) return null
  const trimmed = raw.trim()
  const withoutFences = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    return JSON.parse(withoutFences)
  } catch {
    const start = withoutFences.indexOf('{')
    const end = withoutFences.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(withoutFences.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

app.get('/health', async (_req, res) => {
  await ensureDb()
  res.json({ ok: true })
})

// Register - creates unverified user and sends verification email
app.post('/api/auth/register', async (req, res) => {
  await ensureDb()
  try {
    const { email, password } = req.body || {}
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: 'Email and password (min 6 chars) are required' })
    }

    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' })
    }

    // Generate verification token
    const verificationToken = randomUUID()
    const tokenExpires = new Date()
    tokenExpires.setHours(tokenExpires.getHours() + 24) // 24 hours expiry

    const now = new Date().toISOString()
    const user = {
      id: randomUUID(),
      email: String(email).toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      emailVerified: false,
      verificationToken: verificationToken,
      verificationTokenExpires: tokenExpires.toISOString(),
      plan: 'free',
      planStatus: 'active',
      stripeCustomerId: null,
      createdAt: now,
      updatedAt: now,
    }

    await createUser(user)

    // Send verification email
    try {
      await sendVerificationEmail(user.email, verificationToken, FRONTEND_URL)
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      // Continue - user is created, they can request a new verification email
    }

    res.status(201).json({ 
      message: 'Registration successful. Please check your email to verify your account.',
      email: user.email,
      requiresVerification: true
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: error.message || 'Failed to register' })
  }
})

// Verify email endpoint
app.get('/api/auth/verify-email', async (req, res) => {
  await ensureDb()
  try {
    const { token } = req.query
    
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' })
    }

    const user = await getUserByVerificationToken(token)
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' })
    }

    // Check if token is expired
    if (new Date(user.verification_token_expires) < new Date()) {
      return res.status(400).json({ error: 'Verification token has expired', expired: true })
    }

    // Check if already verified
    if (user.email_verified) {
      return res.json({ message: 'Email already verified', alreadyVerified: true })
    }

    // Mark email as verified
    await updateUser(user.id, {
      email_verified: true,
      verification_token: null,
      verification_token_expires: null
    })

    // Send welcome email
    try {
      await sendWelcomeEmail(user.email, FRONTEND_URL)
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
    }

    // Generate token for auto-login
    const authToken = createToken({ ...user, email_verified: true })

    res.json({ 
      message: 'Email verified successfully!',
      token: authToken,
      user: sanitizeUser({ ...user, email_verified: true })
    })
  } catch (error) {
    console.error('Verify email error:', error)
    res.status(500).json({ error: error.message || 'Failed to verify email' })
  }
})

// Resend verification email
app.post('/api/auth/resend-verification', async (req, res) => {
  await ensureDb()
  try {
    const { email } = req.body || {}
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const user = await getUserByEmail(email)
    
    if (!user) {
      // Don't reveal if user exists
      return res.json({ message: 'If an account exists, a verification email has been sent.' })
    }

    if (user.email_verified) {
      return res.json({ message: 'Email already verified', alreadyVerified: true })
    }

    // Generate new verification token
    const verificationToken = randomUUID()
    const tokenExpires = new Date()
    tokenExpires.setHours(tokenExpires.getHours() + 24)

    await updateUser(user.id, {
      verification_token: verificationToken,
      verification_token_expires: tokenExpires.toISOString()
    })

    // Send verification email
    await sendVerificationEmail(user.email, verificationToken, FRONTEND_URL)

    res.json({ message: 'Verification email sent. Please check your inbox.' })
  } catch (error) {
    console.error('Resend verification error:', error)
    res.status(500).json({ error: error.message || 'Failed to send verification email' })
  }
})

// Login - requires verified email
app.post('/api/auth/login', async (req, res) => {
  await ensureDb()
  try {
    const { email, password } = req.body || {}
    const user = await getUserByEmail(email)
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const ok = await bcrypt.compare(password || '', user.password_hash)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({ 
        error: 'Email not verified', 
        needsVerification: true,
        email: user.email
      })
    }

    const token = createToken(user)
    res.json({ token, user: sanitizeUser(user) })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: error.message || 'Failed to login' })
  }
})

app.get('/api/me', requireAuth, async (req, res) => {
  await ensureDb()
  res.json({ user: sanitizeUser(req.user) })
})

app.post('/api/billing/create-checkout-session', requireAuth, async (req, res) => {
  try {
    if (!stripe) return res.status(400).json({ error: 'Stripe not configured' })
    const priceId = process.env.STRIPE_PRICE_ID
    if (!priceId) return res.status(400).json({ error: 'STRIPE_PRICE_ID missing' })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: req.user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId: req.user.id },
      success_url: `${FRONTEND_URL}?billing=success`,
      cancel_url: `${FRONTEND_URL}?billing=cancel`,
    })

    res.json({ url: session.url })
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to create checkout session' })
  }
})

app.post('/api/simulations', requireAuth, async (req, res) => {
  await ensureDb()
  try {
    const now = new Date().toISOString()
    const simulation = {
      id: randomUUID(),
      userId: req.user.id,
      inputJson: req.body?.inputJson || {},
      resultJson: req.body?.resultJson || {},
      aiReportJson: req.body?.aiReportJson || {},
      isShallow: req.user.plan !== 'pro',
      createdAt: now,
      updatedAt: now,
    }
    await createSimulation(simulation)
    res.status(201).json({ simulation })
  } catch (error) {
    console.error('Create simulation error:', error)
    res.status(500).json({ error: error.message || 'Failed to save simulation' })
  }
})

app.get('/api/simulations', requireAuth, async (req, res) => {
  await ensureDb()
  try {
    const limit = req.user.plan === 'pro' ? 100 : 3
    const simulations = await getSimulationsByUser(req.user.id, limit)
    res.json({ simulations })
  } catch (error) {
    console.error('Get simulations error:', error)
    res.status(500).json({ error: error.message || 'Failed to get simulations' })
  }
})

app.post('/api/report', authOptional, async (req, res) => {
  await ensureDb()
  try {
    const { inputAssumptions, results } = req.body || {}
    if (!inputAssumptions || !results) {
      return res.status(400).json({ error: 'Missing inputAssumptions or results' })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return res.status(400).json({
        error: 'ANTHROPIC_API_KEY is not configured in backend/.env',
      })
    }

    const isPro = req.user?.plan === 'pro' && req.user?.plan_status === 'active'

    const prompt = `You are a financial simulation report assistant.
Return plain JSON only with this schema:
{
  "executiveSummary": string,
  "riskExplanation": string,
  "actionChecklist": string[],
  "disclaimer": string
}

Context:
- Product: Financial simulation tool, not investment advice
- Market: Australia restaurant franchise first-time operators
- Use deterministic results only
- User plan: ${isPro ? 'pro' : 'free'}
- If free: keep it short and high-level (max 3 actionChecklist points)

Input assumptions:
${JSON.stringify(inputAssumptions, null, 2)}

Computation results:
${JSON.stringify(results, null, 2)}
`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
        max_tokens: 900,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return res.status(500).json({ error: `Anthropic error: ${errText}` })
    }

    const data = await response.json()
    const text = data?.content?.[0]?.text || '{}'

    const parsedFromModel = extractJson(text)
    const parsed = parsedFromModel || {
      executiveSummary: text,
      riskExplanation: '',
      actionChecklist: [],
      disclaimer:
        'This is a financial simulation tool, not investment advice. Outputs depend on assumptions.',
    }

    if (!isPro) {
      parsed.actionChecklist = (parsed.actionChecklist || []).slice(0, 3)
      parsed.riskExplanation = String(parsed.riskExplanation || '').slice(0, 240)
      parsed.upgradeMessage = 'Upgrade to Pro to unlock full detailed analysis and complete action matrix.'
    }

    res.json(parsed)
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to generate report' })
  }
})

app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`)
  console.log(`Using database: ${process.env.DATABASE_URL?.includes('neon') ? 'Neon PostgreSQL' : 'Local'}`)
})
