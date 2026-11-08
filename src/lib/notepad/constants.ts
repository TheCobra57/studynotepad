import { isChemBlock, parseMarkdownToBlocks, type Block } from '@/lib/notepad/blocks'

export const SUBJECT_COLORS = [
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Fuchsia', value: '#d946ef' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Slate', value: '#64748b' },
] as const

export const STORAGE_KEY = 'studypad-data-v1'

// ---------------------------------------------------------------------------
// Note excerpts
//
// The notes sidebar preview used to regex-strip the raw markdown, which let
// base64 image data and half-eaten LaTeX leak into the two-line excerpt. Now
// the note is parsed with the SAME block parser the editor uses, so every
// non-textual block becomes a friendly named chip (Image, Equation, Code…)
// and only human-readable text survives into the preview.
// ---------------------------------------------------------------------------

/** Element kinds that render as labelled chips in the excerpt */
export type ExcerptElement =
  | 'list'
  | 'checklist'
  | 'image'
  | 'math'
  | 'chem'
  | 'code'
  | 'table'
  | 'toc'

/** One piece of a note preview: a text run or a named element chip */
export type ExcerptSegment =
  | { kind: 'text'; text: string; emphasis?: boolean; quote?: boolean }
  | { kind: 'chip'; element: ExcerptElement; meta?: string }

/** Chip labels — reuse the editor's own vocabulary from the / menu */
export const EXCERPT_CHIP_LABELS: Record<ExcerptElement, string> = {
  list: 'List',
  checklist: 'Checklist',
  image: 'Image',
  math: 'Equation',
  chem: 'Reaction',
  code: 'Code',
  table: 'Table',
  toc: 'Contents',
}

/** total characters of readable text kept in the preview (chips don't count) */
const MAX_TEXT = 120
/** hard cap on segments so pathological notes stay cheap to render */
const MAX_SEGMENTS = 24

/** strip inline markdown emphasis/links, collapse whitespace */
function stripInlineMd(s: string): string {
  return s
    .replace(/==([^=\n]+)==/g, '$1') // labels — keep the words, drop the marks
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → their text
    .replace(/\s+/g, ' ')
    .trim()
}

/** "| a | b |" table source → "3×2" style meta (body rows × columns) */
function tableDims(text: string): string | undefined {
  const rows = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|'))
  const body = rows.filter((l) => !/^\|?[\s:|-]+\|?$/.test(l))
  const cols = body[0] ? body[0].split('|').filter((c) => c.trim() !== '').length : 0
  if (body.length === 0 || cols === 0) return undefined
  return `${body.length}×${cols}`
}

/** turn one paragraph-ish line into text segments + inline math/image chips */
function inlineSegments(raw: string, out: ExcerptSegment[], pushText: (t: string) => void) {
  const re = /(!\[([^\]]*)\]\([^)]*\))|(\$([^$\n]+)\$)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) pushText(stripInlineMd(raw.slice(last, m.index)))
    if (m[1]) {
      out.push({ kind: 'chip', element: 'image', meta: m[2]?.trim() || undefined })
    } else {
      out.push({ kind: 'chip', element: isChemBlock(m[4] ?? '') ? 'chem' : 'math' })
    }
    last = re.lastIndex
  }
  if (last < raw.length) pushText(stripInlineMd(raw.slice(last)))
}

/**
 * Build the sidebar preview segments for a note's markdown source.
 *
 * Textual blocks (headings, paragraphs, quotes, list items) become text runs;
 * everything else becomes a named chip: Image, Equation / Reaction, Code,
 * Table (with rows×cols), Contents. Image alt text and code language are kept
 * as chip meta; data URLs never leak into the preview.
 */
export function makeExcerptSegments(content: string): ExcerptSegment[] {
  const segments: ExcerptSegment[] = []
  if (!content.trim()) return segments

  let used = 0
  let overflowed = false
  let prevList: 'bullet' | 'numbered' | 'todo' | null = null
  let listNum = 0

  const pushText = (text: string) => {
    const t = text.trim()
    if (!t || overflowed) return
    const room = MAX_TEXT - used
    if (room <= 0) {
      overflowed = true
      return
    }
    const clipped = t.length > room ? t.slice(0, room).trimEnd() + '…' : t
    used += clipped.length
    const prev = segments[segments.length - 1]
    if (prev && prev.kind === 'text' && !prev.emphasis && !prev.quote) {
      prev.text += ` ${clipped}`
    } else {
      segments.push({ kind: 'text', text: clipped })
    }
  }
  const pushChip = (element: ExcerptElement, meta?: string) => {
    if (segments.length >= MAX_SEGMENTS) {
      overflowed = true
      return
    }
    segments.push({ kind: 'chip', element, meta })
  }

  const blocks: Block[] = parseMarkdownToBlocks(content)
  for (const b of blocks) {
    if (overflowed || segments.length >= MAX_SEGMENTS) break
    switch (b.type) {
      case 'h1':
      case 'h2':
      case 'h3': {
        prevList = null
        const t = stripInlineMd(b.text)
        if (t) {
          if (segments.length >= MAX_SEGMENTS) break
          segments.push({ kind: 'text', text: t, emphasis: true })
        }
        break
      }
      case 'p': {
        prevList = null
        inlineSegments(b.text, segments, pushText)
        break
      }
      case 'quote': {
        prevList = null
        const t = stripInlineMd(b.text)
        if (t) {
          if (segments.length >= MAX_SEGMENTS) break
          segments.push({ kind: 'text', text: t, quote: true })
        }
        break
      }
      case 'bullet':
      case 'numbered':
      case 'todo': {
        const run = b.type
        if (prevList !== run) {
          pushChip(run === 'todo' ? 'checklist' : 'list')
          listNum = 0
        }
        prevList = run
        const glyph =
          run === 'todo' ? (b.checked ? '✓ ' : '○ ') : run === 'numbered' ? `${++listNum}. ` : '• '
        pushText(glyph + stripInlineMd(b.text))
        break
      }
      case 'math':
        prevList = null
        pushChip(isChemBlock(b.text) ? 'chem' : 'math')
        break
      case 'code':
        prevList = null
        pushChip('code', b.lang?.trim() || undefined)
        break
      case 'image':
        prevList = null
        pushChip('image', b.text.trim() ? b.text.trim().slice(0, 28) : undefined)
        break
      case 'table':
        prevList = null
        pushChip('table', tableDims(b.text))
        break
      case 'toc':
        prevList = null
        pushChip('toc')
        break
      case 'divider':
        prevList = null
        break
    }
  }

  return segments
}

/** Plain-text fallback over the segment engine (labels replace chips) */
export function makeExcerpt(content: string, maxLen = 110): string {
  let text = ''
  for (const seg of makeExcerptSegments(content)) {
    const piece =
      seg.kind === 'text'
        ? seg.text
        : EXCERPT_CHIP_LABELS[seg.element] + (seg.meta ? ` (${seg.meta})` : '')
    if (!piece) continue
    if (text && (text + ' ' + piece).length > maxLen) break
    text = text ? `${text} ${piece}` : piece
  }
  return text
}
