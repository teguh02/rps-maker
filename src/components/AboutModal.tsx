import { XIcon, InfoIcon } from './icons'

interface AboutModalProps {
  open: boolean
  onClose: () => void
}

export function AboutModal({ open, onClose }: AboutModalProps) {
  if (!open) return null

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="settings-header">
          <span className="settings-icon">
            <InfoIcon size={18} />
          </span>
          <h2>Tentang Aplikasi</h2>
          <button className="settings-close" onClick={onClose}>
            <XIcon size={18} />
          </button>
        </div>

        <div className="settings-body" style={{ lineHeight: '1.7' }}>
          <p style={{ marginBottom: '12px' }}>
            <strong>RPS Maker UNISINA</strong> adalah aplikasi desktop lintas platform untuk membantu dosen
            Universitas Ibnu Sina Ajibarang dalam menyusun dokumen Rencana Pembelajaran Semester (RPS)
            secara efisien dan terstruktur.
          </p>
          <p style={{ marginBottom: '12px' }}>
            Seiring berkembangnya teknologi, kami memanfaatkan <strong>kecerdasan buatan (AI)</strong> sebagai
            asisten dalam pengembangan RPS — membantu dosen menyusun capaian pembelajaran, indikator, serta
            materi perkuliahan dengan lebih cepat dan terarah.
          </p>
          <p style={{ marginBottom: '12px' }}>
            Proyek ini bersifat <strong>open source</strong> dan terbuka bagi siapa saja untuk ikut serta
            mengembangkan, memperbaiki, atau menyesuaikan dengan kebutuhan institusi masing-masing.
          </p>
          <p style={{ marginBottom: '12px' }}>
            <strong>GitHub:</strong>{' '}
            <a href="https://github.com/teguh02/rps-maker" target="_blank" rel="noreferrer"
              style={{ color: '#2563eb' }}>
              github.com/teguh02/rps-maker
            </a>
          </p>

          <div style={{
            borderTop: '1px solid #e5e7eb',
            paddingTop: '12px',
            marginTop: '12px',
            fontSize: '13px',
            color: '#6b7280',
          }}>
            <p style={{ marginBottom: '4px' }}><strong>Lead Developer</strong></p>
            <p style={{ marginBottom: '2px' }}>Teguh Rijanandi</p>
            <p>teguhrijanandi02@gmail.com</p>
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
