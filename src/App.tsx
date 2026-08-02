import { lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppLayout } from '@/layouts/AppLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { LoginPage } from '@/pages/auth/LoginPage'
import { NAV_ITEMS } from '@/config/nav'
import type { ReactNode } from 'react'

// Lazy-load each page into its own chunk so heavy deps (Recharts, etc.) stay
// out of the initial bundle and load only when the route is visited.
function page<M extends Record<string, unknown>>(loader: () => Promise<M>, name: keyof M) {
  return lazy(async () => ({ default: (await loader())[name] as React.ComponentType }))
}

const DashboardPage = page(() => import('@/pages/dashboard/DashboardPage'), 'DashboardPage')
const ContasPage = page(() => import('@/pages/accounts/ContasPage'), 'ContasPage')
const ReceitasPage = page(() => import('@/pages/incomes/ReceitasPage'), 'ReceitasPage')
const DespesasPage = page(() => import('@/pages/expenses/DespesasPage'), 'DespesasPage')
const CartoesPage = page(() => import('@/pages/cards/CartoesPage'), 'CartoesPage')
const MetasPage = page(() => import('@/pages/goals/MetasPage'), 'MetasPage')
const CalendarioPage = page(() => import('@/pages/calendar/CalendarioPage'), 'CalendarioPage')
const LinhaDoTempoPage = page(() => import('@/pages/timeline/LinhaDoTempoPage'), 'LinhaDoTempoPage')
const PatrimonioPage = page(() => import('@/pages/patrimonio/PatrimonioPage'), 'PatrimonioPage')
const LimitesPage = page(() => import('@/pages/budgets/LimitesPage'), 'LimitesPage')
const AssinaturasPage = page(() => import('@/pages/subscriptions/AssinaturasPage'), 'AssinaturasPage')
const ConfiguracoesPage = page(() => import('@/pages/settings/ConfiguracoesPage'), 'ConfiguracoesPage')
const PerfilPage = page(() => import('@/pages/profile/PerfilPage'), 'PerfilPage')
const RelatoriosPage = page(() => import('@/pages/reports/RelatoriosPage'), 'RelatoriosPage')

// Routes that already have a real page override the placeholder.
const REAL_PAGES: Record<string, ReactNode> = {
  '/': <DashboardPage />,
  '/contas': <ContasPage />,
  '/receitas': <ReceitasPage />,
  '/despesas': <DespesasPage />,
  '/cartoes': <CartoesPage />,
  '/metas': <MetasPage />,
  '/calendario': <CalendarioPage />,
  '/linha-do-tempo': <LinhaDoTempoPage />,
  '/patrimonio': <PatrimonioPage />,
  '/limites': <LimitesPage />,
  '/assinaturas': <AssinaturasPage />,
  '/relatorios': <RelatoriosPage />,
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/entrar" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {NAV_ITEMS.map(({ path }) =>
                REAL_PAGES[path] ? (
                  <Route key={path} path={path} element={REAL_PAGES[path]} />
                ) : null,
              )}
              <Route path="/perfil" element={<PerfilPage />} />
              <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
