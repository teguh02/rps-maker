import { useState, useEffect } from 'react'

interface ProfilData {
  nama: string
  nidn: string
  kaprodi: string
  nidn_kaprodi: string
  ketua_stikes: string
  nidn_ketua_stikes: string
  wakil_ketua_i: string
  nidn_wakil_ketua_i: string
}

const STORAGE_KEY = 'rps-maker-profil'

const defaultProfil: ProfilData = {
  nama: '',
  nidn: '',
  kaprodi: '',
  nidn_kaprodi: '',
  ketua_stikes: '',
  nidn_ketua_stikes: '',
  wakil_ketua_i: '',
  nidn_wakil_ketua_i: '',
}

interface ProfilDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: ProfilData) => void
}

export function ProfilDialog({ open, onClose, onSave }: ProfilDialogProps) {
  const [data, setData] = useState<ProfilData>(defaultProfil)

  useEffect(() => {
    if (open) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          setData({ ...defaultProfil, ...JSON.parse(saved) })
        } else {
          setData(defaultProfil)
        }
      } catch {
        setData(defaultProfil)
      }
    }
  }, [open])

  const update = (key: keyof ProfilData, value: string) => {
    setData(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    onSave(data)
    onClose()
  }

  if (!open) return null

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="dialog-header">
          <h3 className="dialog-title">Identitas Dosen</h3>
          <button className="dialog-close" onClick={onClose}>×</button>
        </div>
        <div className="dialog-body">
          <p className="text-sm text-gray-500 mb-4">
            Simpan identitas dosen untuk digunakan otomatis di semua RPS baru.
          </p>

          <fieldset className="mb-4">
            <legend className="text-sm font-semibold text-gray-700 mb-2">Dosen Pengampu</legend>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="w-40 font-medium text-gray-700 text-sm">Nama</td>
                  <td>
                    <input type="text" value={data.nama} onChange={e => update('nama', e.target.value)} placeholder="Nama lengkap dosen" />
                  </td>
                </tr>
                <tr>
                  <td className="font-medium text-gray-700 text-sm">NIDN</td>
                  <td>
                    <input type="text" value={data.nidn} onChange={e => update('nidn', e.target.value)} placeholder="NIDN" />
                  </td>
                </tr>
              </tbody>
            </table>
          </fieldset>

          <fieldset className="mb-4">
            <legend className="text-sm font-semibold text-gray-700 mb-2">Kaprodi</legend>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="w-40 font-medium text-gray-700 text-sm">Nama</td>
                  <td>
                    <input type="text" value={data.kaprodi} onChange={e => update('kaprodi', e.target.value)} placeholder="Nama Kaprodi" />
                  </td>
                </tr>
                <tr>
                  <td className="font-medium text-gray-700 text-sm">NIDN</td>
                  <td>
                    <input type="text" value={data.nidn_kaprodi} onChange={e => update('nidn_kaprodi', e.target.value)} placeholder="NIDN Kaprodi" />
                  </td>
                </tr>
              </tbody>
            </table>
          </fieldset>

          <fieldset className="mb-4">
            <legend className="text-sm font-semibold text-gray-700 mb-2">Ketua STIKes</legend>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="w-40 font-medium text-gray-700 text-sm">Nama</td>
                  <td>
                    <input type="text" value={data.ketua_stikes} onChange={e => update('ketua_stikes', e.target.value)} placeholder="Nama Ketua STIKes" />
                  </td>
                </tr>
                <tr>
                  <td className="font-medium text-gray-700 text-sm">NIDN</td>
                  <td>
                    <input type="text" value={data.nidn_ketua_stikes} onChange={e => update('nidn_ketua_stikes', e.target.value)} placeholder="NIDN Ketua STIKes" />
                  </td>
                </tr>
              </tbody>
            </table>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-gray-700 mb-2">Wakil Ketua I Bidang Akademik</legend>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="w-40 font-medium text-gray-700 text-sm">Nama</td>
                  <td>
                    <input type="text" value={data.wakil_ketua_i} onChange={e => update('wakil_ketua_i', e.target.value)} placeholder="Nama Wakil Ketua I" />
                  </td>
                </tr>
                <tr>
                  <td className="font-medium text-gray-700 text-sm">NIDN</td>
                  <td>
                    <input type="text" value={data.nidn_wakil_ketua_i} onChange={e => update('nidn_wakil_ketua_i', e.target.value)} placeholder="NIDN Wakil Ketua I" />
                  </td>
                </tr>
              </tbody>
            </table>
          </fieldset>
        </div>
        <div className="dialog-footer">
          <button className="btn" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave}>Simpan</button>
        </div>
      </div>
    </div>
  )
}
