import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/utils/cn'

export type FilterOption = { value: string; label: string; color?: string }
export type FilterGroup = { key: string; label: string; options: FilterOption[] }
export type FilterValue = Record<string, string[]>

/**
 * Reusable multi-select filter bar (spec Part 3.3). One button per group with a
 * count when active, a checkbox dropdown, and removable chips below. Selecting
 * multiple options within a group is OR; across groups is AND. Single shared
 * component — never duplicate this per page.
 */
export function FilterBar({
  groups,
  value,
  onChange,
}: {
  groups: FilterGroup[]
  value: FilterValue
  onChange: (next: FilterValue) => void
}) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!openKey) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenKey(null)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [openKey])

  function toggle(groupKey: string, optValue: string) {
    const cur = value[groupKey] ?? []
    const next = cur.includes(optValue)
      ? cur.filter((v) => v !== optValue)
      : [...cur, optValue]
    onChange({ ...value, [groupKey]: next })
  }

  function clearGroup(groupKey: string) {
    onChange({ ...value, [groupKey]: [] })
  }

  const activeCount = groups.reduce(
    (n, g) => n + (value[g.key]?.length ?? 0),
    0,
  )

  const chips = groups.flatMap((g) =>
    (value[g.key] ?? []).map((v) => ({
      groupKey: g.key,
      value: v,
      label: g.options.find((o) => o.value === v)?.label ?? v,
      color: g.options.find((o) => o.value === v)?.color,
    })),
  )

  return (
    <div ref={ref} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {groups.map((g) => {
          const count = value[g.key]?.length ?? 0
          const active = count > 0
          const open = openKey === g.key
          return (
            <div key={g.key} className="relative">
              <button
                type="button"
                onClick={() => setOpenKey(open ? null : g.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition',
                  active
                    ? 'border-brand/50 bg-brand/10 text-brand'
                    : 'border-rule text-ink/70 hover:bg-surface-2',
                )}
              >
                {g.label}
                {active && (
                  <span className="grid size-4 place-items-center rounded-full bg-brand text-[10px] font-bold text-on-brand">
                    {count}
                  </span>
                )}
                <ChevronDown className="size-3.5 opacity-60" />
              </button>

              {open && (
                <div className="animate-pop absolute left-0 top-10 z-30 w-56 origin-top overflow-hidden rounded-xl border border-rule bg-surface shadow-2xl">
                  {active && (
                    <button
                      type="button"
                      onClick={() => clearGroup(g.key)}
                      className="w-full border-b border-rule px-3 py-2 text-left text-xs text-muted hover:bg-surface-2"
                    >
                      Limpar seleção
                    </button>
                  )}
                  <div className="max-h-64 overflow-y-auto py-1">
                    {g.options.length === 0 && (
                      <div className="px-3 py-2 text-xs text-faint">
                        Nada para filtrar.
                      </div>
                    )}
                    {g.options.map((o) => {
                      const checked = (value[g.key] ?? []).includes(o.value)
                      return (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => toggle(g.key, o.value)}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface-2"
                        >
                          <span
                            className={cn(
                              'grid size-4 shrink-0 place-items-center rounded border',
                              checked
                                ? 'border-brand bg-brand text-on-brand'
                                : 'border-ink/25',
                            )}
                          >
                            {checked && <Check className="size-3" strokeWidth={3} />}
                          </span>
                          {o.color && (
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ background: o.color }}
                            />
                          )}
                          <span className="truncate text-ink/80">{o.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <span
              key={`${c.groupKey}:${c.value}`}
              className="flex items-center gap-1 rounded-full bg-surface-2 py-1 pl-2.5 pr-1 text-xs text-ink/75"
            >
              {c.color && (
                <span className="size-1.5 rounded-full" style={{ background: c.color }} />
              )}
              {c.label}
              <button
                type="button"
                aria-label={`Remover ${c.label}`}
                onClick={() => toggle(c.groupKey, c.value)}
                className="grid size-4 place-items-center rounded-full hover:bg-ink/10"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          {activeCount > 1 && (
            <button
              type="button"
              onClick={() => onChange({})}
              className="ml-1 text-xs text-muted underline hover:text-ink"
            >
              Limpar tudo
            </button>
          )}
        </div>
      )}
    </div>
  )
}
