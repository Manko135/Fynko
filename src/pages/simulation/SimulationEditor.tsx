import { useMemo, useState } from 'react'
import { ArrowLeft, Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { Select } from '@/components/ui/Select'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { FilterBar, type FilterValue } from '@/components/ui/FilterBar'
import { ProjectionPanel } from './ProjectionPanel'
import { EmojiPicker } from './EmojiPicker'
import { useProjection } from '@/hooks/useProjection'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import { useCards } from '@/hooks/useCards'
import { useCreateSimulation, useUpdateSimulation } from '@/hooks/useSimulations'
import { useToast } from '@/contexts/ToastContext'
import { formatBRL } from '@/lib/money'
import { todayISO } from '@/lib/dates'
import { cn } from '@/utils/cn'
import type { ProjectionFilter, ProjectionKind } from '@/lib/finance/projection'
import type { Simulation, SimulationItem } from '@/types/domain'

const KIND_TABS: { value: 'todos' | ProjectionKind; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'receita', label: 'Receitas' },
  { value: 'despesa', label: 'Despesas' },
  { value: 'assinatura', label: 'Assinaturas' },
  { value: 'parcela', label: 'Parcelas' },
]

const emptyItem: SimulationItem = {
  description: '', amount_cents: 0, category_id: null, icon: '💸', notes: null,
}

export function SimulationEditor({
  editing,
  onDone,
  onCancel,
}: {
  editing: Simulation | null
  onDone: () => void
  onCancel: () => void
}) {
  const { toast } = useToast()
  const { project } = useProjection()
  const { data: categories } = useCategories('expense')
  const { data: accounts } = useAccounts()
  const { data: cards } = useCards()
  const create = useCreateSimulation()
  const update = useUpdateSimulation()

  const [name, setName] = useState(editing?.name ?? '')
  const [icon, setIcon] = useState(editing?.icon ?? '🎉')
  const [targetDate, setTargetDate] = useState(editing?.target_date ?? todayISO())
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [items, setItems] = useState<SimulationItem[]>(editing?.items ?? [])

  const [draft, setDraft] = useState<SimulationItem>(emptyItem)
  const [editIdx, setEditIdx] = useState<number | null>(null)

  const [kind, setKind] = useState<'todos' | ProjectionKind>('todos')
  const [filters, setFilters] = useState<FilterValue>({})

  const catName = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories])

  const filter = useMemo<ProjectionFilter>(() => ({
    accountIds: filters.account,
    cardIds: filters.card,
    categoryIds: filters.category,
    kinds: kind === 'todos' ? undefined : [kind],
  }), [filters, kind])

  const projection = useMemo(() => project(targetDate, filter), [project, targetDate, filter])
  const simTotal = items.reduce((s, i) => s + i.amount_cents, 0)

  const filterGroups = useMemo(() => [
    { key: 'account', label: 'Conta', options: (accounts ?? []).map((a) => ({ value: a.id, label: a.name })) },
    { key: 'card', label: 'Cartão', options: (cards ?? []).map((c) => ({ value: c.id, label: c.name })) },
    { key: 'category', label: 'Categoria', options: (categories ?? []).map((c) => ({ value: c.id, label: c.name, color: c.color ?? undefined })) },
  ], [accounts, cards, categories])

  function commitDraft() {
    if (!draft.description.trim() || draft.amount_cents <= 0) {
      toast('Dê um nome e um valor ao gasto.', 'error')
      return
    }
    setItems((prev) => {
      if (editIdx === null) return [...prev, draft]
      const copy = [...prev]
      copy[editIdx] = draft
      return copy
    })
    setDraft(emptyItem)
    setEditIdx(null)
  }

  function editItem(idx: number) {
    setDraft(items[idx])
    setEditIdx(idx)
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
    if (editIdx === idx) {
      setDraft(emptyItem)
      setEditIdx(null)
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      toast('Dê um nome à simulação.', 'error')
      return
    }
    const input = { name: name.trim(), icon, target_date: targetDate, items, notes: notes.trim() || null }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch: input })
        toast('Simulação atualizada.')
      } else {
        await create.mutateAsync(input)
        toast('Simulação salva.')
      }
      onDone()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível salvar.', 'error')
    }
  }

  const saving = create.isPending || update.isPending
  const catOptions = (categories ?? []).map((c) => ({ value: c.id, label: c.name }))

  return (
    <div className="mx-auto max-w-6xl">
      {/* Barra de ações */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Voltar
        </button>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>{editing ? 'Salvar' : 'Salvar simulação'}</Button>
        </div>
      </div>

      <h1 className="mb-6 font-display text-2xl font-bold tracking-tight">
        {editing ? 'Editar simulação' : 'Nova simulação'}
      </h1>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Coluna: definição */}
        <div className="flex flex-col gap-6">
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink/75">Ícone</span>
              <EmojiPicker value={icon} onChange={setIcon} />
            </div>
            <div className="flex-1">
              <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Festa de Agosto" />
            </div>
          </div>

          <TextField
            label="Data do gasto"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            hint="A previsão considera tudo que ocorre até essa data."
          />

          {/* Gastos */}
          <div className="rounded-2xl border border-rule bg-surface p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-base font-semibold">Gastos da simulação</span>
              <span className="font-mono text-lg font-bold tnum text-ink">{formatBRL(simTotal)}</span>
            </div>

            {items.length > 0 && (
              <ul className="mb-4 flex flex-col gap-2">
                {items.map((it, idx) => {
                  const cat = it.category_id ? catName.get(it.category_id) : null
                  return (
                    <li key={idx} className="flex items-center gap-3 rounded-xl bg-surface-2/60 px-3.5 py-3">
                      <span className="text-lg">{it.icon ?? '💸'}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-ink">{it.description}</div>
                        {cat && (
                          <div className="flex items-center gap-1.5 text-xs text-muted">
                            <span className="size-1.5 rounded-full" style={{ background: cat.color ?? 'var(--color-brand)' }} />
                            {cat.name}
                          </div>
                        )}
                      </div>
                      <span className="font-mono text-sm tnum text-ink/85">{formatBRL(it.amount_cents)}</span>
                      <button type="button" aria-label="Editar" onClick={() => editItem(idx)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink">
                        <Pencil className="size-4" />
                      </button>
                      <button type="button" aria-label="Remover" onClick={() => removeItem(idx)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-danger">
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {/* Form do item */}
            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-rule p-4">
              <div className="flex items-end gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ink/75">Ícone</span>
                  <EmojiPicker value={draft.icon ?? '💸'} onChange={(v) => setDraft((d) => ({ ...d, icon: v }))} />
                </div>
                <div className="flex-1">
                  <TextField label="Nome do gasto" value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} placeholder="Ex: Bebidas" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <CurrencyInput label="Valor" value={draft.amount_cents} onChange={(v) => setDraft((d) => ({ ...d, amount_cents: v }))} />
                <Select
                  label="Categoria"
                  placeholder="Selecione"
                  options={catOptions}
                  value={draft.category_id ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, category_id: e.target.value || null }))}
                />
              </div>
              <TextField label="Observação" value={draft.notes ?? ''} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value || null }))} placeholder="Opcional" />
              <Button variant="secondary" className="w-full" icon={editIdx === null ? <Plus className="size-4" /> : <Check className="size-4" />} onClick={commitDraft}>
                {editIdx === null ? 'Adicionar gasto' : 'Salvar gasto'}
              </Button>
            </div>
          </div>

          <TextField label="Observação da simulação" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
        </div>

        {/* Coluna: previsão ao vivo */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1 rounded-xl border border-rule bg-surface-2 p-1">
              {KIND_TABS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setKind(t.value)}
                  className={cn(
                    'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition',
                    kind === t.value ? 'bg-brand-solid text-on-brand' : 'text-ink/65 hover:text-ink',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <FilterBar groups={filterGroups} value={filters} onChange={setFilters} />
          </div>

          <ProjectionPanel projection={projection} target={targetDate} simTotalCents={simTotal} />
        </div>
      </div>
    </div>
  )
}
