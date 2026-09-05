/**
 * Convert rich-text HTML to plain text (used for AI prompts and plain-text contexts).
 */
export function stripHtml(html: string): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  // Preserve line breaks for block elements and <br>
  doc.querySelectorAll('br').forEach(br => br.replaceWith('\n'))
  doc.querySelectorAll('p, div, li, h1, h2, h3, h4, tr').forEach(el => el.append('\n'))
  const text = (doc.body.textContent || '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text
}