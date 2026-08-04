import type { ReactNode } from 'react'
import { Download, FileText, Loader2, Paperclip } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useAttachments } from '@/hooks/useAttachments'
import { attachmentUrl, type AttachTarget } from '@/services/attachments'
import { useToast } from '@/contexts/ToastContext'

export type DetailRow = { label: string; value: ReactNode }

/** Read-only list of a record's attachments (download only, no editing). */
function AttachmentsView({ target }: { target: AttachTarget }) {
  const { data: items, isLoading } = useAttachments(target)
  const { toast } = useToast()

  async function open(path: string) {
    try {
      window.open(await attachmentUrl(path), '_blank')
    } catch {
      toast('Não foi possível abrir o anexo.', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-1.5 text-sm font-medium text-ink/75">
        <Paperclip className="size-4" /> Anexos
      </span>
      {isLoading && <Loader2 className="size-4 animate-spin text-muted" />}
      {items && items.length === 0 && (
        <p className="text-xs text-faint">Nenhum anexo neste registro.</p>
      )}
      <div className="flex flex-col gap-1.5">
        {(items ?? []).map((a) => (
          <div key={a.id} className="flex items-center gap-2 rounded-lg border border-rule bg-surface-2 px-2.5 py-2">
            <FileText className="size-4 shrink-0 text-muted" />
            <span className="min-w-0 flex-1 truncate text-sm">{a.file_name}</span>
            {!a.expired && (
              <button
                type="button"
                aria-label="Baixar"
                onClick={() => open(a.storage_path)}
                className="grid size-7 place-items-center rounded text-muted hover:bg-surface-3"
              >
                <Download className="size-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Read-only "Ver informações" view — shows every filled field of a record plus
 * its attachments, without entering edit mode. Callers pass the already-built
 * rows (empty values are simply omitted by the caller).
 */
export function DetailsModal({
  open,
  onClose,
  title,
  rows,
  attachTarget,
}: {
  open: boolean
  onClose: () => void
  title: string
  rows: DetailRow[]
  attachTarget?: AttachTarget
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <dl className="flex flex-col divide-y divide-rule">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start justify-between gap-4 py-2.5">
            <dt className="shrink-0 text-sm text-muted">{r.label}</dt>
            <dd className="text-right text-sm font-medium text-ink/90">{r.value}</dd>
          </div>
        ))}
      </dl>
      {attachTarget && (
        <div className="mt-4 border-t border-rule pt-4">
          <AttachmentsView target={attachTarget} />
        </div>
      )}
    </Modal>
  )
}
