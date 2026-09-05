/**
 * Maps RPS project data to the HTML template placeholders.
 * Produces the final HTML used by Preview + PDF export.
 */
import { getRpsTemplate } from './rpsTemplate'
import { sanitizeRich, fullDate } from './rpsDocument'

// ─────────────────────────── helpers ───────────────────────────

function esc(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function stripRich(html: string): string {
  return sanitizeRich(html || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
}

interface StructuredItem { label?: string; deskripsi?: string; judul?: string }
interface PenilaianItem { item: string; bobot: number }
interface PertemuanRow {
  no: number; subCpmk: string; indikator: string; kriteriaTeknik: string
  bentukMetodePenugasan: string; luring: string; daring: string
  materiPustaka: string; bobot: number; type?: string; label?: string
}

function parseJson<T>(json: string): T[] {
  try { const a = JSON.parse(json || '[]'); return Array.isArray(a) ? a : [] } catch { return [] }
}

const MONTHS: Record<string, string> = {
  '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
  '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
  '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember',
}

function prodiCode(p: string): string {
  return (p || '').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'PRODI'
}

// ─────────────────────────── section builders ───────────────────────────

function buildCapaian(c: Record<string, string>): string {
  const cpl = parseJson<StructuredItem>(c.cpl)
  const cpmk = parseJson<StructuredItem>(c.cpmk)
  const sub = parseJson<StructuredItem>(c.sub_cpmk)

  const makeRows = (items: StructuredItem[], emptyText: string) => {
    if (items.length === 0) {
      return `<tr><td colspan=13 style='border-right:1.0pt solid black;border-left:none;width:528pt;color:#999;'>${emptyText}</td></tr>`
    }
    return items.map(it =>
      `<tr><td style='width:48pt;border-right:1.0pt solid black;'>${esc(it.label || '')}</td><td colspan=12 style='border-right:1.0pt solid black;border-left:none;width:528pt;'>${sanitizeRich(it.deskripsi || '')}</td></tr>`
    ).join('\n')
  }

  return `
<tr height=21 style='height:16.0pt'>
  <td colspan=2 rowspan=23 height=981 style='border-right:1.0pt solid black;border-bottom:1.0pt solid black;height:736.0pt;width:96pt;font-weight:bold;vertical-align:top;'>Capaian<br>Pembelajaran<br>(CP)</td>
  <td colspan=5 style='border-right:1.0pt solid black;border-left:none;width:240pt;font-weight:bold;'>CPL-PRODI yang dibebankan pada MK</td>
  <td colspan=7 style='border-right:1.0pt solid black;border-left:none;width:336pt;'>&nbsp;</td>
</tr>
${makeRows(cpl, 'CPL belum diisi.')}
<tr height=21 style='height:16.0pt'>
  <td colspan=5 height=21 style='border-right:1.0pt solid black;height:16.0pt;border-left:none;width:240pt;font-weight:bold;'>Capaian Pembelajaran Mata Kuliah (CPMK)</td>
  <td colspan=7 style='border-right:1.0pt solid black;border-left:none;width:336pt;'>&nbsp;</td>
</tr>
${makeRows(cpmk, 'CPMK belum diisi.')}
<tr height=40 style='height:30.0pt'>
  <td colspan=5 height=40 style='border-right:1.0pt solid black;height:30.0pt;border-left:none;width:240pt;font-weight:bold;'>Kemampuan akhir tiap tahapan belajar (Sub-CPMK)</td>
  <td colspan=7 style='border-right:1.0pt solid black;border-left:none;width:336pt;'>&nbsp;</td>
</tr>
${makeRows(sub, 'Sub-CPMK belum diisi.')}`
}

function buildBahanKajian(c: Record<string, string>): string {
  const items = parseJson<StructuredItem>(c.bahan_kajian)
  if (items.length === 0) {
    return `<tr height=21 style='height:15.5pt'>
  <td colspan=2 rowspan=2 height=42 style='border-right:1.0pt solid black;border-bottom:1.0pt solid black;height:31.5pt;width:96pt;font-weight:bold;vertical-align:top;'>Bahan<br>Kajian:<br>Materi<br>Pembelajaran</td>
  <td colspan=12 style='border-right:1.0pt solid black;border-left:none;width:576pt;color:#999;'>Bahan kajian belum diisi.</td>
</tr>`
  }
  const rows = items.map((it, i) => {
    const height = i === 0 ? '21' : '21'
    return `<tr height=${height} style='height:15.5pt;'>
  ${i === 0 ? `<td colspan=2 rowspan=${items.length} height=${items.length * 21} style='border-right:1.0pt solid black;border-bottom:1.0pt solid black;height:${items.length * 21 - 6}.0pt;width:96pt;font-weight:bold;vertical-align:top;'>Bahan<br>Kajian:<br>Materi<br>Pembelajaran</td>` : ''}
  <td colspan=12 style='border-right:1.0pt solid black;border-left:none;width:576pt;'>${esc(it.label || '')}. ${sanitizeRich(it.deskripsi || it.judul || '')}</td>
</tr>`
  }).join('\n')
  return rows
}

function buildPenilaian(c: Record<string, string>): string {
  const items = parseJson<PenilaianItem>(c.penilaian)
  if (items.length === 0) {
    return `<tr height=21 style='height:15.5pt'>
  <td colspan=2 rowspan=2 height=42 style='border-right:1.0pt solid black;border-bottom:1.0pt solid black;height:31.5pt;width:96pt;font-weight:bold;vertical-align:top;'>Penilaian</td>
  <td colspan=12 style='border-right:1.0pt solid black;border-left:none;width:576pt;color:#999;'>Penilaian belum diisi.</td>
</tr>`
  }
  const rows = items.map((it, i) =>
    `<tr height=21 style='height:15.5pt;'>
  ${i === 0 ? `<td colspan=2 rowspan=${items.length} height=${items.length * 21} style='border-right:1.0pt solid black;border-bottom:1.0pt solid black;height:${items.length * 21 - 6}.0pt;width:96pt;font-weight:bold;vertical-align:top;'>Penilaian</td>` : ''}
  <td colspan=12 style='border-right:1.0pt solid black;border-left:none;width:576pt;'>${esc(it.item)} : ${it.bobot}</td>
</tr>`
  ).join('\n')
  return rows
}

function buildPustaka(c: Record<string, string>): string {
  const utama = (c.pustaka_utama || '').replace(/<[^>]+>/g, '&nbsp;').replace(/&nbsp;/g, ' ').trim()
  const pendukung = (c.pustaka_pendukung || '').replace(/<[^>]+>/g, '&nbsp;').replace(/&nbsp;/g, ' ').trim()

  const utamaLines = utama ? utama.split('\n').filter(Boolean) : ['&nbsp;']
  const pendukungLines = pendukung ? pendukung.split('\n').filter(Boolean) : []

  const utamaCount = utamaLines.length + 1 // +1 for "Utama:" header
  const pendukungCount = pendukungLines.length + 1

  let html = `<tr height=21 style='height:15.5pt;'>
  <td colspan=2 rowspan=${utamaCount + pendukungCount} height=${(utamaCount + pendukungCount) * 21} style='border-right:1.0pt solid black;border-bottom:1.0pt solid black;height:${(utamaCount + pendukungCount) * 21 - 6}.0pt;width:96pt;font-weight:bold;vertical-align:top;'>Pustaka</td>
  <td colspan=2 style='border-right:1.0pt solid black;border-left:none;width:96pt;font-weight:bold;'>Utama :</td>
  <td colspan=10 style='border-right:1.0pt solid black;border-left:none;width:480pt;'>&nbsp;</td>
</tr>`

  utamaLines.forEach(line => {
    html += `<tr height=21 style='height:15.5pt;'>
  <td colspan=12 style='border-right:1.0pt solid black;border-left:none;width:576pt;'>${line}</td>
</tr>`
  })

  if (pendukungLines.length > 0) {
    html += `<tr height=21 style='height:15.5pt;'>
  <td colspan=2 height=21 style='border-right:1.0pt solid black;height:15.5pt;width:96pt;font-weight:bold;'>Pendukung :</td>
  <td colspan=10 style='border-right:1.0pt solid black;border-left:none;width:480pt;'>&nbsp;</td>
</tr>`
    pendukungLines.forEach((line, i) => {
      html += `<tr height=21 style='height:15.5pt;'>
  <td colspan=12 style='border-right:1.0pt solid black;border-left:none;width:576pt;'>${i + 1}. ${line}</td>
</tr>`
    })
  }

  return html
}

function buildPertemuan(c: Record<string, string>): string {
  const rows = parseJson<PertemuanRow>(c.pertemuan)

  const header = `
<!-- Pertemuan Header Row 1-4 -->
<tr height=60 style='height:45.0pt'>
  <td rowspan=5 height=162 style='border-bottom:1.0pt solid black;height:121.5pt;border-top:none;width:48pt;font-weight:bold;text-align:center;'>No</td>
  <td colspan=2 class=xl143 style='border-right:1.0pt solid black;border-left:none;width:96pt;font-weight:bold;text-align:center;'>Kemampuan akhir tiap tahapan belajar</td>
  <td colspan=5 rowspan=4 class=xl143 style='border-right:1.0pt solid black;border-bottom:1.0pt solid black;width:240pt;font-weight:bold;text-align:center;'>Penilaian</td>
  <td colspan=3 class=xl143 style='border-right:1.0pt solid black;border-left:none;width:144pt;font-weight:bold;text-align:center;'>Bantuk Pembelajaran,</td>
  <td colspan=2 class=xl143 style='border-right:1.0pt solid black;border-left:none;width:96pt;font-weight:bold;text-align:center;'>Materi Pembelajaran</td>
  <td rowspan=5 style='border-bottom:1.0pt solid black;border-top:none;width:48pt;font-weight:bold;text-align:center;'>Bobot Penilaian (%)</td>
</tr>
<tr height=20 style='height:15.0pt'>
  <td colspan=2 height=20 style='border-right:1.0pt solid black;height:15.0pt;border-left:none;width:96pt;font-weight:bold;text-align:center;'>(Sub-CPMK)</td>
  <td colspan=3 style='border-right:1.0pt solid black;border-left:none;width:144pt;font-weight:bold;text-align:center;'>Metode Pembelajaran,</td>
  <td colspan=2 style='border-right:1.0pt solid black;border-left:none;width:96pt;font-weight:bold;text-align:center;'>[ Pustaka ]</td>
</tr>
<tr height=20 style='height:15.0pt'>
  <td colspan=2 height=20 style='border-right:1.0pt solid black;height:15.0pt;border-left:none;width:96pt;'>&nbsp;</td>
  <td colspan=3 style='border-right:1.0pt solid black;border-left:none;width:144pt;font-weight:bold;text-align:center;'>Penugasan Mahasiswa,</td>
  <td colspan=2 style='border-right:1.0pt solid black;border-left:none;width:96pt;'>&nbsp;</td>
</tr>
<tr height=21 style='height:15.5pt'>
  <td colspan=2 height=21 style='border-right:1.0pt solid black;height:15.5pt;border-left:none;width:96pt;'>&nbsp;</td>
  <td colspan=3 style='border-right:1.0pt solid black;border-left:none;width:144pt;font-weight:bold;text-align:center;'>[ Estimasi Waktu]</td>
  <td colspan=2 style='border-right:1.0pt solid black;border-left:none;width:96pt;'>&nbsp;</td>
</tr>
<tr height=41 style='height:31.0pt'>
  <td colspan=2 height=41 style='border-right:1.0pt solid black;height:31.0pt;border-left:none;width:96pt;'>&nbsp;</td>
  <td colspan=2 style='border-right:1.0pt solid black;border-left:none;width:96pt;font-weight:bold;text-align:center;'>Indikator</td>
  <td colspan=3 style='border-right:1.0pt solid black;border-left:none;width:144pt;font-weight:bold;text-align:center;'>Kriteria &amp; Teknik</td>
  <td style='width:48pt;font-weight:bold;text-align:center;'>Luring (offline)</td>
  <td colspan=2 style='border-right:1.0pt solid black;border-left:none;width:96pt;font-weight:bold;text-align:center;'>Daring (online)</td>
  <td colspan=2 style='border-right:1.0pt solid black;border-left:none;width:96pt;font-weight:bold;text-align:center;'>&nbsp;</td>
</tr>`

  if (rows.length === 0) {
    return header + `
<tr height=21 style='height:15.5pt;'>
  <td colspan=14 style='border:1.0pt solid black;text-align:center;color:#999;'>Belum ada jadwal pertemuan. Gunakan "Generate dari Sub-CPMK" di tab Pertemuan.</td>
</tr>`
  }

  const body = rows.map(r => {
    if (r.type === 'uts' || r.type === 'uas') {
      return `<tr height=21 style='height:15.5pt;'>
  <td colspan=14 style='border:1.0pt solid black;text-align:center;font-weight:bold;background:#f0f0f0;'>${esc(r.label || (r.type === 'uts' ? 'UTS (UJIAN TENGAH SEMESTER)' : 'Evaluasi Akhir Semester'))}</td>
</tr>`
    }
    return `<tr height=41 style='height:31.0pt;'>
  <td rowspan=5 style='border-bottom:1.0pt solid black;border-top:none;width:48pt;text-align:center;'>${r.no ?? ''}</td>
  <td colspan=2 rowspan=5 style='border-right:1.0pt solid black;border-bottom:1.0pt solid black;width:96pt;vertical-align:top;'>${sanitizeRich(r.subCpmk || '')}</td>
  <td colspan=2 rowspan=5 style='border-right:1.0pt solid black;border-bottom:1.0pt solid black;width:96pt;vertical-align:top;'>${sanitizeRich(r.indikator || '')}</td>
  <td colspan=3 style='border-right:1.0pt solid black;border-left:none;width:144pt;vertical-align:top;'>Kriteria:<br>${sanitizeRich(r.kriteriaTeknik || '')}</td>
  <td style='width:48pt;vertical-align:top;'>${sanitizeRich(r.luring || '')}</td>
  <td colspan=2 rowspan=5 style='border-right:1.0pt solid black;border-bottom:1.0pt solid black;width:96pt;vertical-align:top;'>${sanitizeRich(r.daring || '')}</td>
  <td colspan=2 rowspan=5 style='border-right:1.0pt solid black;border-bottom:1.0pt solid black;width:96pt;vertical-align:top;'>${sanitizeRich(r.materiPustaka || '')}</td>
  <td rowspan=5 style='border-bottom:1.0pt solid black;border-top:none;width:48pt;text-align:center;'>${r.bobot || 0}</td>
</tr>
<tr height=62 style='height:46.5pt;'>
  <td colspan=3 height=62 style='border-right:1.0pt solid black;height:46.5pt;border-left:none;width:144pt;vertical-align:top;'>Ketepatan dan penugasan</td>
  <td style='width:48pt;vertical-align:top;'>Kuliah, tatap muka</td>
</tr>
<tr height=21 style='height:15.5pt;'>
  <td colspan=3 height=21 style='border-right:1.0pt solid black;height:15.5pt;border-left:none;width:144pt;'>&nbsp;</td>
  <td style='width:48pt;'>&nbsp;</td>
</tr>
<tr height=21 style='height:15.5pt;'>
  <td colspan=3 height=21 style='border-right:1.0pt solid black;height:15.5pt;border-left:none;width:144pt;vertical-align:top;'>Teknik:</td>
  <td style='width:48pt;'>MP: Pembelajaran kooperatif, interaktif dan diskusi</td>
</tr>
<tr height=41 style='height:31.0pt;'>
  <td colspan=3 height=41 style='border-right:1.0pt solid black;height:31.0pt;border-left:none;width:144pt;'>Diskusi, Ceramah, Kuis (tes tertulis)</td>
  <td style='width:48pt;'>&nbsp;</td>
</tr>`
  }).join('\n')

  return header + '\n' + body
}

// ─────────────────────────── public API ───────────────────────────

/** Replace all {{placeholders}} in the template with actual RPS data. */
export function buildRpsFromTemplate(content: Record<string, string>): string {
  const template = getRpsTemplate()
  const sksT = (content.sks_t || '0').trim()
  const sksP = (content.sks_p || '0').trim()
  const sem = content.semester === 'Ganjil' ? 'GANJIL' : content.semester === 'Genap' ? 'GENAP' : (content.semester || '').toUpperCase()
  const yr = (content.semester_akademik || '20__-20__').split('-')[1]?.trim() || '20__'

  const docCode = `RPS/${prodiCode(content.prodi)}/${sem}/${yr}`
  const logoBase64 = getLogoBase64()

  const replacements: Record<string, string> = {
    '{{logo}}': logoBase64 ? `<img src="${logoBase64}" style="width:96px;height:auto;" />` : '&nbsp;',
    '{{doc_code}}': docCode,
    '{{prodi}}': esc((content.prodi || '').toUpperCase()),
    '{{semester_akademik}}': esc(content.semester_akademik || ''),
    '{{mata_kuliah}}': esc(content.mata_kuliah || ''),
    '{{kode_mk}}': esc(content.kode_mk || ''),
    '{{rumpun_mk}}': esc(content.rumpun_mk || ''),
    '{{sks_t}}': esc(sksT),
    '{{sks_p}}': esc(sksP),
    '{{semester}}': esc(content.semester || ''),
    '{{tgl_penyusunan}}': fullDate(content.tgl_penyusunan) || '&nbsp;',
    '{{pengembang_rps}}': esc(content.pengembang_rps || ''),
    '{{koordinator_rmk}}': esc(content.koordinator_rmk || ''),
    '{{kaprodi}}': esc(content.kaprodi || ''),
    '{{deskripsi_mk}}': sanitizeRich(content.deskripsi_mk || '') || '<span style="color:#999;">Deskripsi belum diisi.</span>',
    '{{dosen_pengampu}}': esc(content.dosen_pengampu || ''),
    '{{matakuliah_syarat}}': esc(content.matakuliah_syarat || '-'),
    '{{capaian_section}}': buildCapaian(content),
    '{{bahan_kajian_section}}': buildBahanKajian(content),
    '{{penilaian_section}}': buildPenilaian(content),
    '{{pustaka_section}}': buildPustaka(content),
    '{{pertemuan_section}}': buildPertemuan(content),
  }

  let html = template
  for (const [placeholder, value] of Object.entries(replacements)) {
    html = html.split(placeholder).join(value)
  }
  return html
}

/** Load logo as base64 data URI. */
function getLogoBase64(): string {
  try {
    // @ts-ignore — Vite inlines this as a base64 data URL
    return logoUrl
  } catch {
    return ''
  }
}

// Vite raw import for the logo
import logoUrl from '../assets/logo-unisina.png?url'
