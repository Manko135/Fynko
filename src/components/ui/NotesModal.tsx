import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

/** Read-only dialog that shows a record's observations on demand. */
export function NotesModal({
  open,
  onClose,
  title = 'Observações',
  notes,
}: {
  open: boolean
  onClose: () => void
  title?: string
  notes?: string | null
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
      <p className="whitespace-pre-wrap text-sm text-ink/85">
        {notes?.trim() ? notes : 'Sem observações.'}
      </p>
    </Modal>
  )
}
