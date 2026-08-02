import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/utils/cn'
import logoColor from '@/assets/brand/logo-fynko-color.png'
import logoWhite from '@/assets/brand/logo-fynko-white.png'
import owlMark from '@/assets/brand/owl-mark.png'

// `block max-w-full` keeps the image from being stretched when it happens to be
// a direct flex child (align-items: stretch would otherwise blow it up).
const base = 'block max-w-full self-start'

type LogoProps = {
  /**
   * Force a variant regardless of theme. Use `white` on any fixed colored
   * surface that does not change with the theme (the login gradient panel).
   * Omit to let it follow the active theme.
   */
  variant?: 'auto' | 'white' | 'color'
  /** Show only the owl mascot (no wordmark). */
  markOnly?: boolean
  className?: string
}

/**
 * Fynko logo. The wordmark "Fyn" is nearly black in the source art (~1.07:1 on
 * dark), so on dark surfaces we serve a version where the wordmark is remapped
 * to white while the owl keeps its colors. This component picks the right file
 * automatically from the active theme — except when `variant` forces one.
 */
export function Logo({
  variant = 'auto',
  markOnly = false,
  className,
}: LogoProps) {
  const { theme } = useTheme()

  if (markOnly) {
    return <img src={owlMark} alt="Fynko" className={cn(base, className)} />
  }

  const src =
    variant === 'white'
      ? logoWhite
      : variant === 'color'
        ? logoColor
        : theme === 'dark'
          ? logoWhite
          : logoColor

  return (
    <img
      src={src}
      alt="Fynko"
      className={cn(base, className)}
      draggable={false}
    />
  )
}
