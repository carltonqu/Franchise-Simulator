import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ResultsNavigation from '../components/ResultsNavigation'
import { useSavedScenarios } from '../results/SavedScenariosContext'
import { useResults } from '../results/ResultsContext'
import { useAuth } from '../auth/AuthContext'

export default function ExportReportsPage() {
  const { scenario, scenarioKey } = useResults()
  const { saveScenario } = useSavedScenarios()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showFinishModal, setShowFinishModal] = useState(false)
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

  const handleFinish = () => {
    setShowFinishModal(true)
  }

  const handleSaveAndNew = () => {
    setShowFinishModal(false)
    setShowSaveModal(true)
  }

  const handleNewSimulation = () => {
    setShowFinishModal(false)
    navigate('/app')
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <section className="results-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh' }}>
      <div className="results-header" style={{ textAlign: 'center', width: '100%', maxWidth: '800px' }}>
        <h1>Export Reports</h1>
        <p>Download your simulation results</p>
      </div>

      {/* Logout Button */}
      <div style={{ position: 'absolute', top: '1.5rem', right: '2rem' }}>
        <button 
          onClick={handleLogout}
          style={{
            padding: '0.5rem 1rem',
            background: 'transparent',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: '#6b7280',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#ef4444'
            e.currentTarget.style.color = '#ef4444'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e5e7eb'
            e.currentTarget.style.color = '#6b7280'
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Report Preview */}
        <div className="result-card full-width" style={{ textAlign: 'center' }}>
          <span className="result-label">Report Preview</span>
          <p className="report-preview-text">
            Franchise Investment Simulation • Prepared for investor review • Last updated just now
          </p>
        </div>

        {/* Export Buttons */}
        <div className="export-actions" style={{ justifyContent: 'center', width: '100%' }}>
          <button className="export-btn secondary">Export CSV</button>
          <button className="export-btn primary">Export PDF</button>
        </div>

        {/* Included Sections */}
        <div className="result-card full-width" style={{ textAlign: 'center' }}>
          <span className="result-label">Included Sections</span>
          <ul className="sections-list" style={{ display: 'inline-block', textAlign: 'left' }}>
            {sections.map((section) => (
              <li key={section}>✓ {section}</li>
            ))}
          </ul>
        </div>

        {/* Navigation with Save Button */}
        <div className="results-navigation" style={{ justifyContent: 'center', width: '100%' }}>
          <button className="nav-btn back" onClick={() => navigate('/results/compare')}>
            ← Back
          </button>
          <div className="nav-right">
            <button className="nav-btn save" onClick={() => setShowSaveModal(true)}>
              💾 Save Scenario
            </button>
            <button className="nav-btn finish" onClick={handleFinish}>  
              Finish
            </button>
          </div>
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

      {/* Finish Modal */}
      {showFinishModal && (
        <div className="modal-overlay" onClick={() => setShowFinishModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: '450px' }}>
            <h3>What would you like to do?</h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Choose an option to continue
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button 
                className="nav-btn next" 
                onClick={handleSaveAndNew}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                💾 Save & Create New Simulation
              </button>
              <button 
                className="nav-btn finish" 
                onClick={handleNewSimulation}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                🔄 Create New Simulation
              </button>
              <button 
                className="nav-btn back" 
                onClick={() => setShowFinishModal(false)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
