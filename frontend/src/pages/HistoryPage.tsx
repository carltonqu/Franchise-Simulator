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
      
      <main className="main-content">
        <div className="results-container">
          <section className="results-section">
            <div className="results-header">
              <h1>History</h1>
              <p>All your saved franchise simulation scenarios</p>
            </div>

            {savedScenarios.length === 0 ? (
              <div className="result-card full-width empty-state">
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
                <div className="history-stats">
                  <div className="result-card">
                    <span className="result-label">Total Scenarios</span>
                    <span className="result-value">{savedScenarios.length}</span>
                  </div>
                  <div className="result-card">
                    <span className="result-label">Best ROI</span>
                    <span className="result-value">
                      {Math.max(...savedScenarios.map(s => s.results.roi))}%
                    </span>
                  </div>
                  <div className="result-card">
                    <span className="result-label">Latest</span>
                    <span className="result-value">
                      {formatDate(savedScenarios[0].createdAt).split(',')[0]}
                    </span>
                  </div>
                </div>

                <div className="history-list">
                  {savedScenarios.map((scenario, index) => (
                    <div key={scenario.id} className="history-item">
                      <div className="history-number">{savedScenarios.length - index}</div>
                      
                      <div className="history-content">
                        <div className="history-main">
                          <h3>{scenario.name}</h3>
                          <span className="history-date">{formatDate(scenario.createdAt)}</span>
                        </div>
                        
                        <div className="history-details">
                          <span className="history-brand">{scenario.formData.brandName || 'Unnamed Brand'}</span>
                          <span className="history-location">📍 {scenario.formData.city || 'Unknown Location'}</span>
                          <span className="history-investment">
                            ${Number(scenario.formData.totalInitialInvestment || 0).toLocaleString()} investment
                          </span>
                        </div>

                        <div className="history-results">
                          <div className="history-metric">
                            <span>Profit</span>
                            <strong>{formatMoney(scenario.results.yearlyProfit)}</strong>
                          </div>
                          <div className="history-metric">
                            <span>ROI</span>
                            <strong>{scenario.results.roi}%</strong>
                          </div>
                          <div className="history-metric">
                            <span>Payback</span>
                            <strong>{scenario.results.paybackMonths} mo</strong>
                          </div>
                          <div className="history-metric">
                            <span>Risk</span>
                            <strong className={scenario.results.risk > 6 ? 'high-risk' : scenario.results.risk > 3 ? 'med-risk' : 'low-risk'}>
                              {scenario.results.risk}/10
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="history-actions">
                        <button 
                          className="action-btn view"
                          onClick={() => navigate(`/results/compare?highlight=${scenario.id}`)}
                        >
                          Compare
                        </button>
                        <button 
                          className="action-btn delete"
                          onClick={() => deleteScenario(scenario.id)}
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
