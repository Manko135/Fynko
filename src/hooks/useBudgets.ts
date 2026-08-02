import { useMemo } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  createBudget,
  deleteBudget,
  listBudgets,
  updateBudget,
  type BudgetInput,
} from '@/services/budgets'
import { useExpenses } from '@/hooks/useExpenses'
import { monthKey, todayISO } from '@/lib/dates'
import type { Budget } from '@/types/domain'

const KEY = ['budgets']

export function useBudgets() {
  return useQuery({ queryKey: KEY, queryFn: listBudgets })
}

export function useCreateBudget() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (i: BudgetInput) => createBudget(i), onSuccess: () => qc.invalidateQueries({ queryKey: KEY }) })
}
export function useUpdateBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<BudgetInput> }) => updateBudget(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
export function useDeleteBudget() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: string) => deleteBudget(id), onSuccess: () => qc.invalidateQueries({ queryKey: KEY }) })
}

export type BudgetUsage = {
  budget: Budget
  spentCents: number
  pct: number
  overCents: number
}

/**
 * Spend vs limit for the current month. An expense counts toward the month it
 * effectively hits (payment_date if paid, else due_date) — same cash-basis
 * logic used elsewhere.
 */
export function useBudgetUsage(): BudgetUsage[] {
  const { data: budgets } = useBudgets()
  const { data: expenses } = useExpenses()

  return useMemo(() => {
    const curMonth = monthKey(todayISO())
    const monthExpenses = (expenses ?? []).filter(
      (e) => monthKey(e.payment_date ?? e.due_date) === curMonth,
    )

    return (budgets ?? []).map((b) => {
      let spent = 0
      for (const e of monthExpenses) {
        if (b.scope === 'geral') spent += e.amount_cents
        else if (b.scope === 'categoria' && e.category_id === b.category_id)
          spent += e.amount_cents
        else if (b.scope === 'cartao' && e.card_id === b.card_id)
          spent += e.amount_cents
      }
      const pct = b.amount_cents > 0 ? (spent / b.amount_cents) * 100 : 0
      return { budget: b, spentCents: spent, pct, overCents: Math.max(0, spent - b.amount_cents) }
    })
  }, [budgets, expenses])
}
