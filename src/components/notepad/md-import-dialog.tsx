'use client'

import { useMemo, useRef, useState } from 'react'
import { CircleAlert, FileText, FileUp, TriangleAlert, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useNotepadStore } from '@/lib/notepad/store'
import { formatBytes } from '@/lib/notepad/image'
import {
  isMarkdownFile,
  parseImportedMd,
  resolveFrontmatter,
  type ParsedMd,
} from '@/lib/notepad/md-import'
import type { Note } from '@/lib/notepad/types'
import { useToast } from '@/hooks/use-toast'

interface MdImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** fired after a note was created from the file (e.g. to open the editor on mobile) */
  onImported?: (note: Note) => void
}

const PREVIEW_CHARS = 600

/**
 * Import a Markdown (.md) file as a new note.
 *
 * The file's title comes from its frontmatter, first `# heading` or file name
 * (in that order). An optional frontmatter `subject` / `chapter` routes the
 * note automatically — when either element doesn't exist in the pad, an error
 * is shown and the user picks an existing destination instead. Importing adds
 * a note; it never touches the existing ones (unlike a full backup restore).
 */
export function MdImportDialog({ open, onOpenChange, onImported }: MdImportDialogProps) {
  const subjects = useNotepadStore((s) => s.subjects)
  const chapters = useNotepadStore((s) => s.chapters)
  const { addNote, updateNote } = useNotepadStore()
  const { toast } = useToast()

  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedMd | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [subjectId, setSubjectId] = useState('')
  const [chapterId, setChapterId] = useState('')
  const [fmWarning, setFmWarning] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // fresh state every time the dialog opens, preselecting the current location
  // (the render-phase "prop changed → adjust state" pattern; no effect needed)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setFile(null)
      setParsed(null)
      setFileError(null)
      setFmWarning(null)
      setDragOver(false)
      const state = useNotepadStore.getState()
      const chapter = state.chapters.find((c) => c.id === state.selectedChapterId)
      const sid = chapter?.subjectId ?? state.subjects[0]?.id ?? ''
      const cid = chapter?.id ?? state.chapters.find((c) => c.subjectId === sid)?.id ?? ''
      setSubjectId(sid)
      setChapterId(cid)
    }
  }

  // ---------- derived destination (self-heals if elements were deleted) ----------

  const safeSubjectId = subjects.some((s) => s.id === subjectId)
    ? subjectId
    : (subjects[0]?.id ?? '')
  const subjectChapters = useMemo(
    () => chapters.filter((c) => c.subjectId === safeSubjectId),
    [chapters, safeSubjectId],
  )
  const safeChapterId = subjectChapters.some((c) => c.id === chapterId)
    ? chapterId
    : (subjectChapters[0]?.id ?? '')
  const subject = subjects.find((s) => s.id === safeSubjectId) ?? null
  const chapter = subjectChapters.find((c) => c.id === safeChapterId) ?? null

  // ---------- "element doesn't exist" blockers ----------

  const blockingError =
    subjects.length === 0
      ? 'You have no subjects yet — create a subject in the sidebar before importing a note.'
      : subject && subjectChapters.length === 0
        ? `“${subject.name}” has no chapters — add a chapter in the sidebar first.`
        : !chapter
          ? 'Choose a chapter to import the note into.'
          : null

  // ---------- file handling ----------

  const handleFile = (f: File | undefined | null) => {
    if (!f) return
    if (!isMarkdownFile(f)) {
      setFile(null)
      setParsed(null)
      setFileError(`“${f.name}” is not a Markdown file — only .md / .markdown files can be imported.`)
      return
    }
    f.text()
      .then((text) => {
        if (!text.trim()) {
          setFile(null)
          setParsed(null)
          setFileError(`“${f.name}” is empty — there is nothing to import.`)
          return
        }
        const result = parseImportedMd(text, f.name)
        setFile(f)
        setParsed(result)
        setFileError(null)

        // frontmatter auto-routing — surface an error when the element is missing
        const target = resolveFrontmatter(result.frontmatter, subjects, chapters)
        if (target.missing) {
          setFmWarning(
            `The file asks for ${target.missing}, which doesn’t exist in your pad — pick a destination below.`,
          )
        } else {
          setFmWarning(null)
        }
        if (target.subjectId) setSubjectId(target.subjectId)
        if (target.chapterId) setChapterId(target.chapterId)
      })
      .catch(() => {
        setFile(null)
        setParsed(null)
        setFileError('The file could not be read.')
      })
  }

  const clearFile = () => {
    setFile(null)
    setParsed(null)
    setFileError(null)
    setFmWarning(null)
  }

  // picking manually resolves the frontmatter warning
  const pickSubject = (id: string) => {
    setSubjectId(id)
    setFmWarning(null)
  }
  const pickChapter = (id: string) => {
    setChapterId(id)
    setFmWarning(null)
  }

  const canImport = !!parsed && !fileError && !!chapter

  const handleImport = () => {
    if (!parsed || !chapter) return
    const note = addNote(chapter.id, parsed.title || 'Untitled note')
    if (parsed.content) updateNote(note.id, { content: parsed.content })
    onOpenChange(false)
    toast({
      title: 'Note imported',
      description: `“${note.title}” was added to ${chapter.name}.`,
    })
    onImported?.(note)
  }

  const words = parsed?.content.trim() ? parsed.content.trim().split(/\s+/).length : 0
  const preview =
    parsed && parsed.content.trim()
      ? parsed.content.slice(0, PREVIEW_CHARS) + (parsed.content.length > PREVIEW_CHARS ? '…' : '')
      : '(empty note — just a title)'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85dvh] overflow-y-auto sm:max-w-md"
        data-testid="md-import-dialog"
      >
        <DialogHeader>
          <DialogTitle>Import Markdown note</DialogTitle>
          <DialogDescription>
            Turn a <code className="rounded bg-muted px-1 py-0.5 text-[12px]">.md</code> file into
            a new note — your existing notes stay untouched.
          </DialogDescription>
        </DialogHeader>

        {/* drop zone / loaded file card */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            if (!dragOver) setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleFile(e.dataTransfer.files?.[0])
          }}
          className={cn(
            'rounded-lg border-2 border-dashed transition-colors',
            dragOver
              ? 'border-emerald-600 bg-emerald-600/5'
              : fileError
                ? 'border-destructive/50'
                : 'border-border',
            parsed && file && 'border-solid',
          )}
        >
          {parsed && file ? (
            <div className="flex items-center gap-3 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={file.name}>
                  {file.name}
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {formatBytes(file.size)} · {words} {words === 1 ? 'word' : 'words'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 px-2.5"
                onClick={() => inputRef.current?.click()}
              >
                Change
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={clearFile}
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              className="flex w-full flex-col items-center gap-1.5 rounded-lg p-6 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => inputRef.current?.click()}
            >
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full bg-muted',
                  dragOver && 'bg-emerald-600/10 text-emerald-600',
                )}
              >
                <FileUp className="h-5 w-5 text-muted-foreground" aria-hidden />
              </span>
              <span className="text-sm font-medium">
                {dragOver ? 'Drop the file to use it' : 'Drop your .md file here'}
              </span>
              <span className="text-xs text-muted-foreground">
                or click to browse — .md and .markdown files
              </span>
            </button>
          )}
        </div>

        {/* parsed preview */}
        {parsed && (
          <div className="rounded-lg border bg-muted/30 p-3" data-testid="md-import-preview">
            <div className="flex items-baseline justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-semibold" title={parsed.title}>
                {parsed.title}
              </p>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {parsed.frontmatter.title
                  ? 'title from frontmatter'
                  : parsed.usedHeading
                    ? 'title from first heading'
                    : 'title from file name'}
              </span>
            </div>
            <pre className="mt-2 max-h-24 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-4 text-muted-foreground">
              {preview}
            </pre>
          </div>
        )}

        {/* destination */}
        <div className="space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Destination
          </p>
          <div className="space-y-1.5">
            <label htmlFor="md-import-subject" className="text-xs font-medium text-muted-foreground">
              Subject
            </label>
            <Select
              value={safeSubjectId}
              onValueChange={pickSubject}
              disabled={subjects.length === 0}
            >
              <SelectTrigger id="md-import-subject" className="w-full">
                <SelectValue placeholder={subjects.length === 0 ? 'No subjects yet' : 'Choose a subject'} />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: s.color }}
                        aria-hidden
                      />
                      {s.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="md-import-chapter" className="text-xs font-medium text-muted-foreground">
              Chapter
            </label>
            <Select
              value={safeChapterId}
              onValueChange={pickChapter}
              disabled={subjectChapters.length === 0}
            >
              <SelectTrigger id="md-import-chapter" className="w-full">
                <SelectValue
                  placeholder={
                    subjects.length === 0
                      ? 'No chapters'
                      : subjectChapters.length === 0
                        ? 'This subject has no chapters'
                        : 'Choose a chapter'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {subjectChapters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* errors — wrong file, or a required element doesn't exist */}
        {fileError && (
          <Alert variant="destructive" data-testid="md-import-error">
            <CircleAlert className="h-4 w-4" />
            <AlertDescription>{fileError}</AlertDescription>
          </Alert>
        )}
        {!fileError && blockingError && (
          <Alert variant="destructive" data-testid="md-import-error">
            <CircleAlert className="h-4 w-4" />
            <AlertDescription>{blockingError}</AlertDescription>
          </Alert>
        )}
        {!fileError && !blockingError && fmWarning && (
          <Alert
            className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400"
            data-testid="md-import-warning"
          >
            <TriangleAlert className="h-4 w-4" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              {fmWarning}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!canImport}
            onClick={handleImport}
            data-testid="md-import-submit"
          >
            <FileUp className="h-4 w-4" /> Import note
          </Button>
        </DialogFooter>

        <p className="text-center text-[11px] leading-4 text-muted-foreground">
          Tip: a{' '}
          <code className="rounded bg-muted px-1 py-0.5">
            title&nbsp;/&nbsp;subject&nbsp;/&nbsp;chapter
          </code>{' '}
          frontmatter block routes the note automatically.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".md,.markdown,.mdown,.mkd,text/markdown"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0])
            e.target.value = ''
          }}
          aria-label="Markdown file"
          data-testid="md-import-input"
        />
      </DialogContent>
    </Dialog>
  )
}
