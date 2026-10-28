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

export interface NotepadBackup {
  subjects: Subject[]
  chapters: Chapter[]
  notes: Note[]
  exportedAt: string
  version: 1
}

export type MobileView = 'tree' | 'notes' | 'editor'

/** Editor focus modes — 'area' hides the app chrome (header/panes/footer),
 *  'fullscreen' additionally requests native browser fullscreen. */
export type EditorFocusMode = 'off' | 'area' | 'fullscreen'
