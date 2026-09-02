// AI Service — multi-provider OpenAI-compatible API

interface AISettings {
  apiHost: string
  apiKey: string
  model: string
}

const SETTINGS_KEY = 'rps-maker-ai-settings'

export function getAISettings(): AISettings {
  const raw = localStorage.getItem(SETTINGS_KEY)
  if (raw) {
    try { return JSON.parse(raw) } catch { /* ignore */ }
  }
  return { apiHost: 'https://api.openai.com', apiKey: '', model: 'gpt-4o' }
}

export function setAISettings(settings: AISettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function isAIConfigured(): boolean {
  const s = getAISettings()
  return !!s.apiKey && !!s.apiHost
}

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  const s = getAISettings()
  if (!s.apiKey) return { ok: false, message: 'API Key belum diisi' }

  try {
    const res = await fetch(`${s.apiHost}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${s.apiKey}`,
      },
      body: JSON.stringify({
        model: s.model,
        messages: [{ role: 'user', content: 'Hello, respond with OK' }],
        max_tokens: 10,
      }),
    })
    if (res.ok) return { ok: true, message: 'Koneksi berhasil!' }
    const data = await res.json().catch(() => ({}))
    return { ok: false, message: `Error ${res.status}: ${data.error?.message || res.statusText}` }
  } catch (err) {
    return { ok: false, message: `Gagal koneksi: ${(err as Error).message}` }
  }
}

interface GenerateOptions {
  section: string
  systemPrompt: string
  userPrompt: string
}

export async function generateWithAI(options: GenerateOptions): Promise<string> {
  const s = getAISettings()
  if (!s.apiKey) throw new Error('API Key belum dikonfigurasi. Buka Settings untuk mengatur.')

  const res = await fetch(`${s.apiHost}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${s.apiKey}`,
    },
    body: JSON.stringify({
      model: s.model,
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(`API Error ${res.status}: ${data.error?.message || res.statusText}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

// Prompt templates per section
export function getSectionPrompt(section: string, content: Record<string, string>): GenerateOptions {
  const base = `Anda adalah ahli kurikulum pendidikan tinggi di Indonesia yang mengkhususkan diri dalam Rencana Pembelajaran Semester (RPS) berbasis Outcome-Based Education (OBE).
Anda harus merespons dalam Bahasa Indonesia dengan format HTML yang rapi (gunakan <p>, <ul>, <li>, <strong>).

Panduan penting:
- CPMK harus terukur dan menggunakan KKO Taksonomi Bloom
- Gunakan metode Student-Centered Learning (Case Method, Team-Based Project)
- Untuk IKU 7: minimal 40% mata kuliah harus partisipatif dengan bobot minimal 50%
- Referensi harus terkini (5 tahun terakhir)
- Gunakan format HTML yang bersih, tanpa <html> atau <body> tag.`

  const c = content

  switch (section) {
    case 'cpmk':
      return {
        section,
        systemPrompt: base,
        userPrompt: `Buat CPMK (Capaian Pembelajaran Mata Kuliah) yang terukur untuk mata kuliah "${c.mata_kuliah || ''}" dengan SKS ${c.sks || '?'}

CPL Program Studi:
${c.cpl || 'Belum diisi'}

Buat minimal 3 CPMK dengan KKO Bloom yang beragam (misalnya: Memahami C2, Menganalisis C4, Mencipta C6). Setiap CPMK harus spesifik dan terukur.`,
      }
    case 'sub_cpmk':
      return {
        section,
        systemPrompt: base,
        userPrompt: `Pecah CPMK berikut menjadi Sub-CPMK (unit kompetensi kecil) yang bisa diselesaikan dalam 1-2 pertemuan:

CPMK:
${c.cpmk || 'Belum diisi'}

Buat Sub-CPMK per minggu pertemuan. Gunakan format: "1.1 Menjelaskan...", "1.2 Menganalisis...", dst.`,
      }
    case 'bahan_kajian':
      return {
        section,
        systemPrompt: base,
        userPrompt: `Suggest bahan kajian relevan untuk mata kuliah "${c.mata_kuliah || ''}"

CPMK:
${c.cpmk || 'Belum diisi'}

Buat daftar bahan kajian yang mencakup konsep dasar hingga aplikasi. Format: bullet point dengan penjelasan singkat.`,
      }
    case 'metode':
      return {
        section,
        systemPrompt: base,
        userPrompt: `Pilih dan jelaskan metode pembelajaran yang sesuai untuk mata kuliah "${c.mata_kuliah || ''}" (${c.sks || '?'} SKS)

CPMK:
${c.cpmk || 'Belum diisi'}

Rekomendasikan metode: Case Method, Team-Based Project, Problem-Based Learning, Diskusi, Presentasi, dll.
Untuk pemenuhan IKU 7, pastikan minimal 40% menggunakan Case Method atau Team-Based Project.`,
      }
    case 'pengalaman_belajar':
      return {
        section,
        systemPrompt: base,
        userPrompt: `Rancang pengalaman belajar mahasiswa per minggu untuk mata kuliah "${c.mata_kuliah || ''}"

Sub-CPMK:
${c.sub_cpmk || 'Belum diisi'}

Metode Pembelajaran:
${c.metode || 'Belum diisi'}

Deskripsikan aktivitas konkret yang harus diselesaikan mahasiswa per minggu pertemuan. Format: "Minggu 1: ..."`,
      }
    case 'asesmen':
      return {
        section,
        systemPrompt: base,
        userPrompt: `Rancang instrumen asesmen OBE untuk mata kuliah "${c.mata_kuliah || ''}"

CPMK:
${c.cpmk || 'Belum diisi'}

Buat rubrik penilaian dengan:
1. Komponen penilaian dan bobot persentase
2. Indikator penilaian per komponen
3. Rubrik level pencapaian (Sangat Baik, Baik, Cukup, Kurang)

Untuk pemenuhan IKU 7, bobot asesmen partisipatif minimal 50%.`,
      }
    case 'referensi':
      return {
        section,
        systemPrompt: base,
        userPrompt: `Suggest referensi terkini (5 tahun terakhir, 2020-2026) untuk mata kuliah "${c.mata_kuliah || ''}"

Bahan Kajian:
${c.bahan_kajian || 'Belum diisi'}

Sertakan minimal 4 referensi:
- Buku teks internasional terbaru
- Jurnal internasional bereputasi
- Regulasi terkait (Permendikbudristek, SN-Dikti)

Format: Nama Penulis. (Tahun). Judul. Penerbit/ISSN.`,
      }
    default:
      return {
        section,
        systemPrompt: base,
        userPrompt: `Generate konten untuk bagian ${section} dari RPS.`,
      }
  }
}