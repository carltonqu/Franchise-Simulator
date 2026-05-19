import { useState, useEffect, useMemo } from 'react'
import './App.css'

const initialFormData = {
  brandName: '',
  city: '',
  franchiseFee: '',
  totalInitialInvestment: '',
  royaltyPercent: '',
  marketingFeePercent: '',
  monthlyRent: '',
  monthlyLaborCost: '',
  cogsPercent: '',
  averageOrderValue: '',
  ordersPerDay: '',
  rampUpMonths: '3',
}

const features = [
  {
    title: 'Simulate real scenarios',
    description: 'Run detailed financial projections based on your franchise model, location, and investment.',
    active: true
  },
  {
    title: 'Predict profit & risk',
    description: 'Get accurate forecasts and risk assessments powered by AI trained on franchise data.',
    active: false
  },
  {
    title: 'Avoid costly mistakes',
    description: 'Identify risks before they become expensive problems. Make confident decisions.',
    active: false
  },
  {
    title: 'Compare scenarios',
    description: 'Compare multiple franchise opportunities side by side to find the best investment.',
    active: false
  },
  {
    title: 'Export reports',
    description: 'Download professional PDF reports to share with investors or stakeholders.',
    active: false
  }
]

const toNumber = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)

export default function App() {
  const [formData, setFormData] = useState(initialFormData)
  const [submittedData, setSubmittedData] = useState(null)
  const [showResults, setShowResults] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiReport, setAiReport] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmittedData(formData)
    setShowResults(true)
    setAiLoading(true)
    
    // Simulate AI report generation
    setTimeout(() => {
      setAiReport({
        verdict: 'Go',
        summary: 'Strong investment opportunity with healthy margins and manageable risk profile.',
        recommendations: [
          'Negotiate lease terms to reduce monthly rent burden',
          'Optimize labor scheduling during peak hours',
          'Monitor COGS closely and establish supplier relationships'
        ]
      })
      setAiLoading(false)
    }, 2000)
  }

  const handleGoBack = () => {
    setShowResults(false)
    setAiReport(null)
  }

  const simulation = useMemo(() => {
    if (!submittedData) return null

    const totalInitialInvestment = toNumber(submittedData.totalInitialInvestment)
    const royalty = toNumber(submittedData.royaltyPercent) / 100
    const marketing = toNumber(submittedData.marketingFeePercent) / 100
    const cogs = toNumber(submittedData.cogsPercent) / 100
    const rent = toNumber(submittedData.monthlyRent)
    const labor = toNumber(submittedData.monthlyLaborCost)
    const aov = toNumber(submittedData.averageOrderValue)
    const opd = toNumber(submittedData.ordersPerDay)
    const rampMonths = Math.max(1, Math.min(12, Math.floor(toNumber(submittedData.rampUpMonths) || 3)))

    const baseMonthlyRevenue = aov * opd * 30
    let cumulativeCash = 0

    const monthly = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const factor = month <= rampMonths ? month / rampMonths : 1
      const revenue = baseMonthlyRevenue * factor
      const cogsCost = revenue * cogs
      const royaltyFee = revenue * royalty
      const marketingFee = revenue * marketing
      const netProfit = revenue - cogsCost - royaltyFee - marketingFee - rent - labor
      const cashflow = month === 1 ? netProfit - totalInitialInvestment : netProfit
      cumulativeCash += cashflow
      return { month, revenue, netProfit, cashflow, cumulativeCash }
    })

    const steadyNet = monthly[11].netProfit
    const paybackMonths = steadyNet > 0 ? totalInitialInvestment / steadyNet : null
    const breakEvenMonth = monthly.find((m) => m.cumulativeCash >= 0)?.month ?? null

    return { monthly, baseMonthlyRevenue, paybackMonths, breakEvenMonth, totalInitialInvestment }
  }, [submittedData])

  const currency = (n) => {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(Number(n || 0))
  }

  return (
    <div className="app-container">
      {/* Left Sidebar */}
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

          {/* Feature List */}
          <nav className="feature-list">
            {features.map((feature, index) => (
              <div key={index} className={`feature-item ${feature.active ? 'active' : ''}`}>
                <div className="feature-dot">
                  {feature.active && (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                  )}
                </div>
                <div className="feature-text">
                  <h4>{feature.title}</h4>
                  <p>{feature.description}</p>
                </div>
              </div>
            ))}
          </nav>

          {/* Go Back Button */}
          <button className="go-back-btn" onClick={handleGoBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Go back
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {!showResults ? (
          <div className="form-container">
            <div className="form-header">
              <h1>Franchise Form Simulator</h1>
              <p>Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum is simply dummy Lorem ipsum is simply dummy</p>
            </div>

            <form onSubmit={handleSubmit} className="simulator-form">
              <div className="form-grid">
                <div className="form-field">
                  <label>Brand Name</label>
                  <input
                    type="text"
                    name="brandName"
                    value={formData.brandName}
                    onChange={handleChange}
                    placeholder=""
                  />
                </div>

                <div className="form-field">
                  <label>City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder=""
                  />
                </div>

                <div className="form-field">
                  <label>Franchise Fee</label>
                  <input
                    type="number"
                    name="franchiseFee"
                    value={formData.franchiseFee}
                    onChange={handleChange}
                    placeholder=""
                  />
                </div>

                <div className="form-field">
                  <label>Total Initial Investment</label>
                  <input
                    type="number"
                    name="totalInitialInvestment"
                    value={formData.totalInitialInvestment}
                    onChange={handleChange}
                    placeholder=""
                  />
                </div>

                <div className="form-field">
                  <label>Royalty</label>
                  <input
                    type="number"
                    name="royaltyPercent"
                    value={formData.royaltyPercent}
                    onChange={handleChange}
                    placeholder=""
                  />
                </div>

                <div className="form-field">
                  <label>Marketing Fee %</label>
                  <input
                    type="number"
                    name="marketingFeePercent"
                    value={formData.marketingFeePercent}
                    onChange={handleChange}
                    placeholder=""
                  />
                </div>

                <div className="form-field">
                  <label>Monthly Rent (AUD)</label>
                  <input
                    type="number"
                    name="monthlyRent"
                    value={formData.monthlyRent}
                    onChange={handleChange}
                    placeholder=""
                  />
                </div>

                <div className="form-field">
                  <label>Monthly Labor Cost (AUD)</label>
                  <input
                    type="number"
                    name="monthlyLaborCost"
                    onChange={handleChange}
                    value={formData.monthlyLaborCost}
                    placeholder=""
                  />
                </div>

                <div className="form-field">
                  <label>COGS %</label>
                  <input
                    type="number"
                    name="cogsPercent"
                    value={formData.cogsPercent}
                    onChange={handleChange}
                    placeholder=""
                  />
                </div>

                <div className="form-field">
                  <label>AOV (AUD)</label>
                  <input
                    type="number"
                    name="averageOrderValue"
                    value={formData.averageOrderValue}
                    onChange={handleChange}
                    placeholder=""
                  />
                </div>

                <div className="form-field">
                  <label>Orders / Day</label>
                  <input
                    type="number"
                    name="ordersPerDay"
                    value={formData.ordersPerDay}
                    onChange={handleChange}
                    placeholder=""
                  />
                </div>

                <div className="form-field">
                  <label>Ramp-up Months</label>
                  <input
                    type="number"
                    name="rampUpMonths"
                    value={formData.rampUpMonths}
                    onChange={handleChange}
                    placeholder=""
                  />
                </div>
              </div>

              <button type="submit" className="run-simulator-btn">
                Run Simulator
              </button>

              <p className="form-footer-text">
                Lorem ipsum is simply dummy text of the printing and typesetting industry.
              </p>
            </form>
          </div>
        ) : (
          <div className="results-container">
            {aiLoading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <h2>Generating Financial Report</h2>
                <p>Please wait while we analyze your inputs...</p>
              </div>
            ) : (
              <>
                <div className="results-header">
                  <h1>Simulation Results</h1>
                  <p>Analysis for {submittedData?.brandName} in {submittedData?.city}</p>
                </div>

                <div className="results-grid">
                  <div className="result-card">
                    <span className="result-label">Monthly Revenue</span>
                    <span className="result-value">{currency(simulation?.baseMonthlyRevenue)}</span>
                  </div>
                  <div className="result-card">
                    <span className="result-label">Payback Period</span>
                    <span className="result-value">{simulation?.paybackMonths ? `${simulation.paybackMonths.toFixed(1)} months` : 'N/A'}</span>
                  </div>
                  <div className="result-card">
                    <span className="result-label">Break-even Month</span>
                    <span className="result-value">{simulation?.breakEvenMonth || 'N/A'}</span>
                  </div>
                  <div className="result-card">
                    <span className="result-label">Total Investment</span>
                    <span className="result-value">{currency(simulation?.totalInitialInvestment)}</span>
                  </div>
                </div>

                {aiReport && (
                  <div className="ai-report">
                    <h3>AI Investment Verdict: {aiReport.verdict}</h3>
                    <p>{aiReport.summary}</p>
                    <h4>Key Recommendations:</h4>
                    <ul>
                      {aiReport.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button className="run-simulator-btn" onClick={handleGoBack}>
                  Run New Simulation
                </button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}