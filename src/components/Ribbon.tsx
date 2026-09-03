import { useState, useRef, useEffect } from 'react'
import {
  HomeIcon, FileIcon, FolderOpenIcon, SaveIcon, SaveAsIcon,
  ExportWordIcon, ExportPdfIcon, SparklesIcon, SettingsIcon,
  PasteIcon, KeyboardIcon, InfoIcon, TableIcon, ChevronDownIcon,
} from './icons'

interface RibbonProps {
  onSave: () => void
  onSaveAs: () => void
  onExport?: (format: 'pdf' | 'docx') => void
  onOpenAISettings?: () => void
  onGoHome?: () => void
}

type TabId = 'file' | 'home' | 'insert' | 'ai' | 'help'

interface Tab {
  id: TabId
  label: string
}

const tabs: Tab[] = [
  { id: 'file', label: 'File' },
  { id: 'home', label: 'Home' },
  { id: 'insert', label: 'Insert' },
  { id: 'ai', label: 'AI' },
  { id: 'help', label: 'Help' },
]

export function Ribbon({ onSave, onSaveAs, onExport, onOpenAISettings, onGoHome }: RibbonProps) {
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [showExportDrop, setShowExportDrop] = useState(false)
  const [showFilePanel, setShowFilePanel] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportDrop(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleTabClick = (id: TabId) => {
    if (id === 'file') {
      setShowFilePanel(!showFilePanel)
      return
    }
    setShowFilePanel(false)
    setActiveTab(id)
  }

  return (
    <div className="ribbon">
      {/* Tab bar */}
      <div className="ribbon-tabs">
        <button
          className={`ribbon-tab-item ${showFilePanel ? 'active' : ''}`}
          onClick={() => handleTabClick('file')}
        >
          File
        </button>
        {tabs.filter(t => t.id !== 'file').map(tab => (
          <button
            key={tab.id}
            className={`ribbon-tab-item ${activeTab === tab.id && !showFilePanel ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* File panel (Backstage) */}
      {showFilePanel && (
        <div className="ribbon-file-panel">
          <div className="ribbon-file-sidebar">
            <button className="ribbon-file-sidebar-item" onClick={() => { onGoHome?.(); setShowFilePanel(false) }}>
              <HomeIcon size={18} /> Home
            </button>
          </div>
          <div className="ribbon-file-content">
            <button className="ribbon-file-action" onClick={() => { onGoHome?.(); setShowFilePanel(false) }}>
              <HomeIcon size={24} />
              <div>
                <div className="ribbon-file-action-title">Home</div>
                <div className="ribbon-file-action-desc">Kembali ke layar utama</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Ribbon content */}
      {!showFilePanel && (
        <div className="ribbon-content">
          {activeTab === 'home' && (
            <>
              <RibbonGroup label="Project">
                <RibbonButton icon={<FileIcon size={20} />} label="New" onClick={() => onGoHome?.()} />
                <RibbonButton icon={<FolderOpenIcon size={20} />} label="Open" onClick={() => onGoHome?.()} />
                <RibbonButton icon={<SaveIcon size={20} />} label="Save" onClick={onSave} />
                <RibbonButton icon={<SaveAsIcon size={20} />} label="Save As" onClick={onSaveAs} />
              </RibbonGroup>

              <RibbonGroup label="Clipboard">
                <RibbonButton icon={<PasteIcon size={20} />} label="Paste" onClick={() => document.execCommand('paste')} />
              </RibbonGroup>

              <RibbonGroup label="Export">
                <RibbonButton icon={<ExportWordIcon size={20} />} label="Word" onClick={() => onExport?.('docx')} />
                <RibbonButton icon={<ExportPdfIcon size={20} />} label="PDF" onClick={() => onExport?.('pdf')} />
              </RibbonGroup>

              <RibbonGroup label="AI">
                <RibbonButton icon={<SparklesIcon size={20} />} label="Generate" onClick={onOpenAISettings} />
                <RibbonButton icon={<SettingsIcon size={20} />} label="AI Settings" onClick={onOpenAISettings} />
              </RibbonGroup>
            </>
          )}

          {activeTab === 'insert' && (
            <RibbonGroup label="Table">
              <RibbonButton icon={<TableIcon size={20} />} label="Add Row" onClick={() => {}} />
              <RibbonButton icon={<TableIcon size={20} />} label="Add Column" onClick={() => {}} />
            </RibbonGroup>
          )}

          {activeTab === 'ai' && (
            <>
              <RibbonGroup label="Generate">
                <RibbonButton icon={<SparklesIcon size={20} />} label="Generate Section" onClick={onOpenAISettings} />
              </RibbonGroup>
              <RibbonGroup label="Settings">
                <RibbonButton icon={<SettingsIcon size={20} />} label="AI Settings" onClick={onOpenAISettings} />
              </RibbonGroup>
            </>
          )}

          {activeTab === 'help' && (
            <>
              <RibbonGroup label="Support">
                <RibbonButton icon={<KeyboardIcon size={20} />} label="Shortcuts" onClick={() => {}} />
                <RibbonButton icon={<InfoIcon size={20} />} label="About" onClick={() => {}} />
              </RibbonGroup>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Sub-components ── */

function RibbonGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ribbon-group">
      <div className="ribbon-group-buttons">{children}</div>
      <div className="ribbon-group-label">{label}</div>
    </div>
  )
}

function RibbonButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className="ribbon-btn" onClick={onClick}>
      <span className="ribbon-btn-icon">{icon}</span>
      <span className="ribbon-btn-label">{label}</span>
    </button>
  )
}
