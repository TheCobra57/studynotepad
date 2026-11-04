'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from 'react'

/** how deep into a scroll (px) before chrome is allowed to hide */
const HIDE_AFTER = 72

// ---------------------------------------------------------------------------
// tiny localStorage-backed preference stores (SSR-safe, cross-tab aware)
// ---------------------------------------------------------------------------

function createPrefStore(key: string) {
  const listeners = new Set<() => void>()
  const subscribe = (cb: () => void) => {
    listeners.add(cb)
    window.addEventListener('storage', cb) // keep tabs in sync
    return () => {
      listeners.delete(cb)
      window.removeEventListener('storage', cb)
    }
  }
  const read = (): boolean => {
    try {
      return localStorage.getItem(key) === '1'
    } catch {
      return false // storage unavailable — default to auto-hide
    }
  }
  const write = (v: boolean) => {
    try {
      localStorage.setItem(key, v ? '1' : '0')
    } catch {
      /* private mode etc. — the preference just won't persist */
    }
    listeners.forEach((l) => l())
  }
  return { subscribe, read, write }
}

const headerPinStore = createPrefStore('studypad:header-pinned')
const toolbarPinStore = createPrefStore('studypad:toolbar-pinned')

// ---------------------------------------------------------------------------
// hook
// ---------------------------------------------------------------------------

/**
 * Notion-style chrome visibility for the app header and the editor toolbar.
 *
 * While unpinned (default) scrolling any pane down past a small threshold
 * slides the chrome away; scrolling up anywhere reveals it again instantly.
 * Pinned chrome stays permanently visible. Each pin choice is persisted in
 * localStorage — these are device-level view preferences, not note data.
 *
 * `suppressed` (focus modes) pauses tracking and resets everything to visible
 * so it is back when the focus mode ends. `revealKey` (the selected note id)
 * reveals everything when it changes — opening a note always starts with the
 * toolbars in place.
 */
export function useChromeVisibility(
  mainRef: RefObject<HTMLElement | null>,
  suppressed: boolean,
  revealKey?: string,
) {
  const [headerHidden, setHeaderHidden] = useState(false)
  const [toolbarHidden, setToolbarHidden] = useState(false)
  const headerPinned = useSyncExternalStore(
    headerPinStore.subscribe,
    headerPinStore.read,
    () => false,
  )
  const toolbarPinned = useSyncExternalStore(
    toolbarPinStore.subscribe,
    toolbarPinStore.read,
    () => false,
  )

  // reset to visible whenever tracking is suppressed or the note changes —
  // render-phase "adjust state when props change" pattern (no effect, no
  // lint fight)
  const [wasSuppressed, setWasSuppressed] = useState(suppressed)
  const [wasRevealKey, setWasRevealKey] = useState(revealKey)

  // Revealing chrome changes the pane layout, and the browser responds with
  // its own downward adjustment scrolls (scroll-anchoring compensation,
  // scroll-into-view after focus). Those read as "user scrolled down" and
  // would instantly re-hide what was just revealed. For a short window after
  // every reveal, downward scrolls may not hide anything; genuine user
  // scrolls still hide normally once the window passes.
  const graceUntil = useRef(0)

  if (suppressed !== wasSuppressed) {
    setWasSuppressed(suppressed)
    if (suppressed) {
      setHeaderHidden(false)
      setToolbarHidden(false)
      graceUntil.current = performance.now() + 300
    }
  }
  if (revealKey !== wasRevealKey) {
    setWasRevealKey(revealKey)
    setHeaderHidden(false)
    setToolbarHidden(false)
    graceUntil.current = performance.now() + 300
  }

  // per-container baselines so the first event after (re)subscribing
  // establishes a direction reference instead of acting on it
  const lastTops = useRef(new WeakMap<HTMLElement, number>())

  // scroll-direction tracking — capture on document covers every scrollable
  // region inside <main> (sidebar, notes list, editor, mobile panes) with a
  // single passive listener; portals (dialogs, sheets) stay outside <main>
  useEffect(() => {
    if (suppressed || (headerPinned && toolbarPinned)) return
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
      if (top - prev > 0 && top > HIDE_AFTER) {
        if (performance.now() >= graceUntil.current) {
          if (!headerPinned) setHeaderHidden(true)
          if (!toolbarPinned) setToolbarHidden(true)
        }
      } else if (top - prev < 0) {
        // A negative delta while the container is pinned to its bottom edge is
        // the browser clamping scrollTop — collapsing chrome makes <main>
        // taller, which shrinks every pane's scroll range. Reacting to those
        // clamped events bounced the header at the end of a page instead of
        // staying hidden; genuine upward scrolls move away from the bottom
        // edge, so they still reveal everything instantly.
        const fromBottom = t.scrollHeight - t.clientHeight - top
        if (fromBottom > 1) {
          setHeaderHidden(false)
          setToolbarHidden(false)
          graceUntil.current = performance.now() + 300
        }
      }
    }
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => document.removeEventListener('scroll', onScroll, { capture: true })
  }, [suppressed, headerPinned, toolbarPinned, mainRef])

  const toggleHeaderPinned = useCallback(() => {
    headerPinStore.write(!headerPinStore.read())
    setHeaderHidden(false) // a freshly pinned header must be visible
    graceUntil.current = performance.now() + 300
  }, [])

  const toggleToolbarPinned = useCallback(() => {
    toolbarPinStore.write(!toolbarPinStore.read())
    setToolbarHidden(false) // a freshly pinned toolbar must be visible
    graceUntil.current = performance.now() + 300
  }, [])

  /** reveal just the toolbar — used when the user focuses the editor */
  const showToolbar = useCallback(() => {
    setToolbarHidden(false)
    graceUntil.current = performance.now() + 300
  }, [])

  const showAll = useCallback(() => {
    setHeaderHidden(false)
    setToolbarHidden(false)
    graceUntil.current = performance.now() + 300
  }, [])

  return {
    header: { hidden: headerHidden, pinned: headerPinned, togglePinned: toggleHeaderPinned },
    toolbar: {
      hidden: toolbarHidden,
      pinned: toolbarPinned,
      togglePinned: toggleToolbarPinned,
      show: showToolbar,
    },
    showAll,
  }
}
