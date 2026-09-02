import { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { Editor } from './components/Editor'
import { StartScreen } from './components/StartScreen'

export interface Project {
  filePath: string | null
  content: Record<string, string>
}

const defaultContent: Record<string, string> = {
  prodi: '',
  mata_kuliah: '',
  kode_mk: '',
  sks: '',
  semester: '',
  dosen: '',
  semester_akademik: '',
  cpl: '',
  cpmk: '',
  sub_cpmk: '',
  bahan_kajian: '',
  metode: '',
  pengalaman_belajar: '',
  asesmen: '',
  referensi: '',
}

function App() {
  const [project, setProject] = useState<Project | null>(null)
  const [showStart, setShowStart] = useState(true)
  const [recentFiles, setRecentFiles] = useState<Array<{ path: string; name: string; openedAt: string }>>([])

  const handleNewProject = (content?: Record<string, string>) => {
    setProject({ filePath: null, content: content || { ...defaultContent } })
    setShowStart(false)
  }

  const handleOpenProject = async () => {
    const result = await window.electronAPI.openFile()
    if (result) {
      setProject({ filePath: result.filePath, content: result.data })
      setShowStart(false)
      window.electronAPI.addRecent(result.filePath)
      loadRecentFiles()
    }
  }

  const handleSaveProject = async () => {
    if (!project) return
    const data = {
      defaultName: project.content.mata_kuliah
        ? `RPS_${project.content.mata_kuliah.replace(/\s+/g, '_')}.rps`
        : 'untitled.rps',
      content: project.content,
    }
    const savedPath = await window.electronAPI.saveFile(data)
    if (savedPath) {
      setProject({ ...project, filePath: savedPath })
      window.electronAPI.addRecent(savedPath)
      loadRecentFiles()
    }
  }

  const handleSaveAs = async () => {
    if (!project) return
    const data = {
      defaultName: project.content.mata_kuliah
        ? `RPS_${project.content.mata_kuliah.replace(/\s+/g, '_')}.rps`
        : 'untitled.rps',
      content: project.content,
    }
    const savedPath = await window.electronAPI.saveFileAs(data)
    if (savedPath) {
      setProject({ ...project, filePath: savedPath })
      window.electronAPI.addRecent(savedPath)
      loadRecentFiles()
    }
  }

  const handleExport = async () => {
    const result = await window.electronAPI.exportFile({ format: 'pdf' })
    if (result) {
      // TODO: implement PDF generation in Phase 5
      console.log('Export to:', result.filePath)
    }
  }

  const handleOpenRecent = async (filePath: string) => {
    const result = await window.electronAPI.openProject(filePath)
    if (result) {
      setProject({ filePath: result.filePath, content: result.data })
      setShowStart(false)
      loadRecentFiles()
    }
  }

  const loadRecentFiles = async () => {
    const recent = await window.electronAPI.getRecent()
    setRecentFiles(recent || [])
  }

  useEffect(() => {
    loadRecentFiles()

    window.electronAPI.onMenuNew(() => handleNewProject())
    window.electronAPI.onMenuSave(() => handleSaveProject())
    window.electronAPI.onMenuExport(() => handleExport())
  }, [project])

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
      <Sidebar />
      <Editor
        project={project!}
        onUpdate={(content) => setProject({ ...project!, content })}
        onSave={handleSaveProject}
        onSaveAs={handleSaveAs}
      />
    </div>
  )
}

export default App
