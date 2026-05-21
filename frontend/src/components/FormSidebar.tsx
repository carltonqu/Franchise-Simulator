import { resultSteps } from '../results/resultsData'

export default function FormSidebar() {
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
            <span className="profile-name">Dev Account</span>
            <span className="profile-role">Franchise Investor</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
