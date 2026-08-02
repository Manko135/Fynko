import { useMemo, useState } from 'react'
import { CalendarClock, Pencil, Plus, Repeat, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SubscriptionFormModal } from './SubscriptionFormModal'
import {
  useSubscriptions,
  useDeleteSubscription,
  useReconcileSubscriptions,
} from '@/hooks/useSubscriptions'
import { useAccounts } from '@/hooks/useAccounts'
import { useCards } from '@/hooks/useCards'
import { useToast } from '@/contexts/ToastContext'
import { BrandBadge } from '@/components/subscriptions/BrandBadge'
import { formatBRL } from '@/lib/money'
import { diffDays, formatDisplayDate, todayISO } from '@/lib/dates'
import { cn } from '@/utils/cn'
import type { Subscription } from '@/types/domain'

const STATUS_STYLE: Record<Subscription['status'], string> = {
  ativa: 'bg-positive/12 text-positive',
  pausada: 'bg-warning/15 text-warning',
  cancelada: 'bg-ink/8 text-muted',
}
const FREQ_LABEL = { mensal: '/mês', anual: '/ano', personalizada: '' } as const

function monthlyOf(s: Subscription): number {
  if (s.status !== 'ativa') return 0
  if (s.frequency === 'anual') return Math.round(s.amount_cents / 12)
  return s.amount_cents
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-rule bg-surface p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold tnum">{value}</div>
    </div>
  )
}

export function AssinaturasPage() {
  useReconcileSubscriptions()
  const { data: subs, isLoading } = useSubscriptions()
  const { data: accounts } = useAccounts()
  const { data: cards } = useCards()
  const del = useDeleteSubscription()
  const { toast } = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [deleting, setDeleting] = useState<Subscription | null>(null)

  const today = todayISO()
  const accName = useMemo(() => new Map((accounts ?? []).map((a) => [a.id, a.name])), [accounts])
  const cardName = useMemo(() => new Map((cards ?? []).map((c) => [c.id, c.name])), [cards])

  const active = (subs ?? []).filter((s) => s.status === 'ativa')
  const monthly = active.reduce((s, x) => s + monthlyOf(x), 0)
  const nextUp = [...active].sort((a, b) => (a.next_due < b.next_due ? -1 : 1))[0]

  async function confirmDelete() {
    if (!deleting) return
    try {
      await del.mutateAsync(deleting.id)
      toast('Assinatura removida.')
      setDeleting(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível remover.', 'error')
    }
  }

  const isEmpty = !isLoading && (subs?.length ?? 0) === 0

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex items-center justify-end">
        {!isEmpty && (
          <Button icon={<Plus className="size-4" strokeWidth={2.5} />} onClick={() => { setEditing(null); setFormOpen(true) }}>
            Nova assinatura
          </Button>
        )}
      </div>

      {!isEmpty && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Gasto mensal" value={formatBRL(monthly)} />
          <Stat label="Estimado no ano" value={formatBRL(monthly * 12)} />
          <Stat label="Ativas" value={String(active.length)} />
          <Stat label="Próxima" value={nextUp ? formatDisplayDate(nextUp.next_due) : '—'} />
        </div>
      )}

      {isEmpty && (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-brand">
            <Repeat className="size-7" strokeWidth={1.75} />
          </span>
          <h2 className="font-display text-xl font-bold">Todas as assinaturas num lugar</h2>
          <p className="text-sm text-muted">
            Netflix, Spotify, academia: cadastre e a cobrança aparece
            automaticamente nas suas despesas, sem lançar duas vezes.
          </p>
          <Button icon={<Plus className="size-4" strokeWidth={2.5} />} onClick={() => setFormOpen(true)}>
            Adicionar assinatura
          </Button>
        </div>
      )}

      {subs && subs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subs.map((s) => {
            const src = s.card_id ? cardName.get(s.card_id) : s.account_id ? accName.get(s.account_id) : null
            const days = diffDays(s.next_due, today)
            const dueLabel =
              s.status !== 'ativa'
                ? formatDisplayDate(s.next_due)
                : days < 0
                  ? 'cobrança atrasada'
                  : days === 0
                    ? 'cobra hoje'
                    : days === 1
                      ? 'cobra amanhã'
                      : `cobra em ${days} dias`
            return (
              <div
                key={s.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-rule bg-surface p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <BrandBadge name={s.name} color={s.color} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{s.name}</div>
                      <span className={cn('mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize', STATUS_STYLE[s.status])}>
                        {s.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-100 transition focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                    <button type="button" aria-label="Editar" onClick={() => { setEditing(s); setFormOpen(true) }} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2">
                      <Pencil className="size-4" />
                    </button>
                    <button type="button" aria-label="Remover" onClick={() => setDeleting(s)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-danger">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <span className="font-display text-2xl font-bold tnum">{formatBRL(s.amount_cents)}</span>
                    <span className="text-sm text-muted">{FREQ_LABEL[s.frequency]}</span>
                  </div>
                  {s.status === 'ativa' && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium',
                        days < 0 ? 'bg-danger/12 text-danger' : days <= 3 ? 'bg-warning/15 text-warning' : 'bg-surface-2 text-muted',
                      )}
                    >
                      <CalendarClock className="size-3" />
                      {dueLabel}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-rule pt-3 font-mono text-[11px] text-muted">
                  <span>vence {formatDisplayDate(s.next_due)}</span>
                  {src && <span className="truncate pl-2">{src}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <SubscriptionFormModal open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Remover assinatura"
        message={`Remover "${deleting?.name}"? A cobrança futura ligada a ela também sai das despesas (o histórico já pago fica).`}
        loading={del.isPending}
      />
    </div>
  )
}
