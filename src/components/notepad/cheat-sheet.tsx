'use client'

import { FileText, FlaskConical, Sigma } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Latex } from './markdown-preview'

interface CheatSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CheatRow {
  /** what you type (shown as code) */
  syntax: string
  /** what it renders as */
  latex?: string
  /** plain text description */
  note?: string
}

const MATH_ROWS: CheatRow[] = [
  { syntax: '$x^2 + y^2$', latex: 'x^2 + y^2', note: 'Inline math — wrap LaTeX in single $' },
  { syntax: '$$…$$', latex: 'v = u + at', note: 'Centered block — wrap in double $$' },
  { syntax: 'x^{n}, x_{1}', latex: 'x^{n} + x_{1}', note: 'Powers and subscripts' },
  { syntax: '$\\frac{a}{b}$', latex: '\\frac{a}{b}', note: 'Fraction' },
  { syntax: '$\\sqrt{x}$', latex: '\\sqrt{x}', note: 'Square root' },
  { syntax: '$\\pm \\; \\approx \\; \\neq \\; \\times$', latex: '\\pm \\;\\; \\approx \\;\\; \\neq \\;\\; \\times', note: 'Common symbols' },
  { syntax: '$\\alpha \\beta \\gamma \\Delta \\pi \\theta \\lambda$', latex: '\\alpha \\; \\beta \\; \\gamma \\; \\Delta \\; \\pi \\; \\theta \\; \\lambda', note: 'Greek letters' },
  { syntax: '$\\sum_{i=1}^{n} i$', latex: '\\sum_{i=1}^{n} i', note: 'Summation' },
  { syntax: '$\\int_{a}^{b} f(x)\\,dx$', latex: '\\int_{a}^{b} f(x)\\,dx', note: 'Integral' },
  { syntax: '$\\log_{10} x \\; \\ln x$', latex: '\\log_{10} x \\;\\; \\ln x', note: 'Logarithms' },
  { syntax: '$\\text{pH}$', latex: '\\text{pH}', note: 'Plain text inside math' },
]

const CHEM_ROWS: CheatRow[] = [
  { syntax: '$\\ce{H2O}$', latex: '\\ce{H2O}', note: 'Chemical formula — numbers go after the element' },
  { syntax: '$$\\ce{2H2 + O2 -> 2H2O}$$', latex: '\\ce{2H2 + O2 -> 2H2O}', note: 'Balanced equation with ->' },
  { syntax: '$\\ce{N2 + 3H2 <=> 2NH3}$', latex: '\\ce{N2 + 3H2 <=> 2NH3}', note: 'Equilibrium with <=>' },
  { syntax: '$\\ce{Cu^{2+} + 2e- -> Cu}$', latex: '\\ce{Cu^{2+} + 2e- -> Cu}', note: 'Ionic charges with ^{…}' },
  { syntax: '$\\ce{Na+ + Cl-}$', latex: '\\ce{Na+ + Cl-}', note: 'Simple charges' },
  { syntax: '$\\ce{H2O(l)} \\; \\ce{CO2(g)}$', latex: '\\ce{H2O(l)} \\;\\; \\ce{CO2(g)}', note: 'States: (s) (l) (g) (aq)' },
  { syntax: '$\\ce{Zn + 2HCl -> ZnCl2 + H2 ^}$', latex: '\\ce{Zn + 2HCl -> ZnCl2 + H2 ^}', note: '^ = gas given off, v = precipitate' },
  { syntax: '$\\ce{CaCO3 ->[\\Delta] CaO + CO2}$', latex: '\\ce{CaCO3 ->[\\Delta] CaO + CO2}', note: 'Conditions above the arrow' },
  { syntax: '$\\ce{C6H12O6}$', latex: '\\ce{C6H12O6}', note: 'Organic molecules' },
  { syntax: '$\\pu{9.8 m/s2}$', latex: '\\pu{9.8 m/s2}', note: 'Physical units' },
]

const MD_ROWS: CheatRow[] = [
  { syntax: '# Title / ## Subtitle', note: 'Headings (also # ### levels)' },
  { syntax: '**bold** and *italic*', note: 'Emphasis' },
  { syntax: '- item / 1. item', note: 'Bullet and numbered lists' },
  { syntax: '- [ ] revise topic', note: 'Checkbox list' },
  { syntax: '> quoted callout', note: 'Blockquote' },
  { syntax: '| A | B |\n|---|---|\n| 1 | 2 |', note: 'Table' },
  { syntax: '---', note: 'Horizontal divider' },
  { syntax: '`code`', note: 'Inline code' },
  { syntax: 'Type / in the editor', note: 'Quick-insert menu (Notion style)' },
]

export function CheatSheet({ open, onOpenChange }: CheatSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Syntax cheat sheet</DialogTitle>
          <DialogDescription>
            Everything you can write in a note — markdown, LaTeX math and chemistry equations.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="chem">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chem" className="gap-1.5">
              <FlaskConical className="h-3.5 w-3.5" /> Chemistry
            </TabsTrigger>
            <TabsTrigger value="math" className="gap-1.5">
              <Sigma className="h-3.5 w-3.5" /> Math
            </TabsTrigger>
            <TabsTrigger value="md" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Markdown
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chem" className="mt-3">
            <p className="mb-3 text-xs text-muted-foreground">
              Wrap chemistry in <code className="rounded bg-muted px-1 py-0.5">{'\\ce{…}'}</code>{' '}
              inside <code className="rounded bg-muted px-1 py-0.5">$…$</code>.
            </p>
            <div className="space-y-2">
              {CHEM_ROWS.map((row) => (
                <CheatRowView key={row.syntax} row={row} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="math" className="mt-3">
            <p className="mb-3 text-xs text-muted-foreground">
              Wrap LaTeX in <code className="rounded bg-muted px-1 py-0.5">$…$</code> (inline) or{' '}
              <code className="rounded bg-muted px-1 py-0.5">{'$$…$$'}</code> (centered block).
            </p>
            <div className="space-y-2">
              {MATH_ROWS.map((row) => (
                <CheatRowView key={row.syntax} row={row} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="md" className="mt-3">
            <div className="space-y-2">
              {MD_ROWS.map((row) => (
                <CheatRowView key={row.syntax} row={row} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function CheatRowView({ row }: { row: CheatRow }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border p-3 sm:flex-row sm:items-center sm:gap-3">
      <div className="min-w-0 flex-1">
        <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs text-foreground">
          {row.syntax}
        </pre>
        {row.note && <p className="mt-1 text-xs text-muted-foreground">{row.note}</p>}
      </div>
      {row.latex && (
        <div className="shrink-0 rounded-md bg-muted/60 px-3 py-2 text-center">
          <Latex tex={row.latex} />
        </div>
      )}
    </div>
  )
}
