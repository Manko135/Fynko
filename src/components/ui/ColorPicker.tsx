import { Check } from 'lucide-react'
import { PALETTE } from '@/lib/palette'
import { cn } from '@/utils/cn'

/**
 * Curated color picker used across categories, cards, accounts and goals.
 * Colors are grouped by family (one row each) so it reads as an organized
 * set. Single shared component — never copy this per form.
 */
export function ColorPicker({
  value,
  onChange,
  label = 'Cor',
}: {
  value: string | null
  onChange: (hex: string) => void
  label?: string
}) {
  const selected = value?.toUpperCase() ?? null
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-ink/75">{label}</span>
      <div className="flex flex-col gap-1.5">
        {PALETTE.map((family) => (
          <div key={family.name} className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[11px] text-faint">
              {family.name}
            </span>
            <div className="flex gap-1.5">
              {family.tones.map((hex) => {
                const isSelected = selected === hex.toUpperCase()
                return (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => onChange(hex)}
                    aria-label={`${family.name} ${hex}`}
                    aria-pressed={isSelected}
                    className={cn(
                      'grid size-7 place-items-center rounded-full ring-offset-2 ring-offset-surface transition',
                      isSelected ? 'ring-2 ring-ink' : 'hover:scale-110',
                    )}
                    style={{ background: hex }}
                  >
                    {isSelected && (
                      <Check className="size-3.5 text-white" strokeWidth={3} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
