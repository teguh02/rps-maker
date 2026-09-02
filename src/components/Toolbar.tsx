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
    <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-gray-700">RPS Maker</span>
        <span className="text-gray-400">|</span>
        <button
          onClick={onSave}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1"
        >
          💾 Save
        </button>
        <button
          onClick={onSaveAs}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1"
        >
          📁 Save As
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenAISettings}
          className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded flex items-center gap-1"
        >
          🤖 AI Settings
        </button>
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded flex items-center gap-1"
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