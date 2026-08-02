import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  deleteAttachment,
  listAttachments,
  uploadAttachment,
  type Attachment,
  type AttachTarget,
} from '@/services/attachments'

function key(t: AttachTarget) {
  return ['attachments', t.expenseId ?? t.incomeId]
}

export function useAttachments(target: AttachTarget, enabled = true) {
  return useQuery({
    queryKey: key(target),
    queryFn: () => listAttachments(target),
    enabled: enabled && Boolean(target.expenseId || target.incomeId),
  })
}

export function useUploadAttachment(target: AttachTarget) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadAttachment(file, target),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(target) }),
  })
}

export function useDeleteAttachment(target: AttachTarget) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (att: Attachment) => deleteAttachment(att),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(target) }),
  })
}
