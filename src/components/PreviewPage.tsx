import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { buildRpsHtml } from '../services/rpsDocument'
import { BackIcon, PreviewIcon, ExportWordIcon, ExportPdfIcon } from './icons'

/** A4 width at 96dpi: 210mm ≈ 794px */
const A4_W = 794

interface PreviewPageProps {
  content: Record<string, string>
  onBack: () => void
  onExportWord: () => void
  onExportPdf: () => void
}

export function PreviewPage({ content, onBack, onExportWord, onExportPdf }: PreviewPageProps) {
  const html = useMemo(() => buildRpsHtml(content), [content])
  const mk = content.mata_kuliah || 'RPS'

  const [zoom, setZoom] = useState(0.75)
  const [busy, setBusy] = useState<'word' | 'pdf' | null>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight })

  // Fit-to-width zoom on resize
  useEffect(() => {
    const onResize = () => {
      const h = toolbarRef.current?.offsetHeight || 52
      const availW = window.innerWidth - 48
      const availH = window.innerHeight - h - 24
      setViewport({ w: availW, h: availH })
      setZoom(Math.min(1, availW / A4_W))
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const step = (dir: 1 | -1) => {
    setZoom(z => {
      const next = Math.round((z + dir * 0.1) * 100) / 100
      return Math.min(1.5, Math.max(0.4, next))
    })
  }

  const fit = useCallback(() => {
    setZoom(Math.min(1, viewport.w / A4_W))
  }, [viewport.w])

  const runExport = async (kind: 'word' | 'pdf') => {
    if (busy) return
    setBusy(kind)
    try {
      if (kind === 'word') await onExportWord()
      else await onExportPdf()
    } finally {
      setBusy(null)
    }
  }

  // iframe keeps its own page scroll; we scale it with CSS `zoom` (Chromium)
  const iframeCssHeight = Math.max(300, viewport.h / zoom)
  const renderedW = A4_W * zoom

  return (
    <div className="pv-root">
      {/* Toolbar */}
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
          <span className="pv-sep" />
          <button className="pv-btn pv-btn-icon" onClick={() => step(-1)} title="Perkecil">−</button>
          <button className="pv-btn pv-btn-icon" onClick={() => step(1)} title="Perbesar">+</button>
          <button className="pv-btn pv-btn-icon" onClick={fit} title="Sesuaikan lebar">⤢</button>
          <span className="pv-zoom-label">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      {/* Document */}
      <div className="pv-canvas">
        <div className="pv-page-slot" style={{ width: renderedW, height: viewport.h }}>
          <iframe
            title="Preview RPS"
            srcDoc={html}
            style={{ width: A4_W, height: iframeCssHeight, zoom, border: 'none', background: '#e8e8e8' }}
          />
        </div>
      </div>
    </div>
  )
}
