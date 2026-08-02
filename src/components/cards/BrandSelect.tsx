import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { CARD_BRANDS, cardBrandFor, cardBrandLogoUrl } from '@/lib/cardBrands'
import { cn } from '@/utils/cn'

/** Small logo chip for a network, falling back to its initial when unavailable. */
function BrandChip({ domain, label }: { domain: string; label: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span className="grid size-6 shrink-0 place-items-center rounded-md bg-surface-2 text-[10px] font-bold text-muted">
        {label.charAt(0)}
      </span>
    )
  }
  return (
    <span className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-md bg-white ring-1 ring-black/5">
      <img
        src={cardBrandLogoUrl(domain)}
        alt=""
        className="size-4 object-contain"
        onError={() => setFailed(true)}
        loading="lazy"
      />
    </span>
  )
}

/**
 * Bandeira picker: a custom dropdown that shows each card network's official
 * logo next to its name. Stores the brand's display name (e.g. "Visa"), so the
 * card face can resolve it back to a logo. A legacy free-text value is kept and
 * shown as-is until the user picks a known network.
 */
export function BrandSelect({
  value,
  onChange,
  label = 'Bandeira',
}: {
  value: string
  onChange: (v: string) => void
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = cardBrandFor(value)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  function pick(v: string) {
    onChange(v)
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink/75">{label}</span>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-2 rounded-xl border border-rule bg-surface-2 px-3 py-2.5 text-left transition focus:border-brand focus:outline-none"
        >
          {selected ? (
            <>
              <BrandChip domain={selected.domain} label={selected.label} />
              <span className="text-ink">{selected.label}</span>
            </>
          ) : value ? (
            <span className="text-ink">{value}</span>
          ) : (
            <span className="text-faint">Selecionar bandeira</span>
          )}
          <ChevronDown
            className={cn('ml-auto size-4 shrink-0 text-faint transition', open && 'rotate-180')}
          />
        </button>

        {open && (
          <div className="animate-pop absolute inset-x-0 top-[calc(100%+4px)] z-30 max-h-64 origin-top overflow-y-auto rounded-xl border border-rule bg-surface p-1 shadow-2xl">
            <button
              type="button"
              onClick={() => pick('')}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-muted transition hover:bg-surface-2"
            >
              <span className="size-6 shrink-0 rounded-md border border-dashed border-rule" />
              Nenhuma
            </button>
            {CARD_BRANDS.map((b) => {
              const active = selected?.key === b.key
              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => pick(b.label)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-surface-2',
                    active && 'bg-surface-2',
                  )}
                >
                  <BrandChip domain={b.domain} label={b.label} />
                  <span className="text-ink/85">{b.label}</span>
                  {active && <Check className="ml-auto size-4 text-brand" strokeWidth={2.5} />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
