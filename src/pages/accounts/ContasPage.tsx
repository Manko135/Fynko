import { useState } from 'react'
import { ArrowLeftRight, History, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { AccountFormModal } from './AccountFormModal'
import { TransferModal } from './TransferModal'
import { TransferHistoryModal } from './TransferHistoryModal'
import { BankBadge } from '@/components/accounts/BankBadge'
import { useAccounts, useDeleteAccount } from '@/hooks/useAccounts'
import { useBalances } from '@/hooks/useBalances'
import { useToast } from '@/contexts/ToastContext'
import { formatBRL } from '@/lib/money'
import { ACCOUNT_TYPE_LABELS, type Account } from '@/types/domain'
import { DEFAULT_COLOR } from '@/lib/palette'

function AccountCard({
  account,
  balance,
  onEdit,
  onDelete,
}: {
  account: Account
  balance: number
  onEdit: () => void
  onDelete: () => void
}) {
  const color = account.color ?? DEFAULT_COLOR
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-rule bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <span
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ background: color }}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <BankBadge name={account.name} bank={account.bank} color={color} size={36} />
            <div className="min-w-0">
              <div className="truncate font-semibold">{account.name}</div>
              <div className="truncate text-xs text-muted">
                {account.bank ? `${account.bank} · ` : ''}
                {ACCOUNT_TYPE_LABELS[account.type]}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-1 opacity-100 transition focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Editar conta"
            className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Excluir conta"
            className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-danger"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
      <div className="mt-4 pl-2">
        <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
          Saldo atual
        </div>
        <div className="mt-0.5 font-display text-2xl font-bold tnum">
          {formatBRL(balance)}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-brand">
        <Wallet className="size-7" strokeWidth={1.75} />
      </span>
      <h2 className="font-display text-xl font-bold">Suas contas ficam aqui</h2>
      <p className="text-sm text-muted">
        Cadastre onde seu dinheiro está (banco, carteira digital ou espécie) e
        acompanhe o saldo de cada uma.
      </p>
      <Button icon={<Plus className="size-4" strokeWidth={2.5} />} onClick={onNew}>
        Criar primeira conta
      </Button>
    </div>
  )
}

export function ContasPage() {
  const { data: accounts, isLoading, isError } = useAccounts()
  const { byAccount, saldoAtualCents } = useBalances()
  const del = useDeleteAccount()
  const { toast } = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [deleting, setDeleting] = useState<Account | null>(null)

  function openNew() {
    setEditing(null)
    setFormOpen(true)
  }
  function openEdit(account: Account) {
    setEditing(account)
    setFormOpen(true)
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await del.mutateAsync(deleting.id)
      toast('Conta excluída.')
      setDeleting(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível excluir.', 'error')
    }
  }

  const total = saldoAtualCents

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
            Saldo somado
          </div>
          <div className="font-display text-2xl font-bold tnum">
            {formatBRL(total)}
          </div>
        </div>
        {accounts && accounts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              icon={<History className="size-4" />}
              onClick={() => setHistoryOpen(true)}
            >
              Transferências
            </Button>
            <Button
              variant="secondary"
              icon={<ArrowLeftRight className="size-4" />}
              onClick={() => setTransferOpen(true)}
            >
              Transferir
            </Button>
            <Button
              icon={<Plus className="size-4" strokeWidth={2.5} />}
              onClick={openNew}
            >
              Nova conta
            </Button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl border border-rule bg-surface"
            />
          ))}
        </div>
      )}

      {isError && (
        <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          Não foi possível carregar suas contas. Recarregue a página.
        </p>
      )}

      {accounts && accounts.length === 0 && <EmptyState onNew={openNew} />}

      {accounts && accounts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => (
            <AccountCard
              key={a.id}
              account={a}
              balance={byAccount.get(a.id) ?? a.initial_balance_cents}
              onEdit={() => openEdit(a)}
              onDelete={() => setDeleting(a)}
            />
          ))}
        </div>
      )}

      <AccountFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
      />
      <TransferModal open={transferOpen} onClose={() => setTransferOpen(false)} />
      <TransferHistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Excluir conta"
        message={`Tem certeza que deseja excluir "${deleting?.name}"? Lançamentos ligados a ela ficam sem conta, mas não são apagados.`}
        loading={del.isPending}
      />
    </div>
  )
}
