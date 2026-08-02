import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { Select } from '@/components/ui/Select'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { useToast } from '@/contexts/ToastContext'
import {
  useCreateAsset,
  useCreateLiability,
  useUpdateAsset,
  useUpdateLiability,
} from '@/hooks/usePatrimonio'
import type { Asset, Liability } from '@/types/domain'

export type ItemKind = 'asset' | 'liability'

const ASSET_CATS = ['Dinheiro', 'Investimento', 'Ações', 'FII', 'Criptomoeda', 'Imóvel', 'Veículo', 'Outro']
const LIAB_CATS = ['Empréstimo', 'Financiamento', 'Dívida', 'Parcelamento', 'Outro']

export function PatrimonioItemModal({
  open,
  onClose,
  kind,
  editing,
}: {
  open: boolean
  onClose: () => void
  kind: ItemKind
  editing: Asset | Liability | null
}) {
  const { toast } = useToast()
  const createA = useCreateAsset()
  const updateA = useUpdateAsset()
  const createL = useCreateLiability()
  const updateL = useUpdateLiability()

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [value, setValue] = useState(0)
  const [acquired, setAcquired] = useState('')
  const [notes, setNotes] = useState('')

  const cats = kind === 'asset' ? ASSET_CATS : LIAB_CATS

  useEffect(() => {
    if (!open) return
    if (editing) {
      setName(editing.name)
      setCategory(editing.category)
      setValue(editing.value_cents)
      setAcquired('acquired_date' in editing ? (editing.acquired_date ?? '') : '')
      setNotes(editing.notes ?? '')
    } else {
      setName('')
      setCategory(cats[0])
      setValue(0)
      setAcquired('')
      setNotes('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, kind])

  const saving = createA.isPending || updateA.isPending || createL.isPending || updateL.isPending

  async function handleSave() {
    if (!name.trim()) {
      toast('Dê um nome ao item.', 'error')
      return
    }
    try {
      if (kind === 'asset') {
        const payload = {
          name,
          category,
          value_cents: value,
          acquired_date: acquired || null,
          notes: notes || null,
        }
        if (editing) await updateA.mutateAsync({ id: editing.id, patch: payload })
        else await createA.mutateAsync(payload)
      } else {
        const payload = { name, category, value_cents: value, notes: notes || null }
        if (editing) await updateL.mutateAsync({ id: editing.id, patch: payload })
        else await createL.mutateAsync(payload)
      }
      toast(editing ? 'Item atualizado.' : 'Item adicionado.')
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível salvar.', 'error')
    }
  }

  const noun = kind === 'asset' ? 'ativo' : 'passivo'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Editar ${noun}` : `Novo ${noun}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {editing ? 'Salvar' : 'Adicionar'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={kind === 'asset' ? 'Ex: Apartamento, Tesouro Selic' : 'Ex: Financiamento do carro'}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Categoria"
            options={cats.map((c) => ({ value: c, label: c }))}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <CurrencyInput label="Valor" value={value} onChange={setValue} />
        </div>
        {kind === 'asset' && (
          <TextField
            label="Data de aquisição"
            type="date"
            value={acquired}
            onChange={(e) => setAcquired(e.target.value)}
          />
        )}
        <TextField
          label="Observações"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Opcional"
        />
      </div>
    </Modal>
  )
}
