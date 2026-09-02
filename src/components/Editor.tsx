import { useState } from 'react'
import type { Project } from '../App'
import { Toolbar } from './Toolbar'
import { RTE } from './RTE'
import { isAIConfigured, generateWithAI, getSectionPrompt } from '../services/ai'

interface EditorProps {
  project: Project
  onUpdate: (content: Record<string, string>) => void
  onSave: () => void
  onSaveAs: () => void
  onExport?: (format: 'pdf' | 'docx') => void
  onOpenAISettings?: () => void
}

export function Editor({ project, onUpdate, onSave, onSaveAs, onExport, onOpenAISettings }: EditorProps) {
  const [activeSection, setActiveSection] = useState('identitas')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  const updateField = (key: string, value: string) => {
    onUpdate({
      ...project.content,
      [key]: value,
    })
  }

  const fieldLabels: Record<string, string> = {
    prodi: 'Program Studi',
    mata_kuliah: 'Mata Kuliah',
    kode_mk: 'Kode MK',
    sks: 'SKS',
    semester: 'Semester',
    dosen: 'Dosen Pengampu',
    semester_akademik: 'Semester Akademik',
  }

  const sections = [
    { id: 'identitas', label: 'Identitas', icon: '📋' },
    { id: 'cpl', label: 'CPL', icon: '🎯' },
    { id: 'cpmk', label: 'CPMK', icon: '📝' },
    { id: 'sub_cpmk', label: 'Sub-CPMK', icon: '📑' },
    { id: 'bahan_kajian', label: 'Bahan Kajian', icon: '📚' },
    { id: 'metode', label: 'Metode', icon: '⚙️' },
    { id: 'pengalaman_belajar', label: 'Pengalaman Belajar', icon: '🎓' },
    { id: 'asesmen', label: 'Asesmen', icon: '📊' },
    { id: 'referensi', label: 'Referensi', icon: '📖' },
  ]

  const sectionGuides: Record<string, string> = {
    cpl: '💡 CPL ditetapkan oleh program studi dari kurikulum. Tidak boleh dihapus, tapi bisa ditambah.',
    cpmk: '💡 CPMK harus terukur. Gunakan KKO Bloom: Mengidentifikasi (C2), Menganalisis (C4), Mencipta (C6).',
    sub_cpmk: '💡 Pecah CPMK menjadi unit-unit kecil yang bisa diselesaikan dalam 1-2 pertemuan.',
    bahan_kajian: '💡 Pilih bahan kajian yang relevan. Prioritaskan referensi max 5 tahun terakhir.',
    metode: '💡 IKU 7: Minimal 40% mata kuliah harus pakai Case Method atau Team-Based Project.',
    pengalaman_belajar: '💡 Deskripsikan aktivitas konkret yang harus diselesaikan mahasiswa per minggu.',
    asesmen: '💡 Bobot asesmen partisipatif minimal 50% untuk pemenuhan IKU 7.',
    referensi: '💡 Referensi harus terkini (max 5 tahun terakhir). Sertakan jurnal internasional bereputasi.',
  }

  const handleAIGenerate = async (section: string) => {
    if (!isAIConfigured()) {
      setAiError('⚠️ AI belum dikonfigurasi. Buka Settings (Tools → AI Settings) untuk mengatur.')
      return
    }
    setAiLoading(true)
    setAiError('')
    try {
      const opts = getSectionPrompt(section, project.content)
      const result = await generateWithAI(opts)
      updateField(section, result)
    } catch (err) {
      setAiError(`❌ ${(err as Error).message}`)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Toolbar onSave={onSave} onSaveAs={onSaveAs} onExport={onExport} onOpenAISettings={onOpenAISettings} />

      <div className="flex-1 overflow-y-auto bg-gray-200 p-8">
        <div className="max-w-4xl mx-auto bg-white shadow-lg min-h-[1100px]">
          <div className="text-center py-8 border-b">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center text-3xl">🎓</div>
            <h1 className="text-2xl font-bold mb-1">RENCANA PEMBELAJARAN SEMESTER</h1>
            <p className="text-sm text-gray-600">(RPS)</p>
          </div>

          {activeSection === 'identitas' && (
            <section className="p-8 border-b">
              <h2 className="text-lg font-bold mb-4">I. IDENTITAS MATA KULIAH</h2>
              <table className="w-full">
                <tbody>
                  {Object.entries(fieldLabels).map(([key, label]) => (
                    <tr key={key} className="border-b">
                      <td className="py-2 w-48 font-medium text-gray-700">{label}</td>
                      <td className="py-2">
                        <input
                          type="text"
                          value={project.content[key] || ''}
                          onChange={(e) => updateField(key, e.target.value)}
                          className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none rounded"
                          placeholder={`Masukkan ${label.toLowerCase()}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                💡 Isi sesuai kurikulum program studi masing-masing.
              </div>
            </section>
          )}

          {activeSection !== 'identitas' && (
            <section className="p-8 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">
                  {sections.find(s => s.id === activeSection)?.label.toUpperCase()}
                </h2>
                <button
                  onClick={() => handleAIGenerate(activeSection)}
                  disabled={aiLoading}
                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200 flex items-center gap-1 disabled:opacity-50"
                >
                  {aiLoading ? '⏳ Generating...' : '✨ Generate via AI'}
                </button>
              </div>
              {aiError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">
                  {aiError}
                  <button onClick={() => setAiError('')} className="ml-2 underline">tutup</button>
                </div>
              )}
              <RTE
                content={project.content[activeSection] || ''}
                onUpdate={(html) => updateField(activeSection, html)}
                placeholder="Tulis konten di sini atau klik 'Generate via AI'..."
              />
              <div className="mt-3 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                {sectionGuides[activeSection] || '💡 Tip: Bold, italic, lists, headings, dan table tersedia di menu Format.'}
              </div>
            </section>
          )}

          <section className="p-8">
            <div className="flex justify-between">
              <div className="text-center">
                <div className="h-20"></div>
                <div className="border-t w-48 mx-auto"></div>
                <p className="mt-2 font-medium">Dosen Pengampu</p>
              </div>
              <div className="text-center">
                <div className="h-20"></div>
                <div className="border-t w-48 mx-auto"></div>
                <p className="mt-2 font-medium">Kaprodi</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="bg-white border-t px-4 py-2 flex gap-2 overflow-x-auto">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`px-3 py-1 rounded text-sm whitespace-nowrap transition-colors ${
              activeSection === section.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {section.icon} {section.label}
          </button>
        ))}
      </div>
    </div>
  )
}