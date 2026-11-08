'use client'

import { Check, RotateCcw, SlidersHorizontal } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FONT_OPTIONS, SIZE_OPTIONS, usePrefsStore, type FontOption, type TabMode } from '@/lib/prefs'

/** inline style so each picker row previews its own family */
const familyStyle = (opt: FontOption) =>
  opt.cssVar
    ? { fontFamily: `var(${opt.cssVar}), Georgia, serif` }
    : { fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif' }

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const font = usePrefsStore((s) => s.font)
  const noteSize = usePrefsStore((s) => s.noteSize)
  const tabMode = usePrefsStore((s) => s.tabMode)
  const setFont = usePrefsStore((s) => s.setFont)
  const setNoteSize = usePrefsStore((s) => s.setNoteSize)
  const setTabMode = usePrefsStore((s) => s.setTabMode)
  const resetPrefs = usePrefsStore((s) => s.resetPrefs)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-emerald-600" /> Settings
          </DialogTitle>
          <DialogDescription>
            Reading preferences for this browser — saved automatically.
          </DialogDescription>
        </DialogHeader>

        {/* ---------- Font ---------- */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Font
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground/80">
            Applies across the app — code blocks stay monospaced.
          </p>
          <div
            className="mt-2 space-y-1"
            role="radiogroup"
            aria-label="App font"
          >
            {FONT_OPTIONS.map((opt) => {
              const selected = font === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setFont(opt.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors',
                    selected
                      ? 'border-emerald-600/50 bg-emerald-600/5'
                      : 'border-transparent hover:bg-accent/50',
                  )}
                >
                  <span className="flex w-4 shrink-0 justify-center">
                    {selected && <Check className="h-4 w-4 text-emerald-600" aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium" style={familyStyle(opt)}>
                      {opt.label}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {opt.hint}
                    </span>
                  </span>
                  <span
                    className="shrink-0 text-lg leading-none text-muted-foreground/70"
                    style={familyStyle(opt)}
                    aria-hidden
                  >
                    Aa
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* ---------- Text size ---------- */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Note text size
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground/80">
            Affects note content in the editor and the notes list.
          </p>
          <div
            className="mt-2 grid grid-cols-4 gap-1 rounded-lg bg-muted p-1"
            role="radiogroup"
            aria-label="Note text size"
          >
            {SIZE_OPTIONS.map((opt) => {
              const selected = noteSize === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setNoteSize(opt.id)}
                  className={cn(
                    'rounded-md py-1.5 text-xs font-medium transition-colors',
                    selected
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          {/* live sample — inherits the chosen font + note text size */}
          <div className="mt-2 rounded-lg border bg-muted/30 p-3" aria-hidden>
            <p className="leading-relaxed text-foreground/90" style={{ fontSize: 'var(--note-font-size)' }}>
              Photosynthesis converts light energy into chemical energy, stored as glucose.
            </p>
            <p className="mt-1 font-bold tracking-tight" style={{ fontSize: 'calc(var(--note-h3-size) * 0.9)' }}>
              Heading sample
            </p>
          </div>
        </section>

        {/* ---------- Note tabs ---------- */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Note tabs
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground/80">
            Multiple keeps a swappable tab bar for open notes below the app header.
          </p>
          <div
            className="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
            role="radiogroup"
            aria-label="Note tabs mode"
          >
            {(
              [
                { id: 'single', label: 'Single tab', hint: 'One note at a time' },
                { id: 'multi', label: 'Multiple tabs', hint: 'Open several, swap freely' },
              ] as { id: TabMode; label: string; hint: string }[]
            ).map((opt) => {
              const selected = tabMode === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTabMode(opt.id)}
                  className={cn(
                    'rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                    selected
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {opt.label}
                  <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground/80">
                    {opt.hint}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <p className="text-[11px] text-muted-foreground">Stored locally, like your notes.</p>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={resetPrefs}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
