import { useMemo, useState } from 'react'
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Pencil,
  Plus,
  Search,
  TrendingDown,
  Trash2,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FilterBar, type FilterValue } from '@/components/ui/FilterBar'
import { ExpenseFormModal } from './ExpenseFormModal'
import {
  useExpenses,
  useDeleteExpense,
  useDeleteExpenseGroup,
  usePayExpense,
} from '@/hooks/useExpenses'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import { useCards } from '@/hooks/useCards'
import { usePageSize } from '@/hooks/usePageSize'
import { useToast } from '@/contexts/ToastContext'
import { formatBRL } from '@/lib/money'
import { formatDisplayDate, todayISO } from '@/lib/dates'
import { expenseStatus } from '@/lib/finance/status'
import type { Expense } from '@/types/domain'

export function DespesasPage() {
  const { data: expenses, isLoading } = useExpenses()
  const { data: categories } = useCategories('expense')
  const { data: accounts } = useAccounts()
  const { data: cards } = useCards()
  const del = useDeleteExpense()
  const delGroup = useDeleteExpenseGroup()
  const pay = usePayExpense()
  const { toast } = useToast()
  const pageSize = usePageSize()
  const today = todayISO()

  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<FilterValue>({})
  const [page, setPage] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState<Expense | null>(null)

  const catMap = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories],
  )
  const accMap = useMemo(
    () => new Map((accounts ?? []).map((a) => [a.id, a])),
    [accounts],
  )
  const cardMap = useMemo(
    () => new Map((cards ?? []).map((c) => [c.id, c])),
    [cards],
  )

  const filterGroups = useMemo(
    () => [
      {
        key: 'category',
        label: 'Categoria',
        options: (categories ?? []).map((c) => ({
          value: c.id,
          label: c.name,
          color: c.color ?? undefined,
        })),
      },
      {
        key: 'status',
        label: 'Status',
        options: [
          { value: 'pago', label: 'Pago' },
          { value: 'vencido', label: 'Vencido' },
          { value: 'a_vencer', label: 'A vencer' },
          { value: 'em_aberto', label: 'Em aberto' },
        ],
      },
      {
        key: 'type',
        label: 'Tipo',
        options: [
          { value: 'fixa', label: 'Fixa' },
          { value: 'variavel', label: 'Variável' },
          { value: 'parcelada', label: 'Parcelada' },
        ],
      },
      {
        key: 'account',
        label: 'Conta',
        options: (accounts ?? []).map((a) => ({ value: a.id, label: a.name })),
      },
      {
        key: 'card',
        label: 'Cartão',
        options: (cards ?? []).map((c) => ({ value: c.id, label: c.name })),
      },
    ],
    [categories, accounts, cards],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const cats = filters.category ?? []
    const status = filters.status ?? []
    const types = filters.type ?? []
    const accs = filters.account ?? []
    const cardsF = filters.card ?? []
    return (expenses ?? []).filter((r) => {
      if (cats.length && !(r.category_id && cats.includes(r.category_id))) return false
      if (types.length && !types.includes(r.type)) return false
      if (accs.length && !(r.account_id && accs.includes(r.account_id))) return false
      if (cardsF.length && !(r.card_id && cardsF.includes(r.card_id))) return false
      if (status.length) {
        const st = expenseStatus(r.due_date, r.payment_date, today)
        if (!status.includes(st)) return false
      }
      if (!q) return true
      const cat = r.category_id ? catMap.get(r.category_id)?.name ?? '' : ''
      return (
        r.description.toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q)
      )
    })
  }, [expenses, query, filters, catMap, categories, accounts, cards, today])

  const paid = filtered.reduce(
    (s, e) => (e.payment_date ? s + e.amount_cents : s),
    0,
  )
  const toPay = filtered.reduce(
    (s, e) => (e.payment_date ? s : s + e.amount_cents),
    0,
  )

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, pageCount - 1)
  const rows = filtered.slice(current * pageSize, current * pageSize + pageSize)

  async function quickPay(e: Expense) {
    try {
      await pay.mutateAsync({ id: e.id, paymentDate: today })
      toast('Despesa marcada como paga.')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível pagar.', 'error')
    }
  }

  async function doDelete(mode: 'single' | 'group') {
    if (!deleting) return
    try {
      if (mode === 'group' && deleting.installment_group) {
        await delGroup.mutateAsync(deleting.installment_group)
        toast('Todas as parcelas foram excluídas.')
      } else {
        await del.mutateAsync(deleting.id)
        toast('Despesa excluída.')
      }
      setDeleting(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível excluir.', 'error')
    }
  }

  const isEmpty = !isLoading && (expenses?.length ?? 0) === 0
  const deletingLoading = del.isPending || delGroup.isPending

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
          <div className="flex items-center gap-3 rounded-2xl border border-rule bg-surface px-5 py-3 shadow-sm">
            <span className="grid size-10 place-items-center rounded-xl bg-warning/15 text-warning">
              <CalendarClock className="size-5" />
            </span>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">A pagar</div>
              <div className="font-display text-2xl font-bold leading-tight tnum text-warning">{formatBRL(toPay)}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-rule bg-surface px-5 py-3 shadow-sm">
            <span className="grid size-10 place-items-center rounded-xl bg-positive/12 text-positive">
              <Check className="size-5" />
            </span>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">Pago</div>
              <div className="font-display text-2xl font-bold leading-tight tnum text-ink/80">{formatBRL(paid)}</div>
            </div>
          </div>
        </div>
        {!isEmpty && (
          <Button className="w-full sm:w-auto" icon={<Plus className="size-4" strokeWidth={2.5} />} onClick={() => { setEditing(null); setFormOpen(true) }}>
            Nova despesa
          </Button>
        )}
      </div>

      {isEmpty && (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-danger">
            <TrendingDown className="size-7" strokeWidth={1.75} />
          </span>
          <h2 className="font-display text-xl font-bold">Controle o que sai</h2>
          <p className="text-sm text-muted">
            Contas, cartão, parcelas: registre suas despesas e acompanhe o que
            vence, o que já foi pago e o que está por vir.
          </p>
          <Button icon={<Plus className="size-4" strokeWidth={2.5} />} onClick={() => setFormOpen(true)}>
            Primeira despesa
          </Button>
        </div>
      )}

      {!isEmpty && (
        <>
          <div className="mb-4">
            <FilterBar
              groups={filterGroups}
              value={filters}
              onChange={(v) => {
                setFilters(v)
                setPage(0)
              }}
            />
          </div>
          <div className="rounded-2xl border border-rule bg-surface">
          <div className="flex items-center gap-2 border-b border-rule px-4 py-3">
            <Search className="size-4 text-faint" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(0) }}
              placeholder="Buscar por descrição ou categoria"
              className="w-full bg-transparent text-sm text-ink placeholder:text-faint outline-none"
            />
          </div>

          <div className="hidden grid-cols-[1.6fr_1fr_1fr_0.8fr_0.9fr_auto] gap-3 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-faint sm:grid">
            <span>Descrição</span>
            <span>Categoria</span>
            <span>Vencimento</span>
            <span>Status</span>
            <span className="text-right">Valor</span>
            <span className="w-24 text-right">Ações</span>
          </div>

          <div className="divide-y divide-rule">
            {isLoading &&
              [0, 1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse bg-surface-2/40" />
              ))}

            {rows.map((e) => {
              const cat = e.category_id ? catMap.get(e.category_id) : null
              const source = e.card_id
                ? cardMap.get(e.card_id)?.name
                : e.account_id
                  ? accMap.get(e.account_id)?.name
                  : null
              const status = expenseStatus(e.due_date, e.payment_date, today)
              return (
                <div
                  key={e.id}
                  className="group grid grid-cols-2 items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-surface-2/60 sm:grid-cols-[1.6fr_1fr_1fr_0.8fr_0.9fr_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-semibold text-ink">{e.description}</span>
                      {e.installment_count && (
                        <span className="shrink-0 rounded bg-ink/8 px-1 font-mono text-[10px] text-muted">
                          {e.installment_index}/{e.installment_count}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-muted">
                      {e.card_id ? (
                        <CreditCard className="size-3" />
                      ) : (
                        <Wallet className="size-3" />
                      )}
                      {source ?? '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted">
                    {cat && (
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: cat.color ?? 'var(--color-brand)' }}
                      />
                    )}
                    <span className="truncate">{cat?.name ?? '—'}</span>
                  </div>
                  <div className="hidden font-mono text-xs text-faint sm:block">
                    {formatDisplayDate(e.due_date)}
                  </div>
                  <div>
                    <StatusBadge status={status} />
                  </div>
                  <div className="text-right font-mono text-[15px] font-semibold tnum text-ink">
                    {formatBRL(e.amount_cents)}
                  </div>
                  <div className="col-span-2 mt-1.5 flex justify-end gap-1 border-t border-rule/60 pt-2 opacity-100 transition focus-within:opacity-100 sm:col-span-1 sm:mt-0 sm:border-0 sm:pt-0 sm:opacity-0 sm:group-hover:opacity-100">
                    {status !== 'pago' && !e.card_id && (
                      <button
                        type="button"
                        aria-label="Marcar como paga"
                        onClick={() => quickPay(e)}
                        className="grid size-8 place-items-center rounded-lg text-muted hover:bg-positive/12 hover:text-positive"
                      >
                        <Check className="size-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Editar"
                      onClick={() => { setEditing(e); setFormOpen(true) }}
                      className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Excluir"
                      onClick={() => setDeleting(e)}
                      className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-danger"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              )
            })}

            {!isLoading && rows.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-muted">
                Nenhuma despesa encontrada para “{query}”.
              </div>
            )}
          </div>

          {!isLoading && filtered.length > 0 && (
            <div className="flex items-center justify-between border-t border-rule px-4 py-3 text-sm text-muted">
              <span>
                Mostrando {current * pageSize + 1}–{current * pageSize + rows.length} de{' '}
                {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
              </span>
              {pageCount > 1 && (
                <div className="flex items-center gap-2">
                  <span className="hidden font-mono text-xs text-faint sm:inline">
                    Página {current + 1} de {pageCount}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label="Página anterior"
                      disabled={current === 0}
                      onClick={() => setPage(current - 1)}
                      className="grid size-8 place-items-center rounded-lg border border-rule transition disabled:opacity-40 enabled:hover:bg-surface-2"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Próxima página"
                      disabled={current >= pageCount - 1}
                      onClick={() => setPage(current + 1)}
                      className="grid size-8 place-items-center rounded-lg border border-rule transition disabled:opacity-40 enabled:hover:bg-surface-2"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </>
      )}

      <ExpenseFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
      />

      {/* Delete — offers single vs whole group for installments */}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Excluir despesa"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)} disabled={deletingLoading}>
              Cancelar
            </Button>
            {deleting?.installment_group ? (
              <>
                <Button variant="secondary" onClick={() => doDelete('single')} loading={del.isPending}>
                  Só esta parcela
                </Button>
                <Button variant="danger" onClick={() => doDelete('group')} loading={delGroup.isPending}>
                  Todas as {deleting.installment_count} parcelas
                </Button>
              </>
            ) : (
              <Button variant="danger" onClick={() => doDelete('single')} loading={del.isPending}>
                Excluir
              </Button>
            )}
          </>
        }
      >
        <p className="text-sm text-ink/75">
          {deleting?.installment_group
            ? `"${deleting?.description}" faz parte de um parcelamento (${deleting?.installment_index}/${deleting?.installment_count}). Excluir só esta parcela ou todas?`
            : `Excluir "${deleting?.description}"? Essa ação não pode ser desfeita.`}
        </p>
      </Modal>
    </div>
  )
}
