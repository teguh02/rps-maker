// AI Service — multi-provider OpenAI-compatible API

import { logger } from '../utils/logger'

interface AISettings {
  provider: 'free' | 'custom'
  apiHost: string
  apiKey: string
  model: string
}

const SETTINGS_KEY = 'rps-maker-ai-settings'

const FREE_PROVIDER = {
  host: 'https://openrouter.ai/api/v1',
  model: 'openrouter/free',
  apiKeys: [
    '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',
    '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',
    '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',
    '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',
    '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',
    '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',
  ],
}

function getNextFreeApiKey(): string {
  const idx = parseInt(localStorage.getItem('rps-maker-free-key-idx') || '0', 10)
  const key = FREE_PROVIDER.apiKeys[idx % FREE_PROVIDER.apiKeys.length]
  localStorage.setItem('rps-maker-free-key-idx', String((idx + 1) % FREE_PROVIDER.apiKeys.length))
  return key
}

export function getAISettings(): AISettings {
  const raw = localStorage.getItem(SETTINGS_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed.provider === 'free') {
        return { provider: 'free', apiHost: FREE_PROVIDER.host, apiKey: '', model: FREE_PROVIDER.model }
      }
      if (parsed.apiHost) {
        parsed.apiHost = normalizeApiUrl(parsed.apiHost)
      }
      return { provider: 'custom', ...parsed }
    } catch { /* ignore */ }
  }
  return { provider: 'free', apiHost: FREE_PROVIDER.host, apiKey: '', model: FREE_PROVIDER.model }
}

export function setAISettings(settings: AISettings): void {
  const toSave = settings.provider === 'free'
    ? { provider: 'free' as const, apiHost: '', apiKey: '', model: '' }
    : { provider: 'custom' as const, apiHost: normalizeApiUrl(settings.apiHost), apiKey: settings.apiKey, model: settings.model }
  logger.info('AI', 'ai.settings_saved', { provider: toSave.provider, model: toSave.model || FREE_PROVIDER.model, apiHost: toSave.apiHost || FREE_PROVIDER.host })
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave))
}

export function isAIConfigured(): boolean {
  const s = getAISettings()
  if (s.provider === 'free') return true
  return !!(s.apiHost && s.apiKey)
}

// Normalize API URL: strip trailing slashes, remove duplicate /v1 segments, add /v1 if missing
export function normalizeApiUrl(url: string): string {
  let normalized = url.replace(/\/+$/, '')
  normalized = normalized.replace(/(\/v1)+$/, '/v1')
  if (!normalized.endsWith('/v1')) {
    normalized = `${normalized}/v1`
  }
  return normalized
}

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  const s = getAISettings()
  const apiKey = s.provider === 'free' ? getNextFreeApiKey() : s.apiKey
  const apiHost = s.provider === 'free' ? FREE_PROVIDER.host : s.apiHost
  const model = s.provider === 'free' ? FREE_PROVIDER.model : s.model

  logger.info('AI', 'ai.test_connection', { provider: s.provider, apiHost })
  if (s.provider === 'custom' && !s.apiKey) {
    logger.warn('AI', 'ai.missing_config', { field: 'apiKey' })
    return { ok: false, message: 'API Key belum diisi' }
  }

  try {
    const result = await window.electronAPI.aiGenerate({
      apiHost,
      apiKey,
      model,
      systemPrompt: 'You are a helpful assistant.',
      userPrompt: 'Hello, respond with OK',
    })
    if (result.ok) {
      logger.info('AI', 'ai.test_connection_success')
      return { ok: true, message: 'Koneksi berhasil!' }
    }
    logger.error('AI', 'ai.test_connection_fail', { error: result.error })
    return { ok: false, message: result.error || 'Gagal koneksi' }
  } catch (err) {
    logger.error('AI', 'ai.test_connection_fail', { error: (err as Error).message })
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
  const apiKey = s.provider === 'free' ? getNextFreeApiKey() : s.apiKey
  const apiHost = s.provider === 'free' ? FREE_PROVIDER.host : s.apiHost
  const model = s.provider === 'free' ? FREE_PROVIDER.model : s.model

  if (s.provider === 'custom' && !s.apiKey) {
    logger.warn('AI', 'ai.missing_config', { field: 'apiKey' })
    throw new Error('API Key belum dikonfigurasi. Buka Settings untuk mengatur.')
  }

  logger.info('AI', 'ai.api_call_start', { section: options.section, provider: s.provider, model, apiHost, promptLength: options.userPrompt.length })

  try {
    const result = await window.electronAPI.aiGenerate({
      apiHost,
      apiKey,
      model,
      systemPrompt: options.systemPrompt,
      userPrompt: options.userPrompt,
    })

    if (result.ok) {
      logger.info('AI', 'ai.api_call_success', { section: options.section, responseLength: result.content.length })
      return result.content
    }
    
    logger.error('AI', 'ai.api_call_error', { section: options.section, error: result.error })
    throw new Error(result.error || 'Gagal generate konten')
  } catch (err) {
    logger.error('AI', 'ai.api_call_error', { section: options.section, error: (err as Error).message })
    throw err
  }
}

// Prompt templates per section
export function getSectionPrompt(section: string, content: Record<string, string>): GenerateOptions {
  const base = `Anda adalah ahli kurikulum pendidikan tinggi di Indonesia yang mengkhususkan diri dalam Rencana Pembelajaran Semester (RPS) berbasis Outcome-Based Education (OBE).
Anda harus merespons dalam Bahasa Indonesia dengan format yang diminta.

Panduan penting:
- CPMK harus terukur dan menggunakan KKO Taksonomi Bloom
- Gunakan metode Student-Centered Learning (Case Method, Team-Based Project)
- Untuk IKU 7: minimal 40% mata kuliah harus partisipatif dengan bobot minimal 50%
- Referensi harus terkini (5 tahun terakhir)`

  const c = content

  switch (section) {
    case 'cpl':
      return {
        section,
        systemPrompt: base + `\n\nAnda harus mengembalikan JSON array dengan format: [{"label":"CPL-1","deskripsi":"..."}]`,
        userPrompt: `Buat CPL (Capaian Pembelajaran Lulusan) yang relevan untuk program studi "${c.prodi || ''}" di bawah Rumpun MK "${c.rumpun_mk || ''}".

Mata Kuliah: ${c.mata_kuliah || ''} (T=${c.sks_t || '?'} P=${c.sks_p || '?'})

CPL harus spesifik, terukur, dan menggunakan kata kerja operasional Taksonomi Bloom. Buat 4 CPL. Kembalikan HANYA JSON array, tanpa penjelasan tambahan.`,
      }
    case 'cpmk':
      return {
        section,
        systemPrompt: base + `\n\nAnda harus mengembalikan JSON array dengan format: [{"label":"CPMK-1","deskripsi":"..."}]`,
        userPrompt: `Buat CPMK (Capaian Pembelajaran Mata Kuliah) yang terukur untuk mata kuliah "${c.mata_kuliah || ''}" dengan SKS T=${c.sks_t || '?'} P=${c.sks_p || '?'}

CPL Program Studi:
${c.cpl || 'Belum diisi'}

Buat 4 CPMK dengan KKO Bloom yang beragam (misalnya: Memahami C2, Menganalisis C4, Mencipta C6). Setiap CPMK harus spesifik dan terukur. Kembalikan HANYA JSON array, tanpa penjelasan tambahan.`,
      }
    case 'sub_cpmk':
      return {
        section,
        systemPrompt: base + `\n\nAnda harus mengembalikan JSON array dengan format: [{"label":"Sub-CPMK1.1","deskripsi":"..."}]`,
        userPrompt: `Pecah CPMK berikut menjadi Sub-CPMK (kemampuan akhir tiap tahapan belajar) yang bisa diselesaikan dalam 1-2 pertemuan:

CPMK:
${c.cpmk || 'Belum diisi'}

Format Sub-CPMK gunakan notasi desimal (Sub-CPMK 1.1, 1.2, 2.1, dst). Buat minimal 8 Sub-CPMK. Kembalikan HANYA JSON array, tanpa penjelasan tambahan.`,
      }
    case 'deskripsi_mk':
      return {
        section,
        systemPrompt: base,
        userPrompt: `Deskripsikan mata kuliah "${c.mata_kuliah || ''}" secara singkat (3-5 kalimat).

Cakupan materi:
${c.bahan_kajian || 'Belum diisi'}

Deskripsi harus menjelaskan relevansi, cakupan materi, dan posisi mata kuliah dalam kurikulum program studi.`,
      }
    case 'bahan_kajian':
      return {
        section,
        systemPrompt: base + `\n\nAnda harus mengembalikan JSON array dengan format: [{"label":"1","deskripsi":"Judul Topik - Deskripsi singkat"}]`,
        userPrompt: `Suggest bahan kajian relevan untuk mata kuliah "${c.mata_kuliah || ''}"

CPMK:
${c.cpmk || 'Belum diisi'}

Buat 8 bahan kajian yang mencakup konsep dasar hingga aplikasi. Kembalikan HANYA JSON array, tanpa penjelasan tambahan.`,
      }
    case 'penilaian':
      return {
        section,
        systemPrompt: base + `\n\nAnda harus mengembalikan JSON array dengan format: [{"item":"Kehadiran","bobot":10}]`,
        userPrompt: `Rancang format penilaian OBE untuk mata kuliah "${c.mata_kuliah || ''}"

CPMK:
${c.cpmk || 'Belum diisi'}

Buat komponen penilaian dengan:
1. Komponen penilaian (Kehadiran, Partisipasi, Tugas, UTS, UAS, dll.)
2. Bobot persentase per komponen (total harus 100%)

Untuk pemenuhan IKU 7, bobot asesmen partisipatif (kehadiran + partisipasi + tugas) minimal 50%. Kembalikan HANYA JSON array, tanpa penjelasan tambahan.`,
      }
    case 'pustaka':
      return {
        section,
        systemPrompt: base + `\n\nAnda harus mengembalikan JSON dengan format: {"pustaka_utama":"...","pustaka_pendukung":"..."}`,
        userPrompt: `Suggest pustaka untuk mata kuliah "${c.mata_kuliah || ''}"

Buat 2 kategori:
1. Pustaka Utama: Buku teks utama yang digunakan (minimal 2)
2. Pustaka Pendukung: Jurnal, buku referensi tambahan

Referensi harus terkini (5 tahun terakhir, 2020-2026). Format: Nama Penulis. (Tahun). Judul. Penerbit/ISSN.

Kembalikan HANYA JSON, tanpa penjelasan tambahan.`,
      }
    default:
      return {
        section,
        systemPrompt: base,
        userPrompt: `Generate konten untuk bagian ${section} dari RPS mata kuliah "${c.mata_kuliah || ''}" dalam format yang sesuai.`,
      }
  }
}
