'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

export interface ArrangeDragState {
  /** id (data-arrange-id) of the row being dragged */
  dragId: string
  /** group key of the dragged row (data-arrange-group) */
  group: string
  /** insertion index within the group's current order — null = no valid target */
  dropIndex: number | null
}

interface UseArrangeOptions {
  /** drag handles only respond while the column is in arrange mode */
  enabled: boolean
  /** called on a successful drop — ids of the whole group in their new order */
  onCommit: (group: string, orderedIds: string[]) => void
}

/** all arrange rows of one group, in DOM (= display) order */
function groupRows(group: string): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-arrange-id]')).filter(
    (el) => el.dataset.arrangeGroup === group,
  )
}

/**
 * Pointer-based drag & drop reordering for arrange mode.
 *
 * Rows opt in with `data-arrange-id` + `data-arrange-group`; a thin
 * `data-arrange-end="<group>"` zone after the last row of each group acts as
 * the "move to the end" target. Rows from different groups never mix, so
 * chapters can only be reordered within their own subject. Works with mouse
 * and touch (handles set `touch-action: none`), auto-scrolls the enclosing
 * `[data-arrange-scroll]` container when the pointer nears its edges, and
 * cancels cleanly when arrange mode is switched off mid-drag.
 */
export function useArrange({ enabled, onCommit }: UseArrangeOptions) {
  const [drag, setDrag] = useState<ArrangeDragState | null>(null)

  const stateRef = useRef<ArrangeDragState | null>(null)
  const onCommitRef = useRef(onCommit)
  const cleanupRef = useRef<(() => void) | null>(null)
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null)
  const scrollRef = useRef<HTMLElement | null>(null)
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    onCommitRef.current = onCommit
  })

  const stop = useCallback(() => {
    if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current)
    rafRef.current = undefined
    cleanupRef.current?.()
    cleanupRef.current = null
    stateRef.current = null
    pointerPosRef.current = null
    scrollRef.current = null
    setDrag(null)
  }, [])

  // unmount cleanup — cancels any in-flight drag (stop is idempotent).
  // note: `enabled` can never flip mid-drag in practice — Done is unclickable
  // while the pointer is held, and the search box is hidden in arrange mode.
  useEffect(() => stop, [stop])

  const setDropIndex = useCallback((index: number | null) => {
    const cur = stateRef.current
    if (!cur || cur.dropIndex === index) return
    const next = { ...cur, dropIndex: index }
    stateRef.current = next
    setDrag(next)
  }, [])

  /** which insertion index does the pointer position point at? */
  const updateDrop = useCallback(
    (x: number, y: number) => {
      const st = stateRef.current
      if (!st) return
      const target = document.elementFromPoint(x, y)
      if (!target) return setDropIndex(null)
      const row = target.closest<HTMLElement>('[data-arrange-id]')
      if (row && row.dataset.arrangeGroup === st.group) {
        const rows = groupRows(st.group)
        const i = rows.indexOf(row)
        if (i === -1) return setDropIndex(null)
        const r = row.getBoundingClientRect()
        return setDropIndex(y < r.top + r.height / 2 ? i : i + 1)
      }
      const end = target.closest<HTMLElement>('[data-arrange-end]')
      if (end && end.dataset.arrangeEnd === st.group) {
        return setDropIndex(groupRows(st.group).length)
      }
      setDropIndex(null)
    },
    [setDropIndex],
  )

  const startDrag = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>, id: string, group: string) => {
      if (!enabled) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if (stateRef.current) return // a drag is already in flight
      e.preventDefault() // no text selection / native drag
      const st: ArrangeDragState = { dragId: id, group, dropIndex: null }
      stateRef.current = st
      setDrag(st)
      pointerPosRef.current = { x: e.clientX, y: e.clientY }
      scrollRef.current = e.currentTarget.closest<HTMLElement>('[data-arrange-scroll]')

      const onMove = (ev: PointerEvent) => {
        pointerPosRef.current = { x: ev.clientX, y: ev.clientY }
        updateDrop(ev.clientX, ev.clientY)
      }
      const onUp = () => {
        const cur = stateRef.current
        if (cur && cur.dropIndex !== null) {
          const ids = groupRows(cur.group).map((el) => el.dataset.arrangeId as string)
          const from = ids.indexOf(cur.dragId)
          if (from !== -1) {
            let to = cur.dropIndex
            if (to > from) to -= 1
            const next = [...ids]
            next.splice(from, 1)
            next.splice(to, 0, cur.dragId)
            const changed = next.some((x, i) => x !== ids[i])
            if (changed) onCommitRef.current(cur.group, next)
          }
        }
        stop()
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', stop)
      cleanupRef.current = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', stop)
      }

      // rAF loop: auto-scroll near the container edges + refresh drop target
      const tick = () => {
        const p = pointerPosRef.current
        const sc = scrollRef.current
        if (p && sc) {
          const r = sc.getBoundingClientRect()
          if (p.y < r.top + 48) sc.scrollTop -= 12
          else if (p.y > r.bottom - 48) sc.scrollTop += 12
          updateDrop(p.x, p.y)
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    },
    [enabled, stop, updateDrop],
  )

  return { drag, startDrag }
}
