import { useState, useEffect, useRef, useCallback } from 'react'

import { Editor } from './components/Editor'
import { StartScreen } from './components/StartScreen'
import { AISettingsDialog } from './components/AISettingsDialog'
import { ImportDialog } from './components/ImportDialog'
import { GuidePage, guideSections } from './components/GuidePage'
import { PreviewPage } from './components/PreviewPage'
import { exportDocx, exportPdf } from './services/export'
import { logger } from './utils/logger'

export interface Project {
  filePath: string | null
  content: Record<string, string>
}

const defaultContent: Record<string, string> = {
  // Identitas
  prodi: '',
  mata_kuliah: '',
  kode_mk: '',
  rumpun_mk: '',
  sks_t: '',
  sks_p: '',
  semester: '',
  dosen_pengampu: '',
  pengembang_rps: '',
  nidn_pengembang: '',
  kaprodi: '',
  nidn_kaprodi: '',
  ketua_stikes: '',
  nidn_ketua_stikes: '',
  wakil_ketua_i: '',
  nidn_wakil_ketua_i: '',
  semester_akademik: '',
  tgl_penyusunan: '',
  // Otorisasi
  koordinator_rmk: '',
  // CPL, CPMK, Sub-CPMK (structured list: JSON string of {label, deskripsi}[])
  cpl: JSON.stringify([
    { label: 'CPL-1', deskripsi: '' },
    { label: 'CPL-2', deskripsi: '' },
    { label: 'CPL-3', deskripsi: '' },
    { label: 'CPL-4', deskripsi: '' },
  ]),
  cpmk: JSON.stringify([
    { label: 'CPMK-1', deskripsi: '' },
    { label: 'CPMK-2', deskripsi: '' },
    { label: 'CPMK-3', deskripsi: '' },
    { label: 'CPMK-4', deskripsi: '' },
  ]),
  sub_cpmk: JSON.stringify([
    { label: 'Sub-CPMK1', cpmk: 'CPMK-1', deskripsi: '' },
    { label: 'Sub-CPMK2', cpmk: 'CPMK-2', deskripsi: '' },
    { label: 'Sub-CPMK3', cpmk: 'CPMK-3', deskripsi: '' },
    { label: 'Sub-CPMK4', cpmk: 'CPMK-4', deskripsi: '' },
  ]),
  // Deskripsi
  deskripsi_mk: '',
  // Bahan Kajian (structured list: JSON string of {label, judul, deskripsi}[])
  bahan_kajian: JSON.stringify([
    { label: '1', judul: '', deskripsi: '' },
    { label: '2', judul: '', deskripsi: '' },
    { label: '3', judul: '', deskripsi: '' },
    { label: '4', judul: '', deskripsi: '' },
  ]),
  // Penilaian
  penilaian: JSON.stringify([
    { item: 'Kehadiran', bobot: 10 },
    { item: 'Partisipasi', bobot: 5 },
    { item: 'Tugas', bobot: 15 },
    { item: 'UTS', bobot: 30 },
    { item: 'UAS', bobot: 40 },
  ]),
  // Pustaka
  pustaka_utama: '',
  pustaka_pendukung: '',
  // Dosen & Prasyarat
  matakuliah_syarat: '',
  // Tabel Pertemuan
  pertemuan: '[]',
}

function App() {
  const [project, setProject] = useState<Project | null>(null)
  const [showStart, setShowStart] = useState(true)
  const [recentFiles, setRecentFiles] = useState<Array<{ path: string; name: string; openedAt: string }>>([])
  const [showAISettings, setShowAISettings] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [activeGuide, setActiveGuide] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [autoSaveActive, setAutoSaveActive] = useState(false)
  const [lastAutoSaveAt, setLastAutoSaveAt] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'warning' | 'error' } | null>(null)
  const projectRef = useRef(project)
  const lastSavedContentRef = useRef<string>('')

  const showToast = (message: string, type: 'info' | 'warning' | 'error' = 'warning') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Keep a ref of the latest project so the auto-save interval always sees fresh data.
  useEffect(() => {
    projectRef.current = project
  }, [project])

  const handleNewProject = (content?: Record<string, string>) => {
    logger.info('APP', 'project.new', { withContent: !!content })
    lastSavedContentRef.current = ''
    setAutoSaveActive(false)
    setLastAutoSaveAt(null)
    // Always start from the full default schema so every section/field exists
    // even when the caller only provides a partial object (e.g. just `prodi`).
    setProject({ filePath: null, content: { ...defaultContent, ...(content || {}) } })
    setShowStart(false)
  }

  const handleOpenProject = async () => {
    logger.info('APP', 'project.open_dialog')
    const result = await window.electronAPI.openFile()
    if (result) {
      logger.info('APP', 'project.loaded', { filePath: result.filePath })
      lastSavedContentRef.current = JSON.stringify(result.data)
      setProject({ filePath: result.filePath, content: result.data })
      setAutoSaveActive(true)
      setShowStart(false)
      window.electronAPI.addRecent(result.filePath)
      loadRecentFiles()
    } else {
      logger.debug('APP', 'project.open_canceled')
    }
  }

  const handleSaveProject = async () => {
    if (!project) return
    // Save exists already in memory (opened project) → write straight back to it,
    // exactly like MS Word does when you Ctrl+S a .docx you opened.
    if (projectRef.current?.filePath) {
      logger.info('APP', 'project.save', { filePath: projectRef.current.filePath, via: 'existing-path' })
      const ok = await handleSilentSave()
      if (ok) {
        setLastAutoSaveAt(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
        window.electronAPI.addRecent(projectRef.current.filePath)
        loadRecentFiles()
        showToast('Proyek berhasil disimpan.', 'info')
      } else {
        showToast('Gagal menyimpan ke file. Gunakan “Simpan Sebagai” untuk memilih lokasi lain.', 'error')
      }
      return
    }

    // No file path yet (new project) → ask where to save (Save As dialog).
    logger.info('APP', 'project.save', { filePath: 'new' })
    const data = {
      defaultName: project.content.mata_kuliah
        ? `RPS_${project.content.mata_kuliah.replace(/\s+/g, '_')}.rps`
        : 'untitled.rps',
      content: project.content,
    }
    const savedPath = await window.electronAPI.saveFile(data)
    if (savedPath) {
      logger.info('APP', 'project.saved', { filePath: savedPath })
      lastSavedContentRef.current = JSON.stringify(project.content)
      setProject({ ...project, filePath: savedPath })
      setAutoSaveActive(true)
      setLastAutoSaveAt(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      window.electronAPI.addRecent(savedPath)
      loadRecentFiles()
      showToast('Proyek berhasil disimpan.', 'info')
    } else {
      logger.debug('APP', 'project.save_canceled')
    }
  }

  const handleSaveAs = async () => {
    if (!project) return
    logger.info('APP', 'project.save_as')
    const data = {
      defaultName: project.content.mata_kuliah
        ? `RPS_${project.content.mata_kuliah.replace(/\s+/g, '_')}.rps`
        : 'untitled.rps',
      content: project.content,
    }
    const savedPath = await window.electronAPI.saveFileAs(data)
    if (savedPath) {
      logger.info('APP', 'project.saved', { filePath: savedPath })
      lastSavedContentRef.current = JSON.stringify(project.content)
      setProject({ ...project, filePath: savedPath })
      setAutoSaveActive(true)
      setLastAutoSaveAt(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      window.electronAPI.addRecent(savedPath)
      loadRecentFiles()
      showToast('Proyek berhasil disimpan sebagai file baru.', 'info')
    } else {
      logger.debug('APP', 'project.save_as_canceled')
    }
  }

  const handleSilentSave = useCallback(async () => {
    const p = projectRef.current
    if (!p || !p.filePath) return false
    const json = JSON.stringify(p.content)
    if (json === lastSavedContentRef.current) return true
    const ok = await window.electronAPI.saveProjectSilent(p.filePath, p.content)
    if (ok) {
      lastSavedContentRef.current = json
      setLastAutoSaveAt(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      logger.debug('APP', 'project.auto_saved', { filePath: p.filePath })
    }
    return ok
  }, [])

  const handleExport = async (format: 'pdf' | 'docx' = 'pdf') => {
    if (!project) return
    logger.info('APP', 'project.export', { format })
    const ext = format === 'pdf' ? 'pdf' : 'docx'
    const mk = project.content.mata_kuliah || ''
    const sem = project.content.semester || ''
    const ta = project.content.semester_akademik || ''
    const parts = [mk, sem, ta].filter(Boolean).join('_').replace(/\s+/g, '_')
    const name = parts ? `RPS_${parts}.${ext}` : `export.${ext}`
    const result = await window.electronAPI.exportFile({ format, defaultName: name })
    if (result) {
      try {
        if (format === 'docx') {
          await exportDocx({ content: project.content }, result.filePath)
        } else {
          await exportPdf({ content: project.content }, result.filePath)
        }
        logger.info('APP', 'project.export_complete', { format, filePath: result.filePath })
        showToast(`Berhasil diekspor ke ${format.toUpperCase()}.`, 'info')
      } catch (err) {
        logger.error('APP', 'project.export_error', { format, error: (err as Error).message })
        showToast('Gagal export: ' + (err as Error).message, 'error')
      }
    } else {
      logger.debug('APP', 'project.export_canceled', { format })
    }
  }

  const handleOpenRecent = async (filePath: string) => {
    logger.info('APP', 'project.open_recent', { filePath })
    const result = await window.electronAPI.openProject(filePath)
    if (result) {
      logger.info('APP', 'project.loaded', { filePath: result.filePath })
      lastSavedContentRef.current = JSON.stringify(result.data)
      setProject({ filePath: result.filePath, content: result.data })
      setAutoSaveActive(true)
      setShowStart(false)
      loadRecentFiles()
    } else {
      logger.error('APP', 'project.open_error', { filePath })
    }
  }

  const loadRecentFiles = async () => {
    const recent = await window.electronAPI.getRecent()
    setRecentFiles(recent || [])
    logger.debug('APP', 'recent_files.loaded', { count: recent?.length || 0 })
  }

  // Keep latest handler references so the one-time listener effect below never uses stale closures.
  const handlersRef = useRef({ handleNewProject, handleSaveProject, handleSaveAs, handleOpenProject, handleExport })
  handlersRef.current = { handleNewProject, handleSaveProject, handleSaveAs, handleOpenProject, handleExport }

  // Keep latest dialog state so the Esc key handler (registered once) never goes stale.
  const uiRef = useRef({ showImport, showAISettings, activeGuide, showPreview })
  uiRef.current = { showImport, showAISettings, activeGuide, showPreview }

  useEffect(() => {
    loadRecentFiles()

    // Menu-accelerator events (app-scoped, sent from the hidden application menu).
    const unsubNew = window.electronAPI.onMenuNew(() => handlersRef.current.handleNewProject())
    const unsubOpen = window.electronAPI.onMenuOpen(() => void handlersRef.current.handleOpenProject())
    const unsubSave = window.electronAPI.onMenuSave(() => handlersRef.current.handleSaveProject())
    const unsubSaveAs = window.electronAPI.onMenuSaveAs(() => handlersRef.current.handleSaveAs())
    const unsubExport = window.electronAPI.onMenuExport((format) => handlersRef.current.handleExport((format as 'pdf' | 'docx') || 'pdf'))
    const unsubImport = window.electronAPI.onMenuImport(() => setShowImport(true))
    const unsubAI = window.electronAPI.onOpenAISettings(() => setShowAISettings(true))

    // Esc closes whichever view/dialog is on top (preview, guide, import, then AI settings).
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const ui = uiRef.current
      if (ui.showPreview) setShowPreview(false)
      else if (ui.activeGuide) setActiveGuide(null)
      else if (ui.showImport) setShowImport(false)
      else if (ui.showAISettings) setShowAISettings(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      unsubNew()
      unsubOpen()
      unsubSave()
      unsubSaveAs()
      unsubExport()
      unsubImport()
      unsubAI()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Auto-save: only active once the project has a real file path (saved manually first).
  // Flushes on a timer AND whenever the window loses focus / becomes hidden so the
  // latest edits are persisted even if the app is closed right after typing.
  useEffect(() => {
    if (!autoSaveActive) return
    logger.info('APP', 'project.auto_save_enabled')
    const interval = window.setInterval(() => {
      void handleSilentSave()
    }, 8_000)
    const flush = () => {
      void handleSilentSave()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('blur', flush)
    document.addEventListener('visibilitychange', onVisibility)
    // Flush once immediately after activation (covers changes made right before enabling)
    void handleSilentSave()
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('blur', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [autoSaveActive, handleSilentSave])

  if (showStart) {
    return (
      <StartScreen
        onNew={handleNewProject}
        onOpen={handleOpenProject}
        recentFiles={recentFiles}
        onOpenRecent={handleOpenRecent}
        onClearRecent={async () => {
          await window.electronAPI.clearRecent()
          loadRecentFiles()
        }}
      />
    )
  }

  // Full-page document preview (View ribbon → Preview) — same HTML as the PDF export.
  if (showPreview && project) {
    return (
      <PreviewPage
        content={project.content}
        onBack={() => setShowPreview(false)}
        onExportWord={() => void handleExport('docx')}
        onExportPdf={() => void handleExport('pdf')}
      />
    )
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {activeGuide && guideSections.includes(activeGuide) ? (
        <GuidePage section={activeGuide} onBack={() => setActiveGuide(null)} />
      ) : (
        <Editor
          project={project!}
          onUpdate={(content) => setProject({ ...project!, content })}
          onSave={handleSaveProject}
          onExport={handleExport}
          onOpenAISettings={() => setShowAISettings(true)}
          onGoHome={() => {
            logger.info('APP', 'navigate_home')
            setShowStart(true)
          }}
          onOpenGuide={(section) => setActiveGuide(section)}
          onPreview={() => {
            logger.info('APP', 'open_preview')
            setShowPreview(true)
          }}
          autoSaveActive={autoSaveActive}
          lastAutoSaveAt={lastAutoSaveAt}
          showToast={showToast}
        />
      )}
      <AISettingsDialog open={showAISettings} onClose={() => setShowAISettings(false)} />
      <ImportDialog open={showImport} onClose={() => setShowImport(false)} onImport={(data) => {
        logger.info('APP', 'project.import_data', { fields: Object.keys(data) })
        if (project) {
          setProject({ ...project, content: { ...project.content, ...data } })
        }
        setShowStart(false)
        showToast('Data kurikulum berhasil diimpor.', 'info')
      }} />

      {/* Toast notification */}
      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          <span className="toast-icon">
            {toast.type === 'info' && '✓'}
            {toast.type === 'warning' && '⚠'}
            {toast.type === 'error' && '✕'}
          </span>
          <span className="toast-message">{toast.message}</span>
        </div>
      )}
    </div>
  )
}

export default App
