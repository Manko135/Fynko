import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/utils/cn'

export type SortDir = 'asc' | 'desc'

/**
 * Clickable column header that toggles ascending/descending, like a spreadsheet.
 * Shows a neutral icon when inactive and a direction arrow when it's the active
 * sort column.
 */
export function SortHeader({
  label,
  active,
  dir,
  onClick,
  align = 'left',
}: {
  label: string
  active: boolean
  dir?: SortDir
  onClick: () => void
  align?: 'left' | 'right'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] transition hover:text-ink',
        active ? 'text-ink' : 'text-faint',
        align === 'right' && 'justify-end',
      )}
    >
      {label}
      {active ? (
        dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
      ) : (
        <ChevronsUpDown className="size-3 opacity-50" />
      )}
    </button>
  )
}
