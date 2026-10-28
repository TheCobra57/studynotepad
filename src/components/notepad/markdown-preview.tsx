'use client'

import { useMemo, type ReactNode } from 'react'
import ReactMarkdown, { defaultUrlTransform, type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import katex from 'katex'
import type { PluggableList } from 'unified'
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

// ---------------------------------------------------------------------------
// Table of contents ([TOC]) — headings get anchor ids and the marker line
// renders as a nested, hyperlinked list of every H1–H3 in the document.
// ---------------------------------------------------------------------------

export interface TocEntry {
  level: 1 | 2 | 3
  /** plain heading text (markdown/LaTeX stripped) */
  text: string
  /** anchor id assigned to the heading element */
  slug: string
}

/** minimal hast node shape (we only walk elements, roots and text) */
interface HastNode {
  type: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
  value?: string
}

/** concatenated text content of a hast subtree */
function hastText(node: HastNode): string {
  if (node.type === 'text') return node.value ?? ''
  return (node.children ?? []).map(hastText).join('')
}

/** GitHub-style heading slug: lowercase, keep letters/numbers/hyphens, spaces → '-' */
function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, '')
    .trim()
    .replace(/\s+/g, '-')
}

/**
 * Rehype plugin: assigns unique anchor ids to every h1–h3 and records the
 * entries into `state` so the `[TOC]` marker can link to them. Must run
 * BEFORE rehype-katex (math inside headings should slugify as raw LaTeX).
 * Idempotent: re-running resets the collected entries.
 */
function rehypeTocPlugin(state: { entries: TocEntry[] }) {
  const transformer = (tree: HastNode) => {
    state.entries.length = 0
    const seen = new Map<string, number>()
    const visit = (node: HastNode) => {
      if (node.type === 'element') {
        const level: 0 | 1 | 2 | 3 =
          node.tagName === 'h1' ? 1 : node.tagName === 'h2' ? 2 : node.tagName === 'h3' ? 3 : 0
        if (level) {
          const text = hastText(node).replace(/\s+/g, ' ').trim()
          let slug = slugifyHeading(text) || 'section'
          const n = (seen.get(slug) ?? 0) + 1
          seen.set(slug, n)
          if (n > 1) slug = `${slug}-${n - 1}`
          node.properties = { ...(node.properties ?? {}), id: slug }
          state.entries.push({ level, text: text || 'Untitled heading', slug })
        }
      }
      for (const child of node.children ?? []) visit(child)
    }
    visit(tree)
  }
  return () => transformer
}

/** concatenated text of React children (used to spot the `[TOC]` paragraph) */
function reactText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(reactText).join('')
  if (typeof node === 'object' && 'props' in node) {
    const el = node as unknown as { props?: { children?: ReactNode } }
    return reactText(el.props?.children)
  }
  return ''
}

const RE_TOC_MARKER = /^\[TOC\]$/i

/** nested, hyperlinked table of contents rendered for a `[TOC]` line */
function TocNav({ entries }: { entries: TocEntry[] }) {
  if (!entries.length) {
    return (
      <div className="toc-block toc-empty">No headings yet — add H1/H2/H3 headings and they will appear here automatically.</div>
    )
  }
  return (
    <nav className="toc-block" aria-label="Table of contents">
      <p className="toc-title">Contents</p>
      <ul>
        {entries.map((e) => (
          <li key={e.slug} className={`toc-l${e.level}`}>
            <a href={`#${e.slug}`}>{e.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * Renders a full markdown document with GFM tables, $math$ and \ce{} chemistry.
 * `prepend` renders before the markdown content (used for the print title block)
 * and `style` is applied to the wrapper (used for the print base font size in pt).
 *
 * Images written as `![alt](src "75")` use the quoted title as a width
 * percentage — the same convention the block editor serialises, which is what
 * keeps the editor, print preview and printed page identical.
 *
 * A `[TOC]` line renders as an auto-generated, hyperlinked table of contents
 * built from every H1–H3 heading in the document.
 */
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

  // One ToC state per content instance: the rehype plugin fills it while the
  // markdown is processed (synchronously, before any component renders), and
  // the `[TOC]` paragraph component then reads it to render the links.
  const { rehypePlugins, components } = useMemo(() => {
    const tocState = { entries: [] as TocEntry[] }
    const markdownComponents: Components = {
      img: ({ src, alt, title }) => {
        const m = title?.match(/^(\d{1,3})$/)
        const width = m ? `${Math.min(100, Math.max(10, Number(m[1])))}%` : undefined
        return (
          <img
            src={typeof src === 'string' ? src : undefined}
            alt={alt ?? ''}
            style={width ? { width } : undefined}
            className="md-sized-img"
          />
        )
      },
      p: ({ children }) =>
        RE_TOC_MARKER.test(reactText(children).trim()) ? (
          <TocNav entries={tocState.entries} />
        ) : (
          <p>{children}</p>
        ),
    }
    return {
      rehypePlugins: [
        rehypeTocPlugin(tocState),
        [rehypeKatex, { strict: false, throwOnError: false, errorColor: '#e11d48' }],
      ] as PluggableList,
      components: markdownComponents,
    }
  }, [normalized])

  return (
    <div className={cn('markdown-body', className)} style={style}>
      {prepend}
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={rehypePlugins}
        components={components}
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
