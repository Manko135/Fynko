import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  deleteExpense,
  deleteExpenseGroup,
  insertExpenses,
  listExpenses,
  settleExpenses,
  updateExpense,
} from '@/services/expenses'

const KEY = ['expenses']

export function useExpenses() {
  return useQuery({ queryKey: KEY, queryFn: listExpenses })
}

/** Invalidate expenses; balances derive from that query and recompute. */
function useExpenseMutation<TArgs>(fn: (args: TArgs) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useCreateExpenses() {
  return useExpenseMutation((rows: Array<Record<string, unknown>>) =>
    insertExpenses(rows),
  )
}

export function useUpdateExpense() {
  return useExpenseMutation(
    ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      updateExpense(id, patch),
  )
}

export function useDeleteExpense() {
  return useExpenseMutation((id: string) => deleteExpense(id))
}

export function useDeleteExpenseGroup() {
  return useExpenseMutation((groupId: string) => deleteExpenseGroup(groupId))
}

/** Quick "pay": stamp a payment date (defaults to today at the call site). */
export function usePayExpense() {
  return useExpenseMutation(
    ({ id, paymentDate }: { id: string; paymentDate: string | null }) =>
      updateExpense(id, { payment_date: paymentDate }),
  )
}

/** Pay a card invoice: settle its expenses against a bank account. */
export function useSettleInvoice() {
  return useExpenseMutation(
    ({
      ids,
      accountId,
      paymentDate,
    }: {
      ids: string[]
      accountId: string
      paymentDate: string
    }) => settleExpenses(ids, accountId, paymentDate),
  )
}
