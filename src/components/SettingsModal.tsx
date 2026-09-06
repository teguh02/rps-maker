import { useState, useEffect } from 'react'
import { XIcon, SettingsIcon } from './icons'

const STORAGE_KEY_KAPRODI = 'rps-kaprodi-override'
const STORAGE_KEY_KETUA = 'rps-ketua-stikes-override'
const STORAGE_KEY_USER_NAME = 'rps-user-name'
const STORAGE_KEY_USER_NIDN = 'rps-user-nidn'
const STORAGE_KEY_USER_PRODI = 'rps-user-prodi'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [userName, setUserName] = useState('')
  const [userNidn, setUserNidn] = useState('')
  const [userProdi, setUserProdi] = useState('')
  const [kaprodi, setKaprodi] = useState('')
  const [ketuaStikes, setKetuaStikes] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (open) {
      setUserName(localStorage.getItem(STORAGE_KEY_USER_NAME) || '')
      setUserNidn(localStorage.getItem(STORAGE_KEY_USER_NIDN) || '')
      setUserProdi(localStorage.getItem(STORAGE_KEY_USER_PRODI) || '')
      setKaprodi(localStorage.getItem(STORAGE_KEY_KAPRODI) || '')
      setKetuaStikes(localStorage.getItem(STORAGE_KEY_KETUA) || 'apt. Adi Susanto, M.Farm')
      setSaved(false)
    }
  }, [open])

  if (!open) return null

  const handleSave = () => {
    // User identity
    if (userName.trim()) {
      localStorage.setItem(STORAGE_KEY_USER_NAME, userName.trim())
    } else {
      localStorage.removeItem(STORAGE_KEY_USER_NAME)
    }
    if (userNidn.trim()) {
      localStorage.setItem(STORAGE_KEY_USER_NIDN, userNidn.trim())
    } else {
      localStorage.removeItem(STORAGE_KEY_USER_NIDN)
    }
    if (userProdi.trim()) {
      localStorage.setItem(STORAGE_KEY_USER_PRODI, userProdi.trim())
    } else {
      localStorage.removeItem(STORAGE_KEY_USER_PRODI)
    }
    // Overrides
    if (kaprodi.trim()) {
      localStorage.setItem(STORAGE_KEY_KAPRODI, kaprodi.trim())
    } else {
      localStorage.removeItem(STORAGE_KEY_KAPRODI)
    }
    if (ketuaStikes.trim()) {
      localStorage.setItem(STORAGE_KEY_KETUA, ketuaStikes.trim())
    } else {
      localStorage.removeItem(STORAGE_KEY_KETUA)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY_USER_NAME)
    localStorage.removeItem(STORAGE_KEY_USER_NIDN)
    localStorage.removeItem(STORAGE_KEY_USER_PRODI)
    localStorage.removeItem(STORAGE_KEY_KAPRODI)
    localStorage.removeItem(STORAGE_KEY_KETUA)
    setUserName('')
    setUserNidn('')
    setUserProdi('')
    setKaprodi('')
    setKetuaStikes('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <span className="settings-icon">
            <SettingsIcon size={18} />
          </span>
          <h2>Pengaturan Default</h2>
          <button className="settings-close" onClick={onClose}>
            <XIcon size={18} />
          </button>
        </div>

        <div className="settings-body">
          {/* ── Data Diri Pengguna ── */}
          <p className="settings-desc">
            Data diri pengguna. Otomatis mengisi Dosen Pengampu dan Pengembang RPS saat membuat project baru.
          </p>

          <div className="settings-field">
            <label>Nama Lengkap (beserta gelar)</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Contoh: Apt. Fulan, M.Farm"
            />
          </div>

          <div className="settings-field">
            <label>NIDN</label>
            <input
              type="text"
              value={userNidn}
              onChange={(e) => setUserNidn(e.target.value)}
              placeholder="Contoh: 0612345678"
            />
          </div>

          <div className="settings-field">
            <label>Prodi</label>
            <input
              type="text"
              value={userProdi}
              onChange={(e) => setUserProdi(e.target.value)}
              placeholder="Contoh: S1 Farmasi"
            />
          </div>

          {/* ── Override Otorisasi ── */}
          <p className="settings-desc" style={{ marginTop: '12px' }}>
            Override nama default untuk Kaprodi dan Ketua STIKes.
          </p>

          <div className="settings-field">
            <label>Kaprodi</label>
            <input
              type="text"
              value={kaprodi}
              onChange={(e) => setKaprodi(e.target.value)}
              placeholder="Kosongkan untuk menggunakan default Prodi"
            />
          </div>

          <div className="settings-field">
            <label>Ketua STIKes</label>
            <input
              type="text"
              value={ketuaStikes}
              onChange={(e) => setKetuaStikes(e.target.value)}
              placeholder="Kosongkan untuk menggunakan default"
            />
          </div>
        </div>

        <div className="settings-footer">
          <button className="settings-btn settings-btn-outline" onClick={handleReset}>
            Reset ke Default
          </button>
          <div className="settings-footer-right">
            {saved && <span className="settings-saved">Tersimpan</span>}
            <button className="settings-btn settings-btn-primary" onClick={handleSave}>
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
