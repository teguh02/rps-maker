import { useState, useEffect, useRef } from 'react'
import type { Project } from '../App'
import { Ribbon } from './Ribbon'
import { RTE } from './RTE'
import { ShortcutsDialog } from './ShortcutsDialog'
import { guideSections } from './GuidePage'
import { ArrowUpIcon, ArrowDownIcon, TrashIcon } from './icons'
import { isAIConfigured, generateWithAI, getSectionPrompt } from '../services/ai'
import { logger } from '../utils/logger'
import { stripHtml } from '../utils/html'

interface EditorProps {
  project: Project
  onUpdate: (content: Record<string, string>) => void
  onSave: () => void
  onExport?: (format: 'pdf' | 'docx') => void
  onOpenAISettings?: () => void
  onGoHome?: () => void
  onOpenGuide?: (section: string) => void
  onPreview?: () => void
  autoSaveActive?: boolean
  lastAutoSaveAt?: string | null
  showToast?: (message: string, type?: 'info' | 'warning' | 'error') => void
}

interface PenilaianItem {
  item: string
  bobot: number
}

interface StructuredItem {
  label: string
  deskripsi: string
  cpmk?: string
  judul?: string
}

interface PertemuanItem {
  no: number
  subCpmk: string
  indikator: string
  kriteriaTeknik: string
  bentukMetodePenugasan: string
  luring: string
  daring: string
  materiPustaka: string
  bobot: number
  type?: 'regular'
  label?: string
}

interface PertemuanSpecial {
  type: 'uts' | 'uas'
  no: number
  label: string
}

type PertemuanRow = PertemuanItem | PertemuanSpecial

export function Editor({ project, onUpdate, onSave, onExport, onOpenAISettings, onGoHome, onOpenGuide, onPreview, autoSaveActive, lastAutoSaveAt, showToast }: EditorProps) {
  const [activeSection, setActiveSection] = useState('identitas')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [dismissedGuides, setDismissedGuides] = useState<Set<string>>(new Set())
  const [zoom, setZoom] = useState(1) // 100%
  const [undoStack, setUndoStack] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([])
  const [currentContent, setCurrentContent] = useState<string>(JSON.stringify(project.content))
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(true) // starts maximized

  const handleToggleFullscreen = async () => {
    const result = await (window as any).electronAPI?.toggleFullscreen()
    if (result !== undefined) setIsFullscreen(result)
  }

  const safeToast = showToast || (() => {})

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const closeContextMenu = () => setContextMenu(null)

  const handleCut = async () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    if (!selectedText) {
      safeToast('Tidak ada teks yang dipilih. Blok teks terlebih dahulu sebelum Cut.', 'warning')
      return
    }
    try {
      await navigator.clipboard.writeText(selectedText);
      selection?.removeAllRanges();
      safeToast('Teks berhasil dipotong ke clipboard.', 'info')
    } catch (err) {
      safeToast('Gagal memotong teks. Periksa izin clipboard browser.', 'error')
    }
  };

  const handleCopy = async () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    if (!selectedText) {
      safeToast('Tidak ada teks yang dipilih. Blok teks terlebih dahulu sebelum Copy.', 'warning')
      return
    }
    try {
      await navigator.clipboard.writeText(selectedText);
      safeToast('Teks berhasil disalin ke clipboard.', 'info')
    } catch (err) {
      safeToast('Gagal menyalin teks. Periksa izin clipboard browser.', 'error')
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        safeToast('Clipboard kosong. Salin teks terlebih dahulu sebelum Paste.', 'warning')
        return
      }
      const activeElement = document.activeElement;
      if (activeElement && typeof (activeElement as HTMLElement).insertAdjacentText === 'function') {
        (activeElement as HTMLElement).insertAdjacentText('beforeend', text);
        safeToast('Teks berhasil ditempel.', 'info')
      } else {
        safeToast('Tidak ada area input aktif. Klik pada kolom input terlebih dahulu.', 'warning')
      }
    } catch (err) {
      safeToast('Gagal menempel teks. Periksa izin clipboard browser.', 'error')
    }
  };

  // Refs that always point at the LATEST render, so callbacks captured by older
  // renders (e.g. TipTap's per-editor onUpdate, created once at mount) never
  // write against a stale document snapshot and clobber other fields.
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate
  const currentContentRef = useRef(currentContent)
  currentContentRef.current = currentContent

  const handleUndo = () => {
    if (undoStack.length === 0) { safeToast('Tidak ada yang bisa di-undo.', 'warning'); return; }
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(undoStack.slice(0, -1));
    setRedoStack(prevState => [...prevState, currentContent]);
    setCurrentContent(prev);
    onUpdateRef.current(JSON.parse(prev));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) { safeToast('Tidak ada yang bisa di-redo.', 'warning'); return; }
    const next = redoStack[redoStack.length - 1];
    setRedoStack(redoStack.slice(0, -1));
    setUndoStack(prev => [...prev, currentContent]);
    setCurrentContent(next);
    onUpdateRef.current(JSON.parse(next));
  };

  // Adopt external content changes (opened project, import dialog, …) into the
  // local undo/redo snapshot so later edits build on top of them.
  useEffect(() => {
    const incoming = JSON.stringify(project.content)
    if (incoming !== currentContentRef.current) {
      setCurrentContent(incoming)
      setUndoStack([])
      setRedoStack([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.content])

  const handleZoomIn = () => {
    setZoom(z => Math.min(z + 0.25, 4));
  };

  const handleZoomOut = () => {
    setZoom(z => Math.max(z - 0.25, 0.25));
  };

  const handleZoomReset = () => {
    setZoom(1);
  };

  // Latest-handler refs so the one-time keyboard listener below never uses stale closures.
  const shortcutsRef = useRef({
    activeSection,
    handleUndo,
    handleRedo,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    onOpenGuide,
    closeOverlays: () => {
      setContextMenu(null)
      setShowShortcuts(false)
    },
  })
  shortcutsRef.current = {
    activeSection,
    handleUndo,
    handleRedo,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    onOpenGuide,
    closeOverlays: shortcutsRef.current.closeOverlays,
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const s = shortcutsRef.current
      // F1 → open the guide for the active section
      if (e.key === 'F1') {
        e.preventDefault()
        s.onOpenGuide?.(s.activeSection)
        return
      }
      // Esc → close context menu / shortcuts dialog
      if (e.key === 'Escape') {
        s.closeOverlays()
        return
      }
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      const key = e.key.toLowerCase()
      // Zoom keys (safe anywhere, no field is focused on them)
      if (key === '0') { e.preventDefault(); s.handleZoomReset(); return }
      if (key === '=' || key === '+') { e.preventDefault(); s.handleZoomIn(); return }
      if (key === '-') { e.preventDefault(); s.handleZoomOut(); return }
      // Document Undo/Redo — only when focus is NOT inside an editable field.
      // (Inside an RTE or input, the field itself handles Ctrl+Z natively.)
      const el = document.activeElement as HTMLElement | null
      const inEditable = !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
      if (key === 'z' && !inEditable) {
        e.preventDefault()
        if (e.shiftKey) s.handleRedo()
        else s.handleUndo()
        return
      }
      if (key === 'y' && !inEditable) {
        e.preventDefault()
        s.handleRedo()
        return
      }
    }
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const s = shortcutsRef.current
      if (e.deltaY < 0) s.handleZoomIn()
      else s.handleZoomOut()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('wheel', onWheel)
    }
  }, [])

  const updateField = (key: string, value: string) => {
    logger.debug('EDITOR', 'editor.field_update', { field: key })
    // Build from the freshest snapshot (not a possibly-stale render closure),
    // so edits from any RTE/input always merge onto the latest document.
    let base: Record<string, string>
    try {
      base = JSON.parse(currentContentRef.current || '{}')
    } catch {
      base = { ...project.content }
    }
    const newState = { ...base, [key]: value }
    const newContent = JSON.stringify(newState)

    // Push to undo stack (cap at 50 states)
    setUndoStack(prev => [...prev, currentContentRef.current].slice(-50))
    setRedoStack([])

    currentContentRef.current = newContent
    setCurrentContent(newContent)
    onUpdateRef.current(newState)
  };

  const getStructuredList = (key: string): StructuredItem[] => {
    try {
      return JSON.parse(project.content[key] || '[]')
    } catch {
      return []
    }
  }

  const updateStructuredList = (key: string, items: StructuredItem[]) => {
    updateField(key, JSON.stringify(items))
  }

  const getPenilaian = (): PenilaianItem[] => {
    try {
      return JSON.parse(project.content.penilaian || '[]')
    } catch {
      return []
    }
  }

  const updatePenilaian = (items: PenilaianItem[]) => {
    updateField('penilaian', JSON.stringify(items))
  }

  const getPertemuan = (): PertemuanRow[] => {
    try {
      return JSON.parse(project.content.pertemuan || '[]')
    } catch {
      return []
    }
  }

  const updatePertemuan = (items: PertemuanRow[]) => {
    updateField('pertemuan', JSON.stringify(items))
  }

  const updatePertemuanField = (idx: number, field: keyof PertemuanItem, value: string | number) => {
    const items = [...getPertemuan()]
    const row = items[idx]
    if (row && row.type !== 'uts' && row.type !== 'uas') {
      items[idx] = { ...row, [field]: value } as PertemuanItem
      updatePertemuan(items)
    }
  }

  // TipTap editors are created ONCE per cell, so their onUpdate closures point at
  // an old render. Route every rich-text cell edit through these refs, which are
  // re-pointed to the freshest functions on each render — guaranteeing edits
  // always merge onto the CURRENT document/list, never a stale snapshot.
  const listCellRef = useRef<(key: string, idx: number, value: string) => void>(() => {})
  const pertCellRef = useRef<(idx: number, field: keyof PertemuanItem, value: string) => void>(() => {})
  listCellRef.current = (key, idx, value) => {
    const items = [...getStructuredList(key)]
    const it = items[idx]
    if (!it) return
    items[idx] = { ...it, deskripsi: value }
    updateField(key, JSON.stringify(items))
  }
  pertCellRef.current = (idx, field, value) => {
    const items = [...getPertemuan()]
    const row = items[idx]
    if (row && row.type !== 'uts' && row.type !== 'uas') {
      items[idx] = { ...row, [field]: value } as PertemuanItem
      updateField('pertemuan', JSON.stringify(items))
    }
  }

  const generatePertemuan = () => {
    logger.info('EDITOR', 'editor.pertemuan.generate')
    const subCpmkList = getStructuredList('sub_cpmk')
    const existing = getPertemuan()
    const existingItems = existing.filter(e => e.type !== 'uts' && e.type !== 'uas') as PertemuanItem[]
    const maxMinggu = Math.max(16, existingItems.length, subCpmkList.length)

    const items: PertemuanRow[] = []
    for (let i = 1; i <= maxMinggu; i++) {
      const existingItem = existingItems.find(e => e.no === i)
      const subCpmk = subCpmkList[i - 1]?.deskripsi || existingItem?.subCpmk || ''
      items.push({
        no: i,
        subCpmk,
        indikator: existingItem?.indikator || '',
        kriteriaTeknik: existingItem?.kriteriaTeknik || '',
        bentukMetodePenugasan: existingItem?.bentukMetodePenugasan || '',
        luring: existingItem?.luring || '',
        daring: existingItem?.daring || '',
        materiPustaka: existingItem?.materiPustaka || '',
        bobot: existingItem?.bobot || 0,
      })
    }
    items.splice(8, 0, { type: 'uts', no: 0, label: 'Evaluasi Tengah Semester (UTS)' })
    items.splice(17, 0, { type: 'uas', no: 0, label: 'Evaluasi Akhir Semester (UAS)' })
    logger.debug('EDITOR', 'editor.pertemuan.generated', { rowCount: items.length })
    updatePertemuan(items)
  }

  const getSubCpmkList = (): string[] => {
    return getStructuredList('sub_cpmk').map(s => stripHtml(s.deskripsi))
  }

  // Delete is optional: StructuredList tables render their own delete in the trailing
  // "Aksi" column, while Penilaian passes onDelete to get ↑↓ + 🗑 in a single cell.
  const RowActions = ({ idx, total, onMoveUp, onMoveDown, onDelete }: {
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

  const StructuredList = ({
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
  }) => {
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

  const sections = [
    { id: 'identitas', label: 'Identitas' },
    { id: 'cover', label: 'Cover' },
    { id: 'otorisasi', label: 'Otorisasi' },
    { id: 'cpl', label: 'CPL' },
    { id: 'cpmk', label: 'CPMK' },
    { id: 'sub_cpmk', label: 'Sub-CPMK' },
    { id: 'deskripsi_mk', label: 'Deskripsi' },
    { id: 'bahan_kajian', label: 'Bahan Kajian' },
    { id: 'penilaian', label: 'Penilaian' },
    { id: 'pustaka', label: 'Pustaka' },
    { id: 'pertemuan', label: 'Pertemuan' },
    { id: 'ttd', label: 'Pengesahan' },
  ]

  const sectionGuides: Record<string, string> = {
    cover: '💡 Ini adalah preview cover RPS. Data diambil dari tab Identitas.',
    identitas: '💡 Isi data identitas mata kuliah sesuai kurikulum program studi.',
    otorisasi: '💡 Otorisasi diisi oleh Kaprodi dan Koordinator RMK. Dosen pengisi adalah Pengembang RPS.',
    cpl: '💡 CPL ditetapkan oleh program studi dari kurikulum. Tidak boleh dihapus, tapi bisa ditambah.',
    cpmk: '💡 CPMK harus terukur. Gunakan KKO Bloom: Mengidentifikasi (C2), Menganalisis (C4), Mencipta (C6).',
    sub_cpmk: '💡 Pecah CPMK menjadi unit-unit kecil yang bisa diselesaikan dalam 1-2 pertemuan. Pilih CPMK induk.',
    deskripsi_mk: '💡 Deskripsikan cakupan materi dan relevansi mata kuliah secara singkat (3-5 kalimat).',
    bahan_kajian: '💡 Tuliskan bahan kajian utama yang harus dikuasai mahasiswa.',
    penilaian: '💡 Format penilaian fleksibel. Bobot total harus 100%. IKU 7: minimal 50% asesmen partisipatif.',
    pustaka: '💡 Pustaka utama minimal 2 buku. Referensi harus terkini (max 5 tahun terakhir).',
    pertemuan: '💡 Klik "Generate dari Sub-CPMK" untuk mengisi otomatis, lalu lengkapi kolom lainnya.',
    ttd: '💡 Tanda tangan pengesahan RPS. Isi otomatis dari data Identitas Dosen (Profil).',
  }

  const validateSectionDeps = (section: string): string | null => {
    const c = project.content
    const deps: Record<string, { label: string; check: () => boolean }[]> = {
      cpl: [{ label: 'Program Studi', check: () => !!c.prodi }],
      cpmk: [{ label: 'CPL', check: () => !!c.cpl }],
      sub_cpmk: [{ label: 'CPMK', check: () => !!c.cpmk }],
      deskripsi_mk: [{ label: 'Mata Kuliah', check: () => !!c.mata_kuliah }],
      bahan_kajian: [{ label: 'CPMK', check: () => !!c.cpmk }],
      penilaian: [{ label: 'CPMK', check: () => !!c.cpmk }],
      pustaka: [{ label: 'Mata Kuliah', check: () => !!c.mata_kuliah }],
    }
    const missing = deps[section]?.filter(d => !d.check()).map(d => d.label)
    if (missing && missing.length > 0) {
      return `Harap isi ${missing.join(', ')} terlebih dahulu sebagai acuan AI.`
    }
    return null
  }

  const handleAIGenerate = async (section: string) => {
    logger.info('EDITOR', 'editor.ai_generate_clicked', { section })
    if (!isAIConfigured()) {
      logger.warn('EDITOR', 'editor.ai_not_configured', { section })
      setAiError('AI belum dikonfigurasi. Buka Settings untuk mengatur.')
      return
    }
    const depError = validateSectionDeps(section)
    if (depError) {
      setAiError(depError)
      return
    }
    logger.info('EDITOR', 'editor.ai_generate_start', { section })
    setAiLoading(true)
    setAiError('')
    const startTime = Date.now()
    try {
      const opts = getSectionPrompt(section, project.content)
      const result = await generateWithAI(opts)
      
      // Penilaian needs JSON parsing
      if (section === 'penilaian') {
        try {
          const parsed = JSON.parse(result)
          if (Array.isArray(parsed)) {
            updatePenilaian(parsed)
          } else {
            updateField(section, result)
          }
        } catch {
          updateField(section, result)
        }
      // Pustaka has two fields
      } else if (section === 'pustaka') {
        try {
          const parsed = JSON.parse(result)
          if (parsed.pustaka_utama) updateField('pustaka_utama', parsed.pustaka_utama)
          if (parsed.pustaka_pendukung) updateField('pustaka_pendukung', parsed.pustaka_pendukung)
        } catch {
          updateField('pustaka_utama', result)
        }
      } else {
        updateField(section, result)
      }
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)
      logger.info('EDITOR', 'editor.ai_generate_end', { section, duration, success: true })
      safeToast(`AI berhasil mengisi bagian ${section}.`, 'info')
    } catch (err) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)
      logger.error('EDITOR', 'editor.ai_generate_error', { section, error: (err as Error).message, duration })
      setAiError((err as Error).message)
      safeToast('Gagal generate AI: ' + (err as Error).message, 'error')
    } finally {
      setAiLoading(false)
    }
  }

  const monthNames: Record<string, string> = {
    '01': 'JANUARI', '02': 'FEBRUARI', '03': 'MARET', '04': 'APRIL',
    '05': 'MEI', '06': 'JUNI', '07': 'JULI', '08': 'AGUSTUS',
    '09': 'SEPTEMBER', '10': 'OKTOBER', '11': 'NOVEMBER', '12': 'DESEMBER',
  }

  const formatCoverDate = (dateStr: string) => {
    if (!dateStr) return 'BULAN TAHUN'
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const month = monthNames[parts[1]] || parts[1]
      return `${month}, ${parts[0]}`
    }
    return dateStr
  }

  const c = project.content

  const dismissGuide = (sectionId: string) => {
    logger.debug('EDITOR', 'editor.guide_dismiss', { section: sectionId })
    setDismissedGuides(prev => new Set(prev).add(sectionId))
  }

  const handleSectionSwitch = (sectionId: string) => {
    if (activeSection !== sectionId) {
      logger.info('EDITOR', 'editor.section_switch', { from: activeSection, to: sectionId })
      setActiveSection(sectionId)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" onContextMenu={handleContextMenu}>
      <Ribbon
        onSave={onSave}
        onExport={onExport}
        onOpenAISettings={onOpenAISettings}
        onGoHome={onGoHome}
        activeSection={activeSection}
        onGenerateAI={() => handleAIGenerate(activeSection)}
        aiLoading={aiLoading}
        onCut={handleCut}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onPreview={onPreview}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onShowShortcuts={() => setShowShortcuts(true)}
      />

      <div className="flex-1 overflow-y-auto bg-[#e8e8e8] flex flex-col items-center">
        {/* Section Guide - above canvas */}
        {sectionGuides[activeSection] && !dismissedGuides.has(activeSection) && (
          <div className={`section-guide-alert ${activeSection === 'cover' ? 'w-cover' : 'w-landscape'}`}>
            <span className="section-guide-text">{sectionGuides[activeSection]}{' '}
              {guideSections.includes(activeSection) ? (
                <a href="#" onClick={(e) => { e.preventDefault(); onOpenGuide?.(activeSection) }} className="section-guide-link">Selengkapnya</a>
              ) : (
                <a href="#" onClick={(e) => e.preventDefault()} className="section-guide-link">Selengkapnya</a>
              )}
            </span>
            <button onClick={() => dismissGuide(activeSection)} className="section-guide-close">&times;</button>
          </div>
        )}

        <div className={`paper-canvas ${activeSection === 'cover' ? '' : 'landscape'}`} style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
          {/* === COVER PAGE === */}
          {activeSection === 'cover' && (
            <div className="rps-cover">
              <div className="rps-cover-title">
                <p><strong>RENCANA PEMBELAJARAN SEMESTER (RPS)</strong></p>
                <p><strong>{c.semester === 'Ganjil' ? 'GANJIL' : c.semester === 'Genap' ? 'GENAP' : 'GANJIL/GENAP'}</strong></p>
                <p><strong>{c.semester_akademik || 'TAHUN AKADEMIK 20__-20__'}</strong></p>
                <p><strong>{c.mata_kuliah || 'MATAKULIAH'} ({c.kode_mk || 'KODE MATAKULIAH'})</strong></p>
                <p><strong>PRODI {c.prodi || 'PROGRAM STUDI'}</strong></p>
              </div>
              <div className="rps-cover-logo">
                <img src="./logo-unisina.png" alt="Logo STIKes" className="w-48 h-48 object-contain" />
                <p><strong>Disusun Oleh :</strong></p>
                {c.pengembang_rps && <p><strong>{c.pengembang_rps}</strong></p>}
                {c.nidn_pengembang && <p>NIDN. {c.nidn_pengembang}</p>}
              </div>
              <div className="rps-cover-footer">
                <p><strong>STIKes IBNU SINA AJIBARANG</strong></p>
                <p><strong>{formatCoverDate(c.tgl_penyusunan)}</strong></p>
              </div>
            </div>
          )}

          {/* === IDENTITAS SECTION CONTENT === */}
          {activeSection === 'identitas' && (
            <section className="editor-content">
              <h2 className="text-lg font-bold mb-4">I. IDENTITAS MATA KULIAH</h2>
              <table className="w-full">
                <tbody>
                  {[
                    ['prodi', 'Program Studi'],
                    ['mata_kuliah', 'Mata Kuliah (MK)'],
                    ['kode_mk', 'Kode'],
                    ['rumpun_mk', 'Rumpun MK'],
                    ['sks_t', 'Bobot SKS Teori (T)'],
                    ['sks_p', 'Bobot SKS Praktik (P)'],
                    ['semester', 'Semester'],
                    ['dosen_pengampu', 'Dosen Pengampu'],
                    ['pengembang_rps', 'Pengembang RPS'],
                    ['nidn_pengembang', 'NIDN Pengembang'],
                    ['kaprodi', 'Kaprodi'],
                    ['nidn_kaprodi', 'NIDN Kaprodi'],
                    ['ketua_stikes', 'Ketua STIKes'],
                    ['nidn_ketua_stikes', 'NIDN Ketua STIKes'],
                    ['wakil_ketua_i', 'Wakil Ketua I'],
                    ['nidn_wakil_ketua_i', 'NIDN Wakil Ketua I'],
                    ['semester_akademik', 'Semester Akademik'],
                    ['tgl_penyusunan', 'Tanggal Penyusunan'],
                    ['matakuliah_syarat', 'Mata Kuliah Prasyarat'],
                  ].map(([key, label]) => (
                    <tr key={key}>
                      <td className="w-56 font-medium text-gray-700">{label}</td>
                      <td>
                        <input
                          type="text"
                          value={c[key] || ''}
                          onChange={(e) => updateField(key, e.target.value)}
                          placeholder={label}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* === OTORISASI === */}
          {activeSection === 'otorisasi' && (
            <section className="editor-content">
              <h2 className="text-lg font-bold mb-4">II. OTORISASI</h2>
              <p className="text-sm text-gray-500 mb-3">Data otorisasi diambil dari tab Identitas. Koordinator RMK diisi di sini.</p>
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="w-56 font-medium text-gray-700">Koordinator RMK</td>
                    <td>
                      <input
                        type="text"
                        value={c.koordinator_rmk || ''}
                        onChange={(e) => updateField('koordinator_rmk', e.target.value)}
                        placeholder="Koordinator RMK"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          {/* === CPL === */}
          {activeSection === 'cpl' && (
            <section className="editor-content">
              <h2 className="text-lg font-bold mb-4">III. CAPAIAN PEMBELAJARAN LULUSAN (CPL)</h2>
              <p className="text-sm text-gray-500 mb-3">CPL-Prodi yang dibebankan pada mata kuliah ini:</p>
              <StructuredList
                listKey="cpl"
                prefix="CPL"
                items={getStructuredList('cpl')}
                onChange={(items) => updateStructuredList('cpl', items)}
                onCellEdit={(idx, value) => listCellRef.current('cpl', idx, value)}
                showJudul={false}
              />
            </section>
          )}

          {/* === CPMK === */}
          {activeSection === 'cpmk' && (
            <section className="editor-content">
              <h2 className="text-lg font-bold mb-4">IV. CAPAIAN PEMBELAJARAN MATA KULIAH (CPMK)</h2>
              <p className="text-sm text-gray-500 mb-3">CPMK merupakan turunan/uraian spesifik dari CPL-Prodi:</p>
              <StructuredList
                listKey="cpmk"
                prefix="CPMK"
                items={getStructuredList('cpmk')}
                onChange={(items) => updateStructuredList('cpmk', items)}
                onCellEdit={(idx, value) => listCellRef.current('cpmk', idx, value)}
                showJudul={false}
              />
            </section>
          )}

          {/* === SUB-CPMK === */}
          {activeSection === 'sub_cpmk' && (
            <section className="editor-content">
              <h2 className="text-lg font-bold mb-4">V. KEMAMPUAN AKHIR TIAP TAHAPAN BELAJAR (SUB-CPMK)</h2>
              <StructuredList
                listKey="sub_cpmk"
                prefix="Sub-CPMK"
                items={getStructuredList('sub_cpmk')}
                onChange={(items) => updateStructuredList('sub_cpmk', items)}
                onCellEdit={(idx, value) => listCellRef.current('sub_cpmk', idx, value)}
                showJudul={false}
              />
            </section>
          )}

          {/* === DESKRIPSI MK === */}
          {activeSection === 'deskripsi_mk' && (
            <section className="editor-content">
              <h2 className="text-lg font-bold mb-4">VI. DESKRIPSI SINGKAT MATA KULIAH</h2>
              <p className="text-sm text-gray-500 mb-3">Tuliskan relevansi dan cakupan materi/bahan kajian secara singkat:</p>
              <RTE
                content={c.deskripsi_mk || ''}
                onUpdate={(html) => updateField('deskripsi_mk', html)}
                placeholder="Deskripsikan mata kuliah ini dalam 3-5 kalimat..."
              />
            </section>
          )}

          {/* === BAHAN KAJIAN === */}
          {activeSection === 'bahan_kajian' && (
            <section className="editor-content">
              <h2 className="text-lg font-bold mb-4">VII. BAHAN KAJIAN / MATERI PEMBELAJARAN</h2>
              <StructuredList
                listKey="bahan_kajian"
                prefix="Bahan Kajian"
                items={getStructuredList('bahan_kajian')}
                onChange={(items) => updateStructuredList('bahan_kajian', items)}
                onCellEdit={(idx, value) => listCellRef.current('bahan_kajian', idx, value)}
                showJudul={false}
              />
            </section>
          )}

          {/* === PENILAIAN === */}
          {activeSection === 'penilaian' && (
            <section className="editor-content">
              <h2 className="text-lg font-bold mb-4">VIII. PENILAIAN</h2>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Format Nilai</span>
                  <span className="text-sm text-gray-500">
                    Total: {getPenilaian().reduce((sum, p) => sum + p.bobot, 0)}%
                  </span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left text-sm font-medium text-gray-700 p-2 w-12"></th>
                      <th className="text-left text-sm font-medium text-gray-700 p-2">No</th>
                      <th className="text-left text-sm font-medium text-gray-700 p-2">Komponen Penilaian</th>
                      <th className="text-left text-sm font-medium text-gray-700 p-2 w-24">Bobot (%)</th>
                      <th className="text-left text-sm font-medium text-gray-700 p-2 w-16">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPenilaian().map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">
                          <RowActions
                            idx={idx}
                            total={getPenilaian().length}
                            onMoveUp={() => {
                              if (idx === 0) return
                              const items = [...getPenilaian()]
                              const [moved] = items.splice(idx, 1)
                              items.splice(idx - 1, 0, moved)
                              logger.debug('EDITOR', 'editor.penilaian.move', { from: idx, to: idx - 1 })
                              updatePenilaian(items)
                            }}
                            onMoveDown={() => {
                              const items = [...getPenilaian()]
                              if (idx >= items.length - 1) return
                              const [moved] = items.splice(idx, 1)
                              items.splice(idx + 1, 0, moved)
                              logger.debug('EDITOR', 'editor.penilaian.move', { from: idx, to: idx + 1 })
                              updatePenilaian(items)
                            }}
                          />
                        </td>
                        <td className="p-2 text-sm text-gray-500">{idx + 1}</td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.item}
                            onChange={(e) => {
                              const items = [...getPenilaian()]
                              items[idx].item = e.target.value
                              updatePenilaian(items)
                            }}
                            className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none rounded text-sm"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={item.bobot}
                            onChange={(e) => {
                              const items = [...getPenilaian()]
                              items[idx].bobot = parseInt(e.target.value) || 0
                              updatePenilaian(items)
                            }}
                            className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none rounded text-sm"
                            min="0"
                            max="100"
                          />
                        </td>
                        <td className="p-2">
                          <button
                            onClick={() => {
                              const items = getPenilaian().filter((_, i) => i !== idx)
                              logger.debug('EDITOR', 'editor.penilaian.remove', { index: idx, remaining: items.length })
                              updatePenilaian(items)
                            }}
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
                  onClick={() => {
                    const items = [...getPenilaian(), { item: '', bobot: 0 }]
                    logger.debug('EDITOR', 'editor.penilaian.add', { itemCount: items.length })
                    updatePenilaian(items)
                  }}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  + Tambah Komponen
                </button>
              </div>
            </section>
          )}

          {/* === PUSTAKA === */}
          {activeSection === 'pustaka' && (
            <section className="editor-content">
              <h2 className="text-lg font-bold mb-4">IX. PUSTAKA</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Pustaka Utama</label>
                <RTE
                  content={c.pustaka_utama || ''}
                  onUpdate={(html) => updateField('pustaka_utama', html)}
                  placeholder="Tuliskan pustaka utama yang digunakan..."
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Pustaka Pendukung</label>
                <RTE
                  content={c.pustaka_pendukung || ''}
                  onUpdate={(html) => updateField('pustaka_pendukung', html)}
                  placeholder="Tuliskan pustaka pendukung jika ada..."
                />
              </div>
            </section>
          )}

          {/* === TABEL PERTEMUAN === */}
          {activeSection === 'pertemuan' && (
            <section className="editor-content">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">XI. JADWAL PERTEMUAN</h2>
                <button onClick={generatePertemuan} className="btn btn-primary text-sm">
                  Generate dari Sub-CPMK
                </button>
              </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: '1600px' }}>
              <thead>
                <tr className="bg-gray-100">
                  <th rowSpan={2} className="border p-2 w-10">No</th>
                  <th colSpan={2} rowSpan={2} className="border p-2 w-40">Kemampuan Akhir (Sub-CPMK)</th>
                  <th colSpan={6} className="border p-2 w-72">Penilaian</th>
                  <th colSpan={4} className="border p-2 w-56">Bentuk Pembelajaran, Metode Pembelajaran, Penugasan Mahasiswa, [Estimasi Waktu]</th>
                  <th colSpan={2} rowSpan={2} className="border p-2 w-40">Materi [Pustaka]</th>
                  <th rowSpan={2} className="border p-2 w-16">Bobot</th>
                </tr>
                <tr className="bg-gray-100">
                  <th colSpan={2} className="border p-2">Indikator</th>
                  <th colSpan={4} className="border p-2">Kriteria & Teknik</th>
                  <th className="border p-2">Luring</th>
                  <th colSpan={3} className="border p-2">Daring</th>
                </tr>
              </thead>
              <tbody>
                {getPertemuan().map((row, idx) => {
                  if (row.type === 'uts' || row.type === 'uas') {
                    return (
                      <tr key={idx} className="bg-gray-50">
                        <td className="border p-2 text-center text-gray-500" colSpan={14}>
                          <strong>{row.label}</strong>
                        </td>
                      </tr>
                    )
                  }
                  const item = row as PertemuanItem
                  return (
                    <tr key={idx}>
                      <td className="border p-1 text-center text-gray-500">{item.no}</td>
                      <td colSpan={2} className="border p-1">
                        <RTE
                          content={item.subCpmk}
                          onUpdate={(html) => pertCellRef.current(idx, 'subCpmk', html)}
                          placeholder={`Sub-CPMK pertemuan ${item.no}`}
                          compact
                        />
                      </td>
                      <td colSpan={2} className="border p-1">
                        <RTE
                          content={item.indikator}
                          onUpdate={(html) => pertCellRef.current(idx, 'indikator', html)}
                          placeholder="Indikator"
                          compact
                        />
                      </td>
                      <td colSpan={4} className="border p-1">
                        <RTE
                          content={item.kriteriaTeknik}
                          onUpdate={(html) => pertCellRef.current(idx, 'kriteriaTeknik', html)}
                          placeholder="Kriteria & Teknik"
                          compact
                        />
                      </td>
                      <td className="border p-1">
                        <RTE
                          content={item.bentukMetodePenugasan}
                          onUpdate={(html) => pertCellRef.current(idx, 'bentukMetodePenugasan', html)}
                          placeholder="Bentuk/Metode/Penugasan"
                          compact
                        />
                      </td>
                      <td colSpan={3} className="border p-1">
                        <RTE
                          content={item.daring}
                          onUpdate={(html) => pertCellRef.current(idx, 'daring', html)}
                          placeholder="Daring"
                          compact
                        />
                      </td>
                      <td colSpan={2} className="border p-1">
                        <RTE
                          content={item.materiPustaka}
                          onUpdate={(html) => pertCellRef.current(idx, 'materiPustaka', html)}
                          placeholder="Materi [Pustaka]"
                          compact
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          type="number"
                          value={item.bobot}
                          onChange={(e) => updatePertemuanField(idx, 'bobot', parseInt(e.target.value) || 0)}
                          className="w-full px-1 py-0.5 text-xs border-0 focus:outline-none text-center"
                          min="0"
                          max="100"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
            </section>
          )}

          {/* === TANDA TANGAN === */}
          {activeSection === 'ttd' && (
            <section className="editor-content">
              <h2 className="text-lg font-bold mb-4">XII. PENGESAHAN</h2>
              <p className="text-sm text-gray-500 mb-4">Menyetujui dan mengetahui Rencana Pembelajaran Semester ini:</p>
              <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                <tbody>
                  <tr>
                    <td className="w-1/2 border p-4 text-center">
                      <p className="text-sm text-gray-500 mb-2">Dibuat di Tempat,</p>
                      <div className="h-20"></div>
                      <div className="border-t w-full mx-auto mb-2"></div>
                      <p className="font-medium">{c.pengembang_rps || '.........................'}</p>
                      <p className="text-xs text-gray-500">NIDN. {c.nidn_pengembang || '...........'}</p>
                      <p className="text-xs text-gray-500">Pengembang RPS</p>
                    </td>
                    <td className="w-1/2 border p-4 text-center">
                      <p className="text-sm text-gray-500 mb-2">Dibuat di Tempat,</p>
                      <div className="h-20"></div>
                      <div className="border-t w-full mx-auto mb-2"></div>
                      <p className="font-medium">{c.dosen_pengampu || '.........................'}</p>
                      <p className="text-xs text-gray-500">NIDN. {c.nidn_pengembang || '...........'}</p>
                      <p className="text-xs text-gray-500">Dosen Pengampu</p>
                    </td>
                  </tr>
                  <tr>
                    <td className="w-1/2 border p-4 text-center">
                      <p className="text-sm text-gray-500 mb-2">Mengetahui,</p>
                      <div className="h-20"></div>
                      <div className="border-t w-full mx-auto mb-2"></div>
                      <p className="font-medium">{c.kaprodi || '.........................'}</p>
                      <p className="text-xs text-gray-500">NIDN. {c.nidn_kaprodi || '...........'}</p>
                      <p className="text-xs text-gray-500">Kaprodi {c.prodi || 'S1 Farmasi'}</p>
                    </td>
                    <td className="w-1/2 border p-4 text-center">
                      <p className="text-sm text-gray-500 mb-2">Mengetahui,</p>
                      <div className="h-20"></div>
                      <div className="border-t w-full mx-auto mb-2"></div>
                      <p className="font-medium">{c.wakil_ketua_i || '.........................'}</p>
                      <p className="text-xs text-gray-500">NIDN. {c.nidn_wakil_ketua_i || '...........'}</p>
                      <p className="text-xs text-gray-500">Wakil Ketua I Bidang Akademik</p>
                    </td>
                  </tr>
                  <tr>
                    <td className="w-1/2 border p-4 text-center" colSpan={2}>
                      <p className="text-sm text-gray-500 mb-2">Mengetahui,</p>
                      <div className="h-20"></div>
                      <div className="border-t w-1/2 mx-auto mb-2"></div>
                      <p className="font-medium">{c.ketua_stikes || '.........................'}</p>
                      <p className="text-xs text-gray-500">NIDN. {c.nidn_ketua_stikes || '...........'}</p>
                      <p className="text-xs text-gray-500">Ketua STIKes Ibnu Sina Ajibarang</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}
        </div>
      </div>

      {/* Bottom tab bar */}
      <div className="section-tabs">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => handleSectionSwitch(section.id)}
            className={activeSection === section.id ? 'active' : ''}
          >
            {section.label}
          </button>
        ))}
        {autoSaveActive && (
          <span className="autosave-indicator" title={`Tersimpan otomatis terakhir: ${lastAutoSaveAt || '-'}`}>
            <span className="autosave-dot" /> Auto-save aktif{lastAutoSaveAt ? ` · ${lastAutoSaveAt}` : ''}
          </span>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={closeContextMenu}>
          <button className="context-menu-item" onClick={() => { handleCut(); closeContextMenu() }}>
            <span className="context-menu-icon">✂</span> Cut
          </button>
          <button className="context-menu-item" onClick={() => { handleCopy(); closeContextMenu() }}>
            <span className="context-menu-icon">📄</span> Copy
          </button>
          <button className="context-menu-item" onClick={() => { handlePaste(); closeContextMenu() }}>
            <span className="context-menu-icon">📋</span> Paste
          </button>
        </div>
      )}

      {/* Keyboard shortcuts reference */}
      <ShortcutsDialog open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  )
}
