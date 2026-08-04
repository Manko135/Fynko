import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { Select } from '@/components/ui/Select'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { CoinSelect } from '@/components/crypto/CoinSelect'
import { useToast } from '@/contexts/ToastContext'
import {
  useCreateAsset,
  useCreateLiability,
  useUpdateAsset,
  useUpdateLiability,
} from '@/hooks/usePatrimonio'
import { useCryptoMarkets } from '@/hooks/useCryptoMarkets'
import {
  CRYPTO_BY_SYMBOL,
  CRYPTO_CATEGORY,
  CRYPTO_MANUAL,
  liveCryptoValueCents,
} from '@/lib/crypto'
import { formatBRL } from '@/lib/money'
import type { Asset, Liability } from '@/types/domain'

export type ItemKind = 'asset' | 'liability'

const ASSET_CATS = ['Dinheiro', 'Investimento', 'Ações', 'FII', CRYPTO_CATEGORY, 'Imóvel', 'Veículo', 'Outro']
const LIAB_CATS = ['Empréstimo', 'Financiamento', 'Dívida', 'Parcelamento', 'Outro']

export function PatrimonioItemModal({
  open,
  onClose,
  kind,
  editing,
}: {
  open: boolean
  onClose: () => void
  kind: ItemKind
  editing: Asset | Liability | null
}) {
  const { toast } = useToast()
  const createA = useCreateAsset()
  const updateA = useUpdateAsset()
  const createL = useCreateLiability()
  const updateL = useUpdateLiability()
  const { data: markets } = useCryptoMarkets('brl')

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [value, setValue] = useState(0)
  const [cryptoSymbol, setCryptoSymbol] = useState('')
  const [cryptoAmount, setCryptoAmount] = useState(0)
  const [acquired, setAcquired] = useState('')
  const [notes, setNotes] = useState('')

  const cats = kind === 'asset' ? ASSET_CATS : LIAB_CATS

  useEffect(() => {
    if (!open) return
    if (editing) {
      setName(editing.name)
      setCategory(editing.category)
      setValue(editing.value_cents)
      const sym = 'crypto_symbol' in editing ? editing.crypto_symbol : null
      setCryptoSymbol(sym ?? (editing.category === CRYPTO_CATEGORY ? CRYPTO_MANUAL : ''))
      setCryptoAmount('crypto_amount' in editing ? (editing.crypto_amount ?? 0) : 0)
      setAcquired('acquired_date' in editing ? (editing.acquired_date ?? '') : '')
      setNotes(editing.notes ?? '')
    } else {
      setName('')
      setCategory(cats[0])
      setValue(0)
      setCryptoSymbol('')
      setCryptoAmount(0)
      setAcquired('')
      setNotes('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, kind])

  const saving = createA.isPending || updateA.isPending || createL.isPending || updateL.isPending

  const isCrypto = kind === 'asset' && category === CRYPTO_CATEGORY
  const isSyncedCoin = isCrypto && !!cryptoSymbol && cryptoSymbol !== CRYPTO_MANUAL
  const livePrice = isSyncedCoin ? markets?.[cryptoSymbol]?.price : undefined
  const liveCents = liveCryptoValueCents(cryptoSymbol, cryptoAmount, livePrice)

  async function handleSave() {
    if (!name.trim()) {
      toast('Dê um nome ao item.', 'error')
      return
    }
    if (isSyncedCoin && cryptoAmount <= 0) {
      toast('Informe a quantidade da moeda.', 'error')
      return
    }
    try {
      if (kind === 'asset') {
        const payload = {
          name,
          category,
          // Synced coin: snapshot the live value (recomputed live when shown).
          value_cents: isSyncedCoin ? liveCents ?? value : value,
          crypto_symbol: isSyncedCoin ? cryptoSymbol : null,
          crypto_amount: isSyncedCoin ? cryptoAmount : null,
          acquired_date: acquired || null,
          notes: notes || null,
        }
        if (editing) await updateA.mutateAsync({ id: editing.id, patch: payload })
        else await createA.mutateAsync(payload)
      } else {
        const payload = { name, category, value_cents: value, notes: notes || null }
        if (editing) await updateL.mutateAsync({ id: editing.id, patch: payload })
        else await createL.mutateAsync(payload)
      }
      toast(editing ? 'Item atualizado.' : 'Item adicionado.')
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível salvar.', 'error')
    }
  }

  const noun = kind === 'asset' ? 'ativo' : 'passivo'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Editar ${noun}` : `Novo ${noun}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {editing ? 'Salvar' : 'Adicionar'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={kind === 'asset' ? 'Ex: Apartamento, Tesouro Selic' : 'Ex: Financiamento do carro'}
        />

        {isCrypto ? (
          <>
            <Select
              label="Categoria"
              options={cats.map((c) => ({ value: c, label: c }))}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <CoinSelect
              value={cryptoSymbol}
              onChange={(sym) => {
                setCryptoSymbol(sym)
                const coin = CRYPTO_BY_SYMBOL.get(sym)
                if (coin && !name.trim()) setName(coin.name)
              }}
            />
            {isSyncedCoin ? (
              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="Quantidade"
                  type="number"
                  step="any"
                  min={0}
                  inputMode="decimal"
                  value={cryptoAmount ? String(cryptoAmount) : ''}
                  onChange={(e) => setCryptoAmount(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="Ex: 0.5"
                />
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ink/75">Valor atual</span>
                  <div className="rounded-xl border border-rule bg-surface-2 px-3 py-2.5 font-mono text-ink tnum">
                    {liveCents != null ? formatBRL(liveCents) : livePrice == null ? 'Carregando…' : '—'}
                  </div>
                </div>
              </div>
            ) : (
              <CurrencyInput label="Valor" value={value} onChange={setValue} />
            )}
            {isSyncedCoin && (
              <p className="-mt-1 text-xs text-muted">
                O valor é atualizado automaticamente pela cotação da moeda.
              </p>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Categoria"
              options={cats.map((c) => ({ value: c, label: c }))}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <CurrencyInput label="Valor" value={value} onChange={setValue} />
          </div>
        )}

        {kind === 'asset' && (
          <TextField
            label="Data de aquisição"
            type="date"
            value={acquired}
            onChange={(e) => setAcquired(e.target.value)}
          />
        )}
        <TextField
          label="Observações"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Opcional"
        />
      </div>
    </Modal>
  )
}
