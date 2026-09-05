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

### Keyboard Shortcuts
- **Registration**: Hidden application menu (`Menu.setApplicationMenu` in `main.js`) — accelerators fire only while the app is focused (replaced `globalShortcut`, which was system-wide and consumed keys). Menu bar stays hidden (`setMenuBarVisibility(false)`).
- **File**: `Ctrl+N` new, `Ctrl+O` open, `Ctrl+S` save, `Ctrl+Shift+S` save as, `Ctrl+E` export dialog, `Ctrl+P` export PDF, `Ctrl+Shift+E` export Word, `Ctrl+Shift+I` import
- **Document editing** (window keydown in `Editor.tsx`): `Ctrl+Z`/`Ctrl+Y`/`Ctrl+Shift+Z` undo/redo **only when focus is outside an editable field** (inside an RTE/input the field's native undo wins); `F1` opens the guide for the active section; `Esc` closes context menu/shortcuts dialog; zoom `Ctrl+0` reset, `Ctrl+=` in, `Ctrl+-` out, `Ctrl+wheel` zoom
- **In-editor (TipTap built-ins)**: `Ctrl+B/I/U`, `Ctrl+Shift+X` strikethrough, `Ctrl+Shift+7/8` lists, `Ctrl+Shift+V` paste-as-plain-text (RTE `handlePaste` shiftKey branch)
- **Dialogs**: `Esc` closes guide → import → AI settings (App-level keydown)
- **Reference UI**: `ShortcutsDialog.tsx` (Help ribbon → Shortcuts button)

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

### Branch Protection & Release Pipeline (branch `build`)
- **`build` is protected (ruleset "Protect build branch (PR-only)")** — no direct pushes, force-pushes or deletions; all changes go through PRs. Configured via `gh` CLI (repo settings), ruleset id `22323154`. There is **no bypass actor** (even repo admins must use PRs).
- **Why the workflow uses an auto-PR**: GitHub deliberately blocks the built-in `github-actions[bot]` from pushing to protected branches (and it cannot be added as a bypass actor). The official pattern is to go through PRs — the workflow creates & merges its own bump PR via the API.
- **`.github/workflows/build-release.yml`**: when a PR from `main` is merged into `build` (guard: `head.ref == 'main'`, so the bot's own bump PRs never re-trigger a release) it (1) bumps the **patch** version with `npm version patch --no-git-tag-version` on branch `release/vX.Y.Z`, (2) opens a PR to `build` and merges it with `gh pr merge --squash` (`required_approving_review_count: 0`, extra-approval-for-unattributed-changes off), (3) tags `vX.Y.Z` at `origin/build`, (4) builds Windows EXE + macOS DMG (unsigned: `CSC_IDENTITY_AUTO_DISCOVERY=false`), (5) creates the GitHub Release `vX.Y.Z` with those installers. Workflow needs `contents: write` + `pull-requests: write`.
- Release version, `package.json` version, and the on-screen version chip (via Vite `__APP_VERSION__` define) always match — the app is built *after* the bump lands on `build`.
- `main` = development branch; releases only happen by merging `main` into `build`.
- Linux intentionally not built yet.

### In-app Update Mechanism (GitHub Releases)
- **Source repo**: `teguh02/rps-maker` (public — GitHub API works without a token). Hardcoded in `electron/main.js` (`UPDATE_SOURCE`) next to the semver helpers (`parseVersion`/`isNewer`), 60 s result cache.
- **Flow**: `StartScreen` calls `checkForUpdates()` on mount (start screen = app open) → main fetches `releases/latest`, compares `tag_name` with `app.getVersion()` → if newer and not dismissed for that version (localStorage `rps-dismissed-update`) it shows an update banner with dismiss (X) + Update buttons + live download %.
- **Update click** (`updates:install`): picks the platform installer asset (win32 → `.exe`, darwin → `.dmg`), streams it to `app.getPath('temp')` with progress events (`updates:download-progress`), then Windows spawns the NSIS installer detached + quits the app; macOS opens the DMG. In dev (not packaged) it opens the release page in the browser instead.
- Installers must therefore keep being attached to each GitHub Release — the `.github/workflows/build-release.yml` upload step already does (`*.exe`, `*.dmg`, `*.zip`).

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
