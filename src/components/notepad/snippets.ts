export type SnippetCategory = 'format' | 'math' | 'chem'

export interface SlashItem {
  id: string
  label: string
  hint?: string
  keywords: string
  /** text inserted into the note */
  insert: string
  /** caret offset inside `insert` where the cursor should land (from end: negative) */
  caretFromEnd?: number
}

/** Items offered by the Notion-style "/" quick-insert menu in the editor */
export const SLASH_ITEMS: SlashItem[] = [
  {
    id: 'h1',
    label: 'Heading 1',
    hint: 'Big section title',
    keywords: 'h1 title heading',
    insert: '# ',
  },
  {
    id: 'h2',
    label: 'Heading 2',
    hint: 'Medium section title',
    keywords: 'h2 subtitle heading',
    insert: '## ',
  },
  {
    id: 'h3',
    label: 'Heading 3',
    hint: 'Small section title',
    keywords: 'h3 heading',
    insert: '### ',
  },
  {
    id: 'bullet',
    label: 'Bulleted list',
    hint: 'Simple bullet list',
    keywords: 'bullet list unordered ul point',
    insert: '- First point\n- Second point',
    caretFromEnd: -13,
  },
  {
    id: 'numbered',
    label: 'Numbered list',
    hint: 'Ordered list',
    keywords: 'numbered list ordered ol',
    insert: '1. First item\n2. Second item',
    caretFromEnd: -12,
  },
  {
    id: 'todo',
    label: 'To-do checklist',
    hint: 'Track tasks with checkboxes',
    keywords: 'todo task check checkbox',
    insert: '- [ ] Revise this topic\n- [ ] Solve practice questions',
    caretFromEnd: -30,
  },
  {
    id: 'quote',
    label: 'Quote',
    hint: 'Callout / quotation',
    keywords: 'quote blockquote callout',
    insert: '> Remember this!',
    caretFromEnd: -1,
  },
  {
    id: 'divider',
    label: 'Divider',
    hint: 'Horizontal line',
    keywords: 'divider line hr rule separator',
    insert: '\n---\n',
  },
  {
    id: 'table',
    label: 'Table',
    hint: 'Comparison table',
    keywords: 'table grid rows columns',
    insert: '| Term | Meaning |\n|---|---|\n|  |  |',
    caretFromEnd: -3,
  },
  {
    id: 'code',
    label: 'Code block',
    hint: 'Monospaced code',
    keywords: 'code snippet pre',
    insert: '```\n\n```',
    caretFromEnd: -4,
  },
  {
    id: 'math-block',
    label: 'Equation (math)',
    hint: 'Centered LaTeX block — type $$',
    keywords: 'math equation latex formula sum integral $$ block',
    insert: '$$\nE = mc^2\n$$',
    caretFromEnd: -4,
  },
  {
    id: 'math-inline',
    label: 'Inline math',
    hint: 'LaTeX inside text — type $',
    keywords: 'math inline latex $',
    insert: '$x^2 + y^2$',
    caretFromEnd: -1,
  },
  {
    id: 'chem-block',
    label: 'Chemical equation',
    hint: 'Balanced reaction with \\ce{}',
    keywords: 'chem chemistry chemical equation reaction ce formula molecule',
    insert: '$$\n\\ce{2H2 + O2 -> 2H2O}\n$$',
    caretFromEnd: -4,
  },
  {
    id: 'chem-inline',
    label: 'Inline chemical formula',
    hint: 'Small formula inside text',
    keywords: 'chem chemistry inline formula molecule h2o',
    insert: '$\\ce{H2SO4}$',
    caretFromEnd: -1,
  },
]

export interface FormulaTemplate {
  id: string
  category: 'math' | 'chem'
  label: string
  /** LaTeX source that gets inserted */
  insert: string
  /** LaTeX source shown as a rendered preview (often the same minus block markers) */
  preview: string
}

/** Ready-made formulas for the "Formula" toolbar dropdown */
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
