# Master Berkas — Design Spec

## Overview

Sistem RAG (Retrieval-Augmented Generation) untuk menyimpan dokumen referensi yang bisa dipakai AI sebagai konteks saat generate konten RPS. Mirip fitur "Projects" di ChatGPT yang bisa menyimpan instructions dan files sebagai context.

## Goals

1. User bisa upload dokumen referensi (PDF, Word, Excel/CSV)
2. Teks terekstrak otomatis dan disimpan
3. AI menggunakan extracted text sebagai context saat generate konten
4. Dokumen dikelompokkan berdasarkan nama kelompok (free text)

## Constraints

- Max 6 dokumen per kelompok
- Storage global (berlaku untuk semua project)
- Nama kelompok = free text input

---

## Data Structure

**Storage location:** `userData/master-berkas.json`

```typescript
interface MasterBerkasGroup {
  id: string;           // uuid
  name: string;         // free text, e.g. "S1 Farmasi", "D3 Anafarma"
  documents: MasterBerkasDocument[];
}

interface MasterBerkasDocument {
  id: string;           // uuid
  name: string;         // editable filename
  originalName: string; // original uploaded filename
  fileType: 'pdf' | 'docx' | 'xlsx' | 'csv';
  extractedText: string; // full extracted text content
  uploadedAt: string;   // ISO date
}

interface MasterBerkasData {
  groups: MasterBerkasGroup[];
  activeGroupId: string | null; // which group is selected for AI
}
```

---

## UI Flow

### Navigation

- Ribbon AI tab → tombol "Master Berkas" → buka halaman baru `MasterBerkasPage`
- Halaman baru full-screen (seperti `PreviewPage`), bukan modal
- Tombol "Kembali" di pojok kiri atas → kembali ke Editor

### Layout

```
┌─────────────────────────────────────────────────┐
│ ← Kembali ke Editor                              │
├─────────────────────────────────────────────────┤
│ Master Berkas                                     │
│                                                   │
│ Kelompok: [___________] [+ Tambah Kelompok]       │
│                                                   │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│ │ Doc 1   │ │ Doc 2   │ │ Doc 3   │  (cards)    │
│ │ name    │ │ name    │ │ name    │              │
│ │ type    │ │ type    │ │ type    │              │
│ │ [Hapus] │ │ [Hapus] │ │ [Hapus] │              │
│ └─────────┘ └─────────┘ └─────────┘              │
│                                                   │
│ [+ Tambah Dokumen] (max 6)                        │
│                                                   │
│ Gunakan untuk AI: [ toggle ]                      │
└─────────────────────────────────────────────────┘
```

### Flow Tambah Dokumen

1. Klik "Tambah Dokumen" → file picker (PDF/DOCX/XLSX/CSV)
2. File di-upload → loading indicator
3. Nama file otomatis terisi di input teks (bisa diedit)
4. Klik "Simpan" → text extraction → simpan ke JSON

---

## File Extraction Pipeline

### Architecture

- Extraction dilakukan di **main process** (Node.js)
- Renderer kirim file buffer via IPC → main process extract → return text

### IPC Channels

| Channel | Direction | Purpose |
|---|---|---|
| `master-berkas:load` | invoke | Load semua data dari JSON |
| `master-berkas:save` | invoke | Simpan semua data ke JSON |
| `master-berkas:extract` | invoke | Receive file buffer → extract text → return |

### Libraries

- `mammoth` — DOCX → text
- `pdf-parse` — PDF → text
- `xlsx` — Excel/CSV → text

### Extraction Logic

```
File buffer masuk → cek extension →
  pdf: pdf-parse(buffer) → text
  docx: mammoth.extractRawText({buffer}) → text
  xlsx: XLSX.read(buffer) → sheet_to_csv → text
  csv: buffer.toString('utf-8') → text
→ return { extractedText, fileName }
```

---

## AI Integration

### System Prompt Modification

```
[System prompt existing Anda adalah ahli kurikulum...]

KONTEKS MASTER BERKAS:
Berikut adalah dokumen referensi yang telah diunggah oleh pengguna:
---
[extracted text dari semua dokumen di group aktif]
---
Gunakan dokumen referensi di atas sebagai dasar utama dalam mengembangkan konten RPS.
```

### Flow

1. `ai.ts` → `buildSystemPrompt()` → cek `activeGroupId` dari localStorage
2. Jika ada → load `master-berkas.json` → append extracted text ke system prompt
3. Kirim ke API seperti biasa

### AI Settings Modal

- Tambah dropdown "Gunakan Master Berkas" → pilih group atau "Tidak ada"
- Dropdown hanya muncul jika ada minimal 1 group

---

## Files to Modify

| File | Action |
|---|---|
| `electron/main.js` | Tambah IPC handlers + extraction logic |
| `electron/preload.js` | Expose IPC channels baru |
| `src/components/MasterBerkasPage.tsx` | **NEW** — halaman master berkas |
| `src/components/Ribbon.tsx` | Tambah tombol "Master Berkas" di AI tab |
| `src/components/SettingsModal.tsx` | Tambah dropdown master berkas |
| `src/services/ai.ts` | Modifikasi system prompt injection |
| `src/App.tsx` | Tambah state `showMasterBerkas` |
| `package.json` | Tambah dependencies: mammoth, pdf-parse, xlsx |
