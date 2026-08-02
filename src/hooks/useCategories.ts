import { useEffect } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  createCategory,
  ensureDefaultCategories,
  listCategories,
} from '@/services/categories'
import type { CategoryKind } from '@/types/domain'

const KEY = ['categories']

export function useCategories(kind?: CategoryKind) {
  const query = useQuery({ queryKey: KEY, queryFn: listCategories })
  const data = kind
    ? query.data?.filter((c) => c.kind === kind)
    : query.data
  return { ...query, data }
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

/**
 * Ensures the default categories exist for the signed-in user, once. Mounted
 * high in the app tree (AppLayout) so every module has categories available.
 */
export function useSeedDefaultCategories() {
  const qc = useQueryClient()
  useEffect(() => {
    let cancelled = false
    ensureDefaultCategories()
      .then(() => {
        if (!cancelled) qc.invalidateQueries({ queryKey: KEY })
      })
      .catch(() => {
        /* offline / not signed in — the modules still work, just no seed */
      })
    return () => {
      cancelled = true
    }
  }, [qc])
}
