import { NavLink } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { SidebarBalance } from '@/components/nav/SidebarBalance'
import { NAV_ITEMS } from '@/config/nav'
import { cn } from '@/utils/cn'

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-4 border-r border-rule bg-surface/50 py-5 lg:flex">
      <div className="px-4">
        <Logo className="h-9 w-auto" />
      </div>
      <SidebarBalance />
      <nav className="mt-1 flex flex-1 flex-col gap-0.5 overflow-y-auto px-2">
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                isActive
                  ? 'bg-brand/12 text-brand'
                  : 'text-ink/70 hover:bg-surface-2 hover:text-ink',
              )
            }
          >
            <Icon className="size-[18px]" strokeWidth={2} />
            <span className="min-w-0 flex-1 truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
