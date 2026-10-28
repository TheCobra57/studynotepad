'use client'

import { useEffect, useRef } from 'react'
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
}

interface SlashMenuProps {
  commands: SlashCommand[]
  activeIndex: number
  query: string
  /** open upwards when the block sits near the bottom of the viewport */
  flip?: boolean
  onSelect: (cmd: SlashCommand) => void
  onHover: (index: number) => void
}

/**
 * Floating command palette opened by typing "/" (or the + gutter button).
 * Keyboard navigation is handled by the parent editor; this menu is
 * presentational and scrolls the highlighted row into view.
 */
export function SlashMenu({
  commands,
  activeIndex,
  query,
  flip = false,
  onSelect,
  onHover,
}: SlashMenuProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (commands.length === 0) {
    return (
      <div
        className={cn(
          'absolute left-0 z-40 w-[300px] overflow-hidden rounded-lg border bg-popover shadow-lg',
          flip ? 'bottom-full mb-1' : 'top-full mt-1',
        )}
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
      className={cn(
        'absolute left-0 z-40 w-[300px] overflow-hidden rounded-lg border bg-popover shadow-lg',
        flip ? 'bottom-full mb-1' : 'top-full mt-1',
      )}
      role="listbox"
      aria-label="Insert menu"
      onMouseDown={(e) => e.preventDefault()} // keep the textarea focused
    >
      <div ref={listRef} className="max-h-72 overflow-y-auto p-1">
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
      <div className="flex items-center gap-2 border-t bg-muted/50 px-3 py-1.5 text-[11px] text-muted-foreground">
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
