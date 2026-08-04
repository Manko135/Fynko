import { CalendarRange, X } from 'lucide-react'

/**
 * Compact "período" filter — a start and end date. Empty strings mean "no
 * bound", so the user can filter open-ended (only a start, or only an end).
 */
export function DateRangeFilter({
  from,
  to,
  onChange,
}: {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}) {
  const active = !!from || !!to
  const inputClass =
    'rounded-lg border border-rule bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none transition focus:border-brand'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-sm text-muted">
        <CalendarRange className="size-4" /> Período
      </span>
      <input
        type="date"
        aria-label="Data inicial"
        value={from}
        max={to || undefined}
        onChange={(e) => onChange(e.target.value, to)}
        className={inputClass}
      />
      <span className="text-sm text-muted">até</span>
      <input
        type="date"
        aria-label="Data final"
        value={to}
        min={from || undefined}
        onChange={(e) => onChange(from, e.target.value)}
        className={inputClass}
      />
      {active && (
        <button
          type="button"
          onClick={() => onChange('', '')}
          className="flex items-center gap-1 text-xs text-muted underline transition hover:text-ink"
        >
          <X className="size-3" /> Limpar
        </button>
      )}
    </div>
  )
}
