import { useEffect, useRef, useState } from 'react'
import { MoreVertical, type LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

export type RowMenuItem = {
  label: string
  icon: LucideIcon
  onClick: () => void
  danger?: boolean
}

const MENU_W = 208 // matches w-52

/**
 * Compact "⋮" actions menu for table rows. The panel is rendered with FIXED
 * positioning computed from the trigger, so it escapes any `overflow-hidden`
 * container and never gets clipped. It flips upward automatically when there
 * isn't enough room below (smart placement).
 */
export function RowMenu({ items, label = 'Ações' }: { items: RowMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  function place() {
    const t = triggerRef.current
    if (!t) return
    const r = t.getBoundingClientRect()
    const menuH = items.length * 40 + 12
    const spaceBelow = window.innerHeight - r.bottom
    const up = spaceBelow < menuH + 12 && r.top > spaceBelow
    const top = up ? Math.max(8, r.top - menuH - 4) : r.bottom + 4
    const left = Math.min(Math.max(8, r.right - MENU_W), window.innerWidth - MENU_W - 8)
    setPos({ top, left, up })
  }

  function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    place()
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node) || triggerRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const close = () => setOpen(false)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        onClick={toggle}
        className={cn(
          'grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-ink',
          open && 'bg-surface-2 text-ink',
        )}
      >
        <MoreVertical className="size-4" />
      </button>
      {open && pos && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: MENU_W }}
          className={cn(
            'animate-pop z-50 overflow-hidden rounded-xl border border-rule bg-surface p-1 shadow-2xl',
            pos.up ? 'origin-bottom' : 'origin-top',
          )}
        >
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
    </>
  )
}
