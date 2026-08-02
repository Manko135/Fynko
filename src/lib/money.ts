/**
 * Money is handled as integer cents everywhere in the engine to avoid float
 * drift. Convert to reais only at the display edge.
 */

export type Cents = number

export function reaisToCents(reais: number): Cents {
  return Math.round(reais * 100)
}

export function centsToReais(cents: Cents): number {
  return cents / 100
}

// Active display currency. Kept as a module-level value (set once from the
// user's profile on load) so every formatBRL call site adapts without a
// prop-drilling refactor. Locale follows the currency.
const LOCALE_BY_CURRENCY: Record<string, string> = {
  BRL: 'pt-BR',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
}
let activeCurrency = 'BRL'

export function setDisplayCurrency(code: string) {
  if (LOCALE_BY_CURRENCY[code]) activeCurrency = code
}
export function getDisplayCurrency() {
  return activeCurrency
}

/** Format cents in the active currency, e.g. 1248075 → 'R$ 12.480,75'. */
export function formatBRL(cents: Cents, opts?: { sign?: boolean }): string {
  const value = centsToReais(Math.abs(cents))
  const formatted = value.toLocaleString(LOCALE_BY_CURRENCY[activeCurrency], {
    style: 'currency',
    currency: activeCurrency,
  })
  if (opts?.sign && cents !== 0) {
    return `${cents > 0 ? '+ ' : '− '}${formatted}`
  }
  return cents < 0 ? `− ${formatted}` : formatted
}
