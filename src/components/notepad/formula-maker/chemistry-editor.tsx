'use client'

import { useMemo, useRef, useState } from 'react'
import { Copy, PencilLine, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Latex } from '@/components/notepad/markdown-preview'
import {
  makeArrowToken,
  makeElementToken,
  makeGasUpToken,
  makePlusToken,
  makePrecipDownToken,
  makeTextToken,
  removeToken,
  tokensToLatex,
  updateToken,
  type ArrowToken,
  type ElementToken,
  type FormulaToken,
  type TextToken,
} from '@/lib/notepad/formula/tokens'
import { PeriodicTable } from './periodic-table'
import { TokenView } from './workspace-token'
import type { TokenPatch } from '@/lib/notepad/formula/tokens'

interface ChemistryEditorProps {
  tokens: FormulaToken[]
  onTokensChange: (tokens: FormulaToken[]) => void
  /** present when opened from the note editor — inserts the LaTeX into the note */
  onInsert?: (latex: string) => void
}

/** one preliminary symbol button in the right-top pane */
function PrelimButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-11 min-w-11 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border bg-background px-2.5 text-foreground transition-colors hover:border-foreground/40 hover:bg-accent"
    >
      {children}
    </button>
  )
}

export function ChemistryEditor({ tokens, onTokensChange, onInsert }: ChemistryEditorProps) {
  const { toast } = useToast()
  const [autoFocusId, setAutoFocusId] = useState<string | null>(null)
  const trailingRef = useRef<HTMLInputElement>(null)

  const latex = useMemo(() => tokensToLatex(tokens), [tokens])

  const append = (token: FormulaToken) => onTokensChange([...tokens, token])

  const patchToken = (id: string, patch: TokenPatch) =>
    onTokensChange(updateToken(tokens, id, patch))

  const dropToken = (id: string) => onTokensChange(removeToken(tokens, id))

  const addArrow = (withCondition: boolean) => {
    const token = makeArrowToken()
    append(token)
    if (withCondition) setAutoFocusId(token.id)
  }

  // the trailing input is uncontrolled so Enter keeps focus for the next word
  const commitTrailing = () => {
    const input = trailingRef.current
    const raw = input?.value.trim()
    if (raw && input) {
      append(makeTextToken(raw))
      input.value = ''
    }
  }

  const copyLatex = async () => {
    try {
      await navigator.clipboard.writeText(latex)
      toast({
        title: 'LaTeX copied',
        description: 'Paste it anywhere — notes accept $…$ inline and $$…$$ blocks.',
      })
    } catch {
      toast({
        title: 'Copy failed',
        description: 'The clipboard is unavailable in this browser.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 lg:flex-row lg:overflow-hidden">
      {/* ---------- left pane: workspace + generated LaTeX ---------- */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        <div className="flex min-h-[200px] flex-1 flex-col overflow-hidden rounded-xl border bg-card">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <PencilLine className="h-3.5 w-3.5" />
              Workspace — click a placeholder to type its value
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
              disabled={!tokens.length}
              onClick={() => onTokensChange([])}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
          </div>

          <div
            className="flex flex-1 cursor-text flex-wrap content-start items-center gap-1.5 overflow-y-auto p-3"
            onClick={(e) => {
              if (e.target === e.currentTarget) trailingRef.current?.focus()
            }}
          >
            {tokens.map((token) => (
              <TokenView
                key={token.id}
                token={token}
                autoFocusId={autoFocusId}
                onPatch={(patch) => patchToken(token.id, patch)}
                onRemove={() => dropToken(token.id)}
              />
            ))}
            <input
              ref={trailingRef}
              type="text"
              aria-label="Type a coefficient or word"
              placeholder={tokens.length ? 'Type, then Enter…' : 'Or type here, then Enter…'}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitTrailing()
                } else if (e.key === 'Backspace' && !e.currentTarget.value && tokens.length) {
                  e.preventDefault()
                  dropToken(tokens[tokens.length - 1].id)
                }
              }}
              className="min-w-40 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            />
            {!tokens.length && (
              <p className="w-full pt-6 text-center text-xs text-muted-foreground/70">
                Click an element on the right to start your formula — subscripts, charges and
                arrow conditions appear as placeholders you can fill in.
              </p>
            )}
          </div>
        </div>

        {/* generated LaTeX — rendered preview + raw string */}
        <div className="shrink-0 rounded-xl border bg-card p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              LaTeX — generated automatically
            </span>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2.5 text-xs"
                disabled={!latex}
                onClick={copyLatex}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
              {onInsert && (
                <Button
                  size="sm"
                  className="h-7 gap-1 px-2.5 text-xs"
                  disabled={!latex}
                  onClick={() => onInsert(latex)}
                >
                  Insert into note
                </Button>
              )}
            </div>
          </div>
          <div className="mt-2 flex min-h-[68px] items-center justify-center overflow-x-auto rounded-lg bg-muted/40 px-3 py-3">
            {latex ? (
              <Latex tex={latex} display />
            ) : (
              <span className="text-xs text-muted-foreground">
                Your equation appears here as you build it
              </span>
            )}
          </div>
          <code className="mt-2 block max-h-16 overflow-auto rounded bg-muted/60 px-2 py-1.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {latex || '\u00A0'}
          </code>
        </div>
      </div>

      {/* ---------- right pane: preliminaries + elements ---------- */}
      <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[600px] xl:w-[640px]">
        <div className="shrink-0 rounded-xl border bg-card p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Preliminaries</p>
          <div className="flex flex-wrap gap-2">
            <PrelimButton label="Insert plus" onClick={() => append(makePlusToken())}>
              <span className="text-base font-semibold leading-none">+</span>
            </PrelimButton>
            <PrelimButton label="Insert arrow" onClick={() => addArrow(false)}>
              <span className="text-base leading-none">→</span>
            </PrelimButton>
            <PrelimButton label="Insert arrow with condition above" onClick={() => addArrow(true)}>
              <span className="flex flex-col items-center leading-none">
                <span className="text-[8px] leading-none">Δ</span>
                <span className="text-sm leading-none">→</span>
              </span>
            </PrelimButton>
            <PrelimButton label="Insert gas evolved (up arrow)" onClick={() => append(makeGasUpToken())}>
              <span className="text-base font-semibold leading-none">↑</span>
            </PrelimButton>
            <PrelimButton
              label="Insert precipitate (down arrow)"
              onClick={() => append(makePrecipDownToken())}
            >
              <span className="text-base font-semibold leading-none">↓</span>
            </PrelimButton>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card">
          <p className="shrink-0 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
            Elements — all 108, click to insert
          </p>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            <PeriodicTable onPick={(symbol) => append(makeElementToken(symbol))} />
          </div>
        </div>
      </div>
    </div>
  )
}
