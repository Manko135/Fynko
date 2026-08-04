import { useEffect, useRef, useState } from 'react'
import { MoreVertical, type LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

export type RowMenuItem = {
  label: string
  icon: LucideIcon
  onClick: () => void
  danger?: boolean
}

/**
 * Compact "⋮" actions menu for table rows — replaces a cluster of icon buttons
 * with a single trigger. Closes on outside click or after choosing an item.
 */
export function RowMenu({ items, label = 'Ações' }: { items: RowMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-ink',
          open && 'bg-surface-2 text-ink',
        )}
      >
        <MoreVertical className="size-4" />
      </button>
      {open && (
        <div className="animate-pop absolute right-0 top-9 z-30 w-52 origin-top-right overflow-hidden rounded-xl border border-rule bg-surface p-1 shadow-2xl">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              onClick={() => {
                setOpen(false)
                it.onClick()
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-surface-2',
                it.danger ? 'text-danger' : 'text-ink/80',
              )}
            >
              <it.icon className={cn('size-4 shrink-0', it.danger ? 'text-danger' : 'text-muted')} />
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
