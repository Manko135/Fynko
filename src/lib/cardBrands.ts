/**
 * Card networks (bandeiras) with their official brand marks. We reuse the same
 * icon service as the subscription logos to fetch each network's real logo by
 * domain, and callers fall back to the brand name when the image is missing.
 */
export type CardBrand = { key: string; label: string; domain: string; color: string }

export const CARD_BRANDS: CardBrand[] = [
  { key: 'visa', label: 'Visa', domain: 'visa.com', color: '#1A1F71' },
  { key: 'mastercard', label: 'Mastercard', domain: 'mastercard.com', color: '#EB001B' },
  { key: 'elo', label: 'Elo', domain: 'elo.com.br', color: '#111111' },
  { key: 'amex', label: 'American Express', domain: 'americanexpress.com', color: '#006FCF' },
  { key: 'hipercard', label: 'Hipercard', domain: 'hipercard.com.br', color: '#B3131B' },
  { key: 'diners', label: 'Diners Club', domain: 'dinersclubinternational.com', color: '#0079BE' },
  { key: 'discover', label: 'Discover', domain: 'discover.com', color: '#FF6000' },
  { key: 'jcb', label: 'JCB', domain: 'global.jcb', color: '#0B4EA2' },
  { key: 'aura', label: 'Aura', domain: 'aura.com.br', color: '#9B26B6' },
  { key: 'cabal', label: 'Cabal', domain: 'cabal.com.br', color: '#EC1C24' },
  { key: 'unionpay', label: 'UnionPay', domain: 'unionpayintl.com', color: '#E21836' },
]

/** Resolve a stored brand value (label or key) to a known network, if any. */
export function cardBrandFor(value: string | null | undefined): CardBrand | null {
  if (!value) return null
  const v = value.trim().toLowerCase()
  return CARD_BRANDS.find((b) => b.label.toLowerCase() === v || b.key === v) ?? null
}

/** Reliable brand icon (DuckDuckGo's icon service returns the real site logo). */
export function cardBrandLogoUrl(domain: string): string {
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`
}
