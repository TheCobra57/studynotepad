'use client'

import { useState } from 'react'
import { FlaskConical, Sigma } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { FormulaToken } from '@/lib/notepad/formula/tokens'
import type { MathToken } from '@/lib/notepad/formula/math-tokens'
import { ChemistryEditor } from './chemistry-editor'
import { MathEditor } from './math-editor'

interface FormulaMakerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** present when opened from the note editor — inserts the generated LaTeX */
  onInsert?: (latex: string) => void
}

/**
 * Full-screen formula maker. The Chemistry tab is a visual, MS-Word-like
 * equation builder; the Math tab is driven entirely by a Desmos-style
 * on-screen keyboard (the OS keyboard is never summoned).
 *
 * Token state lives HERE (outside the Radix portal) so a half-built formula
 * survives the dialog being closed and reopened.
 */
export function FormulaMakerDialog({ open, onOpenChange, onInsert }: FormulaMakerDialogProps) {
  const [tokens, setTokens] = useState<FormulaToken[]>([])
  const [mathTokens, setMathTokens] = useState<MathToken[]>([])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* overrides turn the centered card into a true full-screen workspace */}
      <DialogContent
        className="inset-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:max-w-none"
        aria-describedby={undefined}
      >
        <Tabs defaultValue="chemistry" className="min-h-0 flex-1 gap-0">
          <div className="flex shrink-0 items-center gap-3 border-b px-4 py-2.5 pr-14">
            {/* header icon hidden on phones — every pixel goes to the title and tabs */}
            <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 sm:flex dark:bg-amber-950 dark:text-amber-300">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-sm font-bold leading-tight">Formula maker</DialogTitle>
              <DialogDescription className="hidden text-[11px] leading-tight sm:block">
                Build the equation visually — the LaTeX types itself.
              </DialogDescription>
            </div>
            <TabsList className="ml-auto shrink-0">
              <TabsTrigger value="chemistry" className="gap-1.5 px-3">
                <FlaskConical className="h-3.5 w-3.5" />
                Chemistry
              </TabsTrigger>
              <TabsTrigger value="math" className="gap-1.5 px-3">
                <Sigma className="h-3.5 w-3.5" />
                Math
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chemistry" className="mt-0 flex min-h-0 flex-1 flex-col">
            <ChemistryEditor tokens={tokens} onTokensChange={setTokens} onInsert={onInsert} />
          </TabsContent>

          <TabsContent value="math" className="mt-0 flex min-h-0 flex-1 flex-col">
            <MathEditor tokens={mathTokens} onTokensChange={setMathTokens} onInsert={onInsert} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
