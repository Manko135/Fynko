import type { ExpenseStatus } from '@/lib/finance/status'

const CONFIG: Record<
  ExpenseStatus,
  { label: string; className: string; dot: string }
> = {
  pago: { label: 'Pago', className: 'bg-positive/10 text-positive ring-positive/25', dot: 'bg-positive' },
  vencido: { label: 'Vencido', className: 'bg-danger/10 text-danger ring-danger/25', dot: 'bg-danger' },
  a_vencer: { label: 'A vencer', className: 'bg-warning/12 text-warning ring-warning/30', dot: 'bg-warning' },
  em_aberto: { label: 'Em aberto', className: 'bg-ink/6 text-muted ring-ink/10', dot: 'bg-muted' },
}

export function StatusBadge({ status }: { status: ExpenseStatus }) {
  const { label, className, dot } = CONFIG[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${className}`}
    >
      <span className={`size-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}
