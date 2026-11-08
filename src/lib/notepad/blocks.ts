/**
 * Block model for the WYSIWYG (Notion-style) editor.
 *
 * A note's markdown source is parsed into a flat list of blocks. Every block
 * renders as rich content (headings, lists, rendered equations…). Clicking a
 * block turns it into an in-place editor — the raw markdown/LaTeX is only
 * visible for the single block being edited, exactly like Notion.
 */

export type BlockType =
  | 'p'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bullet'
  | 'numbered'
  | 'todo'
  | 'quote'
  | 'code'
  | 'divider'
  | 'math'
  | 'table'
  | 'image'
  | 'toc'

export interface Block {
  id: string
  type: BlockType
  /** raw source of the block (markdown body without the type prefix, LaTeX for math, fenced content for code). For images this is the alt text. */
  text: string
  /** todo blocks only */
  checked?: boolean
  /** code blocks only */
  lang?: string
  /** image blocks only — data URL (or remote URL from imported markdown) */
  src?: string
  /** image blocks only — display width as a % of the content column (10–100) */
  width?: number
}

export function newBlockId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createBlock(
  type: BlockType,
  text = '',
  opts?: { checked?: boolean; lang?: string; src?: string; width?: number },
): Block {
  const block: Block = { id: newBlockId(), type, text }
  if (type === 'todo') block.checked = opts?.checked ?? false
  if (type === 'code') block.lang = opts?.lang ?? ''
  if (type === 'image') {
    block.src = opts?.src ?? ''
    block.width = opts?.width ?? 100
  }
  return block
}

/** blocks whose text is edited as a plain (single-logical) markdown line */
export function isTextual(type: BlockType): boolean {
  return (
    type === 'p' ||
    type === 'h1' ||
    type === 'h2' ||
    type === 'h3' ||
    type === 'bullet' ||
    type === 'numbered' ||
    type === 'todo' ||
    type === 'quote'
  )
}

/** blocks that can absorb text when merging with Backspace */
export function isMergeable(type: BlockType): boolean {
  return isTextual(type)
}

/** true when a math block holds chemistry (`\ce{}` / `\pu{}`) */
export function isChemBlock(text: string): boolean {
  return /\\(ce|pu)\s*\{/.test(text)
}

/** a complete, renderable inline `$…$` span inside a block's raw text */
export interface InlineMathSpan {
  /** index of the opening `$` */
  start: number
  /** index just after the closing `$` */
  end: number
  /** LaTeX between the dollars */
  tex: string
}

/**
 * Find complete inline-math spans (`$…$`) in a block's raw text.
 *
 * Mirrors what remark-math accepts so the editor's live chips and the
 * rendered preview agree: the content must be non-empty, may not start or
 * end with a space, cannot cross a line break, `\$` escapes are ignored and
 * dollars adjacent to `$$` (display math) never count.
 */
export function findInlineMathSpans(text: string): InlineMathSpan[] {
  const spans: InlineMathSpan[] = []
  if (!text.includes('$')) return spans
  const re = /\$([^$\n]+?)\$/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const start = m.index
    const end = start + m[0].length
    const inner = m[1]
    if (!inner.trim()) continue // "$  $" — nothing to render
    if (/^\s|\s$/.test(inner)) continue // remark-math rejects boundary spaces
    if (start > 0 && (text[start - 1] === '\\' || text[start - 1] === '$')) continue
    if (end < text.length && text[end] === '$') continue
    spans.push({ start, end, tex: inner })
  }
  return spans
}

/**
 * Find the open (unclosed) inline-math span: the last `$` that starts a math
 * segment and has no plausible closing `$` after it — i.e. the user typed an
 * opening `$` and is still writing the LaTeX.
 *
 * Returns the span from that `$` to the end of the text (with `tex` holding
 * the raw LaTeX typed so far), or null when no unterminated segment exists.
 * Dollars that merely failed span validation (e.g. "$5 and $10" currency
 * text, where a rejected closer follows the opener) count as "closed
 * ambiguously" and produce no decoration at all.
 */
export function findOpenMathSpan(text: string): InlineMathSpan | null {
  if (!text.includes('$')) return null
  const closed = findInlineMathSpans(text)
  // last `$` that could open a segment
  for (let p = text.length - 1; p >= 0; p--) {
    if (text[p] !== '$') continue
    if (p > 0 && (text[p - 1] === '\\' || text[p - 1] === '$')) continue
    if (p + 1 < text.length && text[p + 1] === '$') continue
    // this dollar already closes a validated span — it is paired, not open
    if (closed.some((sp) => sp.start === p || sp.end - 1 === p)) continue
    // open only while nothing after it can close the segment
    let hasCloser = false
    for (let q = p + 1; q < text.length; q++) {
      if (text[q] !== '$') continue
      if (text[q - 1] === '\\' || text[q - 1] === '$') continue
      if (q + 1 < text.length && text[q + 1] === '$') continue
      hasCloser = true
      break
    }
    if (!hasCloser) return { start: p, end: text.length, tex: text.slice(p + 1) }
    return null // a rejected closer follows — ambiguous dollars, stay raw
  }
  return null
}

// ---------------------------------------------------------------------------

// Bare markers ("2.", "-", "#") are accepted as EMPTY items so that empty
// blocks round-trip on reload instead of degrading into stray paragraphs
// that break numbered-list chains. A space is still required before content,
// so "1.5 liters" or "#hashtag" stay plain paragraphs.
const RE_HEADING = /^(#{1,6})(?:\s+(.*))?$/
const RE_TODO = /^[-*+]\s+\[([ xX])\]\s*(.*)$/
const RE_BULLET = /^[-*+](?:\s+(.*))?$/
const RE_NUMBERED = /^(\d+)[.)](?:\s+(.*))?$/
const RE_DIVIDER = /^(-{3,}|\*{3,}|_{3,})$/
/** ![alt](url "75") — the optional quoted title carries the display width in % */
const RE_IMAGE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/
/** `[TOC]` — auto-generated table of contents (case-insensitive) */
const RE_TOC = /^\[TOC\]$/i

/** Parse a markdown document into blocks. Always returns at least one block. */
export function parseMarkdownToBlocks(md: string): Block[] {
  const blocks: Block[] = []
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()

    if (!line) {
      i++
      continue
    }

    // ---- fenced code block ----
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        buf.push(lines[i])
        i++
      }
      i++ // skip closing fence (or EOF)
      blocks.push({ id: newBlockId(), type: 'code', text: buf.join('\n'), lang })
      continue
    }

    // ---- display math ($$ … $$) ----
    if (line.startsWith('$$')) {
      const rest = line.slice(2)
      if (rest.endsWith('$$') && rest.length >= 2) {
        // single line: $$…$$
        blocks.push({ id: newBlockId(), type: 'math', text: rest.slice(0, -2).trim() })
        i++
      } else {
        // multi-line: collect until a closing $$
        const buf: string[] = [rest]
        i++
        let closed = false
        while (i < lines.length) {
          const t = lines[i].trim()
          if (t === '$$') {
            i++
            closed = true
            break
          }
          if (t.endsWith('$$') && t.length > 2) {
            buf.push(t.slice(0, -2))
            i++
            closed = true
            break
          }
          buf.push(lines[i])
          i++
        }
        void closed // unclosed fences degrade gracefully into one math block
        blocks.push({ id: newBlockId(), type: 'math', text: buf.join('\n').trim() })
      }
      continue
    }

    // ---- divider ----
    if (RE_DIVIDER.test(line)) {
      blocks.push(createBlock('divider'))
      i++
      continue
    }

    // ---- table of contents marker ([TOC]) ----
    if (RE_TOC.test(line)) {
      blocks.push(createBlock('toc'))
      i++
      continue
    }

    // ---- heading ----
    const h = line.match(RE_HEADING)
    if (h) {
      const level = Math.min(h[1].length, 3)
      blocks.push({ id: newBlockId(), type: (`h${level}` as BlockType), text: (h[2] ?? '').trim() })
      i++
      continue
    }

    // ---- todo ----
    const todo = line.match(RE_TODO)
    if (todo) {
      blocks.push({
        id: newBlockId(),
        type: 'todo',
        text: todo[2].trim(),
        checked: todo[1].toLowerCase() === 'x',
      })
      i++
      continue
    }

    // ---- bullet ----
    const bullet = line.match(RE_BULLET)
    if (bullet) {
      blocks.push({ id: newBlockId(), type: 'bullet', text: (bullet[1] ?? '').trim() })
      i++
      continue
    }

    // ---- numbered ----
    const numbered = line.match(RE_NUMBERED)
    if (numbered) {
      blocks.push({ id: newBlockId(), type: 'numbered', text: (numbered[2] ?? '').trim() })
      i++
      continue
    }

    // ---- quote ----
    if (line.startsWith('>')) {
      blocks.push({ id: newBlockId(), type: 'quote', text: line.replace(/^>\s?/, '').trim() })
      i++
      continue
    }

    // ---- table (consecutive | rows) ----
    if (line.startsWith('|')) {
      const buf: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        buf.push(lines[i].trim())
        i++
      }
      blocks.push({ id: newBlockId(), type: 'table', text: buf.join('\n') })
      continue
    }

    // ---- image ----
    const img = line.match(RE_IMAGE)
    if (img) {
      const widthRaw = img[3] ? Number.parseInt(img[3], 10) : NaN
      blocks.push({
        id: newBlockId(),
        type: 'image',
        text: img[1],
        src: img[2],
        width: Number.isFinite(widthRaw) ? Math.min(100, Math.max(10, widthRaw)) : 100,
      })
      i++
      continue
    }

    // ---- paragraph (one line = one block, Notion-style) ----
    blocks.push({ id: newBlockId(), type: 'p', text: line })
    i++
  }

  if (blocks.length === 0) blocks.push(createBlock('p'))
  return blocks
}

/**
 * Serialize blocks back to markdown (round-trips through parseMarkdownToBlocks).
 *
 * Numbered items keep their real consecutive number (1., 2., 3. …) so the
 * saved/exported markdown matches what the editor displays, and empty items
 * serialize as bare markers ("2.", "-") that parse back as empty blocks —
 * this is what keeps list numbering from resetting to 1 after a reload.
 */
export function serializeBlocks(blocks: Block[]): string {
  // running number per block — identical to the editor's live list numbering
  const numbers: number[] = []
  let n = 0
  for (const b of blocks) {
    n = b.type === 'numbered' ? n + 1 : 0
    numbers.push(n)
  }

  const marker = (b: Block, i: number): string => {
    const hasText = b.text.trim() !== ''
    switch (b.type) {
      case 'h1':
        return hasText ? `# ${b.text}` : '#'
      case 'h2':
        return hasText ? `## ${b.text}` : '##'
      case 'h3':
        return hasText ? `### ${b.text}` : '###'
      case 'bullet':
        return hasText ? `- ${b.text}` : '-'
      case 'numbered':
        return hasText ? `${numbers[i]}. ${b.text}` : `${numbers[i]}.`
      case 'todo':
        return `- [${b.checked ? 'x' : ' '}] ${b.text}`
      case 'quote':
        return hasText ? `> ${b.text}` : '>'
      default:
        return b.text
    }
  }

  const rendered = blocks.map((b, i) => {
    switch (b.type) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'bullet':
      case 'numbered':
      case 'todo':
      case 'quote':
        return marker(b, i)
      case 'code':
        return `\`\`\`${b.lang ?? ''}\n${b.text}\n\`\`\``
      case 'divider':
        return '---'
      case 'toc':
        return '[TOC]'
      case 'math':
        return `$$\n${b.text}\n$$`
      case 'table':
        return b.text
      case 'image':
        return `![${b.text}](${b.src ?? ''}${b.width !== undefined ? ` "${b.width}"` : ''})`
      default:
        return b.text
    }
  })

  // drop empty placeholder artifacts at the very start/end (empty paragraphs,
  // empty list items left by pressing Enter, empty headings…) so a fresh note
  // stays "" in storage and lists don't carry trailing empty markers around
  const isArtifact = (b: Block): boolean => {
    if (b.text.trim() !== '') return false
    switch (b.type) {
      case 'p':
      case 'quote':
      case 'bullet':
      case 'numbered':
      case 'h1':
      case 'h2':
      case 'h3':
        return true
      case 'todo':
        return !b.checked
      default:
        return false
    }
  }
  let start = 0
  let end = blocks.length
  while (end > start && isArtifact(blocks[end - 1])) end--
  while (start < end && isArtifact(blocks[start])) start++

  return rendered.slice(start, end).join('\n\n')
}

/** Auto-grow a block textarea to fit its content. */
export function autoResize(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}
