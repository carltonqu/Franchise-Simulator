import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

// Lazy pool creation
let pool = null

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  }
  return pool
}

// Track initialization
let initialized = false

// Initialize database tables
export async function initDb() {
  if (initialized) return
  
  try {
    const client = getPool()
    
    // Users table with email verification
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email_verified BOOLEAN DEFAULT false,
        verification_token TEXT,
        verification_token_expires TIMESTAMP,
        plan TEXT DEFAULT 'free',
        plan_status TEXT DEFAULT 'active',
        stripe_customer_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Simulations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS simulations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        input_json TEXT NOT NULL,
        result_json TEXT NOT NULL,
        ai_report_json TEXT,
        is_shallow BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    initialized = true
    console.log('Database initialized')
  } catch (error) {
    console.error('Database initialization error:', error)
    throw error
  }
}

// User operations
export async function createUser(user) {
  const result = await getPool().query(
    `INSERT INTO users (id, email, password_hash, email_verified, verification_token, verification_token_expires, plan, plan_status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [user.id, user.email, user.passwordHash, user.emailVerified || false, user.verificationToken, user.verificationTokenExpires, user.plan, user.planStatus, user.createdAt, user.updatedAt]
  )
  return result.rows[0]
}

export async function getUserByEmail(email) {
  const result = await getPool().query(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase()]
  )
  return result.rows[0] || null
}

export async function getUserById(id) {
  const result = await getPool().query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  )
  return result.rows[0] || null
}

export async function getUserByVerificationToken(token) {
  const result = await getPool().query(
    'SELECT * FROM users WHERE verification_token = $1',
    [token]
  )
  return result.rows[0] || null
}

export async function updateUser(userId, updates) {
  const allowedFields = ['plan', 'plan_status', 'stripe_customer_id', 'email_verified', 'verification_token', 'verification_token_expires']
  const setClause = []
  const values = []
  let paramIndex = 1
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setClause.push(`${key} = $${paramIndex}`)
      values.push(value)
      paramIndex++
    }
  }
  
  if (setClause.length === 0) return
  
  values.push(userId)
  const result = await getPool().query(
    `UPDATE users SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`,
    values
  )
  return result.rows[0]
}

// Simulation operations
export async function createSimulation(simulation) {
  const result = await getPool().query(
    `INSERT INTO simulations (id, user_id, input_json, result_json, ai_report_json, is_shallow, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      simulation.id,
      simulation.userId,
      JSON.stringify(simulation.inputJson),
      JSON.stringify(simulation.resultJson),
      simulation.aiReportJson ? JSON.stringify(simulation.aiReportJson) : null,
      simulation.isShallow,
      simulation.createdAt,
      simulation.updatedAt
    ]
  )
  return result.rows[0]
}

export async function getSimulationsByUser(userId, limit = 100) {
  const result = await getPool().query(
    `SELECT * FROM simulations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  )
  return result.rows.map(row => ({
    ...row,
    inputJson: JSON.parse(row.input_json),
    resultJson: JSON.parse(row.result_json),
    aiReportJson: row.ai_report_json ? JSON.parse(row.ai_report_json) : null,
    isShallow: row.is_shallow
  }))
}

// Helper to sanitize user (remove password_hash)
export function sanitizeUser(user) {
  if (!user) return null
  const { password_hash, passwordHash, verification_token, verification_token_expires, ...safe } = user
  return {
    ...safe,
    plan: safe.plan || 'free',
    planStatus: safe.plan_status || 'active',
    emailVerified: safe.email_verified || false
  }
}
