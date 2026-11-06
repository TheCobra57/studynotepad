'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { parseMarkdownToBlocks, type Block } from '@/lib/notepad/blocks'
import { InlineMarkdown, Latex, MarkdownPreview } from '../markdown-preview'

/**
 * Read-only renderer for one side of a flashcard.
 *
 * Card sides are stored as the same markdown notes use, so this reuses the
 * exact same block parser and inline renderers as the editor — headings,
 * lists, quotes, code, $math$/\ce{} chemistry, tables, images and ==labels==
 * all render identically. No editing affordances: this is the study view.
 */
export function CardFace({ markdown, className }: { markdown: string; className?: string }) {
  const blocks = useMemo(() => parseMarkdownToBlocks(markdown), [markdown])

  // running number for numbered lists (mirrors the editor's live numbering)
  const numbers = useMemo(() => {
    const out: number[] = []
    let n = 0
    for (const b of blocks) {
      n = b.type === 'numbered' ? n + 1 : 0
      out.push(n)
    }
    return out
  }, [blocks])

  const empty = blocks.every((b) => b.text.trim() === '')

  if (empty) {
    return (
      <div className={cn('card-face text-(length:--note-font-size)', className)}>
        <p className="italic text-muted-foreground/60">This side is empty.</p>
      </div>
    )
  }

  return (
    <div className={cn('card-face text-(length:--note-font-size) leading-7', className)}>
      {blocks.map((b, i) => (
        <BlockReadOnly key={b.id} block={b} number={numbers[i]} />
      ))}
    </div>
  )
}

function BlockReadOnly({ block, number }: { block: Block; number: number }) {
  const inline = <InlineMarkdown text={block.text} />

  switch (block.type) {
    case 'h1':
      return (
        <h1 className="text-(length:--note-h1-size) font-bold leading-[2.25rem] tracking-tight md:text-(length:--note-h1-size-md) md:leading-[2.4rem]">
          {inline}
        </h1>
      )
    case 'h2':
      return (
        <h2 className="text-(length:--note-h2-size) font-semibold leading-[1.85rem] tracking-tight md:text-(length:--note-h2-size-md)">
          {inline}
        </h2>
      )
    case 'h3':
      return (
        <h3 className="text-(length:--note-h3-size) font-semibold leading-7 tracking-tight">
          {inline}
        </h3>
      )
    case 'bullet':
      return (
        <div className="flex items-start gap-2.5">
          <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/70" aria-hidden />
          <div className="min-w-0 flex-1">{inline}</div>
        </div>
      )
    case 'numbered':
      return (
        <div className="flex items-start gap-2">
          <span className="w-4 shrink-0 text-right text-(length:--note-font-size) leading-7 tabular-nums text-muted-foreground">
            {number}.
          </span>
          <div className="min-w-0 flex-1">{inline}</div>
        </div>
      )
    case 'todo':
      return (
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden
            className={cn(
              'mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border text-[10px] leading-none',
              block.checked ? 'bg-primary text-primary-foreground' : 'border-input',
            )}
          >
            {block.checked ? '✓' : ''}
          </span>
          <div className={cn('min-w-0 flex-1', block.checked && 'text-muted-foreground line-through')}>
            {inline}
          </div>
        </div>
      )
    case 'quote':
      return (
        <div className="rounded-r-md border-l-[3px] border-emerald-600/50 bg-muted/40 py-1 pl-3.5 pr-2">
          {inline}
        </div>
      )
    case 'code':
      return (
        <div className="overflow-hidden rounded-lg border bg-muted/40">
          {block.lang ? (
            <div className="border-b bg-muted px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {block.lang}
            </div>
          ) : null}
          <pre className="overflow-x-auto p-3 font-mono text-[13px] leading-6">
            <code>{block.text || ' '}</code>
          </pre>
        </div>
      )
    case 'p':
      return <div className="min-h-[28px]">{inline}</div>
    case 'divider':
      return <hr className="border-border/70" />
    case 'math':
      return (
        <div className="block-math my-1 overflow-x-auto rounded-md px-2 py-2 text-center">
          {block.text.trim() ? <Latex tex={block.text} display /> : null}
        </div>
      )
    case 'table':
      return (
        <div className="overflow-x-auto rounded-md [&_table]:my-0">
          <MarkdownPreview content={block.text} className="text-(length:--note-font-size)" />
        </div>
      )
    case 'image':
      return block.src ? (
        <img
          src={block.src}
          alt={block.text}
          className="block-img mx-auto"
          style={
            block.width !== undefined
              ? { width: `${Math.min(100, Math.max(10, block.width))}%` }
              : undefined
          }
          draggable={false}
        />
      ) : null
    default:
      // 'toc' and anything unknown: nothing meaningful without the document
      // context a full note provides — skip on cards
      return null
  }
}
