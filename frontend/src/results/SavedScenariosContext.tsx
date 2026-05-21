import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type SavedScenario = {
  id: string
  name: string
  createdAt: number
  formData: {
    brandName: string
    city: string
    franchiseFee: string
    totalInitialInvestment: string
    royaltyPercent: string
    marketingFeePercent: string
    monthlyRent: string
    monthlyLaborCost: string
    cogsPercent: string
    averageOrderValue: string
    ordersPerDay: string
    rampUpMonths: string
  }
  results: {
    scenarioKey: 'best' | 'base' | 'worst'
    yearlyProfit: number
    roi: number
    paybackMonths: number
    risk: number
  }
}

type SavedScenariosContextType = {
  savedScenarios: SavedScenario[]
  saveScenario: (scenario: Omit<SavedScenario, 'id' | 'createdAt'>) => void
  deleteScenario: (id: string) => void
  getScenarioById: (id: string) => SavedScenario | undefined
}

const SavedScenariosContext = createContext<SavedScenariosContextType | null>(null)

export function SavedScenariosProvider({ children }: { children: ReactNode }) {
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>(() => {
    // Load from localStorage on init
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('franchise-simulator-saved')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          return []
        }
      }
    }
    return []
  })

  const saveToStorage = useCallback((scenarios: SavedScenario[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('franchise-simulator-saved', JSON.stringify(scenarios))
    }
  }, [])

  const saveScenario = useCallback((scenario: Omit<SavedScenario, 'id' | 'createdAt'>) => {
    const newScenario: SavedScenario = {
      ...scenario,
      id: Date.now().toString(),
      createdAt: Date.now(),
    }
    setSavedScenarios((prev) => {
      const updated = [newScenario, ...prev]
      saveToStorage(updated)
      return updated
    })
  }, [saveToStorage])

  const deleteScenario = useCallback((id: string) => {
    setSavedScenarios((prev) => {
      const updated = prev.filter((s) => s.id !== id)
      saveToStorage(updated)
      return updated
    })
  }, [saveToStorage])

  const getScenarioById = useCallback((id: string) => {
    return savedScenarios.find((s) => s.id === id)
  }, [savedScenarios])

  return (
    <SavedScenariosContext.Provider
      value={{ savedScenarios, saveScenario, deleteScenario, getScenarioById }}
    >
      {children}
    </SavedScenariosContext.Provider>
  )
}

export function useSavedScenarios() {
  const context = useContext(SavedScenariosContext)
  if (!context) {
    throw new Error('useSavedScenarios must be used within SavedScenariosProvider')
  }
  return context
}
