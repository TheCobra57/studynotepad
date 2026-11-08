'use client'

import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { MarkdownPreview } from './markdown-preview'
import type { Chapter, Note, Subject } from '@/lib/notepad/types'
import type { PrintSettings } from '@/lib/notepad/print'

export interface PrintBodyProps {
  note: Note
  subject: Subject | null
  chapter: Chapter | null
  settings: PrintSettings
}

/** Paper-style header printed above the note content on page 1 */
function PrintTitleBlock({
  note,
  subject,
  chapter,
}: {
  note: Note
  subject: Subject | null
  chapter: Chapter | null
}) {
  return (
    <div className="print-title-block">
      <div className="print-title-breadcrumb">
        {subject && (
          <>
            <span className="print-dot" style={{ backgroundColor: subject.color }} aria-hidden />
            {subject.name}
          </>
        )}
        {chapter && <span>{subject ? ' · ' : ''}{chapter.name}</span>}
      </div>
      <div className="print-title-text">{note.title || 'Untitled note'}</div>
      <div className="print-title-meta">{format(new Date(), 'd MMMM yyyy')}</div>
    </div>
  )
}

/**
 * The exact content that gets printed — also used to measure page breaks for
 * the live preview, so preview and print share one rendering pipeline.
 */
export function PrintBody({ note, subject, chapter, settings }: PrintBodyProps) {
  return (
    <div
      className={cn(
        'print-frame',
        settings.colorMode === 'bw' && 'print-bw',
        !settings.backgrounds && 'print-no-bg',
      )}
    >
      <MarkdownPreview
        content={note.content}
        className="print-content"
        style={{ fontSize: `${settings.textSizePt}pt` }}
        prepend={
          settings.titleBlock ? (
            <PrintTitleBlock note={note} subject={subject} chapter={chapter} />
          ) : null
        }
      />
    </div>
  )
}
