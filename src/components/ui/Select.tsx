import { useId, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

type Option = { value: string; label: string }

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
  label?: string
  options: Option[]
  placeholder?: string
}

export function Select({
  label,
  options,
  placeholder,
  id,
  className,
  ...rest
}: SelectProps) {
  const autoId = useId()
  const selectId = id ?? autoId
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-ink/75">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            'w-full appearance-none rounded-xl border border-rule bg-surface-2 px-3 py-2.5 pr-9 text-ink outline-none transition focus:border-brand',
            className,
          )}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
      </div>
    </div>
  )
}
