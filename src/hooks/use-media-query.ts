import * as React from 'react'

/**
 * SSR-safe matchMedia subscription. Reads the initial value synchronously on
 * the client (no first-paint flash) and follows changes live.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  React.useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/**
 * Tailwind's `lg:` breakpoint (1024px) — the threshold where the formula
 * maker switches from the stacked mobile view to the two-pane desktop view.
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}
