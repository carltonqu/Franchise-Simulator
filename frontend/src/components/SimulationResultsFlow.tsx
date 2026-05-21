import React, { useMemo, useState } from 'react'
import './SimulationResultsFlow.css'

type ScenarioKey = 'best' | 'base' | 'worst'

type MonthlyPoint = { month: string; revenue: number; profit: number }

type Scenario = {
  key: ScenarioKey
  label: string
  assumptions: string[]
  monthly: MonthlyPoint[]
  costs: { name: string; value: number }[]
  roi: number
  paybackMonths: number
  risk: number
  yearlyProfit: number
}

const scenarioData: Record<ScenarioKey, Scenario> = {
  best: {
    key: 'best',
    label: 'Best Case',
    assumptions: ['+15% demand growth', 'Stable food costs', 'Optimized staffing'],
    monthly: [
      { month: 'M1', revenue: 32000, profit: 6200 },
      { month: 'M3', revenue: 39000, profit: 9000 },
      { month: 'M6', revenue: 46000, profit: 11700 },
      { month: 'M9', revenue: 51000, profit: 13100 },
      { month: 'M12', revenue: 56000, profit: 15400 }
    ],
    costs: [
      { name: 'COGS', value: 34 },
      { name: 'Labor', value: 22 },
      { name: 'Rent', value: 16 },
      { name: 'Marketing', value: 8 },
      { name: 'Other', value: 20 }
    ],
    roi: 38,
    paybackMonths: 15,
    risk: 3,
    yearlyProfit: 142000
  },
  base: {
    key: 'base',
    label: 'Base Case',
    assumptions: ['Expected local demand', 'Normal operating costs', 'Steady execution'],
    monthly: [
      { month: 'M1', revenue: 26000, profit: 3200 },
      { month: 'M3', revenue: 31000, profit: 4700 },
      { month: 'M6', revenue: 36000, profit: 6700 },
      { month: 'M9', revenue: 39000, profit: 7600 },
      { month: 'M12', revenue: 43000, profit: 9100 }
    ],
    costs: [
      { name: 'COGS', value: 37 },
      { name: 'Labor', value: 25 },
      { name: 'Rent', value: 17 },
      { name: 'Marketing', value: 7 },
      { name: 'Other', value: 14 }
    ],
    roi: 24,
    paybackMonths: 22,
    risk: 5,
    yearlyProfit: 92000
  },
  worst: {
    key: 'worst',
    label: 'Worst Case',
    assumptions: ['Slow market adoption', 'Higher ingredient costs', 'Staff inefficiency'],
    monthly: [
      { month: 'M1', revenue: 19000, profit: -900 },
      { month: 'M3', revenue: 23000, profit: 400 },
      { month: 'M6', revenue: 26000, profit: 1300 },
      { month: 'M9', revenue: 28000, profit: 2100 },
      { month: 'M12', revenue: 31000, profit: 3100 }
    ],
    costs: [
      { name: 'COGS', value: 41 },
      { name: 'Labor', value: 28 },
      { name: 'Rent', value: 18 },
      { name: 'Marketing', value: 6 },
      { name: 'Other', value: 7 }
    ],
    roi: 8,
    paybackMonths: 41,
    risk: 8,
    yearlyProfit: 33000
  }
}

const riskFactors = ['High dependency on local foot traffic', 'Labor turnover above benchmark', 'Thin margin sensitivity to COGS volatility']
const warningFlags = ['Opening cash buffer below 3 months', 'Supplier concentration risk', 'Sales ramp assumes aggressive month-2 growth']
const mitigations = ['Secure a backup supplier before launch', 'Phase hiring with demand milestones', 'Add a 10% contingency to working capital']

const steps = [
  'Simulate Real Scenarios',
  'Predict Profit & Risk',
  'Avoid Costly Mistakes',
  'Compare Scenarios',
  'Export Reports'
]

const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)

function Step1SimulateScenarios({ scenario, scenarioKey, onScenarioChange }: { scenario: Scenario; scenarioKey: ScenarioKey; onScenarioChange: (key: ScenarioKey) => void }) {
  return (
    <section>
      <h2>Revenue Projection & Cost Structure</h2>
      <div className="srf-toggle-row">
        {(['best', 'base', 'worst'] as ScenarioKey[]).map((key) => (
          <button key={key} className={`srf-chip ${scenarioKey === key ? 'active' : ''}`} onClick={() => onScenarioChange(key)}>
            {scenarioData[key].label}
          </button>
        ))}
      </div>

      <div className="srf-card-grid two">
        <article className="srf-card">
          <h3>Revenue Timeline</h3>
          <div className="srf-simple-chart">
            {scenario.monthly.map((p) => (
              <div key={p.month} className="srf-bar-wrap">
                <div className="srf-bar" style={{ height: `${Math.max(12, p.revenue / 700)}px` }} />
                <span>{p.month}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="srf-card">
          <h3>Cost Breakdown</h3>
          <ul className="srf-list">
            {scenario.costs.map((cost) => (
              <li key={cost.name}>
                <span>{cost.name}</span>
                <strong>{cost.value}%</strong>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <article className="srf-card">
        <h3>Key Assumptions</h3>
        <ul className="srf-bullets">
          {scenario.assumptions.map((assumption) => (
            <li key={assumption}>{assumption}</li>
          ))}
        </ul>
      </article>
    </section>
  )
}

function Step2ProfitRisk({ scenario }: { scenario: Scenario }) {
  const breakEven = Math.max(1, scenario.paybackMonths - 4)
  return (
    <section>
      <h2>Profit Forecast & Risk Score</h2>
      <div className="srf-card-grid three">
        <article className="srf-card">
          <h3>12-Month Profit</h3>
          <p className="srf-kpi">{formatMoney(scenario.yearlyProfit)}</p>
        </article>
        <article className="srf-card">
          <h3>Break-even Point</h3>
          <p className="srf-kpi">Month {breakEven}</p>
        </article>
        <article className="srf-card">
          <h3>Risk Score</h3>
          <div className="srf-gauge">
            <div className="srf-gauge-fill" style={{ width: `${scenario.risk * 10}%` }} />
          </div>
          <p className="srf-kpi small">{scenario.risk}/10</p>
        </article>
      </div>

      <article className="srf-card">
        <h3>Top 3 Risk Factors</h3>
        <ol className="srf-bullets ordered">
          {riskFactors.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </article>
    </section>
  )
}

function Step3Mistakes() {
  return (
    <section>
      <h2>Avoid Costly Mistakes</h2>
      <div className="srf-card-grid two">
        <article className="srf-card danger">
          <h3>Warning Flags</h3>
          <ul className="srf-bullets">
            {warningFlags.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="srf-card">
          <h3>Mitigation Plan</h3>
          <ul className="srf-bullets">
            {mitigations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>

      <article className="srf-card">
        <h3>What Could Go Wrong (Scenario Snapshots)</h3>
        <p>Delayed ramp-up by 2 months, rent increase at month 6, and a 5% COGS spike can reduce annual profit by up to 27% if unmitigated.</p>
        <div className="srf-confidence">Confidence Level: <strong>84%</strong></div>
      </article>
    </section>
  )
}

function Step4Compare() {
  const rows: Array<{ label: string; best: string; base: string; worst: string }> = [
    { label: 'ROI', best: '38%', base: '24%', worst: '8%' },
    { label: 'Payback', best: '15 mo', base: '22 mo', worst: '41 mo' },
    { label: 'Risk', best: '3/10', base: '5/10', worst: '8/10' },
    { label: 'Yearly Profit', best: '$142k', base: '$92k', worst: '$33k' }
  ]

  return (
    <section>
      <h2>Compare Scenarios</h2>
      <div className="srf-card-grid three">
        {(['best', 'base', 'worst'] as ScenarioKey[]).map((key) => (
          <article key={key} className={`srf-card ${key === 'best' ? 'winner' : ''}`}>
            <h3>{scenarioData[key].label}</h3>
            <p className="srf-kpi small">{formatMoney(scenarioData[key].yearlyProfit)} yearly profit</p>
          </article>
        ))}
      </div>

      <article className="srf-card">
        <h3>KPI Comparison Table</h3>
        <div className="srf-table-wrap">
          <table className="srf-table">
            <thead>
              <tr>
                <th>KPI</th>
                <th>Best</th>
                <th>Base</th>
                <th>Worst</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{row.best}</td>
                  <td>{row.base}</td>
                  <td>{row.worst}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}

function Step5Export() {
  const sections = ['Executive Summary', 'Revenue & Cost Forecasts', 'Profit/Risk Analysis', 'Mistake Prevention Insights', 'Scenario Comparison']
  return (
    <section>
      <h2>Export Reports</h2>
      <article className="srf-card">
        <h3>Report Preview</h3>
        <p>Franchise Investment Simulation • Prepared for investor review • Last updated just now.</p>
      </article>

      <div className="srf-export-actions">
        <button className="srf-btn secondary">Export CSV</button>
        <button className="srf-btn">Export PDF</button>
      </div>

      <article className="srf-card">
        <h3>Included Sections</h3>
        <ul className="srf-checklist">
          {sections.map((section) => (
            <li key={section}>✓ {section}</li>
          ))}
        </ul>
      </article>
    </section>
  )
}

export default function SimulationResultsFlow() {
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>('base')

  const scenario = useMemo(() => scenarioData[scenarioKey], [scenarioKey])

  const stepComponent = () => {
    switch (currentStep) {
      case 1:
        return <Step1SimulateScenarios scenario={scenario} scenarioKey={scenarioKey} onScenarioChange={setScenarioKey} />
      case 2:
        return <Step2ProfitRisk scenario={scenario} />
      case 3:
        return <Step3Mistakes />
      case 4:
        return <Step4Compare />
      case 5:
        return <Step5Export />
      default:
        return null
    }
  }

  return (
    <div className="srf-layout">
      <aside className="srf-sidebar">
        <h1>Simulation Results</h1>
        <p>Step-by-step financial evaluation flow</p>

        <nav className="srf-steps">
          {steps.map((step, index) => {
            const stepNumber = index + 1
            const isActive = currentStep === stepNumber
            const isCompleted = currentStep > stepNumber

            return (
              <div key={step} className={`srf-step ${isActive ? 'active' : ''} ${isCompleted ? 'done' : ''}`}>
                <span className="srf-step-icon">{isCompleted ? '✓' : stepNumber}</span>
                <span>{step}</span>
              </div>
            )
          })}
        </nav>
      </aside>

      <main className="srf-main">
        <div className="srf-panel">{stepComponent()}</div>

        {currentStep < 5 && (
          <div className="srf-footer">
            <button className="srf-btn" onClick={() => setCurrentStep((prev) => Math.min(prev + 1, 5))}>
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
