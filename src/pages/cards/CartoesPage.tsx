import { useMemo, useState } from 'react'
import { CreditCard, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CardFormModal } from './CardFormModal'
import { PayInvoiceModal } from './PayInvoiceModal'
import { CardBrandLogo } from '@/components/cards/CardBrandLogo'
import { useCards, useDeleteCard } from '@/hooks/useCards'
import { useExpenses } from '@/hooks/useExpenses'
import { useToast } from '@/contexts/ToastContext'
import { formatBRL } from '@/lib/money'
import { todayISO } from '@/lib/dates'
import { currentInvoiceExpenses, summarizeCard } from '@/lib/finance/invoice'
import { DEFAULT_COLOR } from '@/lib/palette'
import type { Card, Expense } from '@/types/domain'

type InvoiceTarget = { card: Card; cents: number; ids: string[] }

function CardFace({
  card,
  expenses,
  onEdit,
  onDelete,
  onPay,
}: {
  card: Card
  expenses: Expense[]
  onEdit: () => void
  onDelete: () => void
  onPay: (t: InvoiceTarget) => void
}) {
  const today = todayISO()
  const color = card.color ?? DEFAULT_COLOR

  const mine = expenses.filter((e) => e.card_id === card.id)
  const rows = mine.map((e) => ({
    id: e.id,
    amountCents: e.amount_cents,
    dueDate: e.due_date,
    paymentDate: e.payment_date,
    subscriptionId: e.subscription_id,
  }))
  const summary = summarizeCard(card.limit_cents, card.closing_day, rows, today)
  const invoiceItems = currentInvoiceExpenses(card.closing_day, rows, today)
  const usedPct =
    card.limit_cents > 0
      ? Math.min(100, (summary.usedLimitCents / card.limit_cents) * 100)
      : 0

  return (
    <div
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl p-5 text-white shadow-lg ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
      style={{
        background: `linear-gradient(145deg, ${color} 0%, color-mix(in oklab, ${color} 52%, #0a0f0d) 100%)`,
        minHeight: 224,
      }}
    >
      {/* Glass sheen + soft glows */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(120% 80% at 0% 0%, rgba(255,255,255,0.22), transparent 55%)' }}
        aria-hidden
      />
      <div className="pointer-events-none absolute -right-12 -top-14 size-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-16 -left-10 size-40 rounded-full bg-black/20 blur-2xl" aria-hidden />

      {/* Top: chip + brand + actions */}
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Realistic gold chip */}
          <div
            className="grid h-7 w-9 place-items-center rounded-[5px] shadow-inner"
            style={{ background: 'linear-gradient(135deg, #f7e3a1 0%, #d9b45b 45%, #b98f3e 100%)' }}
            aria-hidden
          >
            <div className="h-4 w-6 rounded-[3px] border border-black/20">
              <div className="mx-auto mt-[6px] h-px w-4 bg-black/25" />
            </div>
          </div>
          <span className="font-display text-base font-semibold leading-tight">{card.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <CardBrandLogo value={card.brand ?? ''} />
          <div className="flex items-center gap-1 opacity-100 transition focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
            <button type="button" aria-label="Editar cartão" onClick={onEdit} className="grid size-7 place-items-center rounded-lg text-white/80 backdrop-blur hover:bg-white/20">
              <Pencil className="size-3.5" />
            </button>
            <button type="button" aria-label="Excluir cartão" onClick={onDelete} className="grid size-7 place-items-center rounded-lg text-white/80 backdrop-blur hover:bg-white/20">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Masked number */}
      <div className="relative mt-3 font-mono text-lg tracking-[0.22em] text-white/85">
        ••••&nbsp; ••••&nbsp; ••••&nbsp; ••••
      </div>

      {/* Invoice */}
      <div className="relative mt-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/70">
          Fatura atual · vence dia {card.due_day}
        </div>
        <div className="font-display text-3xl font-bold tnum">
          {formatBRL(summary.currentInvoiceCents)}
        </div>
      </div>

      {/* Limit bar */}
      <div className="relative mt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-white/85 transition-[width] duration-500" style={{ width: `${usedPct}%` }} />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-white/75">
          <span>Disponível {formatBRL(summary.availableLimitCents)}</span>
          <span>Limite {formatBRL(card.limit_cents)}</span>
        </div>
      </div>

      {summary.currentInvoiceCents > 0 && (
        <button
          type="button"
          onClick={() => onPay({ card, cents: summary.currentInvoiceCents, ids: invoiceItems.map((i) => i.id) })}
          className="relative mt-4 rounded-xl border border-white/25 bg-white/15 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25"
        >
          Pagar fatura
        </button>
      )}
    </div>
  )
}

export function CartoesPage() {
  const { data: cards, isLoading } = useCards()
  const { data: expenses } = useExpenses()
  const del = useDeleteCard()
  const { toast } = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Card | null>(null)
  const [deleting, setDeleting] = useState<Card | null>(null)
  const [payTarget, setPayTarget] = useState<InvoiceTarget | null>(null)

  const allExpenses = useMemo(() => expenses ?? [], [expenses])

  async function confirmDelete() {
    if (!deleting) return
    try {
      await del.mutateAsync(deleting.id)
      toast('Cartão excluído.')
      setDeleting(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível excluir.', 'error')
    }
  }

  const isEmpty = !isLoading && (cards?.length ?? 0) === 0

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex items-center justify-end">
        {!isEmpty && (
          <Button
            icon={<Plus className="size-4" strokeWidth={2.5} />}
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            Novo cartão
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      )}

      {isEmpty && (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-brand">
            <CreditCard className="size-7" strokeWidth={1.75} />
          </span>
          <h2 className="font-display text-xl font-bold">Seus cartões, sob controle</h2>
          <p className="text-sm text-muted">
            Cadastre seus cartões de crédito para acompanhar fatura, limite
            disponível e o que ainda vai vir.
          </p>
          <Button
            icon={<Plus className="size-4" strokeWidth={2.5} />}
            onClick={() => setFormOpen(true)}
          >
            Adicionar cartão
          </Button>
        </div>
      )}

      {cards && cards.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((c) => (
            <CardFace
              key={c.id}
              card={c}
              expenses={allExpenses}
              onEdit={() => {
                setEditing(c)
                setFormOpen(true)
              }}
              onDelete={() => setDeleting(c)}
              onPay={setPayTarget}
            />
          ))}
        </div>
      )}

      <CardFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
      />
      <PayInvoiceModal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        cardName={payTarget?.card.name ?? ''}
        invoiceCents={payTarget?.cents ?? 0}
        expenseIds={payTarget?.ids ?? []}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Excluir cartão"
        message={`Excluir "${deleting?.name}"? As despesas ligadas a ele ficam sem cartão, mas não são apagadas.`}
        loading={del.isPending}
      />
    </div>
  )
}
