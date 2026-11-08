'use client'

import { useMemo, useState } from 'react'
import { Columns2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useNotepadStore } from '@/lib/notepad/store'
import type { Note } from '@/lib/notepad/types'

export interface SideBySideSelection {
  leftId: string
  rightId: string
}

interface SideBySideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (selection: SideBySideSelection) => void
}

/** asks which two open tabs to show side by side (multi-tab mode) */
export function SideBySideDialog({ open, onOpenChange, onConfirm }: SideBySideDialogProps) {
  const notes = useNotepadStore((s) => s.notes)
  const chapters = useNotepadStore((s) => s.chapters)
  const openNoteIds = useNotepadStore((s) => s.openNoteIds)
  const selectedNoteId = useNotepadStore((s) => s.selectedNoteId)

  const tabs = useMemo(
    () =>
      openNoteIds
        .map((id) => notes.find((n) => n.id === id))
        .filter(Boolean) as Note[],
    [openNoteIds, notes],
  )

  const [leftId, setLeftId] = useState(
    () => (selectedNoteId && tabs.some((t) => t.id === selectedNoteId) ? selectedNoteId : tabs[0]?.id ?? ''),
  )
  const [rightId, setRightId] = useState(() => tabs.find((t) => t.id !== leftId)?.id ?? '')

  const chapterName = (chapterId: string) =>
    chapters.find((c) => c.id === chapterId)?.name ?? ''

  const ready = leftId && rightId && leftId !== rightId

  const renderItems = (excludeId: string) =>
    tabs.map((note) => (
      <SelectItem key={note.id} value={note.id} disabled={note.id === excludeId}>
        <span className="flex min-w-0 flex-col">
          <span className="truncate">{note.title || 'Untitled note'}</span>
          <span className="text-[11px] text-muted-foreground">{chapterName(note.chapterId)}</span>
        </span>
      </SelectItem>
    ))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Columns2 className="h-4 w-4 text-emerald-600" /> Side-by-side view
          </DialogTitle>
          <DialogDescription>
            Pick two of your open tabs to compare — they will show next to each other in
            full width, without the sidebars.
          </DialogDescription>
        </DialogHeader>

        {tabs.length < 2 ? (
          <p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            Open at least two notes as tabs first (open notes from the notes list), then
            come back here.
          </p>
        ) : (
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Left note
              </p>
              <Select value={leftId} onValueChange={setLeftId}>
                <SelectTrigger className="w-full" aria-label="Left note">
                  <SelectValue placeholder="Choose a note" />
                </SelectTrigger>
                <SelectContent>{renderItems(rightId)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Right note
              </p>
              <Select value={rightId} onValueChange={setRightId}>
                <SelectTrigger className="w-full" aria-label="Right note">
                  <SelectValue placeholder="Choose a note" />
                </SelectTrigger>
                <SelectContent>{renderItems(leftId)}</SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!ready}
            onClick={() => {
              if (ready) onConfirm({ leftId, rightId })
            }}
          >
            <Columns2 className="h-4 w-4" /> Show side by side
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
