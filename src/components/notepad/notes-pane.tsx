'use client'

import { useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ChevronLeft, MoreHorizontal, Pin, PinOff, Plus, Search, StickyNote, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { makeExcerpt } from '@/lib/notepad/constants'
import { sortNotes, useNotepadStore } from '@/lib/notepad/store'
import type { Note } from '@/lib/notepad/types'

interface NotesPaneProps {
  onBack?: () => void
  onOpenNote?: () => void
}

export function NotesPane({ onBack, onOpenNote }: NotesPaneProps) {
  const chapters = useNotepadStore((s) => s.chapters)
  const subjects = useNotepadStore((s) => s.subjects)
  const notes = useNotepadStore((s) => s.notes)
  const selectedChapterId = useNotepadStore((s) => s.selectedChapterId)
  const selectedNoteId = useNotepadStore((s) => s.selectedNoteId)
  const searchQuery = useNotepadStore((s) => s.searchQuery)
  const { addNote, selectNote, setSearchQuery, togglePin, deleteNote } = useNotepadStore()

  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null)

  const chapter = chapters.find((c) => c.id === selectedChapterId) ?? null
  const subject = chapter ? (subjects.find((s) => s.id === chapter.subjectId) ?? null) : null
  const searching = searchQuery.trim().length > 0

  const visibleNotes = useMemo(() => {
    if (searching) {
      const q = searchQuery.trim().toLowerCase()
      return sortNotes(
        notes.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)),
      )
    }
    if (!chapter) return []
    return sortNotes(notes.filter((n) => n.chapterId === chapter.id))
  }, [notes, chapter, searching, searchQuery])

  const handleNoteClick = (note: Note) => {
    selectNote(note.id)
    onOpenNote?.()
  }

  const handleNewNote = () => {
    if (chapter) addNote(chapter.id)
    onOpenNote?.()
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="space-y-3 border-b p-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={onBack}>
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Back to subjects</span>
            </Button>
          )}
          <div className="min-w-0 flex-1">
            {searching ? (
              <p className="truncate text-sm font-semibold">
                {visibleNotes.length} result{visibleNotes.length === 1 ? '' : 's'} for “
                {searchQuery.trim()}”
              </p>
            ) : chapter ? (
              <div className="flex items-center gap-2">
                {subject && (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: subject.color }}
                    aria-hidden
                  />
                )}
                <p className="truncate text-sm font-semibold" title={chapter.name}>
                  {chapter.name}
                </p>
              </div>
            ) : (
              <p className="text-sm font-semibold text-muted-foreground">Notes</p>
            )}
            {!searching && chapter && subject && (
              <p className="truncate text-xs text-muted-foreground">{subject.name}</p>
            )}
          </div>
          {!searching && (
            <Button size="sm" onClick={handleNewNote} disabled={!chapter} title="New note">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New</span>
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all notes…"
            className="h-9 pl-8 pr-8 text-sm"
            aria-label="Search notes"
          />
          {searching && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {visibleNotes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <StickyNote className="h-9 w-9 text-muted-foreground/40" />
            {searching ? (
              <>
                <p className="text-sm font-medium">No notes found</p>
                <p className="text-xs text-muted-foreground">Try a different search term.</p>
              </>
            ) : chapter ? (
              <>
                <p className="text-sm font-medium">No notes yet</p>
                <p className="text-xs text-muted-foreground">
                  Create your first note for this chapter.
                </p>
                <Button size="sm" variant="outline" onClick={handleNewNote}>
                  <Plus className="h-4 w-4" /> New note
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">Pick a chapter</p>
                <p className="text-xs text-muted-foreground">
                  Choose a chapter from the sidebar to see its notes.
                </p>
              </>
            )}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {visibleNotes.map((note) => {
              const noteChapter = chapters.find((c) => c.id === note.chapterId)
              const noteSubject = noteChapter
                ? subjects.find((s) => s.id === noteChapter.subjectId)
                : null
              const active = note.id === selectedNoteId
              return (
                <li key={note.id} className="group/note relative">
                  <button
                    type="button"
                    onClick={() => handleNoteClick(note)}
                    className={cn(
                      'w-full rounded-lg border p-3 pr-10 text-left transition-colors',
                      active
                        ? 'border-transparent bg-accent'
                        : 'border-transparent hover:border-border hover:bg-accent/50',
                    )}
                  >
                    <div className="flex items-start gap-1.5">
                      {note.pinned && (
                        <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-500" />
                      )}
                      <p
                        className={cn(
                          'min-w-0 flex-1 truncate text-sm',
                          active ? 'font-semibold' : 'font-medium',
                        )}
                      >
                        {note.title || 'Untitled note'}
                      </p>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {makeExcerpt(note.content) || 'Empty note'}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                      {searching && noteSubject && noteChapter && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"
                          style={{ color: noteSubject.color }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: noteSubject.color }}
                            aria-hidden
                          />
                          <span className="max-w-28 truncate">{noteChapter.name}</span>
                        </span>
                      )}
                      <span className="tabular-nums">
                        {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1.5 top-1.5 h-7 w-7 opacity-0 transition-opacity group-hover/note:opacity-100 data-[state=open]:opacity-100"
                        aria-label={`Options for ${note.title || 'note'}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => togglePin(note.id)}>
                        {note.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                        {note.pinned ? 'Unpin' : 'Pin to top'}
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => setNoteToDelete(note)}>
                        <Trash2 className="h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={noteToDelete !== null} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{noteToDelete?.title || 'Untitled note'}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The note and all of its content will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (noteToDelete) deleteNote(noteToDelete.id)
                setNoteToDelete(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
