'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from 'react'

const PIN_KEY = 'studypad:header-pinned'
/** how deep into a scroll (px) before the header is allowed to hide */
const HIDE_AFTER = 72

// ---------------------------------------------------------------------------
// tiny localStorage-backed preference store (SSR-safe, cross-tab aware)
// ---------------------------------------------------------------------------

const prefListeners = new Set<() => void>()

function subscribePref(cb: () => void) {
  prefListeners.add(cb)
  window.addEventListener('storage', cb) // keep tabs in sync
  return () => {
    prefListeners.delete(cb)
    window.removeEventListener('storage', cb)
  }
}

function readPinnedPref(): boolean {
  try {
    return localStorage.getItem(PIN_KEY) === '1'
  } catch {
    return false // storage unavailable — default to auto-hide
  }
}

function writePinnedPref(v: boolean) {
  try {
    localStorage.setItem(PIN_KEY, v ? '1' : '0')
  } catch {
    /* private mode etc. — the preference just won't persist */
  }
  prefListeners.forEach((l) => l())
}

// ---------------------------------------------------------------------------
// hook
// ---------------------------------------------------------------------------

/**
 * Notion-style header visibility.
 *
 * While unpinned (default) scrolling any pane down past a small threshold
 * slides the header away; scrolling up anywhere reveals it again instantly.
 * A pinned header stays permanently visible. The choice is persisted in
 * localStorage — it is a device-level view preference, not note data.
 *
 * `suppressed` (focus modes) pauses tracking and resets the header to
 * visible so it is back when the focus mode ends.
 */
export function useHeaderVisibility(
  mainRef: RefObject<HTMLElement | null>,
  suppressed: boolean,
) {
  const [hidden, setHidden] = useState(false)
  const pinned = useSyncExternalStore(subscribePref, readPinnedPref, () => false)

  // reset to visible whenever tracking is suppressed — render-phase
  // "adjust state when props change" pattern (no effect, no lint fight)
  const [wasSuppressed, setWasSuppressed] = useState(suppressed)
  if (suppressed !== wasSuppressed) {
    setWasSuppressed(suppressed)
    if (suppressed) setHidden(false)
  }

  // per-container baselines so the first event after (re)subscribing
  // establishes a direction reference instead of acting on it
  const lastTops = useRef(new WeakMap<HTMLElement, number>())

  // scroll-direction tracking — capture on document covers every scrollable
  // region inside <main> (sidebar, notes list, editor, mobile panes) with a
  // single passive listener; portals (dialogs, sheets) stay outside <main>
  useEffect(() => {
    if (suppressed || pinned) return
    lastTops.current = new WeakMap()
    const onScroll = (e: Event) => {
      const t = e.target
      if (!(t instanceof HTMLElement)) return
      const main = mainRef.current
      if (!main || (t !== main && !main.contains(t))) return
      const top = t.scrollTop
      const prev = lastTops.current.get(t)
      lastTops.current.set(t, top)
      if (prev === undefined) return
      if (top - prev > 0 && top > HIDE_AFTER) setHidden(true)
      else if (top - prev < 0) setHidden(false)
    }
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => document.removeEventListener('scroll', onScroll, { capture: true })
  }, [suppressed, pinned, mainRef])

  const togglePinned = useCallback(() => {
    writePinnedPref(!readPinnedPref())
    setHidden(false) // a freshly pinned header must be visible
  }, [])

  const show = useCallback(() => setHidden(false), [])

  return { hidden, pinned, togglePinned, show }
}
