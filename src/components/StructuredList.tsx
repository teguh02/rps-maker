import { RTE } from './RTE'
import { ArrowUpIcon, ArrowDownIcon, TrashIcon } from './icons'
import { logger } from '../utils/logger'

export interface StructuredItem {
  label: string
  deskripsi: string
  cpmk?: string
  judul?: string
}

export const RowActions = ({ idx, total, onMoveUp, onMoveDown, onDelete }: {
  idx: number
  total: number
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete?: () => void
}) => (
  <div className="flex items-center justify-center gap-1">
    <button
      onClick={onMoveUp}
      disabled={idx === 0}
      className="row-action-btn"
      title="Pindah ke atas"
    >
      <ArrowUpIcon size={16} />
    </button>
    <button
      onClick={onMoveDown}
      disabled={idx === total - 1}
      className="row-action-btn"
      title="Pindah ke bawah"
    >
      <ArrowDownIcon size={16} />
    </button>
    {onDelete && (
      <button
        onClick={onDelete}
        className="row-action-btn row-action-btn-delete"
        title="Hapus baris"
      >
        <TrashIcon size={16} />
      </button>
    )}
  </div>
)

export function StructuredList({
  listKey,
  prefix,
  items,
  onChange,
  onCellEdit,
  showCpmkRef = false,
  showJudul = true,
}: {
  listKey: string
  prefix: string
  items: StructuredItem[]
  onChange: (items: StructuredItem[]) => void
  /** Rich-text cell edits — routed via a fresh ref so stale RTE closures never clobber other rows */
  onCellEdit?: (idx: number, value: string) => void
  showCpmkRef?: boolean
  showJudul?: boolean
}) {
  const addItem = () => {
    const newItems = [...items]
    let label = ''
    if (prefix === 'Sub-CPMK') {
      label = `${prefix}${newItems.length + 1}`
    } else if (prefix === 'CPL') {
      label = `${prefix}-${newItems.length + 1}`
    } else if (prefix === 'CPMK') {
      label = `${prefix}-${newItems.length + 1}`
    } else {
      label = String(newItems.length + 1)
    }
    newItems.push({ label, deskripsi: '', cpmk: '', judul: '' })
    logger.debug('EDITOR', 'editor.structured_list.add', { listKey, newCount: newItems.length })
    onChange(newItems)
  }

  const removeItem = (idx: number) => {
    const newItems = items.filter((_, i) => i !== idx)
    logger.debug('EDITOR', 'editor.structured_list.remove', { listKey, index: idx, remaining: newItems.length })
    onChange(newItems)
  }

  const moveItem = (fromIdx: number, direction: 'up' | 'down') => {
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1
    if (toIdx < 0 || toIdx >= items.length) return
    const newItems = [...items]
    const [moved] = newItems.splice(fromIdx, 1)
    newItems.splice(toIdx, 0, moved)
    logger.debug('EDITOR', 'editor.structured_list.move', { listKey, from: fromIdx, to: toIdx })
    onChange(newItems)
  }

  const updateDeskripsi = (idx: number, deskripsi: string) => {
    const newItems = [...items]
    newItems[idx] = { ...newItems[idx], deskripsi }
    onChange(newItems)
  }

  const updateJudul = (idx: number, judul: string) => {
    const newItems = [...items]
    newItems[idx] = { ...newItems[idx], judul }
    onChange(newItems)
  }

  const updateLabel = (idx: number, label: string) => {
    const newItems = [...items]
    newItems[idx] = { ...newItems[idx], label }
    onChange(newItems)
  }

  return (
    <div>
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left text-sm font-medium text-gray-700 p-2 w-12"></th>
            <th className="text-left text-sm font-medium text-gray-700 p-2 w-28">Label</th>
            {showJudul && <th className="text-left text-sm font-medium text-gray-700 p-2 w-48">Judul</th>}
            <th className="text-left text-sm font-medium text-gray-700 p-2">Deskripsi</th>
            <th className="text-left text-sm font-medium text-gray-700 p-2 w-16">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-t hover:bg-gray-50">
              <td className="p-2">
                <RowActions
                  idx={idx}
                  total={items.length}
                  onMoveUp={() => moveItem(idx, 'up')}
                  onMoveDown={() => moveItem(idx, 'down')}
                />
              </td>
              <td className="p-2">
                <input
                  type="text"
                  value={item.label || ''}
                  onChange={(e) => updateLabel(idx, e.target.value)}
                  placeholder={prefix === 'Sub-CPMK' ? `${prefix}${idx + 1}` : prefix === 'CPL' ? `CPL-${idx + 1}` : prefix === 'CPMK' ? `CPMK-${idx + 1}` : String(idx + 1)}
                  className="w-full px-2 py-1 text-sm font-medium border border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none rounded"
                />
              </td>
              {showJudul && (
                <td className="p-2">
                  <input
                    type="text"
                    value={item.judul || ''}
                    onChange={(e) => updateJudul(idx, e.target.value)}
                    placeholder="Judul"
                    className="w-full px-2 py-1 text-sm border border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none rounded"
                  />
                </td>
              )}
              <td className="p-2">
                <RTE
                  content={item.deskripsi}
                  onUpdate={(html) => {
                    if (onCellEdit) onCellEdit(idx, html)
                    else updateDeskripsi(idx, html)
                  }}
                  placeholder={`Deskripsi ${item.label || prefix}${idx + 1}...`}
                  compact
                />
              </td>
              <td className="p-2">
                <button
                  onClick={() => removeItem(idx)}
                  className="row-action-btn row-action-btn-delete"
                  title="Hapus baris"
                >
                  <TrashIcon size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={addItem}
        className="w-full text-left text-sm text-blue-600 hover:text-blue-800 py-2 px-2"
      >
        + Tambah {prefix}
      </button>
    </div>
  )
}
