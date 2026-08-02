import { Moon, Search, Sun } from 'lucide-react'
import { NotificationBell } from '@/components/nav/NotificationBell'
import { ProfileMenu } from '@/components/nav/ProfileMenu'
import { useTheme } from '@/contexts/ThemeContext'

export function TopBar({
  title,
  onOpenSearch,
}: {
  title: string
  onOpenSearch: () => void
}) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-rule bg-bg/85 px-4 py-3 backdrop-blur sm:px-6">
      <h1 className="min-w-0 flex-1 truncate font-display text-lg font-bold tracking-tight">
        {title}
      </h1>

      {/* Global search (⌘K opens it too). */}
      <button
        type="button"
        onClick={onOpenSearch}
        className="hidden items-center gap-2 rounded-xl border border-rule bg-surface px-3 py-2 text-sm text-muted transition hover:bg-surface-2 sm:flex"
      >
        <Search className="size-4" />
        Buscar
      </button>
      <button
        type="button"
        onClick={onOpenSearch}
        aria-label="Buscar"
        className="inline-flex size-9 items-center justify-center rounded-xl border border-rule text-ink/70 transition hover:bg-surface-2 sm:hidden"
      >
        <Search className="size-4" />
      </button>

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
        className="inline-flex size-9 items-center justify-center rounded-xl border border-rule text-ink/70 transition hover:bg-surface-2"
      >
        {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>

      <NotificationBell />
      <ProfileMenu />
    </header>
  )
}
