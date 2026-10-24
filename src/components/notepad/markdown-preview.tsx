'use client'

import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import katex from 'katex'
import { cn } from '@/lib/utils'

// KaTeX CSS
import 'katex/dist/katex.min.css'
// Registers the \ce{} (chemistry) and \pu{} (units) macros inside KaTeX
import 'katex/contrib/mhchem'

/**
 * Rewrite single-line `$$…$$` blocks into multi-line form, so a full line
 * wrapped in $$ renders as a centered display equation (Notion-style),
 * no matter how the student typed it.
 */
function normalizeMathBlocks(src: string): string {
  return src.replace(
    /(^|\n)[ \t]*\$\$([^\n$]+)\$\$[ \t]*(?=\n|$)/g,
    (_m, nl: string, inner: string) => `${nl}$$\n${inner.trim()}\n$$`,
  )
}

/** Renders a full markdown document with GFM tables, $math$ and \ce{} chemistry */
export function MarkdownPreview({ content, className }: { content: string; className?: string }) {
  const normalized = useMemo(() => normalizeMathBlocks(content), [content])
  return (
    <div className={cn('markdown-body', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [rehypeKatex, { strict: false, throwOnError: false, errorColor: '#e11d48' }],
        ]}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  )
}

/** Renders a single line of inline markdown (bold, links, `code`, $math$) without block margins */
export function InlineMarkdown({ text }: { text: string }) {
  return (
    <span className="block-inline">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [rehypeKatex, { strict: false, throwOnError: false, errorColor: '#e11d48' }],
        ]}
        components={{ p: ({ children }) => <>{children}</> }}
      >
        {text}
      </ReactMarkdown>
    </span>
  )
}

/** Renders a single LaTeX/chemistry string, e.g. `\ce{2H2 + O2 -> 2H2O}` */
export function Latex({ tex, display = false, className }: { tex: string; display?: boolean; className?: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        displayMode: display,
        throwOnError: false,
        strict: false,
        errorColor: '#e11d48',
      })
    } catch {
      return tex
    }
  }, [tex, display])
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
