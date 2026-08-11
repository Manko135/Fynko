import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { Select } from '@/components/ui/Select'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { useToast } from '@/contexts/ToastContext'
import { useAccounts } from '@/hooks/useAccounts'
import { useCards } from '@/hooks/useCards'
import { useCreateExpenses, useUpdateExpense } from '@/hooks/useExpenses'
import { AttachmentsPanel } from '@/components/attachments/AttachmentsPanel'
import { StagedAttachments } from '@/components/attachments/StagedAttachments'
import { CategorySelectField } from '@/components/categories/CategorySelectField'
import { uploadAttachment } from '@/services/attachments'
import { generateInstallments } from '@/lib/finance/installments'
import { invoiceDueForPurchase } from '@/lib/finance/invoice'
import { formatBRL } from '@/lib/money'
import { formatDisplayDate, todayISO } from '@/lib/dates'
import { cn } from '@/utils/cn'
import type { Expense, ExpenseType } from '@/types/domain'

type PayVia = 'conta' | 'cartao'

const TIPO_OPTIONS: { value: ExpenseType; label: string }[] = [
  { value: 'variavel', label: 'Variável' },
  { value: 'fixa', label: 'Fixa' },
  { value: 'parcelada', label: 'Parcelada' },
]

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="flex rounded-xl border border-rule bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition',
            value === o.value
              ? 'bg-brand-solid text-on-brand'
              : 'text-ink/65 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ExpenseFormModal({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  editing: Expense | null
}) {
  const { toast } = useToast()
  const { data: accounts } = useAccounts()
  const { data: cards } = useCards()
  const create = useCreateExpenses()
  const update = useUpdateExpense()

  const [description, setDescription] = useState('')
  const [tipo, setTipo] = useState<ExpenseType>('variavel')
  const [amount, setAmount] = useState(0)
  const [dueDate, setDueDate] = useState(todayISO())
  const [installments, setInstallments] = useState(2)
  const [payVia, setPayVia] = useState<PayVia>('conta')
  const [accountId, setAccountId] = useState('')
  const [cardId, setCardId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [isPaid, setIsPaid] = useState(false)
  const [paymentDate, setPaymentDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [stagedFiles, setStagedFiles] = useState<File[]>([])

  useEffect(() => {
    if (!open) return
    setStagedFiles([])
    if (editing) {
      setDescription(editing.description)
      setTipo(editing.type)
      setAmount(editing.amount_cents)
      // For a card expense the date field is the PURCHASE date; the invoice due
      // (due_date) is derived from it. Legacy rows without purchase_date fall
      // back to due_date so editing them still works.
      setDueDate(
        editing.card_id ? editing.purchase_date ?? editing.due_date : editing.due_date,
      )
      setPayVia(editing.card_id ? 'cartao' : 'conta')
      setAccountId(editing.account_id ?? '')
      setCardId(editing.card_id ?? '')
      setCategoryId(editing.category_id ?? '')
      setIsPaid(!!editing.payment_date)
      setPaymentDate(editing.payment_date ?? todayISO())
      setNotes(editing.notes ?? '')
    } else {
      setDescription('')
      setTipo('variavel')
      setAmount(0)
      setDueDate(todayISO())
      setInstallments(2)
      setPayVia('conta')
      setAccountId('')
      setCardId('')
      setCategoryId('')
      setIsPaid(false)
      setPaymentDate(todayISO())
      setNotes('')
    }
  }, [open, editing])

  const isParcelada = tipo === 'parcelada' && !editing
  const saving = create.isPending || update.isPending

  const selectedCard = useMemo(
    () => (cards ?? []).find((c) => c.id === cardId),
    [cards, cardId],
  )
  // Card mode: the entered date is the purchase date; the invoice vencimento is
  // derived from the card's closing/due days. Shown as a hint, stored in due_date.
  const cardInvoiceDue = useMemo(() => {
    if (payVia !== 'cartao' || !selectedCard || !dueDate) return null
    return invoiceDueForPurchase(dueDate, selectedCard.closing_day, selectedCard.due_day)
  }, [payVia, selectedCard, dueDate])

  async function uploadStaged(expenseId: string | undefined) {
    if (!expenseId || stagedFiles.length === 0) return
    let failed = 0
    for (const f of stagedFiles) {
      try {
        await uploadAttachment(f, { expenseId })
      } catch {
        failed++
      }
    }
    if (failed) toast(`${failed} anexo(s) não puderam ser enviados.`, 'error')
  }

  const preview = useMemo(() => {
    if (!isParcelada || amount <= 0 || installments < 2) return null
    const parts = generateInstallments(amount, installments, dueDate)
    return `${installments}x · ${parts.map((p) => formatBRL(p.amountCents)).slice(0, 1)} (última ${formatBRL(parts[parts.length - 1].amountCents)})`
  }, [isParcelada, amount, installments, dueDate])

  function validate(): string | null {
    if (!description.trim()) return 'Descreva a despesa.'
    if (amount <= 0) return 'Informe um valor maior que zero.'
    if (payVia === 'conta' && !accountId) return 'Escolha a conta de origem.'
    if (payVia === 'cartao' && !cardId) return 'Escolha o cartão.'
    if (isParcelada && installments < 2)
      return 'Parcelada precisa de ao menos 2 parcelas.'
    return null
  }

  async function handleSubmit() {
    const err = validate()
    if (err) {
      toast(err, 'error')
      return
    }
    const account_id = payVia === 'conta' ? accountId : null
    const card_id = payVia === 'cartao' ? cardId : null
    const category_id = categoryId || null
    // Card purchases don't get a payment date here — they're settled when the
    // invoice is paid (a separate action). Cash rule stays intact.
    const payment_date =
      !isParcelada && isPaid && payVia === 'conta' ? paymentDate : null
    // Card mode: the entered date is the purchase date and due_date becomes the
    // invoice vencimento (auto). Non-card: due_date is the entered date as before.
    const isCard = payVia === 'cartao'
    const purchase_date = isCard ? dueDate : null
    const resolvedDue =
      isCard && selectedCard
        ? invoiceDueForPurchase(dueDate, selectedCard.closing_day, selectedCard.due_day)
        : dueDate

    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          patch: {
            description,
            type: tipo,
            amount_cents: amount,
            due_date: resolvedDue,
            purchase_date,
            account_id,
            card_id,
            category_id,
            payment_date: payVia === 'cartao' ? editing.payment_date : payment_date,
            notes: notes || null,
          },
        })
        toast('Despesa atualizada.')
      } else if (isParcelada) {
        const group = crypto.randomUUID()
        const rows = generateInstallments(amount, installments, resolvedDue).map(
          (p) => ({
            description,
            type: 'parcelada' as const,
            amount_cents: p.amountCents,
            due_date: p.dueDate,
            purchase_date,
            payment_date: null,
            account_id,
            card_id,
            category_id,
            installment_group: group,
            installment_index: p.index,
            installment_count: p.count,
            notes: notes || null,
          }),
        )
        const created = (await create.mutateAsync(rows)) as Expense[]
        await uploadStaged(created[0]?.id)
        toast(`Despesa parcelada em ${installments}x criada.`)
      } else {
        const created = (await create.mutateAsync([
          {
            description,
            type: tipo,
            amount_cents: amount,
            due_date: resolvedDue,
            purchase_date,
            payment_date,
            account_id,
            card_id,
            category_id,
            notes: notes || null,
          },
        ])) as Expense[]
        await uploadStaged(created[0]?.id)
        toast('Despesa registrada.')
      }
      onClose()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível salvar.', 'error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar despesa' : 'Nova despesa'}
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
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Supermercado, Aluguel"
        />

        {!editing && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink/75">Tipo</span>
            <Segmented value={tipo} onChange={setTipo} options={TIPO_OPTIONS} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <CurrencyInput
            label={isParcelada ? 'Valor total' : 'Valor'}
            value={amount}
            onChange={setAmount}
          />
          <TextField
            label={
              payVia === 'cartao'
                ? isParcelada
                  ? 'Data da 1ª compra'
                  : 'Data'
                : isParcelada
                  ? '1º vencimento'
                  : 'Vencimento'
            }
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            hint={
              payVia === 'cartao' && cardInvoiceDue
                ? `Fatura vence em ${formatDisplayDate(cardInvoiceDue)}`
                : undefined
            }
          />
        </div>

        {isParcelada && (
          <div className="flex flex-col gap-1.5">
            <TextField
              label="Número de parcelas"
              type="number"
              min={2}
              value={String(installments)}
              onChange={(e) =>
                setInstallments(Math.max(2, Number(e.target.value) || 2))
              }
            />
            {preview && (
              <p className="font-mono text-xs text-muted">{preview}</p>
            )}
          </div>
        )}

        {/* Pagamento via conta ou cartão */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink/75">Pagar com</span>
          <Segmented
            value={payVia}
            onChange={setPayVia}
            options={[
              { value: 'conta', label: 'Conta' },
              { value: 'cartao', label: 'Cartão' },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {payVia === 'conta' ? (
            <Select
              label="Conta de origem"
              placeholder="Selecione"
              options={(accounts ?? []).map((a) => ({ value: a.id, label: a.name }))}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            />
          ) : (
            <Select
              label="Cartão"
              placeholder="Selecione"
              options={(cards ?? []).map((c) => ({ value: c.id, label: c.name }))}
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
            />
          )}
          <CategorySelectField
            kind="expense"
            value={categoryId}
            onChange={setCategoryId}
          />
        </div>

        {/* "Já paguei" — só para conta e não-parcelada */}
        {payVia === 'conta' && !isParcelada && (
          <div className="rounded-xl border border-rule bg-surface-2 px-3 py-2.5">
            <label className="flex items-center gap-2 text-sm text-ink/80">
              <input
                type="checkbox"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
                className="size-4 accent-[var(--color-brand)]"
              />
              Já foi paga
            </label>
            {isPaid && (
              <div className="mt-3">
                <TextField
                  label="Data do pagamento"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  hint="É essa data que define em qual mês a despesa impacta."
                />
              </div>
            )}
          </div>
        )}

        <TextField
          label="Observação"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Opcional"
        />

        <div className="border-t border-rule pt-4">
          {editing ? (
            <AttachmentsPanel target={{ expenseId: editing.id }} />
          ) : (
            <StagedAttachments files={stagedFiles} onChange={setStagedFiles} />
          )}
        </div>
      </div>
    </Modal>
  )
}
