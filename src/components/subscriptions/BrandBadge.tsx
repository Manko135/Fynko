import { useState } from 'react'
import { brandFor, brandImageUrl } from '@/lib/subscriptionBrands'
import { DEFAULT_COLOR } from '@/lib/palette'

/**
 * Shows the service's official logo (favicon) when the name matches a known
 * brand; otherwise an elegant colored monogram consistent with the app.
 */
export function BrandBadge({
  name,
  color,
  size = 40,
}: {
  name: string
  color?: string | null
  size?: number
}) {
  const brand = brandFor(name)
  const [failed, setFailed] = useState(false)
  const accent = color ?? brand?.color ?? DEFAULT_COLOR
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  const logoSrc = brand ? brandImageUrl(brand) : null
  const showLogo = !!logoSrc && !failed

  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-xl"
      style={{
        width: size,
        height: size,
        background: showLogo ? '#ffffff' : `${accent}22`,
        color: accent,
      }}
    >
      {showLogo ? (
        <img
          src={logoSrc!}
          alt=""
          width={size * 0.6}
          height={size * 0.6}
          onError={() => setFailed(true)}
          className="object-contain"
        />
      ) : (
        <span className="font-display font-bold" style={{ fontSize: size * 0.4 }}>
          {initial}
        </span>
      )}
    </span>
  )
}
