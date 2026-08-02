import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useGlobalSearchItems, type SearchItem } from '@/hooks/useGlobalSearchItems'
import { cn } from '@/utils/cn'

function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const items = useGlobalSearchItems()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      // focus after paint
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const results = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return items.slice(0, 8)
    return items
      .filter((it) => normalize(it.label).includes(q) || normalize(it.sublabel).includes(q) || normalize(it.type).includes(q))
      .slice(0, 30)
  }, [items, query])

  useEffect(() => {
    setActive(0)
  }, [query])

  function choose(it: SearchItem) {
    onClose()
    navigate(it.path)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[active]) choose(results[active])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh]" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Busca global" className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-rule bg-surface shadow-2xl">
        <div className="flex items-center gap-2 border-b border-rule px-4 py-3">
          <Search className="size-4 text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar contas, cartões, lançamentos, metas…"
            className="w-full bg-transparent text-sm text-ink placeholder:text-faint outline-none"
          />
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto py-1">
          {results.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted">
              Nada encontrado para “{query}”.
            </div>
          ) : (
            results.map((it, idx) => (
              <button
                key={it.id}
                data-idx={idx}
                type="button"
                onMouseEnter={() => setActive(idx)}
                onClick={() => choose(it)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5 text-left transition',
                  idx === active ? 'bg-brand/10' : 'hover:bg-surface-2',
                )}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
                  <it.icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{it.label}</div>
                  <div className="truncate text-xs text-muted">{it.sublabel}</div>
                </div>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-faint">
                  {it.type}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
