import { useMemo, useState } from 'react'
import { ArrowLeftRight, ArrowRight, StickyNote, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useTransfers, useDeleteTransfer } from '@/hooks/useTransfers'
import { useAccounts } from '@/hooks/useAccounts'
import { useToast } from '@/contexts/ToastContext'
import { formatBRL } from '@/lib/money'
import { formatDisplayDate } from '@/lib/dates'
import { cn } from '@/utils/cn'

/**
 * History of transfers between the user's own accounts. Transfers don't show up
 * in Receitas/Despesas (they're internal reallocations), so this gives them a
 * clean home. Tap the note button to read the observation left on a transfer;
 * a row can be removed if it was a mistake.
 */
export function TransferHistoryModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { data: transfers, isLoading } = useTransfers()
  const { data: accounts } = useAccounts()
  const del = useDeleteTransfer()
  const { toast } = useToast()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [openNoteId, setOpenNoteId] = useState<string | null>(null)

  const accName = useMemo(
    () => new Map((accounts ?? []).map((a) => [a.id, a.name])),
    [accounts],
  )

  async function remove(id: string) {
    try {
      await del.mutateAsync(id)
      toast('Transferência excluída. Os saldos foram recalculados.')
      setConfirmingId(null)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível excluir.', 'error')
    }
  }

  const list = transfers ?? []

  return (
    <Modal open={open} onClose={onClose} title="Transferências">
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-2/50" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-brand">
            <ArrowLeftRight className="size-6" strokeWidth={1.75} />
          </span>
          <p className="text-sm text-muted">
            Nenhuma transferência ainda. Quando você mover dinheiro entre contas,
            o histórico aparece aqui.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((t) => {
            const noteOpen = openNoteId === t.id
            return (
              <li key={t.id} className="rounded-xl bg-surface-2/50">
                <div className="group flex items-center gap-3 px-3.5 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/12 text-brand">
                    <ArrowLeftRight className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-ink">
                      <span className="truncate">{accName.get(t.from_account_id ?? '') ?? 'Conta'}</span>
                      <ArrowRight className="size-3.5 shrink-0 text-faint" />
                      <span className="truncate">{accName.get(t.to_account_id ?? '') ?? 'Conta'}</span>
                    </div>
                    <div className="truncate text-xs text-muted">{formatDisplayDate(t.date)}</div>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-semibold tnum text-ink/85">
                    {formatBRL(t.amount_cents)}
                  </span>

                  {/* Ver observação */}
                  <button
                    type="button"
                    aria-label="Ver observação"
                    onClick={() => setOpenNoteId(noteOpen ? null : t.id)}
                    className={cn(
                      'grid size-8 shrink-0 place-items-center rounded-lg transition',
                      noteOpen ? 'bg-brand/12 text-brand' : 'text-muted hover:bg-surface hover:text-ink',
                      !t.note && 'text-faint',
                    )}
                  >
                    <StickyNote className="size-4" />
                  </button>

                  {/* Excluir */}
                  {confirmingId === t.id ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => remove(t.id)} disabled={del.isPending} className="rounded-lg px-2 py-1 text-xs font-semibold text-danger hover:bg-danger/10">
                        Excluir
                      </button>
                      <button type="button" onClick={() => setConfirmingId(null)} className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-surface">
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-label="Excluir transferência"
                      onClick={() => setConfirmingId(t.id)}
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-danger"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>

                {/* Observação expandida */}
                {noteOpen && (
                  <div className="border-t border-rule px-3.5 py-3">
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Observação</div>
                    {t.note ? (
                      <p className="whitespace-pre-wrap text-sm text-ink/85">{t.note}</p>
                    ) : (
                      <p className="text-sm italic text-faint">Nenhuma observação nesta transferência.</p>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
