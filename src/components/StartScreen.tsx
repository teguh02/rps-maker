import { useEffect, useState } from 'react'
import { prodiData, getPreloadedTemplate } from '../templates/curriculum-data'
import { GraduationCapIcon, FileIcon, FolderOpenIcon, ClockIcon, PlusIcon, ChevronRightIcon, DownloadIcon, XIcon } from './icons'

// Real version from package.json — injected by Vite at build time (__APP_VERSION__).
const APP_VERSION: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : ''

interface RecentFile {
  path: string
  name: string
  openedAt: string
}

interface StartScreenProps {
  onNew: (content?: Record<string, string>) => void
  onOpen: () => void
  recentFiles: RecentFile[]
  onOpenRecent: (path: string) => void
  onClearRecent: () => void
}

type UpdateState =
  | { phase: 'idle' }
  | { phase: 'available'; version: string; notes: string; url: string }
  | { phase: 'downloading'; percent: number; version: string }

// Dismissed-version is remembered per version so the banner reappears
// only when an even newer release shows up.
const DISMISSED_KEY = 'rps-dismissed-update'

export function StartScreen({ onNew, onOpen, recentFiles, onOpenRecent, onClearRecent }: StartScreenProps) {
  const [selectedProdi, setSelectedProdi] = useState('')
  const [selectedMK, setSelectedMK] = useState('')
  const [update, setUpdate] = useState<UpdateState>({ phase: 'idle' })
  const [updateError, setUpdateError] = useState('')

  // Auto-detect a newer release from GitHub when the start screen opens.
  useEffect(() => {
    let cancelled = false
    const unsubProgress = window.electronAPI.onUpdateProgress((data) => {
      setUpdate(prev => (prev.phase === 'downloading' ? { ...prev, percent: data.percent } : prev))
    })

    window.electronAPI.checkForUpdates()
      .then((res) => {
        if (cancelled) return
        if (res.status === 'update-available' && res.version && res.version !== res.currentVersion) {
          try {
            if (localStorage.getItem(DISMISSED_KEY) === res.version) return
          } catch { /* ignore */ }
          setUpdate({ phase: 'available', version: res.version, notes: res.notes || '', url: res.url || '' })
        }
      })
      .catch(() => { /* update check is best-effort — never block the UI */ })

    return () => {
      cancelled = true
      unsubProgress()
    }
  }, [])

  const selectedProdiData = prodiData.find(p => p.kode === selectedProdi)

  const handleDismissUpdate = () => {
    if (update.phase === 'available') {
      try { localStorage.setItem(DISMISSED_KEY, update.version) } catch { /* ignore */ }
    }
    setUpdate({ phase: 'idle' })
    setUpdateError('')
  }

  const handleInstallUpdate = async () => {
    if (update.phase !== 'available') return
    const { version, notes, url } = update
    setUpdateError('')
    setUpdate({ phase: 'downloading', percent: 0, version })
    try {
      const res = await window.electronAPI.installUpdate()
      if (res.ok && res.dev) {
        // Dev mode: halaman rilis sudah dibuka di browser — kembalikan banner.
        setUpdate({ phase: 'available', version, notes, url })
      } else if (!res.ok) {
        setUpdate({ phase: 'available', version, notes, url })
        setUpdateError(res.error || 'Gagal mengunduh update.')
      }
      // Packaged: sukses → app keluar & installer berjalan sendiri.
    } catch {
      setUpdate({ phase: 'available', version, notes, url })
      setUpdateError('Gagal menghubungi server update.')
    }
  }

  const handleCreateNew = () => {
    if (selectedProdi && selectedMK) {
      const content = getPreloadedTemplate(selectedProdi, selectedMK)
      onNew(content)
      return
    }
    // Blank project (merged over the app defaults in App.tsx); prefill prodi if chosen.
    onNew(selectedProdiData ? { prodi: selectedProdiData.nama } : undefined)
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const recentCount = recentFiles.length

  return (
    <div className="start-screen">
      {/* Top bar — same blue as the ribbon/section tabs */}
      <header className="ss-appbar">
        <div className="ss-appbar-inner">
          <div className="ss-brand">
            <span className="ss-brand-logo">
              <GraduationCapIcon size={22} />
            </span>
            <div className="ss-brand-text">
              <span className="ss-brand-name">RPS Maker</span>
              <span className="ss-brand-sub">UNISINA</span>
            </div>
          </div>
          <span className="ss-appbar-chip" title="Versi aplikasi (package.json)">v{APP_VERSION || '—'}</span>
        </div>
      </header>

      <div className="ss-body">
        {/* Update tersedia banner (auto-detect dari GitHub Releases) */}
        {update.phase !== 'idle' && (
          <div className="ss-update-zone">
            <div className="ss-update-zone-inner">
              {update.phase === 'available' && (
                <div className="ss-update-banner" role="alert">
                  <span className="ss-update-icon">
                    <DownloadIcon size={18} />
                  </span>
                  <div className="ss-update-info">
                    <p className="ss-update-title">
                      Update tersedia — versi {update.version}
                      <span className="ss-update-badge">BARU</span>
                    </p>
                    <p className="ss-update-desc">
                      Versi terpasang: v{APP_VERSION || '—'}.{' '}
                      {update.notes ? update.notes : 'Klik Update Sekarang untuk mengunduh dan memasang versi terbaru.'}
                    </p>
                    {updateError && <p className="ss-update-error">{updateError}</p>}
                  </div>
                  <div className="ss-update-actions">
                    <button className="ss-update-btn" onClick={handleInstallUpdate}>
                      <DownloadIcon size={15} />
                      Update Sekarang
                    </button>
                    <button
                      className="ss-update-close"
                      onClick={handleDismissUpdate}
                      title="Tutup — abaikan update ini"
                      aria-label="Tutup pemberitahuan update"
                    >
                      <XIcon size={16} />
                    </button>
                  </div>
                </div>
              )}
              {update.phase === 'downloading' && (
                <div className="ss-update-banner ss-update-banner-downloading">
                  <span className="ss-update-icon">
                    <DownloadIcon size={18} />
                  </span>
                  <div className="ss-update-info">
                    <p className="ss-update-title">Mengunduh update v{update.version}…</p>
                    <div className="ss-update-progress-track">
                      <div className="ss-update-progress-fill" style={{ width: `${update.percent}%` }} />
                    </div>
                  </div>
                  <span className="ss-update-percent">{update.percent}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="ss-container">
          {/* Hero */}
          <div className="ss-hero">
            <p className="ss-eyebrow">RENCANA PEMBELAJARAN SEMESTER</p>
            <h1 className="ss-hero-title">Mulai menyusun RPS dengan rapi &amp; profesional</h1>
            <p className="ss-hero-sub">
              Pilih template kurikulum atau mulai dari kosong, isi setiap bagian, lalu ekspor langsung
              ke Word / PDF — semuanya tersimpan dalam satu file project.
            </p>
          </div>

          <div className="ss-grid">
            {/* ── New project card ── */}
            <section className="ss-card ss-card-new">
              <div className="ss-card-header">
                <span className="ss-card-icon ss-icon-blue">
                  <FileIcon size={20} />
                </span>
                <div>
                  <h2 className="ss-card-title">Project Baru</h2>
                  <p className="ss-card-sub">Mulai dari template kurikulum atau dokumen kosong</p>
                </div>
              </div>

              <div className="ss-card-body">
                <div className="ss-field">
                  <label className="ss-field-label" htmlFor="ss-prodi">
                    <span className="ss-step">1</span> Program Studi
                  </label>
                  <select
                    id="ss-prodi"
                    value={selectedProdi}
                    onChange={(e) => { setSelectedProdi(e.target.value); setSelectedMK('') }}
                    className="ss-select"
                  >
                    <option value="">-- Pilih Program Studi --</option>
                    {prodiData.map(p => (
                      <option key={p.kode} value={p.kode}>{p.nama} — {p.jenjang}</option>
                    ))}
                  </select>
                </div>

                {selectedProdiData && (
                  <div className="ss-field">
                    <label className="ss-field-label" htmlFor="ss-mk">
                      <span className="ss-step">2</span> Mata Kuliah <span className="ss-optional">(opsional)</span>
                    </label>
                    <select
                      id="ss-mk"
                      value={selectedMK}
                      onChange={(e) => setSelectedMK(e.target.value)}
                      className="ss-select"
                    >
                      <option value="">-- Template Kosong --</option>
                      {selectedProdiData.mataKuliah.map(mk => (
                        <option key={mk.kode} value={mk.kode}>
                          [{mk.kode}] {mk.nama} ({mk.sks} SKS)
                        </option>
                      ))}
                    </select>
                    {selectedMK ? (
                      <p className="ss-hint ss-hint-ok">
                        CPL, CPMK, Sub-CPMK &amp; referensi akan terisi otomatis dari kurikulum.
                      </p>
                    ) : (
                      <p className="ss-hint">Lembar kerja kosong akan dibuat — isi datanya secara manual.</p>
                    )}
                  </div>
                )}

                <button
                  onClick={handleCreateNew}
                  className="ss-btn ss-btn-primary ss-btn-block"
                >
                  <PlusIcon size={18} />
                  Buat Project Baru
                </button>
              </div>
            </section>

            {/* ── Recent projects card ── */}
            <section className="ss-card ss-card-recent">
              <div className="ss-card-header">
                <span className="ss-card-icon ss-icon-soft">
                  <ClockIcon size={20} />
                </span>
                <div className="ss-card-header-title-row">
                  <div>
                    <h2 className="ss-card-title">Terakhir Dibuka</h2>
                    <p className="ss-card-sub">Lanjutkan pekerjaan Anda</p>
                  </div>
                  {recentCount > 0 && (
                    <span className="ss-count">{recentCount}</span>
                  )}
                </div>
              </div>

              <div className="ss-card-body ss-recent-body">
                {recentCount === 0 ? (
                  <div className="ss-empty">
                    <span className="ss-empty-icon">
                      <FolderOpenIcon size={28} />
                    </span>
                    <p className="ss-empty-title">Belum ada project</p>
                    <p className="ss-empty-sub">Project yang Anda simpan akan muncul di sini agar mudah dibuka kembali.</p>
                    <button onClick={onOpen} className="ss-btn ss-btn-outline">
                      <FolderOpenIcon size={16} />
                      Buka Project…
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="ss-recent-list">
                      {recentFiles.map((file) => (
                        <button
                          key={file.path}
                          onClick={() => onOpenRecent(file.path)}
                          className="ss-recent-item"
                        >
                          <span className="ss-recent-icon">
                            <FileIcon size={17} />
                          </span>
                          <span className="ss-recent-info">
                            <span className="ss-recent-name" title={file.name}>{file.name}</span>
                            <span className="ss-recent-date">Dibuka {formatDate(file.openedAt)}</span>
                          </span>
                          <ChevronRightIcon size={16} className="ss-recent-chevron" />
                        </button>
                      ))}
                    </div>
                    <div className="ss-recent-footer">
                      <button onClick={onOpen} className="ss-btn ss-btn-outline ss-btn-block">
                        <FolderOpenIcon size={16} />
                        Buka Project Lain…
                      </button>
                      <button onClick={onClearRecent} className="ss-link-danger">
                        Hapus riwayat
                      </button>
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>

          <p className="ss-footer">v{APP_VERSION || '1.0.0'} — Dibuat untuk Dosen UNISINA · S1 Farmasi &amp; D3 Anafarma</p>
        </div>
      </div>
    </div>
  )
}
