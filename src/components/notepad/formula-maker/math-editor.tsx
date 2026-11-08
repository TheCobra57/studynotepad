'use client'

import { useMemo, useState } from 'react'
import { Copy, PencilLine, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Latex } from '@/components/notepad/markdown-preview'
import {
  cursorAfterToken,
  cursorInsideGroup,
  deleteBefore,
  insertToken,
  makeAtom,
  makeGroup,
  mathTokensToLatex,
  moveCursor,
  ROOT_ID,
  type CursorPos,
  type MathToken,
} from '@/lib/notepad/formula/math-tokens'
import { MathKeyboard, type MathKeyAction } from './math-keyboard'
import { MathWorkspaceContent } from './math-workspace-token'

interface MathEditorProps {
  tokens: MathToken[]
  onTokensChange: (tokens: MathToken[]) => void
  /** present when opened from the note editor — inserts the LaTeX into the note */
  onInsert?: (latex: string) => void
}

interface Snapshot {
  tokens: MathToken[]
  cursor: CursorPos
}

/**
 * The Math workspace: a chip-based formula canvas driven EXCLUSIVELY by the
 * on-screen math keyboard below it — the OS keyboard is never summoned
 * because there is no text input to focus. One pure reducer turns keyboard
 * actions into (tokens, cursor) transitions; undo/redo snapshot both.
 */
export function MathEditor({ tokens, onTokensChange, onInsert }: MathEditorProps) {
  const { toast } = useToast()
  const [cursor, setCursor] = useState<CursorPos>({ containerId: ROOT_ID, index: 0 })
  const [undoStack, setUndoStack] = useState<Snapshot[]>([])
  const [redoStack, setRedoStack] = useState<Snapshot[]>([])

  const latex = useMemo(() => mathTokensToLatex(tokens), [tokens])

  const pushUndo = (prevTokens: MathToken[], prevCursor: CursorPos) => {
    setUndoStack((s) => [...s.slice(-99), { tokens: prevTokens, cursor: prevCursor }])
    setRedoStack([])
  }

  /** apply one keyboard action to an explicit state — pure, reusable by `seq` */
  const applySingle = (
    action: MathKeyAction,
    t: MathToken[],
    c: CursorPos,
  ): { tokens: MathToken[]; cursor: CursorPos } | null => {
    switch (action.type) {
      case 'atom':
        return {
          tokens: insertToken(t, c, makeAtom(action.value, action.latex)),
          cursor: { containerId: c.containerId, index: c.index + 1 },
        }
      case 'structure': {
        const group = makeGroup(action.kind, action.prefills)
        const hasEmptyPart = group.parts.some((part) => part.length === 0)
        return {
          tokens: insertToken(t, c, group),
          // fresh structures capture the cursor into their first empty slot
          // (fully prefilled ones like x² drop the cursor right after instead)
          cursor: hasEmptyPart ? cursorInsideGroup(group.id, group.parts) : cursorAfterToken(c.containerId, c.index),
        }
      }
      case 'backspace': {
        const result = deleteBefore(t, c)
        return result ? { tokens: result.tokens, cursor: result.cursor } : null
      }
      case 'move':
        return { tokens: t, cursor: moveCursor(t, c, action.delta) }
      case 'enter':
        // "accept the line" — park the cursor at the end of the formula
        return { tokens: t, cursor: moveCursor(t, c, Number.MAX_SAFE_INTEGER) }
      case 'seq': {
        let state = { tokens: t, cursor: c }
        for (const sub of action.actions) {
          const next = applySingle(sub, state.tokens, state.cursor)
          if (next) state = next
        }
        return state
      }
    }
  }

  const handleKey = (action: MathKeyAction) => {
    const next = applySingle(action, tokens, cursor)
    if (!next) return
    pushUndo(tokens, cursor)
    onTokensChange(next.tokens)
    setCursor(next.cursor)
  }

  const undo = () => {
    const prev = undoStack[undoStack.length - 1]
    if (!prev) return
    setUndoStack((s) => s.slice(0, -1))
    setRedoStack((s) => [...s, { tokens, cursor }])
    onTokensChange(prev.tokens)
    setCursor(prev.cursor)
  }

  const redo = () => {
    const next = redoStack[redoStack.length - 1]
    if (!next) return
    setRedoStack((s) => s.slice(0, -1))
    setUndoStack((s) => [...s, { tokens, cursor }])
    onTokensChange(next.tokens)
    setCursor(next.cursor)
  }

  const clear = () => {
    if (!tokens.length) return
    pushUndo(tokens, cursor)
    onTokensChange([])
    setCursor({ containerId: ROOT_ID, index: 0 })
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
    // PC: two panes — workspace + preview LEFT, keyboard RIGHT (chemistry-tab
    // style), so the canvas never scrolls away and typing feels natural.
    // Mobile stays stacked with page scrolling.
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 lg:flex-row">
      {/* workspace + preview panel */}
      <div className="flex min-w-0 flex-col gap-3 lg:flex-1">
        {/* ---------- workspace (sticks to the top on narrower desktops) ---------- */}
        <div className="flex min-h-[160px] shrink-0 flex-col overflow-hidden rounded-xl border bg-card lg:sticky lg:top-0 lg:z-10 lg:flex-1">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
            <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <PencilLine className="h-3.5 w-3.5 shrink-0" />
              Workspace
              <span className="hidden xl:inline">— click a slot to place the cursor, then tap keys on the math keyboard</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
              disabled={!tokens.length}
              onClick={clear}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
          </div>

          <div
            className="flex flex-1 flex-wrap content-start items-center gap-1.5 overflow-y-auto p-3"
            onClick={() => setCursor({ containerId: ROOT_ID, index: tokens.length })}
          >
            <MathWorkspaceContent tokens={tokens} cursor={cursor} onSetCursor={setCursor} />
            {!tokens.length && (
              <p className="w-full pt-6 text-center text-xs text-muted-foreground/70">
                Build formulas with the math keyboard — fractions, roots, powers, integrals and
                absolute values hold their own slots. No typing needed: the OS keyboard never appears.
              </p>
            )}
          </div>
        </div>

        {/* ---------- generated LaTeX — rendered preview + raw string ---------- */}
        <div className="shrink-0 rounded-xl border bg-card p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">LaTeX — generated automatically</span>
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
                Your formula appears here as you build it
              </span>
            )}
          </div>
          <code className="mt-2 block max-h-16 overflow-auto rounded bg-muted/60 px-2 py-1.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {latex || '\u00A0'}
          </code>
        </div>
      </div>

      {/* ---------- the on-screen math keyboard (only input method) ---------- */}
      <MathKeyboard
        onKey={handleKey}
        onUndo={undo}
        onRedo={redo}
        onCopy={copyLatex}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
      />
    </div>
  )
}
