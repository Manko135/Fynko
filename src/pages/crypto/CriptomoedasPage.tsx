import { memo, useCallback, useState } from 'react'
import { ChevronRight, TrendingDown, TrendingUp } from 'lucide-react'
import { useCryptoMarkets, type CoinMarket } from '@/hooks/useCryptoMarkets'
import { CoinDetailModal } from '@/components/crypto/CoinDetailModal'
import { CRYPTO_COINS, formatCryptoPrice, type CryptoCoin, type Vs } from '@/lib/crypto'
import { cn } from '@/utils/cn'

/** Tiny dependency-free 7-day price sparkline. */
function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  if (!data || data.length < 2) return <div className="h-8 w-24" />
  const w = 96
  const h = 32
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((v - min) / range) * (h - 2) - 1
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke={up ? 'var(--color-positive)' : 'var(--color-danger)'}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CoinLogo({ coin, market }: { coin: CryptoCoin; market?: CoinMarket }) {
  if (market?.image) {
    return <img src={market.image} alt="" className="size-8 shrink-0 rounded-full" loading="lazy" />
  }
  return (
    <span
      className="grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
      style={{ background: coin.color }}
    >
      {coin.symbol.slice(0, 3)}
    </span>
  )
}

function Change({ market }: { market?: CoinMarket }) {
  if (!market) return <span className="text-muted">—</span>
  const up = market.change24h >= 0
  return (
    <span className={cn('inline-flex items-center gap-1 font-mono tnum', up ? 'text-positive' : 'text-danger')}>
      {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
      {up ? '+' : ''}{market.change24h.toFixed(2)}%
    </span>
  )
}

/**
 * One coin row — memoized so only the coins whose data actually changed
 * re-render on each 1-minute refresh (no flicker). The whole row opens details.
 */
const CoinRow = memo(function CoinRow({
  coin,
  market,
  vs,
  onSelect,
}: {
  coin: CryptoCoin
  market?: CoinMarket
  vs: Vs
  onSelect: (c: CryptoCoin) => void
}) {
  const up = (market?.change24h ?? 0) >= 0
  return (
    <button
      type="button"
      onClick={() => onSelect(coin)}
      className="block w-full px-4 py-3 text-left transition-colors hover:bg-surface-2/60"
    >
      {/* Desktop */}
      <div className="hidden items-center gap-3 sm:grid sm:grid-cols-[2fr_1.2fr_1fr_7rem_1rem]">
        <div className="flex min-w-0 items-center gap-3">
          <CoinLogo coin={coin} market={market} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{coin.name}</div>
            <div className="font-mono text-[11px] text-muted">{coin.symbol}</div>
          </div>
        </div>
        <div className="text-right font-mono text-sm font-semibold tnum">
          {market ? formatCryptoPrice(market.price, vs) : '—'}
        </div>
        <div className="text-right text-sm">
          <Change market={market} />
        </div>
        <div className="flex justify-end">
          {market ? <Sparkline data={market.sparkline} up={up} /> : <div className="h-8 w-24" />}
        </div>
        <ChevronRight className="size-4 justify-self-end text-faint" />
      </div>

      {/* Mobile */}
      <div className="flex items-center gap-3 sm:hidden">
        <CoinLogo coin={coin} market={market} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{coin.name}</div>
          <div className="font-mono text-[11px] text-muted">{coin.symbol}</div>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-mono text-sm font-semibold tnum">
            {market ? formatCryptoPrice(market.price, vs) : '—'}
          </span>
          <span className="text-xs">
            <Change market={market} />
          </span>
        </div>
        <ChevronRight className="size-4 shrink-0 text-faint" />
      </div>
    </button>
  )
})

export function CriptomoedasPage() {
  const [vs, setVs] = useState<Vs>('usd')
  const [selected, setSelected] = useState<CryptoCoin | null>(null)
  const { data: markets, isLoading, isError, refetch } = useCryptoMarkets(vs)

  const onSelect = useCallback((c: CryptoCoin) => setSelected(c), [])

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">Criptomoedas</h2>
          <p className="text-sm text-muted">Cotações em tempo real — atualiza sozinho a cada minuto.</p>
        </div>
        <div className="flex rounded-xl border border-rule bg-surface-2 p-1">
          {(['usd', 'brl'] as Vs[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVs(v)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                vs === v ? 'bg-brand-solid text-on-brand' : 'text-ink/65 hover:text-ink',
              )}
            >
              {v === 'usd' ? 'Dólar (USD)' : 'Real (BRL)'}
            </button>
          ))}
        </div>
      </div>

      {isError && (
        <p className="mb-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          Não foi possível carregar as cotações agora.{' '}
          <button type="button" onClick={() => refetch()} className="font-medium underline">
            Tentar novamente
          </button>
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-rule bg-surface">
        <div className="hidden items-center gap-3 border-b border-rule px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-faint sm:grid sm:grid-cols-[2fr_1.2fr_1fr_7rem_1rem]">
          <span>Moeda</span>
          <span className="text-right">Preço</span>
          <span className="text-right">24h</span>
          <span className="text-right">7 dias</span>
          <span />
        </div>

        <div className="divide-y divide-rule">
          {isLoading &&
            [0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 animate-pulse bg-surface-2/40" />)}

          {!isLoading &&
            CRYPTO_COINS.map((coin) => (
              <CoinRow key={coin.symbol} coin={coin} market={markets?.[coin.symbol]} vs={vs} onSelect={onSelect} />
            ))}
        </div>
      </div>

      <p className="mt-3 text-center text-[11px] text-faint">Dados de mercado fornecidos por CoinGecko.</p>

      <CoinDetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        coin={selected}
        market={selected ? markets?.[selected.symbol] : undefined}
        vs={vs}
      />
    </div>
  )
}
