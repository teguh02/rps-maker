import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { buildRpsHtml } from '../services/rpsDocument'
import { BackIcon, PreviewIcon, ExportWordIcon, ExportPdfIcon, ExportTxtIcon } from './icons'

interface PreviewPageProps {
  content: Record<string, string>
  onBack: () => void
  onExportWord: () => void
  onExportPdf: () => void
  onExportTxt: () => void
}

export function PreviewPage({ content, onBack, onExportWord, onExportPdf, onExportTxt }: PreviewPageProps) {
  const html = useMemo(() => buildRpsHtml(content), [content])
  const mk = content.mata_kuliah || 'RPS'

  const [zoom, setZoom] = useState(1)
  const [busy, setBusy] = useState<'word' | 'pdf' | null>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [canvasH, setCanvasH] = useState(window.innerHeight)

  useEffect(() => {
    const onResize = () => {
      const h = toolbarRef.current?.offsetHeight || 52
      setCanvasH(window.innerHeight - h)
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const step = (dir: 1 | -1) => {
    setZoom(z => {
      const next = Math.round((z + dir * 0.1) * 100) / 100
      return Math.min(2, Math.max(0.25, next))
    })
  }

  const fit = useCallback(() => setZoom(1), [])

  const runExport = async (kind: 'word' | 'pdf' | 'txt') => {
    if (busy) return
    setBusy(kind)
    try {
      if (kind === 'word') await onExportWord()
      else if (kind === 'pdf') await onExportPdf()
      else await onExportTxt()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="pv-root">
      <div className="pv-toolbar" ref={toolbarRef}>
        <button className="pv-btn" onClick={onBack}>
          <BackIcon size={17} /> Kembali
        </button>
        <div className="pv-title">
          <PreviewIcon size={17} />
          <span className="pv-title-text">Pratinjau RPS</span>
          <span className="pv-title-mk" title={mk}>{mk}</span>
        </div>
        <div className="pv-actions">
          <button className="pv-btn" onClick={() => void runExport('word')} disabled={busy !== null}>
            <ExportWordIcon size={16} />
            {busy === 'word' ? 'Menyiapkan…' : 'Ekspor Word'}
          </button>
          <button className="pv-btn pv-btn-primary" onClick={() => void runExport('pdf')} disabled={busy !== null}>
            <ExportPdfIcon size={16} />
            {busy === 'pdf' ? 'Membuat PDF…' : 'Ekspor PDF'}
          </button>
          <button className="pv-btn" onClick={() => void runExport('txt')} disabled={busy !== null}>
            <ExportTxtIcon size={16} />
            {busy === 'txt' ? 'Menyiapkan…' : 'Ekspor TXT'}
          </button>
          <span className="pv-sep" />
          <button className="pv-btn pv-btn-icon" onClick={() => step(-1)} title="Perkecil">−</button>
          <button className="pv-btn pv-btn-icon" onClick={() => step(1)} title="Perbesar">+</button>
          <button className="pv-btn pv-btn-icon" onClick={fit} title="Sesuaikan lebar">⤢</button>
          <span className="pv-zoom-label">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      <div className="pv-canvas">
        <div className="pv-page-slot" style={{ width: '100%', height: canvasH }}>
          <iframe
            title="Preview RPS"
            srcDoc={html}
            style={{ width: '100%', height: '100%', zoom, border: 'none', background: '#fff' }}
          />
        </div>
      </div>
    </div>
  )
}
