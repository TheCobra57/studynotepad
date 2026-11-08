/**
 * Workspace appearance preferences (font family + note text size).
 *
 * Kept separate from the notepad store on purpose: these are per-browser UI
 * preferences, not user data — they never belong in backup exports. Persisted
 * to localStorage synchronously so the tiny boot script in layout.tsx can
 * apply them before first paint (no font flash on reload).
 */
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type FontId = 'default' | 'literata' | 'lora' | 'merriweather' | 'source-serif'
export type NoteSizeId = 'sm' | 'md' | 'lg' | 'xl'
export type TabMode = 'single' | 'multi'

export interface FontOption {
  id: FontId
  label: string
  /** css variable created by next/font in layout.tsx (undefined = app default) */
  cssVar?: string
  hint: string
}

/** 4 book serifs + the current app font as default */
export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'default',
    label: 'Default',
    hint: 'Geist — the current app font',
  },
  {
    id: 'literata',
    label: 'Literata',
    cssVar: '--font-literata',
    hint: 'Designed for long-form e-book reading',
  },
  {
    id: 'lora',
    label: 'Lora',
    cssVar: '--font-lora',
    hint: 'Contemporary serif with a brushy feel',
  },
  {
    id: 'merriweather',
    label: 'Merriweather',
    cssVar: '--font-merriweather',
    hint: 'Sturdy serif built for screens',
  },
  {
    id: 'source-serif',
    label: 'Source Serif',
    cssVar: '--font-source-serif',
    hint: 'Clear print-inspired serif',
  },
]

export const SIZE_OPTIONS: { id: NoteSizeId; label: string }[] = [
  { id: 'sm', label: 'Small' },
  { id: 'md', label: 'Default' },
  { id: 'lg', label: 'Large' },
  { id: 'xl', label: 'X-Large' },
]

interface PrefsState {
  font: FontId
  noteSize: NoteSizeId
  /** single = one note at a time (no tab bar); multi = swappable tab bar */
  tabMode: TabMode
  setFont: (font: FontId) => void
  setNoteSize: (size: NoteSizeId) => void
  setTabMode: (mode: TabMode) => void
  resetPrefs: () => void
}

/** SSR-safe storage: the server render never touches localStorage */
const storage = () =>
  typeof window === 'undefined'
    ? { getItem: () => null, setItem: () => {}, removeItem: () => {} }
    : window.localStorage

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      font: 'default',
      noteSize: 'md',
      tabMode: 'single',
      setFont: (font) => set({ font }),
      setNoteSize: (noteSize) => set({ noteSize }),
      setTabMode: (tabMode) => set({ tabMode }),
      resetPrefs: () => set({ font: 'default', noteSize: 'md', tabMode: 'single' }),
    }),
    {
      name: 'studypad-prefs-v1',
      storage: createJSONStorage(storage),
    },
  ),
)
