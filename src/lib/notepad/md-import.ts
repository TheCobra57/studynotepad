/**
 * Markdown (.md) import helpers — turn a file into a StudyPad note.
 *
 * A file may carry a simple frontmatter block for auto-routing:
 *
 *   ---
 *   title: Quadratic equations
 *   subject: Mathematics
 *   chapter: Algebra
 *   ---
 *
 * Only flat `key: value` pairs are understood (title / subject / chapter);
 * anything else in the block is ignored. When a subject or chapter named in
 * the frontmatter doesn't exist in the pad, the importer surfaces an error
 * and the user picks a destination manually.
 */

export interface MdFrontmatter {
  title?: string
  subject?: string
  chapter?: string
}

export interface ParsedMd {
  /** best-effort note title: frontmatter > first `# heading` > file name */
  title: string
  /** markdown body — frontmatter and a leading H1 consumed as the title are stripped */
  content: string
  frontmatter: MdFrontmatter
  /** true when a leading `# heading` was used as the title */
  usedHeading: boolean
  /** true when the title came from the file name (no heading/frontmatter title) */
  usedFileName: boolean
}

const RE_H1 = /^#\s+(.+?)\s*$/

/** .md / .markdown / .mdown / .mkd — or a text/markdown MIME type */
export function isMarkdownFile(file: File): boolean {
  return (
    /\.(md|markdown|mdown|mkd)$/i.test(file.name) ||
    file.type === 'text/markdown'
  )
}

/** strip matching quotes around a frontmatter value */
function unquote(v: string): string {
  const t = v.trim()
  if (
    t.length >= 2 &&
    ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")))
  ) {
    return t.slice(1, -1).trim()
  }
  return t
}

function parseFrontmatterBlock(block: string): MdFrontmatter {
  const fm: MdFrontmatter = {}
  for (const rawLine of block.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const m = line.match(/^([\w-]+)\s*:\s*(.*)$/)
    if (!m) continue
    const value = unquote(m[2])
    if (!value) continue
    const key = m[1].toLowerCase()
    if (key === 'title') fm.title = value
    else if (key === 'subject') fm.subject = value
    else if (key === 'chapter') fm.chapter = value
  }
  return fm
}

/**
 * Parse an imported markdown document.
 *
 * - strips an optional leading `---` frontmatter block
 * - extracts the title (frontmatter `title` > first `# heading` > file name);
 *   a leading H1 used as the title is removed from the body, mirroring the
 *   “Export .md file” format (`# {title}\n\n{content}`) so exports round-trip
 */
export function parseImportedMd(text: string, fileName: string): ParsedMd {
  let src = text.replace(/\r\n?/g, '\n')
  let frontmatter: MdFrontmatter = {}

  // ---- optional frontmatter at the very top ----
  if (src.startsWith('---')) {
    const lines = src.split('\n')
    if (lines[0].trim() === '---') {
      const closeIdx = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
      if (closeIdx > 0) {
        frontmatter = parseFrontmatterBlock(lines.slice(1, closeIdx).join('\n'))
        src = lines.slice(closeIdx + 1).join('\n')
      }
    }
  }

  let body = src.replace(/^\n+/, '')

  let title = frontmatter.title?.trim() ?? ''
  let usedHeading = false
  let usedFileName = false

  if (!title) {
    const nl = body.indexOf('\n')
    const firstLine = nl === -1 ? body : body.slice(0, nl)
    const h1 = firstLine.match(RE_H1)
    if (h1) {
      title = h1[1].trim()
      usedHeading = true
      body = nl === -1 ? '' : body.slice(nl + 1).replace(/^\n+/, '')
    }
  }

  if (!title) {
    title = fileName.replace(/\.[^.]+$/, '').trim()
    usedFileName = true
  }
  if (!title) title = 'Untitled note'

  return { title, content: body, frontmatter, usedHeading, usedFileName }
}

export interface FrontmatterTarget {
  subjectId?: string
  chapterId?: string
  /** human-readable name of the missing element, when the frontmatter can't be resolved */
  missing?: string
}

const sameName = (a: string | undefined, b: string) =>
  !!a && a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * Match the file's frontmatter subject/chapter against the pad's tree.
 *
 * - subject given but unknown → { missing: 'subject “…”' }
 * - chapter given but unknown (subject known) → preselect that subject + missing
 * - chapter given without subject → search every chapter by name
 */
export function resolveFrontmatter(
  fm: MdFrontmatter,
  subjects: { id: string; name: string }[],
  chapters: { id: string; subjectId: string; name: string }[],
): FrontmatterTarget {
  let subject: { id: string; name: string } | undefined
  if (fm.subject) {
    subject = subjects.find((s) => sameName(fm.subject, s.name))
    if (!subject) return { missing: `subject “${fm.subject}”` }
  }
  if (fm.chapter) {
    const pool = subject ? chapters.filter((c) => c.subjectId === subject!.id) : chapters
    const chapter = pool.find((c) => sameName(fm.chapter, c.name))
    if (!chapter) {
      return subject
        ? { subjectId: subject.id, missing: `chapter “${fm.chapter}”` }
        : { missing: `chapter “${fm.chapter}”` }
    }
    return { subjectId: chapter.subjectId, chapterId: chapter.id }
  }
  return subject ? { subjectId: subject.id } : {}
}
