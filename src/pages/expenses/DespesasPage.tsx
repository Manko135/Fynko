import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  Paperclip,
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
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu'
import { SortHeader, type SortDir } from '@/components/ui/SortHeader'
import { DetailsModal, type DetailRow } from '@/components/records/DetailsModal'
import { AttachModal } from '@/components/records/AttachModal'
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
import { expenseStatusOf, type ExpenseStatus } from '@/lib/finance/status'
import type { Expense } from '@/types/domain'

type SortKey = 'descricao' | 'categoria' | 'vencimento' | 'valor'

function SummaryCard({
  label,
  value,
  icon,
  iconClass,
  valueClass,
}: {
  label: string
  value: string
  icon: React.ReactNode
  iconClass: string
  valueClass: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-rule bg-surface px-5 py-3 shadow-sm">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${iconClass}`}>{icon}</span>
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">{label}</div>
        <div className={`font-display text-2xl font-bold leading-tight tnum ${valueClass}`}>{value}</div>
      </div>
    </div>
  )
}

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
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null)
  const [page, setPage] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState<Expense | null>(null)
  const [details, setDetails] = useState<Expense | null>(null)
  const [attaching, setAttaching] = useState<Expense | null>(null)

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
          { value: 'cartao', label: 'Cartão' },
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
      if (dateFrom && r.due_date < dateFrom) return false
      if (dateTo && r.due_date > dateTo) return false
      if (cats.length && !(r.category_id && cats.includes(r.category_id))) return false
      if (types.length && !types.includes(r.type)) return false
      if (accs.length && !(r.account_id && accs.includes(r.account_id))) return false
      if (cardsF.length && !(r.card_id && cardsF.includes(r.card_id))) return false
      if (status.length) {
        const st = expenseStatusOf(r, today)
        if (!status.includes(st)) return false
      }
      if (!q) return true
      const cat = r.category_id ? catMap.get(r.category_id)?.name ?? '' : ''
      return (
        r.description.toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q)
      )
    })
  }, [expenses, query, filters, dateFrom, dateTo, catMap, today])

  // Summary totals — always derived from the same filtered set as the list.
  // Card purchases (status 'cartao') aren't "a pagar" nor "vencido": they're
  // owed through the card invoice, tracked on the Cartões screen.
  const paid = filtered.reduce((s, e) => (e.payment_date ? s + e.amount_cents : s), 0)
  const vencido = filtered.reduce(
    (s, e) => (expenseStatusOf(e, today) === 'vencido' ? s + e.amount_cents : s),
    0,
  )
  const toPay = filtered.reduce((s, e) => {
    const st = expenseStatusOf(e, today)
    return st === 'a_vencer' || st === 'em_aberto' ? s + e.amount_cents : s
  }, 0)

  const sorted = useMemo(() => {
    if (!sort) return filtered
    const dir = sort.dir === 'asc' ? 1 : -1
    const catName = (id: string | null) => (id ? catMap.get(id)?.name ?? '' : '')
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sort.key === 'descricao') cmp = a.description.localeCompare(b.description, 'pt-BR')
      else if (sort.key === 'categoria') cmp = catName(a.category_id).localeCompare(catName(b.category_id), 'pt-BR')
      else if (sort.key === 'vencimento') cmp = a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0
      else if (sort.key === 'valor') cmp = a.amount_cents - b.amount_cents
      return cmp * dir
    })
  }, [filtered, sort, catMap])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const current = Math.min(page, pageCount - 1)
  const rows = sorted.slice(current * pageSize, current * pageSize + pageSize)

  function toggleSort(key: SortKey) {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
    setPage(0)
  }

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

  function detailRows(e: Expense): DetailRow[] {
    const cat = e.category_id ? catMap.get(e.category_id) : null
    const acc = e.account_id ? accMap.get(e.account_id) : null
    const card = e.card_id ? cardMap.get(e.card_id) : null
    const st = expenseStatusOf(e, today)
    const list: DetailRow[] = [
      {
        label: 'Descrição',
        value:
          e.description +
          (e.installment_count ? ` (${e.installment_index}/${e.installment_count})` : ''),
      },
    ]
    if (cat)
      list.push({
        label: 'Categoria',
        value: (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: cat.color ?? 'var(--color-brand)' }} />
            {cat.name}
          </span>
        ),
      })
    if (acc) list.push({ label: 'Conta', value: acc.name })
    if (card) list.push({ label: 'Cartão', value: card.name })
    list.push({ label: 'Valor', value: <span className="font-mono tnum">{formatBRL(e.amount_cents)}</span> })
    if (e.card_id && e.purchase_date)
      list.push({ label: 'Data da compra', value: formatDisplayDate(e.purchase_date) })
    list.push({
      label: e.card_id ? 'Vencimento da fatura' : 'Vencimento',
      value: formatDisplayDate(e.due_date),
    })
    if (e.payment_date) list.push({ label: 'Pagamento', value: formatDisplayDate(e.payment_date) })
    list.push({ label: 'Status', value: <StatusBadge status={st} /> })
    if (e.notes) list.push({ label: 'Observações', value: e.notes })
    list.push({ label: 'Criado em', value: formatDisplayDate(e.created_at.slice(0, 10)) })
    list.push({ label: 'Atualizado em', value: formatDisplayDate(e.updated_at.slice(0, 10)) })
    return list
  }

  function menuFor(e: Expense, status: ExpenseStatus): RowMenuItem[] {
    return [
      { label: 'Ver informações', icon: Eye, onClick: () => setDetails(e) },
      { label: 'Editar', icon: Pencil, onClick: () => { setEditing(e); setFormOpen(true) } },
      ...(status !== 'pago' && !e.card_id
        ? [{ label: 'Marcar como pago', icon: Check, onClick: () => quickPay(e) }]
        : []),
      { label: 'Anexar documentos', icon: Paperclip, onClick: () => setAttaching(e) },
      { label: 'Excluir', icon: Trash2, onClick: () => setDeleting(e), danger: true },
    ]
  }

  const isEmpty = !isLoading && (expenses?.length ?? 0) === 0
  const deletingLoading = del.isPending || delGroup.isPending

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
          <SummaryCard
            label="A pagar"
            value={formatBRL(toPay)}
            icon={<CalendarClock className="size-5" />}
            iconClass="bg-warning/15 text-warning"
            valueClass="text-warning"
          />
          <SummaryCard
            label="Vencido"
            value={formatBRL(vencido)}
            icon={<AlertTriangle className="size-5" />}
            iconClass="bg-danger/12 text-danger"
            valueClass="text-danger"
          />
          <SummaryCard
            label="Pago"
            value={formatBRL(paid)}
            icon={<CheckCircle2 className="size-5" />}
            iconClass="bg-positive/12 text-positive"
            valueClass="text-ink/80"
          />
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
          <div className="mb-4 flex flex-col gap-3">
            <FilterBar
              groups={filterGroups}
              value={filters}
              onChange={(v) => { setFilters(v); setPage(0) }}
            />
            <DateRangeFilter
              from={dateFrom}
              to={dateTo}
              onChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(0) }}
            />
          </div>
          <div className="overflow-hidden rounded-2xl border border-rule bg-surface">
            <div className="flex items-center gap-2 border-b border-rule px-4 py-3">
              <Search className="size-4 text-faint" />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(0) }}
                placeholder="Buscar por descrição ou categoria"
                className="w-full bg-transparent text-sm text-ink placeholder:text-faint outline-none"
              />
            </div>

            {/* Cabeçalho (desktop) */}
            <div className="hidden items-center gap-3 border-b border-rule px-4 py-2.5 sm:grid sm:grid-cols-[1.7fr_1fr_1fr_0.9fr_0.9fr_44px]">
              <SortHeader label="Descrição" active={sort?.key === 'descricao'} dir={sort?.dir} onClick={() => toggleSort('descricao')} />
              <SortHeader label="Categoria" active={sort?.key === 'categoria'} dir={sort?.dir} onClick={() => toggleSort('categoria')} />
              <SortHeader label="Vencimento" active={sort?.key === 'vencimento'} dir={sort?.dir} onClick={() => toggleSort('vencimento')} />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">Status</span>
              <SortHeader label="Valor" active={sort?.key === 'valor'} dir={sort?.dir} onClick={() => toggleSort('valor')} align="right" />
              <span className="sr-only">Ações</span>
            </div>

            <div className="divide-y divide-rule">
              {isLoading &&
                [0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse bg-surface-2/40" />
                ))}

              {rows.map((e) => {
                const cat = e.category_id ? catMap.get(e.category_id) : null
                const source = e.card_id
                  ? cardMap.get(e.card_id)?.name
                  : e.account_id
                    ? accMap.get(e.account_id)?.name
                    : null
                const status = expenseStatusOf(e, today)
                const menu = menuFor(e, status)
                const title = (
                  <span className="flex items-center gap-1.5">
                    <span className="truncate font-semibold text-ink">{e.description}</span>
                    {e.installment_count && (
                      <span className="shrink-0 rounded bg-ink/8 px-1 font-mono text-[10px] text-muted">
                        {e.installment_index}/{e.installment_count}
                      </span>
                    )}
                  </span>
                )
                const sourceLine = (
                  <span className="flex items-center gap-1 font-mono text-[11px] text-muted">
                    {e.card_id ? <CreditCard className="size-3" /> : <Wallet className="size-3" />}
                    {source ?? '—'}
                  </span>
                )
                const categoryCell = (
                  <span className="flex items-center gap-1.5 text-sm text-muted">
                    {cat && (
                      <span className="size-2 shrink-0 rounded-full" style={{ background: cat.color ?? 'var(--color-brand)' }} />
                    )}
                    <span className="truncate">{cat?.name ?? '—'}</span>
                  </span>
                )

                return (
                  <div key={e.id} className="px-4 transition-colors hover:bg-surface-2/60">
                    {/* Desktop */}
                    <div className="hidden items-center gap-3 py-3 sm:grid sm:grid-cols-[1.7fr_1fr_1fr_0.9fr_0.9fr_44px]">
                      <div className="min-w-0">
                        {title}
                        <div className="mt-0.5">{sourceLine}</div>
                      </div>
                      <div className="min-w-0">{categoryCell}</div>
                      <div className="font-mono text-xs text-faint">
                        {formatDisplayDate(e.due_date)}
                        {e.card_id && e.purchase_date && (
                          <span className="block text-[10px] text-faint/80">
                            Compra {formatDisplayDate(e.purchase_date)}
                          </span>
                        )}
                      </div>
                      <div><StatusBadge status={status} /></div>
                      <div className="text-right font-mono text-[15px] font-semibold tnum text-ink">{formatBRL(e.amount_cents)}</div>
                      <div className="flex justify-end"><RowMenu items={menu} /></div>
                    </div>

                    {/* Mobile */}
                    <div className="flex items-center gap-3 py-3 sm:hidden">
                      <div className="min-w-0 flex-1">
                        {title}
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          {categoryCell}
                          <span className="font-mono text-[11px] text-faint">
                            {formatDisplayDate(e.due_date)}
                            {e.card_id && e.purchase_date && ` · compra ${formatDisplayDate(e.purchase_date)}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-mono text-[15px] font-semibold tnum text-ink">{formatBRL(e.amount_cents)}</span>
                        <StatusBadge status={status} />
                      </div>
                      <RowMenu items={menu} />
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

            {!isLoading && sorted.length > 0 && (
              <div className="flex items-center justify-between border-t border-rule px-4 py-3 text-sm text-muted">
                <span>
                  Mostrando {current * pageSize + 1}–{current * pageSize + rows.length} de{' '}
                  {sorted.length} registro{sorted.length !== 1 ? 's' : ''}
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

      <DetailsModal
        open={!!details}
        onClose={() => setDetails(null)}
        title="Detalhes da despesa"
        rows={details ? detailRows(details) : []}
        attachTarget={details ? { expenseId: details.id } : undefined}
      />

      <AttachModal
        open={!!attaching}
        onClose={() => setAttaching(null)}
        target={attaching ? { expenseId: attaching.id } : { expenseId: '' }}
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
