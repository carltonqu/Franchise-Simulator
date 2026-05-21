import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { scenarioData, type ScenarioKey } from './resultsData'

type ResultsContextValue = {
  scenarioKey: ScenarioKey
  setScenarioKey: (key: ScenarioKey) => void
  scenario: (typeof scenarioData)[ScenarioKey]
  scenarios: typeof scenarioData
}

const ResultsContext = createContext<ResultsContextValue | null>(null)

export function ResultsProvider({ children }: { children: ReactNode }) {
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>('base')

  const value = useMemo(
    () => ({
      scenarioKey,
      setScenarioKey,
      scenario: scenarioData[scenarioKey],
      scenarios: scenarioData
    }),
    [scenarioKey]
  )

  return <ResultsContext.Provider value={value}>{children}</ResultsContext.Provider>
}

export function useResults() {
  const ctx = useContext(ResultsContext)
  if (!ctx) throw new Error('useResults must be used within ResultsProvider')
  return ctx
}
