import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import Stripe from 'stripe'
import { randomUUID } from 'crypto'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, '../data')
const DB_PATH = path.join(DATA_DIR, 'db.json')

const app = express()
const PORT = process.env.PORT || 8787
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-env'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5174'

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(
      DB_PATH,
      JSON.stringify({ users: [], subscriptions: [], simulations: [] }, null, 2),
      'utf8'
    )
  }
}

function readDb() {
  ensureDb()
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
}

function writeDb(next) {
  fs.writeFileSync(DB_PATH, JSON.stringify(next, null, 2), 'utf8')
}

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user
  return safe
}

function createToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, plan: user.plan }, JWT_SECRET, { expiresIn: '7d' })
}

function authOptional(req, _res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    req.user = null
    return next()
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const db = readDb()
    req.user = db.users.find((u) => u.id === payload.sub) || null
  } catch {
    req.user = null
  }
  next()
}

function requireAuth(req, res, next) {
  authOptional(req, res, () => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
    next()
  })
}

function requirePlan(plan) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
    if (req.user.plan !== plan || req.user.planStatus !== 'active') {
      return res.status(402).json({ error: `Upgrade required: ${plan}` })
    }
    next()
  }
}

// Stripe webhook needs raw body
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe) return res.status(400).json({ error: 'Stripe not configured' })

  const sig = req.headers['stripe-signature']
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  const db = readDb()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.metadata?.userId
    if (userId) {
      const idx = db.users.findIndex((u) => u.id === userId)
      if (idx >= 0) {
        db.users[idx].plan = 'pro'
        db.users[idx].planStatus = 'active'
        db.users[idx].stripeCustomerId = session.customer
        db.users[idx].updatedAt = new Date().toISOString()
      }
    }
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const sub = event.data.object
    const userIdx = db.users.findIndex((u) => u.stripeCustomerId === sub.customer)
    if (userIdx >= 0) {
      const active = ['active', 'trialing'].includes(sub.status)
      db.users[userIdx].plan = active ? 'pro' : 'free'
      db.users[userIdx].planStatus = active ? 'active' : 'inactive'
      db.users[userIdx].updatedAt = new Date().toISOString()
    }
  }

  writeDb(db)
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

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: 'Email and password (min 6 chars) are required' })
    }

    const db = readDb()
    if (db.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase())) {
      return res.status(409).json({ error: 'Email already exists' })
    }

    const now = new Date().toISOString()
    const user = {
      id: randomUUID(),
      email: String(email).toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      plan: 'free',
      planStatus: 'active',
      stripeCustomerId: null,
      createdAt: now,
      updatedAt: now,
    }

    db.users.push(user)
    writeDb(db)

    const token = createToken(user)
    res.status(201).json({ token, user: sanitizeUser(user) })
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to register' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    const db = readDb()
    const user = db.users.find((u) => u.email === String(email).toLowerCase())
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const ok = await bcrypt.compare(password || '', user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

    const token = createToken(user)
    res.json({ token, user: sanitizeUser(user) })
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to login' })
  }
})

app.get('/api/me', requireAuth, (req, res) => {
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

app.post('/api/simulations', requireAuth, (req, res) => {
  const db = readDb()
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
  db.simulations.unshift(simulation)
  writeDb(db)
  res.status(201).json({ simulation })
})

app.get('/api/simulations', requireAuth, (req, res) => {
  const db = readDb()
  const list = db.simulations.filter((s) => s.userId === req.user.id)
  const limit = req.user.plan === 'pro' ? 100 : 3
  res.json({ simulations: list.slice(0, limit) })
})

app.post('/api/report', authOptional, async (req, res) => {
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

    const isPro = req.user?.plan === 'pro' && req.user?.planStatus === 'active'

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
})
