/**
 * Best-effort brand identity for bank accounts. We match the account name (or
 * its bank field) against known Brazilian banks/fintechs to pull the official
 * logo (via favicon service) and a brand color. "Dinheiro vivo"/espécie is a
 * special case shown with a cash symbol. No match → colored monogram fallback.
 */
export type BankBrand = { domain?: string; color: string; cash?: boolean }

// First match wins; more specific keys first. `word: true` matches whole words
// only (for short/ambiguous keys like "bb", "xp", "pan").
const BANKS: { keys: string[]; brand: BankBrand; word?: boolean }[] = [
  { keys: ['nubank', 'nu pagamentos'], brand: { domain: 'nubank.com.br', color: '#820AD1' } },
  { keys: ['banco inter', 'inter'], brand: { domain: 'inter.co', color: '#FF7A00' } },
  { keys: ['itau', 'itaú', 'unibanco'], brand: { domain: 'itau.com.br', color: '#EC7000' } },
  { keys: ['bradesco'], brand: { domain: 'bradesco.com.br', color: '#CC092F' } },
  { keys: ['banco do brasil'], brand: { domain: 'bb.com.br', color: '#F9DD16' } },
  { keys: ['bb'], brand: { domain: 'bb.com.br', color: '#F9DD16' }, word: true },
  { keys: ['caixa'], brand: { domain: 'caixa.gov.br', color: '#0070AF' } },
  { keys: ['santander'], brand: { domain: 'santander.com.br', color: '#EC0000' } },
  { keys: ['sicredi'], brand: { domain: 'sicredi.com.br', color: '#3FA110' } },
  { keys: ['sicoob'], brand: { domain: 'sicoob.com.br', color: '#00AE9D' } },
  { keys: ['picpay'], brand: { domain: 'picpay.com', color: '#21C25E' } },
  { keys: ['revolut'], brand: { domain: 'revolut.com', color: '#0666EB' } },
  { keys: ['mercado pago', 'mercadopago'], brand: { domain: 'mercadopago.com.br', color: '#009EE3' } },
  { keys: ['pagbank', 'pagseguro'], brand: { domain: 'pagbank.com.br', color: '#0F9D58' } },
  { keys: ['c6 bank', 'c6bank', 'c6'], brand: { domain: 'c6bank.com.br', color: '#1D1D1B' } },
  { keys: ['btg'], brand: { domain: 'btgpactual.com', color: '#0D1C3F' } },
  { keys: ['neon'], brand: { domain: 'neon.com.br', color: '#00E5C7' } },
  { keys: ['banco original', 'original'], brand: { domain: 'original.com.br', color: '#00A868' } },
  { keys: ['banco pan'], brand: { domain: 'bancopan.com.br', color: '#00A0DF' } },
  { keys: ['pan'], brand: { domain: 'bancopan.com.br', color: '#00A0DF' }, word: true },
  { keys: ['safra'], brand: { domain: 'safra.com.br', color: '#101820' } },
  { keys: ['votorantim', 'banco bv'], brand: { domain: 'bv.com.br', color: '#00A19A' } },
  { keys: ['will bank', 'willbank', 'will'], brand: { domain: 'willbank.com.br', color: '#FFCC00' } },
  { keys: ['xp'], brand: { domain: 'xpi.com.br', color: '#101820' }, word: true },
  { keys: ['ame'], brand: { domain: 'amedigital.com', color: '#FF0073' }, word: true },
  { keys: ['paypal'], brand: { domain: 'paypal.com', color: '#003087' } },
  { keys: ['wise'], brand: { domain: 'wise.com', color: '#163300' } },
  { keys: ['n26'], brand: { domain: 'n26.com', color: '#1A1A1A' } },
  // Dinheiro vivo / espécie / carteira física → símbolo de dinheiro.
  { keys: ['dinheiro', 'espécie', 'especie', 'em maos', 'em mãos'], brand: { cash: true, color: '#16A34A' } },
]

export function bankFor(text: string): BankBrand | null {
  const n = text.toLowerCase()
  for (const b of BANKS) {
    const hit = b.word
      ? b.keys.some((k) => new RegExp(`\b${k}\b`, 'i').test(n))
      : b.keys.some((k) => n.includes(k))
    if (hit) return b.brand
  }
  return null
}

/** Real bank logo via DuckDuckGo's icon service (same as subscriptions). */
export function bankLogoUrl(domain: string): string {
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`
}
