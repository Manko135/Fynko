import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, Settings, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'

/** Avatar with a dropdown: Meu Perfil · Configurações · Sair. */
export function ProfileMenu() {
  const { user, signOut } = useAuth()
  const { data: profile } = useProfile()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const name =
    profile?.full_name ??
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    'Você'
  const initial = name.trim().charAt(0).toUpperCase() || 'F'

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu do perfil"
        aria-expanded={open}
        className="grid size-9 place-items-center overflow-hidden rounded-full bg-brand/15 font-semibold text-brand outline-none ring-brand/40 transition hover:bg-brand/25 focus-visible:ring-2"
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="size-full object-cover" />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-56 overflow-hidden rounded-2xl border border-rule bg-surface shadow-2xl">
          <div className="flex items-center gap-3 border-b border-rule px-4 py-3">
            <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-brand/15 font-semibold text-brand">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="size-full object-cover" />
              ) : (
                initial
              )}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{profile?.full_name ?? 'Sua conta'}</div>
              <div className="truncate text-xs text-muted">{user?.email}</div>
            </div>
          </div>
          <div className="p-1.5">
            <Link
              to="/perfil"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink/85 transition hover:bg-surface-2"
            >
              <User className="size-4 text-muted" /> Meu perfil
            </Link>
            <Link
              to="/configuracoes"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink/85 transition hover:bg-surface-2"
            >
              <Settings className="size-4 text-muted" /> Configurações
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                void signOut()
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger transition hover:bg-danger/10"
            >
              <LogOut className="size-4" /> Sair
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
