import ResultsNavigation from '../components/ResultsNavigation'
import { mitigations, warningFlags } from '../results/resultsData'

export default function AvoidMistakesPage() {
  return (
    <section className="results-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="results-header" style={{ textAlign: 'center', width: '100%' }}>
        <h1>Avoid Costly Mistakes</h1>
        <p>Warning flags and mitigation strategies</p>
      </div>

      {/* Warning Flags & Mitigation */}
      <div className="results-grid" style={{ justifyContent: 'center', width: '100%' }}>
        <div className="result-card warning">
          <span className="result-label">⚠️ Warning Flags</span>
          <ul className="warning-list">
            {warningFlags.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="result-card">
          <span className="result-label">✓ Mitigation Plan</span>
          <ul className="mitigation-list">
            {mitigations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* What Could Go Wrong */}
      <div className="result-card full-width" style={{ textAlign: 'center' }}>
        <span className="result-label">What Could Go Wrong</span>
        <p className="scenario-text">
          Delayed ramp-up by 2 months, rent increase at month 6, and a 5% COGS spike 
          can reduce annual profit by up to <strong>27%</strong> if unmitigated.
        </p>
        <div className="confidence-badge">
          Confidence Level: <strong>84%</strong>
        </div>
      </div>

      <ResultsNavigation back="/results/profit-risk" next="/results/compare" />
    </section>
  )
}
