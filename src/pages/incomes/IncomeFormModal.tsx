import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { Select } from '@/components/ui/Select'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { useToast } from '@/contexts/ToastContext'
import { useAccounts } from '@/hooks/useAccounts'
import { AttachmentsPanel } from '@/components/attachments/AttachmentsPanel'
import { StagedAttachments } from '@/components/attachments/StagedAttachments'
import { CategorySelectField } from '@/components/categories/CategorySelectField'
import { useCreateIncome, useUpdateIncome } from '@/hooks/useIncomes'
import { uploadAttachment } from '@/services/attachments'
import { todayISO } from '@/lib/dates'
import type { Income } from '@/types/domain'
import type { IncomeInput } from '@/services/incomes'

function emptyForm(): IncomeInput {
  return {
    description: '',
    category_id: null,
    account_id: null,
    amount_cents: 0,
    date: todayISO(),
    notes: null,
  }
}

export function IncomeFormModal({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  editing: Income | null
}) {
  const { toast } = useToast()
  const { data: accounts } = useAccounts()
  const create = useCreateIncome()
  const update = useUpdateIncome()
  const [form, setForm] = useState<IncomeInput>(emptyForm)
  const [stagedFiles, setStagedFiles] = useState<File[]>([])

  useEffect(() => {
    if (!open) return
    setStagedFiles([])
    setForm(
      editing
        ? {
            description: editing.description,
            category_id: editing.category_id,
            account_id: editing.account_id,
            amount_cents: editing.amount_cents,
            date: editing.date,
            notes: editing.notes,
          }
        : emptyForm(),
    )
  }, [open, editing])

  const saving = create.isPending || update.isPending

  async function uploadStaged(incomeId: string) {
    if (stagedFiles.length === 0) return
    let failed = 0
    for (const f of stagedFiles) {
      try {
        await uploadAttachment(f, { incomeId })
      } catch {
        failed++
      }
    }
    if (failed) toast(`${failed} anexo(s) não puderam ser enviados.`, 'error')
  }

  async function handleSubmit() {
    if (!form.description.trim()) {
      toast('Descreva a receita.', 'error')
      return
    }
    if (form.amount_cents <= 0) {
      toast('Informe um valor maior que zero.', 'error')
      return
    }
    if (!form.account_id) {
      toast('Escolha a conta de destino.', 'error')
      return
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch: form })
        toast('Receita atualizada.')
      } else {
        const created = await create.mutateAsync(form)
        await uploadStaged(created.id)
        toast('Receita registrada.')
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
      title={editing ? 'Editar receita' : 'Nova receita'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            {editing ? 'Salvar' : 'Registrar'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Descrição"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Ex: Salário de julho"
        />
        <div className="grid grid-cols-2 gap-4">
          <CurrencyInput
            label="Valor"
            value={form.amount_cents}
            onChange={(cents) => setForm({ ...form, amount_cents: cents })}
          />
          <TextField
            label="Data"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <CategorySelectField
            kind="income"
            value={form.category_id ?? ''}
            onChange={(id) => setForm({ ...form, category_id: id || null })}
          />
          <Select
            label="Conta de destino"
            placeholder="Selecione"
            options={(accounts ?? []).map((a) => ({
              value: a.id,
              label: a.name,
            }))}
            value={form.account_id ?? ''}
            onChange={(e) =>
              setForm({ ...form, account_id: e.target.value || null })
            }
          />
        </div>
        <TextField
          label="Observação"
          value={form.notes ?? ''}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Opcional"
        />

        <div className="border-t border-rule pt-4">
          {editing ? (
            <AttachmentsPanel target={{ incomeId: editing.id }} />
          ) : (
            <StagedAttachments files={stagedFiles} onChange={setStagedFiles} />
          )}
        </div>
      </div>
    </Modal>
  )
}
