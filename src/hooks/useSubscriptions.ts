import { useEffect } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  createSubscription,
  deleteSubscription,
  listSubscriptions,
  reconcileSubscriptions,
  updateSubscription,
  type SubscriptionInput,
} from '@/services/subscriptions'

const KEY = ['subscriptions']
// A subscription change also touches its linked expense (and thus balances).
const RELATED = [KEY, ['expenses'], ['categories']]

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  RELATED.forEach((k) => qc.invalidateQueries({ queryKey: k }))
}

export function useSubscriptions() {
  return useQuery({ queryKey: KEY, queryFn: listSubscriptions })
}

export function useCreateSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (i: SubscriptionInput) => createSubscription(i),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdateSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: SubscriptionInput }) =>
      updateSubscription(id, patch),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useDeleteSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSubscription(id),
    onSuccess: () => invalidateAll(qc),
  })
}

/** Roll subscriptions forward once when the module mounts. */
export function useReconcileSubscriptions() {
  const qc = useQueryClient()
  useEffect(() => {
    reconcileSubscriptions()
      .then((n) => {
        if (n > 0) invalidateAll(qc)
      })
      .catch(() => {})
  }, [qc])
}
