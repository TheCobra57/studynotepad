'use client'

import { useMemo } from 'react'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
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

/**
 * react-markdown sanitises URLs by default and strips data: URLs — but our
 * images are stored as data: URLs. Allow images only (safe: no script
 * execution possible from data:image/*), everything else keeps the default.
 */
function urlTransform(url: string): string {
  if (url.startsWith('data:image/')) return url
  return defaultUrlTransform(url)
}

/**
 * Renders a full markdown document with GFM tables, $math$ and \ce{} chemistry.
 * `prepend` renders before the markdown content (used for the print title block)
 * and `style` is applied to the wrapper (used for the print base font size in pt).
 *
 * Images written as `![alt](src "75")` use the quoted title as a width
 * percentage — the same convention the block editor serialises, which is what
 * keeps the editor, print preview and printed page identical.
 */
const markdownComponents = {
  img: ({ src, alt, title }: { src?: string; alt?: string; title?: string }) => {
    const m = title?.match(/^(\d{1,3})$/)
    const width = m ? `${Math.min(100, Math.max(10, Number(m[1])))}%` : undefined
    return (
      <img
        src={src}
        alt={alt ?? ''}
        style={width ? { width } : undefined}
        className="md-sized-img"
      />
    )
  },
}

export function MarkdownPreview({
  content,
  className,
  prepend,
  style,
}: {
  content: string
  className?: string
  prepend?: React.ReactNode
  style?: React.CSSProperties
}) {
  const normalized = useMemo(() => normalizeMathBlocks(content), [content])
  return (
    <div className={cn('markdown-body', className)} style={style}>
      {prepend}
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [rehypeKatex, { strict: false, throwOnError: false, errorColor: '#e11d48' }],
        ]}
        components={markdownComponents}
        urlTransform={urlTransform}
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
