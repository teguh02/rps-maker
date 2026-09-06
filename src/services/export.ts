/**
 * DOCX + PDF export.
 *
 * Both exports are built from the SAME canonical RPS layout as the in-app
 * Preview (see rpsDocument.ts):
 *   - PDF  → the exact HTML string shown in Preview is printed by Electron's
 *            printToPDF (no html2canvas), so Preview and the downloaded PDF
 *            are byte-for-byte the same document.
 *   - DOCX → the same sections, rendered as native Word tables/paragraphs.
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
} from 'docx'
import { logger } from '../utils/logger'
import { buildRpsHtml, fullDate } from './rpsDocument'

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

/** Rich text → Paragraph[] with hard line breaks preserved */
function richParagraphs(html: string, sizeHalf: number, bold = false, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.JUSTIFIED): Paragraph[] {
  const lines = plainLines(html)
  if (lines.length === 0) {
    return [new Paragraph({ alignment: align, spacing: { after: 40 }, children: [new TextRun({ text: '', size: sizeHalf, bold, font: FONT_TWIPS })] })]
  }
  return lines.map(line => new Paragraph({
    alignment: align,
    spacing: { after: 40 },
    children: [new TextRun({ text: line, size: sizeHalf, bold, font: FONT_TWIPS })],
  }))
}

const cellBorders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
}

function textCell(text: string, opts: { bold?: boolean; center?: boolean; size?: number; fill?: string; widthPct?: number } = {}): TableCell {
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
    width: opts.widthPct != null ? { size: opts.widthPct, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    borders: cellBorders,
    children: [new Paragraph({ alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT, children: runs })],
  })
}

function richCell(html: string, opts: { size?: number; center?: boolean; widthPct?: number } = {}): TableCell {
  return textCell(plainLines(html).join('\n'), opts)
}

function tableRow(cells: TableCell[]): TableRow {
  return new TableRow({ children: cells })
}

function table100(rows: TableRow[]): Table {
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows })
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

function buildDocx(c: Record<string, string>): Document {
  const sksT = (c.sks_t || '0').trim()
  const sksP = (c.sks_p || '0').trim()
  const mk = c.mata_kuliah || ''
  const kode = c.kode_mk || ''
  const ta = c.semester_akademik || ''
  const sem = c.semester === 'Ganjil' ? 'GANJIL' : c.semester === 'Genap' ? 'GENAP' : (c.semester || '').toUpperCase()
  const dateTxt = fullDate(c.tgl_penyusunan)
  const docCode = `RPS/${prodiCode(c)}/${sem}/${(ta.split('-')[1] || '20__').trim()}`

  const coverChildren: Array<Paragraph | Table> = []
  const contentChildren: Array<Paragraph | Table> = []

  // ── Cover (portrait) ──
  coverChildren.push(new Paragraph({ spacing: { before: 3000 }, children: [] }))
  coverChildren.push(heading('RENCANA PEMBELAJARAN SEMESTER (RPS)', 30))
  coverChildren.push(heading('GENAP', 26, 60))
  coverChildren.push(heading(`Tahun Akademik ${ta}`, 26, 60))
  coverChildren.push(new Paragraph({ spacing: { before: 1600 }, children: [] }))
  coverChildren.push(heading(`Mata Kuliah : ${mk}${kode ? ` (${kode})` : ''}`, 34, 60, 200))
  coverChildren.push(heading(`Prodi : ${c.prodi ? c.prodi.toUpperCase() : ''}`, 24, 60, 200))
  coverChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 }, children: [new TextRun({ text: 'Disusun Oleh:', size: 22, font: FONT_TWIPS })] }))
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
  coverChildren.push(new Paragraph({ spacing: { before: 4000 }, children: [] }))
  coverChildren.push(heading('STIKES IBNU SINA AJIBARANG', 28, 0))
  coverChildren.push(heading(coverMonthYear(c.tgl_penyusunan), 22, 80))

  // ── Content (landscape) ──

  // header block
  contentChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [new TextRun({ text: 'STIKES IBNU SINA AJIBARANG', bold: true, size: 24, font: FONT_TWIPS })],
  }))
  contentChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [new TextRun({ text: c.prodi ? `PROGRAM STUDI ${c.prodi.toUpperCase()}` : '', bold: true, size: 20, font: FONT_TWIPS })],
  }))
  contentChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [new TextRun({ text: `TAHUN AKADEMIK ${ta}`, bold: true, size: 20, font: FONT_TWIPS })],
  }))
  contentChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: `Kode Dokumen : ${docCode}`, size: 18, font: FONT_TWIPS })],
  }))

  contentChildren.push(heading('RENCANA PEMBELAJARAN SEMESTER', 28, 100, 200))
  contentChildren.push(sectionTitle('A. Identitas Mata Kuliah'))
  contentChildren.push(table100([
    tableRow([textCell('MATA KULIAH (MK)', { bold: true, widthPct: 24 }), textCell(c.mata_kuliah || '', { widthPct: 76 })]),
    tableRow([textCell('KODE', { bold: true, widthPct: 24 }), textCell(c.kode_mk || '', { widthPct: 76 })]),
    tableRow([textCell('Rumpun MK', { bold: true, widthPct: 24 }), textCell(c.rumpun_mk || '', { widthPct: 76 })]),
    tableRow([textCell('BOBOT (sks)', { bold: true, widthPct: 24 }), textCell(`T = ${sksT}    P = ${sksP}`, { widthPct: 76 })]),
    tableRow([textCell('SEMESTER', { bold: true, widthPct: 24 }), textCell(c.semester || '', { widthPct: 76 })]),
    tableRow([textCell('Tgl Penyusunan', { bold: true, widthPct: 24 }), textCell(dateTxt || '-', { widthPct: 76 })]),
    tableRow([textCell('Dosen Pengampu', { bold: true, widthPct: 24 }), textCell(c.dosen_pengampu || '', { widthPct: 76 })]),
    tableRow([textCell('Matakuliah Syarat', { bold: true, widthPct: 24 }), textCell(c.matakuliah_syarat || '-', { widthPct: 76 })]),
  ]))

  contentChildren.push(sectionTitle('B. Otorisasi'))
  contentChildren.push(table100([
    tableRow([
      textCell('Pengembang RPS', { bold: true, center: true, widthPct: 33 }),
      textCell('Koordinator RMK', { bold: true, center: true, widthPct: 34 }),
      textCell('Ketua Program Studi', { bold: true, center: true, widthPct: 33 }),
    ]),
    tableRow([
      textCell(`\n\n${c.pengembang_rps || ''}\n${c.nidn_pengembang ? `NIDN. ${c.nidn_pengembang}` : ''}`, { center: true, widthPct: 33 }),
      textCell(`\n\n${c.koordinator_rmk || ''}`, { center: true, widthPct: 34 }),
      textCell(`\n\n${c.kaprodi || ''}\n${c.nidn_kaprodi ? `NIDN. ${c.nidn_kaprodi}` : ''}`, { center: true, widthPct: 33 }),
    ]),
  ]))

  contentChildren.push(sectionTitle('C. Capaian Pembelajaran (CP)'))
  const cpTable = (label: string, items: StructuredItem[]) => {
    if (items.length === 0) return
    contentChildren.push(new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: label, bold: true, size: 20, font: FONT_TWIPS })],
    }))
    contentChildren.push(table100(items.map(it => tableRow([
      textCell(it.label || '', { bold: true, widthPct: 16 }),
      richCell(it.deskripsi || '', { widthPct: 84 }),
    ]))))
  }
  cpTable('CPL-PRODI yang dibebankan pada MK', parseStructured(c.cpl))
  cpTable('Capaian Pembelajaran Mata Kuliah (CPMK)', parseStructured(c.cpmk))
  cpTable('Kemampuan Akhir Tiap Tahapan Belajar (Sub-CPMK)', parseStructured(c.sub_cpmk))

  contentChildren.push(sectionTitle('D. Deskripsi Singkat Mata Kuliah'))
  richParagraphs(c.deskripsi_mk || '', 20).forEach(p => contentChildren.push(p))

  contentChildren.push(sectionTitle('E. Bahan Kajian : Materi Pembelajaran'))
  const bahan = parseStructured(c.bahan_kajian)
  if (bahan.length === 0) {
    richParagraphs('', 20).forEach(p => contentChildren.push(p))
  } else {
    contentChildren.push(table100(bahan.map(b => tableRow([
      textCell(b.label || '', { bold: true, widthPct: 8 }),
      richCell(b.deskripsi || b.judul || '', { widthPct: 92 }),
    ]))))
  }

  contentChildren.push(sectionTitle('F. Penilaian'))
  const penilaian = parsePenilaian(c.penilaian)
  const total = penilaian.reduce((s, p) => s + (p.bobot || 0), 0)
  if (penilaian.length > 0) {
    contentChildren.push(table100(penilaian.map(p => tableRow([
      textCell(p.item || '', { widthPct: 30 }),
      textCell(`${p.bobot || 0}%`, { widthPct: 70 }),
    ]))))
    contentChildren.push(new Paragraph({
      spacing: { before: 60 },
      children: [new TextRun({ text: `Total: ${total}%`, bold: true, size: 20, font: FONT_TWIPS })],
    }))
  }

  contentChildren.push(sectionTitle('G. Pustaka'))
  const pustaka = (title: string, value: string) => {
    const lines = plainLines(value)
    if (lines.length === 0) return
    contentChildren.push(new Paragraph({
      spacing: { before: 80, after: 40 },
      children: [new TextRun({ text: title, bold: true, size: 20, font: FONT_TWIPS })],
    }))
    lines.forEach(l => contentChildren.push(new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: l, size: 20, font: FONT_TWIPS })],
    })))
  }
  pustaka('Utama:', c.pustaka_utama || '')
  pustaka('Pendukung:', c.pustaka_pendukung || '')

  // ── Pertemuan table ──
  contentChildren.push(new Paragraph({ children: [new PageBreak()] }))
  contentChildren.push(heading('JADWAL PELAKSANAAN PEMBELAJARAN / PERTEMUAN', 26, 0, 160))

  // 14-column layout matching the Excel RPS reference
  const ptmHeaders = [
    { h: 'No', w: 3 },
    { h: 'Kemampuan Akhir Tiap Tahapan Belajar (Sub-CPMK)', w: 10 },
    { h: 'Indikator', w: 8 },
    { h: 'Kriteria & Teknik', w: 9 },
    { h: 'Bentuk Pembelajaran', w: 10 },
    { h: 'Metode Pembelajaran', w: 10 },
    { h: 'Penugasan Mahasiswa', w: 10 },
    { h: 'Estimasi Waktu', w: 8 },
    { h: 'Luring (offline)', w: 7 },
    { h: 'Daring (online)', w: 7 },
    { h: 'Materi Pembelajaran [Pustaka]', w: 10 },
    { h: 'Bobot (%)', w: 3 },
  ]
  const ptmRows: TableRow[] = []

  // Row 1: main headers
  ptmRows.push(tableRow(ptmHeaders.map(h => textCell(h.h, { bold: true, center: true, size: 14, fill: 'F1F5F9', widthPct: h.w }))))

  const pertemuan = parsePertemuan(c.pertemuan)
  if (pertemuan.length === 0) {
    ptmRows.push(new TableRow({
      children: [new TableCell({
        columnSpan: 12,
        borders: cellBorders,
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Belum ada jadwal pertemuan. Gunakan \u201CGenerate dari Sub-CPMK\u201D di tab Pertemuan.', size: 16, italics: true, font: FONT_TWIPS })],
        })],
      })],
    }))
  } else {
    pertemuan.forEach(r => {
      if (r.type === 'uts' || r.type === 'uas') {
        ptmRows.push(new TableRow({
          children: [new TableCell({
            columnSpan: 12,
            borders: cellBorders,
            shading: { type: ShadingType.CLEAR, fill: 'E8EDF5' },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: r.label || (r.type === 'uts' ? 'Evaluasi Tengah Semester (UTS)' : 'Evaluasi Akhir Semester (UAS)'), bold: true, size: 16, font: FONT_TWIPS })],
            })],
          })],
        }))
        return
      }
      ptmRows.push(tableRow([
        textCell(String(r.no ?? ''), { center: true, size: 14, widthPct: 3 }),
        richCell(r.subCpmk || '', { size: 14, widthPct: 10 }),
        richCell(r.indikator || '', { size: 14, widthPct: 8 }),
        richCell(r.kriteriaTeknik || '', { size: 14, widthPct: 9 }),
        richCell(r.bentukMetodePenugasan || '', { size: 14, widthPct: 10 }),
        textCell('', { size: 14, widthPct: 10 }), // Metode
        textCell('', { size: 14, widthPct: 10 }), // Penugasan
        textCell('', { size: 14, widthPct: 8 }), // Estimasi
        richCell(r.luring || '', { size: 14, widthPct: 7 }),
        richCell(r.daring || '', { size: 14, widthPct: 7 }),
        richCell(r.materiPustaka || '', { size: 14, widthPct: 10 }),
        textCell(String(r.bobot || 0), { center: true, size: 14, widthPct: 3 }),
      ]))
    })
  }
  contentChildren.push(table100(ptmRows))

  // ── TTD ──
  contentChildren.push(new Paragraph({ children: [new PageBreak()] }))
  contentChildren.push(heading('PENGESAHAN', 28, 0, 300))
  const where = dateTxt ? `Ajibarang, ${dateTxt}` : 'Ajibarang,'
  /** Signature box: header line, reserved space, dotted-ish gap, then name/NIDN/role */
  const sigCell = (top: string, name: string, nidn: string, role: string) => new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    borders: cellBorders,
    margins: { top: 120, bottom: 120, left: 120, right: 120 },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 2600 }, children: [new TextRun({ text: top || ' ', size: 20, font: FONT_TWIPS })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: name || ' ', bold: true, size: 22, font: FONT_TWIPS })] }),
      ...(nidn ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `NIDN. ${nidn}`, size: 18, font: FONT_TWIPS })] })] : []),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 }, children: [new TextRun({ text: role, size: 18, font: FONT_TWIPS })] }),
    ],
  })
  contentChildren.push(table100([
    tableRow([
      sigCell('Mengetahui,', c.kaprodi || '', c.nidn_kaprodi || '', c.prodi ? `Kaprodi ${c.prodi}` : 'Kaprodi'),
      sigCell('Mengetahui,', c.pengembang_rps || '', c.nidn_pengembang || '', 'Dosen Pengampu'),
    ]),
  ]))
  contentChildren.push(table100([
    tableRow([
      sigCell('Mengetahui,', c.ketua_stikes || '', c.nidn_ketua_stikes || '', 'Ketua STIKes Ibnu Sina Ajibarang'),
      sigCell('Mengetahui,', c.wakil_ketua_i || '', c.nidn_wakil_ketua_i || '', 'Wakil Ketua I Bidang Akademik'),
    ]),
  ]))

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

function prodiCode(c: Record<string, string>): string {
  return (c.prodi || '').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'PRODI'
}

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

// ─────────────────────────── public export API ───────────────────────────

export async function exportDocx(data: ExportData, filePath: string): Promise<void> {
  const startTime = Date.now()
  const c = data.content
  logger.info('EXPORT', 'export.docx_start')
  const doc = buildDocx(c)
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
  const html = buildRpsHtml(data.content)
  const ok = await window.electronAPI.exportPdfHtml(filePath, html)
  if (!ok) {
    throw new Error('Gagal mencetak PDF di proses utama Electron.')
  }
  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  logger.info('EXPORT', 'export.pdf_complete', { filePath, duration })
}
