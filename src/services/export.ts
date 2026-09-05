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
  PageOrientation,
  VerticalAlign,
  ShadingType,
  BorderStyle,
  ImageRun,
} from 'docx'
import html2pdf from 'html2pdf.js'
import { logger } from '../utils/logger'
import { stripHtml } from '../utils/html'
import logoDataUrl from '../assets/logo-unisina.png?inline'

interface ExportData {
  content: Record<string, string>
}

interface StructuredItem {
  label: string
  deskripsi: string
  cpmk?: string
  judul?: string
}

interface PenilaianItem {
  item: string
  bobot: number
}

interface PertemuanItem {
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

// ── Shared table model (mirrors the Excel→HTML reference layout) ──

interface Cell {
  /** Plain text (rich text is passed via html) */
  text?: string
  /** Rich HTML — rendered as-is in PDF, flattened for DOCX */
  html?: string
  colSpan?: number
  rowSpan?: number
  bold?: boolean
  center?: boolean
  fill?: string
  size?: number
}

type Row = Cell[]

const TOTAL_COLS = 14

function parseStructuredList(json: string): StructuredItem[] {
  try { return JSON.parse(json || '[]') } catch { return [] }
}

function parsePenilaian(json: string): PenilaianItem[] {
  try { return JSON.parse(json || '[]') } catch { return [] }
}

function parsePertemuan(json: string): PertemuanItem[] {
  try { return JSON.parse(json || '[]') } catch { return [] }
}

const monthNames: Record<string, string> = {
  '01': 'JANUARI', '02': 'FEBRUARI', '03': 'MARET', '04': 'APRIL',
  '05': 'MEI', '06': 'JUNI', '07': 'JULI', '08': 'AGUSTUS',
  '09': 'SEPTEMBER', '10': 'OKTOBER', '11': 'NOVEMBER', '12': 'DESEMBER',
}

function formatFullDate(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    const day = parts[2]
    const month = monthNames[parts[1]] || parts[1]
    const year = parts[0]
    return `${day} ${month.charAt(0) + month.slice(1).toLowerCase()} ${year}`
  }
  return dateStr
}

function cellText(cell: Cell): string {
  if (cell.html) return stripHtml(cell.html)
  return cell.text || ''
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Split rich text / plain text into lines (for DOCX multi-paragraph cells) */
function toLines(text: string): string[] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
}

function prodiCode(prodi: string): string {
  const upper = (prodi || '').toUpperCase().replace(/\s+/g, '')
  return upper || 'S1FARMASI'
}

function rpsCode(c: Record<string, string>): string {
  const semester = c.semester === 'Ganjil' ? 'GANJIL' : c.semester === 'Genap' ? 'GENAP' : 'GENAP'
  const year = (c.semester_akademik || '2025-2026').split('-')[1] || '2026'
  return `RPS/${prodiCode(c.prodi)}/${semester}/${year}`
}

function headerLabel(c: Record<string, string>, label: string): string {
  return label.replace('{prodi}', c.prodi || 'S1 FARMASI').replace('{tahun}', c.semester_akademik || '2025-2026')
}

// ── Row builders (reference layout) ──

function buildMainRows(c: Record<string, string>): Row[] {
  const rows: Row[] = []

  const cplItems = parseStructuredList(c.cpl)
  const cpmkItems = parseStructuredList(c.cpmk)
  const subCpmkItems = parseStructuredList(c.sub_cpmk)
  const bahanKajianItems = parseStructuredList(c.bahan_kajian)
  const penilaianItems = parsePenilaian(c.penilaian)

  // Header block (rows 1-3): logo | STIKES | code
  const cpRowSpan = 1 + cplItems.length + 1 + cpmkItems.length + 1 + subCpmkItems.length

  const logoCell: Cell = { html: '', text: '[LOGO]', colSpan: 2, rowSpan: 3, center: true }

  rows.push([
    logoCell,
    { text: headerLabel(c, 'STIKES IBNU SINA AJIBARANG'), colSpan: 10, center: true, bold: true, size: 11 },
    { text: rpsCode(c), colSpan: 2, rowSpan: 3, center: true, size: 9 },
  ])
  rows.push([
    { text: headerLabel(c, 'PROGRAM STUDI {prodi}'), colSpan: 10, center: true, bold: true, size: 11 },
  ])
  rows.push([
    { text: headerLabel(c, 'TAHUN AJARAN {tahun}'), colSpan: 10, center: true, bold: true, size: 11 },
  ])

  // Title
  rows.push([
    { text: 'RENCANA PEMBELAJARAN SEMESTER', colSpan: TOTAL_COLS, center: true, bold: true, size: 12, fill: 'F2F2F2' },
  ])

  // Identitas header
  rows.push([
    { text: 'MATA KULIAH (MK)', colSpan: 4, bold: true, center: true, fill: 'F2F2F2' },
    { text: 'KODE', colSpan: 2, bold: true, center: true, fill: 'F2F2F2' },
    { text: 'Rumpun MK', colSpan: 3, bold: true, center: true, fill: 'F2F2F2' },
    { text: 'BOBOT (sks)', colSpan: 2, bold: true, center: true, fill: 'F2F2F2' },
    { text: 'SEMESTER', bold: true, center: true, fill: 'F2F2F2' },
    { text: 'Tgl Penyusunan', colSpan: 2, bold: true, center: true, fill: 'F2F2F2' },
  ])

  // Identitas values
  rows.push([
    { text: c.mata_kuliah || '', colSpan: 4 },
    { text: c.kode_mk || '', colSpan: 2 },
    { text: c.rumpun_mk || '', colSpan: 3 },
    { text: `T= ${c.sks_t || '-'} P= ${c.sks_p || '-'}`, colSpan: 2, center: true },
    { text: c.semester || '', center: true },
    { text: formatFullDate(c.tgl_penyusunan), colSpan: 2 },
  ])

  // Otorisasi
  rows.push([
    { text: 'OTORISASI', colSpan: 4, rowSpan: 2, center: true, bold: true, fill: 'F2F2F2' },
    { text: 'Pengembang RPS', colSpan: 3, bold: true, center: true, fill: 'F2F2F2' },
    { text: 'Koordinator RMK', colSpan: 4, bold: true, center: true, fill: 'F2F2F2' },
    { text: 'Ketua Program Studi', colSpan: 3, bold: true, center: true, fill: 'F2F2F2' },
  ])
  rows.push([
    { text: c.pengembang_rps || '', colSpan: 3, center: true },
    { text: c.koordinator_rmk || '', colSpan: 4, center: true },
    { text: c.kaprodi || '', colSpan: 3, center: true },
  ])

  // CP block
  rows.push([
    { text: 'Capaian Pembelajaran (CP)', colSpan: 2, rowSpan: cpRowSpan, center: true, bold: true, fill: 'F2F2F2' },
    { text: 'CPL-PRODI yang dibebankan pada MK', colSpan: 5, bold: true, fill: 'F2F2F2' },
    { text: '', colSpan: 7 },
  ])
  cplItems.forEach(item => {
    rows.push([
      { text: item.label || 'CPL', bold: true, center: true },
      { text: item.deskripsi || '', colSpan: 11 },
    ])
  })
  rows.push([
    { text: 'Capaian Pembelajaran Mata Kuliah (CPMK)', colSpan: 5, bold: true, fill: 'F2F2F2' },
    { text: '', colSpan: 7 },
  ])
  cpmkItems.forEach(item => {
    rows.push([
      { text: item.label || 'CPMK', bold: true, center: true },
      { text: item.deskripsi || '', colSpan: 11 },
    ])
  })
  rows.push([
    { text: 'Kemampuan akhir tiap tahapan belajar (Sub-CPMK)', colSpan: 5, bold: true, fill: 'F2F2F2' },
    { text: '', colSpan: 7 },
  ])
  subCpmkItems.forEach(item => {
    rows.push([
      { text: item.label || 'Sub-CPMK', bold: true, center: true },
      { text: item.deskripsi || '', colSpan: 11 },
    ])
  })

  // Deskripsi Singkat MK
  rows.push([
    { text: 'Deskripsi Singkat MK', colSpan: 2, bold: true, center: true, fill: 'F2F2F2' },
    { html: c.deskripsi_mk || '', colSpan: 12 },
  ])

  // Bahan Kajian
  rows.push([
    { text: 'Bahan Kajian: Materi Pembelajaran', colSpan: 2, rowSpan: Math.max(bahanKajianItems.length, 1), center: true, bold: true, fill: 'F2F2F2' },
    ...(bahanKajianItems.length === 0
      ? [{ text: 'Belum diisi', colSpan: 12 }]
      : bahanKajianItems.map((item, idx): Cell => ({
          text: `${item.label || idx + 1}. ${[item.judul, item.deskripsi].filter(Boolean).join(' ')}`,
          colSpan: 12,
        }))),
  ])

  // Penilaian
  rows.push([
    { text: 'Penilaian', colSpan: 2, rowSpan: Math.max(penilaianItems.length, 1), center: true, bold: true, fill: 'F2F2F2' },
    ...(penilaianItems.length === 0
      ? [{ text: 'Belum diisi', colSpan: 12 }]
      : penilaianItems.map((item): Cell => ({ text: `${item.item} : ${item.bobot}`, colSpan: 12 }))),
  ])

  // Pustaka
  const pustakaUtamaLines = toLines(cellText({ html: c.pustaka_utama || '' }))
  const pustakaPendukungLines = toLines(cellText({ html: c.pustaka_pendukung || '' }))
  const pustakaRows = 2 + Math.max(pustakaUtamaLines.length, 1) + 2 + Math.max(pustakaPendukungLines.length, 1)
  rows.push([
    { text: 'Pustaka', colSpan: 2, rowSpan: pustakaRows, center: true, bold: true, fill: 'F2F2F2' },
    { text: 'Utama :', colSpan: 2, bold: true },
    { text: '', colSpan: 10 },
  ])
  if (pustakaUtamaLines.length === 0) {
    rows.push([{ text: '', colSpan: 12 }])
  } else {
    pustakaUtamaLines.forEach(line => rows.push([{ text: line, colSpan: 12 }]))
  }
  rows.push([
    { text: 'Pendukung :', colSpan: 2, bold: true },
    { text: '', colSpan: 10 },
  ])
  if (pustakaPendukungLines.length === 0) {
    rows.push([{ text: '', colSpan: 12 }])
  } else {
    pustakaPendukungLines.forEach(line => rows.push([{ text: line, colSpan: 12 }]))
  }

  // Dosen Pengampu & Matakuliah syarat
  rows.push([
    { text: 'Dosen Pengampu', colSpan: 2, bold: true, center: true, fill: 'F2F2F2' },
    { text: c.dosen_pengampu || '', colSpan: 12 },
  ])
  rows.push([
    { text: 'Matakuliah syarat', colSpan: 2, bold: true, center: true, fill: 'F2F2F2' },
    { text: c.matakuliah_syarat || '', colSpan: 12 },
  ])

  return rows
}

function buildPertemuanRows(c: Record<string, string>): Row[] {
  const items = parsePertemuan(c.pertemuan)
  const rows: Row[] = []

  // Header row 1 — mirrors the Excel→HTML reference (5 stacked header rows)
  rows.push([
    { text: 'No', rowSpan: 5, center: true, bold: true, fill: 'F2F2F2' },
    { text: 'Kemampuan akhir tiap tahapan belajar', colSpan: 2, center: true, bold: true, fill: 'F2F2F2' },
    { text: 'Penilaian', colSpan: 5, rowSpan: 4, center: true, bold: true, fill: 'F2F2F2' },
    { text: 'Bentuk Pembelajaran,', colSpan: 3, center: true, bold: true, fill: 'F2F2F2' },
    { text: 'Materi Pembelajaran', colSpan: 2, center: true, bold: true, fill: 'F2F2F2' },
    { text: 'Bobot Penilaian (%)', rowSpan: 5, center: true, bold: true, fill: 'F2F2F2' },
  ])
  // Header row 2
  rows.push([
    { text: '(Sub-CPMK)', colSpan: 2, center: true, bold: true, fill: 'F2F2F2' },
    { text: 'Metode Pembelajaran,', colSpan: 3, center: true, bold: true, fill: 'F2F2F2' },
    { text: '[ Pustaka ]', colSpan: 2, center: true, bold: true, fill: 'F2F2F2' },
  ])
  // Header row 3
  rows.push([
    { text: '', colSpan: 2 },
    { text: 'Penugasan Mahasiswa,', colSpan: 3, center: true, bold: true, fill: 'F2F2F2' },
    { text: '', colSpan: 2 },
  ])
  // Header row 4
  rows.push([
    { text: '', colSpan: 2 },
    { text: '[ Estimasi Waktu ]', colSpan: 3, center: true, bold: true, fill: 'F2F2F2' },
    { text: '', colSpan: 2 },
  ])
  // Header row 5
  rows.push([
    { text: '', colSpan: 2 },
    { text: 'Indikator', colSpan: 2, center: true, bold: true, fill: 'F2F2F2' },
    { text: 'Kriteria & Teknik', colSpan: 3, center: true, bold: true, fill: 'F2F2F2' },
    { text: 'Luring (offline)', center: true, bold: true, fill: 'F2F2F2' },
    { text: 'Daring (online)', colSpan: 2, center: true, bold: true, fill: 'F2F2F2' },
    { text: '', colSpan: 2 },
  ])

  if (items.length === 0) {
    rows.push([{ text: 'Belum diisi', colSpan: TOTAL_COLS, center: true }])
    return rows
  }

  items.forEach(item => {
    if (item.type === 'uts' || item.type === 'uas') {
      rows.push([{ text: item.label || '', colSpan: TOTAL_COLS, center: true, bold: true, fill: 'F2F2F2' }])
      return
    }
    rows.push([
      { text: String(item.no || ''), center: true },
      { html: item.subCpmk || '', colSpan: 2 },
      { html: item.indikator || '', colSpan: 2 },
      { html: item.kriteriaTeknik || '', colSpan: 3 },
      { html: item.luring || item.bentukMetodePenugasan || '', },
      { html: item.daring || '', colSpan: 2 },
      { html: item.materiPustaka || '', colSpan: 2 },
      { text: item.bobot ? `${item.bobot}%` : '', center: true },
    ])
  })

  return rows
}

function buildSignatureRows(c: Record<string, string>): Row[] {
  const rows: Row[] = []
  rows.push([
    { text: 'Dibuat di Tempat,', colSpan: 7, size: 9 },
    { text: 'Dibuat di Tempat,', colSpan: 7, size: 9 },
  ])
  rows.push([
    { text: '', colSpan: 7 },
    { text: '', colSpan: 7 },
  ])
  rows.push([
    { text: `( ${c.pengembang_rps || '.................'} )`, colSpan: 7, center: true, bold: true, size: 10 },
    { text: `( ${c.dosen_pengampu || '.................'} )`, colSpan: 7, center: true, bold: true, size: 10 },
  ])
  rows.push([
    { text: `NIDN. ${c.nidn_pengembang || '...........'}`, colSpan: 7, center: true, size: 9 },
    { text: `NIDN. ${c.nidn_pengembang || '...........'}`, colSpan: 7, center: true, size: 9 },
  ])
  rows.push([
    { text: 'Pengembang RPS', colSpan: 7, center: true, size: 9 },
    { text: 'Dosen Pengampu', colSpan: 7, center: true, size: 9 },
  ])
  rows.push([
    { text: 'Mengetahui,', colSpan: 7, size: 9 },
    { text: 'Mengetahui,', colSpan: 7, size: 9 },
  ])
  rows.push([
    { text: '', colSpan: 7 },
    { text: '', colSpan: 7 },
  ])
  rows.push([
    { text: `( ${c.kaprodi || '.................'} )`, colSpan: 7, center: true, bold: true, size: 10 },
    { text: `( ${c.wakil_ketua_i || '.................'} )`, colSpan: 7, center: true, bold: true, size: 10 },
  ])
  rows.push([
    { text: `NIDN. ${c.nidn_kaprodi || '...........'}`, colSpan: 7, center: true, size: 9 },
    { text: `NIDN. ${c.nidn_wakil_ketua_i || '...........'}`, colSpan: 7, center: true, size: 9 },
  ])
  rows.push([
    { text: `Kaprodi ${c.prodi || 'S1 Farmasi'}`, colSpan: 7, center: true, size: 9 },
    { text: 'Wakil Ketua I Bidang Akademik', colSpan: 7, center: true, size: 9 },
  ])
  rows.push([
    { text: '', colSpan: 7 },
    { text: '', colSpan: 7 },
  ])
  rows.push([
    { text: `Mengetahui,\n( ${c.ketua_stikes || '.................'} )`, colSpan: 7, center: true, size: 9 },
    { text: '', colSpan: 7 },
  ])
  rows.push([
    { text: `NIDN. ${c.nidn_ketua_stikes || '...........'}`, colSpan: 7, center: true, size: 9 },
    { text: '', colSpan: 7 },
  ])
  rows.push([
    { text: 'Ketua STIKes Ibnu Sina Ajibarang', colSpan: 7, center: true, size: 9 },
    { text: '', colSpan: 7 },
  ])
  return rows
}

// ── DOCX rendering ──

const TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
}

function docxParagraphs(cell: Cell): Paragraph[] {
  const lines = toLines(cellText(cell))
  const size = cell.size ? Math.round(cell.size * 2) : 20 // half-points, default 10pt
  if (lines.length === 0) {
    return [new Paragraph({ children: [new TextRun({ text: '', size, font: 'Times New Roman' })], alignment: AlignmentType.LEFT })]
  }
  return lines.map(line =>
    new Paragraph({
      children: [new TextRun({ text: line, bold: cell.bold, size, font: 'Times New Roman' })],
      alignment: cell.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { after: 20, line: 240 },
    })
  )
}

function docxCell(cell: Cell): TableCell {
  return new TableCell({
    children: docxParagraphs(cell),
    columnSpan: cell.colSpan,
    rowSpan: cell.rowSpan,
    verticalAlign: VerticalAlign.CENTER,
    shading: cell.fill ? { type: ShadingType.CLEAR, fill: cell.fill } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
  })
}

function docxTable(rows: Row[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    rows: rows.map(r => new TableRow({ children: r.map(docxCell) })),
  })
}

function decodeLogoDataUrl(dataUrl: string): Uint8Array {
  const b64 = dataUrl.split(',')[1] || ''
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

export async function exportDocx(data: ExportData, filePath: string): Promise<void> {
  const startTime = Date.now()
  const c = data.content
  logger.info('EXPORT', 'export.docx_start')

  const mainRows = buildMainRows(c)
  const pertemuanRows = buildPertemuanRows(c)
  const signatureRows = buildSignatureRows(c)

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Times New Roman', size: 20 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { orientation: PageOrientation.LANDSCAPE },
          margin: { top: 720, bottom: 720, left: 720, right: 720 },
        },
      },
      children: [
        docxTableWithLogo(mainRows, decodeLogoDataUrl(logoDataUrl)),
        new Paragraph({ spacing: { before: 40, after: 40 } }),
        docxTable(pertemuanRows),
        new Paragraph({ spacing: { before: 200 } }),
        docxTable(signatureRows),
      ],
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  const uint8Array = new Uint8Array(buffer)
  await window.electronAPI.writeFileToPath(filePath, uint8Array)
  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  logger.info('EXPORT', 'export.docx_complete', { filePath, duration })
}

function docxTableWithLogo(rows: Row[], logoBytes: Uint8Array): Table {
  const first = rows[0]
  const headerCell = new TableCell({
    children: [
      new Paragraph({
        children: [new ImageRun({ type: 'png', data: logoBytes, transformation: { width: 40, height: 40 } })],
        alignment: AlignmentType.CENTER,
      }),
    ],
    columnSpan: 2,
    rowSpan: 3,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
  })
  const allRows: TableRow[] = rows.map((r, idx) => {
    if (idx === 0) {
      const [_, ...rest] = r
      return new TableRow({ children: [headerCell, ...rest.map(docxCell)] })
    }
    return new TableRow({ children: r.map(docxCell) })
  })
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    rows: allRows,
  })
}

// ── PDF rendering ──

function pdfCell(cell: Cell): string {
  const size = cell.size || 10
  const style = [
    'border:1px solid #000',
    'padding:3px 5px',
    `font-size:${size}pt`,
    'font-family:Times New Roman, serif',
    'vertical-align:top',
    cell.center ? 'text-align:center' : 'text-align:left',
    cell.fill ? `background:${cell.fill}` : '',
  ].filter(Boolean).join(';')
  const attrs = [
    `style="${style}"`,
    cell.colSpan ? `colspan="${cell.colSpan}"` : '',
    cell.rowSpan ? `rowspan="${cell.rowSpan}"` : '',
  ].filter(Boolean).join(' ')

  let content: string
  if (cell.html) {
    content = `<div style="font-size:${size}pt;font-family:Times New Roman, serif;line-height:1.3;">${cell.html}</div>`
  } else {
    const lines = toLines(cell.text || '')
    content = lines.length
      ? lines.map(l => `<div style="font-size:${size}pt;font-family:Times New Roman, serif;line-height:1.3;">${escapeHtml(l)}</div>`).join('')
      : '&nbsp;'
  }
  const strong = cell.bold ? `<strong>${content}</strong>` : content
  return `<td ${attrs}>${strong}</td>`
}

function pdfTable(rows: Row[]): string {
  return `<table style="width:100%;border-collapse:collapse;border:1px solid #000;">${rows.map(r => `<tr>${r.map(pdfCell).join('')}</tr>`).join('')}</table>`
}

function buildPdfHtml(c: Record<string, string>): string {
  const main = buildMainRows(c)
  // Inline logo as data URL (avoids file:// CORS issues in packaged apps)
  main[0][0] = {
    colSpan: 2,
    rowSpan: 3,
    center: true,
    html: `<img src="${logoDataUrl}" style="width:70px;height:70px;object-fit:contain;" />`,
  }
  const pertemuan = buildPertemuanRows(c)
  const signature = buildSignatureRows(c)

  return `
    <div style="width:100%;font-family:Times New Roman, serif;">
      ${pdfTable(main)}
      <div style="height:6px;"></div>
      ${pdfTable(pertemuan)}
      <div style="height:6px;"></div>
      ${pdfTable(signature)}
    </div>
  `
}

export async function exportPdf(data: ExportData, filePath: string): Promise<void> {
  const startTime = Date.now()
  const c = data.content
  logger.info('EXPORT', 'export.pdf_start')

  const html = buildPdfHtml(c)

  const container = document.createElement('div')
  container.innerHTML = html
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '1122px' // A4 landscape @96dpi
  document.body.appendChild(container)

  try {
    const worker = html2pdf()
      .set({
        margin: [8, 8, 8, 8],
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 1122 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      })
      .from(container)
      .toContainer()
      .toCanvas()
      .toPdf()

    const pdf = await worker.get('pdf')
    const buffer = pdf.output('arraybuffer')
    await window.electronAPI.writeFileToPath(filePath, new Uint8Array(buffer))
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    logger.info('EXPORT', 'export.pdf_complete', { filePath, duration, bytes: buffer.byteLength })
  } finally {
    document.body.removeChild(container)
  }
}