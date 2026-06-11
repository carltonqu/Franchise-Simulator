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
      // Redirect to simulator page after successful login
      window.location.href = '/app'
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
    <div className="auth-split-container">
      {/* Left Side - Gradient Sidebar */}
      <div className="auth-sidebar">
        <div className="auth-sidebar-content">
          <h2>Worried your money might go to waste?</h2>
          <p>Try our Franchise Simulator and see what could happen before you invest — reduce risk and make smarter decisions.</p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="auth-form-container">
        <div className="auth-form-wrapper">
          <h1>Welcome to VentureIQ!</h1>
          <p className="auth-subtitle">Sign in to access your saved simulations and continue evaluating franchise opportunities with AI-powered insights.</p>

          <form onSubmit={handleSubmit} className="auth-form-modern">
            {error && !needsVerification && (
              <div className="auth-error-modern">
                {error}
              </div>
            )}

            {needsVerification && (
              <div className="auth-warning-modern">
                <p>Please verify your email before logging in.</p>
                <button 
                  type="button"
                  onClick={handleResendVerification}
                  className="resend-link"
                >
                  Resend verification email
                </button>
                {resendMessage && (
                  <p className="resend-message">{resendMessage}</p>
                )}
              </div>
            )}

            <div className="form-group-modern">
              <label htmlFor="email">Your email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group-modern">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              className="auth-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Password'}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
