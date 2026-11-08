'use client'

import { Fragment } from 'react'
import { cn } from '@/lib/utils'
import {
  ROOT_ID,
  type CursorPos,
  type MathGroupToken,
  type MathToken,
} from '@/lib/notepad/formula/math-tokens'

/**
 * Recursive chip renderer for the Math workspace. Structures (fractions,
 * roots, powers, integrals…) render their parts as nested slots; the logical
 * cursor renders as a blinking caret wherever it currently lives. Clicking a
 * chip places the cursor right after it, clicking inside a slot moves the
 * cursor to the end of that slot — no OS keyboard involved.
 */

interface TokenViewProps {
  token: MathToken
  cursor: CursorPos
  onSetCursor: (pos: CursorPos) => void
  /** container this token lives in ('root' or `${groupId}:${partIndex}`) */
  containerId: string
  /** index of this token inside its container */
  index: number
}

const CHIP =
  'relative inline-flex items-center rounded-md border border-border bg-card px-1.5 py-1 shadow-xs transition-colors hover:border-foreground/40'

/** the blinking insertion caret */
function Caret() {
  return (
    <span
      aria-hidden="true"
      className="math-caret mx-px inline-block h-5 w-[2px] shrink-0 self-center rounded-full bg-primary"
    />
  )
}

/** dashed placeholder shown in an empty slot (when the cursor is elsewhere) */
function EmptySlot() {
  return <span aria-hidden="true" className="h-4 w-3 rounded-[2px] border border-dashed border-muted-foreground/50" />
}

/**
 * one editable slot of a structure — renders its child chips plus the caret
 * when the cursor lives here; clicking anywhere in the box targets the end
 * of this slot
 */
function PartBox({
  containerId,
  part,
  cursor,
  onSetCursor,
  className,
}: {
  containerId: string
  part: MathToken[]
  cursor: CursorPos
  onSetCursor: (pos: CursorPos) => void
  className?: string
}) {
  const empty = part.length === 0
  return (
    <span
      role="button"
      tabIndex={-1}
      aria-label={`Insert into slot${empty ? ' (empty)' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onSetCursor({ containerId, index: part.length })
      }}
      className={cn(
        'relative inline-flex min-h-6 min-w-5 cursor-text flex-wrap items-center gap-0.5 rounded-[3px] px-0.5',
        className,
      )}
    >
      {part.map((child, i) => (
        <Fragment key={child.id}>
          {cursor.containerId === containerId && cursor.index === i && <Caret />}
          <TokenView token={child} cursor={cursor} onSetCursor={onSetCursor} containerId={containerId} index={i} />
        </Fragment>
      ))}
      {cursor.containerId === containerId && cursor.index === part.length && <Caret />}
      {empty && !(cursor.containerId === containerId) && <EmptySlot />}
    </span>
  )
}

function AtomTokenView({
  token,
  posAfter,
  onSetCursor,
}: {
  token: Extract<MathToken, { kind: 'atom' }>
  posAfter: CursorPos
  onSetCursor: (pos: CursorPos) => void
}) {
  const isLetter = /^[a-zA-Z]$/.test(token.value)
  return (
    <span
      onClick={(e) => {
        e.stopPropagation()
        onSetCursor(posAfter)
      }}
      title="Click to place the cursor after it"
      className={cn(CHIP, 'cursor-text', isLetter && 'font-serif italic')}
    >
      {token.value}
    </span>
  )
}

/** fraction chip: numerator over denominator with a real divider */
function FractionView({ token, cursor, onSetCursor, posAfter }: Omit<TokenViewProps, 'token' | 'index' | 'containerId'> & { token: MathGroupToken; posAfter: CursorPos }) {
  return (
    <span
      onClick={(e) => {
        e.stopPropagation()
        onSetCursor(posAfter)
      }}
      className={cn(CHIP, 'cursor-text flex-col gap-0.5 px-2 py-1')}
    >
      <PartBox containerId={`${token.id}:0`} part={token.parts[0]} cursor={cursor} onSetCursor={onSetCursor} className="justify-center" />
      <span aria-hidden="true" className="h-px w-full min-w-10 bg-foreground/60" />
      <PartBox containerId={`${token.id}:1`} part={token.parts[1]} cursor={cursor} onSetCursor={onSetCursor} className="justify-center" />
    </span>
  )
}

/** √ with an overlined radicand slot */
function SqrtView({ token, cursor, onSetCursor, posAfter }: Omit<TokenViewProps, 'token' | 'index' | 'containerId'> & { token: MathGroupToken; posAfter: CursorPos }) {
  return (
    <span
      onClick={(e) => {
        e.stopPropagation()
        onSetCursor(posAfter)
      }}
      className={cn(CHIP, 'cursor-text gap-0 px-1 py-1')}
    >
      <span aria-hidden="true" className="text-lg leading-none">
        √
      </span>
      <PartBox
        containerId={`${token.id}:0`}
        part={token.parts[0]}
        cursor={cursor}
        onSetCursor={onSetCursor}
        className="min-h-7 rounded-none rounded-bl-[3px] border-l-2 border-t-2 border-foreground/70 px-1"
      />
    </span>
  )
}

/** superscript / subscript slot ({}^□ and {}_□ in the LaTeX output) */
function ScriptView({ token, cursor, onSetCursor, posAfter, raised }: Omit<TokenViewProps, 'token' | 'index' | 'containerId'> & { token: MathGroupToken; posAfter: CursorPos; raised: boolean }) {
  return (
    <span
      onClick={(e) => {
        e.stopPropagation()
        onSetCursor(posAfter)
      }}
      className={cn(CHIP, 'cursor-text px-1 py-0.5')}
    >
      <PartBox
        containerId={`${token.id}:0`}
        part={token.parts[0]}
        cursor={cursor}
        onSetCursor={onSetCursor}
        className={cn('min-h-5', raised ? 'relative -top-1.5' : 'relative top-1.5')}
      />
    </span>
  )
}

/** |…| chip */
function AbsView({ token, cursor, onSetCursor, posAfter }: Omit<TokenViewProps, 'token' | 'index' | 'containerId'> & { token: MathGroupToken; posAfter: CursorPos }) {
  return (
    <span
      onClick={(e) => {
        e.stopPropagation()
        onSetCursor(posAfter)
      }}
      className={cn(CHIP, 'cursor-text px-1 py-1')}
    >
      <span aria-hidden="true" className="text-lg font-light leading-none">
        |
      </span>
      <PartBox containerId={`${token.id}:0`} part={token.parts[0]} cursor={cursor} onSetCursor={onSetCursor} className="min-h-7 px-1" />
      <span aria-hidden="true" className="text-lg font-light leading-none">
        |
      </span>
    </span>
  )
}

/** ∫ with tiny lower/upper bound slots beside it, an integrand slot and a dx tail */
function IntegralView({ token, cursor, onSetCursor, posAfter }: Omit<TokenViewProps, 'token' | 'index' | 'containerId'> & { token: MathGroupToken; posAfter: CursorPos }) {
  return (
    <span
      onClick={(e) => {
        e.stopPropagation()
        onSetCursor(posAfter)
      }}
      className={cn(CHIP, 'cursor-text gap-1 px-2 py-1')}
    >
      <span className="flex items-center">
        <span aria-hidden="true" className="text-xl leading-none">
          ∫
        </span>
        <span className="flex flex-col leading-none">
          <PartBox containerId={`${token.id}:1`} part={token.parts[1]} cursor={cursor} onSetCursor={onSetCursor} className="-mb-0.5 min-h-4 min-w-4 justify-center text-[9px]" />
          <PartBox containerId={`${token.id}:0`} part={token.parts[0]} cursor={cursor} onSetCursor={onSetCursor} className="-mt-0.5 min-h-4 min-w-4 justify-center text-[9px]" />
        </span>
      </span>
      <PartBox containerId={`${token.id}:2`} part={token.parts[2]} cursor={cursor} onSetCursor={onSetCursor} className="min-h-7 px-1" />
      <span aria-hidden="true" className="font-serif text-xs italic leading-none">
        dx
      </span>
    </span>
  )
}

export function TokenView({ token, cursor, onSetCursor, containerId, index }: TokenViewProps) {
  const posAfter: CursorPos = { containerId, index: index + 1 }
  const passthrough = { cursor, onSetCursor, posAfter }

  if (token.kind === 'atom') {
    return <AtomTokenView token={token} posAfter={posAfter} onSetCursor={onSetCursor} />
  }
  switch (token.group) {
    case 'fraction':
      return <FractionView token={token} {...passthrough} />
    case 'sqrt':
      return <SqrtView token={token} {...passthrough} />
    case 'power':
      return <ScriptView token={token} raised {...passthrough} />
    case 'sub':
      return <ScriptView token={token} raised={false} {...passthrough} />
    case 'abs':
      return <AbsView token={token} {...passthrough} />
    case 'integral':
      return <IntegralView token={token} {...passthrough} />
  }
}

/**
 * the full top-level workspace content — chips + caret in document order;
 * the parent owns the click-to-place-cursor-at-end background behaviour
 */
export function MathWorkspaceContent({
  tokens,
  cursor,
  onSetCursor,
}: {
  tokens: MathToken[]
  cursor: CursorPos
  onSetCursor: (pos: CursorPos) => void
}) {
  return (
    <>
      {tokens.map((token, i) => (
        <Fragment key={token.id}>
          {cursor.containerId === ROOT_ID && cursor.index === i && <Caret />}
          <TokenView token={token} cursor={cursor} onSetCursor={onSetCursor} containerId={ROOT_ID} index={i} />
        </Fragment>
      ))}
      {cursor.containerId === ROOT_ID && cursor.index === tokens.length && <Caret />}
    </>
  )
}
