'use client'

import { useMemo, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  BookOpen,
  Brush,
  Check,
  ChevronDown,
  ChevronLeft,
  Clipboard,
  Code,
  Copy,
  Download,
  FileText,
  FlaskConical,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  MoreHorizontal,
  PanelLeft,
  Pin,
  PinOff,
  Printer,
  Quote,
  Sigma,
  Table,
  Trash2,
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useNotepadStore, useSelectedNote } from '@/lib/notepad/store'
import { useToast } from '@/hooks/use-toast'
import { BlockEditor, type BlockEditorHandle } from './block-editor'
import { FORMULA_TEMPLATES, unwrapTemplate, type ImageAction } from './snippets'
import { Latex } from './markdown-preview'
import { Whiteboard } from './whiteboard'
import { LARGE_IMAGE_BYTES, formatBytes, processImageFile } from '@/lib/notepad/image'

interface EditorPaneProps {
  onBack?: () => void
  onOpenSidebar?: () => void
  onOpenCheatSheet?: () => void
  onPrint?: () => void
}

export function EditorPane({ onBack, onOpenSidebar, onOpenCheatSheet, onPrint }: EditorPaneProps) {
  const note = useSelectedNote()
  const chapters = useNotepadStore((s) => s.chapters)
  const subjects = useNotepadStore((s) => s.subjects)
  const { updateNote, togglePin, deleteNote, addNote } = useNotepadStore()
  const { toast } = useToast()
  const editorRef = useRef<BlockEditorHandle>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [whiteboardOpen, setWhiteboardOpen] = useState(false)
  const [whiteboardInitial, setWhiteboardInitial] = useState<string | null>(null)
  const [annotateTargetId, setAnnotateTargetId] = useState<string | null>(null)

  const chapter = note ? chapters.find((c) => c.id === note.chapterId) : null
  const subject = chapter ? subjects.find((s) => s.id === chapter.subjectId) : null

  const stats = useMemo(() => {
    if (!note) return { words: 0, chars: 0 }
    // images are stored as data URLs in the markdown — exclude them from the stats
    const withoutImages = note.content.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    const trimmed = withoutImages.trim()
    return {
      words: trimmed ? trimmed.split(/\s+/).length : 0,
      chars: withoutImages.length,
    }
  }, [note])

  // ---------- note actions ----------

  const handleContentChange = (markdown: string) => {
    if (note) updateNote(note.id, { content: markdown })
  }

  const copyMarkdown = async () => {
    if (!note) return
    try {
      await navigator.clipboard.writeText(`# ${note.title}\n\n${note.content}`)
      toast({ title: 'Copied', description: 'Note copied to clipboard as Markdown.' })
    } catch {
      toast({ title: 'Copy failed', description: 'Clipboard is unavailable.', variant: 'destructive' })
    }
  }

  const downloadMarkdown = () => {
    if (!note) return
    const blob = new Blob([`# ${note.title}\n\n${note.content}`], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(note.title || 'note').replace(/[^\w-]+/g, '-').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Downloaded', description: 'Note exported as a Markdown file.' })
  }

  // ---------- toolbar helpers ----------

  const tryWrap = (prefix: string, suffix: string, placeholder: string) => {
    const ok = editorRef.current?.wrapSelection(prefix, suffix, placeholder)
    if (!ok) {
      toast({
        title: 'Click into a text block first',
        description: 'Inline formatting applies to the block you are editing.',
      })
    }
  }

  const insertTemplate = (insert: string) => {
    const { tex, isBlock } = unwrapTemplate(insert)
    if (isBlock) editorRef.current?.insertMathBlock(tex)
    else editorRef.current?.insertInlineOrBlock(tex)
  }

  // ---------- image flows: upload / clipboard / whiteboard ----------

  const warnIfLarge = (results: { bytes: number }[]) => {
    const biggest = results.reduce((m, r) => Math.max(m, r.bytes), 0)
    if (biggest > LARGE_IMAGE_BYTES) {
      toast({
        title: 'Large image stored',
        description: `${formatBytes(biggest)} after compression — browser storage is ~5 MB, so keep an eye on it (use Export for backups).`,
      })
    }
  }

  const handleImageAction = (kind: ImageAction) => {
    if (!note) return
    if (kind === 'upload') {
      imageInputRef.current?.click()
      return
    }
    if (kind === 'whiteboard') {
      setWhiteboardInitial(null)
      setAnnotateTargetId(null)
      setWhiteboardOpen(true)
      return
    }
    // clipboard read (needs the async Clipboard API — a plain click can't read it)
    void (async () => {
      try {
        if (!navigator.clipboard || typeof navigator.clipboard.read !== 'function') {
          throw new Error('unsupported')
        }
        const items = await navigator.clipboard.read()
        for (const item of items) {
          const type = item.types.find((t) => t.startsWith('image/'))
          if (!type) continue
          const blob = await item.getType(type)
          const processed = await processImageFile(blob)
          editorRef.current?.insertImage(processed.dataUrl)
          warnIfLarge([processed])
          toast({
            title: 'Image inserted',
            description: `Pasted from clipboard · ${formatBytes(processed.bytes)}`,
          })
          return
        }
        toast({
          title: 'No image in the clipboard',
          description: 'Copy an image first — or just press Ctrl+V inside the note.',
        })
      } catch {
        toast({
          title: 'Clipboard read unavailable',
          description: 'Click inside the note and press Ctrl+V to paste the image directly.',
        })
      }
    })()
  }

  const handleImageFiles = (files: File[]) => {
    if (!files.length || !note) return
    void (async () => {
      const results: { dataUrl: string; bytes: number }[] = []
      for (const f of files) {
        try {
          results.push(await processImageFile(f))
        } catch {
          toast({
            title: 'Could not read image',
            description: f.name,
            variant: 'destructive',
          })
        }
      }
      if (!results.length) return
      editorRef.current?.insertImages(results.map((r) => r.dataUrl))
      warnIfLarge(results)
      toast({
        title: results.length === 1 ? 'Image added' : `${results.length} images added`,
        description: results.map((r) => formatBytes(r.bytes)).join(' · '),
      })
    })()
  }

  const handleAnnotateImage = (blockId: string, src: string) => {
    setWhiteboardInitial(src)
    setAnnotateTargetId(blockId)
    setWhiteboardOpen(true)
  }

  const handleWhiteboardInsert = (dataUrl: string) => {
    if (annotateTargetId) {
      editorRef.current?.replaceImage(annotateTargetId, dataUrl)
      toast({ title: 'Image updated', description: 'Whiteboard drawing replaced the image.' })
    } else {
      editorRef.current?.insertImage(dataUrl)
      toast({ title: 'Sketch inserted', description: 'Your whiteboard drawing is now in the note.' })
    }
    setWhiteboardOpen(false)
  }

  // ---------- render ----------

  if (!note) {
    const hasChapters = chapters.length > 0
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <FileText className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium">No note selected</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          {hasChapters
            ? 'Pick a note from the list, or create a new one to start writing.'
            : 'Create a subject and a chapter first, then add notes.'}
        </p>
        {hasChapters && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const currentChapter = useNotepadStore.getState().selectedChapterId
              if (currentChapter) addNote(currentChapter)
            }}
          >
            New note
          </Button>
        )}
      </div>
    )
  }

  const mathTemplates = FORMULA_TEMPLATES.filter((t) => t.category === 'math')
  const chemTemplates = FORMULA_TEMPLATES.filter((t) => t.category === 'chem')

  return (
    <div className="flex h-full min-w-0 flex-col">
      {/* Top bar */}
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        {onBack && (
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back to notes</span>
          </Button>
        )}
        {onOpenSidebar && (
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
        <div className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-muted-foreground">
          {subject && (
            <>
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: subject.color }}
                aria-hidden
              />
              <span className="shrink-0">{subject.name}</span>
              <span aria-hidden className="opacity-50">/</span>
            </>
          )}
          {chapter && <span className="truncate">{chapter.name}</span>}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {onPrint && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2.5"
              onClick={onPrint}
              title="Print (Ctrl+P)"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </Button>
          )}

          {/* Note menu */}
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Note options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => togglePin(note.id)}>
              {note.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              {note.pinned ? 'Unpin note' : 'Pin note'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={copyMarkdown}>
              <Copy className="h-4 w-4" /> Copy as Markdown
            </DropdownMenuItem>
            <DropdownMenuItem onClick={downloadMarkdown}>
              <Download className="h-4 w-4" /> Export .md file
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" /> Delete note
            </DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Toolbar — two fixed rows (never wraps: heights stay deterministic,
          and each row scrolls horizontally when the pane is narrow) */}
      <div className="shrink-0 border-b bg-muted/30">
        {/* row 1 — block structure & text formatting */}
        <div
          className="toolbar-scroll flex items-center gap-0.5 overflow-x-auto px-3 py-1.5"
          role="toolbar"
          aria-label="Formatting"
        >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 font-mono text-xs">
              <span className="font-bold">H</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
              <span className="sr-only">Heading</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => editorRef.current?.transformActive('h1')}>
              <Heading1 className="h-4 w-4" /> Heading 1
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editorRef.current?.transformActive('h2')}>
              <Heading2 className="h-4 w-4" /> Heading 2
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editorRef.current?.transformActive('h3')}>
              <Heading3 className="h-4 w-4" /> Heading 3
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarButton label="Bold (Ctrl+B)" onClick={() => tryWrap('**', '**', 'bold text')}>
          <span className="text-[13px] font-bold">B</span>
        </ToolbarButton>
        <ToolbarButton label="Italic (Ctrl+I)" onClick={() => tryWrap('*', '*', 'italic text')}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Inline code (Ctrl+E)" onClick={() => tryWrap('`', '`', 'code')}>
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarButton
          label="Bulleted list"
          onClick={() => editorRef.current?.transformActive('bullet')}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          onClick={() => editorRef.current?.transformActive('numbered')}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="To-do list"
          onClick={() => editorRef.current?.transformActive('todo')}
        >
          <ListTodo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Quote" onClick={() => editorRef.current?.transformActive('quote')}>
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarButton
          label="Table"
          onClick={() => editorRef.current?.transformActive('table')}
        >
          <Table className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Code block"
          onClick={() => editorRef.current?.transformActive('code')}
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Divider"
          onClick={() => editorRef.current?.transformActive('divider')}
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>
        </div>

        {/* row 2 — math, chemistry, images & whiteboard */}
        <div
          className="toolbar-scroll flex items-center gap-0.5 overflow-x-auto border-t border-border/60 px-3 py-1.5"
          role="toolbar"
          aria-label="Insert"
        >
        <ToolbarButton
          label="Inline math — $…$"
          onClick={() => tryWrap('$', '$', 'x^2')}
          className="font-serif"
        >
          <span className="font-serif text-[15px]">x</span>
        </ToolbarButton>
        <ToolbarButton
          label="Equation block"
          onClick={() => editorRef.current?.insertMathBlock()}
        >
          <Sigma className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Chemical equation"
          onClick={() => editorRef.current?.insertMathBlock('\\ce{}', -1)}
        >
          <FlaskConical className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </ToolbarButton>

        {/* Formula templates */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs"
              title="Insert a formula template"
            >
              <FlaskConical className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Formulas
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[340px]">
            <DropdownMenuLabel className="flex items-center gap-1.5 text-xs">
              <FlaskConical className="h-3.5 w-3.5" /> Chemistry
            </DropdownMenuLabel>
            {chemTemplates.map((t) => (
              <DropdownMenuItem
                key={t.id}
                className="flex items-center justify-between gap-3"
                onClick={() => insertTemplate(t.insert)}
              >
                <span className="text-xs">{t.label}</span>
                <Latex tex={t.preview} className="text-muted-foreground" />
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center gap-1.5 text-xs">
              <Sigma className="h-3.5 w-3.5" /> Mathematics
            </DropdownMenuLabel>
            {mathTemplates.map((t) => (
              <DropdownMenuItem
                key={t.id}
                className="flex items-center justify-between gap-3"
                onClick={() => insertTemplate(t.insert)}
              >
                <span className="text-xs">{t.label}</span>
                <Latex tex={t.preview} className="text-muted-foreground" />
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Image insert dropdown — upload / clipboard / whiteboard */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs"
              title="Insert an image"
            >
              <ImageIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Images
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuItem onClick={() => handleImageAction('upload')}>
              <ImagePlus className="h-4 w-4" />
              <span className="flex-1">Upload image…</span>
              <span className="text-[10px] text-muted-foreground">file</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleImageAction('clipboard')}>
              <Clipboard className="h-4 w-4" />
              <span className="flex-1">Paste from clipboard</span>
              <span className="text-[10px] text-muted-foreground">Ctrl+V</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleImageAction('whiteboard')}>
              <Brush className="h-4 w-4" />
              <span className="flex-1">Draw on whiteboard…</span>
              <span className="text-[10px] text-muted-foreground">sketch</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <p className="px-2 pb-1.5 text-[11px] leading-snug text-muted-foreground">
              You can also drag &amp; drop image files onto the note, or just press Ctrl+V while
              writing.
            </p>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-xs"
            onClick={onOpenCheatSheet}
            title="LaTeX & chemistry syntax guide"
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden md:inline">Cheat sheet</span>
          </Button>
        </div>
        </div>
      </div>

      {/* Title */}
      <div className="shrink-0 px-4 pt-4 md:px-6">
        <Input
          value={note.title}
          onChange={(e) => updateNote(note.id, { title: e.target.value })}
          placeholder="Untitled note"
          className="h-auto border-none px-0 text-xl font-bold tracking-tight shadow-none focus-visible:ring-0 md:text-2xl"
          aria-label="Note title"
          maxLength={120}
        />
      </div>

      {/* Body — WYSIWYG block editor */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-6">
        <BlockEditor
          key={note.id}
          ref={editorRef}
          noteId={note.id}
          content={note.content}
          onChange={handleContentChange}
          onImageAction={handleImageAction}
          onAnnotateImage={handleAnnotateImage}
        />
      </div>

      {/* Stats bar */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2 text-[11px] text-muted-foreground md:px-6">
        <span className="tabular-nums">{stats.words} words</span>
        <span className="tabular-nums">{stats.chars} characters</span>
        <span className="ml-auto inline-flex items-center gap-1">
          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          Saved locally
        </span>
        <span>
          Updated {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
        </span>
      </div>

      {/* Whiteboard — draw & insert (also used to annotate images) */}
      <Whiteboard
        open={whiteboardOpen}
        onOpenChange={(open) => {
          setWhiteboardOpen(open)
          if (!open) {
            setWhiteboardInitial(null)
            setAnnotateTargetId(null)
          }
        }}
        onInsert={handleWhiteboardInsert}
        initialImage={whiteboardInitial}
      />

      {/* Hidden image file input (upload flow) */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        data-image-upload
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'))
          e.target.value = '' // allow picking the same file again
          handleImageFiles(files)
        }}
        aria-label="Upload images"
      />

      {/* Delete confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{note.title || 'Untitled note'}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The note and all of its content will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                deleteNote(note.id)
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

function ToolbarButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8', className)}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {children}
    </Button>
  )
}
