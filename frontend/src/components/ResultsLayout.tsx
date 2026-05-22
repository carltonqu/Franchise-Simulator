import { Outlet } from 'react-router-dom'
import ResultsSidebar from './ResultsSidebar'
import '../styles/ResultsPages.css'

export default function ResultsLayout() {
  return (
    <div className="app-container">
      <ResultsSidebar />
      <main className="main-content" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'flex-start', 
        padding: '2rem 1.5rem',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
      }}>
        <div className="results-container" style={{ 
          maxWidth: '1200px', 
          width: '100%', 
          margin: '0 auto'
        }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
