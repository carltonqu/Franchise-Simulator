import { Outlet } from 'react-router-dom'
import ResultsSidebar from './ResultsSidebar'

export default function ResultsLayout() {
  return (
    <div className="app-container">
      <ResultsSidebar />
      <main className="main-content">
        <div className="results-container">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
