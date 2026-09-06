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

function buildBulanTahun(tgl: string): string {
  if (!tgl) return ''
  const d = new Date(tgl)
  if (isNaN(d.getTime())) return ''
  const month = MONTHS[String(d.getMonth() + 1).padStart(2, '0')] || ''
  return month ? `${month} ${d.getFullYear()}` : ''
}

// ─────────────────────────── section builders ───────────────────────────

function buildCapaian(c: Record<string, string>): string {
  const cpl = parseJson<StructuredItem>(c.cpl)
  const cpmk = parseJson<StructuredItem>(c.cpmk)
  const sub = parseJson<StructuredItem>(c.sub_cpmk)

  const makeRows = (items: StructuredItem[], emptyText: string) => {
    if (items.length === 0) {
      return `<tr><td colspan="12" style="border-right:1pt solid black;border-bottom:1pt solid black;color:#999;">${emptyText}</td></tr>`
    }
    return items.map(it =>
      `<tr><td style="border-right:1pt solid black;border-bottom:1pt solid black;">${esc(it.label || '')}</td><td colspan="11" style="border-right:1pt solid black;border-bottom:1pt solid black;">${sanitizeRich(it.deskripsi || '')}</td></tr>`
    ).join('\n')
  }

  const cplRows = cpl.length > 0 ? makeRows(cpl, 'CPL belum diisi.') : `<tr><td colspan="12" style="border-right:1pt solid black;border-bottom:1pt solid black;color:#999;">CPL belum diisi.</td></tr>`
  const cpmkRows = cpmk.length > 0 ? makeRows(cpmk, 'CPMK belum diisi.') : `<tr><td colspan="12" style="border-right:1pt solid black;border-bottom:1pt solid black;color:#999;">CPMK belum diisi.</td></tr>`
  const subRows = sub.length > 0 ? makeRows(sub, 'Sub-CPMK belum diisi.') : `<tr><td colspan="12" style="border-right:1pt solid black;border-bottom:1pt solid black;color:#999;">Sub-CPMK belum diisi.</td></tr>`

  const totalDataRows = Math.max(cpl.length, 1) + Math.max(cpmk.length, 1) + Math.max(sub.length, 1) + 3 // +3 for section headers

  return `
<tr>
  <td rowspan="${totalDataRows}" colspan="2" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;vertical-align:top;">Capaian<br>Pembelajaran<br>(CP)</td>
  <td colspan="5" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;">CPL-PRODI yang dibebankan pada MK</td>
  <td colspan="7" style="border-right:1pt solid black;border-bottom:1pt solid black;">&nbsp;</td>
</tr>
${cplRows}
<tr>
  <td colspan="5" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;">Capaian Pembelajaran Mata Kuliah (CPMK)</td>
  <td colspan="7" style="border-right:1pt solid black;border-bottom:1pt solid black;">&nbsp;</td>
</tr>
${cpmkRows}
<tr>
  <td colspan="5" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;">Kemampuan akhir tiap tahapan belajar (Sub-CPMK)</td>
  <td colspan="7" style="border-right:1pt solid black;border-bottom:1pt solid black;">&nbsp;</td>
</tr>
${subRows}`
}

function buildBahanKajian(c: Record<string, string>): string {
  const items = parseJson<StructuredItem>(c.bahan_kajian)
  if (items.length === 0) {
    return `<tr>
  <td colspan="2" rowspan="2" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;vertical-align:top;">Bahan<br>Kajian:<br>Materi<br>Pembelajaran</td>
  <td colspan="12" style="border-right:1pt solid black;border-bottom:1pt solid black;color:#999;">Bahan kajian belum diisi.</td>
</tr>`
  }
  const rows = items.map((it, i) =>
    `<tr>
  ${i === 0 ? `<td rowspan="${items.length}" colspan="2" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;vertical-align:top;">Bahan<br>Kajian:<br>Materi<br>Pembelajaran</td>` : ''}
  <td colspan="12" style="border-right:1pt solid black;border-bottom:1pt solid black;">${esc(it.label || '')}. ${sanitizeRich(it.deskripsi || it.judul || '')}</td>
</tr>`
  ).join('\n')
  return rows
}

function buildPenilaian(c: Record<string, string>): string {
  const items = parseJson<PenilaianItem>(c.penilaian)
  if (items.length === 0) {
    return `<tr>
  <td colspan="2" rowspan="2" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;vertical-align:top;">Penilaian</td>
  <td colspan="12" style="border-right:1pt solid black;border-bottom:1pt solid black;color:#999;">Penilaian belum diisi.</td>
</tr>`
  }
  const rows = items.map((it, i) =>
    `<tr>
  ${i === 0 ? `<td rowspan="${items.length}" colspan="2" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;vertical-align:top;">Penilaian</td>` : ''}
  <td colspan="12" style="border-right:1pt solid black;border-bottom:1pt solid black;">${esc(it.item)} : ${it.bobot}</td>
</tr>`
  ).join('\n')
  return rows
}

function buildPustaka(c: Record<string, string>): string {
  const utama = (c.pustaka_utama || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim()
  const pendukung = (c.pustaka_pendukung || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim()

  const utamaLines = utama ? utama.split('\n').filter(Boolean) : ['&nbsp;']
  const pendukungLines = pendukung ? pendukung.split('\n').filter(Boolean) : []

  const totalRows = utamaLines.length + 1 + (pendukungLines.length > 0 ? pendukungLines.length + 1 : 0)

  let html = `<tr>
  <td rowspan="${totalRows}" colspan="2" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;vertical-align:top;">Pustaka</td>
  <td colspan="2" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;">Utama :</td>
  <td colspan="10" style="border-right:1pt solid black;border-bottom:1pt solid black;">&nbsp;</td>
</tr>`

  utamaLines.forEach(line => {
    html += `<tr>
  <td colspan="12" style="border-right:1pt solid black;border-bottom:1pt solid black;">${line}</td>
</tr>`
  })

  if (pendukungLines.length > 0) {
    html += `<tr>
  <td colspan="2" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;">Pendukung :</td>
  <td colspan="10" style="border-right:1pt solid black;border-bottom:1pt solid black;">&nbsp;</td>
</tr>`
    pendukungLines.forEach((line, i) => {
      html += `<tr>
  <td colspan="12" style="border-right:1pt solid black;border-bottom:1pt solid black;">${i + 1}. ${line}</td>
</tr>`
    })
  }

  return html
}

function buildPertemuan(c: Record<string, string>): string {
  const rows = parseJson<PertemuanRow>(c.pertemuan)

  const emptyRow = `<tr>
  <td class="center">&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td class="center">&nbsp;</td>
</tr>`

  let body = ''
  if (rows.length === 0) {
    body = `<tr><td colspan="8" style="text-align:center;color:#999;border:1pt solid black;">Belum ada jadwal pertemuan. Gunakan "Generate dari Sub-CPMK" di tab Pertemuan.</td></tr>`
  } else {
    body = rows.map(r => {
      if (r.type === 'uts' || r.type === 'uas') {
        return `<tr><td colspan="8" style="text-align:center;font-weight:bold;background:#f0f0f0;border:1pt solid black;">${esc(r.label || (r.type === 'uts' ? 'UTS (UJIAN TENGAH SEMESTER)' : 'Evaluasi Akhir Semester'))}</td></tr>`
      }
      return `<tr>
  <td class="center">${r.no ?? ''}</td>
  <td>${sanitizeRich(r.subCpmk || '')}</td>
  <td>${sanitizeRich(r.indikator || '')}</td>
  <td>${sanitizeRich(r.kriteriaTeknik || '')}</td>
  <td>${sanitizeRich(r.luring || '')}</td>
  <td>${sanitizeRich(r.daring || '')}</td>
  <td>${sanitizeRich(r.materiPustaka || '')}</td>
  <td class="center">${r.bobot || 0}</td>
</tr>`
    }).join('\n')
  }

  return `<table>
  <thead>
    <tr>
      <th rowspan="2">No</th>
      <th rowspan="2">Kemampuan akhir tiap tahapan belajar<br>(Sub-CPMK)</th>
      <th colspan="2">Penilaian</th>
      <th colspan="2">Bentuk Pembelajaran, Metode Pembelajaran,<br>Penugasan Mahasiswa, [Estimasi Waktu]</th>
      <th rowspan="2">Materi Pembelajaran<br>[ Pustaka ]</th>
      <th rowspan="2">Bobot Penilaian (%)</th>
    </tr>
    <tr>
      <th>Indikator</th>
      <th>Kriteria &amp; Teknik</th>
      <th>Luring (offline)</th>
      <th>Daring (online)</th>
    </tr>
  </thead>
  <tbody>
    ${body}
  </tbody>
</table>`
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
    '{{logo}}': logoBase64 ? `<img src="${logoBase64}" style="width:80px;height:auto;" />` : '&nbsp;',
    '{{logo_cover}}': logoBase64 ? `<img src="${logoBase64}" style="width:120px;height:auto;" />` : '&nbsp;',
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
    '{{bulan_tahun}}': buildBulanTahun(content.tgl_penyusunan) || esc(content.semester_akademik || ''),
    '{{pengembang_rps}}': esc(content.pengembang_rps || ''),
    '{{koordinator_rmk}}': esc(content.koordinator_rmk || ''),
    '{{kaprodi}}': esc(content.kaprodi || ''),
    '{{ketua_stikes}}': esc(content.ketua_stikes || ''),
    '{{wakil_ketua_i}}': esc(content.wakil_ketua_i || ''),
    '{{nidn_kaprodi}}': esc(content.nidn_kaprodi || '-'),
    '{{nidn_ketua_stikes}}': esc(content.nidn_ketua_stikes || '-'),
    '{{nidn_pengembang}}': esc(content.nidn_pengembang || '-'),
    '{{nidn_wakil_ketua_i}}': esc(content.nidn_wakil_ketua_i || '-'),
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
