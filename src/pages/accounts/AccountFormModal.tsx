import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { Select } from '@/components/ui/Select'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { useToast } from '@/contexts/ToastContext'
import { useCreateAccount, useUpdateAccount } from '@/hooks/useAccounts'
import { DEFAULT_COLOR } from '@/lib/palette'
import { ACCOUNT_TYPE_LABELS, type Account, type AccountType } from '@/types/domain'
import type { AccountInput } from '@/services/accounts'

const TYPE_OPTIONS = (Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map(
  (t) => ({ value: t, label: ACCOUNT_TYPE_LABELS[t] }),
)

const empty: AccountInput = {
  name: '',
  bank: '',
  type: 'corrente',
  color: DEFAULT_COLOR,
  initial_balance_cents: 0,
  notes: '',
}

export function AccountFormModal({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  editing: Account | null
}) {
  const { toast } = useToast()
  const create = useCreateAccount()
  const update = useUpdateAccount()
  const [form, setForm] = useState<AccountInput>(empty)

  useEffect(() => {
    if (!open) return
    setForm(
      editing
        ? {
            name: editing.name,
            bank: editing.bank ?? '',
            type: editing.type,
            color: editing.color ?? DEFAULT_COLOR,
            initial_balance_cents: editing.initial_balance_cents,
            notes: editing.notes ?? '',
          }
        : empty,
    )
  }, [open, editing])

  const saving = create.isPending || update.isPending

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast('Dê um nome para a conta.', 'error')
      return
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch: form })
        toast('Conta atualizada.')
      } else {
        await create.mutateAsync(form)
        toast('Conta criada.')
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
      title={editing ? 'Editar conta' : 'Nova conta'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            {editing ? 'Salvar' : 'Criar conta'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Nome"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Ex: Nubank, Carteira, Reserva"
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Banco / instituição"
            value={form.bank ?? ''}
            onChange={(e) => setForm({ ...form, bank: e.target.value })}
            placeholder="Opcional"
          />
          <Select
            label="Tipo"
            options={TYPE_OPTIONS}
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: e.target.value as AccountType })
            }
          />
        </div>
        <CurrencyInput
          label="Saldo inicial"
          value={form.initial_balance_cents}
          onChange={(cents) => setForm({ ...form, initial_balance_cents: cents })}
        />
        <ColorPicker
          value={form.color}
          onChange={(hex) => setForm({ ...form, color: hex })}
        />
        <TextField
          label="Observações"
          value={form.notes ?? ''}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Opcional"
        />
      </div>
    </Modal>
  )
}
