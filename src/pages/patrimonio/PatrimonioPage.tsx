import { useMemo, useState } from 'react'
import { Landmark, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PatrimonioItemModal, type ItemKind } from './PatrimonioItemModal'
import { useAccounts } from '@/hooks/useAccounts'
import { useBalances } from '@/hooks/useBalances'
import {
  useAssets,
  useLiabilities,
  useDeleteAsset,
  useDeleteLiability,
} from '@/hooks/usePatrimonio'
import { useToast } from '@/contexts/ToastContext'
import { useCryptoMarkets } from '@/hooks/useCryptoMarkets'
import { formatBRL } from '@/lib/money'
import { formatCryptoAmount, liveCryptoValueCents } from '@/lib/crypto'
import type { Asset, Liability } from '@/types/domain'

type Row = { id: string; name: string; subtitle: string; valueCents: number; editable: boolean; item?: Asset | Liability }

function ItemRow({
  row,
  tone,
  onEdit,
  onDelete,
}: {
  row: Row
  tone: string
  onEdit?: () => void
  onDelete?: () => void
}) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-rule bg-surface px-4 py-3 transition-colors hover:bg-surface-2/50">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{row.name}</div>
        <div className="truncate text-xs text-muted">{row.subtitle}</div>
      </div>
      <span className={`font-mono text-sm font-medium tnum ${tone}`}>
        {formatBRL(row.valueCents)}
      </span>
      {row.editable && (
        <div className="flex gap-1 opacity-100 transition focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
          <button type="button" aria-label="Editar" onClick={onEdit} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2">
            <Pencil className="size-4" />
          </button>
          <button type="button" aria-label="Excluir" onClick={onDelete} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-danger">
            <Trash2 className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export function PatrimonioPage() {
  const { data: accounts } = useAccounts()
  const { byAccount } = useBalances()
  const { data: assets } = useAssets()
  const { data: liabilities } = useLiabilities()
  const delAsset = useDeleteAsset()
  const delLiab = useDeleteLiability()
  const { toast } = useToast()
  const { data: markets } = useCryptoMarkets('brl')

  // Crypto assets reprice live from the current quote; others use their stored value.
  const assetValue = (a: Asset) =>
    liveCryptoValueCents(a.crypto_symbol, a.crypto_amount, markets?.[a.crypto_symbol ?? '']?.price) ??
    a.value_cents

  const [modalKind, setModalKind] = useState<ItemKind>('asset')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Asset | Liability | null>(null)
  const [deleting, setDeleting] = useState<{ kind: ItemKind; item: Asset | Liability } | null>(null)

  const accountRows: Row[] = useMemo(
    () =>
      (accounts ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        subtitle: `Conta · ${a.bank ?? a.type}`,
        valueCents: byAccount.get(a.id) ?? a.initial_balance_cents,
        editable: false,
      })),
    [accounts, byAccount],
  )

  const accountsTotal = accountRows.reduce((s, r) => s + r.valueCents, 0)
  const assetsTotal = (assets ?? []).reduce((s, a) => s + assetValue(a), 0)
  const liabTotal = (liabilities ?? []).reduce((s, l) => s + l.value_cents, 0)
  const ativos = accountsTotal + assetsTotal
  const liquido = ativos - liabTotal

  function openNew(kind: ItemKind) {
    setModalKind(kind)
    setEditing(null)
    setModalOpen(true)
  }
  function openEdit(kind: ItemKind, item: Asset | Liability) {
    setModalKind(kind)
    setEditing(item)
    setModalOpen(true)
  }
  async function confirmDelete() {
    if (!deleting) return
    try {
      if (deleting.kind === 'asset') await delAsset.mutateAsync(deleting.item.id)
      else await delLiab.mutateAsync(deleting.item.id)
      toast('Item excluído.')
      setDeleting(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível excluir.', 'error')
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      {/* Net worth hero */}
      <div
        className="relative overflow-hidden rounded-2xl border border-ink/10 p-6"
        style={{
          background:
            'linear-gradient(150deg, color-mix(in oklab, var(--color-teal) 14%, var(--color-surface)) 0%, var(--color-surface) 60%)',
        }}
      >
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          Patrimônio líquido
        </div>
        <div className="mt-1 font-display text-4xl font-bold tnum">
          {formatBRL(liquido)}
        </div>
        <div className="mt-3 flex gap-6 text-sm">
          <span className="text-ink/70">
            Ativos <span className="font-mono text-positive tnum">{formatBRL(ativos)}</span>
          </span>
          <span className="text-ink/70">
            Passivos <span className="font-mono text-danger tnum">{formatBRL(liabTotal)}</span>
          </span>
        </div>
      </div>

      {/* Ativos */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-sm font-bold text-ink/80">
            <Wallet className="size-4 text-positive" /> Ativos
          </h3>
          <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => openNew('asset')}>
            Novo ativo
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {accountRows.map((r) => (
            <ItemRow key={r.id} row={r} tone="text-positive" />
          ))}
          {(assets ?? []).map((a) => (
            <ItemRow
              key={a.id}
              row={{
                id: a.id,
                name: a.name,
                subtitle: a.crypto_symbol ? `${formatCryptoAmount(a.crypto_amount ?? 0)} ${a.crypto_symbol}` : a.category,
                valueCents: assetValue(a),
                editable: true,
              }}
              tone="text-positive"
              onEdit={() => openEdit('asset', a)}
              onDelete={() => setDeleting({ kind: 'asset', item: a })}
            />
          ))}
          {accountRows.length === 0 && (assets ?? []).length === 0 && (
            <p className="rounded-xl border border-dashed border-rule px-4 py-6 text-center text-sm text-muted">
              Suas contas aparecem aqui automaticamente. Adicione bens como imóveis, veículos e investimentos.
            </p>
          )}
        </div>
      </section>

      {/* Passivos */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-sm font-bold text-ink/80">
            <Landmark className="size-4 text-danger" /> Passivos
          </h3>
          <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => openNew('liability')}>
            Novo passivo
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {(liabilities ?? []).map((l) => (
            <ItemRow
              key={l.id}
              row={{ id: l.id, name: l.name, subtitle: l.category, valueCents: l.value_cents, editable: true }}
              tone="text-danger"
              onEdit={() => openEdit('liability', l)}
              onDelete={() => setDeleting({ kind: 'liability', item: l })}
            />
          ))}
          {(liabilities ?? []).length === 0 && (
            <p className="rounded-xl border border-dashed border-rule px-4 py-6 text-center text-sm text-muted">
              Empréstimos, financiamentos e dívidas entram aqui e reduzem seu patrimônio líquido.
            </p>
          )}
        </div>
      </section>

      <PatrimonioItemModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        kind={modalKind}
        editing={editing}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Excluir item"
        message={`Excluir "${deleting?.item.name}"?`}
        loading={delAsset.isPending || delLiab.isPending}
      />
    </div>
  )
}
