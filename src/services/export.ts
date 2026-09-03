import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  TableRow,
  TableCell,
  Table,
  WidthType,
} from 'docx'
import html2pdf from 'html2pdf.js'
import { logger } from '../utils/logger'

interface ExportData {
  content: Record<string, string>
}

interface StructuredItem {
  label: string
  deskripsi: string
  cpmk?: string
  judul?: string
}

interface PertemuanItem {
  no: number
  subCpmk: string
  indikator: string
  kriteria: string
  bentuk: string
  metodeOffline: string
  metodeOnline: string
  penugasan: string
  estimasiWaktu: string
  materiPustaka: string
  bobot: number
  type?: string
  label?: string
}

function parseStructuredList(json: string): StructuredItem[] {
  try { return JSON.parse(json || '[]') } catch { return [] }
}

function parsePertemuan(json: string): PertemuanItem[] {
  try { return JSON.parse(json || '[]') } catch { return [] }
}

function renderStructuredList(items: StructuredItem[], prefix: string): string {
  if (!items.length) return '<em>Belum diisi</em>'
  return items.map((item, idx) => {
    const label = item.label || (prefix === 'Sub-CPMK' ? `${prefix}${idx + 1}` : `${prefix}-${idx + 1}`)
    return `<p><strong>${label}</strong>: ${item.deskripsi || ''}</p>`
  }).join('')
}

const monthNames: Record<string, string> = {
  '01': 'JANUARI', '02': 'FEBRUARI', '03': 'MARET', '04': 'APRIL',
  '05': 'MEI', '06': 'JUNI', '07': 'JULI', '08': 'AGUSTUS',
  '09': 'SEPTEMBER', '10': 'OKTOBER', '11': 'NOVEMBER', '12': 'DESEMBER',
}

function formatCoverDate(dateStr: string): string {
  if (!dateStr) return 'BULAN TAHUN'
  const parts = dateStr.split('-')
  if (parts.length === 3) return `${monthNames[parts[1]] || parts[1]}, ${parts[0]}`
  return dateStr
}

export async function exportDocx(data: ExportData, filePath: string): Promise<void> {
  const startTime = Date.now()
  const c = data.content
  const pertemuanItems = parsePertemuan(c.pertemuan)
  logger.info('EXPORT', 'export.docx_start', { pertemuanRows: pertemuanItems.length })

  const sectionTitle = (text: string) => new Paragraph({
    children: [new TextRun({ text, bold: true, size: 24 })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
  })

  const infoRow = (label: string, value: string) => new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
        width: { size: 3000, type: WidthType.DXA },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: value })] })],
      }),
    ],
  })

  const infoTable = (rows: [string, string][]) => new Table({
    rows: rows.map(([label, val]) => infoRow(label, val || '')),
  })

  const penilaianItems = JSON.parse(c.penilaian || '[]') as { item: string; bobot: number }[]
  const cplItems = parseStructuredList(c.cpl)
  const cpmkItems = parseStructuredList(c.cpmk)
  const subCpmkItems = parseStructuredList(c.sub_cpmk)
  const bahanKajianItems = parseStructuredList(c.bahan_kajian)

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      children: [
        // === COVER PAGE ===
        new Paragraph({
          children: [new TextRun({ text: 'RENCANA PEMBELAJARAN SEMESTER (RPS)', bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: c.semester === 'Ganjil' ? 'GANJIL' : c.semester === 'Genap' ? 'GENAP' : 'GANJIL/GENAP', bold: true, size: 26 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: c.semester_akademik || 'TAHUN AKADEMIK 20__-20__', bold: true, size: 26 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `${c.mata_kuliah || 'MATAKULIAH'} (${c.kode_mk || 'KODE MATAKULIAH'})`, bold: true, size: 26 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `PRODI ${c.prodi || 'PROGRAM STUDI'}`, bold: true, size: 26 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Disusun Oleh :', bold: true, size: 26 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        ...(c.pengembang_rps ? [new Paragraph({
          children: [new TextRun({ text: c.pengembang_rps, bold: true, size: 24 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        })] : []),
        ...(c.nidn_pengembang ? [new Paragraph({
          children: [new TextRun({ text: `NIDN. ${c.nidn_pengembang}`, size: 22 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        })] : []),
        new Paragraph({
          children: [new TextRun({ text: 'STIKes IBNU SINA AJIBARANG', bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: formatCoverDate(c.tgl_penyusunan), bold: true, size: 26 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),

        // === I. IDENTITAS ===
        sectionTitle('I. IDENTITAS MATA KULIAH'),
        infoTable([
          ['Program Studi', c.prodi],
          ['Mata Kuliah', c.mata_kuliah],
          ['Kode', c.kode_mk],
          ['Rumpun MK', c.rumpun_mk],
          ['SKS Teori (T)', c.sks_t],
          ['SKS Praktik (P)', c.sks_p],
          ['Semester', c.semester],
          ['Tgl Penyusunan', c.tgl_penyusunan],
          ['Semester Akademik', c.semester_akademik],
        ]),

        // === II. OTORISASI ===
        sectionTitle('II. OTORISASI'),
        infoTable([
          ['Pengembang RPS', c.pengembang_rps],
          ['NIDN', c.nidn_pengembang],
          ['Koordinator RMK', c.koordinator_rmk],
          ['Kaprodi', c.kaprodi],
          ['NIDN Kaprodi', c.nidn_kaprodi],
          ['Ketua STIKes', c.ketua_stikes],
          ['NIDN Ketua', c.nidn_ketua_stikes],
          ['Wakil Ketua I', c.wakil_ketua_i],
          ['NIDN WK I', c.nidn_wakil_ketua_i],
        ]),

        // === III. CPL ===
        sectionTitle('III. CAPAIAN PEMBELAJARAN LULUSAN (CPL)'),
        new Paragraph({ children: [new TextRun({ text: 'CPL-Prodi yang dibebankan pada mata kuliah ini:', italics: true })] }),
        ...cplItems.map(item =>
          new Paragraph({ children: [new TextRun({ text: `${item.label}: ${item.deskripsi}`, bold: true })] })
        ),

        // === IV. CPMK ===
        sectionTitle('IV. CAPAIAN PEMBELAJARAN MATA KULIAH (CPMK)'),
        new Paragraph({ children: [new TextRun({ text: 'CPMK merupakan turunan/uraian spesifik dari CPL-Prodi:', italics: true })] }),
        ...cpmkItems.map(item =>
          new Paragraph({ children: [new TextRun({ text: `${item.label}: ${item.deskripsi}`, bold: true })] })
        ),

        // === V. SUB-CPMK ===
        sectionTitle('V. KEMAMPUAN AKHIR TIAP TAHAPAN BELAJAR (SUB-CPMK)'),
        ...subCpmkItems.map(item =>
          new Paragraph({ children: [new TextRun({ text: `${item.label}: ${item.deskripsi}` })] })
        ),

        // === VI. DESKRIPSI ===
        sectionTitle('VI. DESKRIPSI SINGKAT MATA KULIAH'),
        new Paragraph({ children: [new TextRun({ text: c.deskripsi_mk || 'Belum diisi' })] }),

        // === VII. BAHAN KAJIAN ===
        sectionTitle('VII. BAHAN KAJIAN / MATERI PEMBELAJARAN'),
        ...bahanKajianItems.map(item =>
          new Paragraph({ children: [new TextRun({ text: `${item.label}. ${item.judul || ''} ${item.deskripsi}` })] })
        ),

        // === VIII. PENILAIAN ===
        sectionTitle('VIII. PENILAIAN'),
        new Paragraph({ children: [new TextRun({ text: 'Penilaian dilaksanakan berdasarkan PCKM dengan ketentuan:', italics: true })] }),
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'No', bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Komponen', bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Bobot', bold: true })] })] }),
              ],
            }),
            ...penilaianItems.map((item, idx) =>
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(idx + 1) })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.item })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${item.bobot}%` })] })] }),
                ],
              })
            ),
          ],
        }),

        // === IX. PUSTAKA ===
        sectionTitle('IX. PUSTAKA'),
        new Paragraph({ children: [new TextRun({ text: 'Pustaka Utama', bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: c.pustaka_utama || 'Belum diisi' })] }),
        new Paragraph({ children: [new TextRun({ text: 'Pustaka Pendukung', bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: c.pustaka_pendukung || '' })] }),

        // === X. DOSEN & PRASYARAT ===
        sectionTitle('X. DOSEN PENGAMPU & MATA KULIAH PRASYARAT'),
        infoTable([
          ['Dosen Pengampu', c.dosen_pengampu],
          ['Mata Kuliah Prasyarat', c.matakuliah_syarat],
        ]),

        // === XI. JADWAL PERTEMUAN ===
        ...(pertemuanItems.length > 0 ? [
          sectionTitle('XI. JADWAL PERTEMUAN'),
          new Table({
            rows: [
              new TableRow({
                children: ['No', 'Kemampuan Akhir', 'Indikator', 'Kriteria', 'Bentuk', 'Metode\nLuring', 'Metode\nDaring', 'Penugasan', 'Estimasi\nWaktu', 'Materi [Pustaka]', 'Bobot']
                  .map(h => new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18 })] })],
                    width: { size: 9, type: WidthType.PERCENTAGE },
                  })),
              }),
              ...pertemuanItems.map(item => {
                if (item.type === 'uts' || item.type === 'uas') {
                  return new TableRow({
                    children: [new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: item.label || '', bold: true, size: 18 })] })],
                      columnSpan: 11,
                    })],
                  })
                }
                return new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(item.no), size: 18 })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.subCpmk, size: 18 })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.indikator, size: 18 })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.kriteria, size: 18 })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.bentuk, size: 18 })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.metodeOffline, size: 18 })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.metodeOnline, size: 18 })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.penugasan, size: 18 })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.estimasiWaktu, size: 18 })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.materiPustaka, size: 18 })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.bobot ? `${item.bobot}%` : '', size: 18 })] })] }),
                  ],
                })
              }),
            ],
          }),
        ] : []),

        // === SIGNATURE BLOCK ===
        new Paragraph({ spacing: { before: 600 } }),
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({ spacing: { before: 100 } }),
                    new Paragraph({ children: [new TextRun({ text: `( ${c.pengembang_rps || '.................'} )`, bold: true })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun({ text: `NIDN. ${c.nidn_pengembang || '...........'}`, size: 18 })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun({ text: 'Pengembang RPS', size: 18 })], alignment: AlignmentType.CENTER }),
                  ],
                  width: { size: 50, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                  children: [
                    new Paragraph({ spacing: { before: 100 } }),
                    new Paragraph({ children: [new TextRun({ text: `( ${c.dosen_pengampu || c.pengembang_rps || '.................'} )`, bold: true })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun({ text: `NIDN. ${c.nidn_pengembang || '...........'}`, size: 18 })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun({ text: 'Dosen Pengampu', size: 18 })], alignment: AlignmentType.CENTER }),
                  ],
                  width: { size: 50, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [new TableCell({ children: [new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: 'Mengetahui,', italics: true })] })], columnSpan: 2 })],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({ spacing: { before: 100 } }),
                    new Paragraph({ children: [new TextRun({ text: `( ${c.kaprodi || '.................'} )`, bold: true })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun({ text: `NIDN. ${c.nidn_kaprodi || '...........'}`, size: 18 })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun({ text: `Kaprodi ${c.prodi || 'S1 Farmasi'}`, size: 18 })], alignment: AlignmentType.CENTER }),
                  ],
                  width: { size: 50, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                  children: [
                    new Paragraph({ spacing: { before: 100 } }),
                    new Paragraph({ children: [new TextRun({ text: `( ${c.wakil_ketua_i || '.................'} )`, bold: true })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun({ text: `NIDN. ${c.nidn_wakil_ketua_i || '...........'}`, size: 18 })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun({ text: 'Wakil Ketua I Bidang Akademik', size: 18 })], alignment: AlignmentType.CENTER }),
                  ],
                  width: { size: 50, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: 'Mengetahui,', italics: true })] }),
                    new Paragraph({ spacing: { before: 100 } }),
                    new Paragraph({ children: [new TextRun({ text: `( ${c.ketua_stikes || '.................'} )`, bold: true })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun({ text: `NIDN. ${c.nidn_ketua_stikes || '...........'}`, size: 18 })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun({ text: 'Ketua STIKes Ibnu Sina Ajibarang', size: 18 })], alignment: AlignmentType.CENTER }),
                  ],
                  width: { size: 50, type: WidthType.PERCENTAGE },
                }),
                new TableCell({ children: [new Paragraph({ spacing: { before: 100 } })], width: { size: 50, type: WidthType.PERCENTAGE } }),
              ],
            }),
          ],
        }),
      ],
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  const uint8Array = new Uint8Array(buffer)
  window.electronAPI.writeFileToPath(filePath, uint8Array)
  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  logger.info('EXPORT', 'export.docx_complete', { filePath, duration })
}

export async function exportPdf(data: ExportData, filePath: string): Promise<void> {
  const startTime = Date.now()
  const c = data.content
  const pertemuanItems = parsePertemuan(c.pertemuan)
  logger.info('EXPORT', 'export.pdf_start', { pertemuanRows: pertemuanItems.length })

  const penilaianItems = JSON.parse(c.penilaian || '[]') as { item: string; bobot: number }[]
  const cplItems = parseStructuredList(c.cpl)
  const cpmkItems = parseStructuredList(c.cpmk)
  const subCpmkItems = parseStructuredList(c.sub_cpmk)
  const bahanKajianItems = parseStructuredList(c.bahan_kajian)

  const penilaianRows = penilaianItems.map((item, idx) =>
    `<tr><td style="padding:4px 8px;border:1px solid #ccc;">${idx + 1}</td><td style="padding:4px 8px;border:1px solid #ccc;">${item.item}</td><td style="padding:4px 8px;border:1px solid #ccc;">${item.bobot}%</td></tr>`
  ).join('')

  const pertemuanRows = pertemuanItems.map(item => {
    if (item.type === 'uts' || item.type === 'uas') {
      return `<tr><td colspan="11" style="padding:4px 8px;border:1px solid #ccc;background:#f0f0f0;text-align:center;font-weight:bold;">${item.label || ''}</td></tr>`
    }
    return `<tr>
      <td style="padding:4px;border:1px solid #ccc;text-align:center;">${item.no}</td>
      <td style="padding:4px;border:1px solid #ccc;">${item.subCpmk}</td>
      <td style="padding:4px;border:1px solid #ccc;">${item.indikator}</td>
      <td style="padding:4px;border:1px solid #ccc;">${item.kriteria}</td>
      <td style="padding:4px;border:1px solid #ccc;">${item.bentuk}</td>
      <td style="padding:4px;border:1px solid #ccc;">${item.metodeOffline}</td>
      <td style="padding:4px;border:1px solid #ccc;">${item.metodeOnline}</td>
      <td style="padding:4px;border:1px solid #ccc;">${item.penugasan}</td>
      <td style="padding:4px;border:1px solid #ccc;text-align:center;">${item.estimasiWaktu}</td>
      <td style="padding:4px;border:1px solid #ccc;">${item.materiPustaka}</td>
      <td style="padding:4px;border:1px solid #ccc;text-align:center;">${item.bobot ? item.bobot + '%' : ''}</td>
    </tr>`
  }).join('')

  const html = `
    <div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; max-width: 800px; margin: 0 auto;">

      <!-- COVER PAGE -->
      <div style="text-align: center; border: 2px solid #000; padding: 2rem; margin-bottom: 2rem; page-break-after: always;">
        <p style="font-weight: bold; font-size: 14pt; margin: 0.3em 0;">RENCANA PEMBELAJARAN SEMESTER (RPS)</p>
        <p style="font-weight: bold; font-size: 14pt; margin: 0.3em 0;">${c.semester === 'Ganjil' ? 'GANJIL' : c.semester === 'Genap' ? 'GENAP' : 'GANJIL/GENAP'}</p>
        <p style="font-weight: bold; font-size: 14pt; margin: 0.3em 0;">${c.semester_akademik || 'TAHUN AKADEMIK 20__-20__'}</p>
        <p style="font-weight: bold; font-size: 14pt; margin: 0.3em 0;">${c.mata_kuliah || 'MATAKULIAH'} (${c.kode_mk || 'KODE MATAKULIAH'})</p>
        <p style="font-weight: bold; font-size: 14pt; margin: 0.3em 0;">PRODI ${c.prodi || 'PROGRAM STUDI'}</p>
        <div style="margin: 2rem 0;"><img src="./logo-unisina.png" style="width: 180px; height: 180px; object-fit: contain;" /></div>
        <p style="font-weight: bold; font-size: 14pt; margin: 0.3em 0;">Disusun Oleh :</p>
        ${c.pengembang_rps ? `<p style="font-weight: bold; font-size: 14pt; margin: 0.3em 0;">${c.pengembang_rps}</p>` : ''}
        ${c.nidn_pengembang ? `<p style="font-size: 12pt; margin: 0.3em 0;">NIDN. ${c.nidn_pengembang}</p>` : ''}
        <p style="font-weight: bold; font-size: 14pt; margin: 0.3em 0;">STIKes IBNU SINA AJIBARANG</p>
        <p style="font-weight: bold; font-size: 14pt; margin: 0.3em 0;">${formatCoverDate(c.tgl_penyusunan)}</p>
      </div>

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px;">I. IDENTITAS MATA KULIAH</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="width: 200px; font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Program Studi</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.prodi || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Mata Kuliah</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.mata_kuliah || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Kode</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.kode_mk || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Rumpun MK</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.rumpun_mk || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">SKS Teori (T)</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.sks_t || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">SKS Praktik (P)</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.sks_p || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Semester</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.semester || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Tgl Penyusunan</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.tgl_penyusunan || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Semester Akademik</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.semester_akademik || ''}</td></tr>
      </table>

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">II. OTORISASI</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="width: 200px; font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Pengembang RPS</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.pengembang_rps || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">NIDN</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.nidn_pengembang || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Koordinator RMK</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.koordinator_rmk || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Kaprodi</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.kaprodi || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">NIDN Kaprodi</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.nidn_kaprodi || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Ketua STIKes</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.ketua_stikes || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">NIDN Ketua</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.nidn_ketua_stikes || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Wakil Ketua I</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.wakil_ketua_i || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">NIDN WK I</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.nidn_wakil_ketua_i || ''}</td></tr>
      </table>

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">III. CAPAIAN PEMBELAJARAN LULUSAN (CPL)</h2>
      <p style="font-style: italic; margin-bottom: 0.5rem;">CPL-Prodi yang dibebankan pada mata kuliah ini:</p>
      ${renderStructuredList(cplItems, 'CPL')}

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">IV. CAPAIAN PEMBELAJARAN MATA KULIAH (CPMK)</h2>
      <p style="font-style: italic; margin-bottom: 0.5rem;">CPMK merupakan turunan/uraian spesifik dari CPL-Prodi:</p>
      ${renderStructuredList(cpmkItems, 'CPMK')}

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">V. SUB-CPMK</h2>
      ${renderStructuredList(subCpmkItems, 'Sub-CPMK')}

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">VI. DESKRIPSI SINGKAT MATA KULIAH</h2>
      <p style="font-style: italic; margin-bottom: 0.5rem;">Deskripsi singkat mengenai relevansi dan cakupan materi/bahan kajian:</p>
      <div>${c.deskripsi_mk || '<em>Belum diisi</em>'}</div>

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">VII. BAHAN KAJIAN / MATERI PEMBELAJARAN</h2>
      <p style="font-style: italic; margin-bottom: 0.5rem;">Bahan kajian dan dijabarkan dalam materi pembelajaran:</p>
      ${renderStructuredList(bahanKajianItems, 'Bahan Kajian')}

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">VIII. PENILAIAN</h2>
      <p style="font-style: italic; margin-bottom: 0.5rem;">Penilaian dilaksanakan berdasarkan PCKM dengan ketentuan:</p>
      ${penilaianItems.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem;">
          <tr style="background: #f5f5f5;"><th style="padding: 4px 8px; border: 1px solid #ccc; text-align: left;">No</th><th style="padding: 4px 8px; border: 1px solid #ccc; text-align: left;">Komponen</th><th style="padding: 4px 8px; border: 1px solid #ccc; text-align: left;">Bobot</th></tr>
          ${penilaianRows}
        </table>
      ` : ''}

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">IX. PUSTAKA</h2>
      <p style="font-weight: bold;">Pustaka Utama</p>
      <div>${c.pustaka_utama || '<em>Belum diisi</em>'}</div>
      <p style="font-weight: bold; margin-top: 0.5rem;">Pustaka Pendukung</p>
      <div>${c.pustaka_pendukung || ''}</div>

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">X. DOSEN PENGAMPU & MATA KULIAH PRASYARAT</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="width: 200px; font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Dosen Pengampu</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.dosen_pengampu || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Mata Kuliah Prasyarat</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.matakuliah_syarat || ''}</td></tr>
      </table>

      ${pertemuanItems.length > 0 ? `
        <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">XI. JADWAL PERTEMUAN</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
          <tr style="background: #f5f5f5;">
            <th style="padding: 4px; border: 1px solid #ccc;">No</th>
            <th style="padding: 4px; border: 1px solid #ccc;">Kemampuan Akhir</th>
            <th style="padding: 4px; border: 1px solid #ccc;">Indikator</th>
            <th style="padding: 4px; border: 1px solid #ccc;">Kriteria</th>
            <th style="padding: 4px; border: 1px solid #ccc;">Bentuk</th>
            <th style="padding: 4px; border: 1px solid #ccc;">Luring</th>
            <th style="padding: 4px; border: 1px solid #ccc;">Daring</th>
            <th style="padding: 4px; border: 1px solid #ccc;">Penugasan</th>
            <th style="padding: 4px; border: 1px solid #ccc;">Waktu</th>
            <th style="padding: 4px; border: 1px solid #ccc;">Materi</th>
            <th style="padding: 4px; border: 1px solid #ccc;">Bobot</th>
          </tr>
          ${pertemuanRows}
        </table>
      ` : ''}

      <div style="margin-top: 3rem; page-break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
          <div style="text-align: center; width: 200px;">
            <div style="height: 60px;"></div>
            <div style="border-top: 1px solid #000;"></div>
            <p style="font-weight: bold; margin-top: 4px;">${c.pengembang_rps || 'Dosen Pengampu'}</p>
            <p style="font-size: 10pt;">NIDN. ${c.nidn_pengembang || '...'}</p>
            <p style="font-size: 10pt;">Pengembang RPS</p>
          </div>
          <div style="text-align: center; width: 200px;">
            <div style="height: 60px;"></div>
            <div style="border-top: 1px solid #000;"></div>
            <p style="font-weight: bold; margin-top: 4px;">${c.dosen_pengampu || c.pengembang_rps || 'Dosen Pengampu'}</p>
            <p style="font-size: 10pt;">NIDN. ${c.nidn_pengembang || '...'}</p>
            <p style="font-size: 10pt;">Dosen Pengampu</p>
          </div>
        </div>
        <div style="margin-top: 1rem;">
          <p style="font-style: italic; margin-bottom: 8px;">Mengetahui,</p>
          <div style="display: flex; justify-content: space-between;">
            <div style="text-align: center; width: 200px;">
              <div style="height: 60px;"></div>
              <div style="border-top: 1px solid #000;"></div>
              <p style="font-weight: bold; margin-top: 4px;">${c.kaprodi || 'Kaprodi'}</p>
              <p style="font-size: 10pt;">NIDN. ${c.nidn_kaprodi || '...'}</p>
              <p style="font-size: 10pt;">Kaprodi ${c.prodi || 'S1 Farmasi'}</p>
            </div>
            <div style="text-align: center; width: 200px;">
              <div style="height: 60px;"></div>
              <div style="border-top: 1px solid #000;"></div>
              <p style="font-weight: bold; margin-top: 4px;">${c.wakil_ketua_i || 'Wakil Ketua I'}</p>
              <p style="font-size: 10pt;">NIDN. ${c.nidn_wakil_ketua_i || '...'}</p>
              <p style="font-size: 10pt;">Wakil Ketua I Bidang Akademik</p>
            </div>
          </div>
        </div>
        <div style="margin-top: 1rem;">
          <p style="font-style: italic; margin-bottom: 8px;">Mengetahui,</p>
          <div style="display: flex; justify-content: space-between;">
            <div style="text-align: center; width: 200px;">
              <div style="height: 60px;"></div>
              <div style="border-top: 1px solid #000;"></div>
              <p style="font-weight: bold; margin-top: 4px;">${c.ketua_stikes || 'Ketua STIKes'}</p>
              <p style="font-size: 10pt;">NIDN. ${c.nidn_ketua_stikes || '...'}</p>
              <p style="font-size: 10pt;">Ketua STIKes Ibnu Sina Ajibarang</p>
            </div>
            <div style="width: 200px;"></div>
          </div>
        </div>
      </div>
    </div>
  `

  const container = document.createElement('div')
  container.innerHTML = html
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  document.body.appendChild(container)

  const opt = {
    margin: [15, 15, 15, 15] as [number, number, number, number],
    filename: filePath,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
  }

  await html2pdf().set(opt).from(container).save()
  document.body.removeChild(container)
  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  logger.info('EXPORT', 'export.pdf_complete', { filePath, duration })
}
