'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  BookOpen,
  Database,
  Download,
  FileUp,
  GraduationCap,
  HardDrive,
  Trash2,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { cn } from '@/lib/utils'
import { useNotepadStore, useSelectedNote } from '@/lib/notepad/store'
import type { EditorFocusMode, MobileView, NotepadBackup } from '@/lib/notepad/types'
import { useToast } from '@/hooks/use-toast'
import { Sidebar } from '@/components/notepad/sidebar'
import { NotesPane } from '@/components/notepad/notes-pane'
import { EditorPane } from '@/components/notepad/editor-pane'
import { CheatSheet } from '@/components/notepad/cheat-sheet'
import { WelcomeDialog, type WelcomeChoice } from '@/components/notepad/welcome-dialog'
import { ThemeToggle } from '@/components/notepad/theme-toggle'
import { PrintRoot } from '@/components/notepad/print-root'
import { PrintDialog } from '@/components/notepad/print-dialog'
import { MdImportDialog } from '@/components/notepad/md-import-dialog'

const emptySubscribe = () => () => {}

export default function Home() {
  // hydration-safe "mounted" flag (false during SSR/hydration, true after)
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )

  const [mobileView, setMobileView] = useState<MobileView>('tree')
  const [cheatOpen, setCheatOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)
  const [mdImportOpen, setMdImportOpen] = useState(false)
  const [focusMode, setFocusMode] = useState<EditorFocusMode>('off')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const selectedNote = useSelectedNote()
  // saved data is read from IndexedDB asynchronously — keep the splash up
  // until it lands so the real notes render without a seed-data flash
  const hasHydrated = useNotepadStore((s) => s.hasHydrated)

  const focusActive = focusMode !== 'off'

  // Ctrl/Cmd+P opens the customisable print dialog instead of the raw browser print
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        if (useNotepadStore.getState().selectedNoteId) {
          e.preventDefault()
          setPrintOpen(true)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ---------- focus modes: full area (window only) & true fullscreen ----------

  const enterFocus = (mode: Exclude<EditorFocusMode, 'off'>) => {
    setFocusMode(mode)
    // true fullscreen also hides the browser chrome when allowed (may be
    // blocked inside sandboxed iframes — the layout focus still applies)
    if (mode === 'fullscreen') {
      document.documentElement.requestFullscreen?.().catch(() => {})
    }
  }

  const exitFocus = () => {
    setFocusMode('off')
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  }

  // leaving native fullscreen (Esc / browser control) also leaves focus mode
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        setFocusMode((m) => (m === 'fullscreen' ? 'off' : m))
      }
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // Esc leaves the focus mode, unless an overlay (menu/dialog/whiteboard) eats it first
  useEffect(() => {
    if (focusMode === 'off') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const overlayOpen = document.querySelector(
        '[data-state="open"][role="menu"], [data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"]',
      )
      if (overlayOpen) return
      exitFocus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusMode])

  // if the open note disappears (deleted), there is nothing to focus on anymore
  useEffect(() => {
    if (focusMode !== 'off' && !selectedNote) exitFocus()
  }, [focusMode, selectedNote])

  const subjects = useNotepadStore((s) => s.subjects)
  const chapters = useNotepadStore((s) => s.chapters)
  const notes = useNotepadStore((s) => s.notes)
  const { importData, clearAll } = useNotepadStore()
  const { toast } = useToast()

  const handleExport = () => {
    const state = useNotepadStore.getState()
    const backup: NotepadBackup = {
      subjects: state.subjects,
      chapters: state.chapters,
      notes: state.notes,
      exportedAt: new Date().toISOString(),
      version: 1,
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `studypad-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast({
      title: 'Backup downloaded',
      description: `${state.notes.length} notes exported as JSON.`,
    })
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (!Array.isArray(data.subjects) || !Array.isArray(data.chapters) || !Array.isArray(data.notes)) {
        throw new Error('invalid')
      }
      importData({
        subjects: data.subjects,
        chapters: data.chapters,
        notes: data.notes,
        exportedAt: data.exportedAt ?? new Date().toISOString(),
        version: 1,
      })
      toast({
        title: 'Backup restored',
        description: `${data.notes.length} notes imported successfully.`,
      })
    } catch {
      toast({
        title: 'Import failed',
        description: 'That file is not a valid StudyPad backup.',
        variant: 'destructive',
      })
    }
  }

  // welcome dialog: keep the current (seeded) notes or start from an empty pad
  const handleWelcomeChoice = (choice: WelcomeChoice, returning: boolean) => {
    if (choice === 'fresh') {
      clearAll()
      setMobileView('tree')
      toast({
        title: 'Starting afresh',
        description: 'Your notepad is empty — add your first subject to begin.',
      })
    } else {
      const count = useNotepadStore.getState().notes.length
      toast({
        title: returning ? 'Your notes stay as they are' : 'Test data kept',
        description:
          count > 0
            ? `${count} ${returning ? 'notes kept.' : 'sample notes are ready to explore.'}`
            : 'Have fun exploring the editor.',
      })
    }
  }

  if (!mounted || !hasHydrated) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-background">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <GraduationCap className="h-7 w-7" />
        </div>
        <p className="text-sm text-muted-foreground">Loading your notes…</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex h-dvh flex-col bg-background text-foreground">
      {/* Header — hidden while a focus mode is active */}
      {!focusActive && (
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-bold">StudyPad</h1>
            <p className="text-[11px] text-muted-foreground">Notepad for studies</p>
          </div>
        </div>
        <Badge variant="secondary" className="hidden gap-1 sm:inline-flex">
          <HardDrive className="h-3 w-3" /> Saved locally
        </Badge>

        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setCheatOpen(true)}>
            <BookOpen className="h-4 w-4" />
            <span className="hidden md:inline">Cheat sheet</span>
          </Button>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Data menu">
                <Database className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs">Backup & data</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleExport}>
                <Download className="h-4 w-4" /> Export backup (.json)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> Import backup
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setMdImportOpen(true)}>
                <FileUp className="h-4 w-4" /> Import note (.md)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setClearOpen(true)}>
                <Trash2 className="h-4 w-4" /> Clear all data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      )}

      {/* Panes — in focus mode only the editor remains */}
      <main className="flex min-h-0 flex-1">
        <aside
          className={cn(
            'w-full shrink-0 overflow-y-auto border-r bg-muted/20 lg:w-64',
            focusActive
              ? 'hidden'
              : cn('lg:block', mobileView === 'tree' ? 'block' : 'hidden'),
          )}
          aria-label="Subjects"
        >
          <Sidebar onOpenChapter={() => setMobileView('notes')} />
        </aside>

        <section
          className={cn(
            'w-full shrink-0 lg:w-80',
            focusActive
              ? 'hidden'
              : cn('lg:block', mobileView === 'notes' ? 'block' : 'hidden'),
          )}
          aria-label="Notes list"
        >
          <NotesPane
            onBack={() => setMobileView('tree')}
            onOpenNote={() => setMobileView('editor')}
            onImportMd={() => setMdImportOpen(true)}
          />
        </section>

        <section
          className={cn(
            'min-w-0 flex-1',
            focusActive
              ? 'block'
              : cn('lg:block', mobileView === 'editor' ? 'block' : 'hidden'),
          )}
          aria-label="Note editor"
        >
          <EditorPane
            onBack={() => setMobileView('notes')}
            onOpenSidebar={() => setMobileView('tree')}
            onOpenCheatSheet={() => setCheatOpen(true)}
            onPrint={() => setPrintOpen(true)}
            focusMode={focusMode}
            onEnterFocus={enterFocus}
            onExitFocus={exitFocus}
          />
        </section>
      </main>

      {/* Footer — hidden while a focus mode is active */}
      {!focusActive && (
      <footer className="mt-auto flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-0.5 border-t px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-[11px] text-muted-foreground">
        <span className="tabular-nums">
          {subjects.length} subjects · {chapters.length} chapters · {notes.length} notes — stored
          in your browser
        </span>
        <span className="hidden md:inline">
          {'$…$'} math · {'\\ce{}'} chemistry · type / to insert · Ctrl+P print
        </span>
      </footer>
      )}

      <CheatSheet open={cheatOpen} onOpenChange={setCheatOpen} />
      <WelcomeDialog onChoose={handleWelcomeChoice} />
      <MdImportDialog
        open={mdImportOpen}
        onOpenChange={setMdImportOpen}
        onImported={() => setMobileView('editor')}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportFile}
        aria-label="Import backup file"
      />

      {/* Clear all confirmation */}
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all data?</AlertDialogTitle>
            <AlertDialogDescription>
              Every subject, chapter and note will be deleted from this browser. Consider
              exporting a backup first — this cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                clearAll()
                setClearOpen(false)
                setMobileView('tree')
                toast({ title: 'All data cleared', description: 'Your notepad is empty now.' })
              }}
            >
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>

      {/* Print pipeline — #print-root is a direct child of <body> so that
          @media print can hide everything else while printing */}
      <PrintRoot />
      <PrintDialog open={printOpen} onOpenChange={setPrintOpen} />
    </>
  )
}
