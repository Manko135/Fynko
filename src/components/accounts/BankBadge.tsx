import { useState } from 'react'
import { Banknote } from 'lucide-react'
import { bankFor, bankLogoUrl } from '@/lib/bankBrands'
import { DEFAULT_COLOR } from '@/lib/palette'

/**
 * Shows the bank's official logo when the account name/bank matches a known
 * Brazilian bank; "dinheiro vivo" shows a cash symbol; otherwise an elegant
 * colored monogram consistent with the app.
 */
export function BankBadge({
  name,
  bank,
  color,
  size = 40,
}: {
  name: string
  bank?: string | null
  color?: string | null
  size?: number
}) {
  const brand = bankFor(`${name} ${bank ?? ''}`)
  const [failed, setFailed] = useState(false)
  const accent = brand?.color ?? color ?? DEFAULT_COLOR
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  const logoSrc = brand?.domain ? bankLogoUrl(brand.domain) : null
  const showLogo = !!logoSrc && !failed

  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full ring-1 ring-black/5"
      style={{
        width: size,
        height: size,
        background: showLogo ? '#ffffff' : `${accent}22`,
        color: accent,
      }}
    >
      {brand?.cash ? (
        <Banknote style={{ width: size * 0.5, height: size * 0.5 }} />
      ) : showLogo ? (
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
