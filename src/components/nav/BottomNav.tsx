import { NavLink } from 'react-router-dom'
import { MoreHorizontal } from 'lucide-react'
import { NAV_ITEMS } from '@/config/nav'
import { cn } from '@/utils/cn'

const primary = NAV_ITEMS.filter((i) => i.primary).slice(0, 4)

/** Fixed bottom navigation for mobile; replaces the sidebar under lg. */
export function BottomNav({ onMore }: { onMore: () => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-rule bg-surface/95 backdrop-blur lg:hidden">
      {primary.map(({ label, path, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition',
              isActive ? 'text-brand' : 'text-muted',
            )
          }
        >
          <Icon className="size-5" strokeWidth={2} />
          <span className="truncate">{label}</span>
        </NavLink>
      ))}
      <button
        type="button"
        onClick={onMore}
        className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted"
      >
        <MoreHorizontal className="size-5" strokeWidth={2} />
        <span>Mais</span>
      </button>
    </nav>
  )
}
