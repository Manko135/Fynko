import type { LucideIcon } from 'lucide-react'

/**
 * Temporary content for routes not yet built. Each phase replaces these with
 * the real module. Kept intentionally plain — it's scaffolding, not a design.
 */
export function PagePlaceholder({
  title,
  icon: Icon,
  phase,
}: {
  title: string
  icon: LucideIcon
  phase: string
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-brand">
        <Icon className="size-7" strokeWidth={1.75} />
      </span>
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="text-sm text-muted">
        Este módulo entra na {phase}. A base do app (tema, navegação e marca) já
        está pronta.
      </p>
    </div>
  )
}
