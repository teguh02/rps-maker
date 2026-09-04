import { useState } from 'react'
import {
  HomeIcon, FileIcon, FolderOpenIcon, SaveIcon,
  ExportWordIcon, ExportPdfIcon, SparklesIcon, SettingsIcon,
  CopyIcon, CutIcon, PasteIcon, KeyboardIcon, InfoIcon,
  UndoIcon, RedoIcon, ZoomInIcon, ZoomOutIcon, ZoomResetIcon
} from './icons'
import { logger } from '../utils/logger'

interface RibbonProps {
  onSave: () => void
  onExport?: (format: 'pdf' | 'docx') => void
  onOpenAISettings?: () => void
  onGoHome?: () => void
  onCut?: () => void
  onCopy?: () => void
  onPaste?: () => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
  onZoomIn?: () => void
  onZoomOut?: () => void
  onZoomReset?: () => void
  activeSection?: string
  onGenerateAI?: () => void
  aiLoading?: boolean
}

type TabId = 'file' | 'home' | 'ai' | 'view' | 'help'

const tabs: { id: TabId; label: string }[] = [
  { id: 'file', label: 'File' },
  { id: 'home', label: 'Home' },
  { id: 'ai', label: 'AI' },
  { id: 'view', label: 'View' },
  { id: 'help', label: 'Help' },
]

const AI_SUPPORTED_SECTIONS = ['cpl', 'cpmk', 'sub_cpmk', 'deskripsi_mk', 'bahan_kajian', 'penilaian', 'pustaka']

export function Ribbon({ onSave, onExport, onOpenAISettings, onGoHome, activeSection, onGenerateAI, aiLoading, onCut, onCopy, onPaste, onUndo, onRedo, canUndo, canRedo, onZoomIn, onZoomOut, onZoomReset }: RibbonProps) {
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [showContent, setShowContent] = useState(true)

  const handleTabClick = (tabId: TabId) => {
    if (activeTab === tabId) {
      setShowContent(prev => !prev)
    } else {
      setActiveTab(tabId)
      setShowContent(true)
    }
  }

  return (
    <div className="ribbon">
      <div className="ribbon-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`ribbon-tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
          >
            {tab.label}
          </button>
        ))}
        <button
          className="ribbon-collapse-btn"
          onClick={() => setShowContent(prev => !prev)}
          title={showContent ? 'Minimize Ribbon' : 'Expand Ribbon'}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            {showContent
              ? <path d="M2 8L6 4L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              : <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            }
          </svg>
        </button>
      </div>

      {showContent && (
        <div className="ribbon-content">
        {activeTab === 'file' && (
          <>
            <RibbonGroup label="Project">
              <RibbonButton icon={<HomeIcon size={20} />} label="Home" onClick={() => onGoHome?.()} />
              <RibbonButton icon={<FileIcon size={20} />} label="New" onClick={() => onGoHome?.()} />
              <RibbonButton icon={<FolderOpenIcon size={20} />} label="Open" onClick={() => onGoHome?.()} />
            </RibbonGroup>
            <RibbonGroup label="Save">
              <RibbonButton icon={<SaveIcon size={20} />} label="Save" onClick={onSave} />
            </RibbonGroup>
            <RibbonGroup label="Export">
              <RibbonButton icon={<ExportWordIcon size={20} />} label="Word" onClick={() => onExport?.('docx')} />
              <RibbonButton icon={<ExportPdfIcon size={20} />} label="PDF" onClick={() => onExport?.('pdf')} />
            </RibbonGroup>
          </>
        )}

        {activeTab === 'home' && (
          <>
            <RibbonGroup label="Clipboard">
              <RibbonButton icon={<CutIcon size={20} />} label="Cut" onClick={onCut} />
              <RibbonButton icon={<CopyIcon size={20} />} label="Copy" onClick={onCopy} />
              <RibbonButton icon={<PasteIcon size={20} />} label="Paste" onClick={onPaste} />
            </RibbonGroup>
            <RibbonGroup label="History">
              <RibbonButton icon={<UndoIcon size={20} />} label="Undo" onClick={onUndo} disabled={!canUndo} />
              <RibbonButton icon={<RedoIcon size={20} />} label="Redo" onClick={onRedo} disabled={!canRedo} />
            </RibbonGroup>
          </>
        )}

        {activeTab === 'ai' && (
          <>
            <RibbonGroup label="Generate">
              <RibbonButton
                icon={<SparklesIcon size={20} />}
                label="Generate Section"
                onClick={() => {
                  logger.info('Ribbon', 'ai.generate_click', { activeSection, aiLoading })
                  onGenerateAI?.()
                }}
                disabled={!activeSection || !AI_SUPPORTED_SECTIONS.includes(activeSection) || aiLoading}
                loading={aiLoading}
              />
            </RibbonGroup>
            <RibbonGroup label="Settings">
              <RibbonButton icon={<SettingsIcon size={20} />} label="AI Settings" onClick={() => onOpenAISettings?.()} />
            </RibbonGroup>
          </>
        )}

        {activeTab === 'view' && (
          <RibbonGroup label="Zoom">
            <RibbonButton icon={<ZoomInIcon size={20} />} label="Zoom In" onClick={onZoomIn} />
            <RibbonButton icon={<ZoomOutIcon size={20} />} label="Zoom Out" onClick={onZoomOut} />
            <RibbonButton icon={<ZoomResetIcon size={20} />} label="Reset" onClick={onZoomReset} />
          </RibbonGroup>
        )}

        {activeTab === 'help' && (
          <RibbonGroup label="Support">
            <RibbonButton icon={<KeyboardIcon size={20} />} label="Shortcuts" onClick={() => {}} />
            <RibbonButton icon={<InfoIcon size={20} />} label="About" onClick={() => {}} />
          </RibbonGroup>
        )}
        </div>
      )}
    </div>
  )
}

function RibbonGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ribbon-group">
      <div className="ribbon-group-buttons">{children}</div>
      <div className="ribbon-group-label">{label}</div>
    </div>
  )
}

function RibbonButton({ icon, label, onClick, disabled, loading }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; loading?: boolean }) {
  return (
    <button
      className={`ribbon-btn ${disabled ? 'ribbon-btn-disabled' : ''}`}
      onClick={() => {
        if (!disabled) {
          onClick()
        }
      }}
      disabled={disabled}
    >
      <span className="ribbon-btn-icon">{loading ? <SpinnerIcon /> : icon}</span>
      <span className="ribbon-btn-label">{loading ? 'Generating...' : label}</span>
    </button>
  )
}

function SpinnerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="animate-spin">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeDasharray="40" strokeDashoffset="10" />
    </svg>
  )
}
