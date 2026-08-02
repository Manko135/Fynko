import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, Info, XCircle } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'
type Toast = { id: number; message: string; kind: ToastKind }

const ToastContext = createContext<{
  toast: (message: string, kind?: ToastKind) => void
} | null>(null)

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = nextId++
    setToasts((t) => [...t, { id, message, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        {toasts.map((t) => {
          const Icon =
            t.kind === 'success'
              ? CheckCircle2
              : t.kind === 'error'
                ? XCircle
                : Info
          const tone =
            t.kind === 'success'
              ? 'text-positive'
              : t.kind === 'error'
                ? 'text-danger'
                : 'text-brand'
          return (
            <div
              key={t.id}
              className="animate-toast-in pointer-events-auto flex items-center gap-2.5 rounded-xl border border-rule bg-surface px-4 py-3 text-sm shadow-xl"
            >
              <Icon className={`size-4 shrink-0 ${tone}`} />
              <span className="text-ink/85">{t.message}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
