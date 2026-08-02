import { useEffect, useState } from 'react'

export type DashboardSection =
  | 'forecast'
  | 'indicators'
  | 'chartRevDesp'
  | 'chartSaldo'
  | 'chartCategoria'
  | 'chartSaldoMes'

export type DashboardPrefs = Record<DashboardSection, boolean>

export const DASHBOARD_SECTIONS: { key: DashboardSection; label: string }[] = [
  { key: 'forecast', label: 'Previsão do mês' },
  { key: 'indicators', label: 'Indicadores' },
  { key: 'chartRevDesp', label: 'Gráfico Receitas × Despesas' },
  { key: 'chartSaldo', label: 'Gráfico Evolução do saldo' },
  { key: 'chartCategoria', label: 'Gráfico Gastos por categoria' },
  { key: 'chartSaldoMes', label: 'Gráfico Saldo por mês' },
]

const DEFAULTS: DashboardPrefs = {
  forecast: true,
  indicators: true,
  chartRevDesp: true,
  chartSaldo: true,
  chartCategoria: true,
  chartSaldoMes: true,
}

const KEY = 'fynko:dashboard-prefs'

function load(): DashboardPrefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return DEFAULTS
  }
}

/** Which dashboard sections are visible. Persisted per browser. */
export function useDashboardPrefs() {
  const [prefs, setPrefs] = useState<DashboardPrefs>(load)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  }, [prefs])

  const toggle = (key: DashboardSection) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }))

  return { prefs, toggle }
}
