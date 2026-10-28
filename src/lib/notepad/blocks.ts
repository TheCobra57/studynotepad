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

// ---------------------------------------------------------------------------

const RE_HEADING = /^(#{1,6})\s+(.*)$/
const RE_TODO = /^[-*+]\s+\[([ xX])\]\s*(.*)$/
const RE_BULLET = /^[-*+]\s+(.*)$/
const RE_NUMBERED = /^\d+[.)]\s+(.*)$/
const RE_DIVIDER = /^(-{3,}|\*{3,}|_{3,})$/
/** ![alt](url "75") — the optional quoted title carries the display width in % */
const RE_IMAGE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/

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

    // ---- heading ----
    const h = line.match(RE_HEADING)
    if (h) {
      const level = Math.min(h[1].length, 3)
      blocks.push({ id: newBlockId(), type: (`h${level}` as BlockType), text: h[2].trim() })
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
      blocks.push({ id: newBlockId(), type: 'bullet', text: bullet[1].trim() })
      i++
      continue
    }

    // ---- numbered ----
    const numbered = line.match(RE_NUMBERED)
    if (numbered) {
      blocks.push({ id: newBlockId(), type: 'numbered', text: numbered[1].trim() })
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

/** Serialize blocks back to markdown (round-trips through parseMarkdownToBlocks). */
export function serializeBlocks(blocks: Block[]): string {
  const rendered = blocks.map((b) => {
    switch (b.type) {
      case 'h1':
        return `# ${b.text}`
      case 'h2':
        return `## ${b.text}`
      case 'h3':
        return `### ${b.text}`
      case 'bullet':
        return `- ${b.text}`
      case 'numbered':
        return `1. ${b.text}`
      case 'todo':
        return `- [${b.checked ? 'x' : ' '}] ${b.text}`
      case 'quote':
        return `> ${b.text}`
      case 'code':
        return `\`\`\`${b.lang ?? ''}\n${b.text}\n\`\`\``
      case 'divider':
        return '---'
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

  // drop empty paragraphs at the very start/end so a fresh note stays "" in storage
  let start = 0
  let end = rendered.length
  while (start < end && rendered[start].trim() === '' && blocks[start].type === 'p') start++
  while (end > start && rendered[end - 1].trim() === '' && blocks[end - 1].type === 'p') end--

  return rendered.slice(start, end).join('\n\n')
}

/** Auto-grow a block textarea to fit its content. */
export function autoResize(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}
