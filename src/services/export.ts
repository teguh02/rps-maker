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
  ImageRun,
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

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'UNIVERSITAS IBNU SINA AJIBARANG', bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new TextRun({ text: 'RENCANA PEMBELAJARAN SEMESTER (RPS)', bold: true, size: 26 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),

        sectionTitle('I. IDENTITAS MATA KULIAH'),
        new Table({
          rows: [
            infoRow('Program Studi', c.prodi || ''),
            infoRow('Mata Kuliah', c.mata_kuliah || ''),
            infoRow('Kode MK', c.kode_mk || ''),
            infoRow('SKS', c.sks || ''),
            infoRow('Semester', c.semester || ''),
            infoRow('Dosen Pengampu', c.dosen || ''),
            infoRow('Semester Akademik', c.semester_akademik || ''),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),

        new Paragraph({ spacing: { before: 300 } }),
        sectionTitle('II. CAPAIAN PEMBELAJARAN LULUSAN (CPL)'),
        ...parseHtmlToDocxElements(c.cpl || ''),

        sectionTitle('III. CAPAIAN PEMBELAJARAN MATA KULIAH (CPMK)'),
        ...parseHtmlToDocxElements(c.cpmk || ''),

        sectionTitle('IV. SUB-CPMK'),
        ...parseHtmlToDocxElements(c.sub_cpmk || ''),

        sectionTitle('V. BAHAN KAJIAN'),
        ...parseHtmlToDocxElements(c.bahan_kajian || ''),

        sectionTitle('VI. METODE PEMBELAJARAN'),
        ...parseHtmlToDocxElements(c.metode || ''),

        sectionTitle('VII. PENGAALAMAN BELAJAR MAHASISWA'),
        ...parseHtmlToDocxElements(c.pengalaman_belajar || ''),

        sectionTitle('VIII. ASESMEN / PENILAIAN'),
        ...parseHtmlToDocxElements(c.asesmen || ''),

        sectionTitle('IX. DAFTAR REFERENSI'),
        ...parseHtmlToDocxElements(c.referensi || ''),

        new Paragraph({ spacing: { before: 600 } }),
        new Paragraph({
          children: [new TextRun({ text: 'Dosen Pengampu', bold: true })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Kaprodi', bold: true })],
          alignment: AlignmentType.RIGHT,
        }),
      ],
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })

  // In Electron, we can't use URL.createObjectURL for download, so send to main
  const arrayBuffer = await blob.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)

  // Store for main process to write
  window.electronAPI.writeFileToPath(filePath, uint8Array)
}

export async function exportPdf(data: ExportData, filePath: string): Promise<void> {
  const c = data.content

  const html = `
    <div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; max-width: 800px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 2rem;">
        <p style="font-weight: bold; font-size: 14pt; margin: 0;">UNIVERSITAS IBNU SINA AJIBARANG</p>
        <p style="font-weight: bold; font-size: 12pt; margin: 4px 0 0 0;">RENCANA PEMBELAJARAN SEMESTER (RPS)</p>
      </div>

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px;">I. IDENTITAS MATA KULIAH</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="width: 200px; font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Program Studi</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.prodi || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Mata Kuliah</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.mata_kuliah || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Kode MK</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.kode_mk || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">SKS</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.sks || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Semester</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.semester || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Dosen Pengampu</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.dosen || ''}</td></tr>
        <tr><td style="font-weight: bold; padding: 4px 8px; border: 1px solid #ccc;">Semester Akademik</td><td style="padding: 4px 8px; border: 1px solid #ccc;">${c.semester_akademik || ''}</td></tr>
      </table>

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">II. CAPAIAN PEMBELAJARAN LULUSAN (CPL)</h2>
      <div>${c.cpl || '<em>Belum diisi</em>'}</div>

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">III. CAPAIAN PEMBELAJARAN MATA KULIAH (CPMK)</h2>
      <div>${c.cpmk || '<em>Belum diisi</em>'}</div>

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">IV. SUB-CPMK</h2>
      <div>${c.sub_cpmk || '<em>Belum diisi</em>'}</div>

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">V. BAHAN KAJIAN</h2>
      <div>${c.bahan_kajian || '<em>Belum diisi</em>'}</div>

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">VI. METODE PEMBELAJARAN</h2>
      <div>${c.metode || '<em>Belum diisi</em>'}</div>

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">VII. PENGAALAMAN BELAJAR MAHASISWA</h2>
      <div>${c.pengalaman_belajar || '<em>Belum diisi</em>'}</div>

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">VIII. ASESMEN / PENILAIAN</h2>
      <div>${c.asesmen || '<em>Belum diisi</em>'}</div>

      <h2 style="font-size: 12pt; border-bottom: 2px solid #000; padding-bottom: 4px; margin-top: 1.5rem;">IX. DAFTAR REFERENSI</h2>
      <div>${c.referensi || '<em>Belum diisi</em>'}</div>

      <div style="margin-top: 3rem; display: flex; justify-content: space-between;">
        <div style="text-align: center; width: 200px;">
          <div style="height: 60px;"></div>
          <div style="border-top: 1px solid #000;"></div>
          <p style="font-weight: bold; margin-top: 4px;">Dosen Pengampu</p>
        </div>
        <div style="text-align: center; width: 200px;">
          <div style="height: 60px;"></div>
          <div style="border-top: 1px solid #000;"></div>
          <p style="font-weight: bold; margin-top: 4px;">Kaprodi</p>
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