import { useState } from 'react'
import type { Project } from '../App'
import { Toolbar } from './Toolbar'

interface EditorProps {
  project: Project
  onUpdate: (content: Project['content']) => void
  onSave: () => void
  onSaveAs: () => void
}

export function Editor({ project, onUpdate, onSave, onSaveAs }: EditorProps) {
  const [activeSection, setActiveSection] = useState('identitas')

  const updateField = (key: string, value: string) => {
    onUpdate({
      ...project.content,
      fields: { ...project.content.fields, [key]: value },
    })
  }

  const updateSection = (key: string, value: string) => {
    onUpdate({
      ...project.content,
      sections: { ...project.content.sections, [key]: value },
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <Toolbar onSave={onSave} onSaveAs={onSaveAs} />

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto bg-gray-200 p-8">
        <div className="max-w-4xl mx-auto bg-white shadow-lg min-h-[1100px] p-12">
          {/* Cover Section */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center text-3xl">
              🎓
            </div>
            <h1 className="text-xl font-bold mb-1">RENCANA PEMBELAJARAN SEMESTER</h1>
            <p className="text-sm text-gray-600">(RPS)</p>
          </div>

          {/* Identitas Section */}
          {activeSection === 'identitas' && (
            <section className="mb-8">
              <h2 className="text-lg font-bold mb-4 pb-2 border-b-2">I. IDENTITAS MATA KULIAH</h2>
              <table className="w-full">
                <tbody>
                  {Object.entries(fieldLabels).map(([key, label]) => (
                    <tr key={key} className="border-b">
                      <td className="py-2 w-48 font-medium text-gray-700">{label}</td>
                      <td className="py-2">
                        <input
                          type="text"
                          value={project.content.fields[key]}
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

          {/* CPL Section */}
          {activeSection === 'cpl' && (
            <section className="mb-8">
              <h2 className="text-lg font-bold mb-4 pb-2 border-b-2">II. CAPAIAN PEMBELAJARAN LULUSAN (CPL)</h2>
              <div
                contentEditable
                suppressContentEditableWarning
                className="min-h-[200px] p-3 border rounded focus:outline-none focus:border-blue-500 prose max-w-none"
                onBlur={(e) => updateSection('cpl', e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: project.content.sections.cpl }}
              />
              <div className="mt-3 text-xs text-green-600 bg-green-50 p-2 rounded">
                💡 CPL ditetapkan oleh program studi dari kurikulum. Tidak boleh dihapus, tapi bisa ditambah.
              </div>
            </section>
          )}

          {/* CPMK Section */}
          {activeSection === 'cpmk' && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4 pb-2 border-b-2">
                <h2 className="text-lg font-bold">III. CAPAIAN PEMBELAJARAN MATA KULIAH (CPMK)</h2>
                <button className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200 flex items-center gap-1">
                  ✨ Generate dari CPL
                </button>
              </div>
              <div
                contentEditable
                suppressContentEditableWarning
                className="min-h-[200px] p-3 border rounded focus:outline-none focus:border-blue-500 prose max-w-none"
                onBlur={(e) => updateSection('cpmk', e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: project.content.sections.cpmk }}
              />
              <div className="mt-3 text-xs text-purple-600 bg-purple-50 p-2 rounded">
                💡 CPMK harus terukur. Gunakan KKO Bloom: Mengidentifikasi (C2), Menganalisis (C4), Mencipta (C6), dll.
              </div>
            </section>
          )}

          {/* Sub-CPMK Section */}
          {activeSection === 'sub_cpmk' && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4 pb-2 border-b-2">
                <h2 className="text-lg font-bold">IV. SUB-CPMK</h2>
                <button className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200 flex items-center gap-1">
                  ✨ Generate dari CPMK
                </button>
              </div>
              <div
                contentEditable
                suppressContentEditableWarning
                className="min-h-[200px] p-3 border rounded focus:outline-none focus:border-blue-500 prose max-w-none"
                onBlur={(e) => updateSection('sub_cpmk', e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: project.content.sections.sub_cpmk }}
              />
              <div className="mt-3 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                💡 Pecah CPMK menjadi unit-unit kompetensi kecil yang bisa diselesaikan dalam 1-2 pertemuan.
              </div>
            </section>
          )}

          {/* Bahan Kajian Section */}
          {activeSection === 'bahan_kajian' && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4 pb-2 border-b-2">
                <h2 className="text-lg font-bold">V. BAHAN KAJIAN</h2>
                <button className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200 flex items-center gap-1">
                  ✨ Suggest dari CPMK
                </button>
              </div>
              <div
                contentEditable
                suppressContentEditableWarning
                className="min-h-[200px] p-3 border rounded focus:outline-none focus:border-blue-500 prose max-w-none"
                onBlur={(e) => updateSection('bahan_kajian', e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: project.content.sections.bahan_kajian }}
              />
              <div className="mt-3 text-xs text-teal-600 bg-teal-50 p-2 rounded">
                💡 Pilih bahan kajian yang relevan. Prioritaskan referensi max 5 tahun terakhir.
              </div>
            </section>
          )}

          {/* Metode Section */}
          {activeSection === 'metode' && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4 pb-2 border-b-2">
                <h2 className="text-lg font-bold">VI. METODE PEMBELAJARAN</h2>
                <button className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200 flex items-center gap-1">
                  ✨ Suggest metode
                </button>
              </div>
              <div
                contentEditable
                suppressContentEditableWarning
                className="min-h-[200px] p-3 border rounded focus:outline-none focus:border-blue-500 prose max-w-none"
                onBlur={(e) => updateSection('metode', e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: project.content.sections.metode }}
              />
              <div className="mt-3 text-xs text-indigo-600 bg-indigo-50 p-2 rounded">
                💡 IKU 7: Minimal 40% mata kuliah harus pakai Case Method atau Team-Based Project.
              </div>
            </section>
          )}

          {/* Pengalaman Belajar Section */}
          {activeSection === 'pengalaman_belajar' && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4 pb-2 border-b-2">
                <h2 className="text-lg font-bold">VII. PENGAALAMAN BELAJAR MAHASISWA</h2>
                <button className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200 flex items-center gap-1">
                  ✨ Generate dari Sub-CPMK
                </button>
              </div>
              <div
                contentEditable
                suppressContentEditableWarning
                className="min-h-[200px] p-3 border rounded focus:outline-none focus:border-blue-500 prose max-w-none"
                onBlur={(e) => updateSection('pengalaman_belajar', e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: project.content.sections.pengalaman_belajar }}
              />
              <div className="mt-3 text-xs text-pink-600 bg-pink-50 p-2 rounded">
                💡 Deskripsikan aktivitas konkret yang harus diselesaikan mahasiswa per minggu.
              </div>
            </section>
          )}

          {/* Asesmen Section */}
          {activeSection === 'asesmen' && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4 pb-2 border-b-2">
                <h2 className="text-lg font-bold">VIII. ASESMEN / PENILAIAN</h2>
                <button className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200 flex items-center gap-1">
                  ✨ Generate rubrik
                </button>
              </div>
              <div
                contentEditable
                suppressContentEditableWarning
                className="min-h-[200px] p-3 border rounded focus:outline-none focus:border-blue-500 prose max-w-none"
                onBlur={(e) => updateSection('asesmen', e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: project.content.sections.asesmen }}
              />
              <div className="mt-3 text-xs text-red-600 bg-red-50 p-2 rounded">
                💡 Bobot asesmen partisipatif minimal 50% untuk pemenuhan IKU 7.
              </div>
            </section>
          )}

          {/* Referensi Section */}
          {activeSection === 'referensi' && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4 pb-2 border-b-2">
                <h2 className="text-lg font-bold">IX. DAFTAR REFERENSI</h2>
                <button className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200 flex items-center gap-1">
                  ✨ Suggest referensi
                </button>
              </div>
              <div
                contentEditable
                suppressContentEditableWarning
                className="min-h-[200px] p-3 border rounded focus:outline-none focus:border-blue-500 prose max-w-none"
                onBlur={(e) => updateSection('referensi', e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: project.content.sections.referensi }}
              />
              <div className="mt-3 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                💡 Referensi harus terkini (max 5 tahun terakhir). Sertakan jurnal internasional bereputasi.
              </div>
            </section>
          )}

          {/* TTD Section */}
          <section className="mt-16 pt-8 border-t">
            <div className="flex justify-between px-8">
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

      {/* Section Navigation */}
      <div className="bg-white border-t px-4 py-2 flex gap-2 overflow-x-auto">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`px-3 py-1 rounded text-sm whitespace-nowrap transition-colors
              ${activeSection === section.id
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
