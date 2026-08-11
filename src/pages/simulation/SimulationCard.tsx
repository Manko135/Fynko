import { Copy, Pencil, Receipt, Trash2 } from 'lucide-react'
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu'
import { verdictOf, VERDICT_META } from './ProjectionPanel'
import { formatBRL } from '@/lib/money'
import { formatDisplayDate } from '@/lib/dates'
import { cn } from '@/utils/cn'
import type { Projection } from '@/lib/finance/projection'
import type { Simulation } from '@/types/domain'

export function SimulationCard({
  sim,
  projection,
  onOpen,
  onEdit,
  onDuplicate,
  onDelete,
  onConvert,
}: {
  sim: Simulation
  projection: Projection
  onOpen: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onConvert: () => void
}) {
  const total = sim.items.reduce((s, i) => s + i.amount_cents, 0)
  const before = projection.saldoPrevistoCents
  const after = before - total
  const meta = VERDICT_META[verdictOf(after, before)]

  const menu: RowMenuItem[] = [
    { label: 'Editar', icon: Pencil, onClick: onEdit },
    { label: 'Duplicar', icon: Copy, onClick: onDuplicate },
    ...(sim.converted_at ? [] : [{ label: 'Transformar em despesa', icon: Receipt, onClick: onConvert }]),
    { label: 'Excluir', icon: Trash2, onClick: onDelete, danger: true },
  ]

  return (
    <div className="group relative flex flex-col rounded-2xl border border-rule bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-xl text-xl"
          style={{ background: 'color-mix(in oklab, var(--color-brand) 14%, transparent)' }}
        >
          {sim.icon ?? '🎉'}
        </span>
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="truncate font-display text-base font-bold">{sim.name}</span>
            {sim.converted_at && (
              <span className="shrink-0 rounded-full bg-positive/12 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-positive">
                Convertida
              </span>
            )}
          </div>
          <div className="font-mono text-[11px] text-muted">📅 {formatDisplayDate(sim.target_date)}</div>
        </button>
        <RowMenu items={menu} />
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Total do gasto</div>
          <div className="font-display text-xl font-bold tnum">{formatBRL(total)}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Saldo após</div>
          <div className={cn('font-display text-xl font-bold tnum', meta.text)}>{formatBRL(after)}</div>
        </div>
      </div>

      <div className={cn('mt-3 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium', meta.text)}>
        <span className={cn('size-1.5 rounded-full', meta.dot)} />
        {meta.label}
        <span className="ml-auto font-mono text-[10px] text-faint">
          criada {formatDisplayDate(sim.created_at.slice(0, 10))}
        </span>
      </div>
    </div>
  )
}
