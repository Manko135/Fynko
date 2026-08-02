import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  TrendingUp,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FilterBar, type FilterValue } from '@/components/ui/FilterBar'
import { IncomeFormModal } from './IncomeFormModal'
import { useIncomes, useDeleteIncome } from '@/hooks/useIncomes'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import { usePageSize } from '@/hooks/usePageSize'
import { useToast } from '@/contexts/ToastContext'
import { formatBRL } from '@/lib/money'
import { formatDisplayDate } from '@/lib/dates'
import type { Income } from '@/types/domain'

export function ReceitasPage() {
  const { data: incomes, isLoading } = useIncomes()
  const { data: categories } = useCategories('income')
  const { data: accounts } = useAccounts()
  const del = useDeleteIncome()
  const { toast } = useToast()
  const pageSize = usePageSize()

  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<FilterValue>({})
  const [page, setPage] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Income | null>(null)
  const [deleting, setDeleting] = useState<Income | null>(null)

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
      if (cats.length && !(r.category_id && cats.includes(r.category_id))) return false
      if (accs.length && !(r.account_id && accs.includes(r.account_id))) return false
      if (!q) return true
      const cat = r.category_id ? catMap.get(r.category_id)?.name ?? '' : ''
      return (
        r.description.toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q)
      )
    })
  }, [incomes, query, filters, catMap])

  const total = filtered.reduce((s, r) => s + r.amount_cents, 0)
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, pageCount - 1)
  const rows = filtered.slice(current * pageSize, current * pageSize + pageSize)

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

  const isEmpty = !isLoading && (incomes?.length ?? 0) === 0

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 rounded-2xl border border-rule bg-surface px-5 py-3 shadow-sm">
          <span className="grid size-10 place-items-center rounded-xl bg-positive/12 text-positive">
            <TrendingUp className="size-5" />
          </span>
          <div>
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
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(0)
              }}
              placeholder="Buscar por descrição ou categoria"
              className="w-full bg-transparent text-sm text-ink placeholder:text-faint outline-none"
            />
          </div>

          {/* header */}
          <div className="hidden grid-cols-[1.6fr_1fr_1fr_0.9fr_auto] gap-3 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-faint sm:grid">
            <span>Descrição</span>
            <span>Categoria</span>
            <span>Conta</span>
            <span className="text-right">Valor</span>
            <span className="w-16 text-right">Ações</span>
          </div>

          <div className="divide-y divide-rule">
            {isLoading &&
              [0, 1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse bg-surface-2/40" />
              ))}

            {rows.map((r) => {
              const cat = r.category_id ? catMap.get(r.category_id) : null
              const acc = r.account_id ? accMap.get(r.account_id) : null
              return (
                <div
                  key={r.id}
                  className="group grid grid-cols-2 items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-surface-2/60 sm:grid-cols-[1.6fr_1fr_1fr_0.9fr_auto]"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{r.description}</div>
                    <div className="font-mono text-[11px] text-faint sm:hidden">
                      {formatDisplayDate(r.date)}
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
                  <div className="hidden truncate text-sm text-muted sm:block">
                    {acc?.name ?? '—'}
                  </div>
                  <div className="col-span-2 text-right font-mono text-[15px] font-semibold tnum text-positive sm:col-span-1">
                    {formatBRL(r.amount_cents, { sign: true })}
                  </div>
                  <div className="col-span-2 mt-1.5 flex justify-end gap-1 border-t border-rule/60 pt-2 opacity-100 transition focus-within:opacity-100 sm:col-span-1 sm:mt-0 sm:border-0 sm:pt-0 sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                      type="button"
                      aria-label="Editar"
                      onClick={() => {
                        setEditing(r)
                        setFormOpen(true)
                      }}
                      className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Excluir"
                      onClick={() => setDeleting(r)}
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
                Nenhuma receita encontrada para “{query}”.
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

      <IncomeFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
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
