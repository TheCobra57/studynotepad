'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardList,
  Coins,
  FastForward,
  Gamepad2,
  ListChecks,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  PanelLeft,
  PenLine,
  Play,
  Plus,
  RectangleHorizontal,
  Snowflake,
  SquarePen,
  Tag,
  TextCursorInput,
  Timer,
  Trash2,
  TrendingUp,
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
import {
  BOOSTER_INFO,
  BOOSTER_KINDS,
  DEFAULT_TIME_LIMIT,
  FREEZE_MS,
  TIME_LIMIT_CHOICES,
  bankWindow,
  earnsBooster,
  formatPoints,
  funElapsed,
  pointsFor,
  randomBooster,
  timeLimitOf,
  type BoosterKind,
  type FreezeWindow,
} from '@/lib/notepad/fun'
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

const BOOST_ICONS: Record<BoosterKind, LucideIcon> = {
  freeze: Snowflake,
  skip: FastForward,
  double: TrendingUp,
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

        <TimerConfig question={question} patch={patch} />

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

function TimerConfig({ question, patch }: { question: QuizQuestion; patch: PatchFn }) {
  const current = timeLimitOf(question)
  return (
    <section>
      <ConfigHeader
        label="Fun-mode timer"
        hint="time per question in Fun mode · Normal mode is untimed"
      />
      <p className="mb-2 text-xs leading-5 text-muted-foreground">
        When a quiz is played in <span className="font-semibold">Fun mode</span> each question
        runs on its own timer — running out scores zero, so set a fair limit for this question.
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {TIME_LIMIT_CHOICES.map((sec) => (
          <Button
            key={sec}
            size="sm"
            variant={current === sec ? 'secondary' : 'ghost'}
            className={cn(
              'h-8 gap-1 border px-3 text-xs tabular-nums',
              current === sec
                ? 'border-violet-600/40 bg-violet-600/10 text-violet-700 dark:text-violet-400'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
            )}
            onClick={() => patch({ timeLimit: sec })}
            aria-pressed={current === sec}
          >
            <Timer className="h-3.5 w-3.5" />
            {sec}s
          </Button>
        ))}
        {current !== DEFAULT_TIME_LIMIT && (
          <span className="text-[11px] text-muted-foreground">
            default is {DEFAULT_TIME_LIMIT}s
          </span>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Attempt mode — one question on screen at a time, instant feedback
// ---------------------------------------------------------------------------

type BoostInventory = Record<BoosterKind, number>

/** per-question stats kept while playing Fun mode, surfaced on the results screen */
interface FunQuestionStat {
  points: number
  elapsedMs: number
  booster: BoosterKind | null
  skipped: boolean
  timedOut: boolean
  double: boolean
}

interface FunAttemptStats {
  totalPoints: number
  perQuestion: Record<string, FunQuestionStat>
}

function AttemptWorkspace({ quiz }: { quiz: Quiz }) {
  const setQuizMode = useNotepadStore((s) => s.setQuizMode)
  const questions = quiz.questions

  // null = the mode lobby, false = Normal (untimed, as before), true = Fun
  const [fun, setFun] = useState<boolean | null>(null)
  const [idx, setIdx] = useState(0)
  const [choices, setChoices] = useState<Record<string, number>>({})
  const [texts, setTexts] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [finished, setFinished] = useState(false)

  // ---- Fun-mode session state — lives only for this play-through ----
  const [points, setPoints] = useState(0)
  const [boosts, setBoosts] = useState<BoostInventory>({ freeze: 0, skip: 0, double: 0 })
  const [qPoints, setQPoints] = useState<Record<string, number>>({})
  const [qElapsed, setQElapsed] = useState<Record<string, number>>({})
  const [qBooster, setQBooster] = useState<Record<string, BoosterKind | null>>({})
  const [qSkipped, setQSkipped] = useState<Record<string, boolean>>({})
  const [qTimedOut, setQTimedOut] = useState<Record<string, boolean>>({})
  const [qDouble, setQDouble] = useState<Record<string, boolean>>({})
  // wall-clock bookkeeping for the question currently on screen
  const [startAt, setStartAt] = useState(0)
  const [freeze, setFreeze] = useState<FreezeWindow | null>(null)
  const [freezeBanked, setFreezeBanked] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [armedDouble, setArmedDouble] = useState(false)

  const isFun = fun === true

  const safeIdx = Math.min(idx, Math.max(0, questions.length - 1))
  const question = questions[safeIdx]
  const questionId = question?.id ?? null
  const isChecked = question ? !!checked[question.id] : false
  const limitMs = question ? timeLimitOf(question) * 1000 : DEFAULT_TIME_LIMIT * 1000

  const responseFor = (q: QuizQuestion): QuizResponse =>
    q.type === 'mcq' ? { choice: choices[q.id] } : { text: texts[q.id] ?? '' }

  const grading = question && isChecked ? gradeAnswer(question, responseFor(question)) : null
  const hasAnswer = question
    ? question.type === 'mcq'
      ? choices[question.id] !== undefined
      : (texts[question.id] ?? '').trim().length > 0
    : false

  /** start the clock over for question i — every fresh question gets a full timer */
  const beginQuestion = (i: number) => {
    setIdx(i)
    if (fun) {
      setStartAt(Date.now())
      setFreeze(null)
      setFreezeBanked(0)
      setTimeLeft(timeLimitOf(questions[i]) * 1000)
      setArmedDouble(false)
    }
  }

  const check = () => {
    if (!question || isChecked) return
    if (isFun) {
      const now = Date.now()
      const elapsed = funElapsed(startAt, now, freeze, freezeBanked)
      // stop any running freeze — the answer is in
      if (freeze) {
        setFreezeBanked((b) => b + Math.max(0, Math.min(now, freeze.end) - freeze.start))
        setFreeze(null)
      }
      const qid = question.id
      const g = gradeAnswer(question, responseFor(question))
      const pts = pointsFor({
        limitSec: timeLimitOf(question),
        elapsedMs: elapsed,
        accuracy: g.accuracy,
        double: armedDouble,
      })
      setQElapsed((m) => ({ ...m, [qid]: elapsed }))
      setQPoints((m) => ({ ...m, [qid]: pts }))
      setPoints((p) => p + pts)
      if (armedDouble) setQDouble((m) => ({ ...m, [qid]: true }))
      // a fast attempt earns a random booster — right or wrong, as long as an
      // answer was actually written. 5s for MCQ/fill/name, 10s for long answers.
      if (hasAnswer && earnsBooster(question.type, elapsed)) {
        const booster = randomBooster()
        setBoosts((inv) => ({ ...inv, [booster]: inv[booster] + 1 }))
        setQBooster((m) => ({ ...m, [qid]: booster }))
      }
      setArmedDouble(false)
    }
    setChecked((c) => ({ ...c, [question.id]: true }))
  }

  // The Fun-mode countdown runs on the wall clock, so hiding or leaving the
  // tab does not pause it — when the deadline passes the question is submitted
  // as-is, even if that is only noticed on the next tick after coming back.
  useEffect(() => {
    if (!isFun || finished || isChecked || !questionId) return
    const evaluate = () => {
      const now = Date.now()
      // fold a finished freeze window into the bank; the next tick measures on
      if (freeze && now >= freeze.end) {
        setFreezeBanked((b) => b + bankWindow(freeze))
        setFreeze(null)
        return
      }
      const elapsed = funElapsed(startAt, now, freeze, freezeBanked)
      const left = Math.max(0, limitMs - elapsed)
      setTimeLeft(left)
      if (left <= 0) {
        // time's up — whatever is on screen gets submitted as-is
        if (freeze) {
          setFreezeBanked((b) => b + Math.max(0, Math.min(now, freeze.end) - freeze.start))
          setFreeze(null)
        }
        setQElapsed((m) => ({ ...m, [questionId]: elapsed }))
        setQTimedOut((m) => ({ ...m, [questionId]: true }))
        setChecked((c) => ({ ...c, [questionId]: true }))
      }
    }
    const timer = window.setInterval(evaluate, 200)
    // background tabs throttle intervals — re-evaluate the moment we return
    const onVisible = () => {
      if (document.visibilityState === 'visible') evaluate()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isFun, finished, isChecked, questionId, startAt, freeze, freezeBanked, limitMs])

  const goNext = () => {
    if (safeIdx < questions.length - 1) beginQuestion(safeIdx + 1)
    else setFinished(true)
  }

  const useBoost = (kind: BoosterKind) => {
    if (!isFun || !question || isChecked || boosts[kind] <= 0) return
    if (kind === 'skip') {
      // UNO SKIP — leave this question behind: no points, no feedback screen
      setBoosts((inv) => ({ ...inv, skip: inv.skip - 1 }))
      setQSkipped((m) => ({ ...m, [question.id]: true }))
      setQPoints((m) => ({ ...m, [question.id]: 0 }))
      goNext()
      return
    }
    if (kind === 'freeze') {
      const now = Date.now()
      setBoosts((inv) => ({ ...inv, freeze: inv.freeze - 1 }))
      // stacking freezes while already frozen pushes the end out further
      setFreeze((w) =>
        w ? { start: w.start, end: w.end + FREEZE_MS } : { start: now, end: now + FREEZE_MS },
      )
      return
    }
    // double points — arms the current question
    if (armedDouble) return
    setBoosts((inv) => ({ ...inv, double: inv.double - 1 }))
    setArmedDouble(true)
  }

  const start = (mode: boolean) => {
    setFun(mode)
    setPoints(0)
    setBoosts({ freeze: 0, skip: 0, double: 0 })
    setQPoints({})
    setQElapsed({})
    setQBooster({})
    setQSkipped({})
    setQTimedOut({})
    setQDouble({})
    setChoices({})
    setTexts({})
    setChecked({})
    setFinished(false)
    setIdx(0)
    setStartAt(Date.now())
    setFreeze(null)
    setFreezeBanked(0)
    setTimeLeft(questions.length ? timeLimitOf(questions[0]) * 1000 : 0)
    setArmedDouble(false)
  }

  const retake = () => start(fun === true)

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

  if (finished) {
    const funStats: FunAttemptStats | undefined = isFun
      ? {
          totalPoints: points,
          perQuestion: Object.fromEntries(
            questions.map((q): [string, FunQuestionStat] => [
              q.id,
              {
                points: qPoints[q.id] ?? 0,
                elapsedMs: qElapsed[q.id] ?? 0,
                booster: qBooster[q.id] ?? null,
                skipped: !!qSkipped[q.id],
                timedOut: !!qTimedOut[q.id],
                double: !!qDouble[q.id],
              },
            ]),
          ),
        }
      : undefined
    return (
      <ResultsScreen
        quiz={quiz}
        responses={responsesFrom(choices, texts, questions)}
        onRetake={retake}
        onChangeMode={() => {
          // leave the results screen — the lobby picks up from here
          setFinished(false)
          setFun(null)
        }}
        fun={funStats}
      />
    )
  }

  if (fun === null) {
    return <FunLobby quiz={quiz} onStart={start} />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-4 py-4 md:px-6">
        {/* progress + live score */}
        <div className="shrink-0">
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span className="tabular-nums">
              Question {safeIdx + 1} of {questions.length}
            </span>
            {isFun ? (
              <span
                className="flex items-center gap-1 rounded-full border bg-muted/60 px-2 py-0.5 text-xs font-semibold text-foreground tabular-nums"
                title="Points earned this run"
              >
                <Coins className="h-3.5 w-3.5 text-amber-500" />
                {formatPoints(points)}
              </span>
            ) : (
              <span className="tabular-nums">{Object.keys(checked).length} checked</span>
            )}
          </div>
          <Progress
            value={((safeIdx + (isChecked ? 1 : 0)) / questions.length) * 100}
            className="h-1.5"
            aria-label="Quiz progress"
          />
        </div>

        {/* Fun mode — countdown + boosters, live question only */}
        {isFun && !isChecked && (
          <div className="mt-3 shrink-0 space-y-3">
            <TimerBar limitMs={limitMs} leftMs={timeLeft} frozen={freeze !== null} />
            <BoostBar inventory={boosts} onUse={useBoost} />
          </div>
        )}

        {/* the question — scrollable */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4">
          <div className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
            <div className="mb-2 flex items-center gap-2">
              <TypeBadge type={question.type} />
              {isFun && (
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
                  <Timer className="h-3 w-3" />
                  {timeLimitOf(question)}s limit
                </span>
              )}
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
          {grading && (
            <Feedback
              question={question}
              grading={grading}
              fun={
                isFun
                  ? {
                      pts: qPoints[question.id] ?? 0,
                      elapsedMs: qElapsed[question.id] ?? 0,
                      timedOut: !!qTimedOut[question.id],
                      booster: qBooster[question.id] ?? null,
                      double: !!qDouble[question.id],
                    }
                  : undefined
              }
            />
          )}
        </div>

        {/* controls */}
        <div className="flex shrink-0 items-center gap-2 border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 px-2.5"
            onClick={() => setIdx(safeIdx - 1)}
            disabled={safeIdx === 0 || isFun}
            title={isFun ? 'No going back in Fun mode' : 'Previous question'}
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
  fun,
}: {
  question: QuizQuestion
  grading: ReturnType<typeof gradeAnswer>
  /** Fun-mode extras — undefined in Normal mode */
  fun?: {
    pts: number
    elapsedMs: number
    timedOut: boolean
    booster: BoosterKind | null
    double: boolean
  }
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
        {fun?.timedOut ? (
          <Timer className="h-5 w-5 shrink-0 text-red-500" />
        ) : correct ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <XCircle className="h-5 w-5 shrink-0 text-red-500" />
        )}
        <p
          className={cn(
            'text-sm font-semibold',
            correct
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400',
          )}
        >
          {fun?.timedOut
            ? "Time's up!"
            : correct
              ? question.type === 'answer' && grading.accuracy < 1
                ? 'Correct'
                : 'Correct!'
              : 'Not quite'}
        </p>
        {fun && (
          <span
            className="ml-auto flex items-center gap-1 rounded-full border bg-background/70 px-2 py-0.5 text-xs font-semibold tabular-nums"
            title="Points earned for this question"
          >
            <Coins className="h-3.5 w-3.5 text-amber-500" />
            +{formatPoints(fun.pts)}
          </span>
        )}
      </div>

      {fun && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full border bg-background/70 px-2 py-0.5 text-[11px] text-muted-foreground tabular-nums">
            answered in {(fun.elapsedMs / 1000).toFixed(1)}s
          </span>
          {fun.double && (
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-600/40 bg-violet-600/10 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:text-violet-400">
              <TrendingUp className="h-3 w-3" /> Double points
            </span>
          )}
          {fun.booster && <BoosterBadge kind={fun.booster} />}
        </div>
      )}

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
  onChangeMode,
  fun,
}: {
  quiz: Quiz
  responses: Record<string, QuizResponse>
  onRetake: () => void
  /** Fun mode only — back to the Normal/Fun picker */
  onChangeMode?: () => void
  fun?: FunAttemptStats
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
          {fun ? (
            <>
              <p className="mt-2 flex items-center justify-center gap-2 text-4xl font-bold tabular-nums">
                <Coins className="h-8 w-8 text-amber-500" />
                {formatPoints(fun.totalPoints)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                points earned · {correctCount} / {total} correct ({pct}%)
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-4xl font-bold tabular-nums">
                {correctCount} / {total}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {pct}% correct — {message}
              </p>
            </>
          )}
          <Progress value={pct} className="mx-auto mt-4 h-1.5 max-w-xs" aria-label="Score" />
        </div>

        <ul className="space-y-1.5">
          {quiz.questions.map((q, i) => {
            const g = perQuestion[q.id]
            const stat = fun?.perQuestion[q.id]
            const skipped = stat?.skipped ?? false
            const excerpt =
              q.prompt
                .replace(/!\[[^\]]*\]\([^)]*\)/g, ' [image] ')
                .replace(/[#>*`~_$|]/g, '')
                .split('\n')
                .map((l) => l.trim())
                .find(Boolean) ?? '(empty question)'
            const metaBits = [QUIZ_TYPE_SHORT[q.type]]
            if (skipped) metaBits.push('skipped')
            if (stat?.timedOut) metaBits.push("time's up")
            if (stat?.double) metaBits.push('×2 points')
            if (q.type === 'answer') metaBits.push(`${Math.round(g.accuracy * 100)}% keywords`)
            if (stat?.booster) metaBits.push(`+1 ${BOOSTER_INFO[stat.booster].label}`)
            return (
              <li
                key={q.id}
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5"
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white',
                    skipped
                      ? 'bg-muted-foreground/60'
                      : g.correct
                        ? 'bg-emerald-600'
                        : 'bg-red-500',
                  )}
                  aria-hidden
                >
                  {skipped ? <FastForward className="h-3 w-3" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{excerpt}</p>
                  <p className="text-[11px] text-muted-foreground">{metaBits.join(' · ')}</p>
                </div>
                {fun ? (
                  <div className="flex shrink-0 flex-col items-end leading-tight">
                    <span className="text-xs font-bold tabular-nums">
                      {formatPoints(stat?.points ?? 0)} pts
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {skipped ? '—' : `${((stat?.elapsedMs ?? 0) / 1000).toFixed(1)}s`}
                    </span>
                  </div>
                ) : g.correct ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                )}
              </li>
            )
          })}
        </ul>

        <div className="flex flex-wrap items-center justify-center gap-2 pb-4">
          <Button size="sm" className="gap-1.5" onClick={onRetake}>
            <Play className="h-3.5 w-3.5" /> {fun ? 'Play again' : 'Retake quiz'}
          </Button>
          {fun && onChangeMode && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={onChangeMode}>
              <Gamepad2 className="h-3.5 w-3.5" /> Change mode
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setQuizMode('create')}>
            <SquarePen className="h-3.5 w-3.5" /> Back to Create
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fun-mode lobby — pick Normal or Fun before the questions start
// ---------------------------------------------------------------------------

function FunLobby({ quiz, onStart }: { quiz: Quiz; onStart: (fun: boolean) => void }) {
  const totalTimed = quiz.questions.reduce((sum, q) => sum + timeLimitOf(q), 0)
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-8 md:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Attempt mode
          </p>
          <h2 className="mt-1 text-xl font-bold">{quiz.title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {quiz.questions.length} question{quiz.questions.length === 1 ? '' : 's'} · one on
            screen at a time
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onStart(false)}
            className="rounded-2xl border bg-card p-5 text-left shadow-sm transition-colors hover:border-violet-600/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600/40"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                <Play className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-bold">Normal</p>
                <p className="text-[11px] text-muted-foreground">the classic practice run</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              No timer, no points. Read each question at your own pace and check the answer when
              you are ready.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onStart(true)}
            className="rounded-2xl border border-violet-600/30 bg-card p-5 text-left shadow-sm transition-colors hover:border-violet-600/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600/40"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/10 text-violet-700 dark:text-violet-400">
                <Gamepad2 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-bold">Fun</p>
                <p className="text-[11px] text-muted-foreground">timers · points · boosters</p>
              </div>
            </div>
            <ul className="mt-3 space-y-1.5 text-xs leading-5 text-muted-foreground">
              <li className="flex items-start gap-1.5">
                <Timer className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
                <span>
                  every question runs on its timer ({totalTimed}s total here) — leave the tab and
                  it keeps running, and running out scores zero
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <Coins className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span>the faster you answer, the more points you bank</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Snowflake className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-500" />
                <span>
                  answer within 5s (10s for long answers) to earn a random booster — spend them
                  with the boost bar
                </span>
              </li>
            </ul>
          </button>
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          Boosters:{' '}
          {BOOSTER_KINDS.map((k) => `${BOOSTER_INFO[k].label} — ${BOOSTER_INFO[k].how}`).join(' · ')}
          . Per-question timers are set in Create mode.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fun-mode pieces — countdown bar, boost bar, booster badge
// ---------------------------------------------------------------------------

function TimerBar({
  limitMs,
  leftMs,
  frozen,
}: {
  limitMs: number
  leftMs: number
  frozen: boolean
}) {
  const pct = Math.max(0, Math.min(100, (leftMs / Math.max(1, limitMs)) * 100))
  const danger = !frozen && pct <= 25
  return (
    <div role="timer" aria-label={frozen ? 'Timer frozen' : 'Time left'}>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span
          className={cn(
            'flex items-center gap-1 font-medium',
            frozen
              ? 'text-sky-600 dark:text-sky-400'
              : danger
                ? 'text-red-600 dark:text-red-400'
                : 'text-muted-foreground',
          )}
        >
          {frozen ? <Snowflake className="h-3.5 w-3.5" /> : <Timer className="h-3.5 w-3.5" />}
          {frozen ? 'Frozen' : 'Time left'}
        </span>
        <span
          className={cn(
            'font-semibold tabular-nums',
            frozen
              ? 'text-sky-600 dark:text-sky-400'
              : danger
                ? 'text-red-600 dark:text-red-400'
                : 'text-foreground',
          )}
        >
          {(leftMs / 1000).toFixed(1)}s
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full',
            frozen ? 'bg-sky-400' : danger ? 'bg-red-500' : 'bg-violet-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function BoostBar({
  inventory,
  onUse,
}: {
  inventory: BoostInventory
  onUse: (kind: BoosterKind) => void
}) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Boosters — answer fast to earn more
      </p>
      <div className="flex flex-wrap gap-1.5">
        {BOOSTER_KINDS.map((kind) => {
          const Icon = BOOST_ICONS[kind]
          const count = inventory[kind]
          return (
            <Button
              key={kind}
              size="sm"
              variant="outline"
              className={cn('h-8 gap-1.5 px-2.5 text-xs', count === 0 && 'opacity-50')}
              onClick={() => onUse(kind)}
              disabled={count === 0}
              title={`${BOOSTER_INFO[kind].how} — you have ${count}`}
            >
              <Icon
                className={cn(
                  'h-3.5 w-3.5',
                  kind === 'freeze' && 'text-sky-500',
                  kind === 'skip' && 'text-violet-500',
                  kind === 'double' && 'text-amber-500',
                )}
              />
              {BOOSTER_INFO[kind].label}
              <span className="rounded-full bg-muted px-1.5 text-[10px] font-bold tabular-nums">
                ×{count}
              </span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}

function BoosterBadge({ kind }: { kind: BoosterKind }) {
  const Icon = BOOST_ICONS[kind]
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
      <Icon className="h-3 w-3" /> +1 {BOOSTER_INFO[kind].label}
    </span>
  )
}
