// AI Service — multi-provider OpenAI-compatible API

import { logger } from '../utils/logger'
import { stripHtml } from '../utils/html'

const MASTER_BERKAS_KEY = 'rps-master-berkas-active-group'

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

    if (result.ok && result.content) {
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

function getMasterBerkasContext(): { hasContext: boolean; contextBlock: string; docNames: string[] } {
  const activeGroupId = localStorage.getItem(MASTER_BERKAS_KEY)
  if (!activeGroupId) return { hasContext: false, contextBlock: '', docNames: [] }
  try {
    const rawData = localStorage.getItem('rps-master-berkas-data')
    if (!rawData) return { hasContext: false, contextBlock: '', docNames: [] }
    const parsed = JSON.parse(rawData)
    const group = parsed.groups?.find((g: { id: string }) => g.id === activeGroupId)
    if (!group?.documents?.length) return { hasContext: false, contextBlock: '', docNames: [] }
    const docNames = group.documents.map((d: { name: string }) => d.name)
    const contextParts = group.documents.map((doc: { name: string; extractedText: string }) =>
      `[${doc.name}]\n${doc.extractedText}`
    )
    return {
      hasContext: true,
      contextBlock: `\n\nKONTEKS MASTER BERKAS:\nBerikut adalah dokumen referensi yang telah diunggah oleh pengguna:\n---\n${contextParts.join('\n\n')}\n---`,
      docNames,
    }
  } catch {
    return { hasContext: false, contextBlock: '', docNames: [] }
  }
}

export function getSectionPrompt(section: string, content: Record<string, string>): GenerateOptions {
  const mb = getMasterBerkasContext()

  const base = `Anda adalah ahli kurikulum pendidikan tinggi di Indonesia yang mengkhususkan diri dalam Rencana Pembelajaran Semester (RPS) berbasis Outcome-Based Education (OBE).
Anda harus merespons dalam Bahasa Indonesia dengan format yang diminta.

Panduan penting:
- CPMK harus terukur dan menggunakan KKO Taksonomi Bloom
- Gunakan metode Student-Centered Learning (Case Method, Team-Based Project)
- Untuk IKU 7: minimal 40% mata kuliah harus partisipatif dengan bobot minimal 50%
- Referensi harus terkini (5 tahun terakhir)${mb.contextBlock}`

  const c = content

  // Structured list fields are stored as JSON arrays whose deskripsi may now contain HTML
  // (rich text). Flatten them to plain text for the AI prompt.
  const flattenList = (json: string): string => {
    try {
      const arr = JSON.parse(json || '[]')
      if (!Array.isArray(arr)) return stripHtml(json)
      return arr.map((item: { label?: string; deskripsi?: string }) => {
        const label = item.label || ''
        const deskripsi = stripHtml(item.deskripsi || '')
        return label ? `${label}: ${deskripsi}` : deskripsi
      }).filter(Boolean).join('\n')
    } catch {
      return stripHtml(json)
    }
  }

  const plain = (key: string): string => stripHtml(c[key] || '')
  const list = (key: string): string => flattenList(c[key])

  switch (section) {
    case 'cpl':
      return {
        section,
        systemPrompt: base + `\n\nAnda harus mengembalikan JSON array dengan format: [{"label":"CPL-1","deskripsi":"..."}]`,
        userPrompt: `Buat CPL (Capaian Pembelajaran Lulusan) yang relevan untuk program studi "${plain('prodi')}" di bawah Rumpun MK "${plain('rumpun_mk')}".

Mata Kuliah: ${plain('mata_kuliah')} (T=${plain('sks_t')} P=${plain('sks_p')})
${mb.hasContext ? `\nDokumen referensi tersedia: ${mb.docNames.join(', ')}. Gunakan kurikulum/silabus dari dokumen referensi sebagai dasar utama. Sesuaikan CPL dengan capaian yang tercantum dalam dokumen.` : ''}
CPL harus spesifik, terukur, dan menggunakan kata kerja operasional Taksonomi Bloom. Buat 4 CPL. Kembalikan HANYA JSON array, tanpa penjelasan tambahan.

Contoh format CPL yang benar:
[{"label":"CPL-1","deskripsi":"Mahasiswa mampu memanfaatkan teknologi informasi serta mengintegrasikan ilmu dasar, ilmu kefarmasian, ilmu humaniora, dan kesehatan masyarakat guna membentuk pemahaman yang menyeluruh terhadap ilmu dan praktik kefarmasian"},{"label":"CPL-2","deskripsi":"Mahasiswa mampu mengimplementasikan konsep pengembangan, penjaminan mutu, dan pengujian kualitas sediaan farmasi, alat kesehatan, serta perbekalan kesehatan lainnya sesuai dengan ketentuan peraturan yang berlaku"}]`,
      }
    case 'cpmk':
      return {
        section,
        systemPrompt: base + `\n\nAnda harus mengembalikan JSON array dengan format: [{"label":"CPMK-1","deskripsi":"..."}]`,
        userPrompt: `Buat CPMK (Capaian Pembelajaran Mata Kuliah) yang terukur untuk mata kuliah "${plain('mata_kuliah')}" dengan SKS T=${plain('sks_t')} P=${plain('sks_p')}

CPL Program Studi:
${list('cpl') || 'Belum diisi'}
${mb.hasContext ? `\nDokumen referensi tersedia: ${mb.docNames.join(', ')}. Sesuaikan CPMK dengan deskripsi mata kuliah dan tujuan pembelajaran dari dokumen referensi.` : ''}
Buat 4 CPMK dengan KKO Bloom yang beragam (misalnya: Memahami C2, Menganalisis C4, Mencipta C6). Setiap CPMK harus spesifik dan terukur. Kembalikan HANYA JSON array, tanpa penjelasan tambahan.

Contoh format CPMK yang benar:
[{"label":"CPMK-1","deskripsi":"Mahasiswa mampu mengidentifikasi tanaman obat dan kandungan metabolit sekundernya."},{"label":"CPMK-2","deskripsi":"Mahasiswa mampu menjelaskan patofisiologi dan penatalaksanaan farmakoterapi penyakit kronis."},{"label":"CPMK-3","deskripsi":"Mahasiswa mampu merancang terapi berbasis bukti dan pedoman nasional."},{"label":"CPMK-4","deskripsi":"Mahasiswa mampu mengevaluasi dan menyusun laporan terapi berbasis studi kasus."}]`,
      }
    case 'sub_cpmk':
      return {
        section,
        systemPrompt: base + `\n\nAnda harus mengembalikan JSON array dengan format: [{"label":"Sub-CPMK1.1","deskripsi":"..."}]`,
        userPrompt: `Pecah CPMK berikut menjadi Sub-CPMK (kemampuan akhir tiap tahapan belajar) yang bisa diselesaikan dalam 1-2 pertemuan:

CPMK:
${list('cpmk') || 'Belum diisi'}
${mb.hasContext ? `\nDokumen referensi tersedia: ${mb.docNames.join(', ')}. Gunakan struktur pembahasan/urutan materi dari dokumen referensi sebagai panduan pemecahan CPMK.` : ''}
Format Sub-CPMK gunakan notasi desimal (Sub-CPMK 1.1, 1.2, 2.1, dst). Buat minimal 8 Sub-CPMK. Kembalikan HANYA JSON array, tanpa penjelasan tambahan.

Contoh format Sub-CPMK yang benar:
[{"label":"Sub-CPMK1.1","deskripsi":"Mahasiswa mampu menjelaskan patofisiologi osteoporosis, artritis reumatoid, gout, diabetes melitus, hipotiroidisme, dan hipertiroidisme."},{"label":"Sub-CPMK1.2","deskripsi":"Mahasiswa mampu mengidentifikasi faktor risiko, etiologi, dan manifestasi klinis penyakit kronis pada sistem tulang, sendi, dan hormonal."},{"label":"Sub-CPMK2.1","deskripsi":"Mahasiswa mampu menelusuri dan menginterpretasi pedoman nasional serta literatur ilmiah terkait terapi penyakit kronis."},{"label":"Sub-CPMK2.2","deskripsi":"Mahasiswa mampu merancang rencana terapi farmakologis berbasis bukti untuk kasus osteoporosis, AR, gout, diabetes melitus, dan gangguan tiroid."}]`,
      }
    case 'deskripsi_mk':
      return {
        section,
        systemPrompt: base,
        userPrompt: `Deskripsikan mata kuliah "${plain('mata_kuliah')}" secara singkat (3-5 kalimat).

Cakupan materi:
${list('bahan_kajian') || 'Belum diisi'}
${mb.hasContext ? `\nDokumen referensi tersedia: ${mb.docNames.join(', ')}. Gunakan deskripsi mata kuliah dari dokumen referensi sebagai dasar. Pertahankan cakupan dan terminologi yang sama.` : ''}
Deskripsi harus menjelaskan relevansi, cakupan materi, dan posisi mata kuliah dalam kurikulum program studi.

Contoh format deskripsi yang benar:
"Mata kuliah Farmakoterapi 1 (Tulang, Sendi, dan Hormonal) mempelajari prinsip patofisiologi, penatalaksanaan, dan pemilihan terapi obat pada penyakit kronis yang berkaitan dengan sistem tulang, sendi, dan hormonal, meliputi osteoporosis, artritis reumatoid, gout, diabetes melitus tipe 1 dan 2, serta gangguan tiroid. Perkuliahan menekankan pada perancangan terapi berbasis pedoman nasional dan bukti ilmiah, pemantauan efektivitas dan keamanan terapi, serta identifikasi dan penyelesaian Drug Related Problems (DRPs)."
"Mata kuliah ini membahas konsep dasar, ruang lingkup, serta manfaat farmakognosi dan fitokimia. Cakupan materi meliputi pembuatan dan kontrol kualitas simplisia, identifikasi metabolit primer dan sekunder, skrining fitokimia, serta teknik ekstraksi, pemisahan, isolasi, dan pemurnian senyawa aktif dari bahan alam."`,
      }
    case 'bahan_kajian':
      return {
        section,
        systemPrompt: base + `\n\nAnda harus mengembalikan JSON array dengan format: [{"label":"1","deskripsi":"Judul Topik - Deskripsi singkat"}]`,
        userPrompt: `Suggest bahan kajian relevan untuk mata kuliah "${plain('mata_kuliah')}"

CPMK:
${list('cpmk') || 'Belum diisi'}
${mb.hasContext ? `\nDokumen referensi tersedia: ${mb.docNames.join(', ')}. Sesuaikan bahan kajian dengan daftar materi/bab yang tercantum dalam dokumen referensi.` : ''}
Buat 8 bahan kajian yang mencakup konsep dasar hingga aplikasi. Kembalikan HANYA JSON array, tanpa penjelasan tambahan.

Contoh format bahan kajian yang benar (judul topik singkat, bukan kalimat panjang):
[{"label":"1","deskripsi":"Konsep dasar farmakoterapi penyakit kronis dan evidence-based medicine"},{"label":"2","deskripsi":"Patofisiologi dan diagnosis penyakit tulang (osteoporosis)"},{"label":"3","deskripsi":"Patofisiologi dan farmakoterapi penyakit sendi (artritis reumatoid dan gout)"},{"label":"4","deskripsi":"Patofisiologi dan farmakoterapi penyakit hormonal (diabetes melitus, hipotiroidisme, hipertiroidisme)"},{"label":"5","deskripsi":"Mekanisme kerja, pemilihan, dan perancangan regimen terapi berbasis pedoman nasional"},{"label":"6","deskripsi":"Individualisasi terapi pada pasien dengan komorbid dan populasi khusus"},{"label":"7","deskripsi":"Keamanan terapi: efek samping, interaksi obat, dan Drug Related Problems (DRPs)"},{"label":"8","deskripsi":"Monitoring dan evaluasi efektivitas serta keamanan terapi berbasis parameter klinis dan laboratoris"}]`,
      }
    case 'penilaian':
      return {
        section,
        systemPrompt: base + `\n\nAnda harus mengembalikan JSON array dengan format: [{"item":"Kehadiran","bobot":10}]`,
        userPrompt: `Rancang format penilaian OBE untuk mata kuliah "${plain('mata_kuliah')}"

CPMK:
${list('cpmk') || 'Belum diisi'}
${mb.hasContext ? `\nDokumen referensi tersedia: ${mb.docNames.join(', ')}. Gunakan format/rubrik penilaian dari dokumen referensi jika tersedia. Pertahankan komponen dan bobot yang ada.` : ''}
Buat komponen penilaian dengan:
1. Komponen penilaian (Kehadiran, Partisipasi, Tugas, UTS, UAS, dll.)
2. Bobot persentase per komponen (total harus 100%)

Untuk pemenuhan IKU 7, bobot asesmen partisipatif (kehadiran + partisipasi + tugas) minimal 50%. Kembalikan HANYA JSON array, tanpa penjelasan tambahan.

Contoh format penilaian yang benar (total harus 100):
[{"item":"Kehadiran","bobot":5},{"item":"Partisipasi","bobot":5},{"item":"Tugas/CBL/PBL","bobot":20},{"item":"UTS","bobot":35},{"item":"UAS","bobot":35}]`,
      }
    case 'pustaka':
      return {
        section,
        systemPrompt: base + `\n\nAnda harus mengembalikan JSON dengan format: {"pustaka_utama":"...","pustaka_pendukung":"..."}`,
        userPrompt: `Suggest pustaka untuk mata kuliah "${plain('mata_kuliah')}"

Buat 2 kategori:
1. Pustaka Utama: Buku teks utama yang digunakan (minimal 2)
2. Pustaka Pendukung: Jurnal, buku referensi tambahan
${mb.hasContext ? `\nDokumen referensi tersedia: ${mb.docNames.join(', ')}. Gunakan daftar pustaka/referensi dari dokumen yang diunggah sebagai pustaka utama. Tambahkan jika kurang.` : ''}
Referensi harus terkini (5 tahun terakhir, 2020-2026). Format: Nama Penulis. (Tahun). Judul. Penerbit/ISSN.

Kembalikan HANYA JSON, tanpa penjelasan tambahan.

Contoh format pustaka yang benar (gaya APA 7th edition):
{"pustaka_utama":"DiPiro, J. T., Yee, G. C., Posey, L. M., Haines, S. T., Nolin, T. D., & Ellingrod, V. (2023). Pharmacotherapy: A Pathophysiologic Approach (12th ed.). New York: McGraw-Hill Education.\nBrunton, L. L., Hilal-Dandan, R., & Knollmann, B. C. (2023). Goodman & Gilman's The Pharmacological Basis of Therapeutics (14th ed.). New York: McGraw-Hill Education.","pustaka_pendukung":"Katzung, B. G., & Trevor, A. J. (2021). Basic & Clinical Pharmacology (15th ed.). New York: McGraw-Hill Education.\nKementerian Kesehatan Republik Indonesia. (2019). Pedoman Nasional Pelayanan Kedokteran Diabetes Melitus Tipe 2. Jakarta: Kementerian Kesehatan RI."}`,
      }
    default:
      return {
        section,
        systemPrompt: base,
        userPrompt: `Generate konten untuk bagian ${section} dari RPS mata kuliah "${plain('mata_kuliah')}" dalam format yang sesuai.${mb.hasContext ? `\n\nGunakan dokumen referensi (${mb.docNames.join(', ')}) sebagai panduan utama.` : ''}`,
      }
  }
}
