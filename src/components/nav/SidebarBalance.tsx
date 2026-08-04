import { CalendarDays, TrendingUp } from 'lucide-react'
import { useAccounts } from '@/hooks/useAccounts'
import { useBalances } from '@/hooks/useBalances'
import { useBalanceMode } from '@/hooks/useBalanceMode'
import { formatBRL } from '@/lib/money'

/**
 * Signature element: the live "Saldo em caixa" card. Shows the real current
 * balance across accounts (initial balances + income received − expenses paid,
 * via the finance engine). Premium treatment: warm gradient, real gold coin.
 */
export function SidebarBalance() {
  const { data: accounts } = useAccounts()
  const { saldoAtualCents, saldoMesCents, isLoading } = useBalances()
  const mode = useBalanceMode()

  const monthly = mode === 'mensal'
  const total = monthly ? saldoMesCents : saldoAtualCents
  const count = accounts?.length ?? 0
  const monthLabel = new Date()
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^./, (c) => c.toUpperCase())

  return (
    <div
      className="relative mx-2 overflow-hidden rounded-2xl border border-ink/10 p-4"
      style={{
        background:
          'linear-gradient(158deg, color-mix(in oklab, var(--color-gold) 12%, var(--color-surface)) 0%, var(--color-surface) 58%)',
        boxShadow:
          '0 1px 0 color-mix(in oklab, var(--color-ink) 8%, transparent) inset, 0 10px 26px -16px rgba(0,0,0,0.7)',
      }}
    >
      {/* faint coin halo */}
      <div
        className="pointer-events-none absolute -right-6 -top-8 size-24 rounded-full opacity-30 blur-2xl"
        style={{ background: 'var(--color-gold)' }}
        aria-hidden
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* the coin */}
          <span
            className="relative grid size-6 place-items-center rounded-full"
            style={{
              background:
                'radial-gradient(circle at 32% 26%, #FFE39A, #F5B841 55%, #C6890F)',
              boxShadow:
                'inset 0 1px 1.5px rgba(255,255,255,0.6), inset 0 -1px 2px rgba(120,80,0,0.5), 0 1px 2px rgba(0,0,0,0.35)',
            }}
            aria-hidden
          >
            <span className="font-mono text-[10px] font-bold text-[#6b4a00]">$</span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            {monthly ? 'Saldo do mês' : 'Saldo em caixa'}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-2 h-8 w-32 animate-pulse rounded-md bg-ink/10" />
      ) : (
        <div className="mt-1.5 font-display text-[27px] font-bold leading-none tnum">
          <span className="text-sm font-semibold text-faint">R$ </span>
          {formatBRL(total).replace('R$', '').trim()}
        </div>
      )}

      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
        {monthly ? (
          <>
            <CalendarDays className="size-3" />
            {monthLabel}
          </>
        ) : (
          <>
            <TrendingUp className="size-3 text-positive" />
            {count === 0 ? 'Nenhuma conta ainda' : `${count} conta${count > 1 ? 's' : ''} ativa${count > 1 ? 's' : ''}`}
          </>
        )}
      </div>
    </div>
  )
}
