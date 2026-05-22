import ResultsNavigation from '../components/ResultsNavigation'
import { useResults } from '../results/ResultsContext'
import { formatMoney, riskFactors } from '../results/resultsData'

export default function ProfitRiskPage() {
  const { scenario } = useResults()
  const breakEven = Math.max(1, scenario.paybackMonths - 4)

  return (
    <section className="results-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="results-header" style={{ textAlign: 'center', width: '100%' }}>
        <h1>Predict Profit & Risk</h1>
        <p>Profit forecast and risk assessment analysis</p>
      </div>

      {/* KPI Cards */}
      <div className="results-grid three-col" style={{ justifyContent: 'center', width: '100%' }}>
        <div className="result-card">
          <span className="result-label">12-Month Profit</span>
          <span className="result-value">{formatMoney(scenario.yearlyProfit)}</span>
        </div>
        <div className="result-card">
          <span className="result-label">Break-even Point</span>
          <span className="result-value">Month {breakEven}</span>
        </div>
        <div className="result-card">
          <span className="result-label">Risk Score</span>
          <div className="risk-gauge">
            <div className="risk-gauge-fill" style={{ width: `${scenario.risk * 10}%` }} />
          </div>
          <span className="result-value">{scenario.risk}/10</span>
        </div>
      </div>

      {/* Risk Factors */}
      <div className="result-card full-width" style={{ textAlign: 'center' }}>
        <span className="result-label">Top 3 Risk Factors</span>
        <ol className="risk-factors-list">
          {riskFactors.map((item, index) => (
            <li key={index}>
              <span className="risk-number">{index + 1}</span>
              {item}
            </li>
          ))}
        </ol>
      </div>

      <ResultsNavigation back="/results/scenarios" next="/results/avoid-mistakes" />
    </section>
  )
}
