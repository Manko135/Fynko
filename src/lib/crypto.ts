/**
 * Registry of the crypto coins Fynko supports with live pricing. `id` is the
 * CoinGecko id (used for the markets API); `symbol` is what we store on an asset
 * (assets.crypto_symbol) and use for lookups across the app.
 */
export type CryptoCoin = { id: string; symbol: string; name: string; color: string }

export const CRYPTO_COINS: CryptoCoin[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', color: '#F7931A' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', color: '#627EEA' },
  { id: 'tether', symbol: 'USDT', name: 'Tether', color: '#26A17B' },
  { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin', color: '#2775CA' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', color: '#F3BA2F' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', color: '#23292F' },
  { id: 'binance-usd', symbol: 'BUSD', name: 'Binance USD', color: '#F0B90B' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', color: '#0033AD' },
  { id: 'solana', symbol: 'SOL', name: 'Solana', color: '#14F195' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', color: '#C2A633' },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', color: '#E6007A' },
  { id: 'staked-ether', symbol: 'STETH', name: 'Lido Staked Ether', color: '#00A3FF' },
  { id: 'wrapped-bitcoin', symbol: 'WBTC', name: 'Wrapped Bitcoin', color: '#F09242' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', color: '#E84142' },
  { id: 'tron', symbol: 'TRX', name: 'TRON', color: '#EF0027' },
]

export const CRYPTO_BY_SYMBOL = new Map(CRYPTO_COINS.map((c) => [c.symbol, c]))
export const CRYPTO_IDS = CRYPTO_COINS.map((c) => c.id).join(',')

/** The label shown for the "Criptomoeda" category on a patrimonio asset. */
export const CRYPTO_CATEGORY = 'Criptomoeda'

export type Vs = 'usd' | 'brl'

const SYMBOLS: Record<Vs, string> = { usd: 'US$', brl: 'R$' }

/** Price formatting that keeps small coins readable (more decimals when tiny). */
export function formatCryptoPrice(value: number, vs: Vs): string {
  const decimals = value >= 1 ? 2 : value >= 0.01 ? 4 : 6
  const n = value.toLocaleString(vs === 'brl' ? 'pt-BR' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  })
  return `${SYMBOLS[vs]} ${n}`
}

/** Compact quantity of a coin (up to 8 decimals, trailing zeros trimmed). */
export function formatCryptoAmount(amount: number): string {
  return amount.toLocaleString('pt-BR', { maximumFractionDigits: 8 })
}

/** Sentinel used by the coin picker for a manually-entered (unsynced) coin. */
export const CRYPTO_MANUAL = 'OUTRA'

/**
 * Live value of a crypto holding in cents of the base currency, or null when it
 * can't be computed (manual coin, missing quantity, or price not loaded yet).
 */
export function liveCryptoValueCents(
  symbol: string | null,
  amount: number | null,
  price: number | undefined,
): number | null {
  if (!symbol || symbol === CRYPTO_MANUAL || amount == null || price == null) return null
  return Math.round(amount * price * 100)
}
