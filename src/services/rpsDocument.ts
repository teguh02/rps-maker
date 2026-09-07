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

/** Strip HTML tags, decode entities, collapse whitespace */
function stripHtml(text: string): string {
  if (!text) return ''
  return text
    .replace(/<\/?[^>]+(>|$)/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
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

/** Human-readable, AI-parseable plain text format (Markdown-like). */
export function buildRpsTxt(content: RpsContent): string {
  const lines: string[] = []
  const sep50 = '========================================================'
  const sepDash = '-'.repeat(50)

  // Header
  lines.push(sep50)
  lines.push('RENCANA PEMBELAJARAN SEMESTER')
  lines.push(sep50)
  lines.push('')

  // Identitas section
  lines.push(`${lineItem('MATA KULIAH', content.mata_kuliah || '-')}`)
  lines.push(`${lineItem('KODE MK', content.kode_mk || '-')}`)
  lines.push(`${lineItem('PRODI', content.prodi || '-')}`)
  lines.push(`${lineItem('RUMPUN', content.rumpun_mk || '-')}`)
  const sksT = content.sks_t || '0'
  const sksP = content.sks_p || '0'
  lines.push(`SKS : ${sksT} Teori / ${sksP} Praktikum`)
  lines.push(`${lineItem('SEMESTER', content.semester || '-')}`)
  lines.push(`${lineItem('TAHUN AKADEMIK', content.semester_akademik || '-')}`)
  lines.push(`${lineItem('DOSEN PENGAMPU', content.dosen_pengampu || '-')}`)
  if (content.tgl_penyusunan) {
    lines.push(`${lineItem('TANGGAL PENYUSUNAN', fullDate(content.tgl_penyusunan))}`)
  }
  lines.push('')

  // Otorisasi
  if (content.koordinator_rmk) {
    lines.push(sepDash)
    lines.push('OTORISASI')
    lines.push(sepDash)
    lines.push(`Koordinator RMK   : ${content.koordinator_rmk}`)
    lines.push('')
  }

  // CPL
  try {
    const cpl = JSON.parse(content.cpl || '[]') as Array<{ label: string; deskripsi: string }>
    if (cpl.length > 0) {
      lines.push(sepDash)
      lines.push('CPL - Capaian Pembelajaran Lulusan')
      lines.push(sepDash)
      for (const item of cpl) {
        lines.push(`• ${item.label}: ${stripHtml(item.deskripsi)}`)
      }
      lines.push('')
    }
  } catch {}

  // CPMK
  try {
    const cpmk = JSON.parse(content.cpmk || '[]') as Array<{ label: string; deskripsi: string }>
    if (cpmk.length > 0) {
      lines.push(sepDash)
      lines.push('CPMK - Capaian Pembelajaran Mata Kuliah')
      lines.push(sepDash)
      for (const item of cpmk) {
        lines.push(`• ${item.label}: ${stripHtml(item.deskripsi)}`)
      }
      lines.push('')
    }
  } catch {}

  // Sub-CPMK
  try {
    const sub = JSON.parse(content.sub_cpmk || '[]') as Array<{ label: string; cpmk?: string; deskripsi: string }>
    if (sub.length > 0) {
      lines.push(sepDash)
      lines.push('SUB-CPMK - Kemampuan Akhir Tiap Tahapan Belajar')
      lines.push(sepDash)
      for (const item of sub) {
        const ref = item.cpmk ? ` → ${item.cpmk}` : ''
        lines.push(`• ${item.label}${ref}: ${stripHtml(item.deskripsi)}`)
      }
      lines.push('')
    }
  } catch {}

  // Deskripsi Singkat
  if (content.deskripsi_mk) {
    lines.push(sepDash)
    lines.push('DESKRIPSI SINGKAT MATA KULIAH')
    lines.push(sepDash)
    lines.push(stripHtml(content.deskripsi_mk))
    lines.push('')
  }

  // Bahan Kajian
  try {
    const bahan = JSON.parse(content.bahan_kajian || '[]') as Array<{ label: string; judul?: string; deskripsi: string }>
    if (bahan.length > 0) {
      lines.push(sepDash)
      lines.push('BAHAN KAJIAN - Materi Pembelajaran')
      lines.push(sepDash)
      for (const item of bahan) {
        const title = item.judul || `Bahan kajian ke-${item.label}`
        lines.push(`${item.label}. ${title}`)
        const desc = stripHtml(item.deskripsi)
        if (desc) {
          lines.push(`   ${desc}`)
        }
      }
      lines.push('')
    }
  } catch {}

  // Penilaian
  try {
    const penilaian = JSON.parse(content.penilaian || '[]') as Array<{ item: string; bobot: number | string }>
    if (penilaian.length > 0) {
      lines.push(sepDash)
      lines.push('PENILAIAN')
      lines.push(sepDash)
      lines.push('| No | Aspek Penilaian       | Bobot |')
      lines.push('|----|-----------------------|-------|')
      penilaian.forEach((p, i) => {
        const bobot = String(p.bobot).replace('%', '')
        lines.push(`| ${i + 1} | ${p.item.padEnd(21)} | ${bobot.padStart(5)}% |`)
      })
      lines.push('')
    }
  } catch {}

  // Pustaka
  if (content.pustaka_utama || content.pustaka_pendukung) {
    lines.push(sepDash)
    lines.push('PUSTAKA')
    lines.push(sepDash)
    if (content.pustaka_utama) {
      lines.push('UTAMA:')
      lines.push(stripHtml(content.pustaka_utama))
      lines.push('')
    }
    if (content.pustaka_pendukung) {
      lines.push('PENDUKUNG:')
      lines.push(stripHtml(content.pustaka_pendukung))
      lines.push('')
    }
  }

  // Pertemuan
  try {
    const pertemuan = JSON.parse(content.pertemuan || '[]') as Array<{ no: number; type?: string; label?: string; subCpmk?: string; indikator?: string; bentukMetodePenugasan?: string; luring?: string; daring?: string; materiPustaka?: string; [key: string]: any }>
    if (pertemuan.length > 0) {
      lines.push(sepDash)
      lines.push('JADWAL PERTEMUAN')
      lines.push(sepDash)
      let currentNo = 0
      for (const item of pertemuan) {
        if (item.type === 'uts') {
          lines.push(`**PERTEMUAN KE-${item.no} — UTS**`)
          lines.push('')
        } else if (item.type === 'uas') {
          lines.push(`**PERTEMUAN KE-${item.no} — UAS**`)
          lines.push('')
        } else {
          currentNo = item.no
          lines.push(`PERTEMUAN KE-${currentNo}`)
          lines.push(`Sub-CPMK: ${(item.subCpmk || '-').trim()}`)
          lines.push(`Indikator: ${(item.indikator || '-').trim()}`)
          lines.push(`Kriteria & Teknik Penilaian: ${(item.kriteriaTeknik || '-').trim()}`)
          lines.push(`Bentuk & Metode Penugasan: ${(item.bentukMetodePenugasan || '-').trim()}`)
          lines.push(`Luring (Offline): ${(item.luring || '-').trim()}`)
          lines.push(`Daring (Online): ${(item.daring || '-').trim()}`)
          lines.push(`Materi & Pustaka: ${(item.materiPustaka || '-').trim()}`)
          lines.push(`Bobot: ${item.bobot || '-'}`)
          lines.push('')
        }
      }
    }
  } catch {}

  // Footer
  lines.push(sep50)
  lines.push('RENCANA PEMBELAJARAN SEMESTER (RPS) UNISINA')
  lines.push('Generasi dengan RPS Maker v' + __APP_VERSION__)
  lines.push(sep50)

  return lines.join('\n')
}

function lineItem(label: string, value: string): string {
  return `${label.padEnd(18)}: ${value}`
}

export { initLogo }
