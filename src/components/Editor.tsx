import { useState } from 'react'
import type { Project } from '../App'
import { Ribbon } from './Ribbon'
import { RTE } from './RTE'
import { isAIConfigured, generateWithAI, getSectionPrompt } from '../services/ai'

interface EditorProps {
  project: Project
  onUpdate: (content: Record<string, string>) => void
  onSave: () => void
  onSaveAs: () => void
  onExport?: (format: 'pdf' | 'docx') => void
  onOpenAISettings?: () => void
  onGoHome?: () => void
}

interface PenilaianItem {
  item: string
  bobot: number
}

interface PertemuanItem {
  no: number
  subCpmk: string
  indikator: string
  kriteria: string
  bentukMetode: string
  materiPustaka: string
  bobot: number
}

export function Editor({ project, onUpdate, onSave, onSaveAs, onExport, onOpenAISettings, onGoHome }: EditorProps) {
  const [activeSection, setActiveSection] = useState('identitas')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  const updateField = (key: string, value: string) => {
    onUpdate({ ...project.content, [key]: value })
  }

  // Parse penilaian JSON
  const getPenilaian = (): PenilaianItem[] => {
    try {
      return JSON.parse(project.content.penilaian || '[]')
    } catch {
      return []
    }
  }

  const updatePenilaian = (items: PenilaianItem[]) => {
    updateField('penilaian', JSON.stringify(items))
  }

  // Parse pertemuan JSON
  const getPertemuan = (): PertemuanItem[] => {
    try {
      return JSON.parse(project.content.pertemuan || '[]')
    } catch {
      return []
    }
  }

  const updatePertemuan = (items: PertemuanItem[]) => {
    updateField('pertemuan', JSON.stringify(items))
  }

  // Generate pertemuan from Sub-CPMK
  const generatePertemuan = () => {
    const subCpmkText = project.content.sub_cpmk || ''
    const subCpmkList = subCpmkText
      .replace(/<[^>]+>/g, '\n')
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 5)

    const existing = getPertemuan()
    const maxMinggu = Math.max(16, existing.length, subCpmkList.length)

    const items: PertemuanItem[] = []
    for (let i = 1; i <= maxMinggu; i++) {
      const existingItem = existing.find(e => e.no === i)
      const subCpmk = subCpmkList[i - 1] || existingItem?.subCpmk || ''
      items.push({
        no: i,
        subCpmk: existingItem?.subCpmk || subCpmk,
        indikator: existingItem?.indikator || '',
        kriteria: existingItem?.kriteria || '',
        bentukMetode: existingItem?.bentukMetode || '',
        materiPustaka: existingItem?.materiPustaka || '',
        bobot: existingItem?.bobot || 0,
      })
    }
    updatePertemuan(items)
  }

  // Extract Sub-CPMK list for auto-fill
  const getSubCpmkList = (): string[] => {
    const text = project.content.sub_cpmk || ''
    return text
      .replace(/<[^>]+>/g, '\n')
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 5)
  }

  const sections = [
    { id: 'identitas', label: 'Cover' },
    { id: 'otorisasi', label: 'Otorisasi' },
    { id: 'cpl', label: 'CPL' },
    { id: 'cpmk', label: 'CPMK' },
    { id: 'sub_cpmk', label: 'Sub-CPMK' },
    { id: 'deskripsi_mk', label: 'Deskripsi' },
    { id: 'bahan_kajian', label: 'Bahan Kajian' },
    { id: 'penilaian', label: 'Penilaian' },
    { id: 'pustaka', label: 'Pustaka' },
    { id: 'dosen_prasyarat', label: 'Dosen & Syarat' },
    { id: 'pertemuan', label: 'Pertemuan' },
  ]

  const sectionGuides: Record<string, string> = {
    identitas: '💡 Isi data identitas mata kuliah sesuai kurikulum program studi.',
    otorisasi: '💡 Otorisasi diisi oleh Kaprodi dan Koordinator RMK. Dosen pengisi adalah Pengembang RPS.',
    cpl: '💡 CPL ditetapkan oleh program studi dari kurikulum. Tidak boleh dihapus, tapi bisa ditambah.',
    cpmk: '💡 CPMK harus terukur. Gunakan KKO Bloom: Mengidentifikasi (C2), Menganalisis (C4), Mencipta (C6).',
    sub_cpmk: '💡 Pecah CPMK menjadi unit-unit kecil yang bisa diselesaikan dalam 1-2 pertemuan.',
    deskripsi_mk: '💡 Deskripsikan cakupan materi dan relevansi mata kuliah secara singkat (3-5 kalimat).',
    bahan_kajian: '💡 Tuliskan bahan kajian utama yang harus dikuasai mahasiswa.',
    penilaian: '💡 Format penilaian fleksibel. Bobot total harus 100%. IKU 7: minimal 50% asesmen partisipatif.',
    pustaka: '💡 Pustaka utama minimal 2 buku. Referensi harus terkini (max 5 tahun terakhir).',
    dosen_prasyarat: '💡 Tuliskan nama dosen pengampu dan mata kuliah prasyarat (jika ada).',
    pertemuan: '💡 Klik "Generate dari Sub-CPMK" untuk mengisi otomatis, lalu lengkapi kolom lainnya.',
  }

  const handleAIGenerate = async (section: string) => {
    if (!isAIConfigured()) {
      setAiError('AI belum dikonfigurasi. Buka Settings untuk mengatur.')
      return
    }
    setAiLoading(true)
    setAiError('')
    try {
      const opts = getSectionPrompt(section, project.content)
      const result = await generateWithAI(opts)
      updateField(section, result)
    } catch (err) {
      setAiError((err as Error).message)
    } finally {
      setAiLoading(false)
    }
  }

  const c = project.content

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Ribbon onSave={onSave} onSaveAs={onSaveAs} onExport={onExport} onOpenAISettings={onOpenAISettings} onGoHome={onGoHome} />

      <div className="flex-1 overflow-y-auto bg-[#e8e8e8]">
        <div className="paper-canvas">
          {/* === COVER PAGE (Identitas tab) === */}
          {activeSection === 'identitas' && (
            <div className="rps-cover">
              <div className="rps-cover-title">
                <p><strong>RENCANA PEMBELAJARAN SEMESTER (RPS)</strong></p>
                <p><strong>{c.semester === 'Ganjil' ? 'GANJIL' : c.semester === 'Genap' ? 'GENAP' : 'GANJIL/GENAP'}</strong></p>
                <p><strong>{c.semester_akademik || 'TAHUN AKADEMIK 20__-20__'}</strong></p>
                <p><strong>{c.mata_kuliah || 'MATAKULIAH'} ({c.kode_mk || 'KODE'})</strong></p>
              </div>
              <div className="rps-cover-logo">
                <img src="./logo-unisina.png" alt="Logo UNISINA" className="w-48 h-48 object-contain" />
                <p><strong>Disusun Oleh :</strong></p>
              </div>
              <div className="rps-cover-footer">
                <p><strong>UNIVERSITAS IBNU SINA AJIBARANG</strong></p>
                <p><strong>{c.semester_akademik || 'TAHUN AKADEMIK 20__-20__'}</strong></p>
              </div>
            </div>
          )}

          {/* === MAIN RPS HEADER (other tabs) === */}
          {activeSection !== 'identitas' && (
            <div className="rps-main-header">
              <table className="rps-header-table">
                <tbody>
                  <tr>
                    <td colSpan={2} className="rps-header-logo">
                      <img src="./logo-unisina.png" alt="Logo UNISINA" className="w-16 h-16 object-contain" />
                    </td>
                    <td colSpan={10} className="rps-header-info">
                      <p><strong>UNIVERSITAS IBNU SINA AJIBARANG</strong></p>
                      <p><strong>{c.prodi || 'PROGRAM STUDI'}</strong></p>
                      <p><strong>{c.semester_akademik || 'TAHUN AJARAN 20__-20__'}</strong></p>
                    </td>
                    <td colSpan={2} className="rps-header-code">
                      <p><strong>RPS/{c.prodi?.replace(/\s+/g, '').toUpperCase() || 'PRODI'}/{c.semester || 'GANJIL'}/{c.tgl_penyusunan?.split('-')[0] || '20__'}</strong></p>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={14} className="rps-header-title">
                      <p><strong>RENCANA PEMBELAJARAN SEMESTER</strong></p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* === IDENTITAS SECTION CONTENT === */}
          {activeSection === 'identitas' && (
            <section className="editor-content">
              <h2 className="text-lg font-bold mb-4">I. IDENTITAS MATA KULIAH</h2>
              <table className="w-full">
                <tbody>
                  {[
                    ['prodi', 'Program Studi'],
                    ['mata_kuliah', 'Mata Kuliah (MK)'],
                    ['kode_mk', 'Kode'],
                    ['rumpun_mk', 'Rumpun MK'],
                    ['sks', 'Bobot (SKS)'],
                    ['semester', 'Semester'],
                    ['tgl_penyusunan', 'Tanggal Penyusunan'],
                    ['semester_akademik', 'Semester Akademik'],
                  ].map(([key, label]) => (
                    <tr key={key}>
                      <td className="w-56 font-medium text-gray-700">{label}</td>
                      <td>
                        <input
                          type="text"
                          value={c[key] || ''}
                          onChange={(e) => updateField(key, e.target.value)}
                          placeholder={label}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="section-guide mt-4">
                {sectionGuides.identitas}
              </div>
            </section>
          )}

          {/* === OTORISASI === */}
          {activeSection === 'otorisasi' && (
            <section className="editor-content">
              <h2 className="text-lg font-bold mb-4">II. OTORISASI</h2>
              <table className="w-full">
                <tbody>
                  {[
                    ['pengembang_rps', 'Pengembang RPS (Dosen)'],
                    ['koordinator_rmk', 'Koordinator RMK'],
                    ['kaprodi', 'Ketua Program Studi'],
                  ].map(([key, label]) => (
                    <tr key={key}>
                      <td className="w-56 font-medium text-gray-700">{label}</td>
                      <td>
                        <input
                          type="text"
                          value={c[key] || ''}
                          onChange={(e) => updateField(key, e.target.value)}
                          placeholder={label}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="section-guide mt-4">
                {sectionGuides.otorisasi}
              </div>
            </section>
          )}

          {/* === CPL === */}
          {activeSection === 'cpl' && (
            <section className="editor-content">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">III. CAPAIAN PEMBELAJARAN LULUSAN (CPL)</h2>
                <button onClick={() => handleAIGenerate('cpl')} disabled={aiLoading} className="btn-ai">
                  {aiLoading ? 'Generating...' : 'Generate via AI'}
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-3">CPL-Prodi yang dibebankan pada mata kuliah ini:</p>
              <RTE
                content={c.cpl || ''}
                onUpdate={(html) => updateField('cpl', html)}
                placeholder="Tuliskan CPL Prodi yang dibebankan pada MK ini..."
              />
              <div className="section-guide mt-4">{sectionGuides.cpl}</div>
            </section>
          )}

          {/* === CPMK === */}
          {activeSection === 'cpmk' && (
            <section className="editor-content">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">IV. CAPAIAN PEMBELAJARAN MATA KULIAH (CPMK)</h2>
                <button onClick={() => handleAIGenerate('cpmk')} disabled={aiLoading} className="btn-ai">
                  {aiLoading ? 'Generating...' : 'Generate via AI'}
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-3">CPMK merupakan turunan/uraian spesifik dari CPL-Prodi:</p>
              <RTE
                content={c.cpmk || ''}
                onUpdate={(html) => updateField('cpmk', html)}
                placeholder="Tuliskan CPMK..."
              />
              <div className="section-guide mt-4">{sectionGuides.cpmk}</div>
            </section>
          )}

          {/* === SUB-CPMK === */}
          {activeSection === 'sub_cpmk' && (
            <section className="editor-content">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">V. KEMAMPUAN AKHIR TIAP TAHAPAN BELAJAR (SUB-CPMK)</h2>
                <button onClick={() => handleAIGenerate('sub_cpmk')} disabled={aiLoading} className="btn-ai">
                  {aiLoading ? 'Generating...' : 'Generate via AI'}
                </button>
              </div>
              <RTE
                content={c.sub_cpmk || ''}
                onUpdate={(html) => updateField('sub_cpmk', html)}
                placeholder="Tuliskan Sub-CPMK (kemampuan akhir tiap tahapan belajar)..."
              />
              <div className="section-guide mt-4">{sectionGuides.sub_cpmk}</div>
            </section>
          )}

          {/* === DESKRIPSI MK === */}
          {activeSection === 'deskripsi_mk' && (
            <section className="editor-content">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">VI. DESKRIPSI SINGKAT MATA KULIAH</h2>
                <button onClick={() => handleAIGenerate('deskripsi_mk')} disabled={aiLoading} className="btn-ai">
                  {aiLoading ? 'Generating...' : 'Generate via AI'}
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-3">Tuliskan relevansi dan cakupan materi/bahan kajian secara singkat:</p>
              <RTE
                content={c.deskripsi_mk || ''}
                onUpdate={(html) => updateField('deskripsi_mk', html)}
                placeholder="Deskripsikan mata kuliah ini dalam 3-5 kalimat..."
              />
              <div className="section-guide mt-4">{sectionGuides.deskripsi_mk}</div>
            </section>
          )}

          {/* === BAHAN KAJIAN === */}
          {activeSection === 'bahan_kajian' && (
            <section className="editor-content">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">VII. BAHAN KAJIAN / MATERI PEMBELAJARAN</h2>
                <button onClick={() => handleAIGenerate('bahan_kajian')} disabled={aiLoading} className="btn-ai">
                  {aiLoading ? 'Generating...' : 'Generate via AI'}
                </button>
              </div>
              <RTE
                content={c.bahan_kajian || ''}
                onUpdate={(html) => updateField('bahan_kajian', html)}
                placeholder="Tuliskan bahan kajian dan dijabarkan dalam materi pembelajaran..."
              />
              <div className="section-guide mt-4">{sectionGuides.bahan_kajian}</div>
            </section>
          )}

          {/* === PENILAIAN === */}
          {activeSection === 'penilaian' && (
            <section className="editor-content">
              <h2 className="text-lg font-bold mb-4">VIII. PENILAIAN</h2>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Format Nilai</span>
                  <span className="text-sm text-gray-500">
                    Total: {getPenilaian().reduce((sum, p) => sum + p.bobot, 0)}%
                  </span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left text-sm font-medium text-gray-700 p-2">No</th>
                      <th className="text-left text-sm font-medium text-gray-700 p-2">Komponen Penilaian</th>
                      <th className="text-left text-sm font-medium text-gray-700 p-2 w-24">Bobot (%)</th>
                      <th className="text-left text-sm font-medium text-gray-700 p-2 w-16">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPenilaian().map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2 text-sm text-gray-500">{idx + 1}</td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.item}
                            onChange={(e) => {
                              const items = [...getPenilaian()]
                              items[idx].item = e.target.value
                              updatePenilaian(items)
                            }}
                            className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none rounded text-sm"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={item.bobot}
                            onChange={(e) => {
                              const items = [...getPenilaian()]
                              items[idx].bobot = parseInt(e.target.value) || 0
                              updatePenilaian(items)
                            }}
                            className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none rounded text-sm"
                            min="0"
                            max="100"
                          />
                        </td>
                        <td className="p-2">
                          <button
                            onClick={() => {
                              const items = getPenilaian().filter((_, i) => i !== idx)
                              updatePenilaian(items)
                            }}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  onClick={() => {
                    updatePenilaian([...getPenilaian(), { item: '', bobot: 0 }])
                  }}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  + Tambah Komponen
                </button>
              </div>
              <div className="section-guide mt-4">{sectionGuides.penilaian}</div>
            </section>
          )}

          {/* === PUSTAKA === */}
          {activeSection === 'pustaka' && (
            <section className="editor-content">
              <h2 className="text-lg font-bold mb-4">IX. PUSTAKA</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Pustaka Utama</label>
                <RTE
                  content={c.pustaka_utama || ''}
                  onUpdate={(html) => updateField('pustaka_utama', html)}
                  placeholder="Tuliskan pustaka utama yang digunakan..."
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Pustaka Pendukung</label>
                <RTE
                  content={c.pustaka_pendukung || ''}
                  onUpdate={(html) => updateField('pustaka_pendukung', html)}
                  placeholder="Tuliskan pustaka pendukung jika ada..."
                />
              </div>
              <div className="section-guide mt-4">{sectionGuides.pustaka}</div>
            </section>
          )}

          {/* === DOSEN & PRASYARAT === */}
          {activeSection === 'dosen_prasyarat' && (
            <section className="editor-content">
              <h2 className="text-lg font-bold mb-4">X. DOSEN PENGAMPU & MATA KULIAH PRASYARAT</h2>
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="w-56 font-medium text-gray-700">Dosen Pengampu</td>
                    <td>
                      <input
                        type="text"
                        value={c.dosen_pengampu || ''}
                        onChange={(e) => updateField('dosen_pengampu', e.target.value)}
                        placeholder="Nama dosen pengampu"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="w-56 font-medium text-gray-700">Mata Kuliah Prasyarat</td>
                    <td>
                      <input
                        type="text"
                        value={c.matakuliah_syarat || ''}
                        onChange={(e) => updateField('matakuliah_syarat', e.target.value)}
                        placeholder="Kode dan nama MK prasyarat (jika ada)"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="section-guide mt-4">{sectionGuides.dosen_prasyarat}</div>
            </section>
          )}

          {/* === TABEL PERTEMUAN === */}
          {activeSection === 'pertemuan' && (
            <section className="editor-content">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">XI. JADWAL PERTEMUAN</h2>
                <button onClick={generatePertemuan} className="btn btn-primary text-sm">
                  Generate dari Sub-CPMK
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 w-10">No</th>
                      <th className="border p-2 w-48">Sub-CPMK</th>
                      <th className="border p-2 w-40">Indikator</th>
                      <th className="border p-2 w-40">Kriteria & Teknik</th>
                      <th className="border p-2 w-40">Bentuk/Metode/PM</th>
                      <th className="border p-2 w-40">Materi [Pustaka]</th>
                      <th className="border p-2 w-16">Bobot (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPertemuan().map((item, idx) => (
                      <tr key={idx}>
                        <td className="border p-1 text-center text-gray-500">{item.no}</td>
                        <td className="border p-1">
                          <textarea
                            value={item.subCpmk}
                            onChange={(e) => {
                              const items = [...getPertemuan()]
                              items[idx].subCpmk = e.target.value
                              updatePertemuan(items)
                            }}
                            className="w-full px-1 py-0.5 text-xs border-0 focus:outline-none resize-none"
                            rows={2}
                          />
                        </td>
                        <td className="border p-1">
                          <textarea
                            value={item.indikator}
                            onChange={(e) => {
                              const items = [...getPertemuan()]
                              items[idx].indikator = e.target.value
                              updatePertemuan(items)
                            }}
                            className="w-full px-1 py-0.5 text-xs border-0 focus:outline-none resize-none"
                            rows={2}
                          />
                        </td>
                        <td className="border p-1">
                          <textarea
                            value={item.kriteria}
                            onChange={(e) => {
                              const items = [...getPertemuan()]
                              items[idx].kriteria = e.target.value
                              updatePertemuan(items)
                            }}
                            className="w-full px-1 py-0.5 text-xs border-0 focus:outline-none resize-none"
                            rows={2}
                          />
                        </td>
                        <td className="border p-1">
                          <textarea
                            value={item.bentukMetode}
                            onChange={(e) => {
                              const items = [...getPertemuan()]
                              items[idx].bentukMetode = e.target.value
                              updatePertemuan(items)
                            }}
                            className="w-full px-1 py-0.5 text-xs border-0 focus:outline-none resize-none"
                            rows={2}
                          />
                        </td>
                        <td className="border p-1">
                          <textarea
                            value={item.materiPustaka}
                            onChange={(e) => {
                              const items = [...getPertemuan()]
                              items[idx].materiPustaka = e.target.value
                              updatePertemuan(items)
                            }}
                            className="w-full px-1 py-0.5 text-xs border-0 focus:outline-none resize-none"
                            rows={2}
                          />
                        </td>
                        <td className="border p-1">
                          <input
                            type="number"
                            value={item.bobot}
                            onChange={(e) => {
                              const items = [...getPertemuan()]
                              items[idx].bobot = parseInt(e.target.value) || 0
                              updatePertemuan(items)
                            }}
                            className="w-full px-1 py-0.5 text-xs border-0 focus:outline-none text-center"
                            min="0"
                            max="100"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="section-guide mt-4">{sectionGuides.pertemuan}</div>
            </section>
          )}

          {/* Signature block */}
          <section className="signature-block border-t">
            <div>
              <p className="text-sm text-gray-500 mb-1">Dibuat oleh:</p>
              <div className="h-16"></div>
              <div className="border-t w-48"></div>
              <p className="mt-1 text-sm font-medium">{c.pengembang_rps || '.........................'}</p>
              <p className="text-xs text-gray-500">Pengembang RPS</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Mengetahui:</p>
              <div className="flex gap-8">
                <div className="text-center">
                  <div className="h-16"></div>
                  <div className="border-t w-36"></div>
                  <p className="mt-1 text-sm font-medium">{c.kaprodi || '.........................'}</p>
                  <p className="text-xs text-gray-500">Kaprodi</p>
                </div>
                <div className="text-center">
                  <div className="h-16"></div>
                  <div className="border-t w-36"></div>
                  <p className="mt-1 text-sm font-medium">Ketua STIKes</p>
                  <p className="text-xs text-gray-500">Ibnu Sina Ajibarang</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Bottom tab bar */}
      <div className="section-tabs">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={activeSection === section.id ? 'active' : ''}
          >
            {section.label}
          </button>
        ))}
      </div>
    </div>
  )
}
