/**
 * Canonical RPS print document.
 *
 * One pure builder (`buildRpsHtml`) produces the exact HTML used by BOTH the
 * on-screen Preview (View ribbon → Preview) and the PDF export, so what you see
 * is what gets downloaded. Layout is modelled on the UNISINA reference RPS files
 * (format-rps.html / rps-farmakoterapi / rps-spektroskopi):
 *
 *   1. Sampul (cover)      – RPS title, semester, MK, prodi, "Disusun Oleh", STIKes
 *   2. Identitas + Otorisasi
 *   3. Capaian Pembelajaran (CPL, CPMK, Sub-CPMK)
 *   4. Deskripsi, Bahan Kajian, Penilaian, Pustaka, Dosen & prasyarat
 *   5. Tabel Pertemuan (9 columns, UTS/UAS separators)
 *   6. Pengesahan (TTD)
 *
 * Pure string generation — no DOM/document dependency — so the same output can be
 * rendered in an <iframe> for preview or printed via Electron printToPDF.
 */

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

/** 'YYYY-MM-DD' → 'FEBRUARI, 2026' ('' → '') */
function coverMonthYear(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  return `${(MONTHS[parts[1]] || parts[1]).toUpperCase()}, ${parts[0]}`
}

function esc(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const RICH_ALLOWED = new Set(['p', 'div', 'span', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'sub', 'sup', 'ul', 'ol', 'li'])
const RICH_BLOCKED = ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'form', 'input', 'select', 'textarea', 'button', 'img', 'picture', 'source', 'video', 'audio', 'canvas', 'link', 'meta', 'title', 'head', 'a']

/**
 * Sanitize rich-text (TipTap) HTML for safe display inside the preview/PDF:
 * keeps text formatting (b/i/u/s, sub/sup, font family/size/color styles),
 * strips images, links, scripts and arbitrary elements. DOM-free (regex).
 */
export function sanitizeRich(html: string): string {
  if (!html) return ''
  const blockedRe = new RegExp('<(?:' + RICH_BLOCKED.join('|') + ')\\b[^>]*>[\s\S]*?<\/\\1\s*>', 'gi')
  let out = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(blockedRe, '')
    .replace(new RegExp('<(?:' + RICH_BLOCKED.join('|') + ')\b[^>]*\/?>', 'gi'), '')
  out = out.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g, (m, tag, attrs) => {
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

function semesterWord(c: RpsContent): string {
  const s = (c.semester || '').trim()
  return s === 'Ganjil' ? 'GANJIL' : s === 'Genap' ? 'GENAP' : 'GANJIL / GENAP'
}

function taLabel(c: RpsContent): string {
  const ta = (c.semester_akademik || '').trim()
  return ta ? `TAHUN AKADEMIK ${ta}` : 'TAHUN AKADEMIK 20__-20__'
}

function prodiCode(c: RpsContent): string {
  return (c.prodi || '')
    .toUpperCase().replace(/[^A-Z0-9]/g, '') || 'PRODI'
}

function docCode(c: RpsContent): string {
  const sem = c.semester === 'Ganjil' ? 'GANJIL' : c.semester === 'Genap' ? 'GENAP' : 'RPS'
  const yr = (c.semester_akademik || '20__-20__').split('-')[1]?.trim() || '20__'
  return `RPS/${prodiCode(c)}/${sem}/${yr}`
}

// ─────────────────────────── data parsers ───────────────────────────

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

// Names helper: split multi-name field ("Nama1; Nama2" / newline) into lines
function nameLines(value: string): string[] {
  return (value || '')
    .split(/[;\n]/)
    .map(s => s.trim())
    .filter(Boolean)
}

// ─────────────────────────── HTML document ───────────────────────────

const STYLES = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { background: #e8e8e8; color: #000; font-family: 'Times New Roman', Times, serif; }
  table { border-collapse: collapse; }
  .pg {
    width: 210mm; min-height: 292mm;
    padding: 16mm 17mm 15mm;
    margin: 0 auto 14px;
    background: #fff;
    position: relative;
    page-break-after: always;
    box-shadow: 0 2px 10px rgba(0,0,0,.12);
  }
  .pg:last-child { page-break-after: auto; }
  .sheet-content { width: 176mm; }
  h1.rps-title { font-size: 15pt; text-align: center; margin: 0 0 2mm; font-weight: bold; }
  p.sec-title { font-size: 12pt; font-weight: bold; margin: 0 0 3mm; }
  p.sub-title { font-size: 11pt; font-weight: bold; margin: 3mm 0 1.5mm; }
  table.info { width: 100%; margin-bottom: 4mm; }
  table.info td { border: 1px solid #000; padding: 1.4mm 2.4mm; font-size: 10.5pt; vertical-align: top; }
  table.info td.lbl { width: 42mm; font-weight: bold; }
  table.cp { width: 100%; margin: 1mm 0 3mm; }
  table.cp td { border: 1px solid #000; padding: 1.6mm 2.4mm; font-size: 10.5pt; vertical-align: top; }
  table.cp td.lbl { width: 24mm; font-weight: bold; }
  p.body-text { font-size: 11pt; line-height: 1.45; text-align: justify; margin: 0 0 2.5mm; }
  .sign-row { display: flex; gap: 8mm; margin-top: 8mm; }
  .sign-box { flex: 1; text-align: center; font-size: 10.5pt; }
  .sign-dots { border-bottom: 1px dotted #000; height: 12mm; }
  .empty-line { border-bottom: 1px dotted #000; height: 6mm; margin: 2mm 0; }
  .tbl-wrap { width: 100%; overflow: visible; }
  table.ptm { width: 100%; table-layout: fixed; }
  table.ptm th, table.ptm td {
    border: 1px solid #000; padding: 1.2mm 1.4mm;
    font-size: 7.6pt; line-height: 1.3; vertical-align: top; word-wrap: break-word;
  }
  table.ptm th { text-align: center; font-weight: bold; background: #f1f5f9; }
  table.ptm td.c { text-align: center; }
  table.ptm tr.period td { text-align: center; font-weight: bold; background: #e8edf5; }
  .small-note { font-size: 8pt; color: #333; }
  @media print {
    body { background: #fff; }
    .pg { margin: 0; box-shadow: none; page-break-after: always; }
  }
`

function richCell(html: string): string {
  const safe = sanitizeRich(html || '')
  if (!safe) return '&nbsp;'
  // Remove outer wrapping paragraph margins for compact table cells
  return safe
}

/** Escaped plain paragraph text from a possibly-rich field */
function paraLines(value: string): string[] {
  return (value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .split('\n')
    .map(s => s.replace(/&[a-z]+;/gi, m => {
      const map: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" }
      return map[m] ?? m
    }).trim())
    .filter(Boolean)
}

// ── Sheet 1: Cover ───────────────────────────────────────────────────

function sheetCover(c: RpsContent): string {
  const mk = c.mata_kuliah?.trim()
  const kode = c.kode_mk?.trim()
  const mkLine = mk
    ? `${esc(mk)}${kode ? ` (${esc(kode)})` : ''}`
    : 'MATA KULIAH (KODE MATA KULIAH)'

  // "Disusun Oleh" — prefer pengembang, then dosen pengampu
  const names: string[] = []
  const pengembang = (c.pengembang_rps || '').trim()
  const dosen = (c.dosen_pengampu || '').trim()
  if (pengembang) nameLines(pengembang).forEach(n => { if (!names.includes(n)) names.push(n) })
  if (dosen) nameLines(dosen).forEach(n => { if (!names.includes(n)) names.push(n) })

  const nidn = (c.nidn_pengembang || c.nidn_dosen || '').trim()

  return `
  <section class="pg">
    <div style="text-align:center;padding-top:26mm;">
      <p style="font-size:15pt;font-weight:bold;margin:0 0 3mm;">RENCANA PEMBELAJARAN SEMESTER (RPS)</p>
      <p style="font-size:13pt;font-weight:bold;margin:0 0 1mm;">${semesterWord(c)}</p>
      <p style="font-size:13pt;font-weight:bold;margin:0 0 14mm;">${esc(taLabel(c))}</p>
      <p style="font-size:17pt;font-weight:bold;margin:0 0 2mm;line-height:1.4;">${mkLine}</p>
      ${c.prodi ? `<p style="font-size:12pt;font-weight:bold;margin:0 0 16mm;">PRODI ${esc(c.prodi.toUpperCase())}</p>` : '<p style="margin:0 0 16mm;">&nbsp;</p>'}
      <p style="font-size:11pt;margin:0 0 6mm;">Disusun Oleh :</p>
      ${names.map(n => `<p style="font-size:12pt;font-weight:bold;margin:0;line-height:1.5;">${esc(n)}</p>`).join('') || '<p style="font-size:12pt;font-weight:bold;margin:0;">&nbsp;</p>'}
      ${nidn ? `<p style="font-size:10pt;margin:0 0 12mm;">NIDN. ${esc(nidn)}</p>` : '<p style="margin:0 0 12mm;">&nbsp;</p>'}
      <p style="font-size:14pt;font-weight:bold;margin:46mm 0 0;">STIKes IBNU SINA AJIBARANG</p>
      <p style="font-size:12pt;font-weight:bold;margin:2mm 0 0;">${coverMonthYear(c.tgl_penyusunan) || 'BULAN TAHUN'}</p>
    </div>
  </section>`
}

// ── Sheet 2: Identitas & Otorisasi ───────────────────────────────────

function sheetIdentitas(c: RpsContent): string {
  const sksT = (c.sks_t || '0').trim()
  const sksP = (c.sks_p || '0').trim()

  const otorisasiCols = (title: string, name: string, nidn: string) => `
    <td style="width:33%;">
      <p style="font-weight:bold;text-align:center;margin:0 0 2mm;">${esc(title)}</p>
      <div class="empty-line"></div>
      <div class="empty-line"></div>
      <p style="text-align:center;font-weight:bold;margin:1mm 0 0;">${esc(name) || '&nbsp;'}</p>
      ${nidn ? `<p style="text-align:center;font-size:9pt;margin:0;">NIDN. ${esc(nidn)}</p>` : ''}
    </td>`

  return `
  <section class="pg">
    <div class="sheet-content">
      <p style="text-align:center;font-size:12pt;font-weight:bold;letter-spacing:.4mm;margin:0 0 1mm;">STIKes IBNU SINA AJIBARANG</p>
      <p style="text-align:center;font-size:10.5pt;font-weight:bold;margin:0 0 .6mm;">${c.prodi ? `PROGRAM STUDI ${esc(c.prodi.toUpperCase())}` : 'PROGRAM STUDI …'}</p>
      <p style="text-align:center;font-size:9.5pt;margin:0 0 .6mm;">${esc(taLabel(c))}</p>
      <p style="text-align:center;font-size:9.5pt;margin:0 0 5mm;">Kode Dokumen : ${esc(docCode(c))}</p>
      <div style="border-bottom:1.5px solid #000;margin-bottom:4mm;"></div>

      <h1 class="rps-title">RENCANA PEMBELAJARAN SEMESTER</h1>

      <p class="sub-title">A. Identitas Mata Kuliah</p>
      <table class="info">
        <tr><td class="lbl">MATA KULIAH (MK)</td><td>${esc(c.mata_kuliah || '')}</td></tr>
        <tr><td class="lbl">KODE</td><td>${esc(c.kode_mk || '')}</td></tr>
        <tr><td class="lbl">Rumpun MK</td><td>${esc(c.rumpun_mk || '')}</td></tr>
        <tr><td class="lbl">BOBOT (sks)</td><td>T = ${esc(sksT)} &nbsp; P = ${esc(sksP)}</td></tr>
        <tr><td class="lbl">SEMESTER</td><td>${esc(c.semester || '')}</td></tr>
        <tr><td class="lbl">Tgl Penyusunan</td><td>${fullDate(c.tgl_penyusunan) || '&nbsp;'}</td></tr>
        <tr><td class="lbl">Dosen Pengampu</td><td>${esc(c.dosen_pengampu || '')}</td></tr>
        <tr><td class="lbl">Matakuliah Syarat</td><td>${esc(c.matakuliah_syarat || '-')}</td></tr>
      </table>

      <p class="sub-title" style="margin-top:5mm;">B. Otorisasi</p>
      <table class="cp" style="table-layout:fixed;">
        <tr>
          ${otorisasiCols('Pengembang RPS', c.pengembang_rps || '', c.nidn_pengembang || '')}
          ${otorisasiCols('Koordinator RMK', c.koordinator_rmk || '', '')}
          ${otorisasiCols('Ketua Program Studi', c.kaprodi || '', c.nidn_kaprodi || '')}
        </tr>
      </table>
    </div>
  </section>`
}

// ── Sheet 3: Capaian Pembelajaran ────────────────────────────────────

function sheetCapaian(c: RpsContent): string {
  const cpl = parseStructured(c.cpl)
  const cpmk = parseStructured(c.cpmk)
  const sub = parseStructured(c.sub_cpmk)

  const rows = (items: Array<{ label?: string; deskripsi?: string }>, emptyTxt: string) =>
    items.length === 0
      ? `<tr><td style="color:#6b7280;font-size:9pt;">${emptyTxt}</td></tr>`
      : items.map(it => `<tr><td class="lbl">${esc(it.label || '')}</td><td>${richCell(it.deskripsi || '')}</td></tr>`).join('')

  return `
  <section class="pg">
    <div class="sheet-content">
      <h1 class="rps-title">RENCANA PEMBELAJARAN SEMESTER</h1>
      <div style="border-bottom:1px solid #000;margin-bottom:4mm;"></div>

      <p class="sub-title">C. Capaian Pembelajaran (CP)</p>

      <p style="font-size:10.5pt;font-weight:bold;margin:1mm 0 1mm;">CPL-PRODI yang dibebankan pada MK</p>
      <table class="cp">
        <tbody>${rows(cpl, 'CPL belum diisi.')}</tbody>
      </table>

      <p style="font-size:10.5pt;font-weight:bold;margin:3mm 0 1mm;">Capaian Pembelajaran Mata Kuliah (CPMK)</p>
      <table class="cp">
        <tbody>${rows(cpmk, 'CPMK belum diisi.')}</tbody>
      </table>

      <p style="font-size:10.5pt;font-weight:bold;margin:3mm 0 1mm;">Kemampuan Akhir Tiap Tahapan Belajar (Sub-CPMK)</p>
      <table class="cp">
        <tbody>${rows(sub, 'Sub-CPMK belum diisi.')}</tbody>
      </table>

      <p class="sub-title" style="margin-top:5mm;">D. Deskripsi Singkat Mata Kuliah</p>
      ${paraLines(c.deskripsi_mk).map(l => `<p class="body-text">${esc(l)}</p>`).join('') || '<p class="body-text" style="color:#6b7280;">Deskripsi belum diisi.</p>'}
    </div>
  </section>`
}

// ── Sheet 4: Bahan kajian, penilaian, pustaka, dosen ─────────────────

function sheetMateri(c: RpsContent): string {
  const bahan = parseStructured(c.bahan_kajian)
  const penilaian = parsePenilaian(c.penilaian)
  const totalBobot = penilaian.reduce((s, p) => s + (p.bobot || 0), 0)

  return `
  <section class="pg">
    <div class="sheet-content">
      <h1 class="rps-title">RENCANA PEMBELAJARAN SEMESTER</h1>
      <div style="border-bottom:1px solid #000;margin-bottom:4mm;"></div>

      <p class="sub-title">E. Bahan Kajian : Materi Pembelajaran</p>
      ${bahan.length === 0
        ? '<p class="body-text" style="color:#6b7280;">Bahan kajian belum diisi.</p>'
        : `<table class="cp"><tbody>${bahan.map(b =>
            `<tr><td class="lbl" style="width:12mm;">${esc(b.label || '')}</td><td>${richCell(b.deskripsi || b.judul || '')}</td></tr>`).join('')}</tbody></table>`}

      <p class="sub-title" style="margin-top:5mm;">F. Penilaian</p>
      ${penilaian.length === 0
        ? '<p class="body-text" style="color:#6b7280;">Format penilaian belum diisi.</p>'
        : `<table class="cp" style="width:60%;"><tbody>
            ${penilaian.map(p => `<tr><td class="lbl" style="width:38mm;">${esc(p.item || '')}</td><td>${p.bobot || 0}%</td></tr>`).join('')}
            <tr><td class="lbl" style="width:38mm;">Total</td><td><b>${totalBobot}%</b></td></tr>
          </tbody></table>`}

      <p class="sub-title" style="margin-top:5mm;">G. Pustaka</p>
      ${paraLines(c.pustaka_utama).map(l => `<p class="body-text">${esc(l)}</p>`).join('') || '<p class="body-text" style="color:#6b7280;">Pustaka utama belum diisi.</p>'}
      ${paraLines(c.pustaka_pendukung).length > 0 ? `<p class="body-text"><b>Pendukung:</b></p>` + paraLines(c.pustaka_pendukung).map(l => `<p class="body-text">${esc(l)}</p>`).join('') : ''}
    </div>
  </section>`
}

// ── Sheet 5: Pertemuan ───────────────────────────────────────────────

const PTM_COLS = [
  { h: 'No', w: '5%' },
  { h: 'Kemampuan Akhir Tiap Tahapan Belajar (Sub-CPMK)', w: '14%' },
  { h: 'Indikator', w: '12%' },
  { h: 'Kriteria &amp; Teknik', w: '13%' },
  { h: 'Bentuk Pembelajaran, Metode Pembelajaran, Penugasan Mahasiswa, [Estimasi Waktu]', w: '18%' },
  { h: 'Luring (offline)', w: '10%' },
  { h: 'Daring (online)', w: '10%' },
  { h: 'Materi Pembelajaran [Pustaka]', w: '13%' },
  { h: 'Bobot (%)', w: '5%' },
]

function richTd(html: string, w: string, cls = ''): string {
  return `<td style="width:${w}"${cls ? ` class="${cls}"` : ''}>${richCell(html)}</td>`
}

function sheetPertemuan(c: RpsContent): string {
  const rows = parsePertemuan(c.pertemuan)
  const header = `<tr>${PTM_COLS.map(col => `<th style="width:${col.w};">${col.h}</th>`).join('')}</tr>`

  const body = rows.length === 0
    ? `<tr><td colspan="9" style="text-align:center;color:#6b7280;font-size:9pt;">Belum ada jadwal pertemuan. Gunakan “Generate dari Sub-CPMK” di tab Pertemuan.</td></tr>`
    : rows.map(r => {
        if (r.type === 'uts' || r.type === 'uas') {
          return `<tr class="period"><td colspan="9">${esc(r.label || (r.type === 'uts' ? 'Evaluasi Tengah Semester (UTS)' : 'Evaluasi Akhir Semester (UAS)'))}</td></tr>`
        }
        return `<tr>
          <td class="c">${r.no ?? ''}</td>
          ${richTd(r.subCpmk, PTM_COLS[1].w)}
          ${richTd(r.indikator, PTM_COLS[2].w)}
          ${richTd(r.kriteriaTeknik, PTM_COLS[3].w)}
          ${richTd(r.bentukMetodePenugasan, PTM_COLS[4].w)}
          ${richTd(r.luring, PTM_COLS[5].w)}
          ${richTd(r.daring, PTM_COLS[6].w)}
          ${richTd(r.materiPustaka, PTM_COLS[7].w)}
          <td class="c">${r.bobot || 0}</td>
        </tr>`
      }).join('')

  return `
  <section class="pg">
    <div class="sheet-content">
      <p style="text-align:center;font-size:12pt;font-weight:bold;letter-spacing:.4mm;margin:0 0 1mm;">STIKes IBNU SINA AJIBARANG</p>
      <p style="text-align:center;font-size:9.5pt;margin:0 0 4mm;">${c.prodi ? `PROGRAM STUDI ${esc(c.prodi.toUpperCase())}` : ''}</p>
      <div style="border-bottom:1.5px solid #000;margin-bottom:4mm;"></div>
      <h1 class="rps-title">JADWAL PELAKSANAAN PEMBELAJARAN / PERTEMUAN</h1>
      <div class="tbl-wrap">
        <table class="ptm">
          <thead>${header}</thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </div>
  </section>`
}

// ── Sheet 6: Pengesahan ──────────────────────────────────────────────

function ttdBox(where: string, name: string, nidn: string, role: string): string {
  return `
    <td style="width:50%;text-align:center;vertical-align:top;padding:0 2mm;">
      <p style="font-size:10.5pt;margin:0 0 14mm;">${esc(where)}</p>
      <div class="sign-dots"></div>
      <p style="font-size:11pt;font-weight:bold;margin:1mm 0 0;">${esc(name) || '&nbsp;'}</p>
      ${nidn ? `<p style="font-size:9pt;margin:0;">NIDN. ${esc(nidn)}</p>` : ''}
      <p style="font-size:9pt;margin:.5mm 0 0;">${esc(role)}</p>
    </td>`
}

function sheetTtd(c: RpsContent): string {
  const place = c.tempat || 'Ajibarang,'
  const dateTxt = fullDate(c.tgl_penyusunan)
  const where = dateTxt ? `${place} ${dateTxt}` : place
  return `
  <section class="pg">
    <div class="sheet-content">
      <h1 class="rps-title">PENGESAHAN</h1>
      <div style="border-bottom:1px solid #000;margin-bottom:8mm;"></div>
      <table style="width:100%;table-layout:fixed;">
        <tr>
          ${ttdBox(where, c.dosen_pengampu || '', '', 'Dosen Pengampu')}
          ${ttdBox(where, c.pengembang_rps || '', c.nidn_pengembang || '', 'Pengembang RPS')}
        </tr>
      </table>
      <table style="width:100%;table-layout:fixed;margin-top:14mm;">
        <tr>
          ${ttdBox('Mengetahui,', c.kaprodi || '', c.nidn_kaprodi || '', c.prodi ? `Kaprodi ${esc(c.prodi)}` : 'Kaprodi')}
          ${ttdBox('Mengetahui,', c.wakil_ketua_i || '', c.nidn_wakil_ketua_i || '', 'Wakil Ketua I Bidang Akademik')}
        </tr>
      </table>
      <table style="width:100%;table-layout:fixed;margin-top:14mm;">
        <tr>
          ${ttdBox('Mengetahui,', c.ketua_stikes || '', c.nidn_ketua_stikes || '', 'Ketua STIKes Ibnu Sina Ajibarang').replace('width:50%', 'width:100%')}
        </tr>
      </table>
    </div>
  </section>`
}

// ─────────────────────────── public API ───────────────────────────

/** Full standalone HTML document of the RPS (portrait A4). Used by Preview + PDF export. */
export function buildRpsHtml(content: RpsContent): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>RPS ${esc(content.mata_kuliah || '')}</title>
<style>${STYLES}</style>
</head>
<body>
${sheetCover(content)}
${sheetIdentitas(content)}
${sheetCapaian(content)}
${sheetMateri(content)}
${sheetPertemuan(content)}
${sheetTtd(content)}
</body>
</html>`
}
