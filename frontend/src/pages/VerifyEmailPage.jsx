import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import '../styles/Auth.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  
  const [status, setStatus] = useState('verifying') // verifying, success, error
  const [message, setMessage] = useState('')
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid verification link. Please request a new one.')
      return
    }

    verifyEmail()
  }, [token])

  const verifyEmail = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-email?token=${token}`)
      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage(data.message)
        setUser(data.user)
        
        // Auto-login: store token
        if (data.token) {
          localStorage.setItem('token', data.token)
        }
      } else {
        setStatus('error')
        setMessage(data.error || 'Failed to verify email')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container" style={{ justifyContent: 'center' }}>
        <div className="auth-card" style={{ maxWidth: '480px' }}>
          <div className="auth-header">
            <div className="auth-logo">
              {status === 'verifying' && (
                <div className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}></div>
              )}
              {status === 'success' && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'white' }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              )}
              {status === 'error' && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'white' }}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              )}
            </div>
            
            <h1>
              {status === 'verifying' && 'Verifying Email...'}
              {status === 'success' && 'Email Verified!'}
              {status === 'error' && 'Verification Failed'}
            </h1>
            
            <p>{message}</p>
          </div>

          {status === 'success' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                Your account is now active. You can start using the Franchise Simulator.
              </p>
              <Link to="/" className="auth-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
                Start Simulating
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                The verification link may have expired or is invalid.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <Link to="/login" className="auth-btn" style={{ textDecoration: 'none' }}>
                  Go to Login
                </Link>
                <Link to="/register" className="auth-btn" style={{ 
                  textDecoration: 'none', 
                  background: 'white', 
                  color: '#6366f1',
                  border: '1px solid #6366f1'
                }}>
                  Create Account
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
