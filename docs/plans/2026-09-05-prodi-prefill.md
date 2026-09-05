# Plan: Pre-fill Data Berdasarkan Prodi

## Goal
Saat user membuat project baru dan memilih Prodi (tanpa MK), field-field identitas sudah terisi otomatis berdasarkan Prodi yang dipilih.

## Fields yang Terisi Otomatis

| Field | Sumber | Contoh |
|-------|--------|--------|
| `prodi` | `prodiData.nama` | "S1 Farmasi" |
| `semester_akademik` | Auto-generate tahun akademik | "2025-2026" |
| `semester` | Auto-generate dari bulan | "Genap" |
| `tgl_penyusunan` | Auto-generate hari ini | "2026-09-05" |
| `kaprodi` | Hardcode per Prodi | "Dr. Apt. X" |
| `ketua_stikes` | Hardcode (global) | "Dr. Y" |
| `cpl` | Union CPL dari semua MK di Prodi | [...] |

## Fields yang Kosong (MK-specific)

- `mata_kuliah`, `kode_mk`, `rumpun_mk`
- `cpmk`, `sub_cpmk`
- `bahan_kajian`
- `pustaka_utama`, `pustaka_pendukung`
- `matakuliah_syarat`

## Implementation Steps

### Step 1: Update `curriculum-data.ts`
- Tambah field `kaprodi`, `ketua_stikes`, `cplProdi[]` ke interface `ProdiData`
- Isi data untuk S1 Farmasi dan D3 Anafarma

### Step 2: Buat fungsi `getDefaultContentForProdi(prodiKode)`
- Return `Record<string, string>` dengan semua field terisi
- Auto-generate `semester_akademik`, `semester`, `tgl_penyusunan`

### Step 3: Update `StartScreen.tsx`
- `handleCreateNew()` panggil `getDefaultContentForProdi()` saat Prodi dipilih tanpa MK

### Step 4: User override (localStorage)
- Fungsi untuk save/load override kaprodi, ketua_stikes
- Nanti kalau ada settings UI, tinggal tambah

## Status
- [x] Step 1: Update curriculum-data.ts
- [x] Step 2: Buat fungsi getDefaultContentForProdi
- [x] Step 3: Update StartScreen.tsx
- [x] Step 4: User override (localStorage + SettingsModal)
