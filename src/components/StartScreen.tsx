import { useState } from 'react'
import { prodiData, getPreloadedTemplate } from '../templates/curriculum-data'

interface RecentFile {
  path: string
  name: string
  openedAt: string
}

interface StartScreenProps {
  onNew: (content: Record<string, string>) => void
  onOpen: () => void
  recentFiles: RecentFile[]
  onOpenRecent: (path: string) => void
  onClearRecent: () => void
}

export function StartScreen({ onNew, onOpen, recentFiles, onOpenRecent, onClearRecent }: StartScreenProps) {
  const [selectedProdi, setSelectedProdi] = useState('')
  const [selectedMK, setSelectedMK] = useState('')
  const [showNewDialog, setShowNewDialog] = useState(false)

  const selectedProdiData = prodiData.find(p => p.kode === selectedProdi)

  const handleCreateNew = () => {
    if (selectedProdi && selectedMK) {
      const content = getPreloadedTemplate(selectedProdi, selectedMK)
      onNew(content)
    } else if (selectedProdi && !selectedMK) {
      onNew({
        prodi: selectedProdiData?.nama || '',
        mata_kuliah: '',
        kode_mk: '',
        sks: '',
        semester: '',
        dosen: '',
        semester_akademik: '',
        cpl: '',
        cpmk: '',
        sub_cpmk: '',
        bahan_kajian: '',
        metode: '',
        pengalaman_belajar: '',
        asesmen: '',
        referensi: '',
      })
    } else {
      onNew({
        prodi: '',
        mata_kuliah: '',
        kode_mk: '',
        sks: '',
        semester: '',
        dosen: '',
        semester_akademik: '',
        cpl: '',
        cpmk: '',
        sub_cpmk: '',
        bahan_kajian: '',
        metode: '',
        pengalaman_belajar: '',
        asesmen: '',
        referensi: '',
      })
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="text-center mb-12">
        <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-full shadow-lg flex items-center justify-center text-4xl">🎓</div>
        <h1 className="text-4xl font-bold text-gray-800 mb-2">RPS Maker</h1>
        <p className="text-lg text-gray-600">UNIVERSITAS IBNU SINA AJIBARANG</p>
      </div>

      <div className="w-full max-w-2xl space-y-6">
        {/* New Project Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Mulai Project Baru</h2>
          {!showNewDialog ? (
            <div className="flex gap-4">
              <button
                onClick={() => setShowNewDialog(true)}
                className="px-8 py-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 text-left group w-full"
              >
                <div className="text-2xl mb-2">📄</div>
                <div className="font-semibold text-gray-800 group-hover:text-blue-600">Project Baru</div>
                <div className="text-sm text-gray-500">Buat RPS dari template kosong atau preloaded</div>
              </button>

              <button
                onClick={onOpen}
                className="px-8 py-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 text-left group w-full"
              >
                <div className="text-2xl mb-2">📂</div>
                <div className="font-semibold text-gray-800 group-hover:text-blue-600">Buka File</div>
                <div className="text-sm text-gray-500">Buka project .rps yang sudah ada</div>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program Studi</label>
                <select
                  value={selectedProdi}
                  onChange={(e) => {
                    setSelectedProdi(e.target.value)
                    setSelectedMK('')
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Prodi --</option>
                  {prodiData.map(p => (
                    <option key={p.kode} value={p.kode}>{p.nama}</option>
                  ))}
                </select>
              </div>

              {selectedProdiData && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mata Kuliah (opsional)</label>
                  <select
                    value={selectedMK}
                    onChange={(e) => setSelectedMK(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Template Kosong --</option>
                    {selectedProdiData.mataKuliah.map(mk => (
                      <option key={mk.kode} value={mk.kode}>
                        [{mk.kode}] {mk.nama} ({mk.sks} SKS)
                      </option>
                    ))}
                  </select>
                  {selectedMK && (
                    <p className="text-xs text-green-600 mt-1">
                      ✅ CPL, CPMK, Sub-CPMK, dan Referensi akan terisi otomatis dari kurikulum
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreateNew}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Buat Project
                </button>
                <button
                  onClick={() => setShowNewDialog(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recent Files Section */}
        {recentFiles.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Project Terakhir Dibuka</h2>
              <button
                onClick={onClearRecent}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Hapus riwayat
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentFiles.map((file, idx) => (
                <button
                  key={file.path}
                  onClick={() => onOpenRecent(file.path)}
                  className="w-full px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 hover:border-gray-300 text-left transition-colors"
                >
                  <div className="font-medium text-gray-800">{file.name}</div>
                  <div className="text-xs text-gray-500">Terakhir dibuka: {formatDate(file.openedAt)}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-8">v1.0.0 — Dibuat untuk Dosen UNISINA</p>
    </div>
  )
}