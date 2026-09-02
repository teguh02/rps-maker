# RPS Maker UNISINA

Word processor khusus Rencana Pembelajaran Semester (RPS) untuk Dosen UNISINA.

## Fitur

- **Editor WYSIWYG** — Seperti MS Word, langsung edit RPS
- **Template Preloaded** — CPL, CPMK, dan referensi dari kurikulum S1 Farmasi & D3 Anafarma
- **Project File (.rps)** — Simpan dan buka project kapan saja
- **Export DOCX & PDF** — Download dalam format Word atau PDF
- **AI Integration** — Generate CPMK, metode, asesmen, dan referensi via AI (OpenAI-compatible)
- **Import Kurikulum** — Import data dari file CSV
- **Tooltips & Panduan** — Penjelasan istilah akademik di tiap section
- **Keyboard Shortcuts** — Ctrl+S save, Ctrl+Shift+S save as
- **Cross-platform** — Windows, Linux, macOS

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build           # Build React + Electron
npm run dist:win        # Package Windows
npm run dist:linux      # Package Linux
npm run dist:mac        # Package macOS
```

## Tech Stack

- Electron 30+
- React 18 + TypeScript
- Vite
- Tailwind CSS
- TipTap (Rich Text Editor)
- docx (Word export)
- html2pdf.js (PDF export)
- JSZip (Project file format)

## License

MIT