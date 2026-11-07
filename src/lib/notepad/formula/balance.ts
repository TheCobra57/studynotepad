/**
 * Auto Balance — computes the smallest whole-number coefficients for the
 * equation currently laid out in the formula maker's workspace and applies
 * them as leading text chips.
 *
 * How it works:
 *  1. Split the token stream into terms on `+` chips and the (single) `→`
 *     chip. ↑/↓ and text chips stay inside their term.
 *  2. For every term, count each element (subscript `n` of every element
 *     chip, empty meaning 1). Terms without any element chip are ignored.
 *  3. Build the conservation matrix (rows = elements, columns = terms,
 *     reactants positive / products negative) and find its nullspace with
 *     exact rational Gauss-Jordan elimination — no floats, so results are
 *     always exact.
 *  4. Scale the solution to the smallest positive integers (LCM of
 *     denominators, then divide by the GCD).
 *  5. Write each coefficient back: a leading all-digits text chip is
 *     replaced (or removed when the coefficient is 1), otherwise a new text
 *     chip is inserted before the term's first element chip.
 */

import { makeTextToken, type FormulaToken } from './tokens'

export type BalanceResult =
  | { ok: true; tokens: FormulaToken[] }
  | { ok: false; error: string }

// ---------------------------------------------------------------------------
// exact rational arithmetic
// ---------------------------------------------------------------------------

function gcd(a: number, b: number): number {
  while (b) {
    const t = a % b
    a = b
    b = t
  }
  return a
}

function lcm(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : (a / gcd(a, b)) * b
}

class Frac {
  readonly num: number
  readonly den: number

  constructor(num = 0, den = 1) {
    if (den < 0) {
      num = -num
      den = -den
    }
    const g = gcd(Math.abs(num), den) || 1
    this.num = num / g
    this.den = den / g
  }

  add(b: Frac): Frac {
    return new Frac(this.num * b.den + b.num * this.den, this.den * b.den)
  }

  neg(): Frac {
    return new Frac(-this.num, this.den)
  }

  sub(b: Frac): Frac {
    return this.add(b.neg())
  }

  mul(b: Frac): Frac {
    return new Frac(this.num * b.num, this.den * b.den)
  }

  isZero(): boolean {
    return this.num === 0
  }
}

// ---------------------------------------------------------------------------
// parsing the workspace into terms
// ---------------------------------------------------------------------------

interface Term {
  /** indices into the original token array */
  at: number[]
  side: 'left' | 'right'
  /** element symbol → total atom count in this term */
  atoms: Map<string, number>
}

function parseTerms(tokens: FormulaToken[]): { terms: Term[]; error: string | null } {
  const slices: number[][] = []
  const sides: ('left' | 'right')[] = []
  let current: number[] = []
  let side: 'left' | 'right' = 'left'
  let arrows = 0

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.kind === 'arrow') {
      arrows += 1
      slices.push(current)
      sides.push(side)
      current = []
      side = 'right'
    } else if (token.kind === 'plus') {
      slices.push(current)
      sides.push(side)
      current = []
    } else {
      current.push(i)
    }
  }
  slices.push(current)
  sides.push(side)

  if (arrows === 0) {
    return {
      terms: [],
      error:
        'No reaction arrow found — add one with the → button so there are reactants and products to balance.',
    }
  }
  if (arrows > 1) {
    return { terms: [], error: 'Auto balance needs exactly one arrow (→). Remove the extra arrows first.' }
  }

  const terms: Term[] = []
  for (let k = 0; k < slices.length; k++) {
    if (!slices[k].length) continue
    const atoms = new Map<string, number>()
    for (const idx of slices[k]) {
      const token = tokens[idx]
      if (token.kind !== 'element') continue
      const raw = token.count.trim()
      let n = 1
      if (raw) {
        if (!/^\d+$/.test(raw) || Number(raw) < 1) {
          return {
            terms: [],
            error: `The subscript on ${token.symbol} must be a whole number (found “${raw}”).`,
          }
        }
        n = Number(raw)
      }
      atoms.set(token.symbol, (atoms.get(token.symbol) ?? 0) + n)
    }
    terms.push({ at: slices[k], side: sides[k], atoms })
  }

  return { terms, error: null }
}

// ---------------------------------------------------------------------------
// nullspace of the conservation matrix
// ---------------------------------------------------------------------------

/** smallest positive integer solution of M·x = 0, or null when none exists */
function solveSmallestPositive(matrix: Frac[][], cols: number): number[] | null {
  const rows = matrix.length
  const work = matrix.map((row) => [...row])
  const pivotCols: number[] = []

  let r = 0
  for (let c = 0; c < cols && r < rows; c++) {
    let pivot = -1
    for (let k = r; k < rows; k++) {
      if (!work[k][c].isZero()) {
        pivot = k
        break
      }
    }
    if (pivot === -1) continue
    ;[work[r], work[pivot]] = [work[pivot], work[r]]

    const inv = new Frac(work[r][c].den, work[r][c].num)
    for (let cc = 0; cc < cols; cc++) work[r][cc] = work[r][cc].mul(inv)

    for (let k = 0; k < rows; k++) {
      if (k === r || work[k][c].isZero()) continue
      const factor = work[k][c]
      for (let cc = 0; cc < cols; cc++) work[k][cc] = work[k][cc].sub(work[r][cc].mul(factor))
    }
    pivotCols.push(c)
    r += 1
  }

  const freeCols: number[] = []
  for (let c = 0; c < cols; c++) if (!pivotCols.includes(c)) freeCols.push(c)
  if (!freeCols.length) return null // rank = cols → only the trivial solution

  // set the last free variable to 1, the rest to 0, then back-substitute:
  // in RREF each pivot row reads x[pivot] + Σ free·x[free] = 0
  const x: Frac[] = Array.from({ length: cols }, () => new Frac(0))
  x[freeCols[freeCols.length - 1]] = new Frac(1)
  pivotCols.forEach((p, i) => {
    let s = new Frac(0)
    for (const f of freeCols) {
      if (!work[i][f].isZero() && !x[f].isZero()) s = s.add(work[i][f].mul(x[f]))
    }
    x[p] = s.neg()
  })

  // orient the solution positive (a real reaction has all coefficients > 0;
  // mixed-sign results are rejected by the caller's positivity check)
  const sign = x.find((v) => !v.isZero())!.num < 0 ? -1 : 1

  // scale to smallest integers
  let multiple = 1
  for (const v of x) multiple = lcm(multiple, v.den)
  let ints = x.map((v) => (v.num * sign * multiple) / v.den)
  let divisor = 0
  for (const v of ints) divisor = gcd(divisor, Math.abs(v))
  if (divisor > 1) ints = ints.map((v) => v / divisor)

  return ints
}

// ---------------------------------------------------------------------------
// public entry point
// ---------------------------------------------------------------------------

const LEADING_NUMBER = /^\d+$/

export function balanceTokens(tokens: FormulaToken[]): BalanceResult {
  const { terms, error } = parseTerms(tokens)
  if (error) return { ok: false, error }

  const withAtoms = terms.filter((term) => term.atoms.size > 0)
  if (withAtoms.length < 2) {
    return {
      ok: false,
      error: 'Add at least one species on each side of the arrow before balancing.',
    }
  }

  const symbols = [...new Set(withAtoms.flatMap((term) => [...term.atoms.keys()]))].sort()
  const matrix: Frac[][] = symbols.map((symbol) =>
    withAtoms.map((term) => {
      const n = term.atoms.get(symbol) ?? 0
      return new Frac(term.side === 'left' ? n : -n)
    }),
  )

  const solution = solveSmallestPositive(matrix, withAtoms.length)
  if (!solution) {
    return {
      ok: false,
      error: 'This equation cannot be balanced — check the subscripts (they fix each species\u2019 composition).',
    }
  }
  if (solution.some((v) => v <= 0)) {
    return {
      ok: false,
      error: 'No positive whole-number solution exists for this equation as written.',
    }
  }

  // write the coefficients back as text chips
  type Edit = { index: number; kind: 'insert' | 'replace'; token: FormulaToken } | { index: number; kind: 'remove' }
  const edits: Edit[] = []

  withAtoms.forEach((term, k) => {
    const coefficient = solution[k]
    const numericIdx = term.at.find((idx) => {
      const t = tokens[idx]
      return t.kind === 'text' && LEADING_NUMBER.test(t.value.trim())
    })
    if (coefficient === 1) {
      if (numericIdx !== undefined) edits.push({ index: numericIdx, kind: 'remove' })
      return
    }
    const chip = makeTextToken(String(coefficient))
    if (numericIdx !== undefined) {
      edits.push({ index: numericIdx, kind: 'replace', token: chip })
    } else {
      const firstElementIdx = term.at.find((idx) => tokens[idx].kind === 'element')!
      edits.push({ index: firstElementIdx, kind: 'insert', token: chip })
    }
  })

  edits.sort((a, b) => b.index - a.index)
  const next = [...tokens]
  for (const edit of edits) {
    if (edit.kind === 'insert') next.splice(edit.index, 0, edit.token)
    else if (edit.kind === 'replace') next[edit.index] = edit.token
    else next.splice(edit.index, 1)
  }

  return { ok: true, tokens: next }
}
