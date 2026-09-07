import { useState, useEffect, useRef } from 'react'
import { BackIcon, PlusIcon, TrashIcon, SaveIcon, FileIcon, XIcon } from './icons'

interface MasterBerkasDocument {
  id: string
  name: string
  originalName: string
  fileType: 'pdf' | 'docx' | 'xlsx' | 'csv'
  extractedText: string
  uploadedAt: string
}

interface MasterBerkasGroup {
  id: string
  name: string
  documents: MasterBerkasDocument[]
}

interface MasterBerkasData {
  groups: MasterBerkasGroup[]
  activeGroupId: string | null
}

interface MasterBerkasPageProps {
  onBack: () => void
}

const MAX_DOCS_PER_GROUP = 6
const ACCEPTED_TYPES = '.pdf,.docx,.xlsx,.csv'
const ACTIVE_GROUP_KEY = 'rps-master-berkas-active-group'

function generateId(): string {
  return crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function getFileType(fileName: string): 'pdf' | 'docx' | 'xlsx' | 'csv' {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  if (ext === 'pdf') return 'pdf'
  if (ext === 'docx') return 'docx'
  if (ext === 'xlsx') return 'xlsx'
  if (ext === 'csv') return 'csv'
  return 'pdf'
}

function getFileTypeLabel(type: string): string {
  const labels: Record<string, string> = { pdf: 'PDF', docx: 'Word', xlsx: 'Excel', csv: 'CSV' }
  return labels[type] || type.toUpperCase()
}

export function MasterBerkasPage({ onBack }: MasterBerkasPageProps) {
  const [data, setData] = useState<MasterBerkasData>({ groups: [], activeGroupId: null })
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [pendingFile, setPendingFile] = useState<{ file: File; name: string } | null>(null)
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null)
  const [groupNameInput, setGroupNameInput] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [showNewGroupInput, setShowNewGroupInput] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const result = await window.electronAPI.masterBerkasLoad()
      const d = result || { groups: [], activeGroupId: null }
      setData(d)
      if (d.groups?.length && !selectedGroupId) {
        setSelectedGroupId(d.activeGroupId || d.groups[0].id)
      }
      // Sync active group to localStorage for AI service
      syncActiveGroupToLocalStorage(d)
    } catch (err) {
      console.error('Failed to load master berkas:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveData = async (newData: MasterBerkasData) => {
    setData(newData)
    await window.electronAPI.masterBerkasSave(newData)
    // Sync active group data to localStorage for AI service access
    syncActiveGroupToLocalStorage(newData)
  }

  const syncActiveGroupToLocalStorage = (d: MasterBerkasData) => {
    if (d.activeGroupId) {
      localStorage.setItem(ACTIVE_GROUP_KEY, d.activeGroupId)
      const group = d.groups.find(g => g.id === d.activeGroupId)
      if (group) {
        localStorage.setItem('rps-master-berkas-data', JSON.stringify({
          groups: [{ id: group.id, name: group.name, documents: group.documents.map(doc => ({
            id: doc.id, name: doc.name, extractedText: doc.extractedText
          })) }]
        }))
      }
    } else {
      localStorage.removeItem(ACTIVE_GROUP_KEY)
      localStorage.removeItem('rps-master-berkas-data')
    }
  }

  const selectedGroup = data.groups.find(g => g.id === selectedGroupId)

  const handleAddGroup = async () => {
    const name = newGroupName.trim()
    if (!name) return
    const group: MasterBerkasGroup = { id: generateId(), name, documents: [] }
    const newData = { ...data, groups: [...data.groups, group] }
    await saveData(newData)
    setSelectedGroupId(group.id)
    setNewGroupName('')
    setShowNewGroupInput(false)
  }

  const handleRenameGroup = async (groupId: string) => {
    const name = groupNameInput.trim()
    if (!name) return
    const newData = {
      ...data,
      groups: data.groups.map(g => g.id === groupId ? { ...g, name } : g),
    }
    await saveData(newData)
    setEditingGroupName(null)
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Hapus kelompok ini beserta semua dokumennya?')) return
    const newData = {
      ...data,
      groups: data.groups.filter(g => g.id !== groupId),
      activeGroupId: data.activeGroupId === groupId ? null : data.activeGroupId,
    }
    await saveData(newData)
    if (selectedGroupId === groupId) {
      setSelectedGroupId(newData.groups[0]?.id || null)
    }
  }

  const handleSetActiveGroup = async (groupId: string | null) => {
    const newData = { ...data, activeGroupId: groupId }
    await saveData(newData)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!['.pdf', '.docx', '.xlsx', '.csv'].includes(ext)) {
      alert('Format file tidak didukung. Gunakan PDF, Word, Excel, atau CSV.')
      return
    }
    setPendingFile({ file, name: file.name.replace(/\.[^.]+$/, '') })
    e.target.value = ''
  }

  const handleSaveDocument = async () => {
    if (!pendingFile || !selectedGroupId) return
    setUploading(true)
    try {
      const buffer = await pendingFile.file.arrayBuffer()
      const result = await window.electronAPI.masterBerkasExtract({
        buffer: Array.from(new Uint8Array(buffer)),
        fileName: pendingFile.file.name,
      })
      if (!result.ok) {
        alert('Gagal mengekstrak file: ' + result.error)
        return
      }
      const doc: MasterBerkasDocument = {
        id: generateId(),
        name: pendingFile.name.trim() || pendingFile.file.name,
        originalName: pendingFile.file.name,
        fileType: getFileType(pendingFile.file.name),
        extractedText: result.extractedText || '',
        uploadedAt: new Date().toISOString(),
      }
      const newData = {
        ...data,
        groups: data.groups.map(g =>
          g.id === selectedGroupId
            ? { ...g, documents: [...g.documents, doc] }
            : g
        ),
      }
      await saveData(newData)
      setPendingFile(null)
    } catch (err) {
      alert('Gagal upload: ' + (err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDocument = async (docId: string) => {
    if (!selectedGroupId) return
    if (!confirm('Hapus dokumen ini?')) return
    const newData = {
      ...data,
      groups: data.groups.map(g =>
        g.id === selectedGroupId
          ? { ...g, documents: g.documents.filter(d => d.id !== docId) }
          : g
      ),
    }
    await saveData(newData)
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Memuat master berkas...</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <BackIcon size={18} />
          Kembali ke Editor
        </button>
        <div className="h-5 w-px bg-gray-300" />
        <h1 className="text-lg font-bold text-gray-800">📁 Master Berkas</h1>
        <span className="text-xs text-gray-400 ml-2">Dokumen referensi untuk AI</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: Groups */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-3 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kelompok</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {data.groups.map(group => (
              <div
                key={group.id}
                className={`group-item px-3 py-2 rounded-lg cursor-pointer text-sm flex items-center gap-2 transition-colors ${
                  selectedGroupId === group.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setSelectedGroupId(group.id)}
              >
                {editingGroupName === group.id ? (
                  <input
                    autoFocus
                    className="flex-1 px-1 py-0.5 text-sm border border-blue-300 rounded"
                    value={groupNameInput}
                    onChange={e => setGroupNameInput(e.target.value)}
                    onBlur={() => handleRenameGroup(group.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRenameGroup(group.id)
                      if (e.key === 'Escape') setEditingGroupName(null)
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="flex-1 truncate"
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      setEditingGroupName(group.id)
                      setGroupNameInput(group.name)
                    }}
                  >
                    {group.name}
                  </span>
                )}
                <span className="text-xs text-gray-400">{group.documents.length}</span>
                {data.activeGroupId === group.id && (
                  <span className="text-xs text-green-500" title="Aktif untuk AI">✓</span>
                )}
                <button
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id) }}
                  title="Hapus kelompok"
                >
                  <TrashIcon size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-gray-100">
            {showNewGroupInput ? (
              <div className="flex gap-1">
                <input
                  autoFocus
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded"
                  placeholder="Nama kelompok..."
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddGroup()
                    if (e.key === 'Escape') { setShowNewGroupInput(false); setNewGroupName('') }
                  }}
                />
                <button
                  className="px-2 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  onClick={handleAddGroup}
                >
                  <SaveIcon size={14} />
                </button>
              </div>
            ) : (
              <button
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                onClick={() => setShowNewGroupInput(true)}
              >
                <PlusIcon size={16} />
                Tambah Kelompok
              </button>
            )}
          </div>
        </div>

        {/* Main content: Documents */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedGroup ? (
            <>
              {/* Group header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-semibold text-gray-800">{selectedGroup.name}</h2>
                  <span className="text-xs text-gray-400">
                    {selectedGroup.documents.length}/{MAX_DOCS_PER_GROUP} dokumen
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Gunakan untuk AI:</span>
                    <button
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        data.activeGroupId === selectedGroup.id ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                      onClick={() => handleSetActiveGroup(
                        data.activeGroupId === selectedGroup.id ? null : selectedGroup.id
                      )}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          data.activeGroupId === selectedGroup.id ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </label>
                </div>
              </div>

              {/* Documents grid */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedGroup.documents.map(doc => (
                    <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <FileIcon size={20} className="text-blue-500" />
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            {getFileTypeLabel(doc.fileType)}
                          </span>
                        </div>
                        <button
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          onClick={() => handleDeleteDocument(doc.id)}
                          title="Hapus dokumen"
                        >
                          <TrashIcon size={16} />
                        </button>
                      </div>
                      <div className="font-medium text-sm text-gray-800 truncate" title={doc.name}>
                        {doc.name}
                      </div>
                      <div className="text-xs text-gray-400 truncate" title={doc.originalName}>
                        {doc.originalName}
                      </div>
                      <div className="text-xs text-gray-400">
                        {doc.extractedText.length.toLocaleString('id-ID')} karakter
                      </div>
                      <div className="text-xs text-gray-300 mt-auto">
                        {new Date(doc.uploadedAt).toLocaleDateString('id-ID')}
                      </div>
                    </div>
                  ))}

                  {/* Upload card */}
                  {selectedGroup.documents.length < MAX_DOCS_PER_GROUP && (
                    <button
                      className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors min-h-[140px]"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <PlusIcon size={24} />
                      <span className="text-sm">
                        {uploading ? 'Mengupload...' : 'Tambah Dokumen'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <FileIcon size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">Buat kelompok baru untuk mulai menambahkan dokumen referensi.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Pending file dialog */}
      {pendingFile && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Upload Dokumen</h3>
              <button onClick={() => setPendingFile(null)} className="text-gray-400 hover:text-gray-600">
                <XIcon size={18} />
              </button>
            </div>
            <div className="text-sm text-gray-500">
              File: <span className="font-medium text-gray-700">{pendingFile.file.name}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Dokumen</label>
              <input
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={pendingFile.name}
                onChange={e => setPendingFile({ ...pendingFile, name: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveDocument() }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                onClick={() => setPendingFile(null)}
              >
                Batal
              </button>
              <button
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                onClick={handleSaveDocument}
                disabled={uploading || !pendingFile.name.trim()}
              >
                {uploading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
