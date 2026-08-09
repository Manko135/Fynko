import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { TextField } from '@/components/ui/TextField'
import { useAccounts } from '@/hooks/useAccounts'
import { useSettleInvoice, useParcelInvoice } from '@/hooks/useExpenses'
import { useToast } from '@/contexts/ToastContext'
import { formatBRL } from '@/lib/money'
import { addMonthsClamped, formatDisplayDate, todayISO } from '@/lib/dates'
import type { InvoiceParcel } from '@/services/expenses'

const QTD_OPTIONS = [2, 3, 4, 5, 6, 10, 12].map((n) => ({ value: String(n), label: `${n}x` }))

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
  const parcel = useParcelInvoice()
  const { toast } = useToast()

  const [accountId, setAccountId] = useState('')
  const [date, setDate] = useState(todayISO())

  // Parcelamento
  const [parcelar, setParcelar] = useState(false)
  const [nome, setNome] = useState('')
  const [qtd, setQtd] = useState(3)
  const [juros, setJuros] = useState(0)
  const [firstDate, setFirstDate] = useState(todayISO())

  useEffect(() => {
    if (!open) return
    setAccountId('')
    setDate(todayISO())
    setParcelar(false)
    setNome('')
    setQtd(3)
    setJuros(0)
    setFirstDate(todayISO())
  }, [open])

  const saving = settle.isPending || parcel.isPending

  // Parcel math: total with interest, equal parcels, last one absorbs the cents.
  const plan = useMemo(() => {
    const totalCents = Math.round(invoiceCents * (1 + juros / 100))
    const per = Math.floor(totalCents / qtd)
    const last = totalCents - per * (qtd - 1)
    const parcels: InvoiceParcel[] = Array.from({ length: qtd }, (_, i) => ({
      description: `${nome.trim() || 'Fatura'} - ${i + 1}/${qtd}`,
      amount_cents: i === qtd - 1 ? last : per,
      due_date: addMonthsClamped(firstDate, i),
    }))
    return { totalCents, per, last, parcels }
  }, [invoiceCents, juros, qtd, nome, firstDate])

  async function handleConfirm() {
    try {
      if (parcelar) {
        if (!nome.trim()) {
          toast('Dê um nome ao parcelamento.', 'error')
          return
        }
        await parcel.mutateAsync({ ids: expenseIds, parcels: plan.parcels })
        toast(`Fatura parcelada em ${qtd}x.`)
      } else {
        if (!accountId) {
          toast('Escolha a conta que pagou a fatura.', 'error')
          return
        }
        await settle.mutateAsync({ ids: expenseIds, accountId, paymentDate: date })
        toast('Fatura paga.')
      }
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível concluir.', 'error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Pagar fatura · ${cardName}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} loading={saving}>
            {parcelar ? `Parcelar em ${qtd}x` : `Pagar ${formatBRL(invoiceCents)}`}
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

        <label className="flex items-center gap-2 rounded-xl border border-rule bg-surface-2 px-3 py-2.5 text-sm text-ink/80">
          <input
            type="checkbox"
            checked={parcelar}
            onChange={(e) => setParcelar(e.target.checked)}
            className="size-4 accent-[var(--color-brand)]"
          />
          Parcelar pagamento da fatura
        </label>

        {!parcelar ? (
          <>
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
          </>
        ) : (
          <div className="flex flex-col gap-4">
            <TextField
              label="Nome do parcelamento"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Fatura PicPay"
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Quantidade de parcelas"
                options={QTD_OPTIONS}
                value={String(qtd)}
                onChange={(e) => setQtd(Number(e.target.value))}
              />
              <TextField
                label="Taxa de juros (%)"
                type="number"
                min={0}
                step="0.1"
                inputMode="decimal"
                value={String(juros)}
                onChange={(e) => setJuros(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            <TextField
              label="Data da 1ª cobrança"
              type="date"
              value={firstDate}
              onChange={(e) => setFirstDate(e.target.value)}
            />

            {/* Resumo do cálculo */}
            <div className="flex flex-col gap-1.5 rounded-xl border border-rule bg-surface-2/60 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Valor original</span>
                <span className="font-mono tnum">{formatBRL(invoiceCents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Juros</span>
                <span className="font-mono tnum">{juros}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Valor total com juros</span>
                <span className="font-mono font-semibold tnum">{formatBRL(plan.totalCents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Cada parcela</span>
                <span className="font-mono tnum">
                  {qtd}× {formatBRL(plan.per)}
                  {plan.last !== plan.per && ` (última ${formatBRL(plan.last)})`}
                </span>
              </div>
              <div className="mt-1 border-t border-rule pt-1.5 text-[11px] text-muted">
                Primeira em {formatDisplayDate(firstDate)} · gera {qtd} despesas
                "{nome.trim() || 'Fatura'} - 1/{qtd}", "2/{qtd}"…
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
