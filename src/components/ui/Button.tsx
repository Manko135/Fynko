import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100 focus-visible:outline-2'

const variants: Record<Variant, string> = {
  // Gold primary (money) with dark ink — the signature action.
  primary: 'bg-brand-solid text-on-brand hover:bg-brand-strong',
  secondary: 'border border-rule bg-surface text-ink/85 hover:bg-surface-2',
  ghost: 'text-ink/75 hover:bg-surface-2',
  danger: 'bg-danger text-white hover:opacity-90',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        icon
      )}
      {children}
    </button>
  )
}
