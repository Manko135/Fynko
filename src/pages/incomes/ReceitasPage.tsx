import { useMemo, useState } from 'react'
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  Paperclip,
  Pencil,
  Plus,
  Search,
  TrendingUp,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FilterBar, type FilterValue } from '@/components/ui/FilterBar'
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu'
import { SortHeader, type SortDir } from '@/components/ui/SortHeader'
import { DetailsModal, type DetailRow } from '@/components/records/DetailsModal'
import { AttachModal } from '@/components/records/AttachModal'
import { IncomeFormModal } from './IncomeFormModal'
import { useIncomes, useDeleteIncome, useUpdateIncome } from '@/hooks/useIncomes'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import { usePageSize } from '@/hooks/usePageSize'
import { useToast } from '@/contexts/ToastContext'
import { formatBRL } from '@/lib/money'
import { formatDisplayDate, todayISO } from '@/lib/dates'
import type { Income } from '@/types/domain'

type SortKey = 'descricao' | 'categoria' | 'valor'

export function ReceitasPage() {
  const { data: incomes, isLoading } = useIncomes()
  const { data: categories } = useCategories('income')
  const { data: accounts } = useAccounts()
  const del = useDeleteIncome()
  const update = useUpdateIncome()
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
  const [editing, setEditing] = useState<Income | null>(null)
  const [deleting, setDeleting] = useState<Income | null>(null)
  const [details, setDetails] = useState<Income | null>(null)
  const [attaching, setAttaching] = useState<Income | null>(null)

  const catMap = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories],
  )
  const accMap = useMemo(
    () => new Map((accounts ?? []).map((a) => [a.id, a])),
    [accounts],
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
        key: 'account',
        label: 'Conta',
        options: (accounts ?? []).map((a) => ({ value: a.id, label: a.name })),
      },
    ],
    [categories, accounts],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const cats = filters.category ?? []
    const accs = filters.account ?? []
    return (incomes ?? []).filter((r) => {
      if (dateFrom && r.date < dateFrom) return false
      if (dateTo && r.date > dateTo) return false
      if (cats.length && !(r.category_id && cats.includes(r.category_id))) return false
      if (accs.length && !(r.account_id && accs.includes(r.account_id))) return false
      if (!q) return true
      const cat = r.category_id ? catMap.get(r.category_id)?.name ?? '' : ''
      return (
        r.description.toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q)
      )
    })
  }, [incomes, query, filters, dateFrom, dateTo, catMap])

  const total = filtered.reduce((s, r) => s + r.amount_cents, 0)

  const sorted = useMemo(() => {
    if (!sort) return filtered
    const dir = sort.dir === 'asc' ? 1 : -1
    const catName = (id: string | null) => (id ? catMap.get(id)?.name ?? '' : '')
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sort.key === 'descricao') cmp = a.description.localeCompare(b.description, 'pt-BR')
      else if (sort.key === 'categoria') cmp = catName(a.category_id).localeCompare(catName(b.category_id), 'pt-BR')
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

  function openNew() {
    setEditing(null)
    setFormOpen(true)
  }
  async function confirmDelete() {
    if (!deleting) return
    try {
      await del.mutateAsync(deleting.id)
      toast('Receita excluída.')
      setDeleting(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível excluir.', 'error')
    }
  }
  async function markReceived(r: Income) {
    try {
      await update.mutateAsync({ id: r.id, patch: { date: today } })
      toast('Receita marcada como recebida.')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível atualizar.', 'error')
    }
  }

  function detailRows(r: Income): DetailRow[] {
    const cat = r.category_id ? catMap.get(r.category_id) : null
    const acc = r.account_id ? accMap.get(r.account_id) : null
    const list: DetailRow[] = [{ label: 'Descrição', value: r.description }]
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
    list.push({
      label: 'Valor',
      value: <span className="font-mono tnum text-positive">{formatBRL(r.amount_cents, { sign: true })}</span>,
    })
    list.push({ label: r.date > today ? 'Previsto para' : 'Recebido em', value: formatDisplayDate(r.date) })
    if (r.notes) list.push({ label: 'Observações', value: r.notes })
    list.push({ label: 'Criado em', value: formatDisplayDate(r.created_at.slice(0, 10)) })
    list.push({ label: 'Atualizado em', value: formatDisplayDate(r.updated_at.slice(0, 10)) })
    return list
  }

  function menuFor(r: Income): RowMenuItem[] {
    return [
      { label: 'Ver informações', icon: Eye, onClick: () => setDetails(r) },
      { label: 'Editar', icon: Pencil, onClick: () => { setEditing(r); setFormOpen(true) } },
      ...(r.date > today
        ? [{ label: 'Marcar como recebida', icon: CalendarCheck, onClick: () => markReceived(r) }]
        : []),
      { label: 'Anexar documentos', icon: Paperclip, onClick: () => setAttaching(r) },
      { label: 'Excluir', icon: Trash2, onClick: () => setDeleting(r), danger: true },
    ]
  }

  const isEmpty = !isLoading && (incomes?.length ?? 0) === 0

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 rounded-2xl border border-rule bg-surface px-5 py-3 shadow-sm">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-positive/12 text-positive">
            <TrendingUp className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
              Recebido no período
            </div>
            <div className="font-display text-2xl font-bold leading-tight tnum text-positive">
              {formatBRL(total)}
            </div>
          </div>
        </div>
        {!isEmpty && (
          <Button className="w-full sm:w-auto" icon={<Plus className="size-4" strokeWidth={2.5} />} onClick={openNew}>
            Nova receita
          </Button>
        )}
      </div>

      {isEmpty && (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-positive">
            <TrendingUp className="size-7" strokeWidth={1.75} />
          </span>
          <h2 className="font-display text-xl font-bold">Registre o que entra</h2>
          <p className="text-sm text-muted">
            Salário, freelance, vendas: cadastre suas receitas e veja o saldo das
            contas crescer.
          </p>
          <Button icon={<Plus className="size-4" strokeWidth={2.5} />} onClick={openNew}>
            Primeira receita
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
            <div className="hidden items-center gap-3 border-b border-rule px-4 py-2.5 sm:grid sm:grid-cols-[1.7fr_1fr_1fr_0.9fr_44px]">
              <SortHeader label="Descrição" active={sort?.key === 'descricao'} dir={sort?.dir} onClick={() => toggleSort('descricao')} />
              <SortHeader label="Categoria" active={sort?.key === 'categoria'} dir={sort?.dir} onClick={() => toggleSort('categoria')} />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">Conta</span>
              <SortHeader label="Valor" active={sort?.key === 'valor'} dir={sort?.dir} onClick={() => toggleSort('valor')} align="right" />
              <span className="sr-only">Ações</span>
            </div>

            <div className="divide-y divide-rule">
              {isLoading &&
                [0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse bg-surface-2/40" />
                ))}

              {rows.map((r) => {
                const cat = r.category_id ? catMap.get(r.category_id) : null
                const acc = r.account_id ? accMap.get(r.account_id) : null
                const menu = menuFor(r)
                const categoryCell = (
                  <span className="flex items-center gap-1.5 text-sm text-muted">
                    {cat && (
                      <span className="size-2 shrink-0 rounded-full" style={{ background: cat.color ?? 'var(--color-brand)' }} />
                    )}
                    <span className="truncate">{cat?.name ?? '—'}</span>
                  </span>
                )

                return (
                  <div key={r.id} className="px-4 transition-colors hover:bg-surface-2/60">
                    {/* Desktop */}
                    <div className="hidden items-center gap-3 py-3 sm:grid sm:grid-cols-[1.7fr_1fr_1fr_0.9fr_44px]">
                      <div className="min-w-0 truncate font-semibold text-ink">{r.description}</div>
                      <div className="min-w-0">{categoryCell}</div>
                      <div className="truncate text-sm text-muted">{acc?.name ?? '—'}</div>
                      <div className="text-right font-mono text-[15px] font-semibold tnum text-positive">
                        {formatBRL(r.amount_cents, { sign: true })}
                      </div>
                      <div className="flex justify-end"><RowMenu items={menu} /></div>
                    </div>

                    {/* Mobile */}
                    <div className="flex items-center gap-3 py-3 sm:hidden">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-ink">{r.description}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          {categoryCell}
                          <span className="font-mono text-[11px] text-faint">{formatDisplayDate(r.date)}</span>
                        </div>
                      </div>
                      <span className="font-mono text-[15px] font-semibold tnum text-positive">
                        {formatBRL(r.amount_cents, { sign: true })}
                      </span>
                      <RowMenu items={menu} />
                    </div>
                  </div>
                )
              })}

              {!isLoading && rows.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-muted">
                  Nenhuma receita encontrada para “{query}”.
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

      <IncomeFormModal open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />

      <DetailsModal
        open={!!details}
        onClose={() => setDetails(null)}
        title="Detalhes da receita"
        rows={details ? detailRows(details) : []}
        attachTarget={details ? { incomeId: details.id } : undefined}
      />

      <AttachModal
        open={!!attaching}
        onClose={() => setAttaching(null)}
        target={attaching ? { incomeId: attaching.id } : { incomeId: '' }}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Excluir receita"
        message={`Excluir "${deleting?.description}"? Essa ação não pode ser desfeita.`}
        loading={del.isPending}
      />
    </div>
  )
}
