import { useState } from 'react'
import type { Project } from '../App'
import { Ribbon } from './Ribbon'
import { RTE } from './RTE'
import { guideSections } from './GuidePage'
import { isAIConfigured, generateWithAI, getSectionPrompt } from '../services/ai'
import { logger } from '../utils/logger'

interface EditorProps {
  project: Project
  onUpdate: (content: Record<string, string>) => void
  onSave: () => void
  onExport?: (format: 'pdf' | 'docx') => void
  onOpenAISettings?: () => void
  onGoHome?: () => void
  onOpenGuide?: (section: string) => void
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
  kriteria: string
  bentuk: string
  metodeOffline: string
  metodeOnline: string
  penugasan: string
  estimasiWaktu: string
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

export function Editor({ project, onUpdate, onSave, onExport, onOpenAISettings, onGoHome, onOpenGuide }: EditorProps) {
  const [activeSection, setActiveSection] = useState('identitas')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [dismissedGuides, setDismissedGuides] = useState<Set<string>>(new Set())
  const [zoom, setZoom] = useState(1) // 100%
  const [undoStack, setUndoStack] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([])
  const [currentContent, setCurrentContent] = useState<string>(JSON.stringify(project.content))
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'warning' | 'error' } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const showToast = (message: string, type: 'info' | 'warning' | 'error' = 'warning') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const closeContextMenu = () => setContextMenu(null)

  const handleCut = async () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    if (!selectedText) {
      showToast('Tidak ada teks yang dipilih. Blok teks terlebih dahulu sebelum Cut.', 'warning')
      return
    }
    try {
      await navigator.clipboard.writeText(selectedText);
      selection.removeAllRanges();
      showToast('Teks berhasil dipotong ke clipboard.', 'info')
    } catch (err) {
      showToast('Gagal memotong teks. Periksa izin clipboard browser.', 'error')
    }
  };

  const handleCopy = async () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    if (!selectedText) {
      showToast('Tidak ada teks yang dipilih. Blok teks terlebih dahulu sebelum Copy.', 'warning')
      return
    }
    try {
      await navigator.clipboard.writeText(selectedText);
      showToast('Teks berhasil disalin ke clipboard.', 'info')
    } catch (err) {
      showToast('Gagal menyalin teks. Periksa izin clipboard browser.', 'error')
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        showToast('Clipboard kosong. Salin teks terlebih dahulu sebelum Paste.', 'warning')
        return
      }
      const activeElement = document.activeElement;
      if (activeElement && typeof (activeElement as HTMLElement).insertAdjacentText === 'function') {
        (activeElement as HTMLElement).insertAdjacentText('end', text);
        showToast('Teks berhasil ditempel.', 'info')
      } else {
        showToast('Tidak ada area input aktif. Klik pada kolom input terlebih dahulu.', 'warning')
      }
    } catch (err) {
      showToast('Gagal menempel teks. Periksa izin clipboard browser.', 'error')
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(undoStack.slice(0, -1));
    setRedoStack(prevState => [...prevState, currentContent]);
    setCurrentContent(prev);
    onUpdate(JSON.parse(prev));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(redoStack.slice(0, -1));
    setUndoStack(prev => [...prev, currentContent]);
    setCurrentContent(next);
    onUpdate(JSON.parse(next));
  };

  const handleZoomIn = () => {
    setZoom(z => Math.min(z + 0.25, 4));
  };

  const handleZoomOut = () => {
    setZoom(z => Math.max(z - 0.25, 0.25));
  };

  const handleZoomReset = () => {
    setZoom(1);
  };

  const updateField = (key: string, value: string) => {
    logger.debug('EDITOR', 'editor.field_update', { field: key })
    const newState = { ...project.content, [key]: value }
    const newContent = JSON.stringify(newState)
    
    // Push to undo stack
    setUndoStack(prev => [...prev, currentContent])
    setRedoStack([])
    
    setCurrentContent(newContent)
    onUpdate(newState)
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
        kriteria: existingItem?.kriteria || '',
        bentuk: existingItem?.bentuk || '',
        metodeOffline: existingItem?.metodeOffline || '',
        metodeOnline: existingItem?.metodeOnline || '',
        penugasan: existingItem?.penugasan || '',
        estimasiWaktu: existingItem?.estimasiWaktu || '',
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
    return getStructuredList('sub_cpmk').map(s => s.deskripsi)
  }

  const StructuredList = ({
    listKey,
    prefix,
    items,
    onChange,
    showCpmkRef = false,
    showJudul = true,
  }: {
    listKey: string
    prefix: string
    items: StructuredItem[]
    onChange: (items: StructuredItem[]) => void
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
              <th className="text-left text-sm font-medium text-gray-700 p-2 w-28">Label</th>
              {showJudul && <th className="text-left text-sm font-medium text-gray-700 p-2 w-48">Judul</th>}
              <th className="text-left text-sm font-medium text-gray-700 p-2">Deskripsi</th>
              <th className="text-left text-sm font-medium text-gray-700 p-2 w-16">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-t">
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
                  <textarea
                    value={item.deskripsi}
                    onChange={(e) => updateDeskripsi(idx, e.target.value)}
                    placeholder={`Deskripsi ${item.label || prefix}${idx + 1}...`}
                    className="w-full px-2 py-1 text-sm border border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none rounded resize-none"
                    rows={2}
                  />
                </td>
                <td className="p-2">
                  <button
                    onClick={() => removeItem(idx)}
                    className="text-red-500 hover:text-red-700 text-sm"
                    title="Hapus"
                  >
                    Hapus
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
    } catch (err) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)
      logger.error('EDITOR', 'editor.ai_generate_error', { section, error: (err as Error).message, duration })
      setAiError((err as Error).message)
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
                      <th className="text-left text-sm font-medium text-gray-700 p-2">No</th>
                      <th className="text-left text-sm font-medium text-gray-700 p-2">Komponen Penilaian</th>
                      <th className="text-left text-sm font-medium text-gray-700 p-2 w-24">Bobot (%)</th>
                      <th className="text-left text-sm font-medium text-gray-700 p-2 w-16">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPenilaian().map((item, idx) => (
                      <tr key={idx} className="border-t">
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
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Hapus
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
                      <th className="border p-2 w-10">No</th>
                      <th className="border p-2 w-40">Kemampuan Akhir</th>
                      <th className="border p-2 w-36">Indikator</th>
                      <th className="border p-2 w-36">Kriteria</th>
                      <th className="border p-2 w-28">Bentuk</th>
                      <th className="border p-2 w-28">Luring</th>
                      <th className="border p-2 w-28">Daring</th>
                      <th className="border p-2 w-32">Penugasan</th>
                      <th className="border p-2 w-20">Waktu</th>
                      <th className="border p-2 w-40">Materi</th>
                      <th className="border p-2 w-16">Bobot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPertemuan().map((row, idx) => {
                      if (row.type === 'uts' || row.type === 'uas') {
                        return (
                          <tr key={idx} className="bg-gray-50">
                            <td className="border p-2 text-center text-gray-500" colSpan={11}>
                              <strong>{row.label}</strong>
                            </td>
                          </tr>
                        )
                      }
                      const item = row as PertemuanItem
                      return (
                        <tr key={idx}>
                          <td className="border p-1 text-center text-gray-500">{item.no}</td>
                          <td className="border p-1">
                            <textarea
                              value={item.subCpmk}
                              onChange={(e) => updatePertemuanField(idx, 'subCpmk', e.target.value)}
                              className="w-full px-1 py-0.5 text-xs border-0 focus:outline-none resize-none"
                              rows={2}
                            />
                          </td>
                          <td className="border p-1">
                            <textarea
                              value={item.indikator}
                              onChange={(e) => updatePertemuanField(idx, 'indikator', e.target.value)}
                              className="w-full px-1 py-0.5 text-xs border-0 focus:outline-none resize-none"
                              rows={2}
                            />
                          </td>
                          <td className="border p-1">
                            <textarea
                              value={item.kriteria}
                              onChange={(e) => updatePertemuanField(idx, 'kriteria', e.target.value)}
                              className="w-full px-1 py-0.5 text-xs border-0 focus:outline-none resize-none"
                              rows={2}
                            />
                          </td>
                          <td className="border p-1">
                            <textarea
                              value={item.bentuk}
                              onChange={(e) => updatePertemuanField(idx, 'bentuk', e.target.value)}
                              className="w-full px-1 py-0.5 text-xs border-0 focus:outline-none resize-none"
                              rows={2}
                            />
                          </td>
                          <td className="border p-1">
                            <textarea
                              value={item.metodeOffline}
                              onChange={(e) => updatePertemuanField(idx, 'metodeOffline', e.target.value)}
                              className="w-full px-1 py-0.5 text-xs border-0 focus:outline-none resize-none"
                              rows={2}
                            />
                          </td>
                          <td className="border p-1">
                            <textarea
                              value={item.metodeOnline}
                              onChange={(e) => updatePertemuanField(idx, 'metodeOnline', e.target.value)}
                              className="w-full px-1 py-0.5 text-xs border-0 focus:outline-none resize-none"
                              rows={2}
                            />
                          </td>
                          <td className="border p-1">
                            <textarea
                              value={item.penugasan}
                              onChange={(e) => updatePertemuanField(idx, 'penugasan', e.target.value)}
                              className="w-full px-1 py-0.5 text-xs border-0 focus:outline-none resize-none"
                              rows={2}
                            />
                          </td>
                          <td className="border p-1">
                            <input
                              type="text"
                              value={item.estimasiWaktu}
                              onChange={(e) => updatePertemuanField(idx, 'estimasiWaktu', e.target.value)}
                              className="w-full px-1 py-0.5 text-xs border-0 focus:outline-none"
                              placeholder="2x50'"
                            />
                          </td>
                          <td className="border p-1">
                            <textarea
                              value={item.materiPustaka}
                              onChange={(e) => updatePertemuanField(idx, 'materiPustaka', e.target.value)}
                              className="w-full px-1 py-0.5 text-xs border-0 focus:outline-none resize-none"
                              rows={2}
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

      {/* Toast notification */}
      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          <span className="toast-icon">
            {toast.type === 'info' && '✓'}
            {toast.type === 'warning' && '⚠'}
            {toast.type === 'error' && '✕'}
          </span>
          <span className="toast-message">{toast.message}</span>
        </div>
      )}
    </div>
  )
}
