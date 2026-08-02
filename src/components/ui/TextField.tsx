import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { cn } from '@/utils/cn'

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  error?: string
  leftIcon?: ReactNode
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    { label, hint, error, leftIcon, className, id, ...rest },
    ref,
  ) {
    const autoId = useId()
    const inputId = id ?? autoId

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-ink/75"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            className={cn(
              'w-full rounded-xl border bg-surface-2 px-3 py-2.5 text-ink placeholder:text-faint transition focus:outline-none',
              leftIcon ? 'pl-10' : undefined,
              error
                ? 'border-danger focus:border-danger'
                : 'border-rule focus:border-brand',
              className,
            )}
            {...rest}
          />
        </div>
        {error ? (
          <p className="text-xs text-danger">{error}</p>
        ) : hint ? (
          <p className="text-xs text-muted">{hint}</p>
        ) : null}
      </div>
    )
  },
)
