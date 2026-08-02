import { useMemo, useState } from 'react'
import { CheckCircle2, Pencil, Plus, Target, Trash2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { GoalFormModal } from './GoalFormModal'
import { ContributionModal } from './ContributionModal'
import { useGoals, useContributions, useDeleteGoal } from '@/hooks/useGoals'
import { useToast } from '@/contexts/ToastContext'
import { formatBRL } from '@/lib/money'
import { formatDisplayDate } from '@/lib/dates'
import { DEFAULT_COLOR } from '@/lib/palette'
import { goalIcon } from '@/lib/goalIcons'
import type { Goal } from '@/types/domain'

function GoalCard({
  goal,
  accumulated,
  onEdit,
  onDelete,
  onContribute,
}: {
  goal: Goal
  accumulated: number
  onEdit: () => void
  onDelete: () => void
  onContribute: () => void
}) {
  const color = goal.color ?? DEFAULT_COLOR
  const Icon = goalIcon(goal.icon)
  const pct = goal.target_cents > 0
    ? Math.min(100, (accumulated / goal.target_cents) * 100)
    : 0
  const remaining = Math.max(0, goal.target_cents - accumulated)
  const done = accumulated >= goal.target_cents && goal.target_cents > 0

  return (
    <div className="rounded-2xl border border-rule bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-xl"
            style={{ background: `${color}22`, color }}
          >
            <Icon className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-semibold">{goal.name}</span>
              {done && (
                <CheckCircle2 className="size-4 shrink-0 text-positive" />
              )}
            </div>
            {goal.due_date && (
              <div className="font-mono text-[11px] text-muted">
                até {formatDisplayDate(goal.due_date)}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Editar meta"
            onClick={onEdit}
            className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Excluir meta"
            onClick={onDelete}
            className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-danger"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div className="font-display text-2xl font-bold tnum">
          {formatBRL(accumulated)}
        </div>
        <div className="text-sm text-muted tnum">
          de {formatBRL(goal.target_cents)}
        </div>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/8">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: done ? 'var(--color-positive)' : color }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted">
        <span>{pct.toFixed(0)}% concluído</span>
        <span>{done ? 'Meta alcançada 🎉' : `Faltam ${formatBRL(remaining)}`}</span>
      </div>

      <Button
        variant="secondary"
        size="sm"
        className="mt-4 w-full"
        icon={<Wallet className="size-4" />}
        onClick={onContribute}
      >
        Aportar
      </Button>
    </div>
  )
}

export function MetasPage() {
  const { data: goals, isLoading } = useGoals()
  const { data: contributions } = useContributions()
  const del = useDeleteGoal()
  const { toast } = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [deleting, setDeleting] = useState<Goal | null>(null)
  const [contributing, setContributing] = useState<Goal | null>(null)

  const accumulatedByGoal = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of contributions ?? []) {
      map.set(c.goal_id, (map.get(c.goal_id) ?? 0) + c.amount_cents)
    }
    return map
  }, [contributions])

  async function confirmDelete() {
    if (!deleting) return
    try {
      await del.mutateAsync(deleting.id)
      toast('Meta excluída.')
      setDeleting(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível excluir.', 'error')
    }
  }

  const isEmpty = !isLoading && (goals?.length ?? 0) === 0

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex items-center justify-end">
        {!isEmpty && (
          <Button
            icon={<Plus className="size-4" strokeWidth={2.5} />}
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            Nova meta
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      )}

      {isEmpty && (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-brand">
            <Target className="size-7" strokeWidth={1.75} />
          </span>
          <h2 className="font-display text-xl font-bold">Dê um destino ao seu dinheiro</h2>
          <p className="text-sm text-muted">
            Reserva, viagem, um sonho: crie uma meta e acompanhe cada aporte
            aproximar você dela.
          </p>
          <Button
            icon={<Plus className="size-4" strokeWidth={2.5} />}
            onClick={() => setFormOpen(true)}
          >
            Criar primeira meta
          </Button>
        </div>
      )}

      {goals && goals.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              accumulated={accumulatedByGoal.get(g.id) ?? 0}
              onEdit={() => {
                setEditing(g)
                setFormOpen(true)
              }}
              onDelete={() => setDeleting(g)}
              onContribute={() => setContributing(g)}
            />
          ))}
        </div>
      )}

      <GoalFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
      />
      <ContributionModal
        open={!!contributing}
        onClose={() => setContributing(null)}
        goal={contributing}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Excluir meta"
        message={`Excluir "${deleting?.name}"? Os aportes registrados também serão removidos.`}
        loading={del.isPending}
      />
    </div>
  )
}
