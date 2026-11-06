import type { Quiz, QuizQuestion, QuizQuestionType } from './types'

// ---------------------------------------------------------------------------
// Answer matching — everything is case-insensitive and ignores punctuation,
// extra spaces and small word variations (plural / -ed / -ing / -ies), so
// "Ammonia!" matches "ammonia" and "collisions" matches the keyword
// "collision". Multi-word keywords act as phrases (words in order).
// ---------------------------------------------------------------------------

/** collapse a string for comparison: lowercase, punctuation → spaces, squeezed */
export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** very light stemming so plurals and common suffixes still match */
function stem(w: string): string {
  if (w.length > 4 && w.endsWith('ies')) return `${w.slice(0, -3)}y`
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3)
  if (w.length > 4 && (w.endsWith('es') || w.endsWith('ed'))) return w.slice(0, -2)
  if (w.length > 3 && w.endsWith('s')) return w.slice(0, -1)
  return w
}

/** two stemmed words count as the same when equal, when one starts with the
 *  other (shorter side ≥ 5 chars), or when they share a long common prefix
 *  (≥ 5 chars) — so "collisions" and "collide" match "collision", but
 *  "temp" does not match "temperature" */
function wordsMatch(a: string, b: string): boolean {
  const sa = stem(a)
  const sb = stem(b)
  if (!sa || !sb) return false
  if (sa === sb) return true
  if (Math.min(sa.length, sb.length) >= 5 && (sa.startsWith(sb) || sb.startsWith(sa))) {
    return true
  }
  let common = 0
  const max = Math.min(sa.length, sb.length)
  while (common < max && sa[common] === sb[common]) common++
  return common >= 5
}

/** exact accepted-answer check (normalised equality — no stemming) */
export function matchesAccepted(answer: string, accepted: string): boolean {
  const a = normalizeAnswer(accepted)
  return a.length > 0 && normalizeAnswer(answer) === a
}

/** every keyword found in the answer? words must appear in order (phrase) */
export function matchKeywords(
  answer: string,
  keywords: string[],
): { keyword: string; hit: boolean }[] {
  const hayWords = normalizeAnswer(answer).split(' ').filter(Boolean)
  const out: { keyword: string; hit: boolean }[] = []
  for (const keyword of keywords) {
    const phrase = normalizeAnswer(keyword).split(' ').filter(Boolean)
    if (phrase.length === 0) continue
    let hit = false
    outer: for (let i = 0; i + phrase.length <= hayWords.length; i++) {
      for (let j = 0; j < phrase.length; j++) {
        if (!wordsMatch(hayWords[i + j], phrase[j])) continue outer
      }
      hit = true
      break
    }
    out.push({ keyword, hit })
  }
  return out
}

// ---------------------------------------------------------------------------
// Grading one response
// ---------------------------------------------------------------------------

export interface QuizResponse {
  /** mcq: index of the picked option */
  choice?: number
  /** fill-blank, name-item, answer: the typed text */
  text?: string
}

export interface QuizGrading {
  correct: boolean
  /** matched ÷ expected — always 0/1 for mcq & short answers, fractional for keywords */
  accuracy: number
  /** per-keyword hits (answer-following only) */
  keywordHits: { keyword: string; hit: boolean }[] | null
  /** the correct answer, human readable, for the feedback panel */
  answerLabel: string
}

export function gradeAnswer(q: QuizQuestion, response: QuizResponse): QuizGrading {
  switch (q.type) {
    case 'mcq': {
      const correct = response.choice === q.correctOption
      return {
        correct,
        accuracy: correct ? 1 : 0,
        keywordHits: null,
        answerLabel: q.options[q.correctOption]?.trim() || '—',
      }
    }
    case 'fill-blank':
    case 'name-item': {
      const accepted = q.acceptedAnswers.filter((a) => a.trim())
      const correct =
        accepted.length > 0 && accepted.some((a) => matchesAccepted(response.text ?? '', a))
      return {
        correct,
        accuracy: correct ? 1 : 0,
        keywordHits: null,
        answerLabel: accepted.join('  ·  ') || '—',
      }
    }
    case 'answer': {
      const hits = matchKeywords(response.text ?? '', q.keywords)
      const expected = hits.length
      const matched = hits.filter((h) => h.hit).length
      // a keyword question with no keywords configured counts as correct —
      // there is nothing to match against
      const accuracy = expected > 0 ? matched / expected : 1
      return {
        correct: accuracy === 1,
        accuracy,
        keywordHits: expected > 0 ? hits : null,
        answerLabel: q.keywords.filter((k) => k.trim()).join('  ·  ') || '—',
      }
    }
  }
}

/** grade a whole attempt: response map keyed by question id */
export function gradeAttempt(
  questions: QuizQuestion[],
  responses: Record<string, QuizResponse>,
): { correctCount: number; total: number; perQuestion: Record<string, QuizGrading> } {
  const perQuestion: Record<string, QuizGrading> = {}
  let correctCount = 0
  for (const q of questions) {
    const g = gradeAnswer(q, responses[q.id] ?? {})
    perQuestion[q.id] = g
    if (g.correct) correctCount++
  }
  return { correctCount, total: questions.length, perQuestion }
}

// ---------------------------------------------------------------------------
// Labels for the four question types
// ---------------------------------------------------------------------------

export const QUIZ_TYPE_LABELS: Record<QuizQuestionType, string> = {
  mcq: 'Multiple choice',
  'fill-blank': 'Fill in the blank',
  'name-item': 'Name the item',
  answer: 'Answer the following',
}

/** short label for badges — "MCQ" instead of "Multiple choice" */
export const QUIZ_TYPE_SHORT: Record<QuizQuestionType, string> = {
  mcq: 'MCQ',
  'fill-blank': 'Fill blank',
  'name-item': 'Name it',
  answer: 'Keywords',
}

export const quizQuestionCount = (quiz: Quiz): number => quiz.questions.length
