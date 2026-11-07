/**
 * Token model for the formula maker's workspace.
 *
 * The student never writes LaTeX — they click element tiles / preliminary
 * symbols and fill small placeholders (subscripts, charges, arrow
 * conditions). Each click produces a token below; the LaTeX string is
 * generated from the token list, so what gets inserted into the note is
 * always clean, valid KaTeX.
 */

export interface ElementToken {
  id: string
  kind: 'element'
  /** element symbol, e.g. "H", "Fe" */
  symbol: string
  /** subscript (atom count), e.g. "2" in H2O — empty when none */
  count: string
  /** superscript ionic charge, e.g. "2-" in SO4^2- — empty when none */
  charge: string
}

export interface PlusToken {
  id: string
  kind: 'plus'
}

export interface ArrowToken {
  id: string
  kind: 'arrow'
  /** condition written above the arrow (Δ, catalyst name…) — empty when none */
  above: string
  /** note written below the arrow (heat, reflux…) — empty when none */
  below: string
}

export interface GasUpToken {
  id: string
  kind: 'gasUp'
}

export interface PrecipDownToken {
  id: string
  kind: 'precipDown'
}

export interface TextToken {
  id: string
  kind: 'text'
  /** free text: coefficients ("2"), states ("(s)"), words ("heat")… */
  value: string
}

export type FormulaToken =
  | ElementToken
  | PlusToken
  | ArrowToken
  | GasUpToken
  | PrecipDownToken
  | TextToken

let idCounter = 0

/** collision-safe id even in browsers without crypto.randomUUID */
export function newTokenId(): string {
  idCounter += 1
  return `tok-${Date.now().toString(36)}-${idCounter}`
}

// ---------------------------------------------------------------------------
// token factories
// ---------------------------------------------------------------------------

export function makeElementToken(symbol: string, count = '', charge = ''): ElementToken {
  return { id: newTokenId(), kind: 'element', symbol, count, charge }
}

export function makePlusToken(): PlusToken {
  return { id: newTokenId(), kind: 'plus' }
}

export function makeArrowToken(): ArrowToken {
  return { id: newTokenId(), kind: 'arrow', above: '', below: '' }
}

export function makeGasUpToken(): GasUpToken {
  return { id: newTokenId(), kind: 'gasUp' }
}

export function makePrecipDownToken(): PrecipDownToken {
  return { id: newTokenId(), kind: 'precipDown' }
}

export function makeTextToken(value: string): TextToken {
  return { id: newTokenId(), kind: 'text', value }
}

/**
 * writable, non-discriminating fields of the editable token kinds — the
 * `kind`/`id` fields are omitted so the three shapes intersect cleanly
 * (intersecting the literals 'element' & 'arrow' would collapse to never)
 */
export type TokenPatch = Partial<Omit<ElementToken, 'id' | 'kind'>> &
  Partial<Omit<ArrowToken, 'id' | 'kind'>> &
  Partial<Omit<TextToken, 'id' | 'kind'>>

/** update one token (matched by id) inside the list — returns a new array */
export function updateToken(tokens: FormulaToken[], id: string, patch: TokenPatch): FormulaToken[] {
  return tokens.map((t) => (t.id === id ? ({ ...t, ...patch } as FormulaToken) : t))
}

/** remove one token (matched by id) — returns a new array */
export function removeToken(tokens: FormulaToken[], id: string): FormulaToken[] {
  return tokens.filter((t) => t.id !== id)
}

// ---------------------------------------------------------------------------
// LaTeX generation
// ---------------------------------------------------------------------------

/** chars escaped inside \text{…} (backslashes are dropped: plain text never contains LaTeX commands) */
const TEXT_UNSAFE = /([%&#_${}~^])/g

function escapeLatexText(value: string): string {
  return value.replace(/\\/g, '').replace(TEXT_UNSAFE, '\\$1')
}

/**
 * Arrow conditions/notes keep their backslashes so students can type real
 * LaTeX commands (\Delta, \ce{MnO2}…) — only the characters that would
 * structurally break the surrounding expression are escaped.
 */
const CONDITION_UNSAFE = /([%&#$])/g

function escapeLatexCondition(value: string): string {
  return value.replace(CONDITION_UNSAFE, '\\$1')
}

function tokenToLatex(token: FormulaToken): string {
  switch (token.kind) {
    case 'element': {
      let s = `\\mathrm{${token.symbol}}`
      const count = token.count.trim()
      const charge = token.charge.trim()
      if (count) s += `_{${count}}`
      if (charge) s += `^{${charge}}`
      return s
    }
    case 'plus':
      return '+'
    case 'arrow': {
      const above = token.above.trim()
      const below = token.below.trim()
      if (!above && !below) return '\\rightarrow'
      // \xrightarrow[below]{above} — KaTeX is happy with an empty group on
      // either side, so only omit the optional [] when there is no below text
      if (!below) return `\\xrightarrow{${escapeLatexCondition(above)}}`
      return `\\xrightarrow[${escapeLatexCondition(below)}]{${escapeLatexCondition(above)}}`
    }
    case 'gasUp':
      return '\\uparrow'
    case 'precipDown':
      return '\\downarrow'
    case 'text': {
      const value = token.value.trim()
      return value ? `\\text{${escapeLatexText(value)}}` : ''
    }
  }
}

/**
 * Compile the workspace tokens into a single LaTeX string.
 * Whitespace between tokens is harmless — KaTeX collapses it in math mode —
 * so a plain space join keeps the generator simple and predictable.
 */
export function tokensToLatex(tokens: FormulaToken[]): string {
  return tokens
    .map(tokenToLatex)
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}
