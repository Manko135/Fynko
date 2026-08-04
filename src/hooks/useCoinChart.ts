import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { Vs } from '@/lib/crypto'

export type ChartPoint = { t: number; price: number }

/** CoinGecko period → API `days` value. */
export const CHART_PERIODS: { value: string; label: string }[] = [
  { value: '1', label: '24h' },
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
  { value: '365', label: '1 ano' },
  { value: 'max', label: 'Máx' },
]

async function fetchChart(id: string, days: string, vs: Vs): Promise<ChartPoint[]> {
  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=${vs}&days=${days}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Não foi possível carregar o histórico.')
  const data = (await res.json()) as { prices?: [number, number][] }
  return (data.prices ?? []).map(([t, price]) => ({ t, price }))
}

/** Historical price series for one coin over a selected period. */
export function useCoinChart(id: string | null, days: string, vs: Vs) {
  return useQuery({
    queryKey: ['coin-chart', id, days, vs],
    queryFn: () => fetchChart(id!, days, vs),
    enabled: !!id,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    retry: 1,
  })
}
