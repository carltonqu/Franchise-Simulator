import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import '../styles/Auth.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [validationError, setValidationError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setValidationError('')
    setError('')

    // Validation
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      setIsSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="auth-split-container">
        {/* Left Side - Gradient Sidebar */}
        <div className="auth-sidebar">
          <div className="auth-sidebar-content">
            <h2>Worried your money might go to waste?</h2>
            <p>Try our Franchise Simulator and see what could happen before you invest — reduce risk and make smarter decisions.</p>
          </div>
        </div>

        {/* Right Side - Success Message */}
        <div className="auth-form-container">
          <div className="auth-form-wrapper" style={{ textAlign: 'center' }}>
            <h1>Check Your Email</h1>
            <p className="auth-subtitle">We've sent a verification link to <strong>{email}</strong></p>
            <p style={{ color: '#64748b', marginTop: '1rem' }}>
              Click the link in the email to verify your account and start using the app.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="auth-submit-btn"
              style={{ marginTop: '2rem' }}
            >
              Didn't receive it? Try again
            </button>
          </div>
        </div>
      </div>
    )
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
          <h1>Create an account</h1>
          <p className="auth-subtitle">Create an account to start simulating franchise scenarios and make smarter investment decisions with AI-powered analysis.</p>

          <form onSubmit={handleSubmit} className="auth-form-modern">
            {(error || validationError) && (
              <div className="auth-error-modern">
                {error || validationError}
              </div>
            )}

            <div className="form-group-modern">
              <label htmlFor="fullName">Fullname</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

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
              {isLoading ? 'Creating account...' : 'Password'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
