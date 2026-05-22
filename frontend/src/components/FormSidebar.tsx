import { resultSteps } from '../results/resultsData'
import { useAuth } from '../auth/AuthContext'

export default function FormSidebar() {
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <aside className="sidebar">
      <div className="sidebar-content">
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

            return (
              <div
                key={step.path}
                className="feature-item"
                style={{ cursor: 'default' }}
              >
                <div className="feature-dot">
                  <span style={{ 
                    color: 'rgba(255, 255, 255, 0.7)', 
                    fontSize: '10px', 
                    fontWeight: 'bold' 
                  }}>
                    {stepNumber}
                  </span>
                </div>
                <div className="feature-text">
                  <h4>{step.title}</h4>
                  <p>{step.description}</p>
                </div>
              </div>
            )
          })}
        </nav>

        {/* Profile Account Section */}
        <div className="sidebar-profile">
          <div className="profile-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div className="profile-info">
            {isAuthenticated ? (
              <>
                <span className="profile-name">{user?.email?.split('@')[0] || 'User'}</span>
                <span className="profile-role">
                  {user?.plan === 'pro' ? 'Pro Member' : 'Free Member'}
                </span>
              </>
            ) : (
              <>
                <span className="profile-name">Guest</span>
                <span className="profile-role">
                  <a href="/login" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'underline' }}>
                    Sign in to save
                  </a>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Auth Links for non-authenticated users */}
        {!isAuthenticated && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.5rem',
            marginTop: '0.5rem',
            padding: '0.75rem',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '8px'
          }}>
            <a 
              href="/login" 
              style={{ 
                color: 'white', 
                fontSize: '0.875rem', 
                fontWeight: 500,
                textDecoration: 'none',
                padding: '0.5rem',
                textAlign: 'center',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.3)'
              }}
            >
              Sign In
            </a>
            <a 
              href="/register" 
              style={{ 
                color: '#4f46e5', 
                fontSize: '0.875rem', 
                fontWeight: 600,
                textDecoration: 'none',
                padding: '0.5rem',
                textAlign: 'center',
                borderRadius: '6px',
                background: 'white'
              }}
            >
              Create Account
            </a>
          </div>
        )}

        {/* Logout button for authenticated users */}
        {isAuthenticated && (
          <button
            onClick={logout}
            style={{
              marginTop: '0.5rem',
              padding: '0.625rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        )}
      </div>
    </aside>
  )
}
