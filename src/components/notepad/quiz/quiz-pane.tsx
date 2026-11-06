'use client'

import { useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardList,
  ListChecks,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  PanelLeft,
  PenLine,
  Play,
  Plus,
  RectangleHorizontal,
  SquarePen,
  Tag,
  TextCursorInput,
  Trash2,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
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
import { useNotepadStore } from '@/lib/notepad/store'
import type { EditorFocusMode, Quiz, QuizQuestion, QuizQuestionType } from '@/lib/notepad/types'
import {
  QUIZ_TYPE_LABELS,
  QUIZ_TYPE_SHORT,
  gradeAnswer,
  gradeAttempt,
  type QuizResponse,
} from '@/lib/notepad/quiz'
import { useToast } from '@/hooks/use-toast'
import { BlockEditor, type BlockEditorHandle } from '../block-editor'
import { CardFace } from '../flashcards/card-face'
import { Whiteboard } from '../whiteboard'
import { LARGE_IMAGE_BYTES, formatBytes, processImageFile } from '@/lib/notepad/image'

interface QuizPaneProps {
  /** mobile: back to the quiz list */
  onBack?: () => void
  onOpenSidebar?: () => void
  /** current focus mode: 'off' | 'area' (window only) | 'fullscreen' */
  focusMode?: EditorFocusMode
  onEnterFocus?: (mode: 'area' | 'fullscreen') => void
  onExitFocus?: () => void
}

const TYPE_ICONS: Record<QuizQuestionType, LucideIcon> = {
  mcq: ListChecks,
  'fill-blank': TextCursorInput,
  'name-item': Tag,
  answer: PenLine,
}

const MAX_OPTIONS = 8

/**
 * The chapter's quiz workspace — the right pane when the Quiz tab is active.
 * Two modes: Create (build the quiz one question at a time) and Attempt
 * (take the quiz one question at a time, with instant feedback).
 */
export function QuizPane({
  onBack,
  onOpenSidebar,
  focusMode = 'off',
  onEnterFocus,
  onExitFocus,
}: QuizPaneProps) {
  const chapters = useNotepadStore((s) => s.chapters)
  const quizzes = useNotepadStore((s) => s.quizzes)
  const selectedChapterId = useNotepadStore((s) => s.selectedChapterId)
  const selectedQuizId = useNotepadStore((s) => s.selectedQuizId)
  const mode = useNotepadStore((s) => s.quizMode)
  const setQuizMode = useNotepadStore((s) => s.setQuizMode)
  const { addQuiz, addQuestion } = useNotepadStore()

  const chapter = chapters.find((c) => c.id === selectedChapterId) ?? null
  const chapterQuizzes = selectedChapterId
    ? quizzes.filter((q) => q.chapterId === selectedChapterId)
    : []
  const quiz = quizzes.find((q) => q.id === selectedQuizId) ?? null

  return (
    <div className="flex h-full min-w-0 flex-col">
      {/* Top bar */}
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        {onBack && focusMode === 'off' && (
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back to quizzes</span>
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
          <ClipboardList className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">{quiz ? quiz.title : 'Quiz'}</p>
            <p className="text-[11px] text-muted-foreground">
              {quiz
                ? `${quiz.questions.length} question${quiz.questions.length === 1 ? '' : 's'}`
                : `${chapterQuizzes.length} quiz${chapterQuizzes.length === 1 ? '' : 'zes'} in this chapter`}
            </p>
          </div>
        </div>

        {/* Mode toggle — Create / Attempt */}
        <div
          className="flex items-center rounded-lg border p-0.5"
          role="tablist"
          aria-label="Quiz mode"
        >
          <Button
            size="sm"
            variant={mode === 'create' ? 'secondary' : 'ghost'}
            className="h-7 gap-1.5 px-2.5 text-xs"
            role="tab"
            aria-selected={mode === 'create'}
            onClick={() => setQuizMode('create')}
          >
            <SquarePen className="h-3.5 w-3.5" />
            Create
          </Button>
          <Button
            size="sm"
            variant={mode === 'attempt' ? 'secondary' : 'ghost'}
            className="h-7 gap-1.5 px-2.5 text-xs"
            role="tab"
            aria-selected={mode === 'attempt'}
            onClick={() => setQuizMode('attempt')}
          >
            <Play className="h-3.5 w-3.5" />
            Attempt
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

        {quiz && mode === 'create' && (
          <Button
            size="sm"
            className="gap-1 px-2.5"
            onClick={() => addQuestion(quiz.id)}
            title="New question"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Question</span>
          </Button>
        )}
      </div>

      {!quiz ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">
            {chapter ? 'No quizzes in this chapter' : 'Pick a chapter first'}
          </p>
          <p className="max-w-xs text-xs text-muted-foreground">
            {chapter
              ? 'Create a quiz — multiple choice, fill in the blanks, name the item, or keyword-checked answers.'
              : 'Choose a chapter from the sidebar, then create a quiz for it.'}
          </p>
          {chapter && (
            <Button size="sm" variant="outline" onClick={() => addQuiz(chapter.id)}>
              <Plus className="h-4 w-4" /> Create a quiz
            </Button>
          )}
        </div>
      ) : mode === 'create' ? (
        <CreateWorkspace key={quiz.id} quiz={quiz} />
      ) : (
        <AttemptWorkspace key={quiz.id} quiz={quiz} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create mode — one question on screen at a time
// ---------------------------------------------------------------------------

function CreateWorkspace({ quiz }: { quiz: Quiz }) {
  const questions = quiz.questions
  const selectedQuestionId = useNotepadStore((s) => s.selectedQuestionId)
  const { updateQuestion, addQuestion, deleteQuestion, moveQuestion, selectQuestion } =
    useNotepadStore()
  const { toast } = useToast()

  const question = questions.find((q) => q.id === selectedQuestionId) ?? null
  const pos = questions.findIndex((q) => q.id === question?.id)

  const promptRef = useRef<BlockEditorHandle>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [whiteboardOpen, setWhiteboardOpen] = useState(false)
  const [keywordDraft, setKeywordDraft] = useState('')

  if (!question) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium">No questions yet</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Add the first question — the quiz is built one question at a time.
        </p>
        <Button size="sm" variant="outline" onClick={() => addQuestion(quiz.id)}>
          <Plus className="h-4 w-4" /> Add the first question
        </Button>
      </div>
    )
  }

  const patch = (p: Partial<Omit<QuizQuestion, 'id'>>) => updateQuestion(question.id, p)

  const switchType = (t: QuizQuestionType) => {
    if (t === question.type) return
    patch({
      type: t,
      // arriving at MCQ needs at least four option slots to fill in
      ...(t === 'mcq' && question.options.length < 4
        ? { options: [...question.options, ...Array<string>(4 - question.options.length).fill('')] }
        : {}),
      // arriving at a typed-answer type needs one accepted-answer slot
      ...(t !== 'mcq' && t !== 'answer' && question.acceptedAnswers.length === 0
        ? { acceptedAnswers: [''] }
        : {}),
    })
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
      title: 'Paste inside the question instead',
      description: 'Copy the image anywhere, click into the question and press Ctrl+V.',
    })
  }

  const handleFiles = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'))
    if (!images.length) return
    for (const file of images) {
      try {
        const processed = await processImageFile(file)
        promptRef.current?.insertImage(processed.dataUrl)
        if (processed.bytes > LARGE_IMAGE_BYTES) {
          toast({
            title: 'Large image stored',
            description: `${formatBytes(processed.bytes)} after compression — browser storage is ~5 MB, so keep an eye on it (use Export for backups).`,
          })
        }
      } catch {
        toast({
          title: 'Could not read image',
          description: file.name,
          variant: 'destructive',
        })
      }
    }
  }

  const addKeyword = () => {
    const kw = keywordDraft.trim()
    if (!kw) return
    if (question.keywords.some((k) => k.toLowerCase() === kw.toLowerCase())) {
      setKeywordDraft('')
      return
    }
    patch({ keywords: [...question.keywords, kw] })
    setKeywordDraft('')
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {/* Question navigation — one question on screen at a time */}
      <div className="sticky top-0 z-10 flex items-center gap-1.5 border-b bg-background/95 px-3 py-1.5 backdrop-blur md:px-4">
        <span className="text-xs tabular-nums text-muted-foreground">
          Question {pos + 1} of {questions.length}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => pos > 0 && selectQuestion(questions[pos - 1].id)}
            disabled={pos <= 0}
            title="Previous question"
            aria-label="Previous question"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => pos < questions.length - 1 && selectQuestion(questions[pos + 1].id)}
            disabled={pos >= questions.length - 1}
            title="Next question"
            aria-label="Next question"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Question options">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => moveQuestion(quiz.id, question.id, -1)}
                disabled={pos <= 0}
              >
                <ArrowUp className="h-4 w-4" /> Move earlier
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => moveQuestion(quiz.id, question.id, 1)}
                disabled={pos >= questions.length - 1}
              >
                <ArrowDown className="h-4 w-4" /> Move later
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" /> Delete question
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-5 md:px-6">
        {/* Type selector */}
        <section>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full border bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Type
            </span>
            <span className="text-[11px] text-muted-foreground">
              switching keeps everything you typed
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(QUIZ_TYPE_LABELS) as QuizQuestionType[]).map((t) => {
              const Icon = TYPE_ICONS[t]
              return (
                <Button
                  key={t}
                  size="sm"
                  variant={question.type === t ? 'secondary' : 'ghost'}
                  className={cn(
                    'h-8 gap-1.5 border px-3 text-xs',
                    question.type === t
                      ? 'border-violet-600/40 bg-violet-600/10 text-violet-700 dark:text-violet-400'
                      : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                  )}
                  onClick={() => switchType(t)}
                  aria-pressed={question.type === t}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {QUIZ_TYPE_LABELS[t]}
                </Button>
              )
            })}
          </div>
        </section>

        {/* Prompt */}
        <section>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full border bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Question
            </span>
            <span className="text-[11px] text-muted-foreground">
              {question.type === 'fill-blank'
                ? 'use ____ (four underscores) as the blank — in text, not inside math'
                : 'rich content — math, images, tables all work'}
            </span>
          </div>
          <BlockEditor
            key={`${question.id}-prompt`}
            ref={promptRef}
            noteId={`question-${question.id}-prompt`}
            content={question.prompt}
            onChange={(md) => patch({ prompt: md })}
            onImageAction={handleImageAction}
          />
        </section>

        {/* Type-specific answer configuration */}
        {question.type === 'mcq' && (
          <McqConfig question={question} patch={patch} />
        )}

        {(question.type === 'fill-blank' || question.type === 'name-item') && (
          <AcceptedAnswersConfig question={question} patch={patch} />
        )}

        {question.type === 'answer' && (
          <KeywordsConfig
            question={question}
            patch={patch}
            keywordDraft={keywordDraft}
            setKeywordDraft={setKeywordDraft}
            addKeyword={addKeyword}
          />
        )}

        <p className="pb-2 text-center text-[11px] text-muted-foreground">
          Type <span className="font-semibold">/</span> for commands — tables, images, equations,
          labels. Questions render fully when you attempt the quiz.
        </p>
      </div>

      {/* Whiteboard — draw & insert into the question */}
      <Whiteboard
        open={whiteboardOpen}
        onOpenChange={setWhiteboardOpen}
        onInsert={(dataUrl) => {
          promptRef.current?.insertImage(dataUrl)
          setWhiteboardOpen(false)
          toast({
            title: 'Sketch inserted',
            description: 'Your whiteboard drawing is on the question.',
          })
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
        aria-label="Upload images for the question"
      />

      {/* Delete confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be permanently removed from the quiz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                deleteQuestion(question.id)
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
// Create-mode config sections
// ---------------------------------------------------------------------------

type PatchFn = (p: Partial<Omit<QuizQuestion, 'id'>>) => void

function ConfigHeader({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span className="rounded-full border bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  )
}

function McqConfig({ question, patch }: { question: QuizQuestion; patch: PatchFn }) {
  return (
    <section>
      <ConfigHeader label="Options" hint="tap the circle to mark the correct one" />
      <div className="space-y-1.5">
        {question.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => patch({ correctOption: i })}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
                question.correctOption === i
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground/50 hover:text-foreground',
              )}
              aria-label={`Mark option ${String.fromCharCode(65 + i)} as correct`}
              aria-pressed={question.correctOption === i}
            >
              {question.correctOption === i ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </button>
            <Input
              value={opt}
              onChange={(e) =>
                patch({
                  options: question.options.map((o, j) => (j === i ? e.target.value : o)),
                })
              }
              placeholder={`Option ${String.fromCharCode(65 + i)}${question.correctOption === i ? ' — correct' : ''}`}
              className="h-9 text-sm"
              aria-label={`Option ${String.fromCharCode(65 + i)}`}
            />
            {question.options.length > 4 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  const options = question.options.filter((_, j) => j !== i)
                  const correctOption =
                    question.correctOption === i
                      ? 0
                      : question.correctOption > i
                        ? question.correctOption - 1
                        : question.correctOption
                  patch({ options, correctOption })
                }}
                aria-label={`Remove option ${String.fromCharCode(65 + i)}`}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 pl-10">
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-xs"
          onClick={() => patch({ options: [...question.options, ''] })}
          disabled={question.options.length >= MAX_OPTIONS}
        >
          <Plus className="h-3.5 w-3.5" /> Add option
        </Button>
        <span className="text-[11px] text-muted-foreground">
          four or more · up to {MAX_OPTIONS}
        </span>
      </div>
    </section>
  )
}

function AcceptedAnswersConfig({
  question,
  patch,
}: {
  question: QuizQuestion
  patch: PatchFn
}) {
  return (
    <section>
      <ConfigHeader label="Accepted answers" hint="case & punctuation don't matter" />
      <p className="mb-2 text-xs leading-5 text-muted-foreground">
        {question.type === 'fill-blank'
          ? 'Any of these counts as correct when the blank is filled — add alternatives like formulas or spellings.'
          : 'List every form of the name you would accept — e.g. “hydrogen” and “H₂”.'}
      </p>
      <div className="space-y-1.5">
        {question.acceptedAnswers.map((ans, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-xs font-medium text-muted-foreground">
              {i === 0 ? '✓' : '+'}
            </span>
            <Input
              value={ans}
              onChange={(e) =>
                patch({
                  acceptedAnswers: question.acceptedAnswers.map((a, j) =>
                    j === i ? e.target.value : a,
                  ),
                })
              }
              placeholder={i === 0 ? 'The answer' : 'Alternative answer'}
              className="h-9 text-sm"
              aria-label={i === 0 ? 'Accepted answer' : `Alternative answer ${i + 1}`}
            />
            {question.acceptedAnswers.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() =>
                  patch({ acceptedAnswers: question.acceptedAnswers.filter((_, j) => j !== i) })
                }
                aria-label={`Remove alternative answer ${i + 1}`}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="mt-2 h-8 gap-1 text-xs"
        onClick={() => patch({ acceptedAnswers: [...question.acceptedAnswers, ''] })}
      >
        <Plus className="h-3.5 w-3.5" /> Add alternative
      </Button>
    </section>
  )
}

function KeywordsConfig({
  question,
  patch,
  keywordDraft,
  setKeywordDraft,
  addKeyword,
}: {
  question: QuizQuestion
  patch: PatchFn
  keywordDraft: string
  setKeywordDraft: (v: string) => void
  addKeyword: () => void
}) {
  return (
    <section>
      <ConfigHeader label="Keywords" hint="all found = correct · accuracy = found ÷ total" />
      <p className="mb-2 text-xs leading-5 text-muted-foreground">
        The attempt is marked correct when <span className="font-semibold">every</span> keyword
        appears in the answer (plurals and word endings don&apos;t matter). Add word variants as
        separate keywords if needed.
      </p>
      {question.keywords.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {question.keywords.map((k, i) => (
            <span
              key={`${k}-${i}`}
              className="inline-flex items-center gap-1 rounded-full border border-violet-600/40 bg-violet-600/10 px-2.5 py-1 text-xs font-medium text-violet-700 dark:text-violet-400"
            >
              {k}
              <button
                type="button"
                onClick={() => patch({ keywords: question.keywords.filter((_, j) => j !== i) })}
                className="rounded-full p-0.5 hover:bg-violet-600/20"
                aria-label={`Remove keyword ${k}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input
          value={keywordDraft}
          onChange={(e) => setKeywordDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addKeyword()
            }
          }}
          placeholder="Type a keyword and press Enter…"
          className="h-9 text-sm"
          aria-label="Add a keyword"
        />
        <Button size="sm" variant="outline" className="h-9 gap-1" onClick={addKeyword}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Attempt mode — one question on screen at a time, instant feedback
// ---------------------------------------------------------------------------

function AttemptWorkspace({ quiz }: { quiz: Quiz }) {
  const setQuizMode = useNotepadStore((s) => s.setQuizMode)
  const questions = quiz.questions

  const [idx, setIdx] = useState(0)
  const [choices, setChoices] = useState<Record<string, number>>({})
  const [texts, setTexts] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [finished, setFinished] = useState(false)

  if (questions.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium">This quiz has no questions yet</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Switch to Create mode and add some questions first.
        </p>
        <Button size="sm" variant="outline" onClick={() => setQuizMode('create')}>
          <SquarePen className="h-4 w-4" /> Go to Create
        </Button>
      </div>
    )
  }

  const safeIdx = Math.min(idx, questions.length - 1)
  const question = questions[safeIdx]

  const responseFor = (q: QuizQuestion): QuizResponse =>
    q.type === 'mcq' ? { choice: choices[q.id] } : { text: texts[q.id] ?? '' }

  const isChecked = !!checked[question.id]
  const grading = isChecked ? gradeAnswer(question, responseFor(question)) : null
  const hasAnswer =
    question.type === 'mcq'
      ? choices[question.id] !== undefined
      : (texts[question.id] ?? '').trim().length > 0

  const check = () => setChecked((c) => ({ ...c, [question.id]: true }))
  const goNext = () => {
    if (safeIdx < questions.length - 1) setIdx(safeIdx + 1)
    else setFinished(true)
  }
  const retake = () => {
    setIdx(0)
    setChoices({})
    setTexts({})
    setChecked({})
    setFinished(false)
  }

  if (finished) {
    return <ResultsScreen quiz={quiz} responses={responsesFrom(choices, texts, questions)} onRetake={retake} />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-4 py-4 md:px-6">
        {/* progress */}
        <div className="shrink-0">
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span className="tabular-nums">
              Question {safeIdx + 1} of {questions.length}
            </span>
            <span className="tabular-nums">
              {Object.keys(checked).length} checked
            </span>
          </div>
          <Progress
            value={((safeIdx + (isChecked ? 1 : 0)) / questions.length) * 100}
            className="h-1.5"
            aria-label="Quiz progress"
          />
        </div>

        {/* the question — scrollable */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4">
          <div className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
            <div className="mb-2 flex items-center gap-2">
              <TypeBadge type={question.type} />
            </div>
            <CardFace markdown={question.prompt} />
          </div>

          {/* answer input */}
          {question.type === 'mcq' ? (
            <McqAttempt
              question={question}
              picked={choices[question.id]}
              isChecked={isChecked}
              onPick={(i) => setChoices((c) => ({ ...c, [question.id]: i }))}
            />
          ) : question.type === 'answer' ? (
            <Textarea
              value={texts[question.id] ?? ''}
              onChange={(e) => setTexts((t) => ({ ...t, [question.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isChecked) {
                  e.preventDefault()
                  check()
                }
              }}
              disabled={isChecked}
              rows={5}
              placeholder="Write your answer — use the key words…"
              aria-label="Your answer"
            />
          ) : (
            <Input
              value={texts[question.id] ?? ''}
              onChange={(e) => setTexts((t) => ({ ...t, [question.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isChecked) {
                  e.preventDefault()
                  check()
                }
              }}
              disabled={isChecked}
              placeholder={
                question.type === 'fill-blank' ? 'Fill in the blank…' : 'Type the name…'
              }
              className="h-10 text-sm"
              aria-label="Your answer"
            />
          )}

          {/* feedback */}
          {grading && <Feedback question={question} grading={grading} />}
        </div>

        {/* controls */}
        <div className="flex shrink-0 items-center gap-2 border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 px-2.5"
            onClick={() => setIdx(safeIdx - 1)}
            disabled={safeIdx === 0}
            aria-label="Previous question"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <span className="flex-1 text-center text-[11px] text-muted-foreground">
            {question.type === 'answer' && !isChecked ? 'Ctrl+Enter to check' : ''}
          </span>
          {isChecked ? (
            <Button size="sm" className="h-8 gap-1 px-3" onClick={goNext}>
              {safeIdx < questions.length - 1 ? (
                <>
                  Next <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  See results <CheckCircle2 className="h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-8 gap-1 px-3"
              onClick={check}
              title={hasAnswer ? 'Check your answer' : 'Check anyway — an empty answer is marked wrong'}
            >
              <Check className="h-4 w-4" /> Check answer
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function responsesFrom(
  choices: Record<string, number>,
  texts: Record<string, string>,
  questions: QuizQuestion[],
): Record<string, QuizResponse> {
  const out: Record<string, QuizResponse> = {}
  for (const q of questions) {
    out[q.id] =
      q.type === 'mcq'
        ? { choice: choices[q.id] }
        : { text: texts[q.id] ?? '' }
  }
  return out
}

function TypeBadge({ type }: { type: QuizQuestionType }) {
  const Icon = TYPE_ICONS[type]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon className="h-3 w-3" />
      {QUIZ_TYPE_SHORT[type]}
    </span>
  )
}

function McqAttempt({
  question,
  picked,
  isChecked,
  onPick,
}: {
  question: QuizQuestion
  picked: number | undefined
  isChecked: boolean
  onPick: (i: number) => void
}) {
  const options = question.options
    .map((text, i) => ({ text: text.trim(), i }))
    .filter((o) => o.text !== '')

  return (
    <div className="space-y-1.5" role="radiogroup" aria-label="Answer options">
      {options.map((o, pos) => {
        const isCorrect = isChecked && o.i === question.correctOption
        const isWrongPick = isChecked && picked === o.i && o.i !== question.correctOption
        return (
          <button
            key={o.i}
            type="button"
            role="radio"
            aria-checked={picked === o.i}
            disabled={isChecked}
            onClick={() => onPick(o.i)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
              !isChecked && picked === o.i && 'border-emerald-600 bg-emerald-600/10',
              !isChecked && picked !== o.i && 'hover:bg-accent/50',
              isCorrect && 'border-emerald-600 bg-emerald-600/10',
              isWrongPick && 'border-red-500 bg-red-500/10',
              isChecked && !isCorrect && !isWrongPick && 'opacity-60',
            )}
          >
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                isCorrect && 'border-emerald-600 bg-emerald-600 text-white',
                isWrongPick && 'border-red-500 bg-red-500 text-white',
                !isChecked && picked === o.i && 'border-emerald-600 text-emerald-700 dark:text-emerald-400',
              )}
              aria-hidden
            >
              {String.fromCharCode(65 + pos)}
            </span>
            <span className="min-w-0 flex-1">{o.text}</span>
            {isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
            {isWrongPick && <XCircle className="h-4 w-4 shrink-0 text-red-500" />}
          </button>
        )
      })}
    </div>
  )
}

function Feedback({
  question,
  grading,
}: {
  question: QuizQuestion
  grading: ReturnType<typeof gradeAnswer>
}) {
  const correct = grading.correct
  return (
    <div
      role="status"
      className={cn(
        'space-y-2 rounded-xl border p-4',
        correct
          ? 'border-emerald-600/40 bg-emerald-600/10'
          : 'border-red-500/40 bg-red-500/10',
      )}
    >
      <div className="flex items-center gap-2">
        {correct ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <XCircle className="h-5 w-5 shrink-0 text-red-500" />
        )}
        <p
          className={cn(
            'text-sm font-semibold',
            correct ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
          )}
        >
          {correct
            ? question.type === 'answer' && grading.accuracy < 1
              ? 'Correct'
              : 'Correct!'
            : 'Not quite'}
        </p>
      </div>

      {question.type === 'answer' && grading.keywordHits && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tabular-nums">
              {Math.round(grading.accuracy * 100)}%
            </span>
            <span className="text-xs text-muted-foreground">keyword accuracy</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {grading.keywordHits.map((h) => (
              <span
                key={h.keyword}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs',
                  h.hit
                    ? 'border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400'
                    : 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400',
                )}
              >
                {h.hit ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                {h.keyword}
              </span>
            ))}
          </div>
        </>
      )}

      {!correct && (
        <p className="text-xs text-muted-foreground">
          {question.type === 'answer'
            ? 'Your answer should mention every keyword:'
            : question.type === 'mcq'
              ? 'Correct answer:'
              : grading.answerLabel !== '—'
                ? 'Accepted answer(s):'
                : 'This question has no accepted answers configured yet.'}
          <span className="ml-1 font-semibold text-foreground">{grading.answerLabel}</span>
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Results screen
// ---------------------------------------------------------------------------

function ResultsScreen({
  quiz,
  responses,
  onRetake,
}: {
  quiz: Quiz
  responses: Record<string, QuizResponse>
  onRetake: () => void
}) {
  const setQuizMode = useNotepadStore((s) => s.setQuizMode)
  const { correctCount, total, perQuestion } = gradeAttempt(quiz.questions, responses)
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0
  const message =
    pct === 100
      ? 'Perfect score!'
      : pct >= 70
        ? 'Great work — nearly there.'
        : pct >= 40
          ? 'Keep practising.'
          : 'Review the quiz in Create mode and try again.'

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-6">
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Quiz complete
          </p>
          <p className="mt-2 text-4xl font-bold tabular-nums">
            {correctCount} / {total}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {pct}% correct — {message}
          </p>
          <Progress value={pct} className="mx-auto mt-4 h-1.5 max-w-xs" aria-label="Score" />
        </div>

        <ul className="space-y-1.5">
          {quiz.questions.map((q, i) => {
            const g = perQuestion[q.id]
            const excerpt =
              q.prompt
                .replace(/!\[[^\]]*\]\([^)]*\)/g, ' [image] ')
                .replace(/[#>*`~_$|]/g, '')
                .split('\n')
                .map((l) => l.trim())
                .find(Boolean) ?? '(empty question)'
            return (
              <li
                key={q.id}
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5"
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white',
                    g.correct ? 'bg-emerald-600' : 'bg-red-500',
                  )}
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{excerpt}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {QUIZ_TYPE_SHORT[q.type]}
                    {q.type === 'answer' && ` · ${Math.round(g.accuracy * 100)}% keywords`}
                  </p>
                </div>
                {g.correct ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                )}
              </li>
            )
          })}
        </ul>

        <div className="flex items-center justify-center gap-2 pb-4">
          <Button size="sm" className="gap-1.5" onClick={onRetake}>
            <Play className="h-3.5 w-3.5" /> Retake quiz
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setQuizMode('create')}>
            <SquarePen className="h-3.5 w-3.5" /> Back to Create
          </Button>
        </div>
      </div>
    </div>
  )
}
