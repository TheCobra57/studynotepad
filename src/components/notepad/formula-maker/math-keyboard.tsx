'use client'

import { useState } from 'react'
import { Copy, Redo2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { makeAtom, type MathGroupKind, type MathToken } from '@/lib/notepad/formula/math-tokens'

/**
 * The Math tab's on-screen keyboard — the ONLY input method of the math
 * workspace, so the OS keyboard never appears (there is no text field to
 * focus). Layout follows a Desmos-style three-zone pad:
 *
 *   [ tab zone (123 / ∞≠∈ / abc / αβγ) | numpad | functions · structures · nav ]
 *
 * with undo / redo / copy in the top bar. Zones keep their real-world key
 * sizes on phones (min 36px) and the whole pad re-centres responsively.
 */

export type MathKeyAction =
  | { type: 'atom'; value: string; latex: string }
  | { type: 'structure'; kind: MathGroupKind; prefills?: MathToken[][] }
  | { type: 'backspace' }
  | { type: 'move'; delta: number }
  | { type: 'enter' }
  | { type: 'seq'; actions: MathKeyAction[] }

interface MathKeyboardProps {
  onKey: (action: MathKeyAction) => void
  onUndo: () => void
  onRedo: () => void
  onCopy: () => void
  canUndo: boolean
  canRedo: boolean
  disabled?: boolean
}

type KeyboardTab = 'digits' | 'symbols' | 'letters' | 'greek'

const TABS: { value: KeyboardTab; label: string; aria: string }[] = [
  { value: 'digits', label: '123', aria: 'Numbers and variables keyboard' },
  { value: 'symbols', label: '∞≠∈', aria: 'Relation and set symbols keyboard' },
  { value: 'letters', label: 'abc', aria: 'Letters keyboard' },
  { value: 'greek', label: 'αβγ', aria: 'Greek letters keyboard' },
]

/** shared visual shell of every key */
const KEY =
  'flex h-9 w-9 cursor-pointer select-none items-center justify-center rounded-lg border bg-background text-sm font-medium leading-none text-foreground shadow-xs transition-[transform,background-color] hover:bg-accent active:scale-[0.94] sm:h-11 sm:w-11 sm:text-base'

function Key({
  label,
  aria,
  onClick,
  className,
  disabled,
}: {
  label: React.ReactNode
  aria: string
  onClick: () => void
  className?: string
  disabled?: boolean
}) {
  return (
    <button type="button" aria-label={aria} onClick={onClick} disabled={disabled} className={cn(KEY, className)}>
      {label}
    </button>
  )
}

/** tiny □ glyphs used inside structure key labels */
function Box({ className }: { className?: string }) {
  return <span aria-hidden className={cn('text-[9px] leading-none', className)}>□</span>
}

function FractionKeyLabel() {
  return (
    <span aria-hidden className="flex flex-col items-center gap-px leading-none">
      <Box />
      <span className="h-px w-4 bg-current" />
      <Box />
    </span>
  )
}

function SqrtKeyLabel() {
  return (
    <span aria-hidden className="flex items-start leading-none">
      <span className="text-base">√</span>
      <span className="mt-0.5 border-t border-current px-0.5">
        <Box />
      </span>
    </span>
  )
}

function PowerKeyLabel({ exp }: { exp: string }) {
  return (
    <span aria-hidden className="leading-none">
      x<sup className="text-[9px]">{exp}</sup>
    </span>
  )
}

function SubKeyLabel() {
  return (
    <span aria-hidden className="leading-none">
      x<sub className="text-[9px]">□</sub>
    </span>
  )
}

function IntegralKeyLabel() {
  return (
    <span aria-hidden className="whitespace-nowrap text-[11px] leading-none">
      ∫<sub className="text-[8px]">0</sub>
      <sup className="text-[8px]">∞</sup>
      <Box className="mx-px" />
      dx
    </span>
  )
}

function AbsKeyLabel() {
  return (
    <span aria-hidden className="leading-none">
      |<Box className="mx-px" />|
    </span>
  )
}

export function MathKeyboard({ onKey, onUndo, onRedo, onCopy, canUndo, canRedo, disabled }: MathKeyboardProps) {
  const [tab, setTab] = useState<KeyboardTab>('digits')
  const [shift, setShift] = useState(false)

  const tapAtom = (value: string, latex: string) => onKey({ type: 'atom', value, latex })

  // shift converts letters (abc tab) to uppercase and resets after one key —
  // just like the phone keyboard everyone already knows
  const tapLetter = (letter: string) => {
    const value = shift ? letter.toUpperCase() : letter
    tapAtom(value, value)
    if (shift) setShift(false)
  }

  const switchTab = (next: KeyboardTab) => {
    setTab(next)
    setShift(false)
  }

  const atomKey = (value: string, latex: string, aria: string, className?: string) => (
    <Key
      key={`${value}-${latex}`}
      label={value}
      aria={aria}
      className={className}
      disabled={disabled}
      onClick={() => tapAtom(value, latex)}
    />
  )

  // -- zone A: changes with the active tab ---------------------------------

  const digitsGrid = (
    <>
      {['x', 'y', 'z', 'n'].map((v) => atomKey(v, v, `Insert variable ${v}`))}
      {['a', 'b', 'c', 'k'].map((v) => atomKey(v, v, `Insert variable ${v}`))}
      {atomKey('(', '(', 'Insert opening parenthesis')}
      {atomKey(')', ')', 'Insert closing parenthesis')}
      {atomKey('<', '<', 'Insert less than')}
      {atomKey('>', '>', 'Insert greater than')}
      {atomKey('≤', '\\leq', 'Insert less than or equal')}
      {atomKey('≥', '\\geq', 'Insert greater than or equal')}
      {atomKey('≠', '\\neq', 'Insert not equal')}
      {atomKey('≈', '\\approx', 'Insert approximately equal')}
      {atomKey('±', '\\pm', 'Insert plus minus')}
      {atomKey('°', '^{\\circ}', 'Insert degree')}
    </>
  )

  const symbolsGrid = (
    <>
      {atomKey('∞', '\\infty', 'Insert infinity')}
      {atomKey('≠', '\\neq', 'Insert not equal')}
      {atomKey('∈', '\\in', 'Insert element of')}
      {atomKey('∉', '\\notin', 'Insert not element of')}
      {atomKey('⊂', '\\subset', 'Insert subset of')}
      {atomKey('⊃', '\\supset', 'Insert superset of')}
      {atomKey('∪', '\\cup', 'Insert union')}
      {atomKey('∩', '\\cap', 'Insert intersection')}
      {atomKey('∅', '\\emptyset', 'Insert empty set')}
      {atomKey('∀', '\\forall', 'Insert for all')}
      {atomKey('∃', '\\exists', 'Insert there exists')}
      {atomKey('∴', '\\therefore', 'Insert therefore')}
      {atomKey('∵', '\\because', 'Insert because')}
      {atomKey('∠', '\\angle', 'Insert angle')}
      {atomKey('⊥', '\\perp', 'Insert perpendicular')}
      {atomKey('∝', '\\propto', 'Insert proportional to')}
    </>
  )

  const lettersGrid = (
    <>
      {'abcdefg'.split('').map((l) => (
        <Key
          key={l}
          label={shift ? l.toUpperCase() : l}
          aria={`Insert letter ${shift ? l.toUpperCase() : l}`}
          disabled={disabled}
          onClick={() => tapLetter(l)}
        />
      ))}
      {'hijklmn'.split('').map((l) => (
        <Key
          key={l}
          label={shift ? l.toUpperCase() : l}
          aria={`Insert letter ${shift ? l.toUpperCase() : l}`}
          disabled={disabled}
          onClick={() => tapLetter(l)}
        />
      ))}
      {'opqrstu'.split('').map((l) => (
        <Key
          key={l}
          label={shift ? l.toUpperCase() : l}
          aria={`Insert letter ${shift ? l.toUpperCase() : l}`}
          disabled={disabled}
          onClick={() => tapLetter(l)}
        />
      ))}
      {'vwxyz'.split('').map((l) => (
        <Key
          key={l}
          label={shift ? l.toUpperCase() : l}
          aria={`Insert letter ${shift ? l.toUpperCase() : l}`}
          disabled={disabled}
          onClick={() => tapLetter(l)}
        />
      ))}
      {atomKey(',', ',', 'Insert comma')}
      <Key
        label="⇧"
        aria="Shift — type uppercase letters"
        disabled={disabled}
        className={cn(shift && 'border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground')}
        onClick={() => setShift((s) => !s)}
      />
    </>
  )

  const greekGrid = (
    <>
      {atomKey('α', '\\alpha', 'Insert alpha')}
      {atomKey('β', '\\beta', 'Insert beta')}
      {atomKey('γ', '\\gamma', 'Insert gamma')}
      {atomKey('δ', '\\delta', 'Insert delta')}
      {atomKey('ε', '\\epsilon', 'Insert epsilon')}
      {atomKey('θ', '\\theta', 'Insert theta')}
      {atomKey('λ', '\\lambda', 'Insert lambda')}
      {atomKey('μ', '\\mu', 'Insert mu')}
      {atomKey('π', '\\pi', 'Insert pi')}
      {atomKey('ρ', '\\rho', 'Insert rho')}
      {atomKey('σ', '\\sigma', 'Insert sigma')}
      {atomKey('φ', '\\phi', 'Insert phi')}
      {atomKey('ω', '\\omega', 'Insert omega')}
      {atomKey('Δ', '\\Delta', 'Insert capital Delta')}
      {atomKey('Σ', '\\Sigma', 'Insert capital Sigma')}
      {atomKey('Ω', '\\Omega', 'Insert capital Omega')}
    </>
  )

  const tabGrid = tab === 'digits' ? digitsGrid : tab === 'symbols' ? symbolsGrid : tab === 'letters' ? lettersGrid : greekGrid
  const tabCols = tab === 'letters' ? 'grid-cols-7' : 'grid-cols-4'

  return (
    <section
      aria-label="Math keyboard"
      className="shrink-0 rounded-xl border bg-card p-2 sm:p-3"
    >
      {/* top bar: keyboard tabs + undo / redo / copy */}
      <div className="mb-2 flex items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-muted p-0.5" role="tablist" aria-label="Keyboard layout">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              aria-label={t.aria}
              disabled={disabled}
              onClick={() => switchTab(t.value)}
              className={cn(
                'h-8 cursor-pointer rounded-md px-2.5 text-xs font-bold transition-colors sm:text-sm',
                tab === t.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Undo"
            title="Undo"
            disabled={disabled || !canUndo}
            onClick={onUndo}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Redo"
            title="Redo"
            disabled={disabled || !canRedo}
            onClick={onRedo}
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Copy LaTeX"
            title="Copy LaTeX"
            disabled={disabled}
            onClick={onCopy}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* three zones — stacked & centred on phones, one row on desktop */}
      <div className="flex flex-col items-center gap-2 lg:flex-row lg:items-start lg:justify-center">
        {/* tab zone */}
        <div role="tabpanel" aria-label={TABS.find((t) => t.value === tab)?.aria}>
          <div className={cn('grid gap-1 sm:gap-1.5', tabCols)}>{tabGrid}</div>
        </div>

        <div className="flex gap-1.5 sm:gap-2">
          {/* numpad zone — always available */}
          <div className="grid grid-cols-4 gap-1 sm:gap-1.5" aria-label="Number pad">
            {atomKey('7', '7', 'Insert 7')}
            {atomKey('8', '8', 'Insert 8')}
            {atomKey('9', '9', 'Insert 9')}
            {atomKey('÷', '\\div', 'Insert divide')}
            {atomKey('4', '4', 'Insert 4')}
            {atomKey('5', '5', 'Insert 5')}
            {atomKey('6', '6', 'Insert 6')}
            {atomKey('×', '\\times', 'Insert multiply')}
            {atomKey('1', '1', 'Insert 1')}
            {atomKey('2', '2', 'Insert 2')}
            {atomKey('3', '3', 'Insert 3')}
            {atomKey('−', '-', 'Insert minus')}
            {atomKey('0', '0', 'Insert 0')}
            {atomKey('.', '.', 'Insert decimal point')}
            {atomKey('=', '=', 'Insert equals')}
            {atomKey('+', '+', 'Insert plus')}
          </div>

          {/* functions · structures · navigation zone */}
          <div className="grid grid-cols-4 gap-1 sm:gap-1.5" aria-label="Functions, structures and navigation">
            {atomKey('π', '\\pi', 'Insert pi')}
            {atomKey('i', 'i', 'Insert imaginary unit i')}
            <Key
              label={<PowerKeyLabel exp="□" />}
              aria="Insert e to the power"
              disabled={disabled}
              onClick={() =>
                onKey({ type: 'seq', actions: [{ type: 'atom', value: 'e', latex: 'e' }, { type: 'structure', kind: 'power' }] })
              }
            />
            {atomKey('ln', '\\ln', 'Insert natural log')}

            {atomKey('sin', '\\sin', 'Insert sine')}
            {atomKey('cos', '\\cos', 'Insert cosine')}
            {atomKey('tan', '\\tan', 'Insert tangent')}
            {atomKey('log', '\\log', 'Insert log')}

            <Key
              label={<PowerKeyLabel exp="2" />}
              aria="Insert square"
              disabled={disabled}
              onClick={() =>
                onKey({ type: 'structure', kind: 'power', prefills: [[makeAtom('2', '2')]] })
              }
            />
            <Key
              label={<PowerKeyLabel exp="□" />}
              aria="Insert power"
              disabled={disabled}
              onClick={() => onKey({ type: 'structure', kind: 'power' })}
            />
            <Key
              label={<SubKeyLabel />}
              aria="Insert subscript"
              disabled={disabled}
              onClick={() => onKey({ type: 'structure', kind: 'sub' })}
            />
            <Key
              label={<FractionKeyLabel />}
              aria="Insert fraction"
              disabled={disabled}
              onClick={() => onKey({ type: 'structure', kind: 'fraction' })}
            />

            <Key
              label={<SqrtKeyLabel />}
              aria="Insert square root"
              disabled={disabled}
              onClick={() => onKey({ type: 'structure', kind: 'sqrt' })}
            />
            <Key
              label={<IntegralKeyLabel />}
              aria="Insert integral from 0 to infinity"
              disabled={disabled}
              onClick={() =>
                onKey({
                  type: 'structure',
                  kind: 'integral',
                  prefills: [[makeAtom('0', '0')], [makeAtom('∞', '\\infty')]],
                })
              }
            />
            <Key
              label={<AbsKeyLabel />}
              aria="Insert absolute value"
              disabled={disabled}
              onClick={() => onKey({ type: 'structure', kind: 'abs' })}
            />
            <Key
              label={<span aria-hidden className="text-base">(&nbsp;)</span>}
              aria="Insert empty parentheses with cursor inside"
              disabled={disabled}
              onClick={() =>
                onKey({
                  type: 'seq',
                  actions: [
                    { type: 'atom', value: '(', latex: '(' },
                    { type: 'atom', value: ')', latex: ')' },
                    { type: 'move', delta: -1 },
                  ],
                })
              }
            />

            <Key
              label="←"
              aria="Move cursor left"
              disabled={disabled}
              onClick={() => onKey({ type: 'move', delta: -1 })}
            />
            <Key
              label="→"
              aria="Move cursor right"
              disabled={disabled}
              onClick={() => onKey({ type: 'move', delta: 1 })}
            />
            <Key
              label="⌫"
              aria="Backspace"
              disabled={disabled}
              className="hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onKey({ type: 'backspace' })}
            />
            <Key
              label="⏎"
              aria="Jump to end of formula"
              disabled={disabled}
              className="border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
              onClick={() => onKey({ type: 'enter' })}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
