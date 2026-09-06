import { useState, useSyncExternalStore } from 'react'
import {
  HomeIcon, FileIcon, FolderOpenIcon, SaveIcon,
  ExportWordIcon, ExportPdfIcon, SparklesIcon, SettingsIcon,
  CopyIcon, CutIcon, PasteIcon, KeyboardIcon, InfoIcon,
  UndoIcon, RedoIcon, ZoomInIcon, ZoomOutIcon, ZoomResetIcon, FullscreenIcon, ExitFullscreenIcon,
  BoldIcon, ItalicIcon, UnderlineIcon, StrikeIcon,
  BulletListIcon, NumberedListIcon, ClearFormatIcon,
  AlignLeftIcon, AlignCenterIcon, AlignRightIcon, AlignJustifyIcon,
  PreviewIcon,
} from './icons'
import { editorRegistry } from '../services/editorRegistry'
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
  onPreview?: () => void
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
  onShowShortcuts?: () => void
  onShowAbout?: () => void
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

const FONT_FAMILIES = [
  'Times New Roman',
  'Arial',
  'Calibri',
  'Cambria',
  'Georgia',
  'Courier New',
  'Tahoma',
  'Verdana',
  'Segoe UI',
  'Garamond',
]

const FONT_SIZES = ['8pt', '9pt', '10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt', '28pt', '36pt', '48pt']

export function Ribbon({
  onSave, onExport, onOpenAISettings, onGoHome, activeSection, onGenerateAI, aiLoading,
  onCut, onCopy, onPaste, onUndo, onRedo, canUndo, canRedo,
  onZoomIn, onZoomOut, onZoomReset, onPreview, isFullscreen, onToggleFullscreen, onShowShortcuts, onShowAbout,
}: RibbonProps) {
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [showContent, setShowContent] = useState(true)
  const fmt = useSyncExternalStore(editorRegistry.subscribe, editorRegistry.getSnapshot, editorRegistry.getSnapshot)

  const handleTabClick = (tabId: TabId) => {
    if (activeTab === tabId) {
      setShowContent(prev => !prev)
    } else {
      setActiveTab(tabId)
      setShowContent(true)
    }
  }

  const runFormat = (command: string, value?: string) => {
    logger.debug('Ribbon', 'ribbon.format', { command, value, editorActive: fmt.active })
    editorRegistry.runCommand(command, value)
  }

  const preventBlur = (e: React.MouseEvent) => {
    // Keep focus inside the rich text editor while clicking formatting controls
    e.preventDefault()
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
            <RibbonGroup label="Font">
              <RibbonSelect
                value={fmt.fontFamily || ''}
                placeholder="Font"
                options={FONT_FAMILIES}
                disabled={!fmt.active}
                onChange={(v) => runFormat('fontFamily', v)}
              />
              <RibbonSelect
                value={fmt.fontSize || ''}
                placeholder="Size"
                options={FONT_SIZES}
                disabled={!fmt.active}
                onChange={(v) => runFormat('fontSize', v)}
                width={64}
              />
            </RibbonGroup>
            <RibbonGroup label="Format">
              <RibbonButton icon={<BoldIcon size={20} />} label="Bold" active={fmt.active && fmt.bold} disabled={!fmt.active} onMouseDown={preventBlur} onClick={() => runFormat('bold')} />
              <RibbonButton icon={<ItalicIcon size={20} />} label="Italic" active={fmt.active && fmt.italic} disabled={!fmt.active} onMouseDown={preventBlur} onClick={() => runFormat('italic')} />
              <RibbonButton icon={<UnderlineIcon size={20} />} label="Underline" active={fmt.active && fmt.underline} disabled={!fmt.active} onMouseDown={preventBlur} onClick={() => runFormat('underline')} />
              <RibbonButton icon={<StrikeIcon size={20} />} label="Strikethrough" active={fmt.active && fmt.strike} disabled={!fmt.active} onMouseDown={preventBlur} onClick={() => runFormat('strike')} />
              <RibbonButton icon={<ClearFormatIcon size={20} />} label="Clear" disabled={!fmt.active} onMouseDown={preventBlur} onClick={() => runFormat('clearFormat')} />
            </RibbonGroup>
            <RibbonGroup label="Paragraph">
              <RibbonButton icon={<BulletListIcon size={20} />} label="Bullets" active={fmt.active && fmt.bulletList} disabled={!fmt.active} onMouseDown={preventBlur} onClick={() => runFormat('bulletList')} />
              <RibbonButton icon={<NumberedListIcon size={20} />} label="Numbering" active={fmt.active && fmt.orderedList} disabled={!fmt.active} onMouseDown={preventBlur} onClick={() => runFormat('orderedList')} />
              <RibbonButton icon={<AlignLeftIcon size={20} />} label="Align Left" active={fmt.active && fmt.align === 'left'} disabled={!fmt.active} onMouseDown={preventBlur} onClick={() => runFormat('align', 'left')} />
              <RibbonButton icon={<AlignCenterIcon size={20} />} label="Center" active={fmt.active && fmt.align === 'center'} disabled={!fmt.active} onMouseDown={preventBlur} onClick={() => runFormat('align', 'center')} />
              <RibbonButton icon={<AlignRightIcon size={20} />} label="Align Right" active={fmt.active && fmt.align === 'right'} disabled={!fmt.active} onMouseDown={preventBlur} onClick={() => runFormat('align', 'right')} />
              <RibbonButton icon={<AlignJustifyIcon size={20} />} label="Justify" active={fmt.active && fmt.align === 'justify'} disabled={!fmt.active} onMouseDown={preventBlur} onClick={() => runFormat('align', 'justify')} />
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
          <>
            <RibbonGroup label="Preview">
              <RibbonButton icon={<PreviewIcon size={20} />} label="Preview" onClick={onPreview} />
            </RibbonGroup>
            <RibbonGroup label="Zoom">
              <RibbonButton icon={<ZoomInIcon size={20} />} label="Zoom In" onClick={onZoomIn} />
              <RibbonButton icon={<ZoomOutIcon size={20} />} label="Zoom Out" onClick={onZoomOut} />
              <RibbonButton icon={<ZoomResetIcon size={20} />} label="Reset" onClick={onZoomReset} />
            </RibbonGroup>
            <RibbonGroup label="Window">
              <RibbonButton
                icon={isFullscreen ? <ExitFullscreenIcon size={20} /> : <FullscreenIcon size={20} />}
                label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                onClick={onToggleFullscreen}
                active={isFullscreen}
              />
            </RibbonGroup>
          </>
        )}

        {activeTab === 'help' && (
          <RibbonGroup label="Support">
            <RibbonButton icon={<KeyboardIcon size={20} />} label="Shortcuts" onClick={onShowShortcuts} />
            <RibbonButton icon={<InfoIcon size={20} />} label="About" onClick={onShowAbout || (() => {})} />
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

function RibbonButton({
  icon, label, onClick, disabled, loading, active, onMouseDown,
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  active?: boolean
  onMouseDown?: (e: React.MouseEvent) => void
}) {
  return (
    <button
      className={`ribbon-btn ${disabled ? 'ribbon-btn-disabled' : ''} ${active ? 'ribbon-btn-active' : ''}`}
      onMouseDown={onMouseDown}
      onClick={() => {
        if (!disabled && onClick) {
          onClick()
        }
      }}
      disabled={disabled}
      title={label}
    >
      <span className="ribbon-btn-icon">{loading ? <SpinnerIcon /> : icon}</span>
      <span className="ribbon-btn-label">{loading ? 'Generating...' : label}</span>
    </button>
  )
}

function RibbonSelect({
  value, placeholder, options, disabled, onChange, onMouseDown, width,
}: {
  value: string
  placeholder: string
  options: string[]
  disabled?: boolean
  onChange: (value: string) => void
  onMouseDown?: (e: React.MouseEvent) => void
  width?: number
}) {
  return (
    <select
      className="ribbon-select"
      style={width ? { width } : undefined}
      value={value}
      disabled={disabled}
      onMouseDown={onMouseDown}
      onChange={(e) => {
        if (e.target.value) onChange(e.target.value)
      }}
    >
      <option value="">{placeholder}</option>
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  )
}

function SpinnerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="animate-spin">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeDasharray="40" strokeDashoffset="10" />
    </svg>
  )
}