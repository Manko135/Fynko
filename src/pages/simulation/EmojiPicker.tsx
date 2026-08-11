import { useEffect, useRef, useState } from 'react'

const EMOJIS = [
  '🎉','🎟️','🍔','🥤','🚗','🎵','🛒','✈️','🏠','💊',
  '🎁','📱','💡','🐶','👕','⛽','🍿','🏥','📚','💰',
  '🍽️','☕','🎮','💻','🏋️','💅','🧾','🔧','🐱','🌴',
  '💸','🎂','🍺','⚽','🚙','🩺','🧴','📷','🎧','💳',
]

export function EmojiPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (emoji: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid size-[42px] place-items-center rounded-xl border border-rule bg-surface-2 text-xl transition hover:border-brand"
        aria-label="Escolher ícone"
      >
        {value}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-[248px] rounded-xl border border-rule bg-surface p-2 shadow-xl">
          <div className="grid grid-cols-8 gap-0.5">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => { onChange(e); setOpen(false) }}
                className="grid size-7 place-items-center rounded-lg text-lg transition hover:bg-surface-2"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
