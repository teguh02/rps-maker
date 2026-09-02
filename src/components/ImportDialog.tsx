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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-bold">📚 Import Kurikulum</h2>
          <p className="text-sm text-gray-500 mt-1">
            Import data kurikulum dari file CSV/Excel
          </p>
        </div>

        <div className="px-6 py-4">
          {step === 'upload' && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
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
              <p className="text-xs text-gray-400 mt-3">
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
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      {headers.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left border-b">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawData.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b">
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rawData.length > 5 && (
                <p className="text-xs text-gray-400 mt-2">...dan {rawData.length - 5} baris lainnya</p>
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

        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Batal
          </button>
          {step === 'mapping' && (
            <button
              onClick={handleImport}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              Import
            </button>
          )}
        </div>
      </div>
    </div>
  )
}