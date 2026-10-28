'use client'

import { useRef, useState } from 'react'
import { BookOpenCheck, GraduationCap, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { STORAGE_KEY } from '@/lib/notepad/constants'
import { useNotepadStore } from '@/lib/notepad/store'

/** set once the user has made (or implicitly accepted) a choice — gates the dialog */
const WELCOME_KEY = 'studypad-welcomed-v1'

interface VisitInfo {
  /** ask the keep-or-fresh question now */
  show: boolean
  /** true when saved data already exists — visited before but never answered */
  returning: boolean
}

/**
 * Anyone who has never answered the welcome question gets asked once: genuine
 * first-time visitors (seeded test data in view) as well as people who used
 * the app before this dialog existed (their own notes in view).
 */
function detectVisit(): VisitInfo {
  if (typeof window === 'undefined') return { show: false, returning: false }
  try {
    if (localStorage.getItem(WELCOME_KEY)) return { show: false, returning: false }
    return { show: true, returning: !!localStorage.getItem(STORAGE_KEY) }
  } catch {
    return { show: false, returning: false } // storage unavailable — don't nag
  }
}

export type WelcomeChoice = 'keep' | 'fresh'

interface WelcomeDialogProps {
  /** fired when the user picks a choice (dismissing the dialog counts as "keep") */
  onChoose: (choice: WelcomeChoice, returning: boolean) => void
}

/**
 * First-run welcome dialog.
 *
 * Shown exactly once per visitor — on the very first visit, and (one time)
 * for people who used the app before it existed so they can choose too. The
 * copy adapts to whether existing notes are the user's own or the seeded test
 * data. Closing the dialog without picking (Esc / ✕ / overlay click) keeps
 * the current data.
 */
export function WelcomeDialog({ onChoose }: WelcomeDialogProps) {
  // the parent renders this component only after hydration, so the initializer
  // can safely probe localStorage (guarded for SSR regardless)
  const [visit] = useState(detectVisit)
  const [open, setOpen] = useState(visit.show)
  // keep the latest callback without re-triggering effects
  const onChooseRef = useRef(onChoose)
  const subjects = useNotepadStore((s) => s.subjects)
  const chapters = useNotepadStore((s) => s.chapters)
  const notes = useNotepadStore((s) => s.notes)

  const acknowledge = (choice: WelcomeChoice) => {
    try {
      localStorage.setItem(WELCOME_KEY, choice)
    } catch {
      // ignore — the in-memory choice still applies for this session
    }
  }

  const choose = (choice: WelcomeChoice) => {
    acknowledge(choice)
    setOpen(false)
    onChoose(choice, visit.returning)
  }

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setOpen(true)
      return
    }
    // dismiss without picking → implicit "keep the current data"
    acknowledge('keep')
    setOpen(false)
    onChooseRef.current?.('keep', visit.returning)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="welcome-dialog">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-xl">Welcome to StudyPad</DialogTitle>
              <p className="text-[11px] text-muted-foreground">Notepad for studies</p>
            </div>
          </div>
          <DialogDescription className="text-left">
            A notepad where math, chemistry and markdown render beautifully as you type.{' '}
            {visit.returning ? (
              <>
                You have visited before — keep your existing notes, or wipe the
                notepad and start with a clean slate.
              </>
            ) : (
              <>
                Since this is your first visit, it comes pre-loaded with some{' '}
                <span className="font-medium text-foreground">test data</span> — pick what
                to do with it.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* keep the current notes */}
          <div className="flex flex-col rounded-lg border bg-muted/30 p-4">
            <BookOpenCheck className="mb-2 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-semibold">
              {visit.returning ? 'Keep my notes' : 'Keep test data'}
            </p>
            <p className="mt-1 flex-1 text-[13px] leading-5 text-muted-foreground">
              {visit.returning ? (
                <>
                  {notes.length > 0
                    ? `All ${notes.length} of your notes stay exactly as they are — nothing changes.`
                    : 'Your notepad stays exactly as it is — nothing changes.'}
                </>
              ) : notes.length > 0 ? (
                <>
                  {subjects.length} subjects · {chapters.length} chapters ·{' '}
                  {notes.length} sample notes — equations, chemistry, tables and more to
                  explore and edit.
                </>
              ) : (
                <>Browse the sample notes and see what the editor can do.</>
              )}
            </p>
            <Button
              className="mt-3 w-full bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => choose('keep')}
            >
              {visit.returning ? 'Keep my notes' : 'Keep test data'}
            </Button>
          </div>

          {/* start with a blank slate */}
          <div className="flex flex-col rounded-lg border p-4">
            <Sparkles className="mb-2 h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-semibold">Start afresh</p>
            <p className="mt-1 flex-1 text-[13px] leading-5 text-muted-foreground">
              {visit.returning ? (
                <>
                  Deletes every subject, chapter and note — the notepad becomes completely
                  empty. Consider exporting a backup first.
                </>
              ) : (
                <>
                  An empty notepad — create your own subjects, chapters and notes from
                  scratch. Nothing of the test data is kept.
                </>
              )}
            </p>
            <Button variant="outline" className="mt-3 w-full" onClick={() => choose('fresh')}>
              Start afresh
            </Button>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          Everything is saved in your browser — export a backup or clear data anytime from
          the data menu.
        </p>
      </DialogContent>
    </Dialog>
  )
}
