/**
 * Curated color palette (spec Part 3.4) for categories, cards, accounts and
 * goals. 10 hue families × 3 tones = 30 colors. Grouped by family so the
 * picker reads as an organized set, not a random grid. No free RGB picker —
 * curated variety, on purpose.
 */

export type PaletteFamily = {
  name: string
  tones: [string, string, string] // claro, médio, escuro
}

export const PALETTE: PaletteFamily[] = [
  { name: 'Azul', tones: ['#7DA6FF', '#4F7CFF', '#2D49B3'] },
  { name: 'Verde', tones: ['#6EE7B7', '#3DD68C', '#0F9D58'] },
  { name: 'Vermelho', tones: ['#FF8A7D', '#FF6B5B', '#DC2626'] },
  { name: 'Laranja', tones: ['#FFB27D', '#FF7A30', '#C2540E'] },
  { name: 'Amarelo', tones: ['#FFE08A', '#FFC94D', '#B8860B'] },
  { name: 'Roxo', tones: ['#C4B5FD', '#A78BFA', '#6D28D9'] },
  { name: 'Rosa', tones: ['#FDA4C0', '#FB7185', '#BE123C'] },
  { name: 'Ciano', tones: ['#67E8DA', '#2DD4BF', '#0F766E'] },
  { name: 'Marrom', tones: ['#C9A27E', '#A0724F', '#6B4226'] },
  { name: 'Cinza', tones: ['#CBD5E1', '#94A3B8', '#475569'] },
]

/** Flat list of every hex, handy for validation / random default. */
export const PALETTE_COLORS: string[] = PALETTE.flatMap((f) => f.tones)

/** A stable default color (Coruja Teal family, medium tone). */
export const DEFAULT_COLOR = '#2DD4BF'

export function isPaletteColor(hex: string): boolean {
  return PALETTE_COLORS.includes(hex.toUpperCase())
}
