import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { BrandSelect } from '@/components/cards/BrandSelect'
import { useToast } from '@/contexts/ToastContext'
import { useCreateCard, useUpdateCard } from '@/hooks/useCards'
import { DEFAULT_COLOR } from '@/lib/palette'
import type { Card } from '@/types/domain'
import type { CardInput } from '@/services/cards'

function empty(): CardInput {
  return {
    name: '',
    brand: '',
    limit_cents: 0,
    closing_day: 1,
    due_day: 10,
    color: DEFAULT_COLOR,
  }
}

function clampDay(v: string): number {
  const n = Number(v) || 1
  return Math.min(31, Math.max(1, n))
}

export function CardFormModal({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  editing: Card | null
}) {
  const { toast } = useToast()
  const create = useCreateCard()
  const update = useUpdateCard()
  const [form, setForm] = useState<CardInput>(empty)

  useEffect(() => {
    if (!open) return
    setForm(
      editing
        ? {
            name: editing.name,
            brand: editing.brand ?? '',
            limit_cents: editing.limit_cents,
            closing_day: editing.closing_day,
            due_day: editing.due_day,
            color: editing.color ?? DEFAULT_COLOR,
          }
        : empty(),
    )
  }, [open, editing])

  const saving = create.isPending || update.isPending

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast('Dê um nome ao cartão.', 'error')
      return
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch: form })
        toast('Cartão atualizado.')
      } else {
        await create.mutateAsync(form)
        toast('Cartão criado.')
      }
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível salvar.', 'error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar cartão' : 'Novo cartão'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            {editing ? 'Salvar' : 'Criar cartão'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Nome"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Itaú Visa"
          />
          <BrandSelect
            value={form.brand ?? ''}
            onChange={(brand) => setForm({ ...form, brand })}
          />
        </div>
        <CurrencyInput
          label="Limite total"
          value={form.limit_cents}
          onChange={(cents) => setForm({ ...form, limit_cents: cents })}
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Dia de fechamento"
            type="number"
            min={1}
            max={31}
            value={String(form.closing_day)}
            onChange={(e) =>
              setForm({ ...form, closing_day: clampDay(e.target.value) })
            }
          />
          <TextField
            label="Dia de vencimento"
            type="number"
            min={1}
            max={31}
            value={String(form.due_day)}
            onChange={(e) =>
              setForm({ ...form, due_day: clampDay(e.target.value) })
            }
          />
        </div>
        <ColorPicker
          value={form.color}
          onChange={(hex) => setForm({ ...form, color: hex })}
        />
      </div>
    </Modal>
  )
}
