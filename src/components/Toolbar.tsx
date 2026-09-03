import { useState } from 'react'

interface ToolbarProps {
  onSave: () => void
  onSaveAs: () => void
  onExport?: (format: 'pdf' | 'docx') => void
  onOpenAISettings?: () => void
}

export function Toolbar({ onSave, onSaveAs, onExport, onOpenAISettings }: ToolbarProps) {
  const [showExportMenu, setShowExportMenu] = useState(false)

  return (
    <div className="bg-white border-b px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-gray-700">RPS Maker</span>
        <span className="text-gray-300">|</span>
        <button onClick={onSave} className="toolbar-btn">
          💾 Save
        </button>
        <button onClick={onSaveAs} className="toolbar-btn">
          📁 Save As
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={onOpenAISettings} className="toolbar-btn bg-blue-50 text-blue-700 hover:bg-blue-100">
          🤖 AI Settings
        </button>
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="toolbar-btn bg-green-50 text-green-700 hover:bg-green-100"
          >
            📥 Export ▾
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
              <button
                onClick={() => { onExport?.('docx'); setShowExportMenu(false) }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              >
                📄 Word (.docx)
              </button>
              <button
                onClick={() => { onExport?.('pdf'); setShowExportMenu(false) }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              >
                📕 PDF (.pdf)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}