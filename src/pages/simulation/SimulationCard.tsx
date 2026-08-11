import { Copy, Eye, Pencil, Receipt, Trash2 } from 'lucide-react'
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
    { label: 'Ver informações', icon: Eye, onClick: onOpen },
    { label: 'Editar', icon: Pencil, onClick: onEdit },
    { label: 'Duplicar', icon: Copy, onClick: onDuplicate },
    ...(sim.converted_at ? [] : [{ label: 'Transformar em despesa', icon: Receipt, onClick: onConvert }]),
    { label: 'Excluir', icon: Trash2, onClick: onDelete, danger: true },
  ]

  return (
    <div className="group flex flex-col rounded-2xl border border-rule bg-surface p-6 shadow-sm transition-colors duration-200 hover:border-brand/40">
      <div className="flex items-start gap-4">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-2xl text-2xl"
          style={{ background: 'color-mix(in oklab, var(--color-brand) 14%, transparent)' }}
        >
          {sim.icon ?? '🎉'}
        </span>
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="truncate font-display text-lg font-bold">{sim.name}</span>
            {sim.converted_at && (
              <span className="shrink-0 rounded-full bg-positive/12 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-positive">
                Convertida
              </span>
            )}
          </div>
          <div className="mt-0.5 font-mono text-xs text-muted">{formatDisplayDate(sim.target_date)}</div>
        </button>
        <RowMenu items={menu} />
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Total do gasto</div>
          <div className="mt-1 font-display text-2xl font-bold tnum">{formatBRL(total)}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Saldo após</div>
          <div className={cn('mt-1 font-display text-2xl font-bold tnum', meta.text)}>{formatBRL(after)}</div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 border-t border-rule pt-4">
        <span className={cn('size-2 rounded-full', meta.dot)} />
        <span className={cn('text-sm font-medium', meta.text)}>{meta.label}</span>
        <span className="ml-auto font-mono text-[10px] text-faint">
          criada {formatDisplayDate(sim.created_at.slice(0, 10))}
        </span>
      </div>
    </div>
  )
}
