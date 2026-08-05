import { useMemo, useState } from 'react'
import { Gauge, Pencil, Plus, StickyNote, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { NotesModal } from '@/components/ui/NotesModal'
import { BudgetFormModal } from './BudgetFormModal'
import { useBudgets, useBudgetUsage, useDeleteBudget } from '@/hooks/useBudgets'
import { useCategories } from '@/hooks/useCategories'
import { useCards } from '@/hooks/useCards'
import { useToast } from '@/contexts/ToastContext'
import { formatBRL } from '@/lib/money'
import { cn } from '@/utils/cn'
import type { Budget } from '@/types/domain'

// Turns red from 70% (spec): green under 70, red at/above.
function barColor(pct: number): string {
  return pct < 70 ? 'var(--color-positive)' : 'var(--color-danger)'
}
function statusEmoji(pct: number): string {
  if (pct >= 100) return '🚨'
  if (pct >= 90) return '🔴'
  if (pct >= 70) return '⚠️'
  return '🟢'
}
function alertText(pct: number): string | null {
  if (pct >= 100) return 'Limite excedido!'
  if (pct >= 90) return 'Atenção: você está quase no limite.'
  if (pct >= 70) return 'Você já usou grande parte do orçamento.'
  return null
}

export function LimitesPage() {
  const { data: budgets, isLoading } = useBudgets()
  const usage = useBudgetUsage()
  const { data: categories } = useCategories('expense')
  const { data: cards } = useCards()
  const del = useDeleteBudget()
  const { toast } = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [deleting, setDeleting] = useState<Budget | null>(null)
  const [viewingNotes, setViewingNotes] = useState<Budget | null>(null)

  const catName = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c.name])), [categories])
  const cardName = useMemo(() => new Map((cards ?? []).map((c) => [c.id, c.name])), [cards])

  function labelFor(b: Budget): string {
    if (b.title) return b.title
    if (b.scope === 'geral') return 'Limite geral do mês'
    if (b.scope === 'categoria') return catName.get(b.category_id ?? '') ?? 'Categoria'
    return `Cartão · ${cardName.get(b.card_id ?? '') ?? ''}`
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await del.mutateAsync(deleting.id)
      toast('Limite excluído.')
      setDeleting(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível excluir.', 'error')
    }
  }

  const isEmpty = !isLoading && (budgets?.length ?? 0) === 0

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-center justify-end">
        {!isEmpty && (
          <Button icon={<Plus className="size-4" strokeWidth={2.5} />} onClick={() => { setEditing(null); setFormOpen(true) }}>
            Novo limite
          </Button>
        )}
      </div>

      {isEmpty && (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-brand">
            <Gauge className="size-7" strokeWidth={1.75} />
          </span>
          <h2 className="font-display text-xl font-bold">Gaste com consciência</h2>
          <p className="text-sm text-muted">
            Defina quanto quer gastar por categoria, no cartão ou no mês todo, e
            acompanhe o quanto já foi.
          </p>
          <Button icon={<Plus className="size-4" strokeWidth={2.5} />} onClick={() => setFormOpen(true)}>
            Criar primeiro limite
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {usage.map(({ budget, spentCents, pct, overCents }) => {
          const remaining = budget.amount_cents - spentCents
          return (
            <div key={budget.id} className="group rounded-2xl border border-rule bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{labelFor(budget)}</div>
                  <div className="font-mono text-[11px] text-muted">
                    {statusEmoji(pct)} {pct.toFixed(0)}% usado
                  </div>
                </div>
                <div className="flex gap-1 opacity-100 transition focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                  {budget.notes?.trim() && (
                    <button type="button" aria-label="Ver observações" onClick={() => setViewingNotes(budget)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2">
                      <StickyNote className="size-4" />
                    </button>
                  )}
                  <button type="button" aria-label="Editar" onClick={() => { setEditing(budget); setFormOpen(true) }} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2">
                    <Pencil className="size-4" />
                  </button>
                  <button type="button" aria-label="Excluir" onClick={() => setDeleting(budget)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-danger">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-end justify-between">
                <span className="font-display text-xl font-bold tnum">{formatBRL(spentCents)}</span>
                <span className="text-sm text-muted tnum">de {formatBRL(budget.amount_cents)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/8">
                <div
                  className={cn(
                    'h-full rounded-full transition-[width] duration-500',
                    pct >= 100 && 'animate-pulse',
                  )}
                  style={{
                    width: `${Math.min(100, pct)}%`,
                    background: barColor(pct),
                    boxShadow: pct >= 100 ? '0 0 8px var(--color-danger)' : undefined,
                  }}
                />
              </div>
              <div className="mt-1.5 text-[11px] text-muted">
                {overCents > 0 ? (
                  <span className="text-danger">Ultrapassou em {formatBRL(overCents)}</span>
                ) : (
                  <>Restam {formatBRL(remaining)} neste mês</>
                )}
              </div>

              {alertText(pct) && (
                <div
                  className={cn(
                    'mt-3 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium',
                    pct >= 100
                      ? 'bg-danger/15 text-danger'
                      : 'bg-danger/10 text-danger',
                  )}
                >
                  <span>{statusEmoji(pct)}</span>
                  {alertText(pct)}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <BudgetFormModal open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Excluir limite"
        message="Excluir este limite? O acompanhamento deste mês deixa de aparecer."
        loading={del.isPending}
      />
      <NotesModal
        open={!!viewingNotes}
        onClose={() => setViewingNotes(null)}
        title={viewingNotes ? `Observações · ${labelFor(viewingNotes)}` : 'Observações'}
        notes={viewingNotes?.notes}
      />
    </div>
  )
}
