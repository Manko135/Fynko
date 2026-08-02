import { useMemo } from 'react'
import { useExpenses } from '@/hooks/useExpenses'
import { useGoals, useContributions } from '@/hooks/useGoals'
import { useBudgetUsage } from '@/hooks/useBudgets'
import { useCategories } from '@/hooks/useCategories'
import { useCards } from '@/hooks/useCards'
import { urgencyBucket, type UrgencyBucket } from '@/lib/finance/status'
import { todayISO } from '@/lib/dates'

export type Alert = {
  /** Stable key that CHANGES when urgency changes, so a re-escalated item
   *  reappears as unread (spec). */
  key: string
  kind: NonNullable<UrgencyBucket> | 'meta' | 'budget'
  title: string
  subtitle: string
  path: string
  amountCents?: number
  /** Sort weight — most urgent first. */
  weight: number
}

const BUCKET_META: Record<
  NonNullable<UrgencyBucket>,
  { label: string; weight: number }
> = {
  vencida: { label: 'Vencida', weight: 0 },
  vence_hoje: { label: 'Vence hoje', weight: 1 },
  vence_3_dias: { label: 'Vence em até 3 dias', weight: 2 },
  vence_7_dias: { label: 'Vence em até 7 dias', weight: 3 },
}

export function useAlerts(): Alert[] {
  const { data: expenses } = useExpenses()
  const { data: goals } = useGoals()
  const { data: contributions } = useContributions()
  const budgetUsage = useBudgetUsage()
  const { data: expenseCats } = useCategories('expense')
  const { data: cards } = useCards()

  return useMemo(() => {
    const today = todayISO()
    const alerts: Alert[] = []

    for (const e of expenses ?? []) {
      const bucket = urgencyBucket(e.due_date, e.payment_date, today)
      if (!bucket) continue
      alerts.push({
        key: `exp:${e.id}:${bucket}`,
        kind: bucket,
        title: e.description,
        subtitle: `${BUCKET_META[bucket].label} · ${e.due_date}`,
        path: '/despesas',
        amountCents: e.amount_cents,
        weight: BUCKET_META[bucket].weight,
      })
    }

    // Metas atingidas
    const accByGoal = new Map<string, number>()
    for (const c of contributions ?? []) {
      accByGoal.set(c.goal_id, (accByGoal.get(c.goal_id) ?? 0) + c.amount_cents)
    }
    for (const g of goals ?? []) {
      const acc = accByGoal.get(g.id) ?? 0
      if (g.target_cents > 0 && acc >= g.target_cents) {
        alerts.push({
          key: `goal:${g.id}:done`,
          kind: 'meta',
          title: `Meta alcançada: ${g.name}`,
          subtitle: 'Parabéns! Você chegou lá 🎉',
          path: '/metas',
          weight: 4,
        })
      }
    }

    // Limites de gastos
    const catName = new Map((expenseCats ?? []).map((c) => [c.id, c.name]))
    const cardName = new Map((cards ?? []).map((c) => [c.id, c.name]))
    for (const u of budgetUsage) {
      const label =
        u.budget.scope === 'geral'
          ? 'gastos do mês'
          : u.budget.scope === 'categoria'
            ? catName.get(u.budget.category_id ?? '') ?? 'categoria'
            : cardName.get(u.budget.card_id ?? '') ?? 'cartão'
      if (u.pct >= 100) {
        alerts.push({
          key: `budget:${u.budget.id}:over`,
          kind: 'budget',
          title: `Limite de ${label} ultrapassado`,
          subtitle: `${u.pct.toFixed(0)}% do limite`,
          path: '/limites',
          weight: 0.5,
        })
      } else if (u.pct >= 80) {
        alerts.push({
          key: `budget:${u.budget.id}:80`,
          kind: 'budget',
          title: `Você atingiu ${u.pct.toFixed(0)}% do limite de ${label}`,
          subtitle: 'Fique de olho nos gastos',
          path: '/limites',
          weight: 3.5,
        })
      }
    }

    return alerts.sort((a, b) => a.weight - b.weight)
  }, [expenses, goals, contributions, budgetUsage, expenseCats, cards])
}
