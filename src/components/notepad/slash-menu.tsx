'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Brush,
  Clipboard,
  Code2,
  FlaskConical,
  GripHorizontal,
  Heading1,
  Heading2,
  Heading3,
  Image,
  List,
  ListOrdered,
  ListTodo,
  ListTree,
  Minus,
  Quote,
  Radical,
  Table as TableIcon,
  Tag,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CommandIcon, SlashCommand } from './snippets'
import { Latex } from './markdown-preview'

const ICONS: Record<CommandIcon, LucideIcon> = {
  h1: Heading1,
  h2: Heading2,
  h3: Heading3,
  bullet: List,
  numbered: ListOrdered,
  todo: ListTodo,
  quote: Quote,
  divider: Minus,
  table: TableIcon,
  code: Code2,
  math: Radical,
  chem: FlaskConical,
  image: Image,
  clipboard: Clipboard,
  whiteboard: Brush,
  toc: ListTree,
  label: Tag,
}

interface SlashMenuProps {
  commands: SlashCommand[]
  activeIndex: number
  query: string
  onSelect: (cmd: SlashCommand) => void
  onHover: (index: number) => void
}

/** placement computed from live viewport measurements */
interface Placement {
  /** open upwards when the anchor row sits low in the viewport */
  up: boolean
  /** pixel cap for the whole menu — the list scrolls inside, footer stays visible */
  maxH: number
}

/** anchor margin (mt-1/mb-1) + a little breathing room */
const GUTTER = 8
/** space we'd like before flipping to the other side (~4 rows + footer) */
const MIN_COMFY = 176
/** smallest usable menu (footer + ~1 row); below this overlap beats a sliver */
const MIN_HARD = 96
/** never taller than this, even on huge screens */
const MAX_MENU = 360

/**
 * Floating command palette opened by typing "/" (or the + gutter button).
 * Keyboard navigation is handled by the parent editor; this menu is
 * presentational, scrolls the highlighted row into view, and places itself
 * above or below the anchor block depending on which side has more room —
 * clamping its height to the space actually available so it is never cut off
 * by the viewport edge or the on-screen keyboard (visualViewport aware).
 */
export function SlashMenu({ commands, activeIndex, query, onSelect, onHover }: SlashMenuProps) {
  const listRef = useRef<HTMLDivElement>(null)
  /** the block row this menu is anchored to (assigned in the root ref callback) */
  const anchorRef = useRef<HTMLElement | null>(null)
  const [placement, setPlacement] = useState<Placement | null>(null)

  // keep the highlighted row in view while navigating with the keyboard
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  // ---- dynamic placement ------------------------------------------------
  // Measure the anchor row against the viewport and pick side + height cap.
  const measure = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) return

    const rect = anchor.getBoundingClientRect()
    // visualViewport shrinks when the on-screen keyboard opens — prefer it
    const vh = window.visualViewport?.height ?? window.innerHeight
    const below = vh - rect.bottom - GUTTER
    const above = rect.top - GUTTER

    // down while there's room; up when the row sits low; else the roomier side
    const up = below >= MIN_COMFY ? false : above >= MIN_COMFY ? true : above > below
    const space = Math.max(up ? above : below, MIN_HARD)
    const maxH = Math.min(space, MAX_MENU)

    setPlacement((prev) => (prev && prev.up === up && prev.maxH === maxH ? prev : { up, maxH }))
  }, [])

  // The initial measurement runs from a ref callback — during commit, before
  // the first paint — so the menu never flashes on the wrong side.
  const attachRoot = useCallback(
    (el: HTMLDivElement | null) => {
      anchorRef.current = el?.parentElement ?? null
      measure()
    },
    [measure],
  )

  // Keep placement live: the anchor row resizes while typing (textarea
  // auto-grows), the page scrolls, the window resizes, and the on-screen
  // keyboard opens/closes — all covered by these passive observers.
  useEffect(() => {
    const ro = new ResizeObserver(() => measure())
    if (anchorRef.current) ro.observe(anchorRef.current)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true) // capture: editor pane scrolls too
    const vv = window.visualViewport
    vv?.addEventListener('resize', measure)
    vv?.addEventListener('scroll', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
      vv?.removeEventListener('resize', measure)
      vv?.removeEventListener('scroll', measure)
    }
  }, [measure])

  const pos: Placement = placement ?? { up: false, maxH: MAX_MENU }

  const rootClass = cn(
    'absolute left-0 z-40 w-[300px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border bg-popover shadow-lg',
    pos.up ? 'bottom-full mb-1' : 'top-full mt-1',
  )

  if (commands.length === 0) {
    return (
      <div
        ref={attachRoot}
        className={rootClass}
        style={{ maxHeight: pos.maxH }}
        role="listbox"
        aria-label="Insert menu"
      >
        <p className="px-3 py-4 text-center text-xs text-muted-foreground">
          No matches for “/{query}”
        </p>
      </div>
    )
  }

  return (
    <div
      ref={attachRoot}
      className={cn(rootClass, 'flex flex-col')}
      style={{ maxHeight: pos.maxH }}
      role="listbox"
      aria-label="Insert menu"
      onMouseDown={(e) => e.preventDefault()} // keep the textarea focused
    >
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-1">
        {commands.map((cmd, i) => {
          const Icon = ICONS[cmd.icon]
          return (
            <button
              key={cmd.id}
              type="button"
              role="option"
              aria-selected={i === activeIndex}
              data-index={i}
              onClick={() => onSelect(cmd)}
              onMouseMove={() => onHover(i)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors',
                i === activeIndex ? 'bg-accent' : 'hover:bg-accent/60',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-background',
                  cmd.icon === 'chem'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{cmd.label}</span>
                {cmd.hint && (
                  <span className="block truncate text-xs text-muted-foreground">{cmd.hint}</span>
                )}
              </span>
              {cmd.preview ? (
                <Latex tex={cmd.preview} className="max-w-[110px] shrink-0 text-muted-foreground" />
              ) : cmd.inline ? (
                <Latex
                  tex={cmd.inline.replace(/^\$|\$$/g, '')}
                  className="max-w-[110px] shrink-0 text-muted-foreground"
                />
              ) : null}
            </button>
          )
        })}
      </div>
      <div className="flex shrink-0 items-center gap-2 border-t bg-muted/50 px-3 py-1.5 text-[11px] text-muted-foreground">
        <GripHorizontal className="h-3 w-3" aria-hidden />
        <span>↑↓ navigate</span>
        <span aria-hidden>·</span>
        <span>↵ insert</span>
        <span aria-hidden>·</span>
        <span>esc close</span>
      </div>
    </div>
  )
}
