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
  top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
}

const noBorderBorders = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
}

/** Helper: single-line text cell */
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
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    borders: opts.noBorder ? noBorderBorders : cellBorders,
    children: [new Paragraph({
      alignment: opts.align || (opts.center ? AlignmentType.CENTER : AlignmentType.LEFT),
      spacing: { after: 0 },
      children: runs,
    })],
  })
}

/** Helper: multi-line rich text cell */
function rc(html: string, opts: { size?: number; widthPct?: number; colSpan?: number; rowSpan?: number } = {}): TableCell {
  return tc(stripHtml(html), opts)
}

function tr(cells: TableCell[]): TableRow {
  return new TableRow({ children: cells })
}

function tbl(rows: TableRow[], widthPct = 100): Table {
  return new Table({ width: { size: widthPct, type: WidthType.PERCENTAGE }, rows })
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

  const W = [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7] // 14 × 7.14 ≈ 100
  const rows: TableRow[] = []

  // ── Header block (rows 1-3): logo + STIKES + prodi + tahun akademik + doc code ──
  // Row 1: logo (colspan=2, rowspan=3) + "STIKES IBNU SINA AJIBARANG" (colspan=12, rowspan=3)
  const logoCell = logoData
    ? new TableCell({
        columnSpan: 2, rowSpan: 3,
        verticalAlign: VerticalAlign.CENTER,
        borders: cellBorders,
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({ data: logoData, type: 'png' as any, transformation: { width: 80, height: 80 } })],
        })],
      })
    : tc('', { colSpan: 2, rowSpan: 3 })

  rows.push(tr([
    logoCell,
    tc('STIKES IBNU SINA AJIBARANG', { bold: true, center: true, size: 24, colSpan: 12, rowSpan: 3 }),
  ]))

  // Row 4: Title
  rows.push(tr([
    tc('RENCANA PEMBELAJARAN SEMESTER', { bold: true, center: true, size: 22, colSpan: 14 }),
  ]))

  // ── Identitas ──
  // Header row: 4 labels + 10 labels = 14
  rows.push(tr([
    tc('MATA KULIAH (MK)', { bold: true, fill: 'F0F0F0', colSpan: 4 }),
    tc(c.mata_kuliah || '', { colSpan: 2 }),
    tc('Rumpun MK', { bold: true, center: true, fill: 'F0F0F0', colSpan: 3 }),
    tc(c.rumpun_mk || '', { colSpan: 2 }),
    tc('Kode', { bold: true, center: true, fill: 'F0F0F0', colSpan: 1 }),
    tc(c.kode_mk || '', { colSpan: 2 }),
  ]))

  // BOBOT / SKS
  rows.push(tr([
    tc('Bobot (sks)', { bold: true, fill: 'F0F0F0', colSpan: 4 }),
    tc(`T = ${sksT}    P = ${sksP}`, { colSpan: 2 }),
    tc('Semester', { bold: true, center: true, fill: 'F0F0F0', colSpan: 3 }),
    tc(c.semester || '', { colSpan: 2 }),
    tc('Tgl Penyusunan', { bold: true, center: true, fill: 'F0F0F0', colSpan: 1 }),
    tc(fullDate(c.tgl_penyusunan) || '-', { colSpan: 2 }),
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
    tc('Otorisasi', { bold: true, fill: 'F0F0F0', colSpan: 2, rowSpan: 2 }),
    tc('Pengembang RPS', { bold: true, center: true, fill: 'F0F0F0', colSpan: 3 }),
    tc('Koordinator RMK', { bold: true, center: true, fill: 'F0F0F0', colSpan: 4 }),
    tc('Ketua Program Studi', { bold: true, center: true, fill: 'F0F0F0', colSpan: 3 }),
    tc('', { colSpan: 2 }),
  ]))
  rows.push(tr([
    tc(`\n\n${c.pengembang_rps || ''}\n${c.nidn_pengembang ? `NIDN. ${c.nidn_pengembang}` : ''}`, { center: true, colSpan: 3 }),
    tc(`\n\n${c.koordinator_rmk || ''}`, { center: true, colSpan: 4 }),
    tc(`\n\n${c.kaprodi || ''}\n${c.nidn_kaprodi ? `NIDN. ${c.nidn_kaprodi}` : ''}`, { center: true, colSpan: 3 }),
    tc('', { colSpan: 2 }),
  ]))

  // ── CPL / CPMK / Sub-CPMK ──
  const buildCapaianRows = (label: string, items: StructuredItem[]): TableRow[] => {
    const result: TableRow[] = []
    if (items.length === 0) {
      result.push(tr([
        tc(label, { bold: true, fill: 'F0F0F0', colSpan: 2, rowSpan: 1 }),
        tc('-', { colSpan: 12 }),
      ]))
      return result
    }
    result.push(tr([
      tc(label, { bold: true, fill: 'F0F0F0', colSpan: 2, rowSpan: items.length }),
      tc(items[0].label || '', { bold: true, colSpan: 5 }),
      tc(stripHtml(items[0].deskripsi || ''), { colSpan: 7 }),
    ]))
    for (let i = 1; i < items.length; i++) {
      result.push(tr([
        tc(items[i].label || '', { bold: true, colSpan: 5 }),
        tc(stripHtml(items[i].deskripsi || ''), { colSpan: 7 }),
      ]))
    }
    return result
  }

  buildCapaianRows('Capaian Pembelajaran Lulusan (CPL)', parseStructured(c.cpl)).forEach(r => rows.push(r))
  buildCapaianRows('Capaian Pembelajaran Mata Kuliah (CPMK)', parseStructured(c.cpmk)).forEach(r => rows.push(r))
  buildCapaianRows('Kemampuan Akhir Tiap Tahapan Belajar (Sub-CPMK)', parseStructured(c.sub_cpmk)).forEach(r => rows.push(r))

  // ── Deskripsi ──
  rows.push(tr([
    tc('Deskripsi Singkat Mata Kuliah', { bold: true, fill: 'F0F0F0', colSpan: 2 }),
    tc(stripHtml(c.deskripsi_mk || ''), { colSpan: 12 }),
  ]))

  // ── Bahan Kajian ──
  const bahan = parseStructured(c.bahan_kajian)
  if (bahan.length === 0) {
    rows.push(tr([
      tc('Bahan Kajian : Materi Pembelajaran', { bold: true, fill: 'F0F0F0', colSpan: 2, rowSpan: 1 }),
      tc('-', { colSpan: 12 }),
    ]))
  } else {
    rows.push(tr([
      tc('Bahan Kajian : Materi Pembelajaran', { bold: true, fill: 'F0F0F0', colSpan: 2, rowSpan: bahan.length }),
      tc(bahan[0].label || '', { bold: true, colSpan: 5 }),
      tc(stripHtml(bahan[0].deskripsi || bahan[0].judul || ''), { colSpan: 7 }),
    ]))
    for (let i = 1; i < bahan.length; i++) {
      rows.push(tr([
        tc(bahan[i].label || '', { bold: true, colSpan: 5 }),
        tc(stripHtml(bahan[i].deskripsi || bahan[i].judul || ''), { colSpan: 7 }),
      ]))
    }
  }

  // ── Penilaian ──
  const penilaian = parsePenilaian(c.penilaian)
  if (penilaian.length === 0) {
    rows.push(tr([
      tc('Penilaian', { bold: true, fill: 'F0F0F0', colSpan: 2, rowSpan: 1 }),
      tc('-', { colSpan: 12 }),
    ]))
  } else {
    rows.push(tr([
      tc('Penilaian', { bold: true, fill: 'F0F0F0', colSpan: 2, rowSpan: penilaian.length }),
      tc(penilaian[0].item || '', { colSpan: 5 }),
      tc(`${penilaian[0].bobot || 0}%`, { colSpan: 7 }),
    ]))
    for (let i = 1; i < penilaian.length; i++) {
      rows.push(tr([
        tc(penilaian[i].item || '', { colSpan: 5 }),
        tc(`${penilaian[i].bobot || 0}%`, { colSpan: 7 }),
      ]))
    }
  }

  // ── Pustaka ──
  const pustakaLines: string[] = []
  if (c.pustaka_utama) {
    pustakaLines.push('Utama:', ...plainLines(c.pustaka_utama))
  }
  if (c.pustaka_pendukung) {
    pustakaLines.push('Pendukung:', ...plainLines(c.pustaka_pendukung))
  }
  rows.push(tr([
    tc('Pustaka', { bold: true, fill: 'F0F0F0', colSpan: 2 }),
    tc(pustakaLines.join('\n'), { colSpan: 12 }),
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

  // Header row 1
  rows.push(tr([
    tc('No', { bold: true, center: true, fill: 'F0F0F0', rowSpan: 2 }),
    tc('Kemampuan akhir tiap tahapan belajar\n(Sub-CPMK)', { bold: true, center: true, fill: 'F0F0F0', rowSpan: 2 }),
    tc('Penilaian', { bold: true, center: true, fill: 'F0F0F0', colSpan: 2 }),
    tc('Bentuk Pembelajaran, Metode Pembelajaran,\nPenugasan Mahasiswa, [Estimasi Waktu]', { bold: true, center: true, fill: 'F0F0F0', colSpan: 2 }),
    tc('Materi Pembelajaran\n[ Pustaka ]', { bold: true, center: true, fill: 'F0F0F0', rowSpan: 2 }),
    tc('Bobot\nPenilaian (%)', { bold: true, center: true, fill: 'F0F0F0', rowSpan: 2 }),
  ]))

  // Header row 2
  rows.push(tr([
    tc('Indikator', { bold: true, center: true, fill: 'F0F0F0' }),
    tc('Kriteria & Teknik', { bold: true, center: true, fill: 'F0F0F0' }),
    tc('Luring (offline)', { bold: true, center: true, fill: 'F0F0F0' }),
    tc('Daring (online)', { bold: true, center: true, fill: 'F0F0F0' }),
  ]))

  // Data rows
  if (pertemuan.length === 0) {
    rows.push(tr([
      tc('Belum ada jadwal pertemuan. Gunakan "Generate dari Sub-CPMK" di tab Pertemuan.', { center: true, size: 16, colSpan: 8 }),
    ]))
  } else {
    pertemuan.forEach(r => {
      if (r.type === 'uts' || r.type === 'uas') {
        rows.push(tr([
          tc(r.label || (r.type === 'uts' ? 'UTS (UJIAN TENGAH SEMESTER)' : 'Evaluasi Akhir Semester'), { bold: true, center: true, fill: 'F0F0F0', colSpan: 8 }),
        ]))
        return
      }
      rows.push(tr([
        tc(String(r.no ?? ''), { center: true }),
        tc(stripHtml(r.subCpmk || '')),
        tc(stripHtml(r.indikator || '')),
        tc(stripHtml(r.kriteriaTeknik || '')),
        tc(stripHtml(r.luring || '')),
        tc(stripHtml(r.daring || '')),
        tc(stripHtml(r.materiPustaka || '')),
        tc(String(r.bobot || 0), { center: true }),
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
      { properties: { page: { size: { orientation: 'portrait' } } }, children: coverChildren },
      { properties: { page: { size: { orientation: 'landscape' } } }, children: contentChildren },
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
  const logoData = await fetchLogo()
  const doc = buildDocx(c, logoData)
  const blob = await Packer.toBlob(doc)
  const buffer = await blob.arrayBuffer()
  await window.electronAPI.writeFileToPath(filePath, new Uint8Array(buffer))
  logger.info('EXPORT', 'export.docx_complete', { size: buffer.byteLength })
  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  logger.info('EXPORT', 'export.docx_complete', { filePath, duration, bytes: buffer.byteLength })
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
