interface ToolbarProps {
  onSave: () => void
  onSaveAs: () => void
}

export function Toolbar({ onSave, onSaveAs }: ToolbarProps) {
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
        <button className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded flex items-center gap-1">
          🤖 AI Settings
        </button>
        <button className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded flex items-center gap-1">
          📥 Export
        </button>
      </div>
    </div>
  )
}
