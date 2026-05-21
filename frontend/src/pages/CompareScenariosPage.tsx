import ResultsNavigation from '../components/ResultsNavigation'
import { formatMoney, scenarioData, type ScenarioKey } from '../results/resultsData'

export default function CompareScenariosPage() {
  const rows: Array<{ label: string; best: string; base: string; worst: string }> = [
    { label: 'ROI', best: '38%', base: '24%', worst: '8%' },
    { label: 'Payback', best: '15 mo', base: '22 mo', worst: '41 mo' },
    { label: 'Risk', best: '3/10', base: '5/10', worst: '8/10' },
    { label: 'Yearly Profit', best: '$142k', base: '$92k', worst: '$33k' }
  ]

  return (
    <section className="results-section">
      <div className="results-header">
        <h1>Compare Scenarios</h1>
        <p>Side-by-side comparison of all scenarios</p>
      </div>

      {/* Scenario Cards */}
      <div className="results-grid three-col">
        {(['best', 'base', 'worst'] as ScenarioKey[]).map((key) => (
          <div key={key} className={`result-card ${key === 'best' ? 'winner' : ''}`}>
            <span className="result-label">{scenarioData[key].label}</span>
            <span className="result-value">{formatMoney(scenarioData[key].yearlyProfit)}</span>
            <span className="result-sublabel">yearly profit</span>
            {key === 'best' && <span className="winner-badge">★ Recommended</span>}
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="result-card full-width">
        <span className="result-label">KPI Comparison</span>
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>KPI</th>
                <th>Best Case</th>
                <th>Base Case</th>
                <th>Worst Case</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <td className="kpi-name">{row.label}</td>
                  <td className="best">{row.best}</td>
                  <td className="base">{row.base}</td>
                  <td className="worst">{row.worst}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ResultsNavigation back="/results/avoid-mistakes" next="/results/export" />
    </section>
  )
}
