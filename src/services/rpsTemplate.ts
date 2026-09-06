/**
 * Static RPS HTML template based on the official UNISINA Excel→HTML conversion.
 * Multi-page layout: Portrait Cover → Landscape Content → Landscape Signature.
 * The mapper (rpsDataMapper.ts) fills in actual data at export/preview time.
 */

export function getRpsTemplate(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<style>
* { box-sizing: border-box; }
@page { size: A4 landscape; margin: 1.5cm; }
@page cover { size: A4 portrait; margin: 2cm; }
@page signature { size: A4 landscape; margin: 1.5cm; }
body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; margin: 0; padding: 16px 24px; color: #000; width: 100%; }
td, th { vertical-align: middle; }

/* ── Cover Page ── */
.cover { page: cover; page-break-after: always; width: 100%; min-height: 1122px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; page-break-before: avoid; }
.cover-inner { width: 100%; max-width: 500px; border: 2px solid #000; padding: 40px 30px; }
.cover h1 { font-size: 16pt; margin: 0 0 8pt 0; }
.cover h2 { font-size: 14pt; font-weight: normal; margin: 0 0 6pt 0; }
.cover .logo { margin: 30pt 0; }
.cover .logo img { width: 120px; height: auto; }
.cover .disusun { font-size: 13pt; margin: 20pt 0 6pt 0; }
.cover .dosen { font-size: 13pt; font-weight: bold; margin: 0 0 20pt 0; }
.cover .institusi { font-size: 14pt; font-weight: bold; margin: 0 0 6pt 0; }
.cover .bulan { font-size: 12pt; margin: 10pt 0 0 0; }

/* ── Content Pages ── */
.content { width: 100%; }
.content table { border-collapse: collapse; width: 100%; table-layout: fixed; }
.content td { border: 1pt solid black; padding: 2pt 4pt; font-size: 10pt; word-wrap: break-word; overflow-wrap: break-word; }
.content th { border: 1pt solid black; padding: 4pt 6pt; font-size: 10pt; font-weight: bold; text-align: center; background: #f0f0f0; vertical-align: middle; }
.content .center { text-align: center; }

/* ── Signature Page ── */
.signature { page-break-before: always; width: 100%; }
.signature table { border-collapse: collapse; width: 100%; }
.signature td { padding: 2pt 4pt; font-size: 10pt; vertical-align: top; }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div class="cover-inner">
    <h1>RENCANA PEMBELAJARAN SEMESTER (RPS)<br>GENAP</h1>
    <h2>Tahun Akademik {{semester_akademik}}</h2>
    <h2>Mata Kuliah : {{mata_kuliah}} ({{kode_mk}})</h2>
    <h2>Prodi : {{prodi}}</h2>
    <div class="logo">{{logo_cover}}</div>
    <div class="disusun">Disusun Oleh:</div>
    <div class="dosen">{{pengembang_rps}}</div>
    <div class="institusi">STIKES IBNU SINA AJIBARANG</div>
    <div class="bulan">{{bulan_tahun}}</div>
  </div>
</div>

<!-- CONTENT PAGES -->
<div class="content">
<table border="1" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border:none;table-layout:fixed;">
<col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%"><col style="width:7.14%">

<!-- Row 1-3: Header Block -->
<tr>
  <td rowspan="3" colspan="2" width="96" class="hdr-logo" style="text-align:center;border-right:1pt solid black;border-bottom:1pt solid black;">{{logo}}</td>
  <td colspan="10" style="border-right:1pt solid black;border-bottom:1pt solid black;font-size:14pt;font-weight:bold;text-align:center;">STIKES IBNU SINA AJIBARANG</td>
  <td colspan="2" rowspan="3" style="border-right:1pt solid black;border-bottom:1pt solid black;font-size:9pt;text-align:center;vertical-align:top;">{{doc_code}}</td>
</tr>
<tr>
  <td colspan="10" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;text-align:center;">PROGRAM STUDI {{prodi}}</td>
</tr>
<tr>
  <td colspan="10" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;text-align:center;">TAHUN AKADEMIK {{semester_akademik}}</td>
</tr>

<!-- Row 4: Title -->
<tr>
  <td colspan="14" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;text-align:center;">RENCANA PEMBELAJARAN SEMESTER</td>
</tr>

<!-- Row 5: Identitas Header -->
<tr>
  <td colspan="4" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;">MATA KULIAH (MK)</td>
  <td colspan="2" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;">KODE</td>
  <td colspan="3" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;">Rumpun MK</td>
  <td colspan="2" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;">BOBOT (sks)</td>
  <td style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;">SEMESTER</td>
  <td colspan="2" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;">Tgl Penyusunan</td>
</tr>

<!-- Row 6: Identitas Values -->
<tr>
  <td colspan="4" style="border-right:1pt solid black;border-bottom:1pt solid black;">{{mata_kuliah}}</td>
  <td colspan="2" style="border-right:1pt solid black;border-bottom:1pt solid black;">{{kode_mk}}</td>
  <td colspan="3" style="border-right:1pt solid black;border-bottom:1pt solid black;">{{rumpun_mk}}</td>
  <td style="border-right:1pt solid black;border-bottom:1pt solid black;">T= {{sks_t}}</td>
  <td style="border-right:1pt solid black;border-bottom:1pt solid black;">P= {{sks_p}}</td>
  <td style="border-right:1pt solid black;border-bottom:1pt solid black;">{{semester}}</td>
  <td colspan="2" style="border-right:1pt solid black;border-bottom:1pt solid black;">{{tgl_penyusunan}}</td>
</tr>

<!-- Row 7-8: Otorisasi -->
<tr>
  <td rowspan="2" colspan="4" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;vertical-align:top;">OTORISASI</td>
  <td colspan="3" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;">Pengembang RPS</td>
  <td colspan="4" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;">Koordinator RMK</td>
  <td colspan="3" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;">Ketua Program Studi</td>
</tr>
<tr>
  <td colspan="3" style="border-right:1pt solid black;border-bottom:1pt solid black;">{{pengembang_rps}}</td>
  <td colspan="4" style="border-right:1pt solid black;border-bottom:1pt solid black;">{{koordinator_rmk}}</td>
  <td colspan="3" style="border-right:1pt solid black;border-bottom:1pt solid black;">{{kaprodi}}</td>
</tr>

<!-- CPL / CPMK / Sub-CPMK Section -->
{{capaian_section}}

<!-- Deskripsi Singkat MK -->
<tr>
  <td colspan="2" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;vertical-align:top;">Deskripsi Singkat MK</td>
  <td colspan="12" style="border-right:1pt solid black;border-bottom:1pt solid black;">{{deskripsi_mk}}</td>
</tr>

<!-- Bahan Kajian -->
{{bahan_kajian_section}}

<!-- Penilaian -->
{{penilaian_section}}

<!-- Pustaka -->
{{pustaka_section}}

<!-- Dosen Pengampu -->
<tr>
  <td colspan="2" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;">Dosen Pengampu</td>
  <td colspan="12" style="border-right:1pt solid black;border-bottom:1pt solid black;">{{dosen_pengampu}}</td>
</tr>

<!-- Matakuliah Syarat -->
<tr>
  <td colspan="2" style="border-right:1pt solid black;border-bottom:1pt solid black;font-weight:bold;">Matakuliah Syarat</td>
  <td colspan="12" style="border-right:1pt solid black;border-bottom:1pt solid black;">{{matakuliah_syarat}}</td>
</tr>

</table>
</div>

<!-- PERTEMUAN TABLE (separate, 8 columns) -->
<div class="content">
{{pertemuan_section}}
</div>

<!-- SIGNATURE PAGE -->
<div class="signature">
<table border="0" cellpadding="0" cellspacing="0" width="100%">
<tr>
  <td width="50%" style="padding-right:40pt;vertical-align:top;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="border:none;padding:0;">Mengetahui,</td></tr>
      <tr><td style="border:none;padding:0;height:60pt;"></td></tr>
      <tr><td style="border:none;padding:0;border-bottom:1pt solid black;width:150pt;">&nbsp;</td></tr>
      <tr><td style="border:none;padding:2pt 0;font-weight:bold;">Ketua Program Studi {{prodi}}</td></tr>
      <tr><td style="border:none;padding:2pt 0;">{{kaprodi}}</td></tr>
      <tr><td style="border:none;padding:2pt 0;">NIDN. {{nidn_kaprodi}}</td></tr>
    </table>
  </td>
  <td width="50%" style="padding-left:40pt;vertical-align:top;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="border:none;padding:0;">Mengetahui,</td></tr>
      <tr><td style="border:none;padding:0;height:60pt;"></td></tr>
      <tr><td style="border:none;padding:0;border-bottom:1pt solid black;width:150pt;">&nbsp;</td></tr>
      <tr><td style="border:none;padding:2pt 0;font-weight:bold;">Ketua STIKes IBNU SINA AJIBARANG</td></tr>
      <tr><td style="border:none;padding:2pt 0;">{{ketua_stikes}}</td></tr>
      <tr><td style="border:none;padding:2pt 0;">NIDN. {{nidn_ketua_stikes}}</td></tr>
    </table>
  </td>
</tr>
<tr><td colspan="2" style="border:none;padding:30pt 0 0 0;"></td></tr>
<tr>
  <td width="50%" style="padding-right:40pt;vertical-align:top;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="border:none;padding:0;">Ajibarang, {{tgl_penyusunan}}</td></tr>
      <tr><td style="border:none;padding:0;height:60pt;"></td></tr>
      <tr><td style="border:none;padding:0;border-bottom:1pt solid black;width:150pt;">&nbsp;</td></tr>
      <tr><td style="border:none;padding:2pt 0;font-weight:bold;">Dosen Pengampu</td></tr>
      <tr><td style="border:none;padding:2pt 0;">{{pengembang_rps}}</td></tr>
      <tr><td style="border:none;padding:2pt 0;">NIDN. {{nidn_pengembang}}</td></tr>
    </table>
  </td>
  <td width="50%" style="padding-left:40pt;vertical-align:top;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="border:none;padding:0;">Mengetahui,</td></tr>
      <tr><td style="border:none;padding:0;height:60pt;"></td></tr>
      <tr><td style="border:none;padding:0;border-bottom:1pt solid black;width:150pt;">&nbsp;</td></tr>
      <tr><td style="border:none;padding:2pt 0;font-weight:bold;">Wakil Ketua I</td></tr>
      <tr><td style="border:none;padding:2pt 0;">{{wakil_ketua_1}}</td></tr>
      <tr><td style="border:none;padding:2pt 0;">NIDN. {{nidn_wakil_ketua_1}}</td></tr>
    </table>
  </td>
</tr>
</table>
</div>

</body>
</html>`
}
