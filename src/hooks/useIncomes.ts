import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  createIncome,
  deleteIncome,
  listIncomes,
  updateIncome,
  type IncomeInput,
} from '@/services/incomes'

const KEY = ['incomes']

// Balances depend on incomes; invalidate both after any change.
const dependents = [KEY, ['balances']]

export function useIncomes() {
  return useQuery({ queryKey: KEY, queryFn: listIncomes })
}

export function useCreateIncome() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: IncomeInput) => createIncome(input),
    onSuccess: () => dependents.forEach((k) => qc.invalidateQueries({ queryKey: k })),
  })
}

export function useUpdateIncome() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<IncomeInput> }) =>
      updateIncome(id, patch),
    onSuccess: () => dependents.forEach((k) => qc.invalidateQueries({ queryKey: k })),
  })
}

export function useDeleteIncome() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteIncome(id),
    onSuccess: () => dependents.forEach((k) => qc.invalidateQueries({ queryKey: k })),
  })
}
