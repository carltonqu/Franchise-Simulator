import { useNavigate } from 'react-router-dom'

export default function FloatingAddButton() {
  const navigate = useNavigate()

  return (
    <button
      className="floating-add-btn"
      onClick={() => navigate('/')}
      title="Create new scenario"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    </button>
  )
}
