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
  BorderStyle,
} from 'docx'
import html2pdf from 'html2pdf.js'

interface ExportData {
  content: Record<string, string>
}

function parseHtmlToDocxElements(html: string): (Paragraph | Table)[] {
  if (!html) return [new Paragraph({ text: '' })]

  const elements: (Paragraph | Table)[] = []
  const temp = document.createElement('div')
  temp.innerHTML = html

  const processNode = (node: ChildNode): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || ''
      if (text.trim()) {
        elements.push(new Paragraph({ children: [new TextRun({ text })] }))
      }
      return
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return

    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()

    switch (tag) {
      case 'p':
      case 'div': {
        const runs: TextRun[] = []
        el.childNodes.forEach(child => {
          if (child.nodeType === Node.TEXT_NODE) {
            runs.push(new TextRun({ text: child.textContent || '' }))
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            const childEl = child as HTMLElement
            const childTag = childEl.tagName.toLowerCase()
            runs.push(new TextRun({
              text: childEl.textContent || '',
              bold: childTag === 'strong' || childTag === 'b',
              italics: childTag === 'em' || childTag === 'i',
              underline: childTag === 'u' ? {} : undefined,
            }))
          }
        })
        if (runs.length > 0) {
          elements.push(new Paragraph({ children: runs }))
        }
        break
      }
      case 'h1':
        elements.push(new Paragraph({
          children: [new TextRun({ text: el.textContent || '', bold: true, size: 28 })],
          heading: HeadingLevel.HEADING_1,
        }))
        break
      case 'h2':
        elements.push(new Paragraph({
          children: [new TextRun({ text: el.textContent || '', bold: true, size: 24 })],
          heading: HeadingLevel.HEADING_2,
        }))
        break
      case 'h3':
        elements.push(new Paragraph({
          children: [new TextRun({ text: el.textContent || '', bold: true, size: 22 })],
          heading: HeadingLevel.HEADING_3,
        }))
        break
      case 'ul':
      case 'ol':
        el.querySelectorAll('li').forEach(li => {
          elements.push(new Paragraph({
            children: [new TextRun({ text: li.textContent || '' })],
            bullet: { level: 0 },
          }))
        })
        break
      case 'strong':
      case 'b':
        elements.push(new Paragraph({
          children: [new TextRun({ text: el.textContent || '', bold: true })],
        }))
        break
      case 'em':
      case 'i':
        elements.push(new Paragraph({
          children: [new TextRun({ text: el.textContent || '', italics: true })],
        }))
        break
      case 'br':
        elements.push(new Paragraph({ children: [] }))
        break
      default:
        el.childNodes.forEach(processNode)
    }
  }

  temp.childNodes.forEach(processNode)
  return elements.length > 0 ? elements : [new Paragraph({ text: '' })]
}

export async function exportDocx(data: ExportData, filePath: string): Promise<void> {
  const c = data.content

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

  // Parse penilaian
  let penilaianItems: { item: string; bobot: number }[] = []
  try { penilaianItems = JSON.parse(c.penilaian || '[]') } catch { /* ignore */ }

  // Parse pertemuan
  let pertemuanItems: { no: number; subCpmk: string; indikator: string; kriteria: string; bentukMetode: string; materiPustaka: string; bobot: number }[] = []
  try { pertemuanItems = JSON.parse(c.pertemuan || '[]') } catch { /* ignore */ }

  const rpsCode = `RPS/${c.prodi?.replace(/\s+/g, '').toUpperCase() || 'PRODI'}/${c.semester || 'GANJIL'}/${c.tgl_penyusunan?.split('-')[0] || '20__'}`

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
          children: [new TextRun({ text: `${c.mata_kuliah || 'MATAKULIAH'} (${c.kode_mk || 'KODE'})`, bold: true, size: 26 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new Paragraph({
          children: [new TextRun({ text: '(Logo Universitas)', italics: true, size: 22 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Disusun Oleh :', bold: true, size: 26 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'UNIVERSITAS IBNU SINA AJIBARANG', bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: c.semester_akademik || 'TAHUN AKADEMIK 20__-20__', bold: true, size: 26 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
        }),

        // === MAIN RPS HEADER TABLE ===
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: '(Logo)', italics: true, size: 18 })], alignment: AlignmentType.CENTER })],
                  width: { size: 1500, type: WidthType.DXA },
                }),
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: 'UNIVERSITAS IBNU SINA AJIBARANG', bold: true, size: 22 })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun({ text: c.prodi || 'PROGRAM STUDI', bold: true, size: 22 })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun({ text: c.semester_akademik || 'TAHUN AJARAN 20__-20__', bold: true, size: 22 })], alignment: AlignmentType.CENTER }),
                  ],
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: rpsCode, bold: true, size: 20 })], alignment: AlignmentType.CENTER })],
                  width: { size: 2000, type: WidthType.DXA },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'RENCANA PEMBELAJARAN SEMESTER', bold: true, size: 24 })], alignment: AlignmentType.CENTER })],
                  columnSpan: 3,
                }),
              ],
            }),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),

        // I. Identitas
        new Paragraph({ spacing: { before: 300 } }),
        sectionTitle('I. IDENTITAS MATA KULIAH'),
        new Table({
          rows: [
            infoRow('Mata Kuliah (MK)', c.mata_kuliah || ''),
            infoRow('Kode', c.kode_mk || ''),
            infoRow('Rumpun MK', c.rumpun_mk || ''),
            infoRow('Bobot (SKS)', c.sks || ''),
            infoRow('Semester', c.semester || ''),
            infoRow('Tanggal Penyusunan', c.tgl_penyusunan || ''),
            infoRow('Semester Akademik', c.semester_akademik || ''),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),

        // II. Otorisasi
        new Paragraph({ spacing: { before: 300 } }),
        sectionTitle('II. OTORISASI'),
        new Table({
          rows: [
            infoRow('Pengembang RPS', c.pengembang_rps || ''),
            infoRow('Koordinator RMK', c.koordinator_rmk || ''),
            infoRow('Ketua Program Studi', c.kaprodi || ''),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),

        // III. CPL
        new Paragraph({ spacing: { before: 300 } }),
        sectionTitle('III. CAPAIAN PEMBELAJARAN LULUSAN (CPL)'),
        new Paragraph({
          children: [new TextRun({ text: 'CPL-Prodi yang dibebankan pada mata kuliah ini:', italics: true })],
          spacing: { after: 100 },
        }),
        ...parseHtmlToDocxElements(c.cpl || ''),

        // IV. CPMK
        sectionTitle('IV. CAPAIAN PEMBELAJARAN MATA KULIAH (CPMK)'),
        new Paragraph({
          children: [new TextRun({ text: 'CPMK merupakan turunan/uraian spesifik dari CPL-Prodi:', italics: true })],
          spacing: { after: 100 },
        }),
        ...parseHtmlToDocxElements(c.cpmk || ''),

        // V. Sub-CPMK
        sectionTitle('V. KEMAMPUAN AKHIR TIAP TAHAPAN BELAJAR (SUB-CPMK)'),
        ...parseHtmlToDocxElements(c.sub_cpmk || ''),

        // VI. Deskripsi MK
        sectionTitle('VI. DESKRIPSI SINGKAT MATA KULIAH'),
        new Paragraph({
          children: [new TextRun({ text: 'Deskripsi singkat mengenai relevansi dan cakupan materi/bahan kajian:', italics: true })],
          spacing: { after: 100 },
        }),
        ...parseHtmlToDocxElements(c.deskripsi_mk || ''),

        // VII. Bahan Kajian
        sectionTitle('VII. BAHAN KAJIAN / MATERI PEMBELAJARAN'),
        new Paragraph({
          children: [new TextRun({ text: 'Bahan kajian dan dijabarkan dalam materi pembelajaran:', italics: true })],
          spacing: { after: 100 },
        }),
        ...parseHtmlToDocxElements(c.bahan_kajian || ''),

        // VIII. Penilaian
        sectionTitle('VIII. PENILAIAN'),
        new Paragraph({
          children: [new TextRun({ text: 'Penilaian dilaksanakan berdasarkan PCKM dengan ketentuan:', italics: true })],
          spacing: { after: 100 },
        }),
        ...parseHtmlToDocxElements(c.penilaian_rich || ''),
        ...(penilaianItems.length > 0 ? [
          new Paragraph({
            children: [new TextRun({ text: 'Daftar Bobot Penilaian:', bold: true })],
            spacing: { before: 200 },
          }),
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'No', bold: true })] })], width: { size: 800, type: WidthType.DXA } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Komponen Penilaian', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Bobot (%)', bold: true })] })], width: { size: 1500, type: WidthType.DXA } }),
                ],
              }),
              ...penilaianItems.map((item, idx) => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(idx + 1) })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.item })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(item.bobot) })] })] }),
                ],
              })),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ] : []),

        // IX. Pustaka
        sectionTitle('IX. PUSTAKA'),
        new Paragraph({
          children: [new TextRun({ text: 'Pustaka Utama', bold: true })],
          spacing: { before: 200 },
        }),
        ...parseHtmlToDocxElements(c.pustaka_utama || ''),
        new Paragraph({
          children: [new TextRun({ text: 'Pustaka Pendukung', bold: true })],
          spacing: { before: 200 },
        }),
        ...parseHtmlToDocxElements(c.pustaka_pendukung || ''),

        // X. Dosen & Prasyarat
        sectionTitle('X. DOSEN PENGAMPU & MATA KULIAH PRASYARAT'),
        new Table({
          rows: [
            infoRow('Dosen Pengampu', c.dosen_pengampu || ''),
            infoRow('Mata Kuliah Prasyarat', c.matakuliah_syarat || ''),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),

        // XI. Jadwal Pertemuan
        ...(pertemuanItems.length > 0 ? [
          sectionTitle('XI. JADWAL PERTEMUAN'),
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'No', bold: true, size: 18 })] })], width: { size: 500, type: WidthType.DXA } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Sub-CPMK', bold: true, size: 18 })] })], width: { size: 2500, type: WidthType.DXA } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Indikator', bold: true, size: 18 })] })], width: { size: 2000, type: WidthType.DXA } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Kriteria & Teknik', bold: true, size: 18 })] })], width: { size: 2000, type: WidthType.DXA } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Bentuk/Metode', bold: true, size: 18 })] })], width: { size: 2000, type: WidthType.DXA } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Materi [Pustaka]', bold: true, size: 18 })] })], width: { size: 2000, type: WidthType.DXA } }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Bobot', bold: true, size: 18 })] })], width: { size: 800, type: WidthType.DXA } }),
                ],
              }),
              ...pertemuanItems.map(item => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(item.no), size: 18 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.subCpmk, size: 18 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.indikator, size: 18 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.kriteria, size: 18 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.bentukMetode, size: 18 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.materiPustaka, size: 18 })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.bobot ? `${item.bobot}%` : '', size: 18 })] })] }),
                ],
              })),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ] : []),

        // Signature
        new Paragraph({ spacing: { before: 600 } }),
        new Paragraph({
          children: [new TextRun({ text: 'Dibuat oleh:', italics: true })],
        }),
        new Paragraph({ spacing: { before: 400 } }),
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({ spacing: { before: 400 } }),
                    new Paragraph({
                      children: [new TextRun({ text: `( ${c.pengembang_rps || '.................'} )`, bold: true })],
                      alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({
                      children: [new TextRun({ text: 'Pengembang RPS', size: 18 })],
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                  width: { size: 50, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                  children: [
                    new Paragraph({ spacing: { before: 400 } }),
                    new Paragraph({
                      children: [new TextRun({ text: `( ${c.kaprodi || '.................'} )`, bold: true })],
                      alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({
                      children: [new TextRun({ text: 'Kaprodi', size: 18 })],
                      alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({ spacing: { before: 600 } }),
                    new Paragraph({
                      children: [new TextRun({ text: 'Mengetahui,', italics: true })],
                      alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({ spacing: { before: 400 } }),
                    new Paragraph({
                      children: [new TextRun({ text: '( ....................... )', bold: true })],
                      alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({
                      children: [new TextRun({ text: 'Ketua STIKes', size: 18 })],
                      alignment: AlignmentType.CENTER,
                    }),
                    new Paragraph({
                      children: [new TextRun({ text: 'Ibnu Sina Ajibarang', size: 18 })],
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                  width: { size: 50, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
          ],
        }),
      ],
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })

  const arrayBuffer = await blob.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)
  window.electronAPI.writeFileToPath(filePath, uint8Array)
}

export async function exportPdf(data: ExportData, filePath: string): Promise<void> {
  const c = data.content

  // Parse penilaian
  let penilaianItems: { item: string; bobot: number }[] = []
  try { penilaianItems = JSON.parse(c.penilaian || '[]') } catch { /* ignore */ }

  // Parse pertemuan
  let pertemuanItems: { no: number; subCpmk: string; indikator: string; kriteria: string; bentukMetode: string; materiPustaka: string; bobot: number }[] = []
  try { pertemuanItems = JSON.parse(c.pertemuan || '[]') } catch { /* ignore */ }

  const penilaianRows = penilaianItems.map((item, idx) =>
    `<tr><td style="padding:4px 8px;border:1px solid #ccc;">${idx + 1}</td><td style="padding:4px 8px;border:1px solid #ccc;">${item.item}</td><td style="padding:4px 8px;border:1px solid #ccc;">${item.bobot}%</td></tr>`
  ).join('')

  const pertemuanRows = pertemuanItems.map(item =>
    `<tr>
      <td style="padding:4px;border:1px solid #ccc;text-align:center;">${item.no}</td>
      <td style="padding:4px;border:1px solid #ccc;">${item.subCpmk}</td>
      <td style="padding:4px;border:1px solid #ccc;">${item.indikator}</td>
      <td style="padding:4px;border:1px solid #ccc;">${item.kriteria}</td>
      <td style="padding:4px;border:1px solid #ccc;">${item.bentukMetode}</td>
      <td style="padding:4px;border:1px solid #ccc;">${item.materiPustaka}</td>
      <td style="padding:4px;border:1px solid #ccc;text-align:center;">${item.bobot ? item.bobot + '%' : ''}</td>
    </tr>`
  ).join('')

  const rpsCode = `RPS/${c.prodi?.replace(/\s+/g, '').toUpperCase() || 'PRODI'}/${c.semester || 'GANJIL'}/${c.tgl_penyusunan?.split('-')[0] || '20__'}`

  const html = `
    <div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; max-width: 800px; margin: 0 auto;">

      <!-- COVER PAGE -->
      <div style="text-align: center; border: 2px solid #000; padding: 2rem; margin-bottom: 2rem; page-break-after: always;">
        <p style="font-weight: bold; font-size: 14pt; margin: 0.3em 0;">RENCANA PEMBELAJARAN SEMESTER (RPS)</p>
        <p style="font-weight: bold; font-size: 14pt; margin: 0.3em 0;">${c.semester === 'Ganjil' ? 'GANJIL' : c.semester === 'Genap' ? 'GENAP' : 'GANJIL/GENAP'}</p>
        <p style="font-weight: bold; font-size: 14pt; margin: 0.3em 0;">${c.semester_akademik || 'TAHUN AKADEMIK 20__-20__'}</p>
        <p style="font-weight: bold; font-size: 14pt; margin: 0.3em 0;">${c.mata_kuliah || 'MATAKULIAH'} (${c.kode_mk || 'KODE'})</p>
        <div style="margin: 2rem 0;"><img src="./logo-unisina.png" style="width: 180px; height: 180px; object-fit: contain;" /></div>
        <p style="font-weight: bold; font-size: 14pt; margin: 0.3em 0;">Disusun Oleh :</p>
        <p style="font-weight: bold; font-size: 14pt; margin: 0.3em 0;">UNIVERSITAS IBNU SINA AJIBARANG</p>
        <p style="font-weight: bold; font-size: 14pt; margin: 0.3em 0;">${c.semester_akademik || 'TAHUN AKADEMIK 20__-20__'}</p>
      </div>

      <!-- MAIN RPS HEADER TABLE -->
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 1rem;">
        <tr>
          <td style="width: 10%; border: 1px solid #000; text-align: center; vertical-align: middle;"><img src="./logo-unisina.png" style="width: 60px; height: 60px; object-fit: contain;" /></td>
          <td style="border: 1px solid #000; text-align: center;">
            <p style="font-weight: bold; margin: 0.2em 0;">UNIVERSITAS IBNU SINA AJIBARANG</p>
            <p style="font-weight: bold; margin: 0.2em 0;">${c.prodi || 'PROGRAM STUDI'}</p>
            <p style="font-weight: bold; margin: 0.2em 0;">${c.semester_akademik || 'TAHUN AJARAN 20__-20__'}</p>
          </td>
          <td style="width: 15%; border: 1px solid #000; text-align: center; vertical-align: middle;">
            <p style="font-weight: bold; margin: 0;">${rpsCode}</p>
          </td>
        </tr>
        <tr>
          <td colspan="3" style="border: 1px solid #000; text-align: center; background: #f2f2f2;">
            <p style="font-weight: bold; font-size: 12pt; margin: 0.3em 0;">RENCANA PEMBELAJARAN SEMESTER</p>
          </td>
        </tr>
      </table>

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px;">I. IDENTITAS MATA KULIAH</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="width: 200px; font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Mata Kuliah</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.mata_kuliah || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Kode</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.kode_mk || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Rumpun MK</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.rumpun_mk || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Bobot (SKS)</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.sks || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Semester</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.semester || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Tgl Penyusunan</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.tgl_penyusunan || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Semester Akademik</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.semester_akademik || ''}</td></tr>
      </table>

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">II. OTORISASI</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="width: 200px; font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Pengembang RPS</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.pengembang_rps || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Koordinator RMK</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.koordinator_rmk || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Ketua Program Studi</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.kaprodi || ''}</td></tr>
      </table>

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">III. CAPAIAN PEMBELAJARAN LULUSAN (CPL)</h2>
      <p style="font-style: italic; margin-bottom: 0.5rem;">CPL-Prodi yang dibebankan pada mata kuliah ini:</p>
      <div>${c.cpl || '<em>Belum diisi</em>'}</div>

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">IV. CAPAIAN PEMBELAJARAN MATA KULIAH (CPMK)</h2>
      <p style="font-style: italic; margin-bottom: 0.5rem;">CPMK merupakan turunan/uraian spesifik dari CPL-Prodi:</p>
      <div>${c.cpmk || '<em>Belum diisi</em>'}</div>

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">V. SUB-CPMK</h2>
      <div>${c.sub_cpmk || '<em>Belum diisi</em>'}</div>

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">VI. DESKRIPSI SINGKAT MATA KULIAH</h2>
      <p style="font-style: italic; margin-bottom: 0.5rem;">Deskripsi singkat mengenai relevansi dan cakupan materi/bahan kajian:</p>
      <div>${c.deskripsi_mk || '<em>Belum diisi</em>'}</div>

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">VII. BAHAN KAJIAN / MATERI PEMBELAJARAN</h2>
      <p style="font-style: italic; margin-bottom: 0.5rem;">Bahan kajian dan dijabarkan dalam materi pembelajaran:</p>
      <div>${c.bahan_kajian || '<em>Belum diisi</em>'}</div>

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">VIII. PENILAIAN</h2>
      <p style="font-style: italic; margin-bottom: 0.5rem;">Penilaian dilaksanakan berdasarkan PCKM dengan ketentuan:</p>
      <div>${c.penilaian_rich || ''}</div>
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
        <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
          <tr style="background: #f5f5f5;">
            <th style="padding: 4px; border: 1px solid #ccc;">No</th>
            <th style="padding: 4px; border: 1px solid #ccc;">Sub-CPMK</th>
            <th style="padding: 4px; border: 1px solid #ccc;">Indikator</th>
            <th style="padding: 4px; border: 1px solid #ccc;">Kriteria</th>
            <th style="padding: 4px; border: 1px solid #ccc;">Metode</th>
            <th style="padding: 4px; border: 1px solid #ccc;">Materi</th>
            <th style="padding: 4px; border: 1px solid #ccc;">Bobot</th>
          </tr>
          ${pertemuanRows}
        </table>
      ` : ''}

      <div style="margin-top: 3rem; display: flex; justify-content: space-between;">
        <div style="text-align: center; width: 200px;">
          <p style="font-style: italic; margin-bottom: 4px;">Dibuat oleh:</p>
          <div style="height: 60px;"></div>
          <div style="border-top: 1px solid #000;"></div>
          <p style="font-weight: bold; margin-top: 4px;">${c.pengembang_rps || 'Dosen Pengampu'}</p>
          <p style="font-size: 10pt;">Pengembang RPS</p>
        </div>
        <div style="text-align: center; width: 200px;">
          <p style="font-style: italic; margin-bottom: 4px;">Mengetahui,</p>
          <div style="height: 60px;"></div>
          <div style="border-top: 1px solid #000;"></div>
          <p style="font-weight: bold; margin-top: 4px;">Kaprodi</p>
        </div>
        <div style="text-align: center; width: 200px;">
          <p style="font-style: italic; margin-bottom: 4px;">&nbsp;</p>
          <div style="height: 60px;"></div>
          <div style="border-top: 1px solid #000;"></div>
          <p style="font-weight: bold; margin-top: 4px;">Ketua STIKes</p>
          <p style="font-size: 10pt;">Ibnu Sina Ajibarang</p>
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
    margin: [15, 15, 15, 15],
    filename: filePath,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
  }

  await html2pdf().set(opt).from(container).save()
  document.body.removeChild(container)
}
