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

/** Strip common markdown/LaTeX syntax to build a short plain-text excerpt */
export function makeExcerpt(content: string, maxLen = 110): string {
  let text = content
    // block & inline math -> keep inner text roughly
    .replace(/\$\$([\s\S]*?)\$\$/g, ' ')
    .replace(/\$([^$\n]*)\$/g, '$1')
    .replace(/\\ce\{([^}]*)\}/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/(\*\*|__|\*|`)/g, '')
    .replace(/^\s*[-*+>]\s+/gm, '')
    .replace(/\|/g, ' ')
    .replace(/^-{3,}$/gm, ' ')
    .replace(/\\/g, '')
  text = text.replace(/\s+/g, ' ').trim()
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen).trimEnd() + '…'
}
