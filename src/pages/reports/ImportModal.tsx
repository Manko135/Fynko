import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Download, Upload } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/contexts/ToastContext'
import {
  downloadTemplate,
  importItems,
  parseFile,
  validateRows,
  type ImportPreview,
} from '@/services/import'

export function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState(false)

  function reset() {
    setPreview(null)
    setFileName('')
  }

  async function onPick(file: File) {
    setBusy(true)
    try {
      const rows = await parseFile(file)
      setFileName(file.name)
      setPreview(validateRows(rows))
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível ler o arquivo.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function confirm() {
    if (!preview?.valid.length) return
    setBusy(true)
    try {
      const n = await importItems(preview.valid)
      await qc.invalidateQueries()
      toast(`${n} lançamento${n !== 1 ? 's' : ''} importado${n !== 1 ? 's' : ''}.`)
      reset()
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao importar.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose() }}
      title="Importar lançamentos"
      footer={
        <>
          <Button variant="secondary" onClick={() => { reset(); onClose() }} disabled={busy}>
            Fechar
          </Button>
          {preview && (
            <Button onClick={confirm} loading={busy} disabled={preview.valid.length === 0}>
              Importar {preview.valid.length}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Envie um arquivo CSV ou Excel com as colunas: tipo, descrição,
          categoria, valor, data, conta, pago. Categorias que não existirem são
          criadas. Parcelamentos não entram por importação — só no cadastro
          manual.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Download className="size-4" />} onClick={downloadTemplate}>
            Baixar modelo
          </Button>
          <Button variant="secondary" icon={<Upload className="size-4" />} onClick={() => fileRef.current?.click()} loading={busy && !preview}>
            Escolher arquivo
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onPick(f)
              e.target.value = ''
            }}
          />
        </div>

        {preview && (
          <div className="rounded-xl border border-rule bg-surface-2 p-4">
            <div className="mb-2 text-xs text-muted">{fileName}</div>
            <div className="flex items-center gap-2 text-sm text-positive">
              <CheckCircle2 className="size-4" />
              {preview.valid.length} linha{preview.valid.length !== 1 ? 's' : ''} válida{preview.valid.length !== 1 ? 's' : ''}
            </div>
            {preview.errors.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center gap-2 text-sm text-danger">
                  <AlertTriangle className="size-4" />
                  {preview.errors.length} com problema
                </div>
                <ul className="mt-1.5 max-h-40 overflow-y-auto text-xs text-muted">
                  {preview.errors.slice(0, 30).map((e, i) => (
                    <li key={i}>Linha {e.line}: {e.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
