/**
 * Canonical RPS print document.
 *
 * `buildRpsHtml` produces the exact HTML used by BOTH the on-screen Preview
 * and the PDF export, so what you see is what gets downloaded.
 * Layout is based on the official UNISINA Excel→HTML conversion.
 *
 * Pure string generation — no DOM/document dependency — so the same output can be
 * rendered in an <iframe> for preview or printed via Electron printToPDF.
 */

import { buildRpsFromTemplate, initLogo } from './rpsDataMapper'

export interface RpsContent {
  [key: string]: string
}

// ─────────────────────────── plain helpers ───────────────────────────

const MONTHS: Record<string, string> = {
  '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
  '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
  '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember',
}

/** 'YYYY-MM-DD' → '20 Februari 2026' ('' → '') */
export function fullDate(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const month = MONTHS[parts[1]] || parts[1]
  return `${parseInt(parts[2], 10)} ${month} ${parts[0]}`
}

// ─────────────────────────── rich text sanitizer ───────────────────────────

const RICH_ALLOWED = new Set(['p', 'div', 'span', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'sub', 'sup', 'ul', 'ol', 'li'])
const RICH_BLOCKED = ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'form', 'input', 'select', 'textarea', 'button', 'img', 'picture', 'source', 'video', 'audio', 'canvas', 'link', 'meta', 'title', 'head', 'a']

/**
 * Sanitize rich-text (TipTap) HTML for safe display inside the preview/PDF:
 * keeps text formatting (b/i/u/s, sub/sup, font family/size/color styles),
 * strips images, links, scripts and arbitrary elements. DOM-free (regex).
 */
export function sanitizeRich(html: string): string {
  if (!html) return ''
  const blockedRe = new RegExp('<(?:' + RICH_BLOCKED.join('|') + ')\\b[^>]*>[\\s\\S]*?</\\1\\s*>', 'gi')
  let out = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(blockedRe, '')
    .replace(new RegExp('<(?:' + RICH_BLOCKED.join('|') + ')\\b[^>]*\\/?>', 'gi'), '')
  out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/g, (m, tag, attrs) => {
    const t = tag.toLowerCase()
    const closing = m.startsWith('</')
    if (!RICH_ALLOWED.has(t)) return ''
    let tagOut = closing ? '</' + t + '>' : '<' + t
    if (!closing && t === 'span' && attrs) {
      const styleMatch = /style\s*=\s*"([^"]*)"/i.exec(attrs)
      if (styleMatch) {
        const css = (styleMatch[1] || '')
          .replace(/url\s*\([^)]*\)/gi, 'none')
          .replace(/expression\s*\(/gi, '')
          .replace(/javascript\s*:/gi, '')
        tagOut += ' style="' + css + '"'
      }
    }
    return tagOut + '>'
  })
  return out
}

// ─────────────────────────── public API ───────────────────────────

/** Full standalone HTML document of the RPS. Used by Preview + PDF export. */
export function buildRpsHtml(content: RpsContent): string {
  return buildRpsFromTemplate(content)
}

export { initLogo }
