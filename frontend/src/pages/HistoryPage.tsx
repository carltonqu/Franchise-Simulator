import { useNavigate } from 'react-router-dom'
import { useSavedScenarios } from '../results/SavedScenariosContext'
import { formatMoney } from '../results/resultsData'
import FormSidebar from '../components/FormSidebar'

export default function HistoryPage() {
  const { savedScenarios, deleteScenario } = useSavedScenarios()
  const navigate = useNavigate()

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="app-container">
      <FormSidebar />
      
      <main className="main-content" style={{ width: '100%', maxWidth: '100%' }}>
        <div className="results-container" style={{ width: '100%', maxWidth: '100%' }}>
          <section className="results-section">
            <div className="results-header" style={{ textAlign: 'center' }}>
              <h1>History</h1>
              <p>All your saved franchise simulation scenarios</p>
              <button 
                className="nav-btn next" 
                onClick={() => navigate('/app')}
                style={{ marginTop: '1rem' }}
              >
                Simulate Again
              </button>
            </div>

            {savedScenarios.length === 0 ? (
              <div className="result-card full-width empty-state" style={{ textAlign: 'center' }}>
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <span className="result-label">No Saved Scenarios Yet</span>
                <p className="empty-text">
                  Run a simulation and save it to build your history. 
                  All saved scenarios will appear here for easy comparison.
                </p>
                <button className="nav-btn next" onClick={() => navigate('/')}>
                  Create Your First Scenario
                </button>
              </div>
            ) : (
              <>
                <div className="history-stats" style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '1.5rem',
                  marginBottom: '2rem'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    color: 'white',
                    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                        </svg>
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, opacity: 0.9 }}>Total Scenarios</span>
                    </div>
                    <span style={{ fontSize: '2.5rem', fontWeight: 700, display: 'block' }}>{savedScenarios.length}</span>
                  </div>
                  
                  <div style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    color: 'white',
                    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                        </svg>
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, opacity: 0.9 }}>Best ROI</span>
                    </div>
                    <span style={{ fontSize: '2.5rem', fontWeight: 700, display: 'block' }}>
                      {Math.max(...savedScenarios.map(s => s.results.roi))}%
                    </span>
                  </div>
                  
                  <div style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    color: 'white',
                    boxShadow: '0 4px 20px rgba(245, 158, 11, 0.3)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, opacity: 0.9 }}>Latest</span>
                    </div>
                    <span style={{ fontSize: '1.75rem', fontWeight: 700, display: 'block' }}>
                      {formatDate(savedScenarios[0].createdAt).split(',')[0]}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {savedScenarios.map((scenario, index) => (
                    <div 
                      key={scenario.id} 
                      style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        border: '1px solid #e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.5rem',
                        transition: 'all 0.2s',
                      }}
                    >
                      {/* Number Badge */}
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        flexShrink: 0
                      }}>
                        {savedScenarios.length - index}
                      </div>
                      
                      {/* Main Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Header Row */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '1rem',
                          marginBottom: '0.75rem'
                        }}>
                          <h3 style={{ 
                            margin: 0, 
                            fontSize: '1.125rem', 
                            fontWeight: 600,
                            color: '#111827'
                          }}>
                            {scenario.name}
                          </h3>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            color: '#6b7280',
                            background: '#f3f4f6',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '20px'
                          }}>
                            {formatDate(scenario.createdAt)}
                          </span>
                        </div>
                        
                        {/* Details Row */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '1.5rem',
                          marginBottom: '1rem',
                          flexWrap: 'wrap'
                        }}>
                          <span style={{ 
                            fontSize: '0.875rem', 
                            color: '#4f46e5',
                            fontWeight: 500 
                          }}>
                            {scenario.formData.brandName || 'Unnamed Brand'}
                          </span>
                          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            📍 {scenario.formData.city || 'Unknown Location'}
                          </span>
                          <span style={{ 
                            fontSize: '0.875rem', 
                            color: '#059669',
                            fontWeight: 500 
                          }}>
                            ${Number(scenario.formData.totalInitialInvestment || 0).toLocaleString()} investment
                          </span>
                        </div>

                        {/* Metrics Row */}
                        <div style={{ 
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: '1rem',
                          background: '#f9fafb',
                          borderRadius: '12px',
                          padding: '1rem'
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Profit</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>{formatMoney(scenario.results.yearlyProfit)}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>ROI</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#059669' }}>{scenario.results.roi}%</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Payback</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>{scenario.results.paybackMonths} mo</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Risk</div>
                            <div style={{ 
                              fontSize: '1rem', 
                              fontWeight: 700, 
                              color: scenario.results.risk > 6 ? '#dc2626' : scenario.results.risk > 3 ? '#d97706' : '#059669'
                            }}>
                              {scenario.results.risk}/10
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.5rem',
                        flexShrink: 0
                      }}>
                        <button 
                          onClick={() => navigate(`/results/compare?highlight=${scenario.id}`)}
                          style={{
                            padding: '0.625rem 1.25rem',
                            background: '#4f46e5',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          Compare
                        </button>
                        <button 
                          onClick={() => deleteScenario(scenario.id)}
                          style={{
                            padding: '0.625rem 1.25rem',
                            background: 'white',
                            color: '#6b7280',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {savedScenarios.length >= 2 && (
                  <div className="result-card full-width compare-all">
                    <span className="result-label">Compare All Scenarios</span>
                    <p>See a detailed side-by-side comparison of all your saved scenarios to find the best investment opportunity.</p>
                    <button className="nav-btn next" onClick={() => navigate('/results/compare')}>
                      Compare All
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
