# RPS Maker UNISINA — Design Spec

**Tanggal**: 2026-09-02
**Status**: Draft
**Author**: teguh + AI

---

## Ringkasan

Aplikasi desktop **word processor khusus RPS** — seperti MS Word tapi difokuskan untuk membuat Rencana Pembelajaran Semester. Buka aplikasi → buat project baru → edit RPS secara WYSIWYG → simpan sebagai file `.rps` → buka lagi kapan saja. Tanpa AI pun aplikasi berfungsi penuh sebagai editor RPS. Dengan AI, aplikasi jadi lebih powerful: bisa auto-fill, suggest, generate konten, dan rekomendasikan referensi.

---

## Filosofi

- **Simple seperti MS Word** — buka, langsung kerja, tidak perlu setup
- **AI adalah enhancement** — bukan requirement. App berfungsi normal tanpa AI
- **Project-based** — save/load file `.rps`, bukan cloud database
- **Dinamis & fleksibel** — user bisa edit apapas: logo, judul, nomor surat, format, dll
- **Pintar tapi tidak membingungkan** — ada panduan/tooltips untuk istilah akademik

---

## Target User

- Dosen UNISINA — S1 Farmasi dan D3 Anafarma
- Single-user desktop app
- Bisa dipakai oleh orang awam sekalipun (ada petunjuk di tiap section)

---

## Tech Stack

| Komponen | Pilihan | Alasan |
|----------|---------|--------|
| Runtime | Electron 30+ | Cross-platform (Win/Linux/Mac) |
| UI Framework | React 18 + TypeScript | Ecosystem besar |
| Build Tool | Vite | Super cepat, hot reload |
| Styling | Tailwind CSS | Cepat styling |
| Rich Text Editor | TipTap (ProseMirror) | WYSIWYG editor seperti Word, extendable |
| DOCX Export | `docx` npm | Generate .docx dari editor content |
| PDF Export | `@react-pdf/renderer` atau `html2pdf.js` | PDF dari HTML/CSS |
| Project File | Custom `.rps` (JSON/ZIP) | Simpan & buka project |
| LLM API | OpenAI-compatible fetch | Multi-provider, user input host + key |

> **Tidak pakai SQLite** — data tersimpan di project file `.rps`, bukan database lokal.
> Kalau butuh recent files list, pakai simple JSON file di app data folder.

---

## Concept: Seperti MS Word untuk RPS

### Alur Kerja

```
Buka Aplikasi
  → Start Screen: [Buat Baru] [Buka Recent] [Buka File]
  
Buat Baru:
  → Pilih Template: [Kosong] [S1 Farmasi] [D3 Anafarma]
  → Editor terbuka dengan template RPS
  → Isi/edit manual → Simpan sebagai .rps

Buka File:
  → File dialog → pilih .rps → editor terbuka
  → Lanjut editing → Save (Ctrl+S)

Export:
  → File → Export → [PDF] [DOCX]
  → Preview sebentar → Download dialog
```

### Editor — WYSIWYG, Bukan Form

User melihat dokumen RPS seperti yang akan tercetak. Bukan form input terpisah.

```
┌──────────────────────────────────────────────────────────────┐
│ File  Edit  View  Insert  Format  Tools  AI  Help           │
├──────────────────────────────────────────────────────────────┤
│ [B] [I] [U] [S] │ [H1▼] [H2▼] [Table▼] [Image▼] │ 🔍 ✨  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           [Logo UNISINA — klik untuk ganti]          │   │
│  │                                                      │   │
│  │        RENCANA PEMBELAJARAN SEMESTER (RPS)           │   │
│  │                                                      │   │
│  │  Program Studi: [S1 Farmasi         ]  │ editable   │   │
│  │  Mata Kuliah:   [Farmakokinetik Dasar] │ editable   │   │
│  │  Kode MK:       [FARM-4301          ]  │ editable   │   │
│  │  SKS:           [3                  ]  │ editable   │   │
│  │  Semester:      [4 (Empat)          ]  │ editable   │   │
│  │  Dosen Pengampu:[dr. Ahmad, M.Farm   ] │ editable   │   │
│  │                                                      │   │
│  │  ──────────────────────────────────────────────────  │   │
│  │                                                      │   │
│  │  A. CAPAIAN PEMBELAJARAN LULUSAN (CPL)              │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │ 1. Sikap: Junjung tinggi profesi...          │   │   │
│  │  │ 2. Pengetahuan: Memahami prinsip...          │   │   │
│  │  │ 3. Keterampilan: Menganalisis data...        │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  │  💡 CPL ini dari kurikulum prodi. Tidak bisa         │   │
│  │     dihapus, tapi bisa ditambah.                     │   │
│  │                                                      │   │
│  │  [✨ Generate CPMK dari CPL ini]                    │   │
│  │                                                      │   │
│  │  B. CAPAIAN PEMBELAJARAN MATA KULIAH (CPMK)        │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │ 1. CPMK 1: Mahasiswa mampu memahami...      │   │   │
│  │  │ 2. CPMK 2: Mahasiswa mampu menganalisis...  │   │   │
│  │  │                                              │   │   │
│  │  │ [+ Tambah CPMK]                              │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  │                                                      │   │
│  │  ... sections lainnya ...                            │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Status: Draft │ Auto-saved 12:34:56 │ AI: 🔴 Not connected  │
└──────────────────────────────────────────────────────────────┘
```

### Section dalam RPS (sesuai SN-Dikti 9 Komponen)

| # | Section | Editor Type | AI Action | Tooltip/Panduan |
|---|---------|------------|-----------|-----------------|
| 1 | Identitas MK | Inline editable fields | — | "Isi sesuai kurikulum prodi" |
| 2 | CPL | Preloaded list + tambah manual | — | "CPL dari kurikulum prodi, tidak boleh dihapus" |
| 3 | CPMK | Rich text list + toolbar | ✨ Generate dari CPL | "CPMK harus terukur, pakai KKO Bloom" |
| 4 | Sub-CPMK | Nested list per CPMK | ✨ Generate dari CPMK | "Pecah per minggu pertemuan" |
| 5 | Bahan Kajian | List dengan field tambah | ✅ Suggest dari CPMK | "Pilih yang relevan, update max 5 tahun" |
| 6 | Metode Pembelajaran | Multi-select / tag input | ✅ Suggest dari CPMK | "IKU 7: minimal 40% Case Method/TBP" |
| 7 | Pengalaman Belajar | Rich text per minggu | ✅ Generate dari Sub-CPMK | "Deskripsikan aktivitas konkret mahasiswa" |
| 8 | Asesmen | Table editor (rubrik) | ✅ Generate dari CPMK | "Bobot partisipatif minimal 50% untuk IKU 7" |
| 9 | Referensi | List editor (journal/book) | ✅ Suggest terkini | "Referensi max 5 tahun terakhir" |

---

## Template System

### Template Kosong (Default)

Template RPS kosong dengan format siap isi:

```html
<!-- Template HTML yang di-render di editor -->
<div class="rps-document">
  <header class="rps-cover">
    <img src="assets/logo-unisina.png" class="logo" />
    <h1>RENCANA PEMBELAJARAN SEMESTER</h1>
  </header>
  
  <section class="identitas">
    <table>
      <tr><td>Program Studi</td><td class="editable" data-field="prodi"></td></tr>
      <tr><td>Mata Kuliah</td><td class="editable" data-field="mata_kuliah"></td></tr>
      <tr><td>Kode MK</td><td class="editable" data-field="kode_mk"></td></tr>
      <tr><td>SKS</td><td class="editable" data-field="sks"></td></tr>
      <tr><td>Semester</td><td class="editable" data-field="semester"></td></tr>
      <tr><td>Dosen Pengampu</td><td class="editable" data-field="dosen"></td></tr>
      <tr><td>Semester Akademik</td><td class="editable" data-field="semester_akademik"></td></tr>
    </table>
  </section>

  <section class="cpl">
    <h2>A. CAPAIAN PEMBELAJARAN LULUSAN (CPL)</h2>
    <div class="editable-rich" data-field="cpl"></div>
  </section>

  <section class="cpmk">
    <h2>B. CAPAIAN PEMBELAJARAN MATA KULIAH (CPMK)</h2>
    <div class="editable-rich" data-field="cpmk"></div>
  </section>

  <section class="sub-cpmk">
    <h2>C. SUB-CPMK</h2>
    <div class="editable-rich" data-field="sub_cpmk"></div>
  </section>

  <section class="bahan-kajian">
    <h2>D. BAHAN KAJIAN</h2>
    <div class="editable-rich" data-field="bahan_kajian"></div>
  </section>

  <section class="metode">
    <h2>E. METODE PEMBELAJARAN</h2>
    <div class="editable-rich" data-field="metode"></div>
  </section>

  <section class="pengalaman-belajar">
    <h2>F. PENGAALAMAN BELAJAR MAHASISWA</h2>
    <div class="editable-rich" data-field="pengalaman_belajar"></div>
  </section>

  <section class="asesmen">
    <h2>G. ASESMEN / PENILAIAN</h2>
    <div class="editable-rich" data-field="asesmen"></div>
  </section>

  <section class="referensi">
    <h2>H. DAFTAR REFERENSI</h2>
    <div class="editable-rich" data-field="referensi"></div>
  </section>

  <footer class="ttd">
    <div class="ttd-dosen">Dosen Pengampu</div>
    <div class="ttd-kaprodi">Kaprodi</div>
  </footer>
</div>
```

### Template Preloaded (S1 Farmasi / D3 Anafarma)

Sama seperti template kosong, tapi CPL dan beberapa field sudah terisi dari kurikulum UNISINA. User tinggal lengkapi section lainnya.

---

## Project File (.rps)

### Format

`.rps` adalah **ZIP file** berisi:

```
my-rps.rps (ZIP)
├── document.json       // Semua konten RPS (field, teks, format)
├── metadata.json       // Nama file, prodi, MK, tanggal dibuat/diupdate
├── template.json       // Template yang dipakai (kosong/preloaded)
└── assets/
    └── logo-unisina.png  // Logo (bisa diganti user)
```

### document.json structure

```json
{
  "fields": {
    "prodi": "S1 Farmasi",
    "mata_kuliah": "Farmakokinetik Dasar",
    "kode_mk": "FARM-4301",
    "sks": "3",
    "semester": "4 (Empat)",
    "dosen": "dr. Ahmad, M.Farm",
    "semester_akademik": "2025/2026 Genap"
  },
  "sections": {
    "cpl": "<p>1. Sikap: Junjung tinggi...</p><p>2. Pengetahuan: Memahami...</p>",
    "cpmk": "<p>1. CPMK 1: Mahasiswa mampu...</p>",
    "sub_cpmk": "<p>1.1 Menjelaskan...</p><p>1.2 Menganalisis...</p>",
    "bahan_kajian": "<p>• Buku A: Farmakologi...</p>",
    "metode": "<p>Case Method, Team-Based Project</p>",
    "pengalaman_belajar": "<p>Minggu 1: ...</p>",
    "asesmen": "<table>...</table>",
    "referensi": "<p>1. Katzung (2024)...</p>"
  },
  "customizations": {
    "logo_path": "assets/logo-unisina.png",
    "header_text": "UNIVERSITAS IBNU SINA AJIBARANG",
    "nomor_surat": ""
  }
}
```

### Recent Files

App menyimpan list recent files di:
- **Windows**: `%APPDATA%/rps-maker/recent.json`
- **Linux**: `~/.config/rps-maker/recent.json`
- **macOS**: `~/Library/Application Support/rps-maker/recent.json`

Format:
```json
{
  "recent": [
    {
      "path": "C:/Users/teguh/Documents/RPS_Farmako.rps",
      "last_opened": "2026-09-02T12:00:00",
      "thumbnail": "base64..."
    }
  ]
}
```

---

## AI Integration

### Pendekatan: AI sebagai Assistant, Bukan Driver

- Tidak ada prompt API key saat pertama buka app
- App berfungsi normal tanpa AI
- AI muncul sebagai **opsi** di toolbar dan context menu
- Kalau AI belum dikonfigurasi, tombol AI disabled dengan tooltip "Konfigurasi AI di Settings"

### Cara AI Bekerja dalam Editor

**1. Context Menu (Klik Kanan)**
```
Klik kanan di section CPMK:
  → Generate CPMK dari CPL     ← AI action
  → Improve writing            ← AI action
  → Check alignment            ← AI action
  → ─────────────
  → Copy
  → Paste
  → Format text
```

**2. Toolbar Button "✨ AI"**
```
Dropdown menu:
  → Generate section ini
  → Improve all sections
  → Check OBE alignment
  → Suggest referensi
  → ─────────────
  → Settings AI...
```

**3. Inline AI Suggestion**
Ketika user mengetik di section tertentu, AI bisa muncul sebagai ghost text suggestion (seperti GitHub Copilot). User tekan Tab untuk accept.

### AI Provider Settings (di menu Tools → AI Settings)

```
┌─────────────────────────────────────────┐
│  ⚙️  AI Configuration                   │
│                                         │
│  API Host: [https://api.openai.com   ] │
│  API Key:  [************************ ] │
│  Model:    [gpt-4o                    ] │
│                                         │
│  [Test Connection]                      │
│                                         │
│  Status: ✅ Connected                   │
│  Response time: 1.2s                    │
│                                         │
│  [Save]  [Cancel]                       │
└─────────────────────────────────────────┘
```

### Prompt Strategy

| Action | System Prompt | Context |
|--------|--------------|---------|
| Generate CPMK | "Ahli kurikulum OBE, buat CPMK terukur..." | CPL + SKS + nama MK |
| Generate Sub-CPMK | "Pecah CPMK menjadi unit kecil per minggu..." | CPMK + jumlah minggu |
| Suggest Bahan Kajian | "Suggest bahan kajian relevan dan terkini..." | CPMK + referensi wajib |
| Suggest Metode | "Pilih metode OBE yang sesuai..." | CPMK + SKS |
| Generate Pengalaman Belajar | "Rancang aktivitas mahasiswa..." | Sub-CPMK + metode |
| Generate Asesmen | "Rancang rubrik OBE yang valid..." | CPMK + metode |
| Suggest Referensi | "Suggest referensi max 5 tahun terakhir..." | Bahan kajian |
| Check Alignment | "Cek keselarasan CPL-CPMK-Asesmen..." | Semua section |
| Improve Writing | "Perbaiki penulisan agar lebih akademis..." | Section yang dipilih |

### API Call

```typescript
POST {apiHost}/v1/chat/completions
{
  model: apiModel || "gpt-4o",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: promptWithContext }
  ],
  temperature: 0.7,
  max_tokens: 2000
}

// Response
response.choices[0].message.content → parse → apply to editor
```

---

## Fitur Pendukung

### Panduan / Tooltips

Setiap section ada ikon ℹ️ yang diklik menampilkan penjelasan:

- **CPL**: "Capaian Pembelajaran Lulusan adalah kompetensi yang harus dikuasai mahasiswa saat wisuda. CPL ditetapkan oleh program studi, bukan oleh dosen."
- **CPMK**: "Capaian Pembelajaran Mata Kuliah harus terukur. Gunakan KKO Bloom: Mengidentifikasi (C2), Menganalisis (C4), Mencipta (C6), dll."
- **IKU 7**: "Indikator Kinerja Utama ke-7: minimal 40% mata kuliah harus pakai Case Method atau Team-Based Project. Bobot asesmen partisipatif minimal 50%."
- **Constructive Alignment**: "Pastikan CPL → CPMK → Asesmen saling selaras. Apa yang diukur harus sama dengan apa yang dipelajari."

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New project |
| `Ctrl+O` | Open file |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save As |
| `Ctrl+E` | Export (pilih format) |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+Shift+G` | Generate section via AI |

### Auto-save

- Auto-save setiap 30 detik ke file `.rps` yang sedang dibuka
- Backup sebelum save: `my-rps.backup.rps`
- Recover dari crash: tampilkan dialog "Recover unsaved changes?"

---

## Export System

### DOCX Export

Menggunakan library `docx` untuk generate .docx dari editor content:

```
Output: RPS_Farmakokinetik_Dasar.docx
├── Halaman 1: Cover (Logo + Judul + Info)
├── Halaman 2: Identitas + CPL + CPMK
├── Halaman 3: Sub-CPMK + Bahan Kajian + Metode
├── Halaman 4: Pengalaman Belajar + Alokasi Waktu
├── Halaman 5: Asesmen (Kriteria + Indikator + Bobot + Rubrik)
├── Halaman 6: Daftar Referensi
└── Halaman 7: TTD Pengesahan
```

### PDF Export

Menggunakan `html2pdf.js` atau `@react-pdf/renderer`:

- Render editor content ke PDF
- Font: Times New Roman 12pt
- Margin: 1 inch
- Watermark "DRAFT" jika status draft
- Page numbers di footer
- Header: Logo UNISINA + nama prodi

### Excel Export (Optional — Phase 2)

Sheet 1: Matriks CPL → CPMK → Sub-CPMK → Asesmen
Sheet 2: Detail RPS per minggu

---

## Settings

### Menu: Tools → Settings

```
┌─────────────────────────────────────────────────┐
│  ⚙️  Settings                                   │
│                                                 │
│  ┌────────────────────────────────────────────┐ │
│  │  📄 Default Export                         │ │
│  │  Format: [PDF ▼]                           │ │
│  │  Font:   [Times New Roman ▼]               │ │
│  │  Size:   [12pt ▼]                          │ │
│  └────────────────────────────────────────────┘ │
│                                                 │
│  ┌────────────────────────────────────────────┐ │
│  │  🤖 AI Configuration                       │ │
│  │  Host: [https://api.openai.com          ]  │ │
│  │  Key:  [********************************]  │ │
│  │  Model:[gpt-4o                           ]  │ │
│  │  [Test Connection]                          │ │
│  └────────────────────────────────────────────┘ │
│                                                 │
│  ┌────────────────────────────────────────────┐ │
│  │  📚 Import Kurikulum                       │ │
│  │  [Upload Excel/CSV]                         │ │
│  │  Format: Nama MK, Kode, SKS, CPL, CPMK    │ │
│  └────────────────────────────────────────────┘ │
│                                                 │
│  [Save]  [Cancel]                               │
└─────────────────────────────────────────────────┘
```

---

## Data Preloaded

Dari kurikulum UNISINA di folder `referensi/`:

- **2 Prodi**: S1 Farmasi, D3 Anafarma
- **~30+ mata kuliah** beserta CPL/CPMK
- **Template kosong** dengan format sesuai FORMAT RPS.docx
- **Logo UNISINA** default
- **Panduan singkat** untuk tiap section

---

## Error Handling

| Error | Handling |
|-------|----------|
| File corrupt | "File tidak dapat dibuka. Mungkin corrupt." |
| AI error | "Gagal generate. Periksa API key di Settings." |
| Export gagal | "Export gagal. Coba kurangi ukuran konten." |
| Crash | Auto-save → recovery dialog saat buka lagi |

---

## Build & Distribution

| Platform | Tool | Output |
|----------|------|--------|
| Windows | `electron-builder` | `.exe` installer |
| Linux | `electron-builder` | `.AppImage` + `.deb` |
| macOS | `electron-builder` | `.dmg` |

```bash
npm run build
npm run dist:win
npm run dist:linux
npm run dist:mac
```

---

## Scope

### Phase 1 (MVP)
- [ ] Word processor editor (TipTap/WYSIWYG)
- [ ] Template kosong + template preloaded
- [ ] Project file `.rps` (save/load)
- [ ] Recent files list
- [ ] Export DOCX
- [ ] Export PDF
- [ ] AI generate per section (multi-provider)
- [ ] AI settings
- [ ] Panduan/tooltips per section
- [ ] Keyboard shortcuts
- [ ] Auto-save + recovery
- [ ] Cross-platform build

### Phase 2 (Future)
- [ ] Import kurikulum via Excel
- [ ] Export Excel (matriks CPL-CPMK)
- [ ] Batch generate (banyak RPS sekaligus)
- [ ] Versioning/history RPS
- [ ] Custom template upload
- [ ] Dark mode
- [ ] Auto-update

---

## Referensi

- `referensi/Analisis Penyusunan RPS Dosen.md` — Analisis komprehensif RPS berbasis OBE
- `referensi/RPS GENAP 25-26 UNISINA/FORMAT RPS.docx` — Template format RPS
- `referensi/RPS GENAP 25-26 UNISINA/Dokumen KURIKULUM D3 ANAFARMA TERBARU 2024 rv Feb 2026.pdf` — Kurikulum D3
- `referensi/RPS GENAP 25-26 UNISINA/REVISI-1 DOKUMEN KURIKULUM S1 FARMASI 2023.pdf` — Kurikulum S1
- `referensi/RPS GENAP 25-26 UNISINA/RPS D3 Anafarma GENAP 25-26/` — Contoh RPS D3
- `referensi/RPS GENAP 25-26 UNISINA/RPS S1 Farmasi GENAP 25-26/` — Contoh RPS S1
