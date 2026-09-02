import { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { Editor } from './components/Editor'
import { StartScreen } from './components/StartScreen'

export interface Project {
  filePath: string | null
  content: {
    fields: Record<string, string>
    sections: Record<string, string>
    customizations: Record<string, string>
  }
}

const defaultContent = {
  fields: {
    prodi: '',
    mata_kuliah: '',
    kode_mk: '',
    sks: '',
    semester: '',
    dosen: '',
    semester_akademik: '',
  },
  sections: {
    cpl: '',
    cpmk: '',
    sub_cpmk: '',
    bahan_kajian: '',
    metode: '',
    pengalaman_belajar: '',
    asesmen: '',
    referensi: '',
  },
  customizations: {
    logo_path: '',
    header_text: 'UNIVERSITAS IBNU SINA AJIBARANG',
    nomor_surat: '',
  },
}

function App() {
  const [project, setProject] = useState<Project | null>(null)
  const [showStart, setShowStart] = useState(true)

  const handleNewProject = () => {
    setProject({ filePath: null, content: { ...defaultContent } })
    setShowStart(false)
  }

  const handleOpenProject = async () => {
    const result = await window.electronAPI.openFile()
    if (result) {
      setProject({ filePath: result.filePath, content: result.data })
      setShowStart(false)
    }
  }

  const handleSaveProject = async () => {
    if (!project) return
    const data = {
      defaultName: project.content.fields.mata_kuliah
        ? `RPS_${project.content.fields.mata_kuliah.replace(/\s+/g, '_')}.rps`
        : 'untitled.rps',
      content: project.content,
    }
    const savedPath = await window.electronAPI.saveFile(data)
    if (savedPath) {
      setProject({ ...project, filePath: savedPath })
    }
  }

  const handleSaveAs = async () => {
    if (!project) return
    const data = {
      defaultName: project.content.fields.mata_kuliah
        ? `RPS_${project.content.fields.mata_kuliah.replace(/\s+/g, '_')}.rps`
        : 'untitled.rps',
      content: project.content,
    }
    const savedPath = await window.electronAPI.saveFileAs(data)
    if (savedPath) {
      setProject({ ...project, filePath: savedPath })
    }
  }

  // Listen for menu events
  useEffect(() => {
    window.electronAPI.onMenuNew(() => handleNewProject())
    window.electronAPI.onMenuSave(() => handleSaveProject())
    window.electronAPI.onMenuExport(() => {
      // TODO: show export dialog
    })
  }, [project])

  if (showStart) {
    return <StartScreen onNew={handleNewProject} onOpen={handleOpenProject} />
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
