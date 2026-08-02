import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { useToast } from '@/contexts/ToastContext'
import { useAddContribution } from '@/hooks/useGoals'
import { todayISO } from '@/lib/dates'
import { cn } from '@/utils/cn'
import type { Goal } from '@/types/domain'

type Kind = 'aporte' | 'retirada'

export function ContributionModal({
  open,
  onClose,
  goal,
}: {
  open: boolean
  onClose: () => void
  goal: Goal | null
}) {
  const { toast } = useToast()
  const add = useAddContribution()
  const [kind, setKind] = useState<Kind>('aporte')
  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')

  useEffect(() => {
    if (open) {
      setKind('aporte')
      setAmount(0)
      setDate(todayISO())
      setNote('')
    }
  }, [open])

  async function handleSave() {
    if (!goal) return
    if (amount <= 0) {
      toast('Informe um valor.', 'error')
      return
    }
    try {
      await add.mutateAsync({
        goal_id: goal.id,
        amount_cents: kind === 'aporte' ? amount : -amount,
        date,
        note: note || null,
      })
      toast(kind === 'aporte' ? 'Aporte registrado.' : 'Retirada registrada.')
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível salvar.', 'error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Movimentar · ${goal?.name ?? ''}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={add.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={add.isPending}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex rounded-xl border border-rule bg-surface-2 p-1">
          {(['aporte', 'retirada'] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                'flex-1 rounded-lg py-1.5 text-sm font-medium capitalize transition',
                kind === k ? 'bg-brand-solid text-on-brand' : 'text-ink/65',
              )}
            >
              {k === 'aporte' ? 'Adicionar' : 'Retirar'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <CurrencyInput label="Valor" value={amount} onChange={setAmount} />
          <TextField
            label="Data"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <TextField
          label="Observação"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Opcional"
        />
      </div>
    </Modal>
  )
}
