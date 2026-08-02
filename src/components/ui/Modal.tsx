import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="animate-fade absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-pop relative flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-rule bg-surface shadow-2xl sm:max-w-lg sm:rounded-2xl"
      >
        <header className="flex items-center justify-between border-b border-rule px-5 py-4">
          <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2 border-t border-rule px-5 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
