const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

// Helper to make authenticated requests
export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token')
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  })
  
  // Handle 401 - token expired or invalid
  if (response.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    throw new Error('Session expired. Please sign in again.')
  }
  
  const data = await response.json().catch(() => null)
  
  if (!response.ok) {
    throw new Error(data?.error || `Request failed: ${response.status}`)
  }
  
  return data
}

// Auth API
export const authApi = {
  login: (email, password) => 
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  
  register: (email, password) => 
    apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  
  me: () => 
    apiRequest('/api/me')
}

// Simulations API
export const simulationsApi = {
  getAll: (limit = 100) => 
    apiRequest(`/api/simulations?limit=${limit}`),
  
  create: (simulation) => 
    apiRequest('/api/simulations', {
      method: 'POST',
      body: JSON.stringify(simulation)
    })
}

// Report API
export const reportApi = {
  generate: (inputAssumptions, results) => 
    apiRequest('/api/report', {
      method: 'POST',
      body: JSON.stringify({ inputAssumptions, results })
    })
}

// Billing API
export const billingApi = {
  createCheckout: () => 
    apiRequest('/api/billing/create-checkout-session', {
      method: 'POST'
    })
}
