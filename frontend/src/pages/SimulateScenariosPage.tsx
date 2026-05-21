import { useResults } from '../results/ResultsContext'
import { type ScenarioKey, formatMoney } from '../results/resultsData'
import ResultsNavigation from '../components/ResultsNavigation'

export default function SimulateScenariosPage() {
  const { scenario, scenarioKey, setScenarioKey, scenarios } = useResults()

  return (
    <section className="results-section">
      <div className="results-header">
        <h1>Simulate Real Scenarios</h1>
        <p>Revenue projections and cost structure analysis</p>
      </div>

      {/* Scenario Toggle */}
      <div className="scenario-toggle">
        {(['best', 'base', 'worst'] as ScenarioKey[]).map((key) => (
          <button 
            key={key} 
            className={`scenario-btn ${scenarioKey === key ? 'active' : ''}`} 
            onClick={() => setScenarioKey(key)}
          >
            {scenarios[key].label}
          </button>
        ))}
      </div>

      {/* Results Grid */}
      <div className="results-grid">
        {/* Revenue Timeline Card */}
        <div className="result-card">
          <span className="result-label">Revenue Timeline</span>
          <div className="chart-container">
            {scenario.monthly.map((p) => (
              <div key={p.month} className="chart-bar-wrapper">
                <div 
                  className="chart-bar" 
                  style={{ height: `${Math.max(20, p.revenue / 600)}px` }} 
                />
                <span className="chart-label">{p.month}</span>
                <span className="chart-value">{formatMoney(p.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Breakdown Card */}
        <div className="result-card">
          <span className="result-label">Cost Breakdown</span>
          <div className="cost-list">
            {scenario.costs.map((cost) => (
              <div key={cost.name} className="cost-item">
                <span>{cost.name}</span>
                <strong>{cost.value}%</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Assumptions */}
      <div className="result-card full-width">
        <span className="result-label">Key Assumptions</span>
        <ul className="assumptions-list">
          {scenario.assumptions.map((assumption) => (
            <li key={assumption}>{assumption}</li>
          ))}
        </ul>
      </div>

      <ResultsNavigation next="/results/profit-risk" />
    </section>
  )
}
