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
  const [showRecent, setShowRecent] = useState(false)

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

  if (showRecent) {
    return (
      <div className="start-screen">
        <div className="start-cards" style={{ maxWidth: '36rem' }}>
          <div className="start-card">
            <div className="flex items-center justify-between mb-4">
              <h2>📁 Project Terakhir Dibuka</h2>
              <button onClick={() => setShowRecent(false)} className="btn btn-secondary">
                ← Kembali
              </button>
            </div>
            {recentFiles.length === 0 ? (
              <p className="text-gray-500 text-sm">Belum ada project yang dibuka.</p>
            ) : (
              <>
                <div className="flex justify-end mb-3">
                  <button onClick={onClearRecent} className="btn btn-danger-text text-sm">
                    Hapus riwayat
                  </button>
                </div>
                <div className="space-y-2">
                  {recentFiles.map((file) => (
                    <button
                      key={file.path}
                      onClick={() => onOpenRecent(file.path)}
                      className="recent-item"
                    >
                      <div className="recent-item-name">{file.name}</div>
                      <div className="recent-item-date">Terakhir dibuka: {formatDate(file.openedAt)}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="start-screen">
      <div className="start-hero">
        <div className="start-hero-icon">🎓</div>
        <h1>RPS Maker</h1>
        <p>UNIVERSITAS IBNU SINA AJIBARANG</p>
      </div>

      <div className="start-cards">
        {/* New Project Section */}
        <div className="start-card">
          <h2>Mulai Project Baru</h2>
          {!showNewDialog ? (
            <div className="start-card-buttons">
              <button onClick={() => setShowNewDialog(true)} className="start-card-btn">
                <div className="start-card-btn-icon">📄</div>
                <div className="start-card-btn-title">Project Baru</div>
                <div className="start-card-btn-desc">Buat RPS dari template kosong atau preloaded</div>
              </button>

              <button onClick={onOpen} className="start-card-btn">
                <div className="start-card-btn-icon">📂</div>
                <div className="start-card-btn-title">Buka File</div>
                <div className="start-card-btn-desc">Buka project .rps yang sudah ada</div>
              </button>

              {recentFiles.length > 0 && (
                <button onClick={() => setShowRecent(true)} className="start-card-btn">
                  <div className="start-card-btn-icon">📁</div>
                  <div className="start-card-btn-title">Project Terakhir</div>
                  <div className="start-card-btn-desc">{recentFiles.length} project baru dibuka</div>
                </button>
              )}
            </div>
          ) : (
            <div>
              <div className="form-group">
                <label className="form-label">Program Studi</label>
                <select
                  value={selectedProdi}
                  onChange={(e) => { setSelectedProdi(e.target.value); setSelectedMK('') }}
                  className="form-select"
                >
                  <option value="">-- Pilih Prodi --</option>
                  {prodiData.map(p => (
                    <option key={p.kode} value={p.kode}>{p.nama}</option>
                  ))}
                </select>
              </div>

              {selectedProdiData && (
                <div className="form-group">
                  <label className="form-label">Mata Kuliah (opsional)</label>
                  <select
                    value={selectedMK}
                    onChange={(e) => setSelectedMK(e.target.value)}
                    className="form-select"
                  >
                    <option value="">-- Template Kosong --</option>
                    {selectedProdiData.mataKuliah.map(mk => (
                      <option key={mk.kode} value={mk.kode}>
                        [{mk.kode}] {mk.nama} ({mk.sks} SKS)
                      </option>
                    ))}
                  </select>
                  {selectedMK && (
                    <p className="form-hint text-green-600">
                      ✅ CPL, CPMK, Sub-CPMK, dan Referensi akan terisi otomatis dari kurikulum
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={handleCreateNew} className="btn btn-primary flex-1">
                  Buat Project
                </button>
                <button onClick={() => setShowNewDialog(false)} className="btn btn-secondary">
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-8">v1.0.0 — Dibuat untuk Dosen UNISINA</p>
    </div>
  )
}