import { useState, useEffect } from 'react'
import { XIcon, SettingsIcon } from './icons'

const STORAGE_KEY_KAPRODI = 'rps-kaprodi-override'
const STORAGE_KEY_KETUA = 'rps-ketua-stikes-override'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [kaprodi, setKaprodi] = useState('')
  const [ketuaStikes, setKetuaStikes] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (open) {
      setKaprodi(localStorage.getItem(STORAGE_KEY_KAPRODI) || '')
      setKetuaStikes(localStorage.getItem(STORAGE_KEY_KETUA) || '')
      setSaved(false)
    }
  }, [open])

  if (!open) return null

  const handleSave = () => {
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
    localStorage.removeItem(STORAGE_KEY_KAPRODI)
    localStorage.removeItem(STORAGE_KEY_KETUA)
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
          <p className="settings-desc">
            Override nama default untuk kaprodi dan ketua STIKes.
            Nilai ini digunakan saat membuat project baru dengan Prodi.
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
