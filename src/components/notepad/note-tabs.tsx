'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotepadStore } from '@/lib/notepad/store'
import type { Note } from '@/lib/notepad/types'

/**
 * Multi-tab bar — one tab per open note, shown directly below the app header
 * when Settings → Note tabs is set to “Multiple”. Clicking a tab swaps the
 * editor to that note (and its chapter in the sidebar); ✕ or middle-click
 * closes a tab, activating its neighbour.
 */
export function NoteTabs({ onOpenNote }: { onOpenNote?: () => void }) {
  const notes = useNotepadStore((s) => s.notes)
  const openNoteIds = useNotepadStore((s) => s.openNoteIds)
  const selectedNoteId = useNotepadStore((s) => s.selectedNoteId)
  const selectNote = useNotepadStore((s) => s.selectNote)
  const closeNoteTab = useNotepadStore((s) => s.closeNoteTab)
  const setChapterTab = useNotepadStore((s) => s.setChapterTab)

  // keep only ids that still resolve (covers brand-new imports etc.)
  const tabs = openNoteIds
    .map((id) => notes.find((n) => n.id === id))
    .filter(Boolean) as Note[]

  if (!tabs.length) return null

  return (
    <div
      role="tablist"
      aria-label="Open notes"
      className="flex h-9 shrink-0 items-stretch gap-1 overflow-x-auto border-b bg-muted/30 px-2 pt-1"
    >
      {tabs.map((note) => {
        const active = note.id === selectedNoteId
        return (
          <div
            key={note.id}
            role="presentation"
            className={cn(
              'group/tab flex min-w-0 shrink-0 items-center gap-0.5 rounded-t-md border px-2 text-xs transition-colors',
              active
                ? 'border-border border-b-0 bg-background font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-accent/60',
            )}
          >
            <button
              type="button"
              role="tab"
              aria-selected={active}
              title={note.title || 'Untitled note'}
              onClick={() => {
                selectNote(note.id)
                setChapterTab('notes')
                onOpenNote?.()
              }}
              onAuxClick={(e) => {
                if (e.button === 1) closeNoteTab(note.id)
              }}
              className="max-w-36 truncate py-1.5 sm:max-w-52"
            >
              {note.title || 'Untitled note'}
            </button>
            <button
              type="button"
              aria-label={`Close tab ${note.title || 'Untitled note'}`}
              title="Close tab"
              onClick={() => closeNoteTab(note.id)}
              className={cn(
                'rounded p-1 transition-opacity hover:bg-muted',
                active ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover/tab:opacity-60 focus-visible:opacity-60',
              )}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
