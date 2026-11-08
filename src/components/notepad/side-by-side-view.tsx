'use client'

import { Columns2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MarkdownPreview } from '@/components/notepad/markdown-preview'
import { cn } from '@/lib/utils'
import type { Chapter, Note } from '@/lib/notepad/types'

/**
 * Full-width side-by-side comparison: two notes rendered as read-only rich
 * previews (markdown, math and chemistry all render), each scrolling on its
 * own. Shown instead of the sidebar/notes/editor panes until exited.
 */
export function SideBySideView({
  left,
  right,
  chapters,
  onExit,
}: {
  left: Note
  right: Note
  chapters: Chapter[]
  onExit: () => void
}) {
  const chapterName = (chapterId: string) =>
    chapters.find((c) => c.id === chapterId)?.name ?? ''

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* slim header — also the way out */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-muted/30 px-3 py-1.5">
        <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <Columns2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            Side by side — <b className="font-medium text-foreground">{left.title || 'Untitled note'}</b>
            {' · '}
            <b className="font-medium text-foreground">{right.title || 'Untitled note'}</b>
          </span>
        </span>
        <Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1 px-2 text-xs" onClick={onExit}>
          <X className="h-3.5 w-3.5" /> Exit side by side
        </Button>
      </div>

      {/* the two read-only panes, each scrolling independently */}
      <div className="grid min-h-0 flex-1 grid-cols-1 divide-y overflow-hidden lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <SidePane note={left} chapter={chapterName(left.chapterId)} />
        <SidePane note={right} chapter={chapterName(right.chapterId)} />
      </div>
    </div>
  )
}

function SidePane({ note, chapter }: { note: Note; chapter: string }) {
  return (
    <section className="min-h-0 overflow-y-auto" aria-label={`Side-by-side pane — ${note.title || 'Untitled note'}`}>
      <div className="mx-auto max-w-3xl px-4 py-4" style={{ fontSize: 'var(--note-font-size)' }}>
        <header className="mb-3">
          <h2 className="text-lg font-bold leading-tight">{note.title || 'Untitled note'}</h2>
          {chapter && (
            <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              {chapter}
            </p>
          )}
        </header>
        {note.content.trim() ? (
          <MarkdownPreview content={note.content} />
        ) : (
          <p className={cn('text-sm italic text-muted-foreground')}>This note is empty so far.</p>
        )}
      </div>
    </section>
  )
}
