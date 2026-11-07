'use client'

import { CATEGORY_META, ELEMENTS, F_BLOCK_PLACEHOLDERS, type ChemElement } from '@/lib/notepad/formula/elements'
import { cn } from '@/lib/utils'

function ElementTile({ el, onPick }: { el: ChemElement; onPick: (symbol: string) => void }) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-7 cursor-pointer flex-col items-center justify-center rounded-[4px] p-0 transition-transform hover:z-10 hover:scale-125 hover:shadow-md focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
        CATEGORY_META[el.category].tile,
      )}
      style={{ gridColumn: el.col, gridRow: el.row }}
      onClick={() => onPick(el.symbol)}
      title={`${el.name} (${el.symbol}) — click to insert`}
      aria-label={`Insert element ${el.name} (${el.symbol})`}
    >
      <span className="self-start px-[2px] text-[6px] leading-[7px] opacity-75 tabular-nums">
        {el.number}
      </span>
      <span className="-mt-[3px] text-[11px] font-bold leading-none">{el.symbol}</span>
    </button>
  )
}

/**
 * The full periodic table (108 elements) on an 18-column grid, laid out with
 * the standard f-block-below arrangement. Clicking any tile inserts that
 * element into the workspace.
 */
export function PeriodicTable({ onPick }: { onPick: (symbol: string) => void }) {
  return (
    <div className="min-w-[540px]">
      {/* category legend */}
      <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1" aria-hidden="true">
        {(Object.keys(CATEGORY_META) as (keyof typeof CATEGORY_META)[]).map((cat) => (
          <span key={cat} className="inline-flex items-center gap-1 text-[8px] leading-none text-muted-foreground">
            <span className={cn('h-2 w-2 rounded-[2px]', CATEGORY_META[cat].tile)} />
            {CATEGORY_META[cat].label}
          </span>
        ))}
      </div>

      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: 'repeat(18, minmax(0, 1fr))' }}
        role="group"
        aria-label="Periodic table — all 108 elements"
      >
        {ELEMENTS.map((el) => (
          <ElementTile key={el.number} el={el} onPick={onPick} />
        ))}
        {F_BLOCK_PLACEHOLDERS.map((p) => (
          <div
            key={`${p.col}-${p.row}`}
            className="flex h-7 items-center justify-center rounded-[4px] border border-dashed border-border text-[7px] leading-tight text-muted-foreground"
            style={{ gridColumn: p.col, gridRow: p.row }}
          >
            {p.label}
          </div>
        ))}
      </div>
    </div>
  )
}
