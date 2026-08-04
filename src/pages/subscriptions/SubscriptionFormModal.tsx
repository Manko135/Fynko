import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { Select } from '@/components/ui/Select'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { useToast } from '@/contexts/ToastContext'
import { useAccounts } from '@/hooks/useAccounts'
import { useCards } from '@/hooks/useCards'
import { useCreateSubscription, useUpdateSubscription } from '@/hooks/useSubscriptions'
import { DEFAULT_COLOR } from '@/lib/palette'
import { todayISO } from '@/lib/dates'
import { cn } from '@/utils/cn'
import type {
  Subscription,
  SubscriptionFrequency,
  SubscriptionStatus,
} from '@/types/domain'
import type { SubscriptionInput } from '@/services/subscriptions'

const FREQ: { value: SubscriptionFrequency; label: string }[] = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'anual', label: 'Anual' },
  { value: 'personalizada', label: 'Personalizada' },
]
const STATUS: { value: SubscriptionStatus; label: string }[] = [
  { value: 'ativa', label: 'Ativa' },
  { value: 'pausada', label: 'Pausada' },
  { value: 'cancelada', label: 'Cancelada' },
]

// Presets for the "Personalizada" recurrence, in days.
const INTERVAL_PRESETS = [
  { value: '7', label: 'Semanal (7 dias)' },
  { value: '15', label: 'Quinzenal (15 dias)' },
  { value: '60', label: 'Bimestral (60 dias)' },
  { value: '90', label: 'Trimestral (90 dias)' },
  { value: '180', label: 'Semestral (180 dias)' },
  { value: 'custom', label: 'Dias personalizados' },
]
const PRESET_DAYS = new Set([7, 15, 60, 90, 180])

function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex rounded-xl border border-rule bg-surface-2 p-1">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={cn('flex-1 rounded-lg py-1.5 text-sm font-medium transition', value === o.value ? 'bg-brand-solid text-on-brand' : 'text-ink/65')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function SubscriptionFormModal({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  editing: Subscription | null
}) {
  const { toast } = useToast()
  const { data: accounts } = useAccounts()
  const { data: cards } = useCards()
  const create = useCreateSubscription()
  const update = useUpdateSubscription()

  const [name, setName] = useState('')
  const [amount, setAmount] = useState(0)
  const [freq, setFreq] = useState<SubscriptionFrequency>('mensal')
  const [intervalPreset, setIntervalPreset] = useState('7')
  const [customDays, setCustomDays] = useState(30)
  const [nextDue, setNextDue] = useState(todayISO())
  const [payVia, setPayVia] = useState<'conta' | 'cartao'>('conta')
  const [accountId, setAccountId] = useState('')
  const [cardId, setCardId] = useState('')
  const [status, setStatus] = useState<SubscriptionStatus>('ativa')
  const [color, setColor] = useState<string>(DEFAULT_COLOR)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    if (editing) {
      setName(editing.name)
      setAmount(editing.amount_cents)
      setFreq(editing.frequency)
      {
        const d = editing.interval_days ?? 0
        const isPreset = PRESET_DAYS.has(d)
        setIntervalPreset(isPreset ? String(d) : d > 0 ? 'custom' : '7')
        setCustomDays(d > 0 && !isPreset ? d : 30)
      }
      setNextDue(editing.next_due)
      setPayVia(editing.card_id ? 'cartao' : 'conta')
      setAccountId(editing.account_id ?? '')
      setCardId(editing.card_id ?? '')
      setStatus(editing.status)
      setColor(editing.color ?? DEFAULT_COLOR)
      setNotes(editing.notes ?? '')
    } else {
      setName(''); setAmount(0); setFreq('mensal'); setNextDue(todayISO())
      setIntervalPreset('7'); setCustomDays(30)
      setPayVia('conta'); setAccountId(''); setCardId(''); setStatus('ativa')
      setColor(DEFAULT_COLOR); setNotes('')
    }
  }, [open, editing])

  const saving = create.isPending || update.isPending
  const effectiveInterval = intervalPreset === 'custom' ? customDays : Number(intervalPreset)

  async function handleSave() {
    if (!name.trim()) return toast('Dê um nome à assinatura.', 'error')
    if (amount <= 0) return toast('Informe o valor.', 'error')
    if (freq === 'personalizada' && (!effectiveInterval || effectiveInterval < 1))
      return toast('Informe o intervalo da recorrência (mínimo 1 dia).', 'error')
    if (payVia === 'conta' && !accountId) return toast('Escolha a conta de pagamento.', 'error')
    if (payVia === 'cartao' && !cardId) return toast('Escolha o cartão.', 'error')

    const payload: SubscriptionInput = {
      name,
      amount_cents: amount,
      account_id: payVia === 'conta' ? accountId : null,
      card_id: payVia === 'cartao' ? cardId : null,
      frequency: freq,
      interval_days: freq === 'personalizada' ? effectiveInterval : null,
      next_due: nextDue,
      status,
      color,
      notes: notes || null,
    }
    try {
      if (editing) await update.mutateAsync({ id: editing.id, patch: payload })
      else await create.mutateAsync(payload)
      toast(editing ? 'Assinatura atualizada.' : 'Assinatura criada.')
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível salvar.', 'error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar assinatura' : 'Nova assinatura'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>{editing ? 'Salvar' : 'Criar'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Netflix, Spotify, ChatGPT" />
        <div className="grid grid-cols-2 gap-4">
          <CurrencyInput label="Valor" value={amount} onChange={setAmount} />
          <TextField label="Próximo vencimento" type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink/75">Frequência</span>
          <Seg value={freq} onChange={setFreq} options={FREQ} />
        </div>

        {freq === 'personalizada' && (
          <div className="flex flex-col gap-3 rounded-xl border border-rule bg-surface-2/60 p-3">
            {intervalPreset === 'custom' ? (
              <div className="grid grid-cols-2 gap-4">
                <Select label="Intervalo" options={INTERVAL_PRESETS} value={intervalPreset} onChange={(e) => setIntervalPreset(e.target.value)} />
                <TextField
                  label="A cada quantos dias?"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={customDays ? String(customDays) : ''}
                  onChange={(e) => setCustomDays(Math.max(1, Number(e.target.value) || 0))}
                  placeholder="Ex: 45"
                />
              </div>
            ) : (
              <Select label="Intervalo" options={INTERVAL_PRESETS} value={intervalPreset} onChange={(e) => setIntervalPreset(e.target.value)} />
            )}
            <p className="text-xs text-muted">
              As próximas cobranças serão geradas automaticamente a cada{' '}
              <strong className="text-ink/80">{effectiveInterval || '—'} dias</strong>.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink/75">Pagar com</span>
          <Seg value={payVia} onChange={setPayVia} options={[{ value: 'conta', label: 'Conta' }, { value: 'cartao', label: 'Cartão' }]} />
        </div>
        {payVia === 'conta' ? (
          <Select label="Conta de pagamento" placeholder="Selecione" options={(accounts ?? []).map((a) => ({ value: a.id, label: a.name }))} value={accountId} onChange={(e) => setAccountId(e.target.value)} />
        ) : (
          <Select label="Cartão" placeholder="Selecione" options={(cards ?? []).map((c) => ({ value: c.id, label: c.name }))} value={cardId} onChange={(e) => setCardId(e.target.value)} />
        )}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink/75">Status</span>
          <Seg value={status} onChange={setStatus} options={STATUS} />
        </div>
        <ColorPicker value={color} onChange={setColor} />
        <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
          A cobrança da assinatura aparece automaticamente em Despesas, na
          categoria Assinaturas — é o mesmo lançamento, não uma cópia.
        </p>
      </div>
    </Modal>
  )
}
