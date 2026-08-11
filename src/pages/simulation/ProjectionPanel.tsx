import { useState } from 'react'
import { ArrowRight, ChevronDown, TrendingDown, TrendingUp } from 'lucide-react'
import { formatBRL } from '@/lib/money'
import { formatDisplayDate } from '@/lib/dates'
import { cn } from '@/utils/cn'
import type { Projection } from '@/lib/finance/projection'

export type Verdict = 'ok' | 'warn' | 'danger'

export function verdictOf(afterCents: number, beforeCents: number): Verdict {
  if (afterCents < 0) return 'danger'
  if (beforeCents <= 0 || afterCents < beforeCents * 0.2) return 'warn'
  return 'ok'
}

export const VERDICT_META: Record<
  Verdict,
  { dot: string; ring: string; text: string; label: string; message: string }
> = {
  ok: {
    dot: 'bg-positive', ring: 'ring-positive/30', text: 'text-positive',
    label: '🟢 Tranquilo',
    message: 'Você consegue realizar esse gasto com folga.',
  },
  warn: {
    dot: 'bg-warning', ring: 'ring-warning/30', text: 'text-warning',
    label: '🟡 Atenção',
    message: 'Esse gasto deixará seu saldo bem baixo.',
  },
  danger: {
    dot: 'bg-danger', ring: 'ring-danger/30', text: 'text-danger',
    label: '🔴 Cuidado',
    message: 'Esse gasto fará seu saldo ficar negativo.',
  },
}

function Line({
  label, value, tone, strong,
}: {
  label: string
  value: string
  tone?: string
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={cn('text-muted', strong && 'font-medium text-ink/80')}>{label}</span>
      <span className={cn('font-mono tnum', strong ? 'font-semibold text-ink' : 'text-ink/85', tone)}>
        {value}
      </span>
    </div>
  )
}

export function ProjectionPanel({
  projection,
  target,
  simTotalCents,
}: {
  projection: Projection
  target: string
  simTotalCents: number
}) {
  const [showTimeline, setShowTimeline] = useState(false)
  const before = projection.saldoPrevistoCents
  const after = before - simTotalCents
  const verdict = verdictOf(after, before)
  const meta = VERDICT_META[verdict]
  const pct = before > 0 ? Math.round((simTotalCents / before) * 100) : null

  return (
    <div className="flex flex-col gap-4">
      {/* Composição do saldo previsto */}
      <div className="rounded-2xl border border-rule bg-surface-2/50 p-4">
        <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          Previsão até {formatDisplayDate(target)}
        </div>
        <div className="flex flex-col gap-1.5">
          <Line label="Saldo atual" value={formatBRL(projection.saldoAtualCents)} />
          <Line label="+ Receitas previstas" value={formatBRL(projection.receitasCents)} tone="text-positive" />
          <Line label="− Despesas previstas" value={formatBRL(projection.despesasCents)} tone="text-danger" />
          <Line label="− Assinaturas" value={formatBRL(projection.assinaturasCents)} tone="text-danger" />
          <Line label="− Parcelas" value={formatBRL(projection.parcelasCents)} tone="text-danger" />
          <div className="my-1 border-t border-rule" />
          <Line label="Saldo previsto" value={formatBRL(before)} strong />
        </div>
      </div>

      {/* Antes × Depois */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-rule bg-surface p-4 shadow-sm">
        <div className="text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Antes</div>
          <div className="font-display text-lg font-bold tnum">{formatBRL(before)}</div>
        </div>
        <ArrowRight className="size-5 text-faint" />
        <div className="text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Após o gasto</div>
          <div className={cn('font-display text-lg font-bold tnum', meta.text)}>{formatBRL(after)}</div>
        </div>
      </div>

      {/* Impacto da simulação */}
      <div className="flex flex-col gap-1.5 rounded-2xl border border-rule bg-surface-2/50 p-4">
        <Line label="Saldo previsto" value={formatBRL(before)} />
        <Line label="− Simulação" value={formatBRL(simTotalCents)} tone="text-danger" />
        <div className="my-1 border-t border-rule" />
        <Line label="Saldo após simulação" value={formatBRL(after)} tone={meta.text} strong />
        {pct !== null && (
          <p className="mt-1 text-xs text-muted">
            O gasto representa <span className="font-semibold text-ink/80">{pct}%</span> do seu saldo previsto.
          </p>
        )}
      </div>

      {/* Indicador */}
      <div className={cn('flex items-start gap-3 rounded-2xl bg-surface p-4 ring-1', meta.ring)}>
        <span className={cn('mt-1 size-2.5 shrink-0 rounded-full', meta.dot)} />
        <div>
          <div className={cn('text-sm font-semibold', meta.text)}>{meta.label}</div>
          <div className="text-sm text-ink/75">{meta.message}</div>
        </div>
      </div>

      {/* Linha do tempo (compacta, opcional) */}
      {projection.events.length > 0 && (
        <div className="rounded-2xl border border-rule bg-surface">
          <button
            type="button"
            onClick={() => setShowTimeline((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-ink/80"
          >
            <span>Linha do tempo até o gasto</span>
            <ChevronDown className={cn('size-4 transition-transform', showTimeline && 'rotate-180')} />
          </button>
          {showTimeline && (
            <div className="max-h-64 overflow-y-auto border-t border-rule px-4 py-3">
              <ol className="flex flex-col gap-2.5">
                {projection.events.map((ev, i) => {
                  const positive = ev.amountCents >= 0
                  return (
                    <li key={i} className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          'grid size-6 shrink-0 place-items-center rounded-md',
                          positive ? 'bg-positive/12 text-positive' : 'bg-danger/10 text-danger',
                        )}
                      >
                        {positive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs text-ink/80">{ev.label}</span>
                      <span className="font-mono text-[11px] text-faint">{formatDisplayDate(ev.date)}</span>
                      <span className={cn('w-24 text-right font-mono text-xs tnum', positive ? 'text-positive' : 'text-danger')}>
                        {formatBRL(ev.amountCents, { sign: true })}
                      </span>
                    </li>
                  )
                })}
                <li className="flex items-center gap-2.5 border-t border-rule pt-2.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-md bg-brand/12 text-brand">🎯</span>
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">
                    {formatDisplayDate(target)} · sua simulação
                  </span>
                  <span className="w-24 text-right font-mono text-xs tnum text-danger">
                    {formatBRL(-simTotalCents, { sign: true })}
                  </span>
                </li>
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
