/**
 * DOCX + PDF export.
 *
 * Both exports are built from the SAME canonical RPS layout as the in-app
 * Preview (see rpsDocument.ts):
 *   - PDF  → the exact HTML string shown in Preview is printed by Electron's
 *            printToPDF (no html2canvas), so Preview and the downloaded PDF
 *            are byte-for-byte the same document.
 *   - DOCX → the same sections, rendered as native Word tables/paragraphs.
 *            Uses the same 14-col main table, 8-col Pertemuan, 2-col signature.
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  TableRow,
  TableCell,
  Table,
  WidthType,
  VerticalAlign,
  ShadingType,
  BorderStyle,
  PageBreak,
  ImageRun,
} from 'docx'
import { logger } from '../utils/logger'
import { buildRpsHtml, fullDate, initLogo } from './rpsDocument'
import logoUrl from '../assets/logo-unisina.png?url'

export interface ExportData {
  content: Record<string, string>
}

// ─────────────────────────── shared plain helpers ───────────────────────────

/** rich text → plain lines */
function plainLines(html: string): string[] {
  return (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
}

function stripHtml(html: string): string {
  return plainLines(html).join('\n')
}

// ponytail: inline HTML→TextRun parser, keeps bold/italic
function richRuns(html: string, baseSize: number, baseFont: { ascii: string; hAnsi: string; cs: string }, forceBold = false): TextRun[] {
  const text = (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  const lines = text.split('\n')
  const runs: TextRun[] = []
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li].trim()
    if (!line && li < lines.length - 1) continue
    // Simple regex-based inline formatting extraction
    const inlineRe = /<(b|strong|i|em|u|s|strike)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi
    let cursor = 0
    const lineLower = line.toLowerCase()
    // For simplicity, extract text segments with bold/italic flags
    const segments: { text: string; bold?: boolean; italics?: boolean; underline?: boolean; strike?: boolean }[] = []
    let m: RegExpExecArray | null
    while ((m = inlineRe.exec(line)) !== null) {
      if (m.index > cursor) {
        const before = line.slice(cursor, m.index).replace(/<[^>]+>/g, '').trim()
        if (before) segments.push({ text: before })
      }
      const tag = m[1].toLowerCase()
      const inner = m[2].replace(/<[^>]+>/g, '')
      if (tag === 'b' || tag === 'strong') segments.push({ text: inner, bold: true })
      else if (tag === 'i' || tag === 'em') segments.push({ text: inner, italics: true })
      else if (tag === 'u') segments.push({ text: inner, underline: true })
      else if (tag === 's' || tag === 'strike') segments.push({ text: inner, strike: true })
      cursor = m.index + m[0].length
    }
    if (cursor < line.length) {
      const rest = line.slice(cursor).replace(/<[^>]+>/g, '').trim()
      if (rest) segments.push({ text: rest })
    }
    if (segments.length === 0 && line) {
      segments.push({ text: line.replace(/<[^>]+>/g, '') })
    }
    for (const seg of segments) {
      if (!seg.text) continue
      runs.push(new TextRun({
        text: seg.text,
        bold: seg.bold || forceBold,
        italics: seg.italics,
        size: baseSize,
        font: baseFont,
      }))
    }
    if (li < lines.length - 1) {
      runs.push(new TextRun({ text: '', break: 1, size: baseSize, font: baseFont }))
    }
  }
  return runs
}

interface StructuredItem {
  label?: string
  deskripsi?: string
  judul?: string
}

function parseStructured(json: string): StructuredItem[] {
  try {
    const arr = JSON.parse(json || '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function parsePenilaian(json: string): Array<{ item: string; bobot: number }> {
  try {
    const arr = JSON.parse(json || '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

interface PertemuanRow {
  no: number
  subCpmk: string
  indikator: string
  kriteriaTeknik: string
  bentukMetodePenugasan: string
  luring: string
  daring: string
  materiPustaka: string
  bobot: number
  type?: string
  label?: string
}

function parsePertemuan(json: string): PertemuanRow[] {
  try {
    const arr = JSON.parse(json || '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

// ─────────────────────────── DOCX building ───────────────────────────

const FONT = 'Times New Roman'
const FONT_TWIPS = { ascii: FONT, hAnsi: FONT, cs: FONT }

const cellBorders = {
  top: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
}

const noBorderBorders = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
}

/** Helper: single-line text cell (plain, no formatting) */
function tc(text: string, opts: { bold?: boolean; center?: boolean; size?: number; fill?: string; widthPct?: number; colSpan?: number; rowSpan?: number; noBorder?: boolean; align?: typeof AlignmentType[keyof typeof AlignmentType] } = {}): TableCell {
  const runs: TextRun[] = plainLines(text).map((line, i) =>
    new TextRun({
      text: line,
      bold: opts.bold,
      size: opts.size ?? 20, // 10pt
      font: FONT_TWIPS,
      break: i > 0 ? 1 : 0,
    }))
  if (runs.length === 0) {
    runs.push(new TextRun({ text: '', size: opts.size ?? 20, font: FONT_TWIPS }))
  }
  return new TableCell({
    columnSpan: opts.colSpan,
    rowSpan: opts.rowSpan,
    width: opts.widthPct != null ? { size: opts.widthPct, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    margins: { top: 20, bottom: 20, left: 40, right: 40 },
    borders: opts.noBorder ? noBorderBorders : cellBorders,
    children: [new Paragraph({
      alignment: opts.align || (opts.center ? AlignmentType.CENTER : AlignmentType.LEFT),
      spacing: { after: 0 },
      children: runs,
    })],
  })
}

/** Helper: rich text cell (preserves bold/italic/underline) */
function rc(html: string, opts: { size?: number; widthPct?: number; colSpan?: number; rowSpan?: number; fill?: string; bold?: boolean; center?: boolean; noBorder?: boolean } = {}): TableCell {
  const size = opts.size ?? 20
  const runs = richRuns(html, size, FONT_TWIPS, opts.bold)
  if (runs.length === 0) {
    runs.push(new TextRun({ text: '', size, font: FONT_TWIPS }))
  }
  return new TableCell({
    columnSpan: opts.colSpan,
    rowSpan: opts.rowSpan,
    width: opts.widthPct != null ? { size: opts.widthPct, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    margins: { top: 20, bottom: 20, left: 40, right: 40 },
    borders: opts.noBorder ? noBorderBorders : cellBorders,
    children: [new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { after: 0 },
      children: runs,
    })],
  })
}

function tr(cells: TableCell[]): TableRow {
  return new TableRow({ children: cells })
}

function tbl(rows: TableRow[], widthPct = 100): Table {
  return new Table({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    layout: 'fixed' as any, // Force fixed column widths
    rows,
  })
}

/** Empty paragraph with spacing */
function gap(pts: number): Paragraph {
  return new Paragraph({ spacing: { before: pts, after: 0 }, children: [] })
}

function heading(text: string, sizeHalf = 26, before = 160, after = 80): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before, after },
    children: [new TextRun({ text, bold: true, size: sizeHalf, font: FONT_TWIPS })],
  })
}

function sectionTitle(text: string, before = 200): Paragraph {
  return new Paragraph({
    spacing: { before, after: 100 },
    children: [new TextRun({ text, bold: true, size: 22, font: FONT_TWIPS })],
  })
}

function prodiCode(c: Record<string, string>): string {
  return (c.prodi || '').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'PRODI'
}

// ────────────────────── 14-column content table ──────────────────────

/**
 * Build the 14-column main content table matching the HTML template.
 * Columns at ~7.14% each (14 × 7.14 ≈ 100%).
 *
 * Layout from HTML template:
 *  - Header block (logo, STIKES, prodi, tahun akademik, doc code) — rowspan=3
 *  - Title row
 *  - Identitas (key-value pairs with merged cells)
 *  - Otorisasi (2 rows)
 *  - CPL / CPMK / Sub-CPMK
 *  - Deskripsi
 *  - Bahan Kajian
 *  - Penilaian
 *  - Pustaka
 *  - Dosen Pengampu
 *  - Matakuliah Syarat
 */
function buildContentTable(c: Record<string, string>, logoData: string | null): Table {
  const sksT = (c.sks_t || '0').trim()
  const sksP = (c.sks_p || '0').trim()
  const ta = c.semester_akademik || ''
  const sem = c.semester === 'Ganjil' ? 'GANJIL' : c.semester === 'Genap' ? 'GENAP' : (c.semester || '').toUpperCase()
  const docCode = `RPS/${prodiCode(c)}/${sem}/${(ta.split('-')[1] || '20__').trim()}`

  // ponytail: each column ~7.14%, colSpan N → N*7.14
  const W = (n: number) => Math.round(n * 7.14 * 100) / 100
  const rows: TableRow[] = []

  // ── Header block (rows 1-3): logo + STIKES + prodi + tahun akademik + doc code ──
  const logoCell = logoData
    ? new TableCell({
        columnSpan: 2, rowSpan: 3,
        verticalAlign: VerticalAlign.CENTER,
        borders: cellBorders,
        margins: { top: 20, bottom: 20, left: 40, right: 40 },
        width: { size: W(2), type: WidthType.PERCENTAGE },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({ data: logoData, type: 'png' as any, transformation: { width: 80, height: 80 } })],
        })],
      })
    : tc('', { colSpan: 2, rowSpan: 3, widthPct: W(2) })

  rows.push(tr([
    logoCell,
    tc('STIKES IBNU SINA AJIBARANG', { bold: true, center: true, size: 28, colSpan: 10, rowSpan: 3, widthPct: W(10) }),
    tc(docCode, { center: true, size: 18, colSpan: 2, rowSpan: 3, widthPct: W(2) }),
  ]))

  // Row 2-3 are filled by rowspan, now Row 4: Title
  rows.push(tr([
    tc('PROGRAM STUDI ' + (c.prodi || '').toUpperCase(), { bold: true, center: true, size: 22, colSpan: 14, widthPct: W(14) }),
  ]))
  rows.push(tr([
    tc('TAHUN AKADEMIK ' + ta, { bold: true, center: true, size: 22, colSpan: 14, widthPct: W(14) }),
  ]))

  // Row 5: Title
  rows.push(tr([
    tc('RENCANA PEMBELAJARAN SEMESTER', { bold: true, center: true, size: 22, colSpan: 14, widthPct: W(14) }),
  ]))

  // ── Identitas Header ──
  rows.push(tr([
    tc('MATA KULIAH (MK)', { bold: true, fill: 'F0F0F0', colSpan: 4, widthPct: W(4) }),
    tc('KODE', { bold: true, center: true, fill: 'F0F0F0', colSpan: 2, widthPct: W(2) }),
    tc('Rumpun MK', { bold: true, center: true, fill: 'F0F0F0', colSpan: 3, widthPct: W(3) }),
    tc('BOBOT (sks)', { bold: true, center: true, fill: 'F0F0F0', colSpan: 2, widthPct: W(2) }),
    tc('SEMESTER', { bold: true, center: true, fill: 'F0F0F0', colSpan: 1, widthPct: W(1) }),
    tc('Tgl Penyusunan', { bold: true, center: true, fill: 'F0F0F0', colSpan: 2, widthPct: W(2) }),
  ]))

  // ── Identitas Values ──
  rows.push(tr([
    tc(c.mata_kuliah || '', { colSpan: 4, widthPct: W(4) }),
    tc(c.kode_mk || '', { colSpan: 2, widthPct: W(2) }),
    tc(c.rumpun_mk || '', { colSpan: 3, widthPct: W(3) }),
    tc(`T= ${sksT}`, { colSpan: 1, widthPct: W(1) }),
    tc(`P= ${sksP}`, { colSpan: 1, widthPct: W(1) }),
    tc(c.semester || '', { colSpan: 1, widthPct: W(1) }),
    tc(fullDate(c.tgl_penyusunan) || '-', { colSpan: 2, widthPct: W(2) }),
  ]))

  // Dosen Pengampu (full row)
  rows.push(tr([
    tc('Dosen Pengampu', { bold: true, fill: 'F0F0F0', colSpan: 2 }),
    tc(c.dosen_pengampu || '', { colSpan: 12 }),
  ]))

  // Matakuliah Syarat (full row)
  rows.push(tr([
    tc('Matakuliah Syarat', { bold: true, fill: 'F0F0F0', colSpan: 2 }),
    tc(c.matakuliah_syarat || '-', { colSpan: 12 }),
  ]))

  // ── Otorisasi (2 rows) ──
  rows.push(tr([
    tc('OTORISASI', { bold: true, fill: 'F0F0F0', colSpan: 4, rowSpan: 2, widthPct: W(4) }),
    tc('Pengembang RPS', { bold: true, center: true, fill: 'F0F0F0', colSpan: 3, widthPct: W(3) }),
    tc('Koordinator RMK', { bold: true, center: true, fill: 'F0F0F0', colSpan: 4, widthPct: W(4) }),
    tc('Ketua Program Studi', { bold: true, center: true, fill: 'F0F0F0', colSpan: 3, widthPct: W(3) }),
  ]))
  rows.push(tr([
    tc(`\n${c.pengembang_rps || ''}\n${c.nidn_pengembang ? `NIDN. ${c.nidn_pengembang}` : ''}`, { center: true, colSpan: 3, widthPct: W(3) }),
    tc(`\n${c.koordinator_rmk || ''}`, { center: true, colSpan: 4, widthPct: W(4) }),
    tc(`\n${c.kaprodi || ''}\n${c.nidn_kaprodi ? `NIDN. ${c.nidn_kaprodi}` : ''}`, { center: true, colSpan: 3, widthPct: W(3) }),
  ]))

  // ── CPL / CPMK / Sub-CPMK ──
  const buildCapaianRows = (label: string, items: StructuredItem[]): TableRow[] => {
    const result: TableRow[] = []
    if (items.length === 0) {
      result.push(tr([
        tc(label, { bold: true, fill: 'F0F0F0', colSpan: 2, rowSpan: 1, widthPct: W(2) }),
        tc('-', { colSpan: 12, widthPct: W(12) }),
      ]))
      return result
    }
    result.push(tr([
      tc(label, { bold: true, fill: 'F0F0F0', colSpan: 2, rowSpan: items.length, widthPct: W(2) }),
      tc(items[0].label || '', { bold: true, colSpan: 5, widthPct: W(5) }),
      rc(items[0].deskripsi || '', { colSpan: 7, widthPct: W(7) }),
    ]))
    for (let i = 1; i < items.length; i++) {
      result.push(tr([
        tc(items[i].label || '', { bold: true, colSpan: 5, widthPct: W(5) }),
        rc(items[i].deskripsi || '', { colSpan: 7, widthPct: W(7) }),
      ]))
    }
    return result
  }

  buildCapaianRows('Capaian Pembelajaran Lulusan (CPL)', parseStructured(c.cpl)).forEach(r => rows.push(r))
  buildCapaianRows('Capaian Pembelajaran Mata Kuliah (CPMK)', parseStructured(c.cpmk)).forEach(r => rows.push(r))
  buildCapaianRows('Kemampuan Akhir Tiap Tahapan Belajar (Sub-CPMK)', parseStructured(c.sub_cpmk)).forEach(r => rows.push(r))

  // ── Deskripsi ──
  rows.push(tr([
    tc('Deskripsi Singkat Mata Kuliah', { bold: true, fill: 'F0F0F0', colSpan: 2, widthPct: W(2) }),
    rc(c.deskripsi_mk || '', { colSpan: 12, widthPct: W(12) }),
  ]))

  // ── Bahan Kajian ──
  const bahan = parseStructured(c.bahan_kajian)
  if (bahan.length === 0) {
    rows.push(tr([
      tc('Bahan Kajian:\nMateri Pembelajaran', { bold: true, fill: 'F0F0F0', colSpan: 2, rowSpan: 1, widthPct: W(2) }),
      tc('-', { colSpan: 12, widthPct: W(12) }),
    ]))
  } else {
    rows.push(tr([
      tc('Bahan Kajian:\nMateri Pembelajaran', { bold: true, fill: 'F0F0F0', colSpan: 2, rowSpan: bahan.length, widthPct: W(2) }),
      tc(`${bahan[0].label || ''}. ${bahan[0].deskripsi || bahan[0].judul || ''}`, { colSpan: 12, widthPct: W(12) }),
    ]))
    for (let i = 1; i < bahan.length; i++) {
      rows.push(tr([
        tc(`${bahan[i].label || ''}. ${bahan[i].deskripsi || bahan[i].judul || ''}`, { colSpan: 12, widthPct: W(12) }),
      ]))
    }
  }

  // ── Penilaian ──
  const penilaian = parsePenilaian(c.penilaian)
  if (penilaian.length === 0) {
    rows.push(tr([
      tc('Penilaian', { bold: true, fill: 'F0F0F0', colSpan: 2, rowSpan: 1, widthPct: W(2) }),
      tc('-', { colSpan: 12, widthPct: W(12) }),
    ]))
  } else {
    rows.push(tr([
      tc('Penilaian', { bold: true, fill: 'F0F0F0', colSpan: 2, rowSpan: penilaian.length, widthPct: W(2) }),
      tc(`${penilaian[0].item} : ${penilaian[0].bobot}%`, { colSpan: 12, widthPct: W(12) }),
    ]))
    for (let i = 1; i < penilaian.length; i++) {
      rows.push(tr([
        tc(`${penilaian[i].item} : ${penilaian[i].bobot}%`, { colSpan: 12, widthPct: W(12) }),
      ]))
    }
  }

  // ── Pustaka (matching HTML template: rowspan + "Utama:" header + individual rows) ──
  const pustakaUtama = plainLines(c.pustaka_utama)
  const pustakaPendukung = plainLines(c.pustaka_pendukung)
  const totalPustakaRows = 1 + Math.max(pustakaUtama.length, 1) + (pustakaPendukung.length > 0 ? 1 + pustakaPendukung.length : 0)

  // Row 1: "Pustaka" label (rowspan) + "Utama:" header
  rows.push(tr([
    tc('Pustaka', { bold: true, fill: 'F0F0F0', colSpan: 2, rowSpan: totalPustakaRows, widthPct: W(2) }),
    tc('Utama :', { bold: true, colSpan: 2, widthPct: W(2) }),
    tc('', { colSpan: 10, widthPct: W(10) }),
  ]))

  // Utama lines
  if (pustakaUtama.length === 0) {
    rows.push(tr([
      tc('-', { colSpan: 12, widthPct: W(12) }),
    ]))
  } else {
    pustakaUtama.forEach(line => {
      rows.push(tr([
        rc(line, { colSpan: 12, widthPct: W(12) }),
      ]))
    })
  }

  // Pendukung header + lines
  if (pustakaPendukung.length > 0) {
    rows.push(tr([
      tc('Pendukung :', { bold: true, colSpan: 2, widthPct: W(2) }),
      tc('', { colSpan: 10, widthPct: W(10) }),
    ]))
    pustakaPendukung.forEach((line, i) => {
      rows.push(tr([
        rc(`${i + 1}. ${line}`, { colSpan: 12, widthPct: W(12) }),
      ]))
    })
  }

  // ── Dosen Pengampu ──
  rows.push(tr([
    tc('Dosen Pengampu', { bold: true, fill: 'F0F0F0', colSpan: 2, widthPct: W(2) }),
    tc(c.dosen_pengampu || '', { colSpan: 12, widthPct: W(12) }),
  ]))

  // ── Matakuliah Syarat ──
  rows.push(tr([
    tc('Matakuliah Syarat', { bold: true, fill: 'F0F0F0', colSpan: 2, widthPct: W(2) }),
    tc(c.matakuliah_syarat || '-', { colSpan: 12, widthPct: W(12) }),
  ]))

  return tbl(rows)
}

// ────────────────────── 8-column Pertemuan table ──────────────────────

/**
 * Build the 8-column Pertemuan table matching the HTML template.
 *
 * Header row 1: No(r2) | Sub-CPMK(r2) | Penilaian(c2) | Bentuk...(c2) | Materi(r2) | Bobot(r2)
 * Header row 2: (occupied) | (occupied) | Indikator | Kriteria & Teknik | Luring | Daring | (occupied) | (occupied)
 * Data rows: 8 cells (No, Sub-CPMK, Indikator, Kriteria & Teknik, Luring, Daring, Materi, Bobot)
 */
function buildPertemuanTable(c: Record<string, string>): Table {
  const pertemuan = parsePertemuan(c.pertemuan)
  const rows: TableRow[] = []
  // 8 columns: each ~12.5%
  const W8 = (n: number) => Math.round(n * 12.5 * 100) / 100

  // Header row 1
  rows.push(tr([
    tc('No', { bold: true, center: true, fill: 'F0F0F0', rowSpan: 2, widthPct: W8(1) }),
    tc('Kemampuan akhir tiap tahapan belajar\n(Sub-CPMK)', { bold: true, center: true, fill: 'F0F0F0', rowSpan: 2, widthPct: W8(1) }),
    tc('Penilaian', { bold: true, center: true, fill: 'F0F0F0', colSpan: 2, widthPct: W8(2) }),
    tc('Bentuk Pembelajaran, Metode Pembelajaran,\nPenugasan Mahasiswa, [Estimasi Waktu]', { bold: true, center: true, fill: 'F0F0F0', colSpan: 2, widthPct: W8(2) }),
    tc('Materi Pembelajaran\n[ Pustaka ]', { bold: true, center: true, fill: 'F0F0F0', rowSpan: 2, widthPct: W8(1) }),
    tc('Bobot\nPenilaian (%)', { bold: true, center: true, fill: 'F0F0F0', rowSpan: 2, widthPct: W8(1) }),
  ]))

  // Header row 2
  rows.push(tr([
    tc('Indikator', { bold: true, center: true, fill: 'F0F0F0', widthPct: W8(1) }),
    tc('Kriteria & Teknik', { bold: true, center: true, fill: 'F0F0F0', widthPct: W8(1) }),
    tc('Luring (offline)', { bold: true, center: true, fill: 'F0F0F0', widthPct: W8(1) }),
    tc('Daring (online)', { bold: true, center: true, fill: 'F0F0F0', widthPct: W8(1) }),
  ]))

  // Data rows
  if (pertemuan.length === 0) {
    rows.push(tr([
      tc('Belum ada jadwal pertemuan. Gunakan "Generate dari Sub-CPMK" di tab Pertemuan.', { center: true, size: 16, colSpan: 8, widthPct: W8(8) }),
    ]))
  } else {
    pertemuan.forEach(r => {
      if (r.type === 'uts' || r.type === 'uas') {
        rows.push(tr([
          tc(r.label || (r.type === 'uts' ? 'UTS (UJIAN TENGAH SEMESTER)' : 'Evaluasi Akhir Semester'), { bold: true, center: true, fill: 'F0F0F0', colSpan: 8, widthPct: W8(8) }),
        ]))
        return
      }
      rows.push(tr([
        tc(String(r.no ?? ''), { center: true, widthPct: W8(1) }),
        rc(r.subCpmk || '', { widthPct: W8(1) }),
        rc(r.indikator || '', { widthPct: W8(1) }),
        rc(r.kriteriaTeknik || '', { widthPct: W8(1) }),
        rc(r.luring || '', { widthPct: W8(1) }),
        rc(r.daring || '', { widthPct: W8(1) }),
        rc(r.materiPustaka || '', { widthPct: W8(1) }),
        tc(String(r.bobot || 0), { center: true, widthPct: W8(1) }),
      ]))
    })
  }

  return tbl(rows)
}

// ────────────────────── 2-column Signature table ──────────────────────

/**
 * Build the 2-column signature table matching the HTML template.
 *
 * Row 1: Date (right-aligned, colspan=2)
 * Row 2: Kaprodi | Dosen Pengampu
 * Row 3: Signature area (empty)
 * Row 4: Nama + NIDN
 * Row 5: "Mengetahui," (center, colspan=2, top border)
 * Row 6: Ketua STIKes | Wakil Ketua I
 * Row 7: Signature area (empty)
 * Row 8: Nama + NIDN
 */
function buildSignatureTable(c: Record<string, string>): Table {
  const dateTxt = fullDate(c.tgl_penyusunan)
  const where = dateTxt ? `Ajibarang, ${dateTxt}` : 'Ajibarang,'
  const rows: TableRow[] = []

  // Row 1: Date
  rows.push(tr([
    tc(where, { align: AlignmentType.RIGHT, colSpan: 2, noBorder: true }),
  ]))

  // Row 2: Jabatan
  rows.push(tr([
    tc(`Kaprodi ${c.prodi || ''}`, { center: true, noBorder: true }),
    tc('Dosen Pengampu', { center: true, noBorder: true }),
  ]))

  // Row 3: Signature area
  rows.push(tr([
    tc('', { noBorder: true }),
    tc('', { noBorder: true }),
  ]))

  // Row 4: Nama + NIDN
  rows.push(tr([
    tc(`${c.kaprodi || ''}\nNIDN. ${c.nidn_kaprodi || '-'}`, { center: true, bold: true, noBorder: true }),
    tc(`${c.pengembang_rps || ''}\nNIDN. ${c.nidn_pengembang || '-'}`, { center: true, bold: true, noBorder: true }),
  ]))

  // Row 5: Mengetahui (divider)
  rows.push(tr([
    tc('Mengetahui,', { center: true, noBorder: false }),
  ]))

  // Row 6: Jabatan bawah
  rows.push(tr([
    tc('Ketua STIKes Ibnu Sina Ajibarang', { center: true, noBorder: true }),
    tc('Wakil Ketua I Bidang Akademik', { center: true, noBorder: true }),
  ]))

  // Row 7: Signature area
  rows.push(tr([
    tc('', { noBorder: true }),
    tc('', { noBorder: true }),
  ]))

  // Row 8: Nama + NIDN
  rows.push(tr([
    tc(`${c.ketua_stikes || ''}\nNIDN. ${c.nidn_ketua_stikes || '-'}`, { center: true, bold: true, noBorder: true }),
    tc(`${c.wakil_ketua_i || ''}\nNIDN. ${c.nidn_wakil_ketua_i || '-'}`, { center: true, bold: true, noBorder: true }),
  ]))

  return tbl(rows)
}

// ────────────────────── Main buildDocx ──────────────────────

function buildDocx(c: Record<string, string>, logoData: string | null): Document {
  const mk = c.mata_kuliah || ''
  const ta = c.semester_akademik || ''

  const coverChildren: Array<Paragraph | Table> = []
  const contentChildren: Array<Paragraph | Table> = []

  // ── Cover (portrait) ──
  if (logoData) {
    coverChildren.push(gap(2000))
    coverChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new ImageRun({ data: logoData, type: 'png' as any, transformation: { width: 120, height: 120 } })],
    }))
  } else {
    coverChildren.push(gap(3000))
  }
  coverChildren.push(heading('RENCANA PEMBELAJARAN SEMESTER (RPS)', 30))
  coverChildren.push(heading('GENAP', 26, 60))
  coverChildren.push(heading(`Tahun Akademik ${ta}`, 26, 60))
  coverChildren.push(gap(1600))
  coverChildren.push(heading(`Mata Kuliah : ${mk}${c.kode_mk ? ` (${c.kode_mk})` : ''}`, 34, 60, 200))
  coverChildren.push(heading(`Prodi : ${c.prodi ? c.prodi.toUpperCase() : ''}`, 24, 60, 200))
  coverChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400 },
    children: [new TextRun({ text: 'Disusun Oleh:', size: 22, font: FONT_TWIPS })],
  }))
  const disusunNames: string[] = []
  if (c.pengembang_rps) disusunNames.push(...plainLines(c.pengembang_rps))
  if (c.dosen_pengampu) plainLines(c.dosen_pengampu).forEach(n => { if (!disusunNames.includes(n)) disusunNames.push(n) })
  disusunNames.forEach(n => coverChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 0 },
    children: [new TextRun({ text: n, bold: true, size: 24, font: FONT_TWIPS })],
  })))
  if (c.nidn_pengembang) coverChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40 },
    children: [new TextRun({ text: `NIDN. ${c.nidn_pengembang}`, size: 18, font: FONT_TWIPS })],
  }))
  coverChildren.push(gap(4000))
  coverChildren.push(heading('STIKES IBNU SINA AJIBARANG', 28, 0))
  coverChildren.push(heading(coverMonthYear(c.tgl_penyusunan), 22, 80))

  // ── Content (landscape) ──

  // 14-column main content table
  contentChildren.push(buildContentTable(c, logoData))

  // Page break before Pertemuan
  contentChildren.push(new Paragraph({ children: [new PageBreak()] }))

  // 8-column Pertemuan table
  contentChildren.push(buildPertemuanTable(c))

  // Page break before signature
  contentChildren.push(new Paragraph({ children: [new PageBreak()] }))

  // 2-column signature table
  contentChildren.push(buildSignatureTable(c))

  return new Document({
    creator: 'RPS Maker UNISINA',
    title: `RPS ${mk}`,
    styles: { default: { document: { run: { font: FONT_TWIPS, size: 21 } } } },
    sections: [
      { properties: { page: { size: { orientation: 'portrait' }, margin: { top: 850, bottom: 850, left: 850, right: 850 } } }, children: coverChildren },
      { properties: { page: { size: { orientation: 'landscape' }, margin: { top: 567, bottom: 567, left: 567, right: 567 } } }, children: contentChildren },
    ],
  })
}

// ────────────────────── helpers ──────────────────────

const MONTHS_UP: Record<string, string> = {
  '01': 'JANUARI', '02': 'FEBRUARI', '03': 'MARET', '04': 'APRIL',
  '05': 'MEI', '06': 'JUNI', '07': 'JULI', '08': 'AGUSTUS',
  '09': 'SEPTEMBER', '10': 'OKTOBER', '11': 'NOVEMBER', '12': 'DESEMBER',
}

function coverMonthYear(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  return `${MONTHS_UP[parts[1]] || parts[1]}, ${parts[0]}`
}

async function fetchLogo(): Promise<string | null> {
  try {
    const res = await fetch(logoUrl)
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result
        if (typeof result === 'string') {
          resolve(result) // data:image/png;base64,...
        } else {
          resolve(null)
        }
      }
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// ─────────────────────────── public export API ───────────────────────────

export async function exportDocx(data: ExportData, filePath: string): Promise<void> {
  const startTime = Date.now()
  const c = data.content
  logger.info('EXPORT', 'export.docx_start')

  // Try LibreOffice approach first: generate PDF → convert to DOCX
  try {
    await initLogo()
    const html = buildRpsHtml(data.content)
    const result = await window.electronAPI.exportDocxViaLibreOffice({ html, filePath })
    if (result.ok) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)
      logger.info('EXPORT', 'export.docx_libreoffice_complete', { filePath, duration })
      return
    }
    if (!result.fallback) {
      throw new Error(result.error || 'LibreOffice conversion failed')
    }
    // Fallback to docx library
    logger.info('EXPORT', 'export.docx_fallback_to_docx_library', { reason: result.error })
  } catch (err) {
    logger.info('EXPORT', 'export.docx_libreoffice_error', { error: (err as Error).message })
  }

  // Fallback: use docx library (original approach)
  logger.info('EXPORT', 'export.docx_fallback_start')
  const logoData = await fetchLogo()
  const doc = buildDocx(c, logoData)
  const blob = await Packer.toBlob(doc)
  const buffer = await blob.arrayBuffer()
  await window.electronAPI.writeFileToPath(filePath, new Uint8Array(buffer))
  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  logger.info('EXPORT', 'export.docx_fallback_complete', { filePath, duration, bytes: buffer.byteLength })
}

/**
 * PDF export — prints the exact Preview HTML via Electron printToPDF,
 * guaranteeing preview == downloaded PDF.
 */
export async function exportPdf(data: ExportData, filePath: string): Promise<void> {
  const startTime = Date.now()
  logger.info('EXPORT', 'export.pdf_start')
  await initLogo()
  const html = buildRpsHtml(data.content)
  const ok = await window.electronAPI.exportPdfHtml(filePath, html)
  if (!ok) {
    throw new Error('Gagal mencetak PDF di proses utama Electron.')
  }
  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  logger.info('EXPORT', 'export.pdf_complete', { filePath, duration })
}
