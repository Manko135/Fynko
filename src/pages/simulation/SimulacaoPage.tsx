import { useState } from 'react'
import { Calculator, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SimulationEditor } from './SimulationEditor'
import { SimulationDetails } from './SimulationDetails'
import { SimulationCard } from './SimulationCard'
import {
  useSimulations,
  useDeleteSimulation,
  useDuplicateSimulation,
  useUpdateSimulation,
} from '@/hooks/useSimulations'
import { useProjection } from '@/hooks/useProjection'
import { useCreateExpenses } from '@/hooks/useExpenses'
import { useReconcileSubscriptions } from '@/hooks/useSubscriptions'
import { useReconcileRecurringIncomes } from '@/hooks/useRecurringIncomes'
import { useToast } from '@/contexts/ToastContext'
import type { Simulation } from '@/types/domain'

type View =
  | { mode: 'list' }
  | { mode: 'edit'; sim: Simulation | null }
  | { mode: 'details'; sim: Simulation }

export function SimulacaoPage() {
  // Keep the real data fresh so "saldo atual" is accurate (same as other pages).
  useReconcileSubscriptions()
  useReconcileRecurringIncomes()

  const { data: simulations, isLoading } = useSimulations()
  const { project } = useProjection()
  const del = useDeleteSimulation()
  const dup = useDuplicateSimulation()
  const update = useUpdateSimulation()
  const createExpenses = useCreateExpenses()
  const { toast } = useToast()

  const [view, setView] = useState<View>({ mode: 'list' })
  const [deleting, setDeleting] = useState<Simulation | null>(null)
  const [converting, setConverting] = useState<Simulation | null>(null)

  async function confirmDelete() {
    if (!deleting) return
    try {
      await del.mutateAsync(deleting.id)
      toast('Simulação excluída.')
      setDeleting(null)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível excluir.', 'error')
    }
  }

  async function duplicate(s: Simulation) {
    try {
      await dup.mutateAsync(s)
      toast('Simulação duplicada.')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível duplicar.', 'error')
    }
  }

  async function confirmConvert() {
    if (!converting) return
    const rows = converting.items.map((it) => ({
      description: it.description,
      type: 'variavel' as const,
      amount_cents: it.amount_cents,
      due_date: converting.target_date,
      payment_date: null,
      account_id: null,
      card_id: null,
      category_id: it.category_id,
      notes: it.notes,
    }))
    if (rows.length === 0) {
      toast('Esta simulação não tem gastos para converter.', 'error')
      setConverting(null)
      return
    }
    try {
      await createExpenses.mutateAsync(rows)
      await update.mutateAsync({ id: converting.id, patch: { converted_at: new Date().toISOString() } })
      toast(`${rows.length} despesa(s) criada(s) a partir da simulação.`)
      setConverting(null)
      setView({ mode: 'list' })
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível converter.', 'error')
    }
  }

  // --- Full-screen sub-views -------------------------------------------------
  if (view.mode === 'edit') {
    return (
      <>
        <SimulationEditor
          editing={view.sim}
          onDone={() => setView({ mode: 'list' })}
          onCancel={() => setView({ mode: 'list' })}
        />
        <ConvertDialog converting={converting} setConverting={setConverting} onConfirm={confirmConvert} loading={createExpenses.isPending || update.isPending} />
      </>
    )
  }

  if (view.mode === 'details') {
    return (
      <>
        <SimulationDetails
          sim={view.sim}
          onBack={() => setView({ mode: 'list' })}
          onEdit={() => setView({ mode: 'edit', sim: view.sim })}
          onConvert={() => setConverting(view.sim)}
        />
        <ConvertDialog converting={converting} setConverting={setConverting} onConfirm={confirmConvert} loading={createExpenses.isPending || update.isPending} />
      </>
    )
  }

  // --- List ------------------------------------------------------------------
  const list = simulations ?? []
  const isEmpty = !isLoading && list.length === 0

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <p className="max-w-md text-sm text-muted">
          Simule um gasto numa data futura e veja, considerando tudo que já está
          previsto até lá, quanto você teria depois — sem mexer nos seus dados reais.
        </p>
        {!isEmpty && (
          <Button icon={<Plus className="size-4" strokeWidth={2.5} />} onClick={() => setView({ mode: 'edit', sim: null })}>
            Nova simulação
          </Button>
        )}
      </div>

      {isEmpty && (
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-20 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-brand">
            <Calculator className="size-7" strokeWidth={1.75} />
          </span>
          <h2 className="font-display text-xl font-bold">E se você gastasse…?</h2>
          <p className="text-sm text-muted">
            Crie uma simulação, adicione os gastos e escolha a data. O Fynko projeta
            seu saldo usando suas receitas, despesas, assinaturas e parcelas reais.
          </p>
          <Button icon={<Plus className="size-4" strokeWidth={2.5} />} onClick={() => setView({ mode: 'edit', sim: null })}>
            Criar primeira simulação
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="grid gap-5 sm:grid-cols-2">
          {[0, 1].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-surface" />)}
        </div>
      )}

      {list.length > 0 && (
        <>
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.15em] text-muted">Minhas simulações</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {list.map((s) => (
              <SimulationCard
                key={s.id}
                sim={s}
                projection={project(s.target_date)}
                onOpen={() => setView({ mode: 'details', sim: s })}
                onEdit={() => setView({ mode: 'edit', sim: s })}
                onDuplicate={() => duplicate(s)}
                onDelete={() => setDeleting(s)}
                onConvert={() => setConverting(s)}
              />
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Excluir simulação"
        message={`Excluir "${deleting?.name}"? Essa ação não pode ser desfeita.`}
        loading={del.isPending}
      />
      <ConvertDialog converting={converting} setConverting={setConverting} onConfirm={confirmConvert} loading={createExpenses.isPending || update.isPending} />
    </div>
  )
}

function ConvertDialog({
  converting,
  setConverting,
  onConfirm,
  loading,
}: {
  converting: Simulation | null
  setConverting: (s: Simulation | null) => void
  onConfirm: () => void
  loading: boolean
}) {
  return (
    <ConfirmDialog
      open={!!converting}
      onClose={() => setConverting(null)}
      onConfirm={onConfirm}
      title="Transformar em despesa"
      message={`Criar ${converting?.items.length ?? 0} despesa(s) reais com vencimento em ${
        converting ? new Date(converting.target_date + 'T00:00').toLocaleDateString('pt-BR') : ''
      }? A simulação fica marcada como "Convertida".`}
      loading={loading}
    />
  )
}
