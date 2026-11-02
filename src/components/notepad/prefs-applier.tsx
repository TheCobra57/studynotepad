'use client'

import { useEffect } from 'react'
import { usePrefsStore } from '@/lib/prefs'

/**
 * Keeps <html data-app-font / data-note-size> in sync with the saved prefs.
 * globals.css reads these attributes; the pre-paint boot script in layout.tsx
 * covers reloads, this covers live changes (and the very first visit, where
 * both stay at their defaults).
 */
export function PrefsApplier() {
  const font = usePrefsStore((s) => s.font)
  const noteSize = usePrefsStore((s) => s.noteSize)

  useEffect(() => {
    const el = document.documentElement
    if (font === 'default') el.removeAttribute('data-app-font')
    else el.setAttribute('data-app-font', font)
    if (noteSize === 'md') el.removeAttribute('data-note-size')
    else el.setAttribute('data-note-size', noteSize)
  }, [font, noteSize])

  return null
}
