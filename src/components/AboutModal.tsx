import { XIcon, InfoIcon } from './icons'

interface AboutModalProps {
  open: boolean
  onClose: () => void
}

export function AboutModal({ open, onClose }: AboutModalProps) {
  if (!open) return null

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()} style={{ width: '560px' }}>
        <div className="settings-header">
          <span className="settings-icon">
            <InfoIcon size={18} />
          </span>
          <h2>Tentang Aplikasi</h2>
          <button className="settings-close" onClick={onClose}>
            <XIcon size={18} />
          </button>
        </div>

        <div className="settings-body">
          <div style={{ display: 'flex', gap: '20px' }}>
            {/* Kolom kiri */}
            <div style={{ flex: 1, fontSize: '13px', lineHeight: '1.6' }}>
              <p style={{ marginBottom: '8px' }}>
                <strong>RPS Maker UNISINA</strong> adalah aplikasi desktop untuk membantu dosen
                Universitas Ibnu Sina Ajibarang menyusun RPS secara efisien.
              </p>
              <p style={{ marginBottom: '8px' }}>
                Memanfaatkan <strong>AI</strong> sebagai asisten dalam pengembangan RPS — membantu
                menyusun capaian pembelajaran, indikator, dan materi perkuliahan.
              </p>
              <p>
                Proyek ini <strong>open source</strong> — siapa saja bisa mengembangkan
                dan menyesuaikan dengan kebutuhan institusi masing-masing.
              </p>
            </div>

            {/* Kolom kanan */}
            <div style={{ flex: 1, fontSize: '13px', lineHeight: '1.6' }}>
              <p style={{ marginBottom: '8px' }}>
                <strong>GitHub:</strong><br />
                <a href="https://github.com/teguh02/rps-maker" target="_blank" rel="noreferrer"
                  style={{ color: '#2563eb' }}>
                  github.com/teguh02/rps-maker
                </a>
              </p>

              <div style={{
                borderTop: '1px solid #e5e7eb',
                paddingTop: '8px',
                marginTop: '8px',
                color: '#6b7280',
              }}>
                <p style={{ marginBottom: '4px' }}><strong>Lead Developer</strong></p>
                <p style={{ marginBottom: '2px' }}>Teguh Rijanandi</p>
                <p>teguhrijanandi02@gmail.com</p>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <div className="settings-footer-right">
            <button className="settings-btn settings-btn-primary" onClick={onClose}>
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
