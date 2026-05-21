export type ScenarioKey = 'best' | 'base' | 'worst'

export type MonthlyPoint = { month: string; revenue: number; profit: number }

export type Scenario = {
  key: ScenarioKey
  label: string
  assumptions: string[]
  monthly: MonthlyPoint[]
  costs: { name: string; value: number }[]
  roi: number
  paybackMonths: number
  risk: number
  yearlyProfit: number
}

export const scenarioData: Record<ScenarioKey, Scenario> = {
  best: {
    key: 'best',
    label: 'Best Case',
    assumptions: ['+15% demand growth', 'Stable food costs', 'Optimized staffing'],
    monthly: [
      { month: 'M1', revenue: 32000, profit: 6200 },
      { month: 'M3', revenue: 39000, profit: 9000 },
      { month: 'M6', revenue: 46000, profit: 11700 },
      { month: 'M9', revenue: 51000, profit: 13100 },
      { month: 'M12', revenue: 56000, profit: 15400 }
    ],
    costs: [
      { name: 'COGS', value: 34 },
      { name: 'Labor', value: 22 },
      { name: 'Rent', value: 16 },
      { name: 'Marketing', value: 8 },
      { name: 'Other', value: 20 }
    ],
    roi: 38,
    paybackMonths: 15,
    risk: 3,
    yearlyProfit: 142000
  },
  base: {
    key: 'base',
    label: 'Base Case',
    assumptions: ['Expected local demand', 'Normal operating costs', 'Steady execution'],
    monthly: [
      { month: 'M1', revenue: 26000, profit: 3200 },
      { month: 'M3', revenue: 31000, profit: 4700 },
      { month: 'M6', revenue: 36000, profit: 6700 },
      { month: 'M9', revenue: 39000, profit: 7600 },
      { month: 'M12', revenue: 43000, profit: 9100 }
    ],
    costs: [
      { name: 'COGS', value: 37 },
      { name: 'Labor', value: 25 },
      { name: 'Rent', value: 17 },
      { name: 'Marketing', value: 7 },
      { name: 'Other', value: 14 }
    ],
    roi: 24,
    paybackMonths: 22,
    risk: 5,
    yearlyProfit: 92000
  },
  worst: {
    key: 'worst',
    label: 'Worst Case',
    assumptions: ['Slow market adoption', 'Higher ingredient costs', 'Staff inefficiency'],
    monthly: [
      { month: 'M1', revenue: 19000, profit: -900 },
      { month: 'M3', revenue: 23000, profit: 400 },
      { month: 'M6', revenue: 26000, profit: 1300 },
      { month: 'M9', revenue: 28000, profit: 2100 },
      { month: 'M12', revenue: 31000, profit: 3100 }
    ],
    costs: [
      { name: 'COGS', value: 41 },
      { name: 'Labor', value: 28 },
      { name: 'Rent', value: 18 },
      { name: 'Marketing', value: 6 },
      { name: 'Other', value: 7 }
    ],
    roi: 8,
    paybackMonths: 41,
    risk: 8,
    yearlyProfit: 33000
  }
}

export const riskFactors = ['High dependency on local foot traffic', 'Labor turnover above benchmark', 'Thin margin sensitivity to COGS volatility']
export const warningFlags = ['Opening cash buffer below 3 months', 'Supplier concentration risk', 'Sales ramp assumes aggressive month-2 growth']
export const mitigations = ['Secure a backup supplier before launch', 'Phase hiring with demand milestones', 'Add a 10% contingency to working capital']

export const resultSteps = [
  { title: 'Simulate Real Scenarios', path: '/results/scenarios', description: 'Run detailed financial projections based on your franchise model' },
  { title: 'Predict Profit & Risk', path: '/results/profit-risk', description: 'Get accurate forecasts and risk assessments powered by AI' },
  { title: 'Avoid Costly Mistakes', path: '/results/avoid-mistakes', description: 'Identify risks before they become expensive problems' },
  { title: 'Compare Scenarios', path: '/results/compare', description: 'Compare multiple franchise opportunities side by side' },
  { title: 'Export Reports', path: '/results/export', description: 'Download professional PDF reports to share with investors' }
]

export const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
