import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { TextField } from '@/components/ui/TextField'
import { useAccounts } from '@/hooks/useAccounts'
import { useSettleInvoice } from '@/hooks/useExpenses'
import { useToast } from '@/contexts/ToastContext'
import { formatBRL } from '@/lib/money'
import { todayISO } from '@/lib/dates'

export function PayInvoiceModal({
  open,
  onClose,
  cardName,
  invoiceCents,
  expenseIds,
}: {
  open: boolean
  onClose: () => void
  cardName: string
  invoiceCents: number
  expenseIds: string[]
}) {
  const { data: accounts } = useAccounts()
  const settle = useSettleInvoice()
  const { toast } = useToast()
  const [accountId, setAccountId] = useState('')
  const [date, setDate] = useState(todayISO())

  useEffect(() => {
    if (open) {
      setAccountId('')
      setDate(todayISO())
    }
  }, [open])

  async function handlePay() {
    if (!accountId) {
      toast('Escolha a conta que pagou a fatura.', 'error')
      return
    }
    try {
      await settle.mutateAsync({ ids: expenseIds, accountId, paymentDate: date })
      toast('Fatura paga.')
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível pagar.', 'error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Pagar fatura · ${cardName}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={settle.isPending}>
            Cancelar
          </Button>
          <Button onClick={handlePay} loading={settle.isPending}>
            Pagar {formatBRL(invoiceCents)}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-xl bg-surface-2 px-4 py-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
            Fatura atual
          </div>
          <div className="font-display text-2xl font-bold tnum">
            {formatBRL(invoiceCents)}
          </div>
          <div className="mt-1 text-xs text-muted">
            {expenseIds.length} lançamento{expenseIds.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Pagar com a conta"
            placeholder="Selecione"
            options={(accounts ?? []).map((a) => ({ value: a.id, label: a.name }))}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          />
          <TextField
            label="Data do pagamento"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted">
          A conta escolhida é debitada nessa data e os lançamentos da fatura
          passam a contar como pagos.
        </p>
      </div>
    </Modal>
  )
}
