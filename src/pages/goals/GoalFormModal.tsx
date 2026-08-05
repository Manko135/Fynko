import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { useToast } from '@/contexts/ToastContext'
import { useCreateGoal, useUpdateGoal } from '@/hooks/useGoals'
import { DEFAULT_COLOR } from '@/lib/palette'
import { GOAL_ICONS, DEFAULT_GOAL_ICON } from '@/lib/goalIcons'
import { cn } from '@/utils/cn'
import type { Goal } from '@/types/domain'
import type { GoalInput } from '@/services/goals'

function empty(): GoalInput {
  return { name: '', target_cents: 0, due_date: null, color: DEFAULT_COLOR, icon: DEFAULT_GOAL_ICON, notes: null }
}

export function GoalFormModal({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  editing: Goal | null
}) {
  const { toast } = useToast()
  const create = useCreateGoal()
  const update = useUpdateGoal()
  const [form, setForm] = useState<GoalInput>(empty)

  useEffect(() => {
    if (!open) return
    setForm(
      editing
        ? {
            name: editing.name,
            target_cents: editing.target_cents,
            due_date: editing.due_date,
            color: editing.color ?? DEFAULT_COLOR,
            icon: editing.icon ?? DEFAULT_GOAL_ICON,
            notes: editing.notes,
          }
        : empty(),
    )
  }, [open, editing])

  const saving = create.isPending || update.isPending

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast('Dê um nome à meta.', 'error')
      return
    }
    if (form.target_cents <= 0) {
      toast('Informe o valor que quer alcançar.', 'error')
      return
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch: form })
        toast('Meta atualizada.')
      } else {
        await create.mutateAsync(form)
        toast('Meta criada.')
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
      title={editing ? 'Editar meta' : 'Nova meta'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            {editing ? 'Salvar' : 'Criar meta'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Nome"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Ex: Reserva de emergência, Viagem"
        />
        <div className="grid grid-cols-2 gap-4">
          <CurrencyInput
            label="Valor alvo"
            value={form.target_cents}
            onChange={(cents) => setForm({ ...form, target_cents: cents })}
          />
          <TextField
            label="Data prevista"
            type="date"
            value={form.due_date ?? ''}
            onChange={(e) =>
              setForm({ ...form, due_date: e.target.value || null })
            }
          />
        </div>
        <ColorPicker
          value={form.color}
          onChange={(hex) => setForm({ ...form, color: hex })}
        />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-ink/75">Ícone</span>
          <div className="grid grid-cols-6 gap-2">
            {GOAL_ICONS.map(({ key, label, Icon }) => {
              const selected = (form.icon ?? DEFAULT_GOAL_ICON) === key
              return (
                <button
                  key={key}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={selected}
                  onClick={() => setForm({ ...form, icon: key })}
                  className={cn(
                    'grid aspect-square place-items-center rounded-xl border transition',
                    selected
                      ? 'border-transparent text-white'
                      : 'border-rule text-muted hover:bg-surface-2',
                  )}
                  style={selected ? { background: form.color ?? DEFAULT_COLOR } : undefined}
                >
                  <Icon className="size-[18px]" />
                </button>
              )
            })}
          </div>
        </div>

        <TextField
          label="Observações"
          value={form.notes ?? ''}
          onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
          placeholder="Opcional"
        />
      </div>
    </Modal>
  )
}
