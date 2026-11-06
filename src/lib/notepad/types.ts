export interface Subject {
  id: string
  name: string
  color: string // hex color used for dots/badges
  createdAt: number
}

export interface Chapter {
  id: string
  subjectId: string
  name: string
  createdAt: number
}

export interface Note {
  id: string
  chapterId: string
  title: string
  content: string
  pinned: boolean
  /** manual position within the chapter, set by arrange mode — smaller = higher.
   *  Undefined until the user rearranges the chapter's notes for the first time. */
  order?: number
  createdAt: number
  updatedAt: number
}

/** One side of a flashcard: markdown, same format as note content
 *  (text, images, tables, $math$, ==labels==). */
export type FlashcardSide = string

export interface Flashcard {
  id: string
  chapterId: string
  front: FlashcardSide
  back: FlashcardSide
  createdAt: number
  updatedAt: number
}

export interface NotepadBackup {
  subjects: Subject[]
  chapters: Chapter[]
  notes: Note[]
  /** absent in V2 backups and older — treated as an empty deck on import */
  flashcards?: Flashcard[]
  /** absent in V3 backups and older — treated as no quizzes on import */
  quizzes?: Quiz[]
  exportedAt: string
  version: 1
}

export type MobileView = 'tree' | 'notes' | 'editor'

/** Editor focus modes — 'area' hides the app chrome (header/panes/footer),
 *  'fullscreen' additionally requests native browser fullscreen. */
export type EditorFocusMode = 'off' | 'area' | 'fullscreen'

/** Workspace tabs inside a chapter — notes, the flashcard deck, or quizzes */
export type ChapterTab = 'notes' | 'flashcards' | 'quiz'

/** Flashcards workspace mode — build the deck or study it */
export type FlashcardMode = 'make' | 'view'

/** Quiz workspace mode — build the questions or attempt the quiz */
export type QuizMode = 'create' | 'attempt'

/** The four quiz question types */
export type QuizQuestionType = 'mcq' | 'fill-blank' | 'name-item' | 'answer'

/** One quiz question. Every field is always present — the editor and the
 *  attempt view only touch the ones their question type needs, so switching
 *  a question's type never destroys what was typed before. */
export interface QuizQuestion {
  id: string
  type: QuizQuestionType
  /** the question itself — markdown, same format as notes and card faces */
  prompt: string
  /** mcq: the choices (four or more) */
  options: string[]
  /** mcq: index into options of the correct choice */
  correctOption: number
  /** fill-blank & name-item: accepted answers (case & punctuation-insensitive) */
  acceptedAnswers: string[]
  /** answer-following: keywords looked for in the answer — all found = correct */
  keywords: string[]
  /** Fun-mode timer for this question, in seconds — undefined = the 20s default.
   *  Normal mode is untimed, this only applies when playing in Fun mode. */
  timeLimit?: number
}

export interface Quiz {
  id: string
  chapterId: string
  title: string
  /** the questions, in quiz order (array order, like a flashcard deck) */
  questions: QuizQuestion[]
  createdAt: number
  updatedAt: number
}
