import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  createCard,
  deleteCard,
  listCards,
  updateCard,
  type CardInput,
} from '@/services/cards'

const KEY = ['cards']

export function useCards() {
  return useQuery({ queryKey: KEY, queryFn: listCards })
}

export function useCreateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CardInput) => createCard(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CardInput> }) =>
      updateCard(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCard(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
