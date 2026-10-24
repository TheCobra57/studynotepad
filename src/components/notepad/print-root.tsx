'use client'

import { useNotepadStore, useSelectedNote } from '@/lib/notepad/store'
import { buildPrintCss, usePrintStore } from '@/lib/notepad/print'
import { PrintBody } from './print-body'

/**
 * Hidden container that becomes the ONLY visible element while printing
 * (`@media print` in globals.css hides every other direct child of <body>).
 * It always reflects the currently selected note and print settings.
 */
export function PrintRoot() {
  const note = useSelectedNote()
  const chapters = useNotepadStore((s) => s.chapters)
  const subjects = useNotepadStore((s) => s.subjects)
  const settings = usePrintStore((s) => s.settings)

  const chapter = note ? (chapters.find((c) => c.id === note.chapterId) ?? null) : null
  const subject = chapter ? (subjects.find((s) => s.id === chapter.subjectId) ?? null) : null

  return (
    <div id="print-root" aria-hidden>
      <style dangerouslySetInnerHTML={{ __html: buildPrintCss(settings) }} />
      {note && <PrintBody note={note} subject={subject} chapter={chapter} settings={settings} />}
    </div>
  )
}
