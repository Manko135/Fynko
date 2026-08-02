import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { useToast } from '@/contexts/ToastContext'
import { useCreateCategory } from '@/hooks/useCategories'
import { DEFAULT_COLOR } from '@/lib/palette'
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from '@/lib/categoryIcons'
import { cn } from '@/utils/cn'
import type { Category, CategoryKind } from '@/types/domain'

/** Quick "create new category" modal, reused inside the income/expense forms. */
export function CategoryFormModal({
  open,
  onClose,
  kind,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  kind: CategoryKind
  onCreated: (category: Category) => void
}) {
  const { toast } = useToast()
  const create = useCreateCategory()
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [icon, setIcon] = useState(DEFAULT_CATEGORY_ICON)

  useEffect(() => {
    if (open) {
      setName('')
      setColor(DEFAULT_COLOR)
      setIcon(DEFAULT_CATEGORY_ICON)
    }
  }, [open])

  async function handleSave() {
    if (!name.trim()) return toast('Dê um nome à categoria.', 'error')
    try {
      const cat = await create.mutateAsync({ name: name.trim(), kind, color, icon })
      toast('Categoria criada.')
      onCreated(cat)
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível criar.', 'error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova categoria"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={create.isPending}>
            Criar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={kind === 'income' ? 'Ex: Bonificação' : 'Ex: Assinaturas'}
        />
        <ColorPicker value={color} onChange={setColor} />
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-ink/75">Ícone</span>
          <div className="grid grid-cols-8 gap-2">
            {CATEGORY_ICONS.map(({ key, label, Icon }) => {
              const selected = icon === key
              return (
                <button
                  key={key}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={selected}
                  onClick={() => setIcon(key)}
                  className={cn(
                    'grid aspect-square place-items-center rounded-lg border transition',
                    selected ? 'border-transparent text-white' : 'border-rule text-muted hover:bg-surface-2',
                  )}
                  style={selected ? { background: color } : undefined}
                >
                  <Icon className="size-4" />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Modal>
  )
}
