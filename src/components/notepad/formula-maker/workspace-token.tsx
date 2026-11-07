'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  ArrowToken,
  ElementToken,
  FormulaToken,
  GasUpToken,
  PlusToken,
  PrecipDownToken,
  TextToken,
  TokenPatch,
} from '@/lib/notepad/formula/tokens'

export type { TokenPatch } from '@/lib/notepad/formula/tokens'

interface TokenViewProps {
  token: FormulaToken
  /** id of the token whose primary slot should open for editing on mount */
  autoFocusId: string | null
  onPatch: (patch: TokenPatch) => void
  onRemove: () => void
}

/** visual shell every token chip shares */
const CHIP =
  'group relative inline-flex items-center rounded-md border border-border bg-card px-1.5 py-1 shadow-xs transition-colors hover:border-foreground/30'

/**
 * The MS-Word-style placeholder: when empty it renders as a small dashed box;
 * clicking it turns into a focused text input. Enter commits, Escape cancels.
 */
function EditableSlot({
  value,
  placeholder,
  ariaLabel,
  className,
  initiallyEditing = false,
  onCommit,
}: {
  value: string
  /** tiny hint char shown inside the dashed box */
  placeholder: string
  ariaLabel: string
  className?: string
  /** start with the input open — used by freshly inserted condition arrows */
  initiallyEditing?: boolean
  onCommit: (value: string) => void
}) {
  const [editing, setEditing] = useState(initiallyEditing)
  const [draft, setDraft] = useState(initiallyEditing ? value : '')
  const inputRef = useRef<HTMLInputElement>(null)
  const cancelled = useRef(false)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false
      return
    }
    setEditing(false)
    onCommit(draft.trim())
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            inputRef.current?.blur()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            cancelled.current = true
            setEditing(false)
          }
        }}
        aria-label={ariaLabel}
        className={cn(
          'rounded-[3px] border border-ring bg-background text-center font-mono outline-none',
          className,
        )}
        style={{ width: `${Math.max(3, draft.length + 2)}ch` }}
      />
    )
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={() => {
        cancelled.current = false
        setDraft(value)
        setEditing(true)
      }}
      className={cn(
        'cursor-text transition-colors',
        value
          ? 'font-mono hover:text-foreground'
          : 'rounded-[3px] border border-dashed border-muted-foreground/50 bg-muted/40 text-muted-foreground/70 hover:border-foreground/60 hover:bg-muted hover:text-foreground',
        className,
      )}
    >
      {value ? value : <span aria-hidden="true">{placeholder}</span>}
    </button>
  )
}

function RemoveButton({ onRemove, label }: { onRemove: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={label}
      title={label}
      className="absolute -right-1.5 -top-1.5 z-10 hidden h-4 w-4 cursor-pointer items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:text-destructive group-hover:flex"
    >
      <X className="h-2.5 w-2.5" />
      <span className="sr-only">{label}</span>
    </button>
  )
}

function ElementTokenView({
  token,
  onPatch,
  onRemove,
}: {
  token: ElementToken
  onPatch: (patch: TokenPatch) => void
  onRemove: () => void
}) {
  return (
    <span className={CHIP}>
      <span className="font-serif text-[15px] font-semibold leading-none">{token.symbol}</span>
      <EditableSlot
        value={token.count}
        placeholder="n"
        ariaLabel={`Subscript count for ${token.symbol}`}
        onCommit={(count) => onPatch({ count })}
        className="ml-px h-3.5 min-w-3.5 translate-y-[3px] px-px text-[10px] leading-none"
      />
      <EditableSlot
        value={token.charge}
        placeholder="q"
        ariaLabel={`Ionic charge for ${token.symbol}`}
        onCommit={(charge) => onPatch({ charge })}
        className="ml-px h-3.5 min-w-3.5 -translate-y-[7px] px-px text-[10px] leading-none"
      />
      <RemoveButton onRemove={onRemove} label={`Remove ${token.symbol}`} />
    </span>
  )
}

function ArrowTokenView({
  token,
  isAutoFocus,
  onPatch,
  onRemove,
}: {
  token: ArrowToken
  isAutoFocus: boolean
  onPatch: (patch: TokenPatch) => void
  onRemove: () => void
}) {
  return (
    <span className={cn(CHIP, 'flex-col gap-0.5 px-2 py-0.5')}>
      <EditableSlot
        value={token.above}
        placeholder="condition"
        ariaLabel="Condition above the arrow"
        initiallyEditing={isAutoFocus}
        onCommit={(above) => onPatch({ above })}
        className="h-3.5 min-w-12 px-1 text-[9px] leading-none"
      />
      <svg width="46" height="8" viewBox="0 0 46 8" aria-hidden="true" className="text-foreground">
        <line x1="1" y1="4" x2="38" y2="4" stroke="currentColor" strokeWidth="1.4" />
        <path d="M38 0.5 L45 4 L38 7.5 Z" fill="currentColor" />
      </svg>
      <EditableSlot
        value={token.below}
        placeholder="note"
        ariaLabel="Note below the arrow"
        onCommit={(below) => onPatch({ below })}
        className="h-3.5 min-w-12 px-1 text-[9px] leading-none"
      />
      <RemoveButton onRemove={onRemove} label="Remove arrow" />
    </span>
  )
}

function TextTokenView({
  token,
  onPatch,
  onRemove,
}: {
  token: TextToken
  onPatch: (patch: TokenPatch) => void
  onRemove: () => void
}) {
  return (
    <span className={CHIP}>
      <EditableSlot
        value={token.value}
        placeholder="text"
        ariaLabel="Free text"
        onCommit={(v) => (v ? onPatch({ value: v }) : onRemove())}
        className="h-5 min-w-6 px-0.5 text-[13px] font-medium leading-none"
      />
      <RemoveButton onRemove={onRemove} label="Remove text" />
    </span>
  )
}

/** plus / gas evolved / precipitate — atomic chips with a single glyph */
function GlyphTokenView({
  token,
  onRemove,
}: {
  token: PlusToken | GasUpToken | PrecipDownToken
  onRemove: () => void
}) {
  const glyph = token.kind === 'plus' ? '+' : token.kind === 'gasUp' ? '↑' : '↓'
  const label =
    token.kind === 'plus' ? 'Remove plus' : token.kind === 'gasUp' ? 'Remove gas evolved arrow' : 'Remove precipitate arrow'
  return (
    <span className={cn(CHIP, 'px-2')}>
      <span className="text-[15px] font-semibold leading-none">{glyph}</span>
      <RemoveButton onRemove={onRemove} label={label} />
    </span>
  )
}

export function TokenView({ token, autoFocusId, onPatch, onRemove }: TokenViewProps) {
  switch (token.kind) {
    case 'element':
      return <ElementTokenView token={token} onPatch={onPatch} onRemove={onRemove} />
    case 'arrow':
      return (
        <ArrowTokenView
          token={token}
          isAutoFocus={autoFocusId === token.id}
          onPatch={onPatch}
          onRemove={onRemove}
        />
      )
    case 'text':
      return <TextTokenView token={token} onPatch={onPatch} onRemove={onRemove} />
    default:
      return <GlyphTokenView token={token} onRemove={onRemove} />
  }
}
