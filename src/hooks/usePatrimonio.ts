import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  createAsset,
  createLiability,
  deleteAsset,
  deleteLiability,
  listAssets,
  listLiabilities,
  updateAsset,
  updateLiability,
  type AssetInput,
  type LiabilityInput,
} from '@/services/patrimonio'

const ASSETS = ['assets']
const LIABS = ['liabilities']

export function useAssets() {
  return useQuery({ queryKey: ASSETS, queryFn: listAssets })
}
export function useLiabilities() {
  return useQuery({ queryKey: LIABS, queryFn: listLiabilities })
}

function useInvalidating<T>(fn: (a: T) => Promise<unknown>, key: string[]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })
}

export function useCreateAsset() {
  return useInvalidating((i: AssetInput) => createAsset(i), ASSETS)
}
export function useUpdateAsset() {
  return useInvalidating(
    ({ id, patch }: { id: string; patch: Partial<AssetInput> }) => updateAsset(id, patch),
    ASSETS,
  )
}
export function useDeleteAsset() {
  return useInvalidating((id: string) => deleteAsset(id), ASSETS)
}

export function useCreateLiability() {
  return useInvalidating((i: LiabilityInput) => createLiability(i), LIABS)
}
export function useUpdateLiability() {
  return useInvalidating(
    ({ id, patch }: { id: string; patch: Partial<LiabilityInput> }) =>
      updateLiability(id, patch),
    LIABS,
  )
}
export function useDeleteLiability() {
  return useInvalidating((id: string) => deleteLiability(id), LIABS)
}
