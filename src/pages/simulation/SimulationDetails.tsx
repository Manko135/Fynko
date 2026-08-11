import { useMemo } from 'react'
import { ArrowLeft, Pencil, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ProjectionPanel } from './ProjectionPanel'
import { useProjection } from '@/hooks/useProjection'
import { useCategories } from '@/hooks/useCategories'
import { formatBRL } from '@/lib/money'
import { formatDisplayDate } from '@/lib/dates'
import type { Simulation } from '@/types/domain'

export function SimulationDetails({
  sim,
  onBack,
  onEdit,
  onConvert,
}: {
  sim: Simulation
  onBack: () => void
  onEdit: () => void
  onConvert: () => void
}) {
  const { project } = useProjection()
  const { data: categories } = useCategories('expense')
  const catName = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c])), [categories])

  const total = sim.items.reduce((s, i) => s + i.amount_cents, 0)
  const projection = useMemo(() => project(sim.target_date), [project, sim.target_date])

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Voltar
        </button>
        <div className="flex items-center gap-2">
          {!sim.converted_at && (
            <Button variant="secondary" icon={<Receipt className="size-4" />} onClick={onConvert}>
              Transformar em despesa
            </Button>
          )}
          <Button icon={<Pencil className="size-4" />} onClick={onEdit}>Editar</Button>
        </div>
      </div>

      {/* Cabeçalho */}
      <div className="mb-6 flex items-center gap-4">
        <span
          className="grid size-14 shrink-0 place-items-center rounded-2xl text-2xl"
          style={{ background: 'color-mix(in oklab, var(--color-brand) 14%, transparent)' }}
        >
          {sim.icon ?? '🎉'}
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight">{sim.name}</h1>
            {sim.converted_at && (
              <span className="rounded-full bg-positive/12 px-2 py-0.5 font-mono text-[10px] font-semibold text-positive">
                Convertida
              </span>
            )}
          </div>
          <div className="font-mono text-xs text-muted">
            Gasto em {formatDisplayDate(sim.target_date)} · criada {formatDisplayDate(sim.created_at.slice(0, 10))}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Coluna: itens e observações */}
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-rule bg-surface p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-base font-semibold">Gastos</span>
              <span className="font-mono text-lg font-bold tnum text-ink">{formatBRL(total)}</span>
            </div>
            {sim.items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Nenhum gasto adicionado.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {sim.items.map((it, idx) => {
                  const cat = it.category_id ? catName.get(it.category_id) : null
                  return (
                    <li key={idx} className="flex items-start gap-3 rounded-xl bg-surface-2/60 px-3.5 py-3">
                      <span className="text-lg">{it.icon ?? '💸'}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-ink">{it.description}</div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                          {cat && (
                            <span className="flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full" style={{ background: cat.color ?? 'var(--color-brand)' }} />
                              {cat.name}
                            </span>
                          )}
                          {it.notes && <span className="italic">“{it.notes}”</span>}
                        </div>
                      </div>
                      <span className="font-mono text-sm tnum text-ink/85">{formatBRL(it.amount_cents)}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {sim.notes && (
            <div className="rounded-2xl border border-rule bg-surface p-5 shadow-sm">
              <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Observação</div>
              <p className="whitespace-pre-wrap text-sm text-ink/85">{sim.notes}</p>
            </div>
          )}
        </div>

        {/* Coluna: previsão */}
        <ProjectionPanel projection={projection} target={sim.target_date} simTotalCents={total} />
      </div>
    </div>
  )
}
