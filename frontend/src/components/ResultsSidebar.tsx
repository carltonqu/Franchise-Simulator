import { useLocation, useNavigate } from 'react-router-dom'
import { resultSteps } from '../results/resultsData'
import { useAuth } from '../auth/AuthContext'

export default function ResultsSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()
  const currentStepIndex = resultSteps.findIndex((step) => step.path === location.pathname)

  const handleGoBack = () => {
    navigate('/')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
        </div>

        {/* Steps List */}
        <nav className="feature-list">
          {resultSteps.map((step, index) => {
            const stepNumber = index + 1
            const isActive = index === currentStepIndex
            const isCompleted = currentStepIndex > index

            return (
              <div
                key={step.path}
                className={`feature-item ${isActive ? 'active' : ''}`}
                onClick={() => navigate(step.path)}
                style={{ cursor: 'pointer' }}
              >
                <div className="feature-dot">
                  {(isActive || isCompleted) && (
                    <span style={{ 
                      color: isCompleted ? '#4f46e5' : 'white', 
                      fontSize: '10px', 
                      fontWeight: 'bold' 
                    }}>
                      {isCompleted ? '✓' : stepNumber}
                    </span>
                  )}
                  {!isActive && !isCompleted && (
                    <span style={{ 
                      color: 'rgba(255, 255, 255, 0.7)', 
                      fontSize: '10px', 
                      fontWeight: 'bold' 
                    }}>
                      {stepNumber}
                    </span>
                  )}
                </div>
                <div className="feature-text">
                  <h4>{step.title}</h4>
                  <p>{step.description}</p>
                </div>
              </div>
            )
          })}
        </nav>

        {/* Spacer to push profile to bottom */}
        <div style={{ flex: 1 }} />

        {/* Profile Section at Bottom - Only shows when logged in */}
        {isAuthenticated && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            {/* Profile Avatar and Email */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '0.75rem'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'white',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {user?.email || 'User'}
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.7)'
                }}>
                  {user?.plan === 'pro' ? 'Pro Member' : 'Free Member'}
                </span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              style={{
                width: '100%',
                padding: '0.625rem',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logout
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
