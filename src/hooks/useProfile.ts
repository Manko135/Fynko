import { useEffect } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { getProfile, updateProfile, uploadAvatar } from '@/services/profile'
import { setDisplayCurrency } from '@/lib/money'

const KEY = ['profile']

export function useProfile() {
  const query = useQuery({ queryKey: KEY, queryFn: getProfile })
  // Apply the saved currency to all money formatting once it loads.
  useEffect(() => {
    if (query.data?.currency) setDisplayCurrency(query.data.currency)
  }, [query.data?.currency])
  return query
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: { full_name?: string; currency?: string }) =>
      updateProfile(patch),
    onSuccess: (_d, patch) => {
      if (patch.currency) setDisplayCurrency(patch.currency)
      qc.invalidateQueries({ queryKey: KEY })
    },
  })
}

export function useUploadAvatar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
