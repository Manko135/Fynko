import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { CategoryFormModal } from '@/pages/categories/CategoryFormModal'
import { useCategories } from '@/hooks/useCategories'
import type { CategoryKind } from '@/types/domain'

/**
 * Category picker with an inline "+ Criar nova categoria" shortcut, used in the
 * income and expense forms. A newly created category is auto-selected.
 */
export function CategorySelectField({
  kind,
  value,
  onChange,
}: {
  kind: CategoryKind
  value: string
  onChange: (id: string) => void
}) {
  const { data: categories } = useCategories(kind)
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink/75">Categoria</span>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-0.5 text-xs font-medium text-brand transition hover:opacity-80"
        >
          <Plus className="size-3" strokeWidth={2.5} /> Criar nova
        </button>
      </div>
      <Select
        placeholder="Selecione"
        options={(categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <CategoryFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        kind={kind}
        onCreated={(cat) => onChange(cat.id)}
      />
    </div>
  )
}
