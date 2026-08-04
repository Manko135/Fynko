import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Coins } from 'lucide-react'
import { CRYPTO_BY_SYMBOL, CRYPTO_COINS, CRYPTO_MANUAL, type CryptoCoin } from '@/lib/crypto'
import { useCryptoMarkets, type CoinMarkets } from '@/hooks/useCryptoMarkets'
import { cn } from '@/utils/cn'

function CoinIcon({ coin, markets }: { coin: CryptoCoin; markets?: CoinMarkets }) {
  const img = markets?.[coin.symbol]?.image
  if (img) return <img src={img} alt="" className="size-5 shrink-0 rounded-full" loading="lazy" />
  return (
    <span
      className="grid size-5 shrink-0 place-items-center rounded-full text-[8px] font-bold text-white"
      style={{ background: coin.color }}
    >
      {coin.symbol.slice(0, 3)}
    </span>
  )
}

/**
 * Coin picker for the patrimônio form — shows each supported coin's official
 * logo + name, plus an "Adicionar outra moeda" option for unsynced holdings.
 */
export function CoinSelect({
  value,
  onChange,
  label = 'Moeda',
}: {
  value: string
  onChange: (v: string) => void
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data: markets } = useCryptoMarkets('brl')
  const selected = CRYPTO_BY_SYMBOL.get(value)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  function pick(v: string) {
    onChange(v)
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink/75">{label}</span>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-2 rounded-xl border border-rule bg-surface-2 px-3 py-2.5 text-left transition focus:border-brand focus:outline-none"
        >
          {selected ? (
            <>
              <CoinIcon coin={selected} markets={markets} />
              <span className="text-ink">{selected.name}</span>
              <span className="font-mono text-xs text-muted">{selected.symbol}</span>
            </>
          ) : value === CRYPTO_MANUAL ? (
            <>
              <Coins className="size-5 text-muted" />
              <span className="text-ink">Outra moeda (manual)</span>
            </>
          ) : (
            <span className="text-faint">Selecionar moeda</span>
          )}
          <ChevronDown className={cn('ml-auto size-4 shrink-0 text-faint transition', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="animate-pop absolute inset-x-0 top-[calc(100%+4px)] z-30 max-h-72 origin-top overflow-y-auto rounded-xl border border-rule bg-surface p-1 shadow-2xl">
            {CRYPTO_COINS.map((coin) => (
              <button
                key={coin.symbol}
                type="button"
                onClick={() => pick(coin.symbol)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-surface-2',
                  value === coin.symbol && 'bg-surface-2',
                )}
              >
                <CoinIcon coin={coin} markets={markets} />
                <span className="text-ink/85">{coin.name}</span>
                <span className="font-mono text-xs text-muted">{coin.symbol}</span>
                {value === coin.symbol && <Check className="ml-auto size-4 text-brand" strokeWidth={2.5} />}
              </button>
            ))}
            <button
              type="button"
              onClick={() => pick(CRYPTO_MANUAL)}
              className={cn(
                'mt-1 flex w-full items-center gap-2 rounded-lg border-t border-rule px-2.5 py-2 text-left text-sm text-muted transition hover:bg-surface-2',
                value === CRYPTO_MANUAL && 'bg-surface-2',
              )}
            >
              <Coins className="size-5" />
              Adicionar outra moeda (manual)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
