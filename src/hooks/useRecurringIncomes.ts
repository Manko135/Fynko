import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelRecurringIncome,
  createRecurringIncome,
  listRecurringIncomes,
  reconcileRecurringIncomes,
  type RecurringIncomeInput,
} from '@/services/recurringIncomes'

const RELATED = [['incomes'], ['recurring-incomes'], ['balances']]

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  RELATED.forEach((k) => qc.invalidateQueries({ queryKey: k }))
}

export function useRecurringIncomes() {
  return useQuery({ queryKey: ['recurring-incomes'], queryFn: listRecurringIncomes })
}

export function useCreateRecurringIncome() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (i: RecurringIncomeInput) => createRecurringIncome(i),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useCancelRecurringIncome() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelRecurringIncome(id),
    onSuccess: () => invalidateAll(qc),
  })
}

/** Generate any pending recurring incomes once when the module mounts. */
export function useReconcileRecurringIncomes() {
  const qc = useQueryClient()
  useEffect(() => {
    reconcileRecurringIncomes()
      .then((n) => {
        if (n > 0) invalidateAll(qc)
      })
      .catch(() => {})
  }, [qc])
}
