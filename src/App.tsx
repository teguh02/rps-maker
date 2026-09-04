import { useState, useEffect } from 'react'

import { Editor } from './components/Editor'
import { StartScreen } from './components/StartScreen'
import { AISettingsDialog } from './components/AISettingsDialog'
import { ImportDialog } from './components/ImportDialog'
import { GuidePage, guideSections } from './components/GuidePage'
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
  const handleNewProject = (content?: Record<string, string>) => {
    logger.info('APP', 'project.new', { withContent: !!content })
    setProject({ filePath: null, content: content || { ...defaultContent } })
    setShowStart(false)
  }

  const handleOpenProject = async () => {
    logger.info('APP', 'project.open_dialog')
    const result = await window.electronAPI.openFile()
    if (result) {
      logger.info('APP', 'project.loaded', { filePath: result.filePath })
      setProject({ filePath: result.filePath, content: result.data })
      setShowStart(false)
      window.electronAPI.addRecent(result.filePath)
      loadRecentFiles()
    } else {
      logger.debug('APP', 'project.open_canceled')
    }
  }

  const handleSaveProject = async () => {
    if (!project) return
    logger.info('APP', 'project.save', { filePath: project.filePath || 'new' })
    const data = {
      defaultName: project.content.mata_kuliah
        ? `RPS_${project.content.mata_kuliah.replace(/\s+/g, '_')}.rps`
        : 'untitled.rps',
      content: project.content,
    }
    const savedPath = await window.electronAPI.saveFile(data)
    if (savedPath) {
      logger.info('APP', 'project.saved', { filePath: savedPath })
      setProject({ ...project, filePath: savedPath })
      window.electronAPI.addRecent(savedPath)
      loadRecentFiles()
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
      setProject({ ...project, filePath: savedPath })
      window.electronAPI.addRecent(savedPath)
      loadRecentFiles()
    } else {
      logger.debug('APP', 'project.save_as_canceled')
    }
  }

  const handleExport = async (format: 'pdf' | 'docx' = 'pdf') => {
    if (!project) return
    logger.info('APP', 'project.export', { format })
    const ext = format === 'pdf' ? 'pdf' : 'docx'
    const name = project.content.mata_kuliah
      ? `RPS_${project.content.mata_kuliah.replace(/\s+/g, '_')}.${ext}`
      : `export.${ext}`
    const result = await window.electronAPI.exportFile({ format, defaultName: name })
    if (result) {
      try {
        if (format === 'docx') {
          await exportDocx({ content: project.content }, result.filePath)
        } else {
          await exportPdf({ content: project.content }, result.filePath)
        }
        logger.info('APP', 'project.export_complete', { format, filePath: result.filePath })
      } catch (err) {
        logger.error('APP', 'project.export_error', { format, error: (err as Error).message })
        alert('Gagal export: ' + (err as Error).message)
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
      setProject({ filePath: result.filePath, content: result.data })
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

  useEffect(() => {
    loadRecentFiles()

    const unsubNew = window.electronAPI.onMenuNew(() => handleNewProject())
    const unsubSave = window.electronAPI.onMenuSave(() => handleSaveProject())
    const unsubExport = window.electronAPI.onMenuExport(() => handleExport())
    const unsubImport = window.electronAPI.onMenuImport(() => setShowImport(true))
    const unsubAI = window.electronAPI.onOpenAISettings(() => setShowAISettings(true))

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (e.shiftKey) handleSaveAs()
        else handleSaveProject()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      unsubNew()
      unsubSave()
      unsubExport()
      unsubImport()
      unsubAI()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

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
        />
      )}
      <AISettingsDialog open={showAISettings} onClose={() => setShowAISettings(false)} />
      <ImportDialog open={showImport} onClose={() => setShowImport(false)} onImport={(data) => {
        logger.info('APP', 'project.import_data', { fields: Object.keys(data) })
        if (project) {
          setProject({ ...project, content: { ...project.content, ...data } })
        }
        setShowStart(false)
      }} />
    </div>
  )
}

export default App
