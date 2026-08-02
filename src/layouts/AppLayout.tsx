import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Loader2, X } from 'lucide-react'
import { Sidebar } from '@/components/nav/Sidebar'
import { BottomNav } from '@/components/nav/BottomNav'
import { TopBar } from '@/components/nav/TopBar'
import { SearchPalette } from '@/components/search/SearchPalette'
import { NAV_ITEMS } from '@/config/nav'
import { useSeedDefaultCategories } from '@/hooks/useCategories'
import { useProfile } from '@/hooks/useProfile'
import { cn } from '@/utils/cn'

function currentTitle(pathname: string): string {
  const match = NAV_ITEMS.find((i) =>
    i.path === '/' ? pathname === '/' : pathname.startsWith(i.path),
  )
  return match?.label ?? 'Fynko'
}

/** Overflow nav items on mobile, opened from the bottom bar's "Mais". */
function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-rule bg-surface p-4 pb-8">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display font-bold">Menu</span>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X className="size-5 text-muted" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1.5 rounded-xl border border-rule p-3 text-center text-xs font-medium',
                  isActive ? 'bg-brand/12 text-brand' : 'text-ink/75',
                )
              }
            >
              <Icon className="size-5" strokeWidth={2} />
              <span className="leading-tight">{label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  )
}

export function AppLayout() {
  const { pathname } = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  useSeedDefaultCategories() // ensures default categories exist, once
  useProfile() // loads profile + applies saved currency app-wide

  // Global ⌘K / Ctrl+K opens the search palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])



  return (
    <div className="flex min-h-screen bg-bg text-ink">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={currentTitle(pathname)} onOpenSearch={() => setSearchOpen(true)} />
        <main className="flex-1 px-4 py-5 pb-24 sm:px-6 lg:pb-8">
          <Suspense
            fallback={
              <div className="grid place-items-center py-24 text-faint">
                <Loader2 className="size-6 animate-spin" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
      <BottomNav onMore={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
