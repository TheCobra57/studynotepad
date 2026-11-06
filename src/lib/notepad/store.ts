'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { browserStorage } from './idb-storage'
import { STORAGE_KEY } from './constants'
import { seedChapters, seedFlashcards, seedNotes, seedQuizzes, seedSubjects } from './seed'
import type {
  Chapter,
  ChapterTab,
  Flashcard,
  FlashcardMode,
  NotepadBackup,
  Note,
  Quiz,
  QuizMode,
  QuizQuestion,
  QuizQuestionType,
  Subject,
} from './types'

function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Pinned notes first, then most recently updated. Once every note in a
 *  list has been manually arranged (order set on all of them), the manual
 *  order wins completely — pinning becomes a badge only. */
export function sortNotes(list: Note[]): Note[] {
  if (list.length > 0 && list.every((n) => n.order !== undefined)) {
    return [...list].sort((a, b) => (a.order as number) - (b.order as number))
  }
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    const ao = a.order ?? Number.MAX_SAFE_INTEGER
    const bo = b.order ?? Number.MAX_SAFE_INTEGER
    if (ao !== bo) return ao - bo
    return b.updatedAt - a.updatedAt
  })
}

interface SelectionInput {
  subjects: Subject[]
  chapters: Chapter[]
  notes: Note[]
  flashcards: Flashcard[]
  quizzes: Quiz[]
  selectedChapterId: string | null
  selectedNoteId: string | null
  /** which flashcard the workspace has open — session-ish, not persisted */
  selectedCardId: string | null
  /** which quiz & question the workspace has open — session-ish, not persisted */
  selectedQuizId: string | null
  selectedQuestionId: string | null
}

function normalizeSelection(state: SelectionInput) {
  const { chapters, notes, flashcards, quizzes, selectedChapterId, selectedNoteId } = state
  let chapterId: string | null = selectedChapterId
  if (!chapterId || !chapters.some((c) => c.id === chapterId)) {
    chapterId = chapters.length ? chapters[0].id : null
  }
  const chapterNotes = chapterId ? notes.filter((n) => n.chapterId === chapterId) : []
  let noteId: string | null = selectedNoteId
  if (!noteId || !chapterNotes.some((n) => n.id === noteId)) {
    noteId = chapterNotes.length ? sortNotes(chapterNotes)[0].id : null
  }
  // the open card follows the chapter: first card of the deck, or none
  const deck = chapterId ? flashcards.filter((f) => f.chapterId === chapterId) : []
  let cardId: string | null = state.selectedCardId
  if (!cardId || !deck.some((f) => f.id === cardId)) {
    cardId = deck.length ? deck[0].id : null
  }
  // the open quiz follows the chapter, and the open question follows the quiz
  const chapterQuizzes = chapterId ? quizzes.filter((q) => q.chapterId === chapterId) : []
  let quizId: string | null = state.selectedQuizId
  if (!quizId || !chapterQuizzes.some((q) => q.id === quizId)) {
    quizId = chapterQuizzes.length ? chapterQuizzes[0].id : null
  }
  const quizQuestions = chapterQuizzes.find((q) => q.id === quizId)?.questions ?? []
  let questionId: string | null = state.selectedQuestionId
  if (!questionId || !quizQuestions.some((q) => q.id === questionId)) {
    questionId = quizQuestions.length ? quizQuestions[0].id : null
  }
  return {
    selectedChapterId: chapterId,
    selectedNoteId: noteId,
    selectedCardId: cardId,
    selectedQuizId: quizId,
    selectedQuestionId: questionId,
  }
}

export interface NotepadStore extends SelectionInput {
  searchQuery: string

  /** false until the persisted state (if any) has been read from IndexedDB */
  hasHydrated: boolean
  setHasHydrated: (v: boolean) => void

  /** workspace tab of the selected chapter — session-only, not persisted */
  chapterTab: ChapterTab
  setChapterTab: (tab: ChapterTab) => void

  /** flashcards workspace mode — session-only, not persisted */
  flashcardMode: FlashcardMode
  setFlashcardMode: (mode: FlashcardMode) => void

  /** quiz workspace mode — session-only, not persisted */
  quizMode: QuizMode
  setQuizMode: (mode: QuizMode) => void

  addSubject: (name: string, color: string) => Subject
  renameSubject: (id: string, name: string, color?: string) => void
  deleteSubject: (id: string) => void

  addChapter: (subjectId: string, name: string) => Chapter
  renameChapter: (id: string, name: string) => void
  deleteChapter: (id: string) => void

  addNote: (chapterId: string, title?: string) => Note
  updateNote: (id: string, patch: Partial<Pick<Note, 'title' | 'content'>>) => void
  deleteNote: (id: string) => void
  togglePin: (id: string) => void

  /** flashcards — a chapter's deck is the store array order (like chapters) */
  addCard: (chapterId: string, front?: string, back?: string) => Flashcard
  updateCard: (id: string, patch: Partial<Pick<Flashcard, 'front' | 'back'>>) => void
  deleteCard: (id: string) => void
  duplicateCard: (id: string) => Flashcard | undefined
  moveCard: (chapterId: string, id: string, direction: -1 | 1) => void
  selectCard: (id: string) => void

  /** quizzes — a chapter holds any number of quizzes, store array order */
  addQuiz: (chapterId: string, title?: string) => Quiz
  updateQuiz: (id: string, patch: Partial<Pick<Quiz, 'title'>>) => void
  deleteQuiz: (id: string) => void
  duplicateQuiz: (id: string) => Quiz | undefined
  selectQuiz: (id: string) => void
  addQuestion: (quizId: string, type?: QuizQuestionType) => QuizQuestion | undefined
  updateQuestion: (questionId: string, patch: Partial<Omit<QuizQuestion, 'id'>>) => void
  deleteQuestion: (questionId: string) => void
  moveQuestion: (quizId: string, questionId: string, direction: -1 | 1) => void
  selectQuestion: (id: string) => void

  selectChapter: (chapterId: string) => void
  selectNote: (id: string) => void
  setSearchQuery: (q: string) => void

  /** arrange mode commits — ids are the full new order of that group */
  reorderSubjects: (orderedIds: string[]) => void
  reorderChapters: (subjectId: string, orderedIds: string[]) => void
  reorderNotes: (chapterId: string, orderedIds: string[]) => void
  reorderCards: (chapterId: string, orderedIds: string[]) => void

  importData: (backup: NotepadBackup) => void
  clearAll: () => void
}

const seedState = {
  subjects: seedSubjects,
  chapters: seedChapters,
  notes: seedNotes,
  flashcards: seedFlashcards,
  quizzes: seedQuizzes,
}
const seedSelection = normalizeSelection({
  ...seedState,
  selectedChapterId: seedChapters[0].id,
  selectedNoteId: seedNotes[0].id,
  selectedCardId: seedFlashcards[0]?.id ?? null,
  selectedQuizId: seedQuizzes[0]?.id ?? null,
  selectedQuestionId: seedQuizzes[0]?.questions[0]?.id ?? null,
})

export const useNotepadStore = create<NotepadStore>()(
  persist(
    (set) => ({
      ...seedState,
      ...seedSelection,
      searchQuery: '',
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      chapterTab: 'notes',
      setChapterTab: (tab) => set({ chapterTab: tab }),

      flashcardMode: 'make',
      setFlashcardMode: (mode) => set({ flashcardMode: mode }),

      quizMode: 'create',
      setQuizMode: (mode) => set({ quizMode: mode }),

      addSubject: (name, color) => {
        const subject: Subject = { id: uid(), name: name.trim(), color, createdAt: Date.now() }
        set((s) => ({ subjects: [...s.subjects, subject] }))
        return subject
      },

      renameSubject: (id, name, color) =>
        set((s) => ({
          subjects: s.subjects.map((x) =>
            x.id === id ? { ...x, name: name.trim(), ...(color ? { color } : {}) } : x,
          ),
        })),

      deleteSubject: (id) =>
        set((s) => {
          const chapterIds = new Set(
            s.chapters.filter((c) => c.subjectId === id).map((c) => c.id),
          )
          const subjects = s.subjects.filter((x) => x.id !== id)
          const chapters = s.chapters.filter((c) => c.subjectId !== id)
          const notes = s.notes.filter((n) => !chapterIds.has(n.chapterId))
          const flashcards = s.flashcards.filter((f) => !chapterIds.has(f.chapterId))
          const quizzes = s.quizzes.filter((q) => !chapterIds.has(q.chapterId))
          return {
            subjects,
            chapters,
            notes,
            flashcards,
            quizzes,
            ...normalizeSelection({ ...s, subjects, chapters, notes, flashcards, quizzes }),
          }
        }),

      addChapter: (subjectId, name) => {
        const chapter: Chapter = { id: uid(), subjectId, name: name.trim(), createdAt: Date.now() }
        set((s) => ({
          chapters: [...s.chapters, chapter],
          selectedChapterId: chapter.id,
          selectedNoteId: null,
        }))
        return chapter
      },

      renameChapter: (id, name) =>
        set((s) => ({
          chapters: s.chapters.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)),
        })),

      deleteChapter: (id) =>
        set((s) => {
          const chapters = s.chapters.filter((c) => c.id !== id)
          const notes = s.notes.filter((n) => n.chapterId !== id)
          const flashcards = s.flashcards.filter((f) => f.chapterId !== id)
          const quizzes = s.quizzes.filter((q) => q.chapterId !== id)
          return {
            chapters,
            notes,
            flashcards,
            quizzes,
            ...normalizeSelection({
              ...s,
              subjects: s.subjects,
              chapters,
              notes,
              flashcards,
              quizzes,
              selectedChapterId: s.selectedChapterId,
              selectedNoteId: s.selectedNoteId,
            }),
          }
        }),

      // ---------- flashcards ----------

      addCard: (chapterId, front = '', back = '') => {
        let created: Flashcard | undefined
        set((s) => {
          const card: Flashcard = {
            id: uid(),
            chapterId,
            front,
            back,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
          created = card
          return {
            flashcards: [...s.flashcards, card],
            selectedChapterId: chapterId,
            selectedCardId: card.id,
          }
        })
        return created as Flashcard
      },

      updateCard: (id, patch) =>
        set((s) => ({
          flashcards: s.flashcards.map((f) => {
            if (f.id !== id) return f
            const changed =
              (patch.front !== undefined && patch.front !== f.front) ||
              (patch.back !== undefined && patch.back !== f.back)
            return changed ? { ...f, ...patch, updatedAt: Date.now() } : f
          }),
        })),

      deleteCard: (id) =>
        set((s) => {
          const flashcards = s.flashcards.filter((f) => f.id !== id)
          if (s.selectedCardId === id) {
            const remaining = flashcards.filter((f) => f.chapterId === s.selectedChapterId)
            return { flashcards, selectedCardId: remaining.length ? remaining[0].id : null }
          }
          return { flashcards }
        }),

      duplicateCard: (id) => {
        let created: Flashcard | undefined
        set((s) => {
          const src = s.flashcards.find((f) => f.id === id)
          if (!src) return s
          const copy: Flashcard = {
            ...src,
            id: uid(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
          created = copy
          const idx = s.flashcards.findIndex((f) => f.id === id)
          const flashcards = [...s.flashcards]
          flashcards.splice(idx + 1, 0, copy)
          return { flashcards, selectedCardId: copy.id }
        })
        return created
      },

      moveCard: (chapterId, id, direction) =>
        set((s) => {
          const deck = s.flashcards.filter((f) => f.chapterId === chapterId)
          const idx = deck.findIndex((f) => f.id === id)
          const to = idx + direction
          if (idx === -1 || to < 0 || to >= deck.length) return s
          const next = [...deck]
          const [moved] = next.splice(idx, 1)
          next.splice(to, 0, moved)
          // lay the reordered deck back into the slots this chapter's cards
          // occupy (other chapters' cards keep their exact positions)
          const queue = [...next]
          return {
            flashcards: s.flashcards.map((f) =>
              f.chapterId === chapterId ? (queue.shift() as Flashcard) : f,
            ),
          }
        }),

      selectCard: (id) =>
        set((s) => {
          const card = s.flashcards.find((f) => f.id === id)
          if (!card) return s
          return { selectedCardId: id, selectedChapterId: card.chapterId }
        }),

      // ---------- quizzes ----------

      addQuiz: (chapterId, title) => {
        let created: Quiz | undefined
        set((s) => {
          const inChapter = s.quizzes.filter((q) => q.chapterId === chapterId).length
          const quiz: Quiz = {
            id: uid(),
            chapterId,
            title: title?.trim() || `Quiz ${inChapter + 1}`,
            questions: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
          created = quiz
          return {
            quizzes: [...s.quizzes, quiz],
            selectedQuizId: quiz.id,
            selectedQuestionId: null,
          }
        })
        return created as Quiz
      },

      updateQuiz: (id, patch) =>
        set((s) => ({
          quizzes: s.quizzes.map((q) =>
            q.id === id ? { ...q, ...patch, updatedAt: Date.now() } : q,
          ),
        })),

      deleteQuiz: (id) =>
        set((s) => {
          const quizzes = s.quizzes.filter((q) => q.id !== id)
          if (s.selectedQuizId === id) {
            const remaining = quizzes.filter((q) => q.chapterId === s.selectedChapterId)
            return {
              quizzes,
              selectedQuizId: remaining.length ? remaining[0].id : null,
              selectedQuestionId: remaining[0]?.questions[0]?.id ?? null,
            }
          }
          return { quizzes }
        }),

      duplicateQuiz: (id) => {
        let created: Quiz | undefined
        set((s) => {
          const src = s.quizzes.find((q) => q.id === id)
          if (!src) return s
          const copy: Quiz = {
            ...src,
            id: uid(),
            title: `${src.title} (copy)`,
            questions: src.questions.map((question) => ({ ...question, id: uid() })),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
          created = copy
          const idx = s.quizzes.findIndex((q) => q.id === id)
          const quizzes = [...s.quizzes]
          quizzes.splice(idx + 1, 0, copy)
          return { quizzes, selectedQuizId: copy.id, selectedQuestionId: copy.questions[0]?.id ?? null }
        })
        return created
      },

      selectQuiz: (id) =>
        set((s) => {
          const quiz = s.quizzes.find((q) => q.id === id)
          if (!quiz) return s
          return {
            selectedQuizId: id,
            selectedChapterId: quiz.chapterId,
            selectedQuestionId: quiz.questions[0]?.id ?? null,
          }
        }),

      addQuestion: (quizId, type = 'mcq') => {
        let created: QuizQuestion | undefined
        set((s) => {
          const quiz = s.quizzes.find((q) => q.id === quizId)
          if (!quiz) return s
          const question: QuizQuestion = {
            id: uid(),
            type,
            prompt: '',
            options: type === 'mcq' ? ['', '', '', ''] : [],
            correctOption: 0,
            acceptedAnswers: type === 'fill-blank' || type === 'name-item' ? [''] : [],
            keywords: [],
          }
          created = question
          return {
            quizzes: s.quizzes.map((q) =>
              q.id === quizId
                ? { ...q, questions: [...q.questions, question], updatedAt: Date.now() }
                : q,
            ),
            selectedQuizId: quizId,
            selectedQuestionId: question.id,
          }
        })
        return created as QuizQuestion
      },

      updateQuestion: (questionId, patch) =>
        set((s) => ({
          quizzes: s.quizzes.map((quiz) => {
            if (!quiz.questions.some((q) => q.id === questionId)) return quiz
            return {
              ...quiz,
              updatedAt: Date.now(),
              questions: quiz.questions.map((q) =>
                q.id === questionId ? { ...q, ...patch } : q,
              ),
            }
          }),
        })),

      deleteQuestion: (questionId) =>
        set((s) => {
          const owner = s.quizzes.find((q) => q.questions.some((x) => x.id === questionId))
          if (!owner) return s
          const idx = owner.questions.findIndex((x) => x.id === questionId)
          const questions = owner.questions.filter((x) => x.id !== questionId)
          const quizzes = s.quizzes.map((q) =>
            q.id === owner.id ? { ...q, questions, updatedAt: Date.now() } : q,
          )
          // if the open question was deleted, open its neighbour (or none)
          const selectedQuestionId =
            s.selectedQuestionId === questionId
              ? (questions[Math.min(idx, questions.length - 1)]?.id ?? null)
              : s.selectedQuestionId
          return { quizzes, selectedQuestionId }
        }),

      moveQuestion: (quizId, questionId, direction) =>
        set((s) => {
          const quiz = s.quizzes.find((q) => q.id === quizId)
          if (!quiz) return s
          const idx = quiz.questions.findIndex((x) => x.id === questionId)
          const to = idx + direction
          if (idx === -1 || to < 0 || to >= quiz.questions.length) return s
          const next = [...quiz.questions]
          const [moved] = next.splice(idx, 1)
          next.splice(to, 0, moved)
          // write the new order straight back into this quiz's question list
          return {
            quizzes: s.quizzes.map((q) =>
              q.id === quizId ? { ...q, questions: next, updatedAt: Date.now() } : q,
            ),
          }
        }),

      selectQuestion: (id) =>
        set((s) => {
          const quiz = s.quizzes.find((q) => q.questions.some((x) => x.id === id))
          if (!quiz) return s
          return {
            selectedQuestionId: id,
            selectedQuizId: quiz.id,
            selectedChapterId: quiz.chapterId,
          }
        }),

      addNote: (chapterId, title = 'Untitled note') => {
        let created: Note | undefined
        set((s) => {
          const ordered = s.notes
            .filter((n) => n.chapterId === chapterId && n.order !== undefined)
            .map((n) => n.order as number)
          const note: Note = {
            id: uid(),
            chapterId,
            title,
            content: '',
            pinned: false,
            // a manually arranged chapter keeps its order — new notes go on top
            ...(ordered.length ? { order: Math.min(...ordered) - 1 } : {}),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
          created = note
          return {
            notes: [note, ...s.notes],
            selectedChapterId: chapterId,
            selectedNoteId: note.id,
          }
        })
        return created as Note
      },

      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) => {
            if (n.id !== id) return n
            const changed = (patch.title !== undefined && patch.title !== n.title) ||
              (patch.content !== undefined && patch.content !== n.content)
            return changed ? { ...n, ...patch, updatedAt: Date.now() } : n
          }),
        })),

      deleteNote: (id) =>
        set((s) => {
          const notes = s.notes.filter((n) => n.id !== id)
          if (s.selectedNoteId === id) {
            const remaining = sortNotes(notes.filter((n) => n.chapterId === s.selectedChapterId))
            return { notes, selectedNoteId: remaining.length ? remaining[0].id : null }
          }
          return { notes }
        }),

      togglePin: (id) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)),
        })),

      selectChapter: (chapterId) =>
        set((s) => {
          if (s.selectedChapterId === chapterId) return s
          const chapterNotes = sortNotes(s.notes.filter((n) => n.chapterId === chapterId))
          const deck = s.flashcards.filter((f) => f.chapterId === chapterId)
          const chapterQuizzes = s.quizzes.filter((q) => q.chapterId === chapterId)
          return {
            selectedChapterId: chapterId,
            selectedNoteId: chapterNotes.length ? chapterNotes[0].id : null,
            selectedCardId: deck.length ? deck[0].id : null,
            selectedQuizId: chapterQuizzes.length ? chapterQuizzes[0].id : null,
            selectedQuestionId: chapterQuizzes[0]?.questions[0]?.id ?? null,
          }
        }),

      /** apply a new order to the subjects list (ids must be a permutation) */
      reorderSubjects: (orderedIds) =>
        set((s) => {
          if (orderedIds.length !== s.subjects.length) return s
          const byId = new Map(s.subjects.map((x) => [x.id, x]))
          const next = orderedIds.map((id) => byId.get(id))
          if (next.some((x) => !x)) return s
          return { subjects: next as Subject[] }
        }),

      /** reorder one subject's chapters inside the flat chapter list */
      reorderChapters: (subjectId, orderedIds) =>
        set((s) => {
          const current = s.chapters.filter((c) => c.subjectId === subjectId)
          if (orderedIds.length !== current.length) return s
          const byId = new Map(current.map((c) => [c.id, c]))
          if (!orderedIds.every((id) => byId.has(id))) return s
          let k = 0
          const chapters = s.chapters.map((c) =>
            c.subjectId === subjectId ? (byId.get(orderedIds[k++]) as Chapter) : c,
          )
          return { chapters }
        }),

      /** persist a manual order for a chapter's notes (assigns order 0..n-1) */
      reorderNotes: (chapterId, orderedIds) =>
        set((s) => {
          const current = s.notes.filter((n) => n.chapterId === chapterId)
          if (orderedIds.length !== current.length) return s
          const idSet = new Set(orderedIds)
          if (!current.every((n) => idSet.has(n.id))) return s
          const orderMap = new Map(orderedIds.map((id, i) => [id, i]))
          return {
            notes: s.notes.map((n) => {
              const o = orderMap.get(n.id)
              return o !== undefined && o !== n.order ? { ...n, order: o } : n
            }),
          }
        }),

      /** apply a new order to a chapter's deck (ids must be a permutation) */
      reorderCards: (chapterId, orderedIds) =>
        set((s) => {
          const current = s.flashcards.filter((f) => f.chapterId === chapterId)
          if (orderedIds.length !== current.length) return s
          const idSet = new Set(orderedIds)
          if (!current.every((n) => idSet.has(n.id))) return s
          const byId = new Map(current.map((f) => [f.id, f] as const))
          let k = 0
          return {
            flashcards: s.flashcards.map((f) =>
              f.chapterId === chapterId ? (byId.get(orderedIds[k++]) as Flashcard) : f,
            ),
          }
        }),

      selectNote: (id) =>
        set((s) => {
          const note = s.notes.find((n) => n.id === id)
          if (!note) return s
          return { selectedNoteId: id, selectedChapterId: note.chapterId }
        }),

      setSearchQuery: (q) => set({ searchQuery: q }),

      importData: (backup) =>
        set((s) => {
          const subjects = backup.subjects ?? []
          const chapters = backup.chapters ?? []
          const notes = backup.notes ?? []
          const flashcards = backup.flashcards ?? []
          const quizzes = backup.quizzes ?? []
          return {
            subjects,
            chapters,
            notes,
            flashcards,
            quizzes,
            searchQuery: '',
            ...normalizeSelection({
              ...s,
              subjects,
              chapters,
              notes,
              flashcards,
              quizzes,
            }),
          }
        }),

      clearAll: () =>
        set({
          subjects: [],
          chapters: [],
          notes: [],
          flashcards: [],
          quizzes: [],
          selectedChapterId: null,
          selectedNoteId: null,
          selectedCardId: null,
          selectedQuizId: null,
          selectedQuestionId: null,
          searchQuery: '',
        }),
    }),
    {
      name: STORAGE_KEY,
      version: 3,
      storage: createJSONStorage(browserStorage),
      // V1 → V2: flashcards didn't exist yet — start every returning user
      // with an empty deck. V2 → V3: quizzes didn't exist yet — same treatment
      // (fresh installs get the seeded demo deck/quiz instead).
      migrate: (persisted) => ({
        ...(persisted as object),
        flashcards: (persisted as { flashcards?: unknown }).flashcards ?? [],
        quizzes: [],
      }),
      // flips hasHydrated once the (async) IndexedDB read finishes; during
      // SSR the no-op storage resolves immediately with no data, which is
      // fine — the UI splash gate covers it
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.warn('StudyPad: could not load saved data', error)
        useNotepadStore.setState({ hasHydrated: true })
      },
      partialize: (s) => ({
        subjects: s.subjects,
        chapters: s.chapters,
        notes: s.notes,
        flashcards: s.flashcards,
        quizzes: s.quizzes,
        selectedChapterId: s.selectedChapterId,
        selectedNoteId: s.selectedNoteId,
      }),
    },
  ),
)

// ---------- convenience selectors ----------

export const useSelectedChapter = () =>
  useNotepadStore((s) => s.chapters.find((c) => c.id === s.selectedChapterId) ?? null)

export const useSelectedNote = () =>
  useNotepadStore((s) => s.notes.find((n) => n.id === s.selectedNoteId) ?? null)

export const useSelectedCard = () =>
  useNotepadStore((s) => s.flashcards.find((f) => f.id === s.selectedCardId) ?? null)

/** a chapter's deck, in deck order (the store array order) */
export const chapterDeck = (flashcards: Flashcard[], chapterId: string | null): Flashcard[] =>
  chapterId ? flashcards.filter((f) => f.chapterId === chapterId) : []

/** a chapter's quizzes, in store array order */
export const chapterQuizList = (quizzes: Quiz[], chapterId: string | null): Quiz[] =>
  chapterId ? quizzes.filter((q) => q.chapterId === chapterId) : []
