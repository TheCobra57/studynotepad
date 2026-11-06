'use client'

import { useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  Code2,
  FileUp,
  FlaskConical,
  GripVertical,
  Image as ImageIcon,
  Layers,
  List,
  ListTodo,
  ListTree,
  MoreHorizontal,
  MoveVertical,
  Pin,
  PinOff,
  Plus,
  Radical,
  Search,
  StickyNote,
  Table as TableIcon,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  EXCERPT_CHIP_LABELS,
  makeExcerptSegments,
  type ExcerptElement,
  type ExcerptSegment,
} from '@/lib/notepad/constants'
import { chapterDeck, sortNotes, useNotepadStore } from '@/lib/notepad/store'
import { useArrange } from '@/hooks/use-arrange'
import type { Flashcard, Note } from '@/lib/notepad/types'

/** Same icon language as the / menu — a chip is recognisable at a glance */
const EXCERPT_ICONS: Record<ExcerptElement, LucideIcon> = {
  list: List,
  checklist: ListTodo,
  image: ImageIcon,
  math: Radical,
  chem: FlaskConical,
  code: Code2,
  table: TableIcon,
  toc: ListTree,
}

function ExcerptChip({ segment }: { segment: Extract<ExcerptSegment, { kind: 'chip' }> }) {
  const Icon = EXCERPT_ICONS[segment.element]
  return (
    <span
      className="mx-0.5 inline-flex translate-y-px items-center gap-1 rounded border bg-muted/70 px-1 py-px align-baseline text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"
      title={`${EXCERPT_CHIP_LABELS[segment.element]}${segment.meta ? ` — ${segment.meta}` : ''}`}
    >
      <Icon className="h-2.5 w-2.5 shrink-0" aria-hidden />
      {EXCERPT_CHIP_LABELS[segment.element]}
      {segment.meta && (
        <span className="font-medium normal-case tracking-normal text-muted-foreground/80">
          {segment.meta}
        </span>
      )}
    </span>
  )
}

/** Two-line note preview: readable text + named chips for special blocks */
function NoteExcerpt({ note }: { note: Note }) {
  const segments = useMemo(() => makeExcerptSegments(note.content), [note.content])
  if (segments.length === 0) {
    return (
      <p className="mt-1 line-clamp-2 text-[length:calc(var(--note-font-size)*0.8)] leading-5 text-muted-foreground">
        Empty note
      </p>
    )
  }
  return (
    <p className="mt-1 line-clamp-2 text-[length:calc(var(--note-font-size)*0.8)] leading-5 text-muted-foreground">
      {segments.map((seg, i) =>
        seg.kind === 'text' ? (
          <span
            key={i}
            className={cn(
              seg.emphasis && 'font-medium text-foreground/80',
              seg.quote && 'italic',
            )}
          >
            {seg.text}
            {i < segments.length - 1 && ' '}
          </span>
        ) : (
          <ExcerptChip key={i} segment={seg} />
        ),
      )}
    </p>
  )
}

/** Plain-text preview of a card side (chips for images/tables/equations, like notes) */
function CardExcerpt({ markdown, emptyText }: { markdown: string; emptyText: string }) {
  const segments = useMemo(() => makeExcerptSegments(markdown), [markdown])
  if (segments.length === 0) {
    return <span className="italic text-muted-foreground/60">{emptyText}</span>
  }
  return (
    <span>
      {segments.map((seg, i) =>
        seg.kind === 'text' ? (
          <span key={i}>{seg.text}{i < segments.length - 1 && ' '}</span>
        ) : (
          <ExcerptChip key={i} segment={seg} />
        ),
      )}
    </span>
  )
}

interface NotesPaneProps {
  onBack?: () => void
  onOpenNote?: () => void
  /** open the .md import dialog (always available — it picks its own destination) */
  onImportMd?: () => void
}

export function NotesPane({ onBack, onOpenNote, onImportMd }: NotesPaneProps) {
  const chapters = useNotepadStore((s) => s.chapters)
  const subjects = useNotepadStore((s) => s.subjects)
  const notes = useNotepadStore((s) => s.notes)
  const flashcards = useNotepadStore((s) => s.flashcards)
  const selectedChapterId = useNotepadStore((s) => s.selectedChapterId)
  const selectedNoteId = useNotepadStore((s) => s.selectedNoteId)
  const selectedCardId = useNotepadStore((s) => s.selectedCardId)
  const searchQuery = useNotepadStore((s) => s.searchQuery)
  const chapterTab = useNotepadStore((s) => s.chapterTab)
  const setChapterTab = useNotepadStore((s) => s.setChapterTab)
  const {
    addNote,
    addCard,
    selectNote,
    selectCard,
    setSearchQuery,
    togglePin,
    deleteNote,
    deleteCard,
    moveCard,
    reorderNotes,
  } = useNotepadStore()

  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null)
  const [cardToDelete, setCardToDelete] = useState<Flashcard | null>(null)

  const chapter = chapters.find((c) => c.id === selectedChapterId) ?? null
  const subject = chapter ? (subjects.find((s) => s.id === chapter.subjectId) ?? null) : null
  const searching = searchQuery.trim().length > 0
  const showingFlashcards = chapterTab === 'flashcards' && !!chapter
  const notesOfChapter = chapter ? notes.filter((n) => n.chapterId === chapter.id).length : 0

  // ---------- arrange mode (⠿ Move from a note's ⋯ menu) ----------
  const [arranging, setArranging] = useState(false)
  const { drag, startDrag } = useArrange({
    enabled: arranging && !searching,
    onCommit: (_group, ids) => {
      if (chapter) reorderNotes(chapter.id, ids)
    },
  })
  const dragNote = drag?.group === 'note'

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

  const deck = useMemo(() => chapterDeck(flashcards, chapter?.id ?? null), [flashcards, chapter])

  const handleNoteClick = (note: Note) => {
    if (arranging) return
    selectNote(note.id)
    onOpenNote?.()
  }

  const handleCardClick = (card: Flashcard) => {
    selectCard(card.id)
    onOpenNote?.()
  }

  const handleNewNote = () => {
    if (chapter) addNote(chapter.id)
    onOpenNote?.()
  }

  const handleNewCard = () => {
    if (chapter) addCard(chapter.id)
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
            {arranging ? (
              <p className="truncate text-sm font-semibold">Arrange notes</p>
            ) : searching ? (
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
            {!arranging && !searching && chapter && subject && (
              <p className="truncate text-xs text-muted-foreground">{subject.name}</p>
            )}
          </div>
          {arranging ? (
            <Button
              size="sm"
              className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => setArranging(false)}
            >
              <Check className="h-4 w-4" /> Done
            </Button>
          ) : (
            !searching && (
              <div className="flex items-center gap-1">
                {onImportMd && !showingFlashcards && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onImportMd}
                    title="Import a .md file as a note"
                    aria-label="Import a markdown file"
                  >
                    <FileUp className="h-4 w-4" />
                  </Button>
                )}
                {showingFlashcards ? (
                  <Button size="sm" onClick={handleNewCard} disabled={!chapter} title="New flashcard">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Card</span>
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleNewNote} disabled={!chapter} title="New note">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">New</span>
                  </Button>
                )}
              </div>
            )
          )}
        </div>

        {/* Workspace tabs — Notes | Flashcards (a chapter has both) */}
        {chapter && !arranging && (
          <div className="flex w-fit items-center rounded-lg border p-0.5" role="tablist" aria-label="Chapter workspace">
            <Button
              size="sm"
              variant={showingFlashcards ? 'ghost' : 'secondary'}
              className="h-7 gap-1.5 px-2.5 text-xs"
              role="tab"
              aria-selected={!showingFlashcards}
              onClick={() => setChapterTab('notes')}
            >
              <StickyNote className="h-3.5 w-3.5" />
              Notes
              <span className="tabular-nums text-muted-foreground">{notesOfChapter}</span>
            </Button>
            <Button
              size="sm"
              variant={showingFlashcards ? 'secondary' : 'ghost'}
              className="h-7 gap-1.5 px-2.5 text-xs"
              role="tab"
              aria-selected={showingFlashcards}
              onClick={() => setChapterTab('flashcards')}
            >
              <Layers className="h-3.5 w-3.5" />
              Flashcards
              <span className="tabular-nums text-muted-foreground">{deck.length}</span>
            </Button>
          </div>
        )}

        {arranging ? (
          <p className="flex items-center gap-1.5 rounded-md border border-dashed border-emerald-600/40 bg-emerald-600/5 px-3 py-2 text-xs leading-4 text-muted-foreground">
            <MoveVertical className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            Drag the handles to reorder the notes — Done when finished
          </p>
        ) : showingFlashcards ? (
          <p className="flex items-center gap-1.5 rounded-md border border-dashed border-emerald-600/30 bg-emerald-600/5 px-3 py-2 text-xs leading-4 text-muted-foreground">
            <Layers className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            {deck.length === 0
              ? 'Empty deck — add your first flashcard below.'
              : 'Open a card to make it — or hit View in the workspace to study.'}
          </p>
        ) : (
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
        )}
      </div>

      {/* List */}
      <div
        className={cn('flex-1 overflow-y-auto p-2', arranging && 'select-none')}
        data-arrange-scroll
      >
        {showingFlashcards ? (
          deck.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <Layers className="h-9 w-9 text-muted-foreground/40" />
              <p className="text-sm font-medium">No flashcards yet</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Make your first card — a question on the front, the answer on the back.
              </p>
              <Button size="sm" variant="outline" onClick={handleNewCard}>
                <Plus className="h-4 w-4" /> New card
              </Button>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {deck.map((card, i) => (
                <li key={card.id} className="group/card relative">
                  <button
                    type="button"
                    onClick={() => handleCardClick(card)}
                    className={cn(
                      'w-full rounded-lg border p-3 pr-10 text-left transition-colors',
                      card.id === selectedCardId
                        ? 'border-transparent bg-accent'
                        : 'border-transparent hover:border-border hover:bg-accent/50',
                    )}
                    aria-label={`Open flashcard ${i + 1}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 w-6 shrink-0 rounded border bg-muted/60 px-1 py-px text-center text-[10px] font-semibold tabular-nums text-muted-foreground">
                        {i + 1}
                      </span>
                      <p className="min-w-0 flex-1 break-words text-sm font-medium line-clamp-2">
                        <CardExcerpt markdown={card.front} emptyText="Empty front" />
                      </p>
                    </div>
                    <p className="mt-1 line-clamp-1 pl-8 text-xs text-muted-foreground">
                      <span className="font-semibold">Answer:</span>{' '}
                      <CardExcerpt markdown={card.back} emptyText="empty back" />
                    </p>
                    <div className="mt-2 flex items-center gap-2 pl-8 text-[11px] text-muted-foreground">
                      <span className="tabular-nums">
                        {formatDistanceToNow(new Date(card.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1.5 top-1.5 h-7 w-7 opacity-0 transition-opacity group-hover/card:opacity-100 data-[state=open]:opacity-100"
                        aria-label={`Options for flashcard ${i + 1}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onClick={() => chapter && moveCard(chapter.id, card.id, -1)}
                        disabled={i === 0}
                      >
                        <ArrowUp className="h-4 w-4" /> Move earlier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => chapter && moveCard(chapter.id, card.id, 1)}
                        disabled={i === deck.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" /> Move later
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setCardToDelete(card)}>
                        <Trash2 className="h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          )
        ) : visibleNotes.length === 0 ? (
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
            {visibleNotes.map((note, i) => {
              const noteChapter = chapters.find((c) => c.id === note.chapterId)
              const noteSubject = noteChapter
                ? subjects.find((s) => s.id === noteChapter.subjectId)
                : null
              const active = note.id === selectedNoteId
              return (
                <li
                  key={note.id}
                  data-arrange-id={note.id}
                  data-arrange-group="note"
                  className={cn('group/note relative', drag?.dragId === note.id && 'opacity-40')}
                >
                  {dragNote && drag?.dropIndex === i && (
                    <div className="pointer-events-none absolute -top-px left-0 right-0 z-10 h-[2px] rounded-full bg-emerald-600" />
                  )}
                  {arranging && (
                    <button
                      type="button"
                      className="absolute left-1.5 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
                      aria-label={`Reorder note ${note.title || 'Untitled note'}`}
                      title={`Reorder ${note.title || 'Untitled note'}`}
                      onPointerDown={(e) => startDrag(e, note.id, 'note')}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleNoteClick(note)}
                    className={cn(
                      'w-full rounded-lg border p-3 text-left transition-colors',
                      arranging
                        ? 'cursor-default border-border/60 pl-11'
                        : 'border-transparent pr-10',
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
                          'min-w-0 flex-1 break-words text-sm line-clamp-2',
                          active ? 'font-semibold' : 'font-medium',
                        )}
                      >
                        {note.title || 'Untitled note'}
                      </p>
                    </div>
                    <NoteExcerpt note={note} />
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
                  {!arranging && (
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
                        <DropdownMenuItem
                          onClick={() => setArranging(true)}
                          disabled={searching}
                          title={searching ? 'Clear the search to rearrange' : 'Rearrange the notes'}
                        >
                          <GripVertical className="h-4 w-4" /> Move
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => setNoteToDelete(note)}>
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              )
            })}
            {arranging && (
              <li data-arrange-end="note" className={cn('relative', dragNote ? 'h-7' : 'h-3')}>
                {dragNote && drag?.dropIndex === visibleNotes.length && (
                  <div className="pointer-events-none absolute -top-px left-0 right-0 h-[2px] rounded-full bg-emerald-600" />
                )}
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Delete confirmation — notes */}
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

      {/* Delete confirmation — flashcards */}
      <AlertDialog open={cardToDelete !== null} onOpenChange={(open) => !open && setCardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this flashcard?</AlertDialogTitle>
            <AlertDialogDescription>
              Both sides will be permanently removed from the deck.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (cardToDelete) deleteCard(cardToDelete.id)
                setCardToDelete(null)
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
