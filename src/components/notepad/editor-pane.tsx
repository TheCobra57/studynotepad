'use client'

import { useMemo, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Bold,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  Code,
  Copy,
  Download,
  Eye,
  FileText,
  FlaskConical,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  MoreHorizontal,
  PanelLeft,
  Pencil,
  Pin,
  PinOff,
  Quote,
  Radical,
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
import type { EditorMode } from '@/lib/notepad/types'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { MarkdownPreview, Latex } from './markdown-preview'
import { FORMULA_TEMPLATES, SLASH_ITEMS } from './snippets'
import type { SlashItem } from './snippets'

interface EditorPaneProps {
  onBack?: () => void
  onOpenSidebar?: () => void
  onOpenCheatSheet?: () => void
}

export function EditorPane({ onBack, onOpenSidebar, onOpenCheatSheet }: EditorPaneProps) {
  const note = useSelectedNote()
  const chapters = useNotepadStore((s) => s.chapters)
  const subjects = useNotepadStore((s) => s.subjects)
  const { updateNote, togglePin, deleteNote, addNote } = useNotepadStore()
  const { toast } = useToast()
  const isMobile = useIsMobile()

  const [mode, setMode] = useState<EditorMode>('split')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [slash, setSlash] = useState<{
    start: number
    query: string
    items: SlashItem[]
    activeIndex: number
  } | null>(null)

  // split view is too cramped on phones — fall back to edit there
  const effectiveMode: EditorMode = isMobile && mode === 'split' ? 'edit' : mode

  const chapter = note ? chapters.find((c) => c.id === note.chapterId) : null
  const subject = chapter ? subjects.find((s) => s.id === chapter.subjectId) : null

  const stats = useMemo(() => {
    if (!note) return { words: 0, chars: 0 }
    const trimmed = note.content.trim()
    return {
      words: trimmed ? trimmed.split(/\s+/).length : 0,
      chars: note.content.length,
    }
  }, [note])

  // ---------- text helpers ----------

  const applyWrap = (prefix: string, suffix: string, placeholder: string) => {
    const ta = textareaRef.current
    if (!ta || !note) return
    const { selectionStart: start, selectionEnd: end, value } = ta
    const inner = value.slice(start, end) || placeholder
    const next = value.slice(0, start) + prefix + inner + suffix + value.slice(end)
    updateNote(note.id, { content: next })
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(start + prefix.length, start + prefix.length + inner.length)
    })
  }

  const insertText = (text: string, caretFromEnd = 0, block = false) => {
    const ta = textareaRef.current
    if (!ta || !note) return
    const { selectionStart: start, selectionEnd: end, value } = ta
    let piece = text
    if (block) {
      const needsLeading = start > 0 && value[start - 1] !== '\n'
      const needsTrailing = end < value.length && value[end] !== '\n'
      piece = (needsLeading ? '\n' : '') + text + (needsTrailing ? '\n' : '')
    }
    const next = value.slice(0, start) + piece + value.slice(end)
    updateNote(note.id, { content: next })
    const caret = start + piece.length + caretFromEnd
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(caret, caret)
    })
  }

  // ---------- slash menu ----------

  const detectSlash = (value: string, caret: number) => {
    const upToCaret = value.slice(0, caret)
    const m = upToCaret.match(/(?:^|\n|\s)\/([\w-]*)$/)
    if (!m) return null
    return { start: caret - m[1].length - 1, query: m[1].toLowerCase() }
  }

  const refreshSlash = (value: string, caret: number) => {
    const detected = detectSlash(value, caret)
    if (!detected) {
      setSlash(null)
      return
    }
    const q = detected.query
    const items = SLASH_ITEMS.filter(
      (it) => it.label.toLowerCase().includes(q) || it.keywords.includes(q),
    )
    setSlash({ start: detected.start, query: q, items, activeIndex: 0 })
  }

  const insertSlashItem = (item: SlashItem) => {
    const ta = textareaRef.current
    if (!ta || !note || !slash) return
    const { start } = slash
    const caret = ta.selectionStart
    const value = note.content
    const next = value.slice(0, start) + item.insert + value.slice(caret)
    updateNote(note.id, { content: next })
    setSlash(null)
    const newCaret = start + item.insert.length + (item.caretFromEnd ?? 0)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(newCaret, newCaret)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slash) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSlash((m) => (m ? { ...m, activeIndex: (m.activeIndex + 1) % m.items.length } : m))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSlash((m) =>
          m ? { ...m, activeIndex: (m.activeIndex - 1 + m.items.length) % m.items.length } : m,
        )
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const item = slash.items[slash.activeIndex]
        if (item) insertSlashItem(item)
        else setSlash(null)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setSlash(null)
        return
      }
    }
    const mod = e.metaKey || e.ctrlKey
    if (mod && e.key.toLowerCase() === 'b') {
      e.preventDefault()
      applyWrap('**', '**', 'bold text')
    } else if (mod && e.key.toLowerCase() === 'i') {
      e.preventDefault()
      applyWrap('*', '*', 'italic text')
    } else if (mod && e.key.toLowerCase() === 's') {
      e.preventDefault()
      toast({ title: 'Saved', description: 'Your notes are saved automatically in this browser.' })
    } else if (e.key === 'Tab') {
      e.preventDefault()
      insertText('  ')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!note) return
    const value = e.target.value
    updateNote(note.id, { content: value })
    refreshSlash(value, e.target.selectionStart)
  }

  // ---------- note actions ----------

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
      <div className="flex items-center gap-2 border-b px-3 py-2">
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

        {/* Mode switch */}
        <div className="flex items-center rounded-lg border p-0.5" role="tablist" aria-label="Editor mode">
          <Button
            variant={effectiveMode === 'edit' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => setMode('edit')}
            title="Edit only"
            role="tab"
            aria-selected={effectiveMode === 'edit'}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button
            variant={effectiveMode === 'split' ? 'secondary' : 'ghost'}
            size="icon"
            className="hidden h-7 w-7 md:inline-flex"
            onClick={() => setMode('split')}
            title="Split view"
            role="tab"
            aria-selected={effectiveMode === 'split'}
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="sr-only">Split</span>
          </Button>
          <Button
            variant={effectiveMode === 'preview' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={() => setMode('preview')}
            title="Preview only"
            role="tab"
            aria-selected={effectiveMode === 'preview'}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span className="sr-only">Preview</span>
          </Button>
        </div>

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

      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 px-3 py-1.5"
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
            <DropdownMenuItem onClick={() => insertText('# ', -2)}>
              <Heading1 className="h-4 w-4" /> Heading 1
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertText('## ', -3)}>
              <Heading2 className="h-4 w-4" /> Heading 2
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertText('### ', -4)}>
              <Heading3 className="h-4 w-4" /> Heading 3
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarButton label="Bold (Ctrl+B)" onClick={() => applyWrap('**', '**', 'bold text')}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Italic (Ctrl+I)" onClick={() => applyWrap('*', '*', 'italic text')}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarButton label="Bulleted list" onClick={() => insertText('- item', -5)}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" onClick={() => insertText('1. item', -5)}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="To-do list" onClick={() => insertText('- [ ] task', -5)}>
          <ListTodo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Quote" onClick={() => insertText('> ', -2)}>
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarButton label="Table" onClick={() => insertText('| Term | Meaning |\n|---|---|\n|  |  |', -3, true)}>
          <Table className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Code block" onClick={() => insertText('```\n\n```', -4, true)}>
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Divider" onClick={() => insertText('---', 0, true)}>
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarButton
          label="Inline math — $…$"
          onClick={() => applyWrap('$', '$', 'x^2')}
          className="font-serif"
        >
          <Sigma className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Math block — $$…$$"
          onClick={() => insertText('$$\nE = mc^2\n$$', -4, true)}
        >
          <Radical className="h-4 w-4" />
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
                onClick={() => insertText(t.insert)}
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
                onClick={() => insertText(t.insert)}
              >
                <span className="text-xs">{t.label}</span>
                <Latex tex={t.preview} className="text-muted-foreground" />
              </DropdownMenuItem>
            ))}
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

      {/* Title */}
      <div className="px-4 pt-4 md:px-6">
        <Input
          value={note.title}
          onChange={(e) => updateNote(note.id, { title: e.target.value })}
          placeholder="Untitled note"
          className="h-auto border-none px-0 text-xl font-bold tracking-tight shadow-none focus-visible:ring-0 md:text-2xl"
          aria-label="Note title"
          maxLength={120}
        />
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {effectiveMode !== 'preview' && (
          <div
            className={cn(
              'relative flex min-w-0 flex-col',
              effectiveMode === 'split' ? 'w-1/2' : 'w-full',
            )}
          >
            <textarea
              ref={textareaRef}
              value={note.content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onClick={() => setSlash(null)}
              placeholder={'Start writing…\n\nType / for quick insert\n$…$ for math   •   \\ce{} for chemistry'}
              spellCheck={false}
              className="min-h-0 flex-1 resize-none bg-transparent px-4 py-4 text-[15px] leading-7 outline-none placeholder:text-muted-foreground/60 md:px-6"
              aria-label="Note content"
            />

            {/* Slash quick-insert menu */}
            {slash && (
              <div
                className="absolute left-4 top-2 z-30 w-72 overflow-hidden rounded-lg border bg-popover shadow-lg"
                onMouseDown={(e) => e.preventDefault()}
                role="listbox"
                aria-label="Quick insert"
              >
                <div className="max-h-72 overflow-y-auto p-1">
                  {slash.items.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                      No matches for “/{slash.query}”
                    </p>
                  ) : (
                    slash.items.map((item, i) => (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={i === slash.activeIndex}
                        onClick={() => insertSlashItem(item)}
                        className={cn(
                          'flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left transition-colors',
                          i === slash.activeIndex ? 'bg-accent' : 'hover:bg-accent/60',
                        )}
                      >
                        <span className="text-sm font-medium">{item.label}</span>
                        {item.hint && (
                          <span className="text-xs text-muted-foreground">{item.hint}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
                <div className="border-t bg-muted/50 px-3 py-1.5 text-[11px] text-muted-foreground">
                  ↑↓ navigate · ↵ insert · esc close
                </div>
              </div>
            )}
          </div>
        )}

        {effectiveMode === 'split' && <div className="w-px shrink-0 bg-border" aria-hidden />}

        {effectiveMode !== 'edit' && (
          <div
            className={cn(
              'min-w-0 overflow-y-auto px-4 py-4 md:px-6',
              effectiveMode === 'split' ? 'w-1/2' : 'w-full',
            )}
          >
            {note.content.trim() ? (
              <MarkdownPreview content={note.content} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Nothing to preview yet — start typing on the left.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2 text-[11px] text-muted-foreground md:px-6">
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
