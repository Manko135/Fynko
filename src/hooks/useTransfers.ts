import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  createTransfer,
  deleteTransfer,
  listTransfers,
  type TransferInput,
} from '@/services/transfers'

const KEY = ['transfers']

export function useTransfers() {
  return useQuery({ queryKey: KEY, queryFn: listTransfers })
}

export function useCreateTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: TransferInput) => createTransfer(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTransfer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
