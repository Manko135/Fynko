import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCheck,
  Gauge,
  PartyPopper,
} from 'lucide-react'
import { useAlerts, type Alert } from '@/hooks/useAlerts'
import { formatBRL } from '@/lib/money'
import { cn } from '@/utils/cn'

const READ_KEY = 'fynko:alerts:read'

function loadRead(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

function iconFor(kind: Alert['kind']) {
  if (kind === 'meta') return PartyPopper
  if (kind === 'vencida') return AlertTriangle
  if (kind === 'budget') return Gauge
  return CalendarClock
}

export function NotificationBell() {
  const alerts = useAlerts()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [read, setRead] = useState<Set<string>>(loadRead)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    localStorage.setItem(READ_KEY, JSON.stringify([...read]))
  }, [read])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const unread = alerts.filter((a) => !read.has(a.key))
  const unreadCount = unread.length

  function markAll() {
    setRead((prev) => new Set([...prev, ...alerts.map((a) => a.key)]))
  }
  function openAlert(a: Alert) {
    setRead((prev) => new Set(prev).add(a.key))
    setOpen(false)
    navigate(a.path)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={`Notificações${unreadCount ? `, ${unreadCount} não lidas` : ''}`}
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex size-9 items-center justify-center rounded-xl border border-rule text-ink/70 transition hover:bg-surface-2"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-80 overflow-hidden rounded-2xl border border-rule bg-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-rule px-4 py-3">
            <span className="font-display text-sm font-bold">Notificações</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="flex items-center gap-1 text-xs text-muted hover:text-ink"
              >
                <CheckCheck className="size-3.5" />
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted">
                Tudo em dia por aqui. 🦉
              </div>
            ) : (
              alerts.map((a) => {
                const Icon = iconFor(a.kind)
                const isRead = read.has(a.key)
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => openAlert(a)}
                    className={cn(
                      'flex w-full items-start gap-3 border-b border-rule px-4 py-3 text-left transition hover:bg-surface-2',
                      !isRead && 'bg-brand/5',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg',
                        a.kind === 'vencida'
                          ? 'bg-danger/12 text-danger'
                          : a.kind === 'meta'
                            ? 'bg-positive/12 text-positive'
                            : 'bg-warning/15 text-warning',
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{a.title}</span>
                        {!isRead && (
                          <span className="size-1.5 shrink-0 rounded-full bg-brand" />
                        )}
                      </div>
                      <div className="truncate text-xs text-muted">{a.subtitle}</div>
                    </div>
                    {a.amountCents != null && (
                      <span className="shrink-0 font-mono text-xs tnum text-ink/70">
                        {formatBRL(a.amountCents)}
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
