import { useNavigate } from 'react-router-dom'

type Props = {
  next?: string
  back?: string
}

export default function ResultsNavigation({ next, back }: Props) {
  const navigate = useNavigate()

  return (
    <div className="results-navigation" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', width: '100%' }}>
      {back ? (
        <button className="nav-btn back" type="button" onClick={() => navigate(back)}>
          ← Back
        </button>
      ) : null}
      {next ? (
        <button className="nav-btn next" type="button" onClick={() => navigate(next)}>
          Next →
        </button>
      ) : (
        <button className="nav-btn finish" type="button" onClick={() => navigate('/')}>
          Finish
        </button>
      )}
    </div>
  )
}
