import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, ZoomIn, ZoomOut,
  Eye, EyeOff, Undo2, Trash2, ShieldCheck, X, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { usePdfDocument } from '../hooks/usePdfDocument'
import { useSelectionBoxes } from '../hooks/useSelectionBoxes'
import { canvasToPdfCoords } from '../utils/redactionCoordinates'
import type { RedactionPayload } from '../types/redaction'
import PageCanvas from './redaction/PageCanvas'
import ThumbnailSidebar from './redaction/ThumbnailSidebar'

interface Props {
  open: boolean
  file: File
  fileId: string
  onClose: () => void
  onConfirm: (boxes: RedactionPayload[]) => void
  confirmLabel?: string
}

interface AutoBox {
  page_index: number
  x0: number
  y0: number
  x1: number
  y1: number
}

const ZOOM_STEP    = 0.25
const ZOOM_MIN     = 0.4
const ZOOM_MAX     = 3.0
const ZOOM_DEFAULT = 1.0

export function ManualRedactionModal({ open, file, fileId, onClose, onConfirm, confirmLabel = 'Redact & Continue' }: Props) {
  const [currentPage, setCurrentPage]           = useState(0)
  const [zoom, setZoom]                         = useState(ZOOM_DEFAULT)
  const [previewMode, setPreviewMode]           = useState(false)
  const [pageCount, setPageCount]               = useState(0)
  const [autoBoxes, setAutoBoxes]               = useState<AutoBox[]>([])
  const [loadingAutoRedact, setLoadingAutoRedact] = useState(false)

  // Always use the original File directly — identical to prototype, always renders perfectly
  const { pdfDoc, isLoading, error } = usePdfDocument(open ? file : null)

  const { boxes, drawingState, onOverlayMouseDown, undo, clearAll, getBoxesForPage } =
    useSelectionBoxes(zoom)

  // Fetch PII coordinates in background — no PDF modification, no rendering change
  useEffect(() => {
    if (!open || !fileId) return
    setAutoBoxes([])
    setLoadingAutoRedact(true)

    fetch(`/api/redact-preview-coords/${fileId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: { boxes: AutoBox[] }) => {
        const found = data.boxes ?? []
        setAutoBoxes(found)
        toast(found.length > 0 ? `${found.length} PII items found` : 'No PII found in this PDF', { icon: found.length > 0 ? '🛡️' : 'ℹ️' })
      })
      .catch(() => toast.error('PII scan failed — check backend'))
      .finally(() => setLoadingAutoRedact(false))
  }, [open, fileId])

  // Get page count from loaded doc
  useEffect(() => {
    if (pdfDoc) setPageCount(pdfDoc.numPages)
  }, [pdfDoc])

  // Reset view state when modal opens
  useEffect(() => {
    if (open) {
      setCurrentPage(0)
      setZoom(ZOOM_DEFAULT)
    }
  }, [open])

  // Clear drawn boxes whenever a new document is loaded
  useEffect(() => {
    clearAll()
  }, [fileId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + ZOOM_STEP, ZOOM_MAX))
      if (e.key === '-')                  setZoom(z => Math.max(z - ZOOM_STEP, ZOOM_MIN))
      if (e.key === '0')                  setZoom(ZOOM_DEFAULT)
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown')
        setCurrentPage(p => Math.min(p + 1, pageCount - 1))
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
        setCurrentPage(p => Math.max(p - 1, 0))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, pageCount])

  // Ctrl+Wheel zoom
  useEffect(() => {
    if (!open) return
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      setZoom(z => e.deltaY < 0 ? Math.min(z + ZOOM_STEP, ZOOM_MAX) : Math.max(z - ZOOM_STEP, ZOOM_MIN))
    }
    window.addEventListener('wheel', handler, { passive: false })
    return () => window.removeEventListener('wheel', handler)
  }, [open])

  const handleConfirm = useCallback(() => {
    onConfirm(boxes.map(canvasToPdfCoords))
  }, [boxes, onConfirm])

  const pageBoxes     = getBoxesForPage(currentPage)
  const pageAutoBoxes = autoBoxes.filter(b => b.page_index === currentPage)
  const zoomPct       = Math.round(zoom * 100)
  const isReady       = !isLoading && !error && !!pdfDoc
  const hasAutoBoxes  = autoBoxes.length > 0

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0a1628' }}>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/10"
        style={{ background: '#0e1e32' }}>

        {/* Page navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(p => Math.max(p - 1, 0))}
            disabled={currentPage === 0}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-white/60 font-medium px-2 tabular-nums">
            {pageCount > 0 ? `${currentPage + 1} / ${pageCount}` : '—'}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(p + 1, pageCount - 1))}
            disabled={currentPage >= pageCount - 1}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-5 bg-white/10" />

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(z => Math.max(z - ZOOM_STEP, ZOOM_MIN))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(ZOOM_DEFAULT)}
            className="text-xs text-white/50 hover:text-white font-mono w-14 text-center hover:bg-white/10 py-1 rounded transition-colors"
            title="Reset zoom (0)"
          >
            {zoomPct}%
          </button>
          <button
            onClick={() => setZoom(z => Math.min(z + ZOOM_STEP, ZOOM_MAX))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-5 bg-white/10" />

        {/* Preview mode toggle */}
        <button
          onClick={() => setPreviewMode(p => !p)}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
            previewMode ? 'bg-brand-accent/20 text-brand-accent' : 'text-white/50 hover:text-white hover:bg-white/10'
          }`}
        >
          {previewMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          Preview
        </button>

        {/* Undo */}
        <button
          onClick={undo}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Undo2 className="w-3.5 h-3.5" /> Undo
        </button>

        {/* Clear all */}
        {boxes.length > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear all
          </button>
        )}

        <div className="flex-1" />

        {/* Auto-redact status */}
        {loadingAutoRedact && (
          <span className="flex items-center gap-1.5 text-xs text-amber-400/70 bg-amber-400/10 px-2.5 py-1 rounded-full">
            <Loader2 className="w-3 h-3 animate-spin" /> Scanning PII…
          </span>
        )}
        {!loadingAutoRedact && hasAutoBoxes && (
          <span className="text-xs text-emerald-400/70 bg-emerald-400/10 px-2.5 py-1 rounded-full">
            {autoBoxes.length} auto-redacted
          </span>
        )}

        {/* Manual box count — always visible as a stat */}
        <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
          boxes.length > 0 ? 'text-blue-300 bg-blue-400/15 border border-blue-400/20' : 'text-white/25 bg-white/5'
        }`}>
          {boxes.length} manual
        </span>

        {/* Close */}
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors ml-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Thumbnail sidebar */}
        {isReady && pdfDoc && (
          <ThumbnailSidebar
            pdfDoc={pdfDoc}
            pageCount={pageCount}
            currentPage={currentPage}
            onPageSelect={setCurrentPage}
          />
        )}

        {/* PDF canvas area */}
        <main className="flex-1 overflow-auto p-8 pt-10 flex flex-col items-center bg-[#111827]">

          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 mt-20"
              >
                <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
                <p className="text-sm text-white/50">Loading PDF…</p>
              </motion.div>
            )}

            {error && (
              <motion.div key="error"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-red-900/30 border border-red-500/30 rounded-xl px-6 py-4 text-sm text-red-300 mt-20 max-w-sm text-center"
              >
                {error}
              </motion.div>
            )}

            {isReady && pdfDoc && (
              <motion.div key="canvas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col items-center">
                {boxes.length === 0 && !previewMode && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="mb-6 bg-white/5 border border-white/10 text-white/50 text-sm rounded-xl px-5 py-3 max-w-lg text-center"
                  >
                    {hasAutoBoxes
                      ? <>Black boxes are <strong className="text-white/70">auto-redacted PII</strong>. Click and drag to draw <strong className="text-white/70">additional manual boxes</strong>.</>
                      : <>Click and drag to draw a <strong className="text-white/70">redaction box</strong>.</>
                    }
                  </motion.div>
                )}

                <PageCanvas
                  pdfDoc={pdfDoc}
                  pageIndex={currentPage}
                  zoom={zoom}
                  boxes={pageBoxes}
                  drawingState={drawingState}
                  previewMode={previewMode}
                  onOverlayMouseDown={onOverlayMouseDown}
                  autoBoxes={pageAutoBoxes}
                />

                {/* Keyboard shortcut hints */}
                <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-white/20 select-none">
                  {([
                    ['+/−', 'Zoom'], ['0', 'Reset zoom'], ['Ctrl+Wheel', 'Zoom'], ['← →', 'Pages'],
                    ['Del', 'Remove box'], ['Esc', 'Deselect'], ['Ctrl+Z', 'Undo'],
                  ] as [string, string][]).map(([key, desc]) => (
                    <span key={key}>
                      <kbd className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 font-mono text-white/30">{key}</kbd>
                      {' '}{desc}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t border-white/10"
        style={{ background: '#0e1e32' }}>
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm font-medium text-white/40 hover:text-white/70 transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Skip Manual Redaction
        </button>

        <button
          onClick={handleConfirm}
          className="flex items-center gap-2 font-bold px-6 py-2.5 rounded-xl text-sm text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #2ECC71, #27AE60)', boxShadow: '0 4px 16px rgba(46,204,113,0.3)' }}
        >
          <ShieldCheck className="w-4 h-4" />
          {boxes.length > 0 ? `${confirmLabel} (${boxes.length} added)` : confirmLabel}
        </button>
      </div>
    </div>
  )
}
