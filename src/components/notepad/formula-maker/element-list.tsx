'use client'

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { CATEGORY_META, ELEMENTS } from '@/lib/notepad/formula/elements'
import { cn } from '@/lib/utils'

/**
 * Flat, searchable list of all 108 elements — the casual alternative to the
 * periodic-table grid. Type a name ("gold"), a symbol ("au") or an atomic
 * number ("79") and tap a row to insert it into the workspace.
 */
export function ElementList({ onPick }: { onPick: (symbol: string) => void }) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ELEMENTS
    return ELEMENTS.filter(
      (el) =>
        el.name.toLowerCase().includes(q) ||
        el.symbol.toLowerCase().startsWith(q) ||
        String(el.number) === q,
    )
  }, [query])

  return (
    <>
      {/* search stays pinned above the scrolling rows */}
      <div className="shrink-0 p-2 pb-1.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, symbol or number…"
            aria-label="Search elements"
            className="h-9 pl-8 pr-8 text-sm"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
        {results.length ? (
          <ul className="flex flex-col gap-0.5">
            {results.map((el) => (
              <li key={el.number}>
                <button
                  type="button"
                  onClick={() => onPick(el.symbol)}
                  aria-label={`Insert element ${el.name} (${el.symbol})`}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[13px] font-bold',
                      CATEGORY_META[el.category].tile,
                    )}
                  >
                    {el.symbol}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{el.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    #{el.number}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">
            No element matches “{query}”.
          </p>
        )}
      </div>
    </>
  )
}
