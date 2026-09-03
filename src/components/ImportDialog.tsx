import { useState } from 'react'

interface ImportDialogProps {
  open: boolean
  onClose: () => void
  onImport: (data: Record<string, string>) => void
}

export function ImportDialog({ open, onClose, onImport }: ImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'done'>('upload')
  const [rawData, setRawData] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      const lines = text.split('\n').filter(l => l.trim())
      const rows = lines.map(line => {
        // Simple CSV parser
        return line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
      })
      if (rows.length > 0) {
        setHeaders(rows[0])
        setRawData(rows.slice(1))
        setStep('mapping')
      }
    }
    reader.readAsText(file)
  }

  const handleImport = () => {
    // Map first row of data to RPS fields
    if (rawData.length > 0) {
      const row = rawData[0]
      const mapped: Record<string, string> = {
        prodi: row[0] || '',
        mata_kuliah: row[1] || '',
        kode_mk: row[2] || '',
        sks: row[3] || '',
        semester: row[4] || '',
        dosen: row[5] || '',
        semester_akademik: '',
        cpl: row[6] || '',
        cpmk: row[7] || '',
        sub_cpmk: '',
        bahan_kajian: '',
        metode: '',
        pengalaman_belajar: '',
        asesmen: '',
        referensi: '',
      }
      onImport(mapped)
    }
    setStep('done')
    setTimeout(onClose, 500)
  }

  if (!open) return null

  return (
    <div className="dialog-backdrop">
      <div className="dialog-panel max-w-lg">
        <div className="dialog-header">
          <h2 className="text-lg font-bold">📚 Import Kurikulum</h2>
          <p className="text-sm text-gray-500 mt-1">
            Import data kurikulum dari file CSV/Excel
          </p>
        </div>

        <div className="dialog-body">
          {step === 'upload' && (
            <div className="upload-zone">
              <div className="text-4xl mb-4">📄</div>
              <p className="text-gray-600 mb-4">
                Pilih file CSV atau Excel yang berisi data kurikulum
              </p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="form-hint mt-3">
                Format kolom: Prodi, Mata Kuliah, Kode MK, SKS, Semester, Dosen, CPL, CPMK
              </p>
            </div>
          )}

          {step === 'mapping' && (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Preview data yang akan diimport ({rawData.length} baris):
              </p>
              <div className="max-h-64 overflow-auto border rounded">
                <table className="preview-table">
                  <thead>
                    <tr>
                      {headers.map((h, i) => (
                        <th key={i}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawData.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rawData.length > 5 && (
                <p className="form-hint mt-2">...dan {rawData.length - 5} baris lainnya</p>
              )}
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✅</div>
              <p className="text-gray-600">Berhasil diimport!</p>
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Batal
          </button>
          {step === 'mapping' && (
            <button onClick={handleImport} className="btn btn-primary">
              Import
            </button>
          )}
        </div>
      </div>
    </div>
  )
}