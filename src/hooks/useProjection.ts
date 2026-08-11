import { useCallback } from 'react'
import { useAccounts } from '@/hooks/useAccounts'
import { useIncomes } from '@/hooks/useIncomes'
import { useExpenses } from '@/hooks/useExpenses'
import { useSubscriptions } from '@/hooks/useSubscriptions'
import { useRecurringIncomes } from '@/hooks/useRecurringIncomes'
import { todayISO } from '@/lib/dates'
import {
  projectFinances,
  type Projection,
  type ProjectionFilter,
} from '@/lib/finance/projection'

/**
 * Gives a memoized `project(target, filter)` that runs the shared projection
 * engine over the user's real data. Nothing is written — pure what-if.
 */
export function useProjection() {
  const { data: accounts } = useAccounts()
  const { data: incomes } = useIncomes()
  const { data: expenses } = useExpenses()
  const { data: subscriptions } = useSubscriptions()
  const { data: recurringIncomes } = useRecurringIncomes()

  const isLoading = !accounts || !incomes || !expenses || !subscriptions || !recurringIncomes

  const project = useCallback(
    (target: string, filter?: ProjectionFilter): Projection =>
      projectFinances({
        accounts: accounts ?? [],
        incomes: incomes ?? [],
        expenses: expenses ?? [],
        subscriptions: subscriptions ?? [],
        recurringIncomes: recurringIncomes ?? [],
        today: todayISO(),
        target,
        filter,
      }),
    [accounts, incomes, expenses, subscriptions, recurringIncomes],
  )

  return { project, isLoading }
}
