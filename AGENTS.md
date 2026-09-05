# AGENTS.md — RPS Maker UNISINA

## Overview
**RPS Maker UNISINA** is a cross-platform Electron desktop application for creating Rencana Pembelajaran Semester (RPS) documents. It provides a WYSIWYG word-processor-like interface with optional AI assistance via OpenAI-compatible APIs.

**Target Users:** Dosen UNISINA only (S1 Farmasi & D3 Anafarma)

## Tech Stack
- **Electron 44+** — Desktop runtime
- **React 18 + TypeScript** — UI framework
- **Vite 8** — Build tool
- **Tailwind CSS 4** — Styling
- **TipTap** — Rich text editor
- **JSZip** — ZIP file handling
- **docx** — DOCX export
- **html2pdf.js** — PDF export

## Project Structure
```
├── electron/           # Electron main process
│   ├── main.js        # Main process, IPC handlers, CORS fix
│   └── preload.js     # Preload scripts with unsubscribe-returning listeners
├── src/
│   ├── components/    # React components
│   │   ├── Editor.tsx # Main editor with all RPS sections (3000+ lines)
│   │   ├── Ribbon.tsx # Office 365 style ribbon toolbar
│   │   ├── GuidePage.tsx # Detailed guide pages with screenshots
│   │   ├── StartScreen.tsx # Start screen with recent files
│   │   ├── RTE.tsx    # TipTap rich text editor wrapper
│   │   ├── icons.tsx  # SVG icons
│   │   └── ImportDialog.tsx # CSV import dialog
│   ├── services/
│   │   ├── ai.ts      # AI service (free/custom provider)
│   │   └── export.ts  # DOCX + PDF export
│   ├── styles/
│   │   └── index.css  # All custom CSS classes
│   ├── utils/
│   │   └── logger.ts  # Logging utility
│   └── App.tsx        # Main app component
├── public/
│   └── guides/        # Guide screenshot images
├── referensi/         # Reference RPS documents (NOT included in build)
└── build/             # App icons
```

## RPS Structure (Section Order)
1. **Identitas** — First tab (leftmost), contains all identity fields
2. **Cover** — Portrait A4 preview
3. **Otorisasi** — Only `koordinator_rmk`
4. **CPL** — Capaian Pembelajaran Lulusan
5. **CPMK** — Capaian Pembelajaran Mata Kuliah
6. **Sub-CPMK** — Kemampuan Akhir Tiap Tahapan Belajar
7. **Deskripsi** — Deskripsi Singkat Mata Kuliah
8. **Bahan Kajian** — Materi Pembelajaran
9. **Penilaian** — Format Penilaian
10. **Pustaka** — Referensi
11. **Pertemuan** — Jadwal Pertemuan (11 columns, matches RPS reference)
12. **TTD** — Pengesahan

## Key Conventions

### Data Structures
- **CPL/CPMK/Sub-CPMK/Bahan Kajian**: JSON arrays with `label` + `deskripsi`
- **Penilaian**: JSON array of `{item, bobot}`
- **Pertemuan**: JSON array of PertemuanItem objects
- **SKS**: `sks_t`/`sks_p` (split theory/practice)

### UI Patterns
- **Ribbon tabs**: File, Home, AI, View, Help (Office 365 style)
- **Section tabs**: Blue/white ribbon theme, Identitas is first tab
- **Toast notifications**: Fixed bottom-center, auto-dismiss 3s
- **Context menu**: Right-click with Cut/Copy/Paste
- **Clipboard API**: `navigator.clipboard` with validation + toasts
- **Undo/Redo**: Whole-document history stack (up to 50 states)
- **Zoom**: CSS `transform: scale()`, range 25%-400%

### Guide System
- **GuidePage.tsx**: Detailed guide pages with screenshots
- **guideData**: Each section has title, description, image
- **"Selengkapnya" links**: In section guide alerts
- **Reference footer**: "RENCANA PEMBELAJARAN SEMESTER (RPS) GENAP TAHUN AKADEMIK 2025-2026 BIOFARMASETIKA (SF555) PRODI S1 FARMASI"

### StructuredList Component
- Used for: CPL, CPMK, Sub-CPMK, Bahan Kajian
- Features: Add, Remove, Reorder, Edit Label/Deskripsi
- Deskripsi cells use compact **RTE** (rich text) — formatting is stored as HTML in the project file
- **RowActions** component (leftmost column): professional SVG ↑↓/🗑 buttons (`.row-action-btn`), shared with Penilaian table

### WYSIWYG Formatting (Home ribbon)
- Font family + font size dropdowns, Bold/Italic/Underline/Strike, Bullet/Numbered lists, alignment, Clear format
- Commands target the **active** TipTap editor via `src/services/editorRegistry.ts`
- Applies to every RTE field (Deskripsi, Pustaka, StructuredList deskripsi, Pertemuan cells)
- Formatting persists with the project: RTE content is stored as HTML in `document.json` inside the `.rps` ZIP
- **No inline images**: TipTap `handlePaste`/`handleDrop` block image files; no Image extension is registered
- FontSize is a custom extension (`src/services/fontSizeExtension.ts`); font family uses `@tiptap/extension-font-family` + TextStyle

### Auto-save
- Activates only after the project has a real file path (first manual save / open)
- Writes silently via `project:save-silent` IPC (no dialog) every 15s when content changed
- Indicator dot + last-save time shown at the right of the section tabs bar

### Export (DOCX + PDF)
- Both match the Excel→HTML reference (`referensi/.../rps-konversi-sendiri.html`): **A4 landscape**, Times New Roman, 14-column bordered table
- Header block: logo (base64-inlined from `src/assets/logo-unisina.png`), STIKES, prodi, tahun ajaran, RPS code
- Sections: identitas, otorisasi, CP/CPMK/Sub-CPMK, deskripsi, bahan kajian, penilaian, pustaka, dosen, pertemuan (5-row merged header), signature block
- PDF written via html2pdf worker chain → `pdf.output('arraybuffer')` → `writeFileToPath` (fixes blank-page/download issue)

## Recent Changes (Current Session)

### WYSIWYG + Icons + Web Search + Auto-save + Export Rework
- Home ribbon: font family/size, B/I/U/S, lists, alignment, clear format (see above)
- Standardized professional ↑↓/🗑 row-action buttons across CPL/CPMK/Sub-CPMK/Bahan Kajian/Penilaian; Penilaian gained reorder
- OpenRouter web search: `plugins: [{ id: 'web', max_results: 5 }]` added in `electron/main.js` for openrouter.ai hosts (works with free models)
- Auto-save after first manual save (see above)
- Export rewritten to match the Excel→HTML reference layout (see above)
- `saveProjectSilent` exposed in preload + `project:save-silent` IPC in main
- Rich text fields sanitized with `stripHtml` (`src/utils/html.ts`) before being sent to AI prompts / DOCX text

## Important Notes

### Build & Distribution
- **NSIS installer**: `release/RPS Maker UNISINA Setup 1.0.0.exe`
- **referensi/ folder**: NOT included in build (excluded via package.json files config)
- **App icon**: `build/icon.png` (PNG format, not ICO)

### AI Integration
- **Free provider**: OpenRouter with 6 API keys round-robin
- **Custom provider**: User-provided host/key/model
- **CORS fix**: IPC handler in main.js with Node.js fetch
- **Web search**: enabled automatically for any openrouter.ai host (web plugin, max 5 results) — free models included

### Field Consolidation
- All identity fields moved to Identitas tab
- Otorisasi only has `koordinator_rmk`
- Dosen & Syarat tab removed
- `dosen_pengampu` field in Identitas used for TTD and export

## Known Issues / TODO
- Pertemuan table header row 2 uses "Luring"/"Daring" labels while the reference splits differently; export uses the reference's 5-row merged header
- `RTE` in Pertemuan cells renders many TipTap instances (one per cell) — memoized with a content comparator for performance
- GuidePage screenshots may be outdated after UI changes

## Development Commands
```bash
npm run dev          # Start dev (Vite + Electron)
npm run build        # Build Vite
npm run dist:win     # Build Windows installer
```
