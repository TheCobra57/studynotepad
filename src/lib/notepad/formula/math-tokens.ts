/**
 * Token model + cursor engine for the Math tab of the formula maker.
 *
 * The Math workspace is driven entirely by the on-screen math keyboard —
 * there is not a single <input> anywhere, so the OS keyboard never pops up.
 * Keys insert tokens at a logical cursor (a position between tokens inside
 * a container), the same way Desmos' equation editor works.
 *
 * The token list is a TREE: plain atoms (digits, letters, operators) live in
 * a flat list, while structures (fraction, root, power, integral…) own their
 * own child lists ("parts"). The cursor walks the whole tree in document
 * order, so pressing → walks out of a numerator straight into the
 * denominator.
 */

import { newTokenId } from './tokens'

// ---------------------------------------------------------------------------
// model
// ---------------------------------------------------------------------------

export interface MathAtomToken {
  id: string
  kind: 'atom'
  /** what the chip shows: "7", "x", "+", "sin", "π" */
  value: string
  /** KaTeX chunk emitted for this atom — produced only by trusted keyboard tables */
  latex: string
}

export type MathGroupKind =
  | 'fraction' // □/□        parts: [numerator, denominator]
  | 'sqrt' //     √□          parts: [radicand]
  | 'power' //    □^□         parts: [exponent]
  | 'sub' //      □_□         parts: [subscript]
  | 'integral' // ∫□^□□dx     parts: [lower, upper, integrand]
  | 'abs' //      |□|          parts: [content]

export interface MathGroupToken {
  id: string
  kind: 'group'
  group: MathGroupKind
  /** child token lists — how many and what they mean depends on `group` */
  parts: MathToken[][]
}

export type MathToken = MathAtomToken | MathGroupToken

/** logical cursor: a position between tokens inside one container */
export interface CursorPos {
  /** 'root' for the top-level list, else `${groupId}:${partIndex}` */
  containerId: string
  /** insertion index within that container's token list */
  index: number
}

export const ROOT_ID = 'root'

// ---------------------------------------------------------------------------
// factories
// ---------------------------------------------------------------------------

export function makeAtom(value: string, latex: string): MathAtomToken {
  return { id: newTokenId(), kind: 'atom', value, latex }
}

/** parts default to one empty slot; pass prefills to pre-fill (x², ∫₀^∞) */
export function makeGroup(group: MathGroupKind, prefills?: MathToken[][]): MathGroupToken {
  const slotCount = group === 'fraction' ? 2 : group === 'integral' ? 3 : 1
  const parts: MathToken[][] = []
  for (let i = 0; i < slotCount; i += 1) parts.push(prefills?.[i] ?? [])
  return { id: newTokenId(), kind: 'group', group, parts }
}

// ---------------------------------------------------------------------------
// tree helpers
// ---------------------------------------------------------------------------

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** depth-first search for a group token anywhere in the tree */
export function findGroup(tokens: MathToken[], groupId: string): MathGroupToken | null {
  for (const token of tokens) {
    if (token.kind !== 'group') continue
    if (token.id === groupId) return token
    for (const part of token.parts) {
      const hit = findGroup(part, groupId)
      if (hit) return hit
    }
  }
  return null
}

/**
 * where a group lives: the container id of its parent list and its index
 * within it — used to move the cursor "just before the group" and to
 * delete a whole empty structure
 */
function locateGroup(
  tokens: MathToken[],
  groupId: string,
  containerId = ROOT_ID,
): CursorPos | null {
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]
    if (token.kind !== 'group') continue
    if (token.id === groupId) return { containerId, index: i }
    for (let p = 0; p < token.parts.length; p += 1) {
      const hit = locateGroup(token.parts[p], groupId, `${token.id}:${p}`)
      if (hit) return hit
    }
  }
  return null
}

function parseContainerId(containerId: string): { groupId: string; partIndex: number } | null {
  const m = /^tok-[^:]+:(\d+)$/.exec(containerId)
  if (!m) return null
  return { groupId: containerId.slice(0, containerId.lastIndexOf(':')), partIndex: Number(m[1]) }
}

// ---------------------------------------------------------------------------
// cursor movement — document order (depth-first)
// ---------------------------------------------------------------------------

/**
 * every insertable position in document order: before each token, then the
 * positions inside its parts (recursively), with the position after the last
 * token of each container coming from the next "before" entry (or the final
 * push)
 */
export function flattenPositions(tokens: MathToken[]): CursorPos[] {
  const out: CursorPos[] = []
  const walk = (list: MathToken[], containerId: string) => {
    for (let i = 0; i < list.length; i += 1) {
      out.push({ containerId, index: i })
      const token = list[i]
      if (token.kind === 'group') {
        token.parts.forEach((part, p) => walk(part, `${token.id}:${p}`))
      }
    }
    out.push({ containerId, index: list.length })
  }
  walk(tokens, ROOT_ID)
  return out
}

/** move the cursor ±delta positions through the whole tree; clamps at the ends */
export function moveCursor(tokens: MathToken[], cursor: CursorPos, delta: number): CursorPos {
  const positions = flattenPositions(tokens)
  const at = positions.findIndex(
    (p) => p.containerId === cursor.containerId && p.index === cursor.index,
  )
  if (at === -1) return positions[positions.length - 1] // stale cursor → end
  return positions[clamp(at + delta, 0, positions.length - 1)]
}

/** cursor just past a token that was inserted at `index` in `containerId` */
export function cursorAfterToken(containerId: string, index: number): CursorPos {
  return { containerId, index: index + 1 }
}

/** where the cursor should jump after inserting a fresh structure: its first empty part, if any */
export function cursorInsideGroup(groupId: string, parts: MathToken[][]): CursorPos {
  const firstEmpty = parts.findIndex((p) => p.length === 0)
  const partIndex = firstEmpty === -1 ? 0 : firstEmpty
  return { containerId: `${groupId}:${partIndex}`, index: 0 }
}

// ---------------------------------------------------------------------------
// editing
// ---------------------------------------------------------------------------

/** insert one token at the cursor position (tree-safe; falls back to no-op if the container vanished) */
export function insertToken(tokens: MathToken[], cursor: CursorPos, incoming: MathToken): MathToken[] {
  if (cursor.containerId === ROOT_ID) {
    const next = [...tokens]
    next.splice(clamp(cursor.index, 0, tokens.length), 0, incoming)
    return next
  }
  const parsed = parseContainerId(cursor.containerId)
  if (!parsed) return tokens

  const walk = (list: MathToken[]): MathToken[] =>
    list.map((token) => {
      if (token.kind !== 'group') return token
      if (token.id === parsed.groupId) {
        const parts = token.parts.map((part, i) => {
          if (i !== parsed.partIndex) return part
          const next = [...part]
          next.splice(clamp(cursor.index, 0, part.length), 0, incoming)
          return next
        })
        return { ...token, parts }
      }
      const parts = token.parts.map(walk)
      if (parts.some((part, i) => part !== token.parts[i])) return { ...token, parts }
      return token
    })

  return walk(tokens)
}

export interface DeleteResult {
  tokens: MathToken[]
  cursor: CursorPos
}

/**
 * backspace semantics, Desmos-style:
 * - cursor after an atom or a structure → that token is removed whole
 * - cursor at the start of a structure part → if the whole structure is
 *   empty it is deleted; otherwise the cursor just exits the structure
 */
export function deleteBefore(tokens: MathToken[], cursor: CursorPos): DeleteResult | null {
  if (cursor.containerId === ROOT_ID) {
    if (cursor.index <= 0) return null
    const next = [...tokens]
    next.splice(cursor.index - 1, 1)
    return { tokens: next, cursor: { containerId: ROOT_ID, index: cursor.index - 1 } }
  }

  const parsed = parseContainerId(cursor.containerId)
  if (!parsed) return null
  const group = findGroup(tokens, parsed.groupId)
  if (!group) return null

  // normal case: remove the token that ends at the cursor inside this part
  if (cursor.index > 0) {
    const next = replaceGroup(tokens, parsed.groupId, (g) => ({
      ...g,
      parts: g.parts.map((part, i) => {
        if (i !== parsed.partIndex) return part
        const nextPart = [...part]
        nextPart.splice(cursor.index - 1, 1)
        return nextPart
      }),
    }))
    return { tokens: next, cursor: { containerId: cursor.containerId, index: cursor.index - 1 } }
  }

  // cursor sits at the very start of a part
  const where = locateGroup(tokens, parsed.groupId)
  if (!where) return null
  if (group.parts.every((part) => part.length === 0)) {
    // empty structure → remove it entirely, cursor takes its place
    return { tokens: removeGroup(tokens, parsed.groupId), cursor: where }
  }
  // non-empty → just step out of the structure
  return { tokens, cursor: where }
}

/** rebuild the tree with one group transformed (matched by id) */
function replaceGroup(
  tokens: MathToken[],
  groupId: string,
  transform: (g: MathGroupToken) => MathGroupToken,
): MathToken[] {
  return tokens.map((token) => {
    if (token.kind !== 'group') return token
    if (token.id === groupId) return transform(token)
    return { ...token, parts: token.parts.map((part) => replaceGroup(part, groupId, transform)) }
  })
}

/** remove a whole group (and its subtree) from the tree */
export function removeGroup(tokens: MathToken[], groupId: string): MathToken[] {
  return tokens
    .filter((t) => t.id !== groupId)
    .map((token) => {
      if (token.kind !== 'group') return token
      return { ...token, parts: token.parts.map((part) => removeGroup(part, groupId)) }
    })
}

// ---------------------------------------------------------------------------
// LaTeX generation
// ---------------------------------------------------------------------------

/** chars escaped inside \text{…} — atoms are trusted, this only guards the fallback path */
const TEXT_UNSAFE = /([%&#_${}~^])/g

function partToLatex(part: MathToken[]): string {
  const s = part.map(tokenToLatex).join(' ').trim()
  // empty slots render a visible placeholder box, Word-style
  return s || '\\square'
}

function tokenToLatex(token: MathToken): string {
  switch (token.kind) {
    case 'atom':
      return token.latex
    case 'group':
      switch (token.group) {
        case 'fraction':
          return `\\frac{${partToLatex(token.parts[0])}}{${partToLatex(token.parts[1])}}`
        case 'sqrt':
          return `\\sqrt{${partToLatex(token.parts[0])}}`
        case 'power':
          return `{}^{${partToLatex(token.parts[0])}}`
        case 'sub':
          return `{}_{${partToLatex(token.parts[0])}}`
        case 'integral':
          return `\\int_{${partToLatex(token.parts[0])}}^{${partToLatex(token.parts[1])}}${partToLatex(token.parts[2])} \\, dx`
        case 'abs':
          return `\\left|${partToLatex(token.parts[0])}\\right|`
      }
  }
}

/** compile the whole workspace into one KaTeX string ('' when empty) */
export function mathTokensToLatex(tokens: MathToken[]): string {
  return tokens
    .map(tokenToLatex)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ---------------------------------------------------------------------------
// keyboard symbol tables (single source of truth for keys and their LaTeX)
// ---------------------------------------------------------------------------

export interface MathSymbolKey {
  /** key caption / chip value */
  value: string
  /** KaTeX chunk inserted */
  latex: string
}

export const GREEK_KEYS: MathSymbolKey[] = [
  { value: 'α', latex: '\\alpha' },
  { value: 'β', latex: '\\beta' },
  { value: 'γ', latex: '\\gamma' },
  { value: 'δ', latex: '\\delta' },
  { value: 'ε', latex: '\\epsilon' },
  { value: 'θ', latex: '\\theta' },
  { value: 'λ', latex: '\\lambda' },
  { value: 'μ', latex: '\\mu' },
  { value: 'π', latex: '\\pi' },
  { value: 'ρ', latex: '\\rho' },
  { value: 'σ', latex: '\\sigma' },
  { value: 'φ', latex: '\\phi' },
  { value: 'ω', latex: '\\omega' },
  { value: 'Δ', latex: '\\Delta' },
  { value: 'Σ', latex: '\\Sigma' },
  { value: 'Ω', latex: '\\Omega' },
]

export const SYMBOL_KEYS: MathSymbolKey[] = [
  { value: '∞', latex: '\\infty' },
  { value: '≠', latex: '\\neq' },
  { value: '∈', latex: '\\in' },
  { value: '∉', latex: '\\notin' },
  { value: '⊂', latex: '\\subset' },
  { value: '⊃', latex: '\\supset' },
  { value: '∪', latex: '\\cup' },
  { value: '∩', latex: '\\cap' },
  { value: '∅', latex: '\\emptyset' },
  { value: '∀', latex: '\\forall' },
  { value: '∃', latex: '\\exists' },
  { value: '∴', latex: '\\therefore' },
  { value: '°', latex: '^{\\circ}' },
  { value: '∠', latex: '\\angle' },
  { value: '⊥', latex: '\\perp' },
  { value: '∝', latex: '\\propto' },
]

export const RELATION_KEYS: MathSymbolKey[] = [
  { value: '≤', latex: '\\leq' },
  { value: '≥', latex: '\\geq' },
  { value: '≠', latex: '\\neq' },
  { value: '≈', latex: '\\approx' },
]

export const FUNCTION_KEYS: MathSymbolKey[] = [
  { value: 'sin', latex: '\\sin' },
  { value: 'cos', latex: '\\cos' },
  { value: 'tan', latex: '\\tan' },
  { value: 'ln', latex: '\\ln' },
  { value: 'log', latex: '\\log' },
]
