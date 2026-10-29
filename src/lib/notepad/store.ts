'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { browserStorage } from './idb-storage'
import { STORAGE_KEY } from './constants'
import { seedChapters, seedNotes, seedSubjects } from './seed'
import type { Chapter, NotepadBackup, Note, Subject } from './types'

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
  selectedChapterId: string | null
  selectedNoteId: string | null
}

function normalizeSelection(state: SelectionInput) {
  const { chapters, notes, selectedChapterId, selectedNoteId } = state
  let chapterId: string | null = selectedChapterId
  if (!chapterId || !chapters.some((c) => c.id === chapterId)) {
    chapterId = chapters.length ? chapters[0].id : null
  }
  const chapterNotes = chapterId ? notes.filter((n) => n.chapterId === chapterId) : []
  let noteId: string | null = selectedNoteId
  if (!noteId || !chapterNotes.some((n) => n.id === noteId)) {
    noteId = chapterNotes.length ? sortNotes(chapterNotes)[0].id : null
  }
  return { selectedChapterId: chapterId, selectedNoteId: noteId }
}

export interface NotepadStore extends SelectionInput {
  searchQuery: string

  /** false until the persisted state (if any) has been read from IndexedDB */
  hasHydrated: boolean
  setHasHydrated: (v: boolean) => void

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

  selectChapter: (chapterId: string) => void
  selectNote: (id: string) => void
  setSearchQuery: (q: string) => void

  /** arrange mode commits — ids are the full new order of that group */
  reorderSubjects: (orderedIds: string[]) => void
  reorderChapters: (subjectId: string, orderedIds: string[]) => void
  reorderNotes: (chapterId: string, orderedIds: string[]) => void

  importData: (backup: NotepadBackup) => void
  clearAll: () => void
}

const seedState = {
  subjects: seedSubjects,
  chapters: seedChapters,
  notes: seedNotes,
}
const seedSelection = normalizeSelection({
  ...seedState,
  selectedChapterId: seedChapters[0].id,
  selectedNoteId: seedNotes[0].id,
})

export const useNotepadStore = create<NotepadStore>()(
  persist(
    (set) => ({
      ...seedState,
      ...seedSelection,
      searchQuery: '',
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

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
          return { subjects, chapters, notes, ...normalizeSelection({ ...s, subjects, chapters, notes }) }
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
          return { chapters, notes, ...normalizeSelection({ ...s, subjects: s.subjects, chapters, notes, selectedChapterId: s.selectedChapterId, selectedNoteId: s.selectedNoteId }) }
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
          return {
            selectedChapterId: chapterId,
            selectedNoteId: chapterNotes.length ? chapterNotes[0].id : null,
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
          return {
            subjects,
            chapters,
            notes,
            searchQuery: '',
            ...normalizeSelection({ ...s, subjects, chapters, notes }),
          }
        }),

      clearAll: () =>
        set({
          subjects: [],
          chapters: [],
          notes: [],
          selectedChapterId: null,
          selectedNoteId: null,
          searchQuery: '',
        }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(browserStorage),
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
