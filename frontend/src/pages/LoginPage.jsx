import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import '../styles/Auth.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const { login, error } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setNeedsVerification(false)
    setResendMessage('')
    setIsLoading(true)
    
    const result = await login(email, password)
    
    if (result.success) {
      navigate('/')
    } else if (result.needsVerification) {
      setNeedsVerification(true)
    }
    
    setIsLoading(false)
  }

  const handleResendVerification = async () => {
    setResendMessage('')
    try {
      const response = await fetch(`${API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      
      const data = await response.json()
      
      if (data.alreadyVerified) {
        setResendMessage('Email already verified. Please try logging in.')
      } else {
        setResendMessage('Verification email sent! Please check your inbox.')
      }
    } catch (err) {
      setResendMessage('Failed to send email. Please try again.')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h1>Welcome Back</h1>
            <p>Sign in to your Franchise Simulator account</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && !needsVerification && (
              <div className="auth-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {needsVerification && (
              <div className="auth-error" style={{ background: '#fef3c7', borderColor: '#fcd34d', color: '#92400e' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <div>
                  <p style={{ margin: 0, marginBottom: '0.5rem' }}>Please verify your email before logging in.</p>
                  <button 
                    type="button"
                    onClick={handleResendVerification}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#92400e',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: '0.875rem'
                    }}
                  >
                    Resend verification email
                  </button>
                  {resendMessage && (
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8125rem', color: '#166534' }}>
                      {resendMessage}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button 
              type="submit" 
              className="auth-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="btn-spinner"></span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>Don't have an account? <Link to="/register">Create one</Link></p>
            <Link to="/" className="back-link">← Continue without signing in</Link>
          </div>
        </div>

        <div className="auth-features">
          <h3>Why create an account?</h3>
          <ul>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Save unlimited simulation scenarios
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Access your history from any device
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Export detailed PDF reports
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Compare multiple scenarios side-by-side
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
