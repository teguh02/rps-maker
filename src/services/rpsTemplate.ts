/**
 * Static RPS HTML template based on the official UNISINA Excel→HTML conversion.
 * All example values are replaced with {{placeholders}}.
 * The mapper (rpsDataMapper.ts) fills in actual data at export/preview time.
 */

export function getRpsTemplate(): string {
  return `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml"
xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:x="urn:schemas-microsoft-com:office:excel"
xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv=Content-Type content="text/html; charset=utf-8">
<style>
@page { size: A4 landscape; margin: .75in .7in .75in .7in; }
table { border-collapse: collapse; }
body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; }
</style>
</head>
<body>
<table border=0 cellpadding=0 cellspacing=0 width=896 style='border-collapse:collapse;table-layout:fixed;width:672pt'>
<col width=64 span=14 style='width:48pt'>

<!-- Row 1-3: Header -->
<tr height=20 style='height:15.0pt'>
  <td colspan=2 rowspan=3 height=61 style='border-right:1.0pt solid black;border-bottom:1.0pt solid black;height:45.5pt;width:96pt'>{{logo}}</td>
  <td colspan=10 style='border-right:1.0pt solid black;border-left:none;width:480pt;font-size:14pt;font-weight:bold;text-align:center;'>STIKES IBNU SINA AJIBARANG</td>
  <td colspan=2 rowspan=3 style='border-right:1.0pt solid black;border-bottom:1.0pt solid black;width:96pt;font-size:10pt;text-align:center;'>{{doc_code}}</td>
</tr>
<tr height=20 style='height:15.0pt'>
  <td colspan=10 height=20 style='border-right:1.0pt solid black;height:15.0pt;border-left:none;width:480pt;font-size:12pt;font-weight:bold;text-align:center;'>PROGRAM STUDI {{prodi}}</td>
</tr>
<tr height=21 style='height:15.5pt'>
  <td colspan=10 height=21 style='border-right:1.0pt solid black;height:15.5pt;border-left:none;width:480pt;font-size:12pt;font-weight:bold;text-align:center;'>TAHUN AKADEMIK {{semester_akademik}}</td>
</tr>

<!-- Row 4: Title -->
<tr height=21 style='height:15.5pt'>
  <td colspan=14 height=21 style='border-right:1.0pt solid black;height:15.5pt;width:672pt;font-size:12pt;font-weight:bold;text-align:center;'>RENCANA PEMBELAJARAN SEMESTER</td>
</tr>

<!-- Row 5: Identitas Header -->
<tr height=41 style='height:30.5pt'>
  <td colspan=4 height=41 style='border-right:1.0pt solid black;height:30.5pt;width:192pt;font-weight:bold;'>MATA KULIAH (MK)</td>
  <td colspan=2 style='border-right:1.0pt solid black;border-left:none;width:96pt;font-weight:bold;'>KODE</td>
  <td colspan=3 style='border-right:1.0pt solid black;border-left:none;width:144pt;font-weight:bold;'>Rumpun MK</td>
  <td colspan=2 style='border-right:1.0pt solid black;border-left:none;width:96pt;font-weight:bold;'>BOBOT (sks)</td>
  <td style='width:48pt;font-weight:bold;'>SEMESTER</td>
  <td colspan=2 style='border-right:1.0pt solid black;border-left:none;width:96pt;font-weight:bold;'>Tgl Penyusunan</td>
</tr>

<!-- Row 6: Identitas Values -->
<tr height=21 style='height:16.0pt'>
  <td colspan=4 height=21 style='border-right:1.0pt solid black;height:16.0pt;width:192pt;'>{{mata_kuliah}}</td>
  <td colspan=2 style='border-right:1.0pt solid black;border-left:none;width:96pt;'>{{kode_mk}}</td>
  <td colspan=3 style='border-right:1.0pt solid black;border-left:none;width:144pt;'>{{rumpun_mk}}</td>
  <td style='width:48pt;'>T= {{sks_t}}</td>
  <td style='width:48pt;'>P= {{sks_p}}</td>
  <td style='width:48pt;'>{{semester}}</td>
  <td colspan=2 style='border-right:1.0pt solid black;border-left:none;width:96pt;'>{{tgl_penyusunan}}</td>
</tr>

<!-- Row 7-8: Otorisasi -->
<tr height=21 style='height:15.5pt'>
  <td colspan=4 rowspan=2 height=61 style='border-right:1.0pt solid black;border-bottom:1.0pt solid black;height:45.5pt;width:192pt;font-weight:bold;'>OTORISASI</td>
  <td colspan=3 style='border-right:1.0pt solid black;border-left:none;width:144pt;font-weight:bold;'>Pengembang RPS</td>
  <td colspan=4 style='border-right:1.0pt solid black;border-left:none;width:192pt;font-weight:bold;'>Koordinator RMK</td>
  <td colspan=3 style='border-right:1.0pt solid black;border-left:none;width:144pt;font-weight:bold;'>Ketua Program Studi</td>
</tr>
<tr height=40 style='height:30.0pt'>
  <td colspan=3 height=40 style='border-right:1.0pt solid black;height:30.0pt;border-left:none;width:144pt;'>{{pengembang_rps}}</td>
  <td colspan=4 style='border-right:1.0pt solid black;border-left:none;width:192pt;'>{{koordinator_rmk}}</td>
  <td colspan=3 style='border-right:1.0pt solid black;border-left:none;width:144pt;'>{{kaprodi}}</td>
</tr>

<!-- Row 9+: Capaian Pembelajaran (CPL + CPMK + Sub-CPMK) -->
{{capaian_section}}

<!-- Deskripsi -->
<tr height=103 style='height:77.5pt'>
  <td colspan=2 height=103 style='border-right:1.0pt solid black;height:77.5pt;width:96pt;font-weight:bold;'>Deskripsi Singkat MK</td>
  <td colspan=12 style='border-right:1.0pt solid black;border-left:none;width:576pt;'>{{deskripsi_mk}}</td>
</tr>

<!-- Bahan Kajian -->
{{bahan_kajian_section}}

<!-- Penilaian -->
{{penilaian_section}}

<!-- Pustaka -->
{{pustaka_section}}

<!-- Dosen & Prasyarat -->
<tr height=21 style='height:15.5pt'>
  <td colspan=2 height=21 style='border-right:1.0pt solid black;height:15.5pt;width:96pt;font-weight:bold;'>Dosen Pengampu</td>
  <td colspan=12 style='border-right:1.0pt solid black;border-left:none;width:576pt;'>{{dosen_pengampu}}</td>
</tr>
<tr height=40 style='height:30.0pt'>
  <td colspan=2 height=40 style='border-right:1.0pt solid black;height:30.0pt;width:96pt;font-weight:bold;'>Matakuliah Syarat</td>
  <td colspan=12 style='border-right:1.0pt solid black;border-left:none;width:576pt;'>{{matakuliah_syarat}}</td>
</tr>

<!-- Tabel Pertemuan Header + Rows -->
{{pertemuan_section}}

</table>
</body>
</html>`
}
