import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import './App.css'
import { AuthProvider, useAuth } from './auth/AuthContext'
import ResultsLayout from './components/ResultsLayout'
import FormSidebar from './components/FormSidebar'
import FloatingHistoryButton from './components/FloatingHistoryButton'
import { ResultsProvider } from './results/ResultsContext'
import { SavedScenariosProvider } from './results/SavedScenariosContext'
import SimulateScenariosPage from './pages/SimulateScenariosPage'
import ProfitRiskPage from './pages/ProfitRiskPage'
import AvoidMistakesPage from './pages/AvoidMistakesPage'
import CompareScenariosPage from './pages/CompareScenariosPage'
import ExportReportsPage from './pages/ExportReportsPage'
import HistoryPage from './pages/HistoryPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import AdminLoginPage from './pages/AdminLoginPage'

const initialFormData = {
  brandName: '',
  city: '',
  franchiseFee: '',
  totalInitialInvestment: '',
  royaltyPercent: '',
  marketingFeePercent: '',
  monthlyRent: '',
  monthlyLaborCost: '',
  cogsPercent: '',
  averageOrderValue: '',
  ordersPerDay: '',
  rampUpMonths: '3',
}

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <h2>Loading...</h2>
      </div>
    )
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function SimulatorFormPage() {
  const [formData, setFormData] = useState(initialFormData)
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    navigate('/results/scenarios')
  }

  return (
    <div className="app-container">
      <FormSidebar />

      <main className="main-content">
        {/* Auth Header */}
        <div className="auth-header-bar">
          {user ? (
            <div className="user-menu">
              <span className="user-email">{user.email}</span>
              <span className={`plan-badge ${user.plan}`}>{user.plan}</span>
              <button onClick={logout} className="logout-btn">Logout</button>
            </div>
          ) : (
            <div className="auth-links">
              <a href="/app" className="auth-link primary">Simulate Again</a>
            </div>
          )}
        </div>

        <div className="form-container">
          <div className="form-header">
            <h1>Franchise Form Simulator</h1>
            <p>Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum is simply dummy Lorem ipsum is simply dummy</p>
          </div>

          <form onSubmit={handleSubmit} className="simulator-form">
            <div className="form-grid">
              <div className="form-field"><label>Brand Name</label><input type="text" name="brandName" value={formData.brandName} onChange={handleChange} /></div>
              <div className="form-field"><label>City</label><input type="text" name="city" value={formData.city} onChange={handleChange} /></div>
              <div className="form-field"><label>Franchise Fee</label><input type="number" name="franchiseFee" value={formData.franchiseFee} onChange={handleChange} /></div>
              <div className="form-field"><label>Total Initial Investment</label><input type="number" name="totalInitialInvestment" value={formData.totalInitialInvestment} onChange={handleChange} /></div>
              <div className="form-field"><label>Royalty</label><input type="number" name="royaltyPercent" value={formData.royaltyPercent} onChange={handleChange} /></div>
              <div className="form-field"><label>Marketing Fee %</label><input type="number" name="marketingFeePercent" value={formData.marketingFeePercent} onChange={handleChange} /></div>
              <div className="form-field"><label>Monthly Rent (AUD)</label><input type="number" name="monthlyRent" value={formData.monthlyRent} onChange={handleChange} /></div>
              <div className="form-field"><label>Monthly Labor Cost (AUD)</label><input type="number" name="monthlyLaborCost" value={formData.monthlyLaborCost} onChange={handleChange} /></div>
              <div className="form-field"><label>COGS %</label><input type="number" name="cogsPercent" value={formData.cogsPercent} onChange={handleChange} /></div>
              <div className="form-field"><label>AOV (AUD)</label><input type="number" name="averageOrderValue" value={formData.averageOrderValue} onChange={handleChange} /></div>
              <div className="form-field"><label>Orders / Day</label><input type="number" name="ordersPerDay" value={formData.ordersPerDay} onChange={handleChange} /></div>
              <div className="form-field"><label>Ramp-up Months</label><input type="number" name="rampUpMonths" value={formData.rampUpMonths} onChange={handleChange} /></div>
            </div>

            <button type="submit" className="run-simulator-btn">Simulate</button>
            <p className="form-footer-text">Lorem ipsum is simply dummy text of the printing and typesetting industry.</p>
          </form>
        </div>
      </main>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/admin-login" element={<AdminLoginPage />} />
      <Route path="/app" element={<SimulatorFormPage />} />
      <Route path="/results" element={<ResultsLayout />}>
        <Route path="scenarios" element={<SimulateScenariosPage />} />
        <Route path="profit-risk" element={<ProfitRiskPage />} />
        <Route path="avoid-mistakes" element={<AvoidMistakesPage />} />
        <Route path="compare" element={<CompareScenariosPage />} />
        <Route path="export" element={
          <ProtectedRoute>
            <ExportReportsPage />
          </ProtectedRoute>
        } />
        <Route index element={<Navigate to="/results/scenarios" replace />} />
      </Route>
      <Route path="/history" element={
        <ProtectedRoute>
          <HistoryPage />
        </ProtectedRoute>
      } />
      {/* Redirect any unknown routes to landing page (handled by Vercel) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SavedScenariosProvider>
          <ResultsProvider>
            <AppRoutes />
            <FloatingHistoryButton />
          </ResultsProvider>
        </SavedScenariosProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
