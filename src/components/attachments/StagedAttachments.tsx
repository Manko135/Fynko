import { useRef } from 'react'
import { FileText, Paperclip, Trash2 } from 'lucide-react'

function sizeLabel(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`
}

/**
 * Attachment picker used while CREATING a record (which has no id yet). Files
 * are held in memory and uploaded by the form right after the record is saved.
 * Mirrors AttachmentsPanel visually, but nothing is uploaded until submit.
 */
export function StagedAttachments({
  files,
  onChange,
}: {
  files: File[]
  onChange: (files: File[]) => void
}) {
  const ref = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium text-ink/75">
          <Paperclip className="size-4" /> Anexos
        </span>
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="text-xs font-medium text-brand hover:underline"
        >
          + Adicionar
        </button>
        <input
          ref={ref}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? [])
            if (picked.length) onChange([...files, ...picked])
            e.target.value = ''
          }}
        />
      </div>

      {files.length === 0 && (
        <p className="text-xs text-faint">
          Comprovantes e documentos (opcional). Serão anexados ao salvar e
          guardados por 90 dias.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        {files.map((f, i) => (
          <div key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg border border-rule bg-surface-2 px-2.5 py-2">
            <FileText className="size-4 shrink-0 text-muted" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{f.name}</div>
              <div className="text-[11px] text-faint">{sizeLabel(f.size)}</div>
            </div>
            <button
              type="button"
              aria-label="Remover"
              onClick={() => onChange(files.filter((_, j) => j !== i))}
              className="grid size-7 place-items-center rounded text-muted hover:bg-surface-3 hover:text-danger"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
