import { useMemo, useState, useEffect, useRef } from 'react'
import './App.css'

const HISTORY_KEY = 'franchise_sim_history'

const initialFormData = {
  brandName: '', city: '', franchiseFee: '', totalInitialInvestment: '', royaltyPercent: '', marketingFeePercent: '',
  monthlyRent: '', monthlyLaborCost: '', cogsPercent: '', averageOrderValue: '', ordersPerDay: '', rampUpMonths: '3',
}

const resultTabs = [
  { key: 'financialActions', label: 'Financial Actions' },
  { key: 'overview', label: 'Overview' },
  { key: 'cashflow', label: 'Cashflow 12M' },
  { key: 'scenarios', label: 'Scenarios' },
]

const toNumber = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
const getInputSignature = (input) => JSON.stringify(input || {})
const getRiskWeight = (level = '') => {
  const v = String(level).toLowerCase()
  if (v.includes('high')) return 3
  if (v.includes('medium')) return 2
  return 1
}

export default function App() {
  const [theme, setTheme] = useState('light')
  const [formData, setFormData] = useState(initialFormData)
  const [submittedData, setSubmittedData] = useState(null)
  const [activeResultTab, setActiveResultTab] = useState('overview')
  const [aiReport, setAiReport] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [history, setHistory] = useState([])
  const [autoGeneratePending, setAutoGeneratePending] = useState(false)
  const [historySearch, setHistorySearch] = useState('')
  const [historySort, setHistorySort] = useState('date_desc')
  const [historyPage, setHistoryPage] = useState(1)
  const [loadedFromHistory, setLoadedFromHistory] = useState(false)
  const [showHistoryPanel, setShowHistoryPanel] = useState(false)
  const [showFormValidation, setShowFormValidation] = useState(false)
  const requestControllerRef = useRef(null)

  useEffect(() => {
    const savedTheme = localStorage.getItem('franchise_theme')
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme)
    }

    const raw = localStorage.getItem(HISTORY_KEY)
    if (raw) {
      try { setHistory(JSON.parse(raw)) } catch { setHistory([]) }
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('franchise_theme', theme)
  }, [theme])

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
      return { month, factor, revenue, cogsCost, royaltyFee, marketingFee, netProfit, cashflow, cumulativeCash }
    })

    const denominator = 1 - cogs - royalty - marketing
    const breakEvenRevenue = denominator > 0 ? (rent + labor) / denominator : null
    const steadyNet = monthly[11].netProfit
    const paybackMonths = steadyNet > 0 ? totalInitialInvestment / steadyNet : null
    const breakEvenMonth = monthly.find((m) => m.cumulativeCash >= 0)?.month ?? null
    const worstCashflowMonth = monthly.reduce((a, b) => (b.cashflow < a.cashflow ? b : a), monthly[0])

    const scenarios = [
      { name: 'Conservative', revenue: baseMonthlyRevenue * 0.85, cogsPct: cogs + 0.02 },
      { name: 'Base', revenue: baseMonthlyRevenue, cogsPct: cogs },
      { name: 'Optimistic', revenue: baseMonthlyRevenue * 1.15, cogsPct: Math.max(0, cogs - 0.02) },
    ].map((s) => {
      const netProfit = s.revenue - s.revenue * s.cogsPct - s.revenue * royalty - s.revenue * marketing - rent - labor
      return { ...s, netProfit }
    })

    const negativeCashflowMonths = monthly.filter((m) => m.cashflow < 0).length
    const baseRev = baseMonthlyRevenue || 1
    const flags = {
      highRent: rent / baseRev > 0.15,
      laborRisk: labor / baseRev > 0.35,
      marginRisk: cogs > 0.6,
      longPayback: paybackMonths !== null && paybackMonths > 36,
      cashflowRisk: negativeCashflowMonths > 2,
    }

    let riskScore = 100
    if (flags.highRent) riskScore -= 20
    if (flags.laborRisk) riskScore -= 20
    if (flags.marginRisk) riskScore -= 20
    if (flags.longPayback) riskScore -= 25
    if (flags.cashflowRisk) riskScore -= 25
    riskScore = clamp(riskScore, 0, 100)

    const riskLevel = riskScore >= 80 ? 'Low Risk' : riskScore >= 60 ? 'Medium Risk' : 'High Risk'

    const issues = []
    if (flags.highRent) issues.push({ problem: 'Rent above 15% of revenue', solution: 'Negotiate lease or improve throughput.', priority: 'High' })
    if (flags.laborRisk) issues.push({ problem: 'Labor above 35% of revenue', solution: 'Optimize shift planning and staffing mix.', priority: 'High' })
    if (flags.marginRisk) issues.push({ problem: 'COGS above 60%', solution: 'Improve supplier terms and menu engineering.', priority: 'High' })
    if (flags.longPayback) issues.push({ problem: 'Payback > 36 months', solution: 'Lower fixed costs and increase contribution margin.', priority: 'Medium' })
    if (flags.cashflowRisk) issues.push({ problem: 'Negative cashflow > 2 months', solution: 'Increase working capital buffer.', priority: 'High' })
    if (!issues.length) issues.push({ problem: 'No critical flag triggered', solution: 'Proceed with sensitivity checks and KPI monitoring.', priority: 'Low' })

    return { monthly, scenarios, baseMonthlyRevenue, breakEvenRevenue, breakEvenMonth, paybackMonths, worstCashflowMonth, riskScore, riskLevel, issues }
  }, [submittedData])

  const currency = (n) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n)


  useEffect(() => {
    if (!aiReport || !submittedData) return
    const inputSignature = getInputSignature(submittedData)

    setHistory((prev) => {
      const next = prev.map((item) => {
        if (getInputSignature(item.input) === inputSignature) {
          return { ...item, aiReport, updatedAt: new Date().toISOString() }
        }
        return item
      })
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
      return next
    })
  }, [aiReport, submittedData])

  const handleSubmit = (e) => {
    e.preventDefault()

    const hasMissingField = Object.values(formData).some((value) => String(value).trim() === '')
    if (hasMissingField) {
      setShowFormValidation(true)
      setAiError('Please complete all required fields before running the simulation.')
      return
    }

    setShowFormValidation(false)

    setSubmittedData(formData)
    setAiReport(null)
    setAiError('')
    setAutoGeneratePending(true)
    setLoadedFromHistory(false)
    setActiveResultTab('financialActions')
  }

  const handleCreateNewSimulation = () => {
    requestControllerRef.current?.abort()
    setFormData(initialFormData)
    setSubmittedData(null)
    setAiReport(null)
    setAiError('')
    setShowFormValidation(false)
    setAutoGeneratePending(false)
    setAiLoading(false)
    setLoadedFromHistory(false)
    setActiveResultTab('overview')
  }

  const handleCancelSimulation = () => {
    requestControllerRef.current?.abort()
    setAutoGeneratePending(false)
    setAiLoading(false)
    setAiError('Simulation canceled by user.')
  }

  useEffect(() => {
    if (!simulation || !submittedData) return

    const now = new Date().toISOString()
    const signature = getInputSignature(submittedData)

    setHistory((prev) => {
      const existingIndex = prev.findIndex((item) => getInputSignature(item.input) === signature)
      const baseRecord = {
        input: submittedData,
        summary: {
          riskScore: simulation.riskScore,
          riskLevel: simulation.riskLevel,
          paybackMonths: simulation.paybackMonths,
          breakEvenMonth: simulation.breakEvenMonth,
        },
      }

      let next
      if (existingIndex >= 0) {
        const existing = prev[existingIndex]
        const updated = {
          ...existing,
          ...baseRecord,
          updatedAt: now,
        }
        next = [updated, ...prev.filter((_, idx) => idx !== existingIndex)]
      } else {
        const created = {
          id: Date.now(),
          createdAt: now,
          updatedAt: now,
          ...baseRecord,
          aiReport,
        }
        next = [created, ...prev]
      }

      const limited = next.slice(0, 50)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(limited))
      return limited
    })
  }, [simulation, submittedData, aiReport])


  useEffect(() => {
    if (!simulation || !submittedData || !autoGeneratePending) return
    ;(async () => {
      try {
        setAiLoading(true)
        setAiError('')
        const apiBase = import.meta.env.VITE_API_BASE_URL || ''
        const controller = new AbortController()
        requestControllerRef.current = controller

        const res = await fetch(`${apiBase}/api/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputAssumptions: submittedData, results: simulation }),
          signal: controller.signal,
        })

        const raw = await res.text()
        let data = null
        try {
          data = raw ? JSON.parse(raw) : null
        } catch {
          throw new Error(raw || 'Backend returned a non-JSON response')
        }

        if (!res.ok) throw new Error(data?.error || 'Failed to generate report')
        if (!data) throw new Error('Empty response from server')
        setAiReport(data)
      } catch (err) {
        if (err?.name === 'AbortError') {
          setAiError('Simulation canceled by user.')
        } else {
          setAiError(err.message)
        }
      } finally {
        requestControllerRef.current = null
        setAiLoading(false)
        setAutoGeneratePending(false)
      }
    })()
  }, [simulation, submittedData, autoGeneratePending])

  const loadFromHistory = (item) => {
    setFormData(item.input)
    setSubmittedData(item.input)
    setAiReport(item.aiReport || null)
    setLoadedFromHistory(true)
    setActiveResultTab('financialActions')
  }

  const deleteHistory = (id) => {
    const next = history.filter((h) => h.id !== id)
    setHistory(next)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  }

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase()
    let list = [...history]

    if (q) {
      list = list.filter((h) => {
        const name = (h.input?.brandName || '').toLowerCase()
        const city = (h.input?.city || '').toLowerCase()
        return name.includes(q) || city.includes(q)
      })
    }

    list.sort((a, b) => {
      if (historySort === 'name_asc') {
        return (a.input?.brandName || '').localeCompare(b.input?.brandName || '')
      }
      if (historySort === 'name_desc') {
        return (b.input?.brandName || '').localeCompare(a.input?.brandName || '')
      }
      if (historySort === 'risk_desc') {
        return getRiskWeight(b.summary?.riskLevel) - getRiskWeight(a.summary?.riskLevel)
      }
      if (historySort === 'date_asc') {
        return new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime()
      }
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    })

    return list
  }, [history, historySearch, historySort])

  const HISTORY_PAGE_SIZE = 16
  const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / HISTORY_PAGE_SIZE))
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * HISTORY_PAGE_SIZE
    return filteredHistory.slice(start, start + HISTORY_PAGE_SIZE)
  }, [filteredHistory, historyPage])

  useEffect(() => {
    setHistoryPage(1)
  }, [historySearch, historySort])

  useEffect(() => {
    if (historyPage > totalHistoryPages) {
      setHistoryPage(totalHistoryPages)
    }
  }, [historyPage, totalHistoryPages])

  return (
    <main className="layout">
      <section className="main">
        <section className="panel">
          <div className="header-row">
            <h1>Franchise Financial Simulator</h1>
            <div className="header-actions">
              <button
                className="theme-toggle header-btn"
                type="button"
                onClick={() => setShowHistoryPanel(true)}
              >
                History
              </button>
              <button
                className="theme-toggle header-btn"
                type="button"
                onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              >
                {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
              </button>
              <button className="primary header-btn" onClick={loadedFromHistory ? handleCreateNewSimulation : handleSubmit} type="button">
                {loadedFromHistory ? 'Create New Simulation' : 'Run Simulation'}
              </button>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleSubmit}>
            {Object.entries({
              brandName: 'Brand Name', city: 'City', franchiseFee: 'Franchise Fee (AUD)', totalInitialInvestment: 'Total Initial Investment (AUD)',
              royaltyPercent: 'Royalty %', marketingFeePercent: 'Marketing Fee %', monthlyRent: 'Monthly Rent (AUD)', monthlyLaborCost: 'Monthly Labor Cost (AUD)',
              cogsPercent: 'COGS %', averageOrderValue: 'AOV (AUD)', ordersPerDay: 'Orders / Day', rampUpMonths: 'Ramp-up Months',
            }).map(([k, label]) => (
              <label key={k}>{label}
                <input
                  type={k === 'brandName' || k === 'city' ? 'text' : 'number'}
                  value={formData[k]}
                  onChange={(e) => {
                    const value = e.target.value
                    setFormData((p) => ({ ...p, [k]: value }))
                    if (showFormValidation && String(value).trim() !== '') {
                      const next = { ...formData, [k]: value }
                      const stillMissing = Object.values(next).some((v) => String(v).trim() === '')
                      if (!stillMissing) setShowFormValidation(false)
                    }
                  }}
                  className={showFormValidation && String(formData[k]).trim() === '' ? 'input-error input-heartbeat' : ''}
                  required
                />
                {showFormValidation && String(formData[k]).trim() === '' && (
                  <small className="required-note">This field is required.</small>
                )}
              </label>
            ))}
          </form>

          {showFormValidation && (
            <p className="validation-note">Please complete all required fields. Empty fields are highlighted.</p>
          )}
        </section>

        <section className="panel result-panel">
          <div className="result-tabs">
            {resultTabs.map((tab) => (
              <button key={tab.key} className={`pill ${activeResultTab === tab.key ? 'active' : ''}`} onClick={() => setActiveResultTab(tab.key)}>
                {tab.label}
              </button>
            ))}
          </div>

          {activeResultTab !== 'history' && !simulation ? (
            <p className="empty">No output yet. Enter data and run simulation.</p>
          ) : (
            <>
              {activeResultTab === 'overview' && simulation && (
                <div className="cards">
                  <article><span>Base Revenue</span><strong>{currency(simulation.baseMonthlyRevenue)}</strong></article>
                  <article><span>Break-even Revenue</span><strong>{simulation.breakEvenRevenue ? currency(simulation.breakEvenRevenue) : 'Invalid'}</strong></article>
                  <article><span>Payback</span><strong>{simulation.paybackMonths ? `${simulation.paybackMonths.toFixed(1)} months` : 'Not achievable'}</strong></article>
                  <article><span>Worst Cashflow</span><strong>M{simulation.worstCashflowMonth.month} ({currency(simulation.worstCashflowMonth.cashflow)})</strong></article>
                </div>
              )}

              {activeResultTab === 'cashflow' && simulation && (
                <div className="table-wrap"><table><thead><tr><th>Month</th><th>Revenue</th><th>Net Profit</th><th>Cashflow</th><th>Cumulative</th></tr></thead><tbody>{simulation.monthly.map((m) => <tr key={m.month}><td>{m.month}</td><td>{currency(m.revenue)}</td><td>{currency(m.netProfit)}</td><td>{currency(m.cashflow)}</td><td>{currency(m.cumulativeCash)}</td></tr>)}</tbody></table></div>
              )}

              {activeResultTab === 'scenarios' && simulation && (
                <div className="cards">{simulation.scenarios.map((s) => <article key={s.name}><span>{s.name}</span><strong>Revenue: {currency(s.revenue)}</strong><strong>Net: {currency(s.netProfit)}</strong></article>)}</div>
              )}

              {activeResultTab === 'financialActions' && simulation && (
                <>
                  <div className="risk-top-cards">
                    <article className="risk-kpi"><span>Risk Score</span><strong>{simulation.riskScore}/100</strong><em>{simulation.riskLevel}</em></article>
                    <article className="risk-kpi"><span>Payback</span><strong>{simulation.paybackMonths ? `${simulation.paybackMonths.toFixed(1)} months` : 'Not achievable'}</strong><em>Based on steady-state net profit</em></article>
                  </div>

                  <section className="risk-report-card">
                    <h3>Risk Report Summary</h3>
                    <p>
                      {aiReport?.executiveSummary || 'This simulation highlights your projected financial position based on the assumptions provided.'}
                    </p>
                    <p>
                      <strong>Key Risk Insight:</strong> {aiReport?.riskExplanation || 'Your main risks are tied to fixed-cost pressure, margin sensitivity, and early-stage cashflow stability.'}
                    </p>
                    <ul>
                      <li><strong>Risk Level:</strong> {simulation.riskLevel}</li>
                      <li><strong>Risk Score:</strong> {simulation.riskScore}/100</li>
                      <li><strong>Break-even Month:</strong> {simulation.breakEvenMonth ?? 'Not reached in 12 months'}</li>
                      <li><strong>Estimated Payback:</strong> {simulation.paybackMonths ? `${simulation.paybackMonths.toFixed(1)} months` : 'Not achievable with current assumptions'}</li>
                    </ul>
                  </section>

                  {aiError && <p className="error-text">{aiError}</p>}
                  <div className="table-wrap excel-wrap">
                    <table className="excel-table">
                      <thead><tr><th>Risk Report</th><th>Recommended Solution Report</th><th>Priority Status</th></tr></thead>
                      <tbody>
                        {(aiReport?.actionChecklist?.length
                          ? aiReport.actionChecklist.map((solution, index) => ({ risk: simulation.issues[index]?.problem || aiReport.riskExplanation || 'General risk observation', solution, priority: simulation.issues[index]?.priority || 'Medium' }))
                          : simulation.issues.map((item) => ({ risk: item.problem, solution: item.solution, priority: item.priority }))
                        ).map((row, idx) => (
                          <tr key={`${row.risk}-${idx}`}>
                            <td>
                              <p className="risk-item-title">{row.risk}</p>
                              <ul className="risk-item-points">
                                <li>Impact: May reduce profitability and increase cash pressure.</li>
                                <li>Recommendation: Resolve this risk before scaling operations.</li>
                              </ul>
                            </td>
                            <td>{row.solution}</td>
                            <td><span className={`priority-badge ${row.priority.toLowerCase()}`}>{row.priority}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

            </>
          )}
        </section>
      </section>

      {showHistoryPanel && (
        <div className="history-overlay" onClick={() => setShowHistoryPanel(false)}>
          <aside className="history-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="history-drawer-head">
              <h3>Simulation History</h3>
              <button className="theme-toggle" type="button" onClick={() => setShowHistoryPanel(false)}>Close</button>
            </div>

            <section className="history-layout">
              <aside className="history-filters">
                <h3>Filters & Sort</h3>
                <label>
                  Search
                  <input
                    type="text"
                    placeholder="Search brand or city"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                  />
                </label>
                <label>
                  Sort by
                  <select value={historySort} onChange={(e) => setHistorySort(e.target.value)}>
                    <option value="date_desc">Date (Newest)</option>
                    <option value="date_asc">Date (Oldest)</option>
                    <option value="name_asc">Name (A-Z)</option>
                    <option value="name_desc">Name (Z-A)</option>
                    <option value="risk_desc">Risk Level (High → Low)</option>
                  </select>
                </label>
              </aside>

              <div className="history-grid-wrap">
                <div className="history-grid">
                  {filteredHistory.length === 0 ? (
                    <p className="empty">No matching history found.</p>
                  ) : paginatedHistory.map((h) => (
                    <article className="history-card" key={h.id}>
                      <div className="history-card-top">
                        <div>
                          <h4>{h.input.brandName || 'Unnamed Brand'}</h4>
                          <span>{h.input.city || 'Unknown City'}</span>
                        </div>
                        <span className={`priority-badge ${(h.summary.riskLevel || '').toLowerCase().includes('high') ? 'high' : (h.summary.riskLevel || '').toLowerCase().includes('medium') ? 'medium' : 'low'}`}>
                          {h.summary.riskLevel}
                        </span>
                      </div>

                      <div className="history-metrics-grid">
                        <div className="metric-chip"><span>Risk Score</span><strong>{h.summary.riskScore}/100</strong></div>
                        <div className="metric-chip"><span>Payback</span><strong>{h.summary.paybackMonths ? `${h.summary.paybackMonths.toFixed(1)} mo` : 'N/A'}</strong></div>
                        <div className="metric-chip"><span>Break-even</span><strong>{h.summary.breakEvenMonth ?? 'N/A'}</strong></div>
                      </div>

                      <div className="history-dates">
                        <p><strong>Created:</strong> {new Date(h.createdAt).toLocaleString()}</p>
                        <p><strong>Updated:</strong> {new Date(h.updatedAt || h.createdAt).toLocaleString()}</p>
                      </div>

                      <div className="history-actions">
                        <button className="history-btn history-btn-load" onClick={() => { loadFromHistory(h); setShowHistoryPanel(false) }}>
                          <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                            <path fill="currentColor" d="M10 4a1 1 0 0 1 .8.4L12.7 7H20a2 2 0 0 1 2 2v1H2V7a2 2 0 0 1 2-2h6ZM2 12h20v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5Zm13.6 2.2a1 1 0 0 0-1.4 0L12 16.4l-2.2-2.2a1 1 0 1 0-1.4 1.4l2.9 2.9a1 1 0 0 0 1.4 0l2.9-2.9a1 1 0 0 0 0-1.4Z"/>
                          </svg>
                          <span>Load Scenario</span>
                        </button>
                        <button className="history-btn history-btn-delete" onClick={() => deleteHistory(h.id)}>
                          <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                            <path fill="currentColor" d="M9 3a1 1 0 0 0-1 1v1H5a1 1 0 1 0 0 2h1v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7h1a1 1 0 1 0 0-2h-3V4a1 1 0 0 0-1-1H9Zm1 2h4v1h-4V5Zm-2 4a1 1 0 1 1 2 0v8a1 1 0 1 1-2 0V9Zm6-1a1 1 0 0 0-1 1v8a1 1 0 1 0 2 0V9a1 1 0 0 0-1-1Z"/>
                          </svg>
                          <span>Delete</span>
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                {filteredHistory.length > HISTORY_PAGE_SIZE && (
                  <div className="history-pagination">
                    <button
                      className="history-page-btn"
                      type="button"
                      disabled={historyPage === 1}
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>

                    <span className="history-page-indicator">Page {historyPage} of {totalHistoryPages}</span>

                    <button
                      className="history-page-btn"
                      type="button"
                      disabled={historyPage === totalHistoryPages}
                      onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
      )}

      {aiLoading && (
        <div className="loading-modal-overlay" role="dialog" aria-modal="true" aria-live="polite">
          <div className="loading-modal-card">
            <div className="loading-spinner" aria-hidden="true" />
            <h2>Generating Financial Report</h2>
            <p>Please wait while we analyze your inputs and prepare a professional recommendations report.</p>
            <button className="cancel-btn modal-cancel-btn" onClick={handleCancelSimulation} type="button">
              Cancel Simulation
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
