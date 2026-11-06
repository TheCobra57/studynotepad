import type { QuizQuestion, QuizQuestionType } from './types'

// ---------------------------------------------------------------------------
// Fun mode — the Kahoot-style way to attempt a quiz: every question runs on
// a timer (set per question in the editor), points scale with how fast you
// answer, and quick answers earn boosters. This module holds the pure rules
// so they can be unit-tested without React.
// ---------------------------------------------------------------------------

/** default per-question timer when the editor never set one */
export const DEFAULT_TIME_LIMIT = 20

/** choices offered by the timer picker in the editor (seconds) */
export const TIME_LIMIT_CHOICES = [5, 10, 20, 30, 60, 120]

export function timeLimitOf(q: Pick<QuizQuestion, 'timeLimit'>): number {
  return q.timeLimit ?? DEFAULT_TIME_LIMIT
}

// ---------------------------------------------------------------------------
// Points — the shorter the time, the more points.
//   points = 1000 × speed × accuracy, then ×2 with Double Points.
// speed = fraction of the timer still left when the answer was submitted
// (running out of time means speed 0 → 0 points, even if the typed answer
// was right). accuracy is 1/0 for MCQ & short answers and matched-keyword
// fraction for "answer the following".
// ---------------------------------------------------------------------------

export const QUIZ_BASE_POINTS = 1000

export function pointsFor(opts: {
  limitSec: number
  elapsedMs: number
  accuracy: number
  double?: boolean
}): number {
  const limitMs = Math.max(1, opts.limitSec) * 1000
  const speed = Math.max(0, Math.min(1, 1 - opts.elapsedMs / limitMs))
  const accuracy = Math.max(0, Math.min(1, opts.accuracy))
  const pts = Math.round(QUIZ_BASE_POINTS * speed * accuracy)
  return opts.double ? pts * 2 : pts
}

/** compact score display — "1,240" */
export function formatPoints(n: number): string {
  return n.toLocaleString('en-US')
}

// ---------------------------------------------------------------------------
// Boosters — earned by answering fast, spent from the boost bar.
//   · answering an MCQ / fill-the-blank / name-the-item within 5 s
//   · answering an "answer the following" question within 10 s
// grants one random booster.
// ---------------------------------------------------------------------------

export type BoosterKind = 'freeze' | 'skip' | 'double'

/** how long one Time Freeze stops the clock */
export const FREEZE_MS = 5000

export const FAST_ANSWER_MS = 5000
export const FAST_ANSWER_LONG_MS = 10000

/** time window in which an answer counts as "fast" for this question type */
export function boosterWindowMs(type: QuizQuestionType): number {
  return type === 'answer' ? FAST_ANSWER_LONG_MS : FAST_ANSWER_MS
}

/** did this attempt (already known to be non-empty) earn a booster? */
export function earnsBooster(type: QuizQuestionType, elapsedMs: number): boolean {
  return elapsedMs <= boosterWindowMs(type)
}

export const BOOSTER_KINDS: BoosterKind[] = ['freeze', 'skip', 'double']

/** one random booster — injectable rng keeps this deterministic in tests */
export function randomBooster(rng: () => number = Math.random): BoosterKind {
  const i = Math.min(BOOSTER_KINDS.length - 1, Math.max(0, Math.floor(rng() * BOOSTER_KINDS.length)))
  return BOOSTER_KINDS[i]
}

export const BOOSTER_INFO: Record<BoosterKind, { label: string; how: string }> = {
  freeze: { label: 'Time Freeze', how: 'Pauses the timer for 5 seconds' },
  skip: { label: 'Uno Skip', how: 'Skips this question — no points for it' },
  double: { label: 'Double Points', how: 'Doubles the points this question earns' },
}

// ---------------------------------------------------------------------------
// Timer clock — wall-clock based, so leaving the tab does not pause anything:
// the deadline keeps running and passes even while the tab is hidden (the
// countdown picks it up on the next tick / on returning to the tab).
//
// A Time Freeze is a window during which the clock does not advance. All
// elapsed-time math subtracts the frozen credit from the raw wall clock.
// ---------------------------------------------------------------------------

export interface FreezeWindow {
  /** when the freeze started (epoch ms) */
  start: number
  /** when the freeze ends (epoch ms) — may be pushed later by stacking */
  end: number
}

/** total ms subtracted from the clock at `now`: everything already banked
 *  from past freezes plus the running part of the active window */
export function frozenCredit(now: number, window: FreezeWindow | null, banked: number): number {
  let credit = banked
  if (window) credit += Math.max(0, Math.min(now, window.end) - window.start)
  return credit
}

/** effective time on the clock — wall time minus every frozen moment */
export function funElapsed(
  startAt: number,
  now: number,
  window: FreezeWindow | null,
  banked: number,
): number {
  return Math.max(0, now - startAt - frozenCredit(now, window, banked))
}

/** a completed freeze window is folded into the bank so the active slot is free */
export function bankWindow(window: FreezeWindow): number {
  return Math.max(0, window.end - window.start)
}
