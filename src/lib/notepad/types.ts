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
  createdAt: number
  updatedAt: number
}

export interface NotepadBackup {
  subjects: Subject[]
  chapters: Chapter[]
  notes: Note[]
  exportedAt: string
  version: 1
}

export type MobileView = 'tree' | 'notes' | 'editor'
