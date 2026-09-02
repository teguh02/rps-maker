import { useState } from 'react'

const sections = [
  { id: 'identitas', label: 'Identitas', icon: '📋' },
  { id: 'cpl', label: 'CPL', icon: '🎯' },
  { id: 'cpmk', label: 'CPMK', icon: '📝' },
  { id: 'sub_cpmk', label: 'Sub-CPMK', icon: '📑' },
  { id: 'bahan_kajian', label: 'Bahan Kajian', icon: '📚' },
  { id: 'metode', label: 'Metode', icon: '⚙️' },
  { id: 'pengalaman_belajar', label: 'Pengalaman Belajar', icon: '🎓' },
  { id: 'asesmen', label: 'Asesmen', icon: '📊' },
  { id: 'referensi', label: 'Referensi', icon: '📖' },
]

interface SidebarProps {
  activeSection?: string
  onNavigate?: (sectionId: string) => void
}

export function Sidebar({ activeSection, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className={`${collapsed ? 'w-16' : 'w-64'} bg-gray-900 text-white flex flex-col transition-all duration-200`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        {!collapsed && (
          <div className="font-semibold text-sm">RPS Sections</div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-400 hover:text-white p-1"
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onNavigate?.(section.id)}
            className={`w-full px-4 py-3 flex items-center gap-3 text-left text-sm transition-colors
              ${activeSection === section.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
          >
            <span className="text-lg">{section.icon}</span>
            {!collapsed && <span>{section.label}</span>}
          </button>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
          RPS Maker v1.0.0
        </div>
      )}
    </div>
  )
}
