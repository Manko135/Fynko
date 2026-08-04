import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { TextField } from '@/components/ui/TextField'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { CategorySelectField } from '@/components/categories/CategorySelectField'
import { useToast } from '@/contexts/ToastContext'
import { useCards } from '@/hooks/useCards'
import { useCreateBudget, useUpdateBudget } from '@/hooks/useBudgets'
import { cn } from '@/utils/cn'
import type { Budget, BudgetScope } from '@/types/domain'

const SCOPES: { value: BudgetScope; label: string }[] = [
  { value: 'categoria', label: 'Categoria' },
  { value: 'geral', label: 'Geral' },
  { value: 'cartao', label: 'Cartão' },
]

export function BudgetFormModal({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  editing: Budget | null
}) {
  const { toast } = useToast()
  const { data: cards } = useCards()
  const create = useCreateBudget()
  const update = useUpdateBudget()

  const [title, setTitle] = useState('')
  const [scope, setScope] = useState<BudgetScope>('categoria')
  const [categoryId, setCategoryId] = useState('')
  const [cardId, setCardId] = useState('')
  const [amount, setAmount] = useState(0)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setTitle(editing.title ?? '')
      setScope(editing.scope)
      setCategoryId(editing.category_id ?? '')
      setCardId(editing.card_id ?? '')
      setAmount(editing.amount_cents)
    } else {
      setTitle('')
      setScope('categoria')
      setCategoryId('')
      setCardId('')
      setAmount(0)
    }
  }, [open, editing])

  const saving = create.isPending || update.isPending

  async function handleSave() {
    if (scope === 'categoria' && !categoryId) return toast('Escolha a categoria.', 'error')
    if (scope === 'cartao' && !cardId) return toast('Escolha o cartão.', 'error')
    if (amount <= 0) return toast('Informe o limite.', 'error')
    const payload = {
      title: title.trim() || null,
      scope,
      category_id: scope === 'categoria' ? categoryId : null,
      card_id: scope === 'cartao' ? cardId : null,
      amount_cents: amount,
    }
    try {
      if (editing) await update.mutateAsync({ id: editing.id, patch: payload })
      else await create.mutateAsync(payload)
      toast(editing ? 'Limite atualizado.' : 'Limite criado.')
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível salvar.', 'error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar limite' : 'Novo limite'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {editing ? 'Salvar' : 'Criar limite'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Mercado, Gastos com carro, Contas da casa"
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink/75">Tipo de limite</span>
          <div className="flex rounded-xl border border-rule bg-surface-2 p-1">
            {SCOPES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setScope(s.value)}
                className={cn(
                  'flex-1 rounded-lg py-1.5 text-sm font-medium transition',
                  scope === s.value ? 'bg-brand-solid text-on-brand' : 'text-ink/65',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {scope === 'categoria' && (
          <CategorySelectField
            kind="expense"
            value={categoryId}
            onChange={setCategoryId}
          />
        )}
        {scope === 'cartao' && (
          <Select
            label="Cartão"
            placeholder="Selecione"
            options={(cards ?? []).map((c) => ({ value: c.id, label: c.name }))}
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
          />
        )}
        {scope === 'geral' && (
          <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
            Um teto para o total de gastos do mês, somando todas as categorias.
          </p>
        )}

        <CurrencyInput label="Limite mensal" value={amount} onChange={setAmount} />
      </div>
    </Modal>
  )
}
