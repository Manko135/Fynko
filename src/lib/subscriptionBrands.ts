import countryClubLogo from '@/assets/brand/logo-country-club.jpeg'

/**
 * Best-effort brand identity for subscriptions. We match the subscription name
 * against known services to get the official domain (for its logo/favicon) and
 * a brand color. A `logo` (bundled image) can be used for brands without a
 * public domain. When nothing matches, callers fall back to a colored monogram.
 */
type Brand = { domain?: string; color: string; logo?: string }

// More specific keys must come before generic ones (first match wins).
// `word: true` matches whole words only — used for short/ambiguous names
// (e.g. "Oi", "TIM") so they don't match inside unrelated subscription names.
const BRANDS: { keys: string[]; brand: Brand; word?: boolean }[] = [
  { keys: ['netflix'], brand: { domain: 'netflix.com', color: '#E50914' } },
  { keys: ['youtube music', 'yt music'], brand: { domain: 'music.youtube.com', color: '#FF0000' } },
  { keys: ['youtube'], brand: { domain: 'youtube.com', color: '#FF0000' } },
  { keys: ['apple music'], brand: { domain: 'music.apple.com', color: '#FA243C' } },
  { keys: ['spotify'], brand: { domain: 'spotify.com', color: '#1DB954' } },
  { keys: ['deezer'], brand: { domain: 'deezer.com', color: '#A238FF' } },
  { keys: ['prime video', 'amazon prime', 'prime'], brand: { domain: 'primevideo.com', color: '#00A8E1' } },
  { keys: ['disney'], brand: { domain: 'disneyplus.com', color: '#113CCF' } },
  { keys: ['hbo', 'max'], brand: { domain: 'max.com', color: '#0046FF' } },
  { keys: ['crunchyroll'], brand: { domain: 'crunchyroll.com', color: '#F47521' } },
  { keys: ['onedrive'], brand: { domain: 'onedrive.live.com', color: '#0078D4' } },
  { keys: ['google one', 'google'], brand: { domain: 'google.com', color: '#4285F4' } },
  { keys: ['microsoft', 'office', '365'], brand: { domain: 'microsoft.com', color: '#0078D4' } },
  { keys: ['icloud', 'apple'], brand: { domain: 'icloud.com', color: '#3693F3' } },
  { keys: ['dropbox'], brand: { domain: 'dropbox.com', color: '#0061FF' } },
  { keys: ['notion'], brand: { domain: 'notion.so', color: '#111111' } },
  { keys: ['figma'], brand: { domain: 'figma.com', color: '#F24E1E' } },
  { keys: ['adobe', 'creative cloud'], brand: { domain: 'adobe.com', color: '#FA0F00' } },
  { keys: ['canva'], brand: { domain: 'canva.com', color: '#00C4CC' } },
  { keys: ['github', 'copilot'], brand: { domain: 'github.com', color: '#181717' } },
  { keys: ['claude', 'anthropic'], brand: { domain: 'claude.ai', color: '#D97757' } },
  { keys: ['chatgpt', 'openai', 'gpt'], brand: { domain: 'openai.com', color: '#10A37F' } },
  { keys: ['amazon'], brand: { domain: 'amazon.com', color: '#FF9900' } },
  // Operadoras de telefonia (match por palavra inteira).
  { keys: ['vivo'], brand: { domain: 'vivo.com.br', color: '#660099' }, word: true },
  { keys: ['claro'], brand: { domain: 'claro.com.br', color: '#DA291C' }, word: true },
  { keys: ['tim'], brand: { domain: 'tim.com.br', color: '#0033A0' }, word: true },
  { keys: ['oi'], brand: { domain: 'oi.com.br', color: '#FCD000' }, word: true },
  // Clube local — logo empacotada (sem domínio público).
  { keys: ['country club', 'countryclub'], brand: { logo: countryClubLogo, color: '#1B4332' } },
]

export function brandFor(name: string): Brand | null {
  const n = name.toLowerCase()
  for (const b of BRANDS) {
    const hit = b.word
      ? b.keys.some((k) => new RegExp(`\\b${k}\\b`, 'i').test(n))
      : b.keys.some((k) => n.includes(k))
    if (hit) return b.brand
  }
  return null
}

/** Reliable brand icon (DuckDuckGo's icon service returns the real site logo). */
export function brandLogoUrl(domain: string): string {
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`
}

/** Image URL for a brand: a bundled logo when present, otherwise its favicon. */
export function brandImageUrl(brand: Brand): string | null {
  if (brand.logo) return brand.logo
  if (brand.domain) return brandLogoUrl(brand.domain)
  return null
}
