import { useState, useEffect, useRef } from 'react'
import { BackIcon, PlusIcon, TrashIcon, SaveIcon, FileIcon, XIcon, PreviewIcon } from './icons'

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
  const [confirmActivate, setConfirmActivate] = useState<string | null>(null) // group id to activate
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null)
  const [groupNameInput, setGroupNameInput] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [showNewGroupInput, setShowNewGroupInput] = useState(false)
  const [viewingDoc, setViewingDoc] = useState<MasterBerkasDocument | null>(null)
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<string | null>(null)
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<string | null>(null)
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
    const newData = {
      ...data,
      groups: data.groups.filter(g => g.id !== groupId),
      activeGroupId: data.activeGroupId === groupId ? null : data.activeGroupId,
    }
    await saveData(newData)
    if (selectedGroupId === groupId) {
      setSelectedGroupId(newData.groups[0]?.id || null)
    }
    setConfirmDeleteGroup(null)
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
    const newData = {
      ...data,
      groups: data.groups.map(g =>
        g.id === selectedGroupId
          ? { ...g, documents: g.documents.filter(d => d.id !== docId) }
          : g
      ),
    }
    await saveData(newData)
    setConfirmDeleteDoc(null)
  }

  if (loading) {    return (
      <div className="mk-page">
        <div className="flex items-center justify-center flex-1">
          <div className="text-gray-400 text-sm">Memuat master berkas...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="mk-page">
      {/* Header */}
      <div className="mk-header">
        <button onClick={onBack} className="mk-back-btn">
          <BackIcon size={16} />
          Kembali
        </button>
        <div style={{ width: 1, height: 20, background: '#e0e0e0' }} />
        <h1 className="mk-header-title">Master Berkas</h1>
        <span className="mk-header-sub">Dokumen referensi untuk AI</span>
      </div>

      <div className="mk-body">
        {/* Sidebar: Groups */}
        <div className="mk-sidebar">
          <div className="mk-sidebar-header">
            <span className="mk-sidebar-label">Kelompok</span>
          </div>
          <div className="mk-sidebar-list">
            {data.groups.map(group => (
              <div
                key={group.id}
                className={`mk-group-item ${selectedGroupId === group.id ? 'active' : ''}`}
                onClick={() => setSelectedGroupId(group.id)}
              >
                {editingGroupName === group.id ? (
                  <input
                    autoFocus
                    style={{ flex: 1, padding: '4px 8px', fontSize: 13, border: '1px solid #90caf9', borderRadius: 4 }}
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
                    style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      setEditingGroupName(group.id)
                      setGroupNameInput(group.name)
                    }}
                  >
                    {group.name}
                  </span>
                )}
                <span className="mk-group-count">{group.documents.length}</span>
                {data.activeGroupId === group.id && (
                  <span className="mk-group-check" title="Aktif untuk AI">✓</span>
                )}
                <button
                  className="mk-doc-card-delete"
                  style={{ padding: 2 }}
                  onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id) }}
                  title="Hapus kelompok"
                >
                  <TrashIcon size={12} />
                </button>
              </div>
            ))}
            {data.groups.length === 0 && (
              <div style={{ padding: '20px 12px', textAlign: 'center', color: '#bdbdbd', fontSize: 12 }}>
                Belum ada kelompok
              </div>
            )}
          </div>
          <div className="mk-sidebar-footer">
            {showNewGroupInput ? (
              <div className="mk-new-group-input">
                <input
                  autoFocus
                  placeholder="Nama kelompok..."
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddGroup()
                    if (e.key === 'Escape') { setShowNewGroupInput(false); setNewGroupName('') }
                  }}
                />
                <button onClick={handleAddGroup}>
                  <SaveIcon size={14} />
                </button>
              </div>
            ) : (
              <button className="mk-add-group-btn" onClick={() => setShowNewGroupInput(true)}>
                <PlusIcon size={16} />
                Tambah Kelompok
              </button>
            )}
          </div>
        </div>

        {/* Main content: Documents */}
        <div className="mk-content">
          {selectedGroup ? (
            <>
              {/* Group header */}
              <div className="mk-content-header">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="mk-content-title">{selectedGroup.name}</span>
                  <span className="mk-content-count">
                    {selectedGroup.documents.length}/{MAX_DOCS_PER_GROUP} dokumen
                  </span>
                </div>
                <div className="mk-toggle-group">
                  <span className="mk-toggle-label">Gunakan untuk AI</span>
                  <button
                    className={`mk-toggle ${data.activeGroupId === selectedGroup.id ? 'active' : ''}`}
                    onClick={() => {
                      if (data.activeGroupId === selectedGroup.id) {
                        // Deactivate directly
                        handleSetActiveGroup(null)
                      } else {
                        // Show confirmation before activating
                        setConfirmActivate(selectedGroup.id)
                      }
                    }}
                  >
                    <span className="mk-toggle-thumb" />
                  </button>
                </div>
              </div>

              {/* Documents grid */}
              <div className="mk-docs-grid">
                <div className="mk-docs-grid-inner">
                  {selectedGroup.documents.map(doc => (
                    <div key={doc.id} className="mk-doc-card">
                      <div className="mk-doc-card-header">
                        <div className="mk-doc-card-type">
                          <FileIcon size={14} />
                          {getFileTypeLabel(doc.fileType)}
                        </div>
                        <button
                          className="mk-doc-card-view"
                          onClick={() => setViewingDoc(doc)}
                          title="Lihat konten ekstraksi"
                        >
                          <PreviewIcon size={14} />
                        </button>
                        <button
                          className="mk-doc-card-delete"
                          onClick={() => setConfirmDeleteDoc(doc.id)}
                          title="Hapus dokumen"
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                      <div className="mk-doc-card-name" title={doc.name}>
                        {doc.name}
                      </div>
                      <div className="mk-doc-card-original" title={doc.originalName}>
                        {doc.originalName}
                      </div>
                      <div className="mk-doc-card-meta">
                        <span>{doc.extractedText.length.toLocaleString('id-ID')} karakter</span>
                        <span>{new Date(doc.uploadedAt).toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                  ))}

                  {/* Upload card */}
                  {selectedGroup.documents.length < MAX_DOCS_PER_GROUP && (
                    <button
                      className="mk-upload-card"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <PlusIcon size={28} />
                      <span className="mk-upload-card-text">
                        {uploading ? 'Mengupload...' : 'Tambah Dokumen'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="mk-empty">
              <div className="mk-empty-inner">
                <FileIcon size={48} />
                <p>Buat kelompok baru untuk mulai<br />menambahkan dokumen referensi.</p>
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
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Pending file dialog */}
      {pendingFile && (
        <div className="mk-dialog-overlay">
          <div className="mk-dialog">
            <div className="mk-dialog-title">
              <span>Upload Dokumen</span>
              <button className="mk-dialog-close" onClick={() => setPendingFile(null)}>
                <XIcon size={18} />
              </button>
            </div>
            <div className="mk-dialog-file-info">
              File: <span>{pendingFile.file.name}</span>
            </div>
            <div className="mk-dialog-input-group">
              <label>Nama Dokumen</label>
              <input
                autoFocus
                value={pendingFile.name}
                onChange={e => setPendingFile({ ...pendingFile, name: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveDocument() }}
              />
            </div>
            <div className="mk-dialog-actions">
              <button className="mk-dialog-cancel" onClick={() => setPendingFile(null)}>
                Batal
              </button>
              <button
                className="mk-dialog-confirm"
                onClick={handleSaveDocument}
                disabled={uploading || !pendingFile.name.trim()}
              >
                {uploading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Activate Dialog */}
      {confirmActivate && (() => {
        const group = data.groups.find(g => g.id === confirmActivate)
        return (
          <div className="mk-dialog-overlay">
            <div className="mk-dialog">
              <div className="mk-dialog-title">
                <span>Aktifkan Master Berkas</span>
                <button className="mk-dialog-close" onClick={() => setConfirmActivate(null)}>
                  <XIcon size={18} />
                </button>
              </div>
              <div style={{ fontSize: 13, color: '#616161', lineHeight: 1.6, marginBottom: 20 }}>
                <p>Gunakan kelompok <strong>{group?.name}</strong> sebagai konteks AI?</p>
                <p style={{ marginTop: 8, color: '#9e9e9e', fontSize: 12 }}>
                  Semua dokumen di kelompok ini ({group?.documents.length || 0} dokumen) akan dikirim ke AI saat generate konten RPS.
                </p>
              </div>
              <div className="mk-dialog-actions">
                <button className="mk-dialog-cancel" onClick={() => setConfirmActivate(null)}>
                  Batal
                </button>
                <button
                  className="mk-dialog-confirm"
                  onClick={() => {
                    handleSetActiveGroup(confirmActivate)
                    setConfirmActivate(null)
                  }}
                >
                  Aktifkan
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Confirm Delete Group Dialog */}
      {confirmDeleteGroup && (() => {
        const group = data.groups.find(g => g.id === confirmDeleteGroup)
        const isActive = data.activeGroupId === confirmDeleteGroup
        return (
          <div className="mk-dialog-overlay">
            <div className="mk-dialog">
              <div className="mk-dialog-title">
                <span>Hapus Kelompok</span>
                <button className="mk-dialog-close" onClick={() => setConfirmDeleteGroup(null)}>
                  <XIcon size={18} />
                </button>
              </div>
              <div style={{ fontSize: 13, color: '#616161', lineHeight: 1.6, marginBottom: 20 }}>
                <p>Hapus kelompok <strong>{group?.name}</strong>?</p>
                {isActive && (
                  <p style={{ marginTop: 8, color: '#f44336', fontSize: 12 }}>
                    Kelompok ini sedang aktif untuk AI. Menghapusnya akan menonaktifkan konteks AI.
                  </p>
                )}
                <p style={{ marginTop: 8, color: '#9e9e9e', fontSize: 12 }}>
                  Semua dokumen di kelompok ini ({group?.documents.length || 0} dokumen) akan dihapus permanen.
                </p>
              </div>
              <div className="mk-dialog-actions">
                <button className="mk-dialog-cancel" onClick={() => setConfirmDeleteGroup(null)}>
                  Batal
                </button>
                <button
                  className="mk-dialog-confirm mk-dialog-danger"
                  onClick={() => handleDeleteGroup(confirmDeleteGroup)}
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Confirm Delete Document Dialog */}
      {confirmDeleteDoc && (() => {
        const doc = selectedGroup?.documents.find(d => d.id === confirmDeleteDoc)
        return (
          <div className="mk-dialog-overlay">
            <div className="mk-dialog">
              <div className="mk-dialog-title">
                <span>Hapus Dokumen</span>
                <button className="mk-dialog-close" onClick={() => setConfirmDeleteDoc(null)}>
                  <XIcon size={18} />
                </button>
              </div>
              <div style={{ fontSize: 13, color: '#616161', lineHeight: 1.6, marginBottom: 20 }}>
                <p>Hapus dokumen <strong>{doc?.name}</strong>?</p>
                <p style={{ marginTop: 8, color: '#9e9e9e', fontSize: 12 }}>
                  Data ekstraksi akan dihapus permanen dari kelompok ini.
                </p>
              </div>
              <div className="mk-dialog-actions">
                <button className="mk-dialog-cancel" onClick={() => setConfirmDeleteDoc(null)}>
                  Batal
                </button>
                <button
                  className="mk-dialog-confirm mk-dialog-danger"
                  onClick={() => handleDeleteDocument(confirmDeleteDoc)}
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Document Content Viewer */}
      {viewingDoc && (
        <div className="mk-doc-view">
          <div className="mk-doc-view-header">
            <button className="mk-doc-view-back" onClick={() => setViewingDoc(null)}>
              <BackIcon size={18} />
              <span>Kembali</span>
            </button>
            <div className="mk-doc-view-title">
              <FileIcon size={16} />
              <span>{viewingDoc.name}</span>
            </div>
            <div className="mk-doc-view-meta">
              {getFileTypeLabel(viewingDoc.fileType)} &bull; {viewingDoc.extractedText.length.toLocaleString('id-ID')} karakter
            </div>
          </div>
          <div className="mk-doc-view-content">
            <pre>{viewingDoc.extractedText}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
