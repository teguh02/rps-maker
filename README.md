# RPS Maker UNISINA

Aplikasi desktop lintas platform untuk membantu dosen **Universitas Ibnu Sina Ajibarang** menyusun dokumen Rencana Pembelajaran Semester (RPS) secara efisien dan terstruktur.

## Demo

![RPS Maker UNISINA](docs/demo.gif)

## Fitur Utama

- **WYSIWYG Editor** — Pengisian RPS langsung pada tabel seperti Excel, dengan dukungan bold, italic, underline, dan list
- **Template Lengkap** — Cover, Identitas, Otorisasi, CPL/CPMK/Sub-CPMK, Deskripsi, Bahan Kajian, Penilaian, Pustaka, Pertemuan, dan Pengesahan
- **Preload Kurikulum** — Data CPL, CPMK, Sub-CPMK, dan materi sudah terisi otomatis untuk mata kuliah S1 Farmasi dan D3 Anafarma
- **Bantuan AI** — Integrasi AI untuk membantu menyusun capaian pembelajaran, indikator, dan materi perkuliahan
- **Export PDF & Word** — Dokumen RPS dapat diunduh dalam format PDF atau DOCX
- **Import dari Excel/CSV** — Impor data RPS dari file CSV
- **Auto-save** — Perubahan tersimpan otomatis secara berkala
- **Undo/Redo** — Dukungan undo/redo hingga 50 langkah
- **Zoom** — Perbesar/perkecil tampilan dari 25% hingga 400%
- **Pengaturan Global** — Data diri pengguna, Kaprodi, dan Ketua STIKes bisa diatur sekali dan otomatis terisi di project baru

## Tech Stack

- **Electron 44+** — Desktop runtime
- **React 18 + TypeScript** — UI framework
- **Vite 8** — Build tool
- **Tailwind CSS 4** — Styling
- **TipTap** — Rich text editor
- **docx** — Export ke Word
- **html2pdf.js** — Export ke PDF

## Instalasi

```bash
# Clone repository
git clone https://github.com/teguh02/rps-maker.git
cd rps-maker

# Install dependencies
npm install

# Jalankan development mode
npm run dev

# Build untuk produksi
npm run build

# Build installer Windows
npm run dist:win
```

## Struktur Project

```
├── electron/           # Electron main process
│   ├── main.js         # IPC handlers, PDF export, auto-update
│   └── preload.js      # Preload scripts
├── src/
│   ├── components/     # React components
│   │   ├── Editor.tsx          # Main editor dengan semua section RPS
│   │   ├── Ribbon.tsx          # Toolbar Office 365 style
│   │   ├── StructuredList.tsx  # Komponen tabel baris (CPL, CPMK, dll)
│   │   ├── RTE.tsx             # TipTap rich text editor wrapper
│   │   ├── PreviewPage.tsx     # Preview RPS
│   │   └── GuidePage.tsx       # Panduan lengkap
│   ├── services/
│   │   ├── ai.ts               # Integrasi AI (OpenRouter / custom)
│   │   ├── export.ts           # Export DOCX + PDF
│   │   ├── rpsTemplate.ts      # HTML template RPS
│   │   └── rpsDataMapper.ts    # Pengisian template dengan data
│   └── templates/
│       └── curriculum-data.ts   # Data kurikulum UNISINA
├── public/
│   └── guides/         # Gambar panduan
└── referensi/          # Dokumen referensi RPS (tidak di-include di build)
```

## Target Pengguna

Aplikasi ini dikhususkan untuk dosen **UNISINA** (Universitas Ibnu Sina Ajibarang):
- **S1 Farmasi**
- **D3 Analis Farmasi dan Makanan**

## Open Source

Proyek ini bersifat **open source** dan terbuka bagi siapa saja untuk ikut serta mengembangkan, memperbaiki, atau menyesuaikan dengan kebutuhan institusi masing-masing.

## Developer

**Teguh Rijanandi**
- Email: teguhrijanandi02@gmail.com
- GitHub: [teguh02](https://github.com/teguh02)

## License

MIT
