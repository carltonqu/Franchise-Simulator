import { useNavigate, useLocation } from 'react-router-dom'
import { useSavedScenarios } from '../results/SavedScenariosContext'

export default function FloatingHistoryButton() {
  const navigate = useNavigate()
  const location = useLocation()
  const { savedScenarios } = useSavedScenarios()

  // Hide on login, register, and onboarding pages
  const hiddenPaths = ['/login', '/register', '/admin-login']
  const isHiddenPage = hiddenPaths.includes(location.pathname) || 
                       location.pathname.startsWith('/onboarding') ||
                       location.pathname === '/'

  if (isHiddenPage) {
    return null
  }

  return (
    <button
      className="floating-history-btn"
      onClick={() => navigate('/history')}
      title="View saved scenarios history"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      {savedScenarios.length > 0 && (
        <span className="history-badge">{savedScenarios.length}</span>
      )}
    </button>
  )
}
