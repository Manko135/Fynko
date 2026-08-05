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
import { useCreateRecurringIncome } from '@/hooks/useRecurringIncomes'
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

function clampDay(v: string): number {
  const n = Number(v) || 1
  return Math.min(31, Math.max(1, n))
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
  const createRec = useCreateRecurringIncome()
  const [form, setForm] = useState<IncomeInput>(emptyForm)
  const [stagedFiles, setStagedFiles] = useState<File[]>([])

  // Receita fixa (recorrente)
  const [isFixa, setIsFixa] = useState(false)
  const [dayOfMonth, setDayOfMonth] = useState(5)
  const [startDate, setStartDate] = useState(todayISO())
  const [endDate, setEndDate] = useState('')

  const canRecur = !editing

  useEffect(() => {
    if (!open) return
    setStagedFiles([])
    setIsFixa(false)
    setDayOfMonth(Number(todayISO().slice(8, 10)))
    setStartDate(todayISO())
    setEndDate('')
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

  const saving = create.isPending || update.isPending || createRec.isPending
  const recurring = isFixa && canRecur

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
    if (recurring && !startDate) {
      toast('Informe a data de início da recorrência.', 'error')
      return
    }
    try {
      if (recurring) {
        await createRec.mutateAsync({
          description: form.description,
          amount_cents: form.amount_cents,
          category_id: form.category_id,
          account_id: form.account_id,
          day_of_month: dayOfMonth,
          start_date: startDate,
          end_date: endDate || null,
        })
        toast('Receita fixa criada. As parcelas mensais são geradas automaticamente.')
      } else if (editing) {
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
            {editing ? 'Salvar' : recurring ? 'Criar recorrência' : 'Registrar'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Descrição"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Ex: Salário"
        />

        {canRecur && (
          <div className="rounded-xl border border-rule bg-surface-2 px-3 py-2.5">
            <label className="flex items-center gap-2 text-sm text-ink/80">
              <input
                type="checkbox"
                checked={isFixa}
                onChange={(e) => setIsFixa(e.target.checked)}
                className="size-4 accent-[var(--color-brand)]"
              />
              Receita fixa (recorrente)
            </label>
            {recurring && (
              <p className="mt-2 text-xs text-muted">
                Todo mês, no dia informado, o sistema cria essa receita
                automaticamente.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <CurrencyInput
            label="Valor"
            value={form.amount_cents}
            onChange={(cents) => setForm({ ...form, amount_cents: cents })}
          />
          {recurring ? (
            <TextField
              label="Dia do recebimento"
              type="number"
              min={1}
              max={31}
              value={String(dayOfMonth)}
              onChange={(e) => setDayOfMonth(clampDay(e.target.value))}
            />
          ) : (
            <TextField
              label="Data"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          )}
        </div>

        {recurring && (
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Início"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <TextField
              label="Término (opcional)"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        )}

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

        {!recurring && (
          <TextField
            label="Observação"
            value={form.notes ?? ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Opcional"
          />
        )}

        {!recurring && (
          <div className="border-t border-rule pt-4">
            {editing ? (
              <AttachmentsPanel target={{ incomeId: editing.id }} />
            ) : (
              <StagedAttachments files={stagedFiles} onChange={setStagedFiles} />
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
