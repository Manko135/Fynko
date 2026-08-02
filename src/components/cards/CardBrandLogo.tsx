import { useState } from 'react'
import { cardBrandFor, cardBrandLogoUrl } from '@/lib/cardBrands'

/**
 * Official card-network logo shown on the card face. The mark sits on a light
 * chip so it stays legible over the colored card; if the logo can't load (or the
 * brand is a legacy free-text value) it falls back to the name, as before.
 */
export function CardBrandLogo({ value }: { value: string }) {
  const brand = cardBrandFor(value)
  const [failed, setFailed] = useState(false)

  if (brand && !failed) {
    return (
      <span className="grid h-6 place-items-center rounded-md bg-white/95 px-1.5 shadow-sm ring-1 ring-black/10">
        <img
          src={cardBrandLogoUrl(brand.domain)}
          alt={brand.label}
          className="h-4 w-auto max-w-[3.25rem] object-contain"
          onError={() => setFailed(true)}
          loading="lazy"
        />
      </span>
    )
  }

  return (
    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">
      {value || 'Cartão'}
    </span>
  )
}
