/**
 * Unit tests for the Math tab's token engine — run with: bun scripts/test-math-tokens.ts
 */
import {
  cursorAfterToken,
  cursorInsideGroup,
  deleteBefore,
  flattenPositions,
  insertToken,
  makeAtom,
  makeGroup,
  mathTokensToLatex,
  moveCursor,
  ROOT_ID,
  type CursorPos,
  type MathToken,
} from '../src/lib/notepad/formula/math-tokens'

let passed = 0
let failed = 0

function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) {
    passed += 1
    console.log(`  ✓ ${name}`)
  } else {
    failed += 1
    console.error(`  ✗ ${name}\n      expected: ${e}\n      actual:   ${a}`)
  }
}

// -- helpers -----------------------------------------------------------------

/** simulate: insert atoms in sequence, following the cursor like the keyboard does */
function typeAtoms(tokens: MathToken[], cursor: CursorPos, values: string[]) {
  let t = tokens
  let c = cursor
  for (const v of values) {
    t = insertToken(t, c, makeAtom(v, v))
    c = { containerId: c.containerId, index: c.index + 1 }
  }
  return { tokens: t, cursor: c }
}

function findGroupById(tokens: MathToken[], groupId: string): MathToken | null {
  for (const t of tokens) {
    if (t.kind === 'group') {
      if (t.id === groupId) return t
      for (const p of t.parts) {
        const hit = findGroupById(p, groupId)
        if (hit) return hit
      }
    }
  }
  return null
}

function partOf(tokens: MathToken[], groupId: string, partIndex: number): MathToken[] {
  const g = findGroupById(tokens, groupId)
  if (!g || g.kind !== 'group') return []
  return g.parts[partIndex]
}

console.log('— atom typing at root —')
{
  const atom5 = makeAtom('5', '5')
  const r1 = insertToken([], { containerId: ROOT_ID, index: 0 }, atom5)
  check('insert into empty root', r1.length, 1)
  const r2 = typeAtoms(r1, { containerId: ROOT_ID, index: 1 }, ['+', 'x'])
  check('latex after 5 + x', mathTokensToLatex(r2.tokens), '5 + x')
  check('cursor at end', r2.cursor, { containerId: ROOT_ID, index: 3 })
}

console.log('— fraction + cursor walk to denominator (user example: (√a)/b) —')
{
  // tap □/□ → cursor should land in the numerator
  const frac = makeGroup('fraction')
  let tokens = insertToken([], { containerId: ROOT_ID, index: 0 }, frac)
  let cursor = cursorInsideGroup(frac.id, frac.parts)
  check('cursor enters numerator', cursor.containerId, `${frac.id}:0`)

  // tap √□ inside the numerator
  const sqrt = makeGroup('sqrt')
  tokens = insertToken(tokens, cursor, sqrt)
  cursor = cursorInsideGroup(sqrt.id, sqrt.parts)

  // tap a
  tokens = insertToken(tokens, cursor, makeAtom('a', 'a'))
  cursor = cursorAfterToken(cursor.containerId, cursor.index)

  check('numerator latex', mathTokensToLatex(partOf(tokens, frac.id, 0)), '\\sqrt{a}')
  check('full latex so far', mathTokensToLatex(tokens), '\\frac{\\sqrt{a}}{\\square}')

  // → should walk: sqrt end → numerator end → denominator start
  cursor = moveCursor(tokens, cursor, 1)
  check('walk out of sqrt', cursor.containerId, `${frac.id}:0`)
  cursor = moveCursor(tokens, cursor, 1)
  check('into denominator', cursor.containerId, `${frac.id}:1`)
  check('denominator index 0', cursor.index, 0)

  // tap b
  tokens = insertToken(tokens, cursor, makeAtom('b', 'b'))
  check('final latex (√a)/b', mathTokensToLatex(tokens), '\\frac{\\sqrt{a}}{b}')

  // document-order positions: root before + num(2) + sqrt(2) + den(2) + root end
  const positions = flattenPositions(tokens)
  check('flatten covers all containers', positions.length, 8)
}

console.log('— backspace semantics —')
{
  // after an atom
  let tokens: MathToken[] = [makeAtom('5', '5'), makeAtom('x', 'x')]
  let r = deleteBefore(tokens, { containerId: ROOT_ID, index: 2 })
  check('delete atom before cursor', [r!.tokens.length, r!.cursor.index], [1, 1])

  // at start of an EMPTY structure → structure deleted
  const frac = makeGroup('fraction')
  tokens = [makeAtom('1', '1'), frac, makeAtom('2', '2')]
  r = deleteBefore(tokens, { containerId: ROOT_ID, index: 2 })
  check('empty fraction removed', r!.tokens.map((t) => t.id), tokens.filter((t) => t.id !== frac.id).map((t) => t.id))
  check('cursor takes its place', r!.cursor, { containerId: ROOT_ID, index: 1 })

  // at start of a NON-empty part → cursor exits the structure
  const frac2 = makeGroup('fraction')
  const withContent = insertToken([frac2], { containerId: `${frac2.id}:0`, index: 0 }, makeAtom('a', 'a'))
  r = deleteBefore(withContent, { containerId: `${frac2.id}:0`, index: 0 })
  check('non-empty structure keeps tokens', mathTokensToLatex(r!.tokens), '\\frac{a}{\\square}')
  check('cursor exited to before group', r!.cursor, { containerId: ROOT_ID, index: 0 })

  // backspace after a structure removes it whole
  r = deleteBefore(withContent, { containerId: ROOT_ID, index: 1 })
  check('structure deleted from behind', r!.tokens.length, 0)

  // inside nested part: delete atom inside sqrt
  const sqrt = makeGroup('sqrt')
  const frac3 = makeGroup('fraction')
  let nested = insertToken([frac3], { containerId: `${frac3.id}:0`, index: 0 }, sqrt)
  nested = insertToken(nested, { containerId: `${sqrt.id}:0`, index: 0 }, makeAtom('a', 'a'))
  r = deleteBefore(nested, { containerId: `${sqrt.id}:0`, index: 1 })
  check('nested atom removed (empty sqrt kept)', mathTokensToLatex(r!.tokens), '\\frac{\\sqrt{\\square}}{\\square}')
  check('cursor back inside sqrt', r!.cursor, { containerId: `${sqrt.id}:0`, index: 0 })

  // root start → no-op
  check('backspace at very start is a no-op', deleteBefore([makeAtom('1', '1')], { containerId: ROOT_ID, index: 0 }), null)
}

console.log('— prefilled structures —')
{
  // x² = power with prefilled exponent
  const two = makeAtom('2', '2')
  const sq = makeGroup('power', [[two]])
  const tokens = insertToken([makeAtom('x', 'x')], { containerId: ROOT_ID, index: 1 }, sq)
  check('x² latex', mathTokensToLatex(tokens), 'x {}^{2}')
  // no empty part → cursor should jump AFTER the group
  const c = cursorAfterToken(ROOT_ID, 1)
  check('cursor after x²', c, { containerId: ROOT_ID, index: 2 })

  // ∫₀^∞□dx
  const int = makeGroup('integral', [[makeAtom('0', '0')], [makeAtom('∞', '\\infty')]])
  let tokens2 = insertToken([], { containerId: ROOT_ID, index: 0 }, int)
  tokens2 = insertToken(tokens2, { containerId: `${int.id}:2`, index: 0 }, makeAtom('x', 'x'))
  check('integral latex', mathTokensToLatex(tokens2), '\\int_{0}^{\\infty}x \\, dx')

  // abs + sub
  const abs = makeGroup('abs')
  let tokens3 = insertToken([], { containerId: ROOT_ID, index: 0 }, abs)
  tokens3 = insertToken(tokens3, { containerId: `${abs.id}:0`, index: 0 }, makeAtom('x', 'x'))
  const sub = makeGroup('sub')
  tokens3 = insertToken(tokens3, { containerId: ROOT_ID, index: 2 }, sub)
  tokens3 = insertToken(tokens3, { containerId: `${sub.id}:0`, index: 0 }, makeAtom('n', 'n'))
  check('|x| with subscript n', mathTokensToLatex(tokens3), '\\left|x\\right| {}_{n}')
}

console.log('— moveCursor edge cases —')
{
  const tokens: MathToken[] = [makeAtom('a', 'a')]
  const positions = flattenPositions(tokens)
  check('positions around one atom', positions, [
    { containerId: ROOT_ID, index: 0 },
    { containerId: ROOT_ID, index: 1 },
  ])
  const end = moveCursor(tokens, { containerId: ROOT_ID, index: 1 }, 1)
  check('clamped at end', end, { containerId: ROOT_ID, index: 1 })
  const start = moveCursor(tokens, { containerId: ROOT_ID, index: 0 }, -5)
  check('clamped at start', start, { containerId: ROOT_ID, index: 0 })
  const stale = moveCursor(tokens, { containerId: 'tok-gone:0', index: 3 }, 1)
  check('stale cursor falls back to end', stale, { containerId: ROOT_ID, index: 1 })
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
