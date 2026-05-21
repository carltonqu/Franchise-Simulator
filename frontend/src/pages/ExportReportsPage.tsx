import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ResultsNavigation from '../components/ResultsNavigation'
import { useSavedScenarios } from '../results/SavedScenariosContext'
import { useResults } from '../results/ResultsContext'

export default function ExportReportsPage() {
  const { scenario, scenarioKey } = useResults()
  const { saveScenario } = useSavedScenarios()
  const navigate = useNavigate()
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [scenarioName, setScenarioName] = useState('')
  const [saved, setSaved] = useState(false)

  const sections = [
    'Executive Summary', 
    'Revenue & Cost Forecasts', 
    'Profit/Risk Analysis', 
    'Mistake Prevention Insights', 
    'Scenario Comparison'
  ]

  const handleSave = () => {
    if (!scenarioName.trim()) return

    const formData = {
      brandName: 'Sample Brand',
      city: 'Sample City',
      franchiseFee: '50000',
      totalInitialInvestment: '250000',
      royaltyPercent: '6',
      marketingFeePercent: '2',
      monthlyRent: '8000',
      monthlyLaborCost: '15000',
      cogsPercent: '30',
      averageOrderValue: '25',
      ordersPerDay: '100',
      rampUpMonths: '3',
    }

    saveScenario({
      name: scenarioName,
      formData,
      results: {
        scenarioKey,
        yearlyProfit: scenario.yearlyProfit,
        roi: scenario.roi,
        paybackMonths: scenario.paybackMonths,
        risk: scenario.risk,
      },
    })

    setSaved(true)
    setTimeout(() => {
      setShowSaveModal(false)
      setSaved(false)
      setScenarioName('')
    }, 1500)
  }

  return (
    <section className="results-section">
      <div className="results-header">
        <h1>Export Reports</h1>
        <p>Download your simulation results</p>
      </div>

      {/* Report Preview */}
      <div className="result-card full-width">
        <span className="result-label">Report Preview</span>
        <p className="report-preview-text">
          Franchise Investment Simulation • Prepared for investor review • Last updated just now
        </p>
      </div>

      {/* Export Buttons */}
      <div className="export-actions">
        <button className="export-btn secondary">Export CSV</button>
        <button className="export-btn primary">Export PDF</button>
      </div>

      {/* Included Sections */}
      <div className="result-card full-width">
        <span className="result-label">Included Sections</span>
        <ul className="sections-list">
          {sections.map((section) => (
            <li key={section}>✓ {section}</li>
          ))}
        </ul>
      </div>

      {/* Navigation with Save Button */}
      <div className="results-navigation">
        <button className="nav-btn back" onClick={() => navigate('/results/compare')}>
          ← Back
        </button>
        <div className="nav-right">
          <button className="nav-btn save" onClick={() => setShowSaveModal(true)}>
            💾 Save Scenario
          </button>
          <button className="nav-btn finish" onClick={() => navigate('/')}>  
            Finish
          </button>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Save Scenario</h3>
            {saved ? (
              <div className="save-success">
                <span className="success-icon">✓</span>
                <p>Scenario saved to history!</p>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Enter scenario name (e.g., 'McDonald's Sydney')"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  className="scenario-name-input"
                  autoFocus
                />
                <div className="modal-actions">
                  <button className="nav-btn back" onClick={() => setShowSaveModal(false)}>
                    Cancel
                  </button>
                  <button 
                    className="nav-btn next" 
                    onClick={handleSave}
                    disabled={!scenarioName.trim()}
                  >
                    Save to History
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
