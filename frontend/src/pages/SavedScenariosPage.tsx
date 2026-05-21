import { useNavigate } from 'react-router-dom'
import { useSavedScenarios } from '../results/SavedScenariosContext'
import { formatMoney } from '../results/resultsData'
import ResultsNavigation from '../components/ResultsNavigation'

export default function SavedScenariosPage() {
  const { savedScenarios, deleteScenario } = useSavedScenarios()
  const navigate = useNavigate()

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <section className="results-section">
      <div className="results-header">
        <h1>Saved Scenarios</h1>
        <p>Compare your franchise investment scenarios</p>
      </div>

      {savedScenarios.length === 0 ? (
        <div className="result-card full-width empty-state">
          <span className="result-label">No Saved Scenarios</span>
          <p className="empty-text">
            You haven't saved any scenarios yet. Run a simulation and save it to compare later.
          </p>
          <button className="nav-btn next" onClick={() => navigate('/')}>
            Create Your First Scenario
          </button>
        </div>
      ) : (
        <>
          <div className="saved-scenarios-grid">
            {savedScenarios.map((scenario) => (
              <div key={scenario.id} className="saved-scenario-card">
                <div className="scenario-header">
                  <h3>{scenario.name}</h3>
                  <span className="scenario-date">{formatDate(scenario.createdAt)}</span>
                </div>
                
                <div className="scenario-details">
                  <div className="detail-row">
                    <span>Brand:</span>
                    <strong>{scenario.formData.brandName || 'Unnamed'}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Location:</span>
                    <strong>{scenario.formData.city || 'Not specified'}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Investment:</span>
                    <strong>${Number(scenario.formData.totalInitialInvestment || 0).toLocaleString()}</strong>
                  </div>
                </div>

                <div className="scenario-results-preview">
                  <div className="preview-item">
                    <span>Profit</span>
                    <strong>{formatMoney(scenario.results.yearlyProfit)}</strong>
                  </div>
                  <div className="preview-item">
                    <span>ROI</span>
                    <strong>{scenario.results.roi}%</strong>
                  </div>
                  <div className="preview-item">
                    <span>Risk</span>
                    <strong className={scenario.results.risk > 6 ? 'high-risk' : scenario.results.risk > 3 ? 'med-risk' : 'low-risk'}>
                      {scenario.results.risk}/10
                    </strong>
                  </div>
                </div>

                <div className="scenario-actions">
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
              <p>View a detailed side-by-side comparison of all your saved scenarios.</p>
              <button className="nav-btn next" onClick={() => navigate('/results/compare')}>
                Compare All
              </button>
            </div>
          )}
        </>
      )}

      <ResultsNavigation back="/results/export" />
    </section>
  )
}
