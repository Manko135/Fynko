import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { CRYPTO_IDS, type Vs } from '@/lib/crypto'

export type CoinMarket = {
  id: string
  symbol: string
  name: string
  image: string
  price: number
  change24h: number
  high24h: number
  low24h: number
  volume: number
  marketCap: number
  sparkline: number[]
}

/** Keyed by uppercase symbol. A plain object (not a Map) so react-query's
 *  structural sharing keeps unchanged coins referentially stable between
 *  refetches — that's what lets the list update without flickering. */
export type CoinMarkets = Record<string, CoinMarket>

async function fetchMarkets(vs: Vs): Promise<CoinMarkets> {
  const url =
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vs}` +
    `&ids=${CRYPTO_IDS}&price_change_percentage=24h&sparkline=true`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Não foi possível carregar as cotações.')
  const data = (await res.json()) as Array<Record<string, any>>
  const out: CoinMarkets = {}
  for (const c of data) {
    const symbol = String(c.symbol).toUpperCase()
    out[symbol] = {
      id: c.id,
      symbol,
      name: c.name,
      image: c.image,
      price: c.current_price ?? 0,
      change24h: c.price_change_percentage_24h ?? 0,
      high24h: c.high_24h ?? 0,
      low24h: c.low_24h ?? 0,
      volume: c.total_volume ?? 0,
      marketCap: c.market_cap ?? 0,
      sparkline: c.sparkline_in_7d?.price ?? [],
    }
  }
  return out
}

/**
 * Live crypto prices from CoinGecko's public API (no key needed). Refreshes on
 * its own; keepPreviousData + structural sharing mean a refetch swaps in only
 * the values that changed, with no loading flash.
 */
export function useCryptoMarkets(vs: Vs) {
  return useQuery({
    queryKey: ['crypto-markets', vs],
    queryFn: () => fetchMarkets(vs),
    refetchInterval: 60_000,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    retry: 1,
  })
}
