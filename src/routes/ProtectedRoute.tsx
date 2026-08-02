import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { isSupabaseConfigured } from '@/services/supabase'
import { Logo } from '@/components/brand/Logo'

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg">
      <div className="flex flex-col items-center gap-4">
        <Logo markOnly className="size-14 animate-pulse" />
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          Carregando…
        </span>
      </div>
    </div>
  )
}

export function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) return <Splash />

  // Before the user connects Supabase, run in demo mode so the shell is usable.
  if (session || !isSupabaseConfigured) return <Outlet />

  return <Navigate to="/entrar" replace />
}
