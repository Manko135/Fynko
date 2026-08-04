import { useMemo, useState } from 'react'
import { Area, AreaChart, Brush, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useCoinChart, CHART_PERIODS } from '@/hooks/useCoinChart'
import type { CoinMarket } from '@/hooks/useCryptoMarkets'
import { formatCryptoPrice, type CryptoCoin, type Vs } from '@/lib/crypto'
import { cn } from '@/utils/cn'

function compact(n: number, vs: Vs): string {
  const sym = vs === 'brl' ? 'R$' : 'US$'
  return `${sym} ${n.toLocaleString(vs === 'brl' ? 'pt-BR' : 'en-US', { notation: 'compact', maximumFractionDigits: 2 })}`
}

function tickLabel(t: number, days: string): string {
  const d = new Date(t)
  if (days === '1') return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="rounded-xl border border-rule bg-surface-2/60 px-3 py-2.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{label}</div>
      <div className={cn('mt-0.5 font-mono text-sm font-semibold tnum', tone ?? 'text-ink')}>{value}</div>
    </div>
  )
}

export function CoinDetailModal({
  open,
  onClose,
  coin,
  market,
  vs,
}: {
  open: boolean
  onClose: () => void
  coin: CryptoCoin | null
  market?: CoinMarket
  vs: Vs
}) {
  const [days, setDays] = useState('7')
  const { data: series, isLoading, isError } = useCoinChart(open ? coin?.id ?? null : null, days, vs)

  const periodStats = useMemo(() => {
    if (!series || series.length < 2) return null
    const prices = series.map((p) => p.price)
    const first = prices[0]
    const last = prices[prices.length - 1]
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      changePct: first ? ((last - first) / first) * 100 : 0,
    }
  }, [series])

  const up = (periodStats?.changePct ?? market?.change24h ?? 0) >= 0
  const stroke = up ? 'var(--color-positive)' : 'var(--color-danger)'

  function ChartTip({ active, payload }: any) {
    if (!active || !payload?.length) return null
    const p = payload[0].payload
    return (
      <div className="rounded-lg border border-rule bg-surface px-3 py-2 text-xs shadow-lg">
        <div className="mb-0.5 text-muted">{new Date(p.t).toLocaleString('pt-BR')}</div>
        <div className="font-mono tnum text-ink">{formatCryptoPrice(p.price, vs)}</div>
      </div>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={coin ? `${coin.name} · ${coin.symbol}` : 'Criptomoeda'}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      {coin && (
        <div className="flex flex-col gap-4">
          {/* Price header */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-center gap-3">
              {market?.image ? (
                <img src={market.image} alt="" className="size-10 rounded-full" />
              ) : (
                <span className="grid size-10 place-items-center rounded-full text-xs font-bold text-white" style={{ background: coin.color }}>
                  {coin.symbol.slice(0, 3)}
                </span>
              )}
              <div>
                <div className="font-display text-2xl font-bold tnum">
                  {market ? formatCryptoPrice(market.price, vs) : '—'}
                </div>
                <div className={cn('flex items-center gap-1 text-sm font-medium', (market?.change24h ?? 0) >= 0 ? 'text-positive' : 'text-danger')}>
                  {(market?.change24h ?? 0) >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                  {market ? `${market.change24h >= 0 ? '+' : ''}${market.change24h.toFixed(2)}% (24h)` : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Period selector */}
          <div className="flex flex-wrap gap-1 rounded-xl border border-rule bg-surface-2 p-1">
            {CHART_PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setDays(p.value)}
                className={cn(
                  'flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition',
                  days === p.value ? 'bg-brand-solid text-on-brand' : 'text-ink/65 hover:text-ink',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="h-64">
            {isError ? (
              <div className="grid h-full place-items-center text-sm text-danger">Não foi possível carregar o histórico.</div>
            ) : isLoading || !series ? (
              <div className="h-full animate-pulse rounded-xl bg-surface-2/50" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="coinFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={stroke} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="t"
                    tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={40}
                    tickFormatter={(t) => tickLabel(t, days)}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={64}
                    tickFormatter={(v) => formatCryptoPrice(v, vs)}
                  />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="price" stroke={stroke} strokeWidth={2} fill="url(#coinFill)" />
                  <Brush dataKey="t" height={22} travellerWidth={8} stroke="var(--color-rule)" tickFormatter={(t) => tickLabel(t, days)} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className="-mt-2 text-center text-[11px] text-faint">
            Arraste as bordas do mini-gráfico abaixo do gráfico para dar zoom no período · passe o cursor para ver os valores.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="Preço atual" value={market ? formatCryptoPrice(market.price, vs) : '—'} />
            <Stat
              label="Variação (período)"
              value={periodStats ? `${periodStats.changePct >= 0 ? '+' : ''}${periodStats.changePct.toFixed(2)}%` : '—'}
              tone={up ? 'text-positive' : 'text-danger'}
            />
            <Stat label="Variação 24h" value={market ? `${market.change24h >= 0 ? '+' : ''}${market.change24h.toFixed(2)}%` : '—'} tone={(market?.change24h ?? 0) >= 0 ? 'text-positive' : 'text-danger'} />
            <Stat label="Máxima (período)" value={periodStats ? formatCryptoPrice(periodStats.max, vs) : '—'} />
            <Stat label="Mínima (período)" value={periodStats ? formatCryptoPrice(periodStats.min, vs) : '—'} />
            <Stat label="Máxima 24h" value={market ? formatCryptoPrice(market.high24h, vs) : '—'} />
            <Stat label="Mínima 24h" value={market ? formatCryptoPrice(market.low24h, vs) : '—'} />
            <Stat label="Volume 24h" value={market ? compact(market.volume, vs) : '—'} />
            <Stat label="Cap. de mercado" value={market ? compact(market.marketCap, vs) : '—'} />
          </div>
        </div>
      )}
    </Modal>
  )
}
