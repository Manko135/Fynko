import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { TextField } from '@/components/ui/TextField'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { useToast } from '@/contexts/ToastContext'
import { useAccounts } from '@/hooks/useAccounts'
import { useCreateTransfer } from '@/hooks/useTransfers'
import { todayISO } from '@/lib/dates'

export function TransferModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { data: accounts } = useAccounts()
  const create = useCreateTransfer()
  const { toast } = useToast()

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')

  useEffect(() => {
    if (open) {
      setFrom('')
      setTo('')
      setAmount(0)
      setDate(todayISO())
      setNote('')
    }
  }, [open])

  const options = (accounts ?? []).map((a) => ({ value: a.id, label: a.name }))

  async function handleSave() {
    if (!from || !to) {
      toast('Escolha as contas de origem e destino.', 'error')
      return
    }
    if (from === to) {
      toast('As contas de origem e destino devem ser diferentes.', 'error')
      return
    }
    if (amount <= 0) {
      toast('Informe um valor maior que zero.', 'error')
      return
    }
    try {
      await create.mutateAsync({
        from_account_id: from,
        to_account_id: to,
        amount_cents: amount,
        date,
        note: note || null,
      })
      toast('Transferência registrada.')
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível transferir.', 'error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Transferir entre contas"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={create.isPending}>
            Transferir
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Select label="De" placeholder="Origem" options={options} value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <ArrowRight className="mb-3 size-4 shrink-0 text-faint" />
          <div className="flex-1">
            <Select label="Para" placeholder="Destino" options={options} value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <CurrencyInput label="Valor" value={amount} onChange={setAmount} />
          <TextField label="Data" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <TextField label="Observação" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
        <p className="text-xs text-muted">
          Uma transferência só realoca dinheiro entre suas contas — não conta
          como receita nem despesa, e não altera seu patrimônio total.
        </p>
      </div>
    </Modal>
  )
}
