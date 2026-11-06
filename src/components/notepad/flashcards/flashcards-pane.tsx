'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Layers,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  PanelLeft,
  Plus,
  RectangleHorizontal,
  Shuffle,
  SquarePen,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { useNotepadStore, useSelectedCard, chapterDeck } from '@/lib/notepad/store'
import type { EditorFocusMode } from '@/lib/notepad/types'
import { useToast } from '@/hooks/use-toast'
import { BlockEditor, type BlockEditorHandle } from '../block-editor'
import { CardFace } from './card-face'
import { Whiteboard } from '../whiteboard'
import { LARGE_IMAGE_BYTES, formatBytes, processImageFile } from '@/lib/notepad/image'

interface FlashcardsPaneProps {
  /** mobile: back to the deck list */
  onBack?: () => void
  onOpenSidebar?: () => void
  /** current focus mode: 'off' | 'area' (window only) | 'fullscreen' */
  focusMode?: EditorFocusMode
  onEnterFocus?: (mode: 'area' | 'fullscreen') => void
  onExitFocus?: () => void
}

/**
 * The chapter's flashcard workspace — the right pane when the Flashcards tab
 * is active. Two modes: Make (edit both sides of a card, full rich content
 * via the block editor) and View (study: big flip cards, click to turn).
 */
export function FlashcardsPane({
  onBack,
  onOpenSidebar,
  focusMode = 'off',
  onEnterFocus,
  onExitFocus,
}: FlashcardsPaneProps) {
  const chapters = useNotepadStore((s) => s.chapters)
  const flashcards = useNotepadStore((s) => s.flashcards)
  const selectedChapterId = useNotepadStore((s) => s.selectedChapterId)
  const mode = useNotepadStore((s) => s.flashcardMode)
  const setFlashcardMode = useNotepadStore((s) => s.setFlashcardMode)
  const { addCard } = useNotepadStore()

  const chapter = chapters.find((c) => c.id === selectedChapterId) ?? null
  const deck = chapterDeck(flashcards, selectedChapterId)

  return (
    <div className="flex h-full min-w-0 flex-col">
      {/* Top bar */}
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        {onBack && focusMode === 'off' && (
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back to deck</span>
          </Button>
        )}
        {onOpenSidebar && focusMode === 'off' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 lg:hidden"
            onClick={onOpenSidebar}
            title="Subjects"
          >
            <PanelLeft className="h-4 w-4" />
            <span className="sr-only">Open subjects</span>
          </Button>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Layers className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">{chapter ? chapter.name : 'Flashcards'}</p>
            <p className="text-[11px] text-muted-foreground">
              {deck.length} card{deck.length === 1 ? '' : 's'} in this chapter
            </p>
          </div>
        </div>

        {/* Mode toggle — Make / View */}
        <div
          className="flex items-center rounded-lg border p-0.5"
          role="tablist"
          aria-label="Flashcards mode"
        >
          <Button
            size="sm"
            variant={mode === 'make' ? 'secondary' : 'ghost'}
            className="h-7 gap-1.5 px-2.5 text-xs"
            role="tab"
            aria-selected={mode === 'make'}
            onClick={() => setFlashcardMode('make')}
          >
            <SquarePen className="h-3.5 w-3.5" />
            Make
          </Button>
          <Button
            size="sm"
            variant={mode === 'view' ? 'secondary' : 'ghost'}
            className="h-7 gap-1.5 px-2.5 text-xs"
            role="tab"
            aria-selected={mode === 'view'}
            onClick={() => setFlashcardMode('view')}
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </Button>
        </div>

        {/* Focus modes — same behaviour as the notes editor */}
        {onEnterFocus && focusMode === 'off' && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 sm:inline-flex"
            onClick={() => onEnterFocus('area')}
            title="Full area — hide panels, keep the browser window"
            aria-label="Full area view"
          >
            <RectangleHorizontal className="h-4 w-4" />
          </Button>
        )}
        {onEnterFocus && focusMode !== 'fullscreen' && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 lg:inline-flex"
            onClick={() => onEnterFocus('fullscreen')}
            title={
              focusMode === 'area'
                ? 'Go fullscreen — also hide the browser chrome'
                : 'Fullscreen — hide panels & browser chrome'
            }
            aria-label="Enter fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        )}
        {onExitFocus && focusMode !== 'off' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onExitFocus}
            title={focusMode === 'fullscreen' ? 'Exit fullscreen (Esc)' : 'Exit full area (Esc)'}
            aria-label={focusMode === 'fullscreen' ? 'Exit fullscreen' : 'Exit full area view'}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        )}

        <Button
          size="sm"
          className="gap-1 px-2.5"
          disabled={!chapter}
          onClick={() => {
            if (!chapter) return
            addCard(chapter.id)
            setFlashcardMode('make')
          }}
          title="New flashcard"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Card</span>
        </Button>
      </div>

      {mode === 'make' ? (
        <MakeWorkspace />
      ) : (
        <ViewWorkspace />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Make mode — edit the selected card's two sides
// ---------------------------------------------------------------------------

function MakeWorkspace() {
  const flashcards = useNotepadStore((s) => s.flashcards)
  const selectedChapterId = useNotepadStore((s) => s.selectedChapterId)
  const card = useSelectedCard()
  const { updateCard, addCard, deleteCard, duplicateCard, moveCard, selectCard } = useNotepadStore()
  const { toast } = useToast()

  const deck = chapterDeck(flashcards, selectedChapterId)
  const pos = deck.findIndex((f) => f.id === card?.id)

  const frontRef = useRef<BlockEditorHandle>(null)
  const backRef = useRef<BlockEditorHandle>(null)
  const activeSideRef = useRef<'front' | 'back'>('front')
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [whiteboardOpen, setWhiteboardOpen] = useState(false)

  const activeHandle = () =>
    activeSideRef.current === 'back' ? backRef.current : frontRef.current

  const warnIfLarge = (bytes: number) => {
    if (bytes > LARGE_IMAGE_BYTES) {
      toast({
        title: 'Large image stored',
        description: `${formatBytes(bytes)} after compression — browser storage is ~5 MB, so keep an eye on it (use Export for backups).`,
      })
    }
  }

  const handleImageAction = (kind: 'upload' | 'clipboard' | 'whiteboard') => {
    if (kind === 'upload') {
      imageInputRef.current?.click()
      return
    }
    if (kind === 'whiteboard') {
      setWhiteboardOpen(true)
      return
    }
    toast({
      title: 'Paste inside the card instead',
      description: 'Copy the image anywhere, click into the card and press Ctrl+V.',
    })
  }

  const handleFiles = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'))
    if (!images.length) return
    for (const file of images) {
      try {
        const processed = await processImageFile(file)
        activeHandle()?.insertImage(processed.dataUrl)
        warnIfLarge(processed.bytes)
      } catch {
        toast({
          title: 'Could not read image',
          description: file.name,
          variant: 'destructive',
        })
      }
    }
  }

  if (!card) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <Layers className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium">No flashcards yet</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Make your first card — a question on the front, the answer on the back.
        </p>
        {selectedChapterId && (
          <Button size="sm" variant="outline" onClick={() => addCard(selectedChapterId)}>
            <Plus className="h-4 w-4" /> Create the first card
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {/* Card navigation */}
      <div className="sticky top-0 z-10 flex items-center gap-1.5 border-b bg-background/95 px-3 py-1.5 backdrop-blur md:px-4">
        <span className="text-xs tabular-nums text-muted-foreground">
          Card {pos + 1} of {deck.length}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              if (pos > 0) selectCard(deck[pos - 1].id)
            }}
            disabled={pos <= 0}
            title="Previous card"
            aria-label="Previous card"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              if (pos < deck.length - 1) selectCard(deck[pos + 1].id)
            }}
            disabled={pos >= deck.length - 1}
            title="Next card"
            aria-label="Next card"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Card options">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => duplicateCard(card.id)}>
                <Copy className="h-4 w-4" /> Duplicate card
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => selectedChapterId && moveCard(selectedChapterId, card.id, -1)}
                disabled={pos <= 0}
              >
                <ArrowUp className="h-4 w-4" /> Move earlier
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => selectedChapterId && moveCard(selectedChapterId, card.id, 1)}
                disabled={pos >= deck.length - 1}
              >
                <ArrowDown className="h-4 w-4" /> Move later
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" /> Delete card
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Both sides */}
      <div className="mx-auto w-full max-w-3xl space-y-7 px-4 py-5 md:px-6">
        <section onFocusCapture={() => (activeSideRef.current = 'front')}>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full border bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Front
            </span>
            <span className="text-[11px] text-muted-foreground">the question / prompt</span>
          </div>
          <BlockEditor
            key={`${card.id}-front`}
            ref={frontRef}
            noteId={`card-${card.id}-front`}
            content={card.front}
            onChange={(md) => updateCard(card.id, { front: md })}
            onImageAction={handleImageAction}
          />
        </section>

        <section onFocusCapture={() => (activeSideRef.current = 'back')}>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full border bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Back
            </span>
            <span className="text-[11px] text-muted-foreground">the answer / explanation</span>
          </div>
          <BlockEditor
            key={`${card.id}-back`}
            ref={backRef}
            noteId={`card-${card.id}-back`}
            content={card.back}
            onChange={(md) => updateCard(card.id, { back: md })}
            onImageAction={handleImageAction}
          />
        </section>

        <p className="pb-2 text-center text-[11px] text-muted-foreground">
          Type <span className="font-semibold">/</span> for commands — tables, images, equations,
          labels. Everything renders when you study in View mode.
        </p>
      </div>

      {/* Whiteboard — draw & insert into the active side */}
      <Whiteboard
        open={whiteboardOpen}
        onOpenChange={setWhiteboardOpen}
        onInsert={(dataUrl) => {
          activeHandle()?.insertImage(dataUrl)
          setWhiteboardOpen(false)
          toast({ title: 'Sketch inserted', description: 'Your whiteboard drawing is on the card.' })
        }}
        initialImage={null}
      />

      {/* Hidden image file input (upload flow) */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          void handleFiles(files)
        }}
        aria-label="Upload images for the card"
      />

      {/* Delete confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this card?</AlertDialogTitle>
            <AlertDialogDescription>
              Both sides will be permanently removed from the deck.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                deleteCard(card.id)
                setConfirmDelete(false)
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

// ---------------------------------------------------------------------------
// View mode — study: big flip cards, click to turn
// ---------------------------------------------------------------------------

function ViewWorkspace() {
  const flashcards = useNotepadStore((s) => s.flashcards)
  const selectedChapterId = useNotepadStore((s) => s.selectedChapterId)
  const card = useSelectedCard()
  const { selectCard, addCard, setFlashcardMode } = useNotepadStore()

  const deck = chapterDeck(flashcards, selectedChapterId)
  const [flipped, setFlipped] = useState(false)
  /** shuffled study order — null = deck order */
  const [shuffled, setShuffled] = useState<string[] | null>(null)

  const order =
    shuffled && shuffled.length === deck.length
      ? shuffled
      : deck.map((d) => d.id)
  const pos = card ? Math.max(0, order.indexOf(card.id)) : 0

  // turning to a different card always starts on its front — adjusted during
  // render (the React-recommended alternative to a setState-in-effect reset)
  const [flippedForId, setFlippedForId] = useState(card?.id ?? null)
  if ((card?.id ?? null) !== flippedForId) {
    setFlippedForId(card?.id ?? null)
    setFlipped(false)
  }

  const goTo = (delta: 1 | -1) => {
    if (!card || order.length === 0) return
    const next = (pos + delta + order.length) % order.length
    selectCard(order[next])
  }

  const toggleShuffle = () => {
    if (shuffled) {
      setShuffled(null)
      return
    }
    // Fisher–Yates over a copy of the current order
    const arr = [...order]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    setShuffled(arr)
    if (card) {
      // start the shuffled run at the card you're already on
      const at = arr.indexOf(card.id)
      if (at > 0) {
        setShuffled([...arr.slice(at), ...arr.slice(0, at)])
      }
    }
  }

  // keyboard: ←/→ move, Space/Enter flips
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ae = document.activeElement
      if (
        ae instanceof HTMLElement &&
        (ae.tagName === 'TEXTAREA' || ae.tagName === 'INPUT' || ae.isContentEditable)
      ) {
        return
      }
      if (
        document.querySelector(
          '[data-state="open"][role="menu"], [data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"]',
        )
      ) {
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goTo(1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goTo(-1)
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped((f) => !f)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!card) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <Layers className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium">Nothing to study yet</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Add a flashcard to this chapter first, then flip through it here.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (selectedChapterId) addCard(selectedChapterId)
            setFlashcardMode('make')
          }}
        >
          <Plus className="h-4 w-4" /> Create a card
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 py-4 md:px-6">
      <div className="mx-auto flex h-full w-full max-w-2xl min-h-0 flex-1 flex-col">
        {/* The card — click to turn */}
        <div
          className="flip-scene min-h-0 flex-1 cursor-pointer select-none"
          onClick={() => setFlipped((f) => !f)}
          title="Click to turn the card"
          aria-label={flipped ? 'Show the front' : 'Show the back'}
        >
          <div className={cn('flip-inner', flipped && 'is-flipped')}>
            <div className="flip-face rounded-2xl border bg-card shadow-sm">
              <FaceTag side="front" />
              <div className="flip-face-content">
                <CardFace markdown={card.front} />
              </div>
            </div>
            <div className="flip-face flip-back rounded-2xl border bg-card shadow-sm">
              <FaceTag side="back" />
              <div className="flip-face-content">
                <CardFace markdown={card.back} />
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-4 flex shrink-0 flex-wrap items-center justify-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 px-2.5"
            onClick={() => goTo(-1)}
            disabled={order.length < 2}
            aria-label="Previous card"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <span className="min-w-16 text-center text-xs tabular-nums text-muted-foreground">
            {pos + 1} / {order.length}
            {shuffled ? ' · shuffled' : ''}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 px-2.5"
            onClick={() => goTo(1)}
            disabled={order.length < 2}
            aria-label="Next card"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-8 gap-1.5 px-2.5 text-xs', shuffled && 'text-emerald-700 dark:text-emerald-400')}
            onClick={toggleShuffle}
            disabled={order.length < 2}
            title={shuffled ? 'Study in deck order again' : 'Study in random order'}
          >
            <Shuffle className="h-3.5 w-3.5" />
            {shuffled ? 'In order' : 'Shuffle'}
          </Button>
        </div>
        <p className="mt-2 shrink-0 text-center text-[11px] text-muted-foreground">
          Click the card to turn it · ← → to move · Space to flip
        </p>
      </div>
    </div>
  )
}

function FaceTag({ side }: { side: 'front' | 'back' }) {
  return (
    <div className="flex shrink-0 items-center justify-between px-4 pt-3">
      <span className="rounded-full border bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {side}
      </span>
    </div>
  )
}
