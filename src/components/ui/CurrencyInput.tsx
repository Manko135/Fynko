import { useId } from 'react'
import { centsToReais } from '@/lib/money'
import { cn } from '@/utils/cn'

/**
 * Currency field that holds integer cents. The user types digits and they fill
 * in from the right (like a bank terminal): typing 1 2 0 0 → R$ 12,00.
 */
export function CurrencyInput({
  value,
  onChange,
  label,
  id,
  allowNegative = false,
}: {
  value: number // cents
  onChange: (cents: number) => void
  label?: string
  id?: string
  allowNegative?: boolean
}) {
  const autoId = useId()
  const inputId = id ?? autoId

  const display = centsToReais(Math.abs(value)).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, '')
    const cents = digits ? parseInt(digits, 10) : 0
    onChange(value < 0 || (allowNegative && raw.includes('-')) ? -cents : cents)
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink/75">
          {label}
        </label>
      )}
      <div
        className={cn(
          'flex items-center rounded-xl border border-rule bg-surface-2 px-3',
          'focus-within:border-brand',
        )}
      >
        <span className="mr-1 text-muted">R$</span>
        <input
          id={inputId}
          inputMode="numeric"
          value={display}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full bg-transparent py-2.5 text-right font-mono tabular-nums text-ink outline-none"
        />
      </div>
    </div>
  )
}
