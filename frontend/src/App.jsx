import { useMemo, useState, useEffect, useRef } from 'react'
import { jsPDF } from 'jspdf'
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

const parseMaybeJson = (value) => {
  if (!value) return null
  if (typeof value === 'object') return value
  const text = String(value).trim()
  if (!text.startsWith('{') && !text.startsWith('[')) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

const currencyOptions = ['AUD', 'USD', 'PHP', 'EUR', 'CNY', 'SGD', 'JPY']

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
  const [showComparePage, setShowComparePage] = useState(false)
  const [showFormValidation, setShowFormValidation] = useState(false)
  const [comparePrimaryId, setComparePrimaryId] = useState(null)
  const [compareSecondaryIds, setCompareSecondaryIds] = useState([])
  const [displayCurrency, setDisplayCurrency] = useState('AUD')
  const [fxRate, setFxRate] = useState(1)
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

  useEffect(() => {
    const fetchRate = async () => {
      if (displayCurrency === 'AUD') {
        setFxRate(1)
        return
      }

      try {
        const response = await fetch(`https://api.frankfurter.app/latest?from=AUD&to=${displayCurrency}`)
        const data = await response.json()
        const nextRate = data?.rates?.[displayCurrency]
        setFxRate(Number.isFinite(Number(nextRate)) ? Number(nextRate) : 1)
      } catch {
        setFxRate(1)
      }
    }

    fetchRate()
  }, [displayCurrency])

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

    const scoreScenarioRisk = (monthlyRevenue, monthlyNetProfit, scenarioPaybackMonths) => {
      let score = 100
      if (rent / Math.max(monthlyRevenue, 1) > 0.15) score -= 20
      if (labor / Math.max(monthlyRevenue, 1) > 0.35) score -= 20
      if (cogs > 0.6) score -= 20
      if (scenarioPaybackMonths !== null && scenarioPaybackMonths > 36) score -= 25
      if (monthlyNetProfit < 0) score -= 25
      return clamp(score, 0, 100)
    }

    const scenarios = [
      { name: 'Conservative', ordersPerDay: opd * 0.8, cogsPct: cogs + 0.02 },
      { name: 'Base Case', ordersPerDay: opd, cogsPct: cogs },
      { name: 'Optimistic', ordersPerDay: opd * 1.2, cogsPct: Math.max(0, cogs - 0.02) },
    ].map((s) => {
      const revenue = aov * s.ordersPerDay * 30
      const netProfit = revenue - revenue * s.cogsPct - revenue * royalty - revenue * marketing - rent - labor
      const scenarioPaybackMonths = netProfit > 0 ? totalInitialInvestment / netProfit : null
      const scenarioRiskScore = scoreScenarioRisk(revenue, netProfit, scenarioPaybackMonths)
      return {
        ...s,
        revenue,
        netProfit,
        paybackMonths: scenarioPaybackMonths,
        riskScore: scenarioRiskScore,
      }
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

  const currency = (n) => {
    const converted = Number(n || 0) * fxRate
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: displayCurrency, maximumFractionDigits: 0 }).format(converted)
  }


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

  const runSimulation = () => {
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
    setAiLoading(true)
    setAutoGeneratePending(true)
    setLoadedFromHistory(false)
    setActiveResultTab('financialActions')
  }

  const handleSubmit = (e) => {
    e?.preventDefault?.()
    runSimulation()
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

    if (comparePrimaryId === id) {
      setComparePrimaryId(null)
      setCompareSecondaryIds([])
    } else if (compareSecondaryIds.includes(id)) {
      setCompareSecondaryIds((prev) => prev.filter((itemId) => itemId !== id))
    }
  }

  const handleCompareCardClick = (cardId) => {
    if (!comparePrimaryId) {
      setComparePrimaryId(cardId)
      setCompareSecondaryIds([])
      return
    }

    if (comparePrimaryId === cardId) {
      setComparePrimaryId(null)
      setCompareSecondaryIds([])
      return
    }

    if (compareSecondaryIds.includes(cardId)) {
      setCompareSecondaryIds((prev) => prev.filter((id) => id !== cardId))
      return
    }

    if (compareSecondaryIds.length < 2) {
      setCompareSecondaryIds((prev) => [...prev, cardId])
    }
  }

  const clearCompareSelection = () => {
    setComparePrimaryId(null)
    setCompareSecondaryIds([])
  }

  const normalizedReport = useMemo(() => {
    const parsedTop = parseMaybeJson(aiReport)
    const source = parsedTop || aiReport || {}

    const parsedSummary = parseMaybeJson(source.executiveSummary)
    const merged = parsedSummary && typeof parsedSummary === 'object' ? { ...source, ...parsedSummary } : source

    const executiveSummary = String(merged.executiveSummary || '').trim()
    const riskExplanation = String(merged.riskExplanation || '').trim()
    const actionChecklist = Array.isArray(merged.actionChecklist) ? merged.actionChecklist : []

    return { executiveSummary, riskExplanation, actionChecklist }
  }, [aiReport])

  const dynamicInsight = useMemo(() => {
    if (!simulation || !submittedData) return ''
    const dailyOrders = toNumber(submittedData.ordersPerDay)
    if (dailyOrders < 85 && simulation.paybackMonths === null) {
      return 'Dynamic insight: If daily orders remain below 85, the business may become unprofitable under current cost structure.'
    }
    if (dailyOrders < 85) {
      return 'Dynamic insight: Daily orders below 85 materially weaken returns and can push the model into high-risk territory.'
    }
    return 'Dynamic insight: Current order volume supports positive momentum, but stress-test lower order scenarios before investing.'
  }, [simulation, submittedData])

  const marketSnapshot = useMemo(() => {
    const city = String(submittedData?.city || '').toLowerCase()
    if (!city) return { density: 'Unknown', income: 'Unknown', demand: 'Unknown', fit: 6.5 }

    if (city.includes('manila') || city.includes('makati') || city.includes('quezon')) {
      return { density: 'High', income: 'Medium', demand: 'Strong', fit: 7.5 }
    }
    if (city.includes('sydney') || city.includes('melbourne') || city.includes('brisbane')) {
      return { density: 'High', income: 'High', demand: 'Strong', fit: 8.1 }
    }
    return { density: 'Medium', income: 'Medium', demand: 'Moderate', fit: 6.8 }
  }, [submittedData])

  const sensitivity = useMemo(() => {
    if (!submittedData || !simulation) return null

    const revenue = simulation.baseMonthlyRevenue
    const rent = toNumber(submittedData.monthlyRent)
    const labor = toNumber(submittedData.monthlyLaborCost)
    const cogs = toNumber(submittedData.cogsPercent) / 100
    const royalty = toNumber(submittedData.royaltyPercent) / 100
    const marketing = toNumber(submittedData.marketingFeePercent) / 100
    const investment = toNumber(submittedData.totalInitialInvestment)

    const calcProfit = (rev, r, l) => rev - rev * cogs - rev * royalty - rev * marketing - r - l

    const profitOrdersDown = calcProfit(revenue * 0.8, rent, labor)
    const paybackRentUp = (() => {
      const p = calcProfit(revenue, rent * 1.1, labor)
      return p > 0 ? investment / p : null
    })()
    const profitLaborUp = calcProfit(revenue, rent, labor * 1.15)

    return {
      ordersDown20: profitOrdersDown,
      rentUp10Payback: paybackRentUp,
      laborUp15: profitLaborUp,
    }
  }, [submittedData, simulation])

  const handleDownloadPdf = () => {
    if (!simulation) return

    const doc = new jsPDF()
    let y = 12
    const lineHeight = 7
    const pageHeight = 280

    const ensureSpace = (space = 18) => {
      if (y + space > pageHeight) {
        doc.addPage()
        y = 12
      }
    }

    const addWrapped = (text, indent = 0) => {
      const lines = doc.splitTextToSize(String(text), 180 - indent)
      lines.forEach((line) => {
        ensureSpace()
        doc.text(line, 10 + indent, y)
        y += lineHeight
      })
    }

    const addHeading = (text) => {
      ensureSpace()
      doc.setFontSize(13)
      doc.text(text, 10, y)
      y += lineHeight
      doc.setFontSize(11)
    }

    doc.setFontSize(16)
    doc.text('Franchise Simulator Full Report', 10, y)
    y += 10
    doc.setFontSize(11)
    addWrapped(`Brand: ${submittedData?.brandName || 'N/A'} | City: ${submittedData?.city || 'N/A'}`)
    addWrapped(`Display currency: ${displayCurrency} (1 AUD = ${fxRate.toFixed(4)} ${displayCurrency})`)

    addHeading('Overview')
    addWrapped(`Base Revenue: ${currency(simulation.baseMonthlyRevenue)}`)
    addWrapped(`Break-even Revenue: ${simulation.breakEvenRevenue ? currency(simulation.breakEvenRevenue) : 'Invalid'}`)
    addWrapped(`Payback: ${simulation.paybackMonths ? `${simulation.paybackMonths.toFixed(1)} months` : 'Not achievable'}`)
    addWrapped(`Worst Cashflow: Month ${simulation.worstCashflowMonth.month} (${currency(simulation.worstCashflowMonth.cashflow)})`)
    if (normalizedReport.executiveSummary) addWrapped(`Executive Summary: ${normalizedReport.executiveSummary}`)
    if (normalizedReport.riskExplanation) addWrapped(`Risk Notes: ${normalizedReport.riskExplanation}`)

    addHeading('Financial Actions')
    const financialRows = normalizedReport.actionChecklist.length
      ? normalizedReport.actionChecklist.map((solution, index) => ({
          problem: simulation.issues[index]?.problem || 'General risk observation',
          solution,
          priority: simulation.issues[index]?.priority || 'Medium',
        }))
      : simulation.issues.map((item) => ({ problem: item.problem, solution: item.solution, priority: item.priority }))

    financialRows.forEach((row, idx) => {
      addWrapped(`${idx + 1}. [${row.priority}] ${row.problem}`)
      addWrapped(`Action: ${row.solution}`, 4)
    })

    addHeading('Scenarios')
    simulation.scenarios.forEach((scenario, idx) => {
      addWrapped(`${idx + 1}. ${scenario.name}`)
      addWrapped(`Revenue: ${currency(scenario.revenue)} | Net Profit: ${currency(scenario.netProfit)}`, 4)
    })

    addHeading('Cashflows (12 Months)')
    simulation.monthly.forEach((monthRow) => {
      addWrapped(
        `M${monthRow.month}: Revenue ${currency(monthRow.revenue)} | Net ${currency(monthRow.netProfit)} | Cashflow ${currency(monthRow.cashflow)} | Cumulative ${currency(monthRow.cumulativeCash)}`
      )
    })

    doc.save(`franchise-report-${Date.now()}.pdf`)
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

  const comparedCards = useMemo(() => {
    const selectedIds = [comparePrimaryId, ...compareSecondaryIds].filter(Boolean)

    return selectedIds
      .map((id) => history.find((item) => item.id === id))
      .filter(Boolean)
      .map((item) => ({
        ...item,
        riskScore: Number(item.summary?.riskScore || 0),
        paybackMonths: Number(item.summary?.paybackMonths || 0),
        breakEvenMonth: Number(item.summary?.breakEvenMonth || 0),
      }))
  }, [comparePrimaryId, compareSecondaryIds, history])

  const comparisonMax = useMemo(() => {
    return {
      riskScore: Math.max(1, ...comparedCards.map((card) => card.riskScore || 0)),
      paybackMonths: Math.max(1, ...comparedCards.map((card) => card.paybackMonths || 0)),
      breakEvenMonth: Math.max(1, ...comparedCards.map((card) => card.breakEvenMonth || 0)),
    }
  }, [comparedCards])

  const comparisonNarrative = useMemo(() => {
    if (comparedCards.length === 0) return null

    const byRisk = [...comparedCards].sort((a, b) => b.riskScore - a.riskScore)
    const byPayback = [...comparedCards].sort((a, b) => {
      const aVal = a.paybackMonths || Number.POSITIVE_INFINITY
      const bVal = b.paybackMonths || Number.POSITIVE_INFINITY
      return aVal - bVal
    })
    const byBreakEven = [...comparedCards].sort((a, b) => {
      const aVal = a.breakEvenMonth || Number.POSITIVE_INFINITY
      const bVal = b.breakEvenMonth || Number.POSITIVE_INFINITY
      return aVal - bVal
    })

    return {
      topRisk: byRisk[0],
      bestPayback: byPayback[0],
      bestBreakEven: byBreakEven[0],
      spreadRisk: byRisk[0]?.riskScore - byRisk[byRisk.length - 1]?.riskScore,
    }
  }, [comparedCards])

  return (
    <main className="layout">
      {showComparePage ? (
        <section className="comparison-page">
          <div className="comparison-page-header">
            <h2>Scenario Comparison</h2>
            <div className="header-actions">
              <button className="theme-toggle header-btn" type="button" onClick={() => setShowComparePage(false)}>
                Back to Simulator
              </button>
              <button className="theme-toggle header-btn" type="button" onClick={clearCompareSelection}>
                Clear Selection
              </button>
            </div>
          </div>

          <div className="comparison-layout">
            <section className="comparison-left">
              <h3>History Scenarios</h3>
              <p className="subtitle">Pick 1 base scenario (green) and up to 2 more (yellow).</p>

              <div className="comparison-filters">
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
              </div>

              <div className="comparison-history-grid">
                {filteredHistory.length === 0 ? (
                  <p className="empty">No history yet. Run simulations first.</p>
                ) : paginatedHistory.map((h) => (
                  <article
                    className={`history-card ${
                      comparePrimaryId === h.id
                        ? 'compare-primary-border'
                        : compareSecondaryIds.includes(h.id)
                          ? 'compare-secondary-border'
                          : ''
                    }`}
                    key={h.id}
                    onClick={() => handleCompareCardClick(h.id)}
                  >
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
                      <div className="metric-chip"><span>Risk</span><strong>{h.summary.riskScore}/100</strong></div>
                      <div className="metric-chip"><span>Payback</span><strong>{h.summary.paybackMonths ? `${h.summary.paybackMonths.toFixed(1)} mo` : 'N/A'}</strong></div>
                      <div className="metric-chip"><span>Break-even</span><strong>{h.summary.breakEvenMonth ?? 'N/A'}</strong></div>
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
            </section>

            <section className="comparison-right">
              <div className="compare-dashboard">
                <div className="compare-dashboard-head">
                  <h3>Comparison Result</h3>
                  <p>{comparedCards.length === 3 ? 'Full 3-scenario comparison report' : `Select ${3 - comparedCards.length} more scenario(s) to complete 3-way comparison.`}</p>
                </div>

                {comparedCards.length > 0 ? (
                  <>
                    <div className="compare-chart-block">
                      <h4>Risk Score (higher = safer)</h4>
                      {comparedCards.map((card) => (
                        <div className="compare-chart-row" key={`risk-page-${card.id}`}>
                          <span>{card.input.brandName || 'Unnamed'}</span>
                          <div className="compare-chart-track">
                            <div className={`compare-chart-bar ${comparePrimaryId === card.id ? 'compare-primary-bar' : 'compare-secondary-bar'}`} style={{ width: `${(card.riskScore / comparisonMax.riskScore) * 100}%` }} />
                          </div>
                          <strong>{card.riskScore}</strong>
                        </div>
                      ))}
                    </div>

                    <div className="compare-chart-block">
                      <h4>Payback Months (lower = better)</h4>
                      {comparedCards.map((card) => (
                        <div className="compare-chart-row" key={`payback-page-${card.id}`}>
                          <span>{card.input.brandName || 'Unnamed'}</span>
                          <div className="compare-chart-track">
                            <div className={`compare-chart-bar ${comparePrimaryId === card.id ? 'compare-primary-bar' : 'compare-secondary-bar'}`} style={{ width: `${(card.paybackMonths / comparisonMax.paybackMonths) * 100}%` }} />
                          </div>
                          <strong>{card.paybackMonths ? card.paybackMonths.toFixed(1) : 'N/A'}</strong>
                        </div>
                      ))}
                    </div>

                    <div className="compare-chart-block">
                      <h4>Break-even Month (lower = better)</h4>
                      {comparedCards.map((card) => (
                        <div className="compare-chart-row" key={`break-page-${card.id}`}>
                          <span>{card.input.brandName || 'Unnamed'}</span>
                          <div className="compare-chart-track">
                            <div className={`compare-chart-bar ${comparePrimaryId === card.id ? 'compare-primary-bar' : 'compare-secondary-bar'}`} style={{ width: `${(card.breakEvenMonth / comparisonMax.breakEvenMonth) * 100}%` }} />
                          </div>
                          <strong>{card.breakEvenMonth || 'N/A'}</strong>
                        </div>
                      ))}
                    </div>

                    {comparisonNarrative && (
                      <div className="compare-text-report">
                        <h4>Comparison Report</h4>
                        <p>
                          Based on the selected scenarios, <strong>{comparisonNarrative.topRisk?.input?.brandName || 'N/A'}</strong> currently shows the strongest
                          risk profile with a score of <strong>{comparisonNarrative.topRisk?.riskScore ?? 'N/A'}</strong>.
                        </p>
                        <p>
                          For capital recovery speed, <strong>{comparisonNarrative.bestPayback?.input?.brandName || 'N/A'}</strong> has the shortest payback at{' '}
                          <strong>{comparisonNarrative.bestPayback?.paybackMonths ? comparisonNarrative.bestPayback.paybackMonths.toFixed(1) : 'N/A'} months</strong>,
                          while <strong>{comparisonNarrative.bestBreakEven?.input?.brandName || 'N/A'}</strong> reaches break-even earliest at month{' '}
                          <strong>{comparisonNarrative.bestBreakEven?.breakEvenMonth || 'N/A'}</strong>.
                        </p>
                        <ul>
                          <li>Risk spread across selected scenarios: <strong>{Number.isFinite(comparisonNarrative.spreadRisk) ? comparisonNarrative.spreadRisk : 0}</strong> points.</li>
                          <li>Higher risk score generally indicates a safer operating profile under current assumptions.</li>
                          <li>Lower payback and lower break-even month indicate faster recovery and stronger short-term cashflow resilience.</li>
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="empty">Select scenarios from the left panel to generate comparison report.</p>
                )}
              </div>
            </section>
          </div>
        </section>
      ) : (
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
                onClick={() => setShowComparePage(true)}
              >
                Compare Scenarios
              </button>
              <button
                className="theme-toggle header-btn"
                type="button"
                onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              >
                {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
              </button>
              <button className="primary header-btn" onClick={loadedFromHistory ? handleCreateNewSimulation : runSimulation} type="button">
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

          {simulation && (
            <div className="report-toolbar">
              <label className="currency-select-label">
                Currency
                <select value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value)}>
                  {currencyOptions.map((code) => (
                    <option value={code} key={code}>{code}</option>
                  ))}
                </select>
              </label>
              <button type="button" className="primary report-download-btn" onClick={handleDownloadPdf}>
                Download PDF
              </button>
            </div>
          )}

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
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Scenario</th>
                        <th>Revenue</th>
                        <th>Profit</th>
                        <th>Payback</th>
                        <th>Risk Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulation.scenarios.map((s) => (
                        <tr key={s.name}>
                          <td>{s.name}</td>
                          <td>{currency(s.revenue)}</td>
                          <td>{currency(s.netProfit)}</td>
                          <td>{s.paybackMonths ? `${s.paybackMonths.toFixed(1)} months` : 'Not achievable'}</td>
                          <td>{s.riskScore}/100</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <p className="scenario-note">
                    Sensitivity test example: when daily orders move from lower to higher assumptions, payback and risk score update immediately.
                  </p>
                </div>
              )}

              {activeResultTab === 'financialActions' && simulation && (
                <>
                  {aiError && <p className="error-text">{aiError}</p>}
                  {aiReport?.upgradeMessage && <p className="dynamic-insight">{aiReport.upgradeMessage}</p>}

                  <section className="ai-section">
                    <h3>1) Investment Overview</h3>
                    <ul>
                      <li>Business Type: Franchise restaurant</li>
                      <li>Total Investment: {currency(toNumber(submittedData.totalInitialInvestment))}</li>
                      <li>Estimated Monthly Revenue: {currency(simulation.baseMonthlyRevenue)}</li>
                      <li>Estimated Monthly Net Profit: {currency(simulation.monthly?.[11]?.netProfit || 0)}</li>
                      <li>Estimated Payback: {simulation.paybackMonths ? `${simulation.paybackMonths.toFixed(1)} months` : 'Not achievable'}</li>
                    </ul>
                  </section>

                  <section className="ai-section">
                    <h3>2) Financial Health</h3>
                    <p>
                      Profitability: <strong>{(simulation.monthly?.[11]?.netProfit || 0) > 0 ? 'Strong' : 'Weak'}</strong> | Margin Stability:{' '}
                      <strong>{(simulation.monthly?.[11]?.netProfit || 0) / Math.max(simulation.monthly?.[11]?.revenue || 1, 1) > 0.2 ? 'Moderate' : 'Fragile'}</strong> | Cashflow Risk:{' '}
                      <strong>{simulation.riskLevel.includes('Low') ? 'Low' : simulation.riskLevel.includes('Medium') ? 'Moderate' : 'High'}</strong>
                    </p>
                    <p>{normalizedReport.riskExplanation || 'The projected margin is healthy, but monitor labor and rent volatility closely.'}</p>
                  </section>

                  <section className="ai-section">
                    <h3>3) Top Risk Drivers</h3>
                    <ul>
                      {simulation.issues.map((item, i) => (
                        <li key={`${item.problem}-${i}`}>{item.problem}</li>
                      ))}
                    </ul>
                  </section>

                  <section className="ai-section">
                    <h3>4) Market Snapshot – {submittedData.city || 'Selected Location'}</h3>
                    <p>Population density: {marketSnapshot.density} | Income level: {marketSnapshot.income} | Food demand: {marketSnapshot.demand}</p>
                    <p>Market fit score: <strong>{marketSnapshot.fit} / 10</strong></p>
                  </section>

                  <section className="ai-section">
                    <h3>5) Sensitivity Analysis</h3>
                    <ul>
                      <li>If orders drop 20% → monthly profit {sensitivity?.ordersDown20 < 0 ? 'becomes negative' : `changes to ${currency(sensitivity?.ordersDown20)}`}</li>
                      <li>If rent increases 10% → payback {sensitivity?.rentUp10Payback ? `increases to ${sensitivity.rentUp10Payback.toFixed(1)} months` : 'becomes not achievable'}</li>
                      <li>If labor increases 15% → margin {sensitivity?.laborUp15 < 0 ? 'becomes unsustainable' : `drops with profit at ${currency(sensitivity?.laborUp15)}`}</li>
                    </ul>
                  </section>

                  <section className="ai-section">
                    <h3>6) AI Investment Verdict</h3>
                    <p>
                      <strong>Investment Verdict: {simulation.riskScore >= 75 ? 'Go' : simulation.riskScore >= 60 ? 'Conditional Go' : 'Caution'}</strong>
                    </p>
                    <p>{normalizedReport.executiveSummary || dynamicInsight}</p>
                    <p><strong>Key Recommendations:</strong></p>
                    <ul>
                      {(normalizedReport.actionChecklist.length ? normalizedReport.actionChecklist : simulation.issues.map((x) => x.solution)).slice(0, 3).map((rec, i) => (
                        <li key={`${rec}-${i}`}>{rec}</li>
                      ))}
                    </ul>
                  </section>
                </>
              )}

            </>
          )}
        </section>
      </section>
      )}

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
                        <button className="history-btn history-btn-load" onClick={(e) => { e.stopPropagation(); loadFromHistory(h); setShowHistoryPanel(false) }}>
                          <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                            <path fill="currentColor" d="M10 4a1 1 0 0 1 .8.4L12.7 7H20a2 2 0 0 1 2 2v1H2V7a2 2 0 0 1 2-2h6ZM2 12h20v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5Zm13.6 2.2a1 1 0 0 0-1.4 0L12 16.4l-2.2-2.2a1 1 0 1 0-1.4 1.4l2.9 2.9a1 1 0 0 0 1.4 0l2.9-2.9a1 1 0 0 0 0-1.4Z"/>
                          </svg>
                          <span>Load Scenario</span>
                        </button>
                        <button className="history-btn history-btn-delete" onClick={(e) => { e.stopPropagation(); deleteHistory(h.id) }}>
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
