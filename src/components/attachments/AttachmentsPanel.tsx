import { useRef } from 'react'
import { Download, FileText, Loader2, Paperclip, Trash2 } from 'lucide-react'
import {
  useAttachments,
  useDeleteAttachment,
  useUploadAttachment,
} from '@/hooks/useAttachments'
import { attachmentUrl, type AttachTarget } from '@/services/attachments'
import { useToast } from '@/contexts/ToastContext'

function sizeLabel(bytes: number | null) {
  if (!bytes) return ''
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`
}

export function AttachmentsPanel({ target }: { target: AttachTarget }) {
  const { data: items, isLoading } = useAttachments(target)
  const upload = useUploadAttachment(target)
  const del = useDeleteAttachment(target)
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  async function onPick(file: File) {
    try {
      await upload.mutateAsync(file)
      toast('Anexo enviado.')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao enviar.', 'error')
    }
  }

  async function open(path: string) {
    try {
      window.open(await attachmentUrl(path), '_blank')
    } catch {
      toast('Não foi possível abrir o anexo.', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium text-ink/75">
          <Paperclip className="size-4" /> Anexos
        </span>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="text-xs font-medium text-brand hover:underline"
        >
          {upload.isPending ? 'Enviando…' : '+ Adicionar'}
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onPick(f)
            e.target.value = ''
          }}
        />
      </div>

      {isLoading && <Loader2 className="size-4 animate-spin text-muted" />}

      {items && items.length === 0 && (
        <p className="text-xs text-faint">
          Nenhum anexo. Comprovantes e documentos são guardados por 90 dias.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        {(items ?? []).map((a) => (
          <div key={a.id} className="flex items-center gap-2 rounded-lg border border-rule bg-surface-2 px-2.5 py-2">
            <FileText className="size-4 shrink-0 text-muted" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{a.file_name}</div>
              <div className="text-[11px] text-faint">
                {a.expired ? 'Anexo expirou (política de retenção de 90 dias)' : sizeLabel(a.size_bytes)}
              </div>
            </div>
            {!a.expired && (
              <button type="button" aria-label="Baixar" onClick={() => open(a.storage_path)} className="grid size-7 place-items-center rounded text-muted hover:bg-surface-3">
                <Download className="size-4" />
              </button>
            )}
            <button type="button" aria-label="Remover" onClick={() => del.mutate(a)} className="grid size-7 place-items-center rounded text-muted hover:bg-surface-3 hover:text-danger">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
