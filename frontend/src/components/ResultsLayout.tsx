import { Outlet } from 'react-router-dom'
import ResultsSidebar from './ResultsSidebar'

export default function ResultsLayout() {
  return (
    <div className="app-container">
      <ResultsSidebar />
      <main className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '2rem' }}>
        <div className="results-container" style={{ maxWidth: '900px', width: '100%', margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
