import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { AttachmentsPanel } from '@/components/attachments/AttachmentsPanel'
import type { AttachTarget } from '@/services/attachments'

/** Standalone "Anexar documentos" dialog — the attachments panel in a modal. */
export function AttachModal({
  open,
  onClose,
  target,
  title = 'Anexar documentos',
}: {
  open: boolean
  onClose: () => void
  target: AttachTarget
  title?: string
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Concluir
        </Button>
      }
    >
      <AttachmentsPanel target={target} />
    </Modal>
  )
}
