import type { BlockType } from '@/lib/notepad/blocks'

export type CommandIcon =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bullet'
  | 'numbered'
  | 'todo'
  | 'quote'
  | 'divider'
  | 'table'
  | 'code'
  | 'math'
  | 'chem'
  | 'image'
  | 'clipboard'
  | 'whiteboard'
  | 'toc'

export type ImageAction = 'upload' | 'clipboard' | 'whiteboard'

export interface SlashCommand {
  id: string
  label: string
  hint?: string
  /** space-lowercased keywords used for filtering while typing after "/" */
  keywords: string
  icon: CommandIcon
  /** turn the (empty) current block into this type */
  blockType?: BlockType
  /** initial source text for the new/transformed block */
  blockText?: string
  /** caret position inside blockText (from its end: negative), applied on focus */
  caretFromEnd?: number
  /** insert this string at the caret of the current text block instead */
  inline?: string
  /** rendered LaTeX preview (for template items) */
  preview?: string
  /** image flow — handled by the editor pane (file picker / clipboard / whiteboard) */
  imageAction?: ImageAction
}

/** Notion-style "/" commands for the block editor */
export const BLOCK_COMMANDS: SlashCommand[] = [
  {
    id: 'h1',
    label: 'Heading 1',
    hint: 'Big section title',
    keywords: 'h1 title heading big',
    icon: 'h1',
    blockType: 'h1',
  },
  {
    id: 'h2',
    label: 'Heading 2',
    hint: 'Medium section title',
    keywords: 'h2 subtitle heading',
    icon: 'h2',
    blockType: 'h2',
  },
  {
    id: 'h3',
    label: 'Heading 3',
    hint: 'Small section title',
    keywords: 'h3 heading small',
    icon: 'h3',
    blockType: 'h3',
  },
  {
    id: 'toc',
    label: 'Table of Contents',
    hint: 'Auto list of your H1–H3 headings, with links',
    keywords: 'toc table of contents contents index outline headings links navigation',
    icon: 'toc',
    blockType: 'toc',
  },
  {
    id: 'bullet',
    label: 'Bulleted list',
    hint: 'Simple bullet point',
    keywords: 'bullet list unordered ul point',
    icon: 'bullet',
    blockType: 'bullet',
  },
  {
    id: 'numbered',
    label: 'Numbered list',
    hint: 'Ordered step',
    keywords: 'numbered list ordered ol step',
    icon: 'numbered',
    blockType: 'numbered',
  },
  {
    id: 'todo',
    label: 'To-do list',
    hint: 'Track tasks with checkboxes',
    keywords: 'todo task check checkbox done',
    icon: 'todo',
    blockType: 'todo',
  },
  {
    id: 'quote',
    label: 'Quote',
    hint: 'Callout or quotation',
    keywords: 'quote blockquote callout remember',
    icon: 'quote',
    blockType: 'quote',
  },
  {
    id: 'divider',
    label: 'Divider',
    hint: 'Visual separator line',
    keywords: 'divider line hr rule separator',
    icon: 'divider',
    blockType: 'divider',
  },
  {
    id: 'table',
    label: 'Table',
    hint: 'Comparison table (edit raw, preview live)',
    keywords: 'table grid rows columns comparison',
    icon: 'table',
    blockType: 'table',
    blockText: '| Term | Meaning |\n|---|---|\n|  |  |',
    caretFromEnd: -3,
  },
  {
    id: 'code',
    label: 'Code block',
    hint: 'Monospaced code',
    keywords: 'code snippet pre mono program',
    icon: 'code',
    blockType: 'code',
  },
  {
    id: 'math',
    label: 'Equation',
    hint: 'Centered LaTeX — click it any time to edit',
    keywords: 'math equation latex formula block sum integral $$ display',
    icon: 'math',
    blockType: 'math',
  },
  {
    id: 'chem',
    label: 'Chemical equation',
    hint: 'Reaction with \\ce{} — renders instantly',
    keywords: 'chem chemistry chemical equation reaction ce formula molecule balanced',
    icon: 'chem',
    blockType: 'math',
    blockText: '\\ce{}',
    caretFromEnd: -1,
  },
  {
    id: 'image',
    label: 'Image',
    hint: 'Upload a picture from your device',
    keywords: 'image picture photo upload file img png jpg drawing diagram',
    icon: 'image',
    imageAction: 'upload',
  },
  {
    id: 'image-clipboard',
    label: 'Image from clipboard',
    hint: 'Paste the image you copied (or just Ctrl+V)',
    keywords: 'image clipboard paste copy screenshot snip',
    icon: 'clipboard',
    imageAction: 'clipboard',
  },
  {
    id: 'whiteboard',
    label: 'Whiteboard sketch',
    hint: 'Draw with brushes and insert it into the note',
    keywords: 'whiteboard draw sketch paint canvas pen brush annotate diagram',
    icon: 'whiteboard',
    imageAction: 'whiteboard',
  },
  {
    id: 'math-inline',
    label: 'Inline math',
    hint: 'LaTeX inside a sentence — $…$',
    keywords: 'math inline latex $ formula small',
    icon: 'math',
    inline: '$x^2 + y^2$',
  },
  {
    id: 'chem-inline',
    label: 'Inline chemical formula',
    hint: 'Small formula inside text',
    keywords: 'chem chemistry inline formula molecule h2o water',
    icon: 'chem',
    inline: '$\\ce{H2SO4}$',
  },
]

export interface FormulaTemplate {
  id: string
  category: 'math' | 'chem'
  label: string
  /** LaTeX source that gets inserted */
  insert: string
  /** LaTeX source shown as a rendered preview */
  preview: string
}

/** Ready-made formulas for the toolbar dropdown (also appear in the / menu) */
export const FORMULA_TEMPLATES: FormulaTemplate[] = [
  {
    id: 'chem-balance',
    category: 'chem',
    label: 'Balanced equation',
    insert: '$$\n\\ce{2H2 + O2 -> 2H2O}\n$$\n',
    preview: '\\ce{2H2 + O2 -> 2H2O}',
  },
  {
    id: 'chem-equilibrium',
    category: 'chem',
    label: 'Equilibrium reaction',
    insert: '$$\n\\ce{N2(g) + 3H2(g) <=> 2NH3(g)}\n$$\n',
    preview: '\\ce{N2(g) + 3H2(g) <=> 2NH3(g)}',
  },
  {
    id: 'chem-conditions',
    category: 'chem',
    label: 'Conditions above arrow',
    insert: '$$\n\\ce{CaCO3 ->[\\Delta\\ heat] CaO + CO2 ^}\n$$\n',
    preview: '\\ce{CaCO3 ->[\\Delta\\ heat] CaO + CO2 ^}',
  },
  {
    id: 'chem-ionic',
    category: 'chem',
    label: 'Ionic equation (charges)',
    insert: '$$\n\\ce{Cu^{2+} + 2e- -> Cu(s)}\n$$\n',
    preview: '\\ce{Cu^{2+} + 2e- -> Cu(s)}',
  },
  {
    id: 'chem-kc',
    category: 'chem',
    label: 'Equilibrium constant Kc',
    insert: '$$\nK_c = \\frac{[\\ce{C}]^c[\\ce{D}]^d}{[\\ce{A}]^a[\\ce{B}]^b}\n$$\n',
    preview: 'K_c = \\frac{[\\ce{C}]^c[\\ce{D}]^d}{[\\ce{A}]^a[\\ce{B}]^b}',
  },
  {
    id: 'chem-ph',
    category: 'chem',
    label: 'pH of a solution',
    insert: '$$\n\\text{pH} = -\\log_{10}[\\ce{H+}]\n$$\n',
    preview: '\\text{pH} = -\\log_{10}[\\ce{H+}]',
  },
  {
    id: 'math-frac',
    category: 'math',
    label: 'Fraction',
    insert: '$\\frac{a}{b}$',
    preview: '\\frac{a}{b}',
  },
  {
    id: 'math-sqrt',
    category: 'math',
    label: 'Square root',
    insert: '$\\sqrt{x}$',
    preview: '\\sqrt{x}',
  },
  {
    id: 'math-pow',
    category: 'math',
    label: 'Power / subscript',
    insert: '$x^{2} + y_{1}$',
    preview: 'x^{2} + y_{1}',
  },
  {
    id: 'math-sum',
    category: 'math',
    label: 'Summation',
    insert: '$$\n\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\n$$\n',
    preview: '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}',
  },
  {
    id: 'math-int',
    category: 'math',
    label: 'Integral',
    insert: '$$\n\\int_{a}^{b} f(x)\\,dx\n$$\n',
    preview: '\\int_{a}^{b} f(x)\\,dx',
  },
  {
    id: 'math-quadratic',
    category: 'math',
    label: 'Quadratic formula',
    insert: '$$\nx = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\n$$\n',
    preview: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
  },
  {
    id: 'math-greek',
    category: 'math',
    label: 'Greek letters',
    insert: '$\\alpha, \\beta, \\gamma, \\Delta, \\theta, \\lambda, \\pi, \\omega$',
    preview: '\\alpha, \\beta, \\gamma, \\Delta, \\theta, \\lambda, \\pi, \\omega',
  },
  {
    id: 'math-approx',
    category: 'math',
    label: '≈ and ± symbols',
    insert: '$\\approx \\pm$',
    preview: '\\approx \\; \\pm',
  },
]

/** Strip $$…$$ / $…$ wrappers from a template insert → { tex, isBlock } */
export function unwrapTemplate(insert: string): { tex: string; isBlock: boolean } {
  const s = insert.trim()
  if (s.startsWith('$$')) {
    return { tex: s.replace(/^\$\$/, '').replace(/\$\$$/, '').trim(), isBlock: true }
  }
  if (s.startsWith('$') && s.endsWith('$') && s.length > 1) {
    return { tex: s.slice(1, -1), isBlock: false }
  }
  return { tex: s, isBlock: false }
}

/** Formula templates expressed as / commands with live previews */
export const TEMPLATE_COMMANDS: SlashCommand[] = FORMULA_TEMPLATES.map((t) => {
  const { tex, isBlock } = unwrapTemplate(t.insert)
  return {
    id: `tpl-${t.id}`,
    label: t.label,
    hint: t.category === 'chem' ? 'Chemistry template' : 'Math template',
    keywords: `${t.category} template formula preset ${t.label.toLowerCase()}`,
    icon: (t.category === 'chem' ? 'chem' : 'math') as CommandIcon,
    preview: t.preview,
    ...(isBlock
      ? { blockType: 'math' as BlockType, blockText: tex }
      : { inline: `$${tex}$` }),
  }
})

export const ALL_COMMANDS: SlashCommand[] = [...BLOCK_COMMANDS, ...TEMPLATE_COMMANDS]

/** Filter commands for a typed / query */
export function filterCommands(query: string): SlashCommand[] {
  const q = query.trim().toLowerCase()
  if (!q) return ALL_COMMANDS
  return ALL_COMMANDS.filter(
    (c) => c.label.toLowerCase().includes(q) || c.keywords.includes(q),
  )
}
