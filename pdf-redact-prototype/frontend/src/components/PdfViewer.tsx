import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { applyRedactions } from '../api'
import { usePdfDocument } from '../hooks/usePdfDocument'
import { useSelectionBoxes } from '../hooks/useSelectionBoxes'
import type { UploadResponse } from '../types'
import { canvasToPdfCoords } from '../utils/coordinateTransform'
import PageCanvas from './PageCanvas'
import ThumbnailSidebar from './ThumbnailSidebar'
import Toolbar from './Toolbar'

interface Props {
  uploadResp: UploadResponse
  pdfFile: File
  onReset: () => void
}

const ZOOM_STEP    = 0.25
const ZOOM_MIN     = 0.4
const ZOOM_MAX     = 3.0
const ZOOM_DEFAULT = 1.0

export default function PdfViewer({ uploadResp, pdfFile, onReset }: Props) {
  const [currentPage,   setCurrentPage]   = useState(0)
  const [zoom,          setZoom]          = useState(ZOOM_DEFAULT)
  const [previewMode,   setPreviewMode]   = useState(false)
  const [stripMetadata, setStripMetadata] = useState(false)
  const [isProcessing,  setIsProcessing]  = useState(false)

  const { pdfDoc, isLoading, error } = usePdfDocument(pdfFile)

  const {
    boxes,
    drawingState,
    onOverlayMouseDown,
    undo,
    clearAll,
    getBoxesForPage,
  } = useSelectionBoxes(zoom)

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + ZOOM_STEP, ZOOM_MAX))
      if (e.key === '-')                  setZoom(z => Math.max(z - ZOOM_STEP, ZOOM_MIN))
      if (e.key === '0')                  setZoom(ZOOM_DEFAULT)
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown')
        setCurrentPage(p => Math.min(p + 1, uploadResp.page_count - 1))
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
        setCurrentPage(p => Math.max(p - 1, 0))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [uploadResp.page_count])

  // ── Ctrl+Wheel zoom ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      setZoom(z => e.deltaY < 0 ? Math.min(z + ZOOM_STEP, ZOOM_MAX) : Math.max(z - ZOOM_STEP, ZOOM_MIN))
    }
    window.addEventListener('wheel', handler, { passive: false })
    return () => window.removeEventListener('wheel', handler)
  }, [])

  // ── Redact & download ──────────────────────────────────────────────────────
  const handleRedact = useCallback(async () => {
    if (boxes.length === 0) return
    setIsProcessing(true)
    const toastId = toast.loading(`Applying ${boxes.length} redaction${boxes.length !== 1 ? 's' : ''}…`)
    try {
      const redactions = boxes.map(b => canvasToPdfCoords(b))
      await applyRedactions(uploadResp.file_id, redactions, stripMetadata)
      toast.success('Redacted PDF downloaded!', { id: toastId })
    } catch {
      toast.error('Redaction failed. Please try again.', { id: toastId })
    } finally {
      setIsProcessing(false)
    }
  }, [boxes, zoom, uploadResp.file_id, stripMetadata])

  // ── Error / loading states ─────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-50">
        <div className="bg-white rounded-2xl p-8 shadow-card text-center max-w-sm">
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button onClick={onReset} className="bg-navy-700 text-white px-5 py-2 rounded-lg hover:bg-navy-600 transition-colors">
            Start over
          </button>
        </div>
      </div>
    )
  }

  if (isLoading || !pdfDoc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-[3px] border-navy-200 border-t-navy-700 rounded-full animate-spin" />
          <p className="text-navy-500 text-sm">Loading PDF…</p>
        </div>
      </div>
    )
  }

  const pageBoxes = getBoxesForPage(currentPage)

  return (
    <div className="flex flex-col h-screen bg-navy-50 overflow-hidden">
      <Toolbar
        pageCount={uploadResp.page_count}
        currentPage={currentPage}
        onPageChange={i => setCurrentPage(Math.max(0, Math.min(i, uploadResp.page_count - 1)))}
        zoom={zoom}
        onZoomIn={()    => setZoom(z => Math.min(z + ZOOM_STEP, ZOOM_MAX))}
        onZoomOut={()   => setZoom(z => Math.max(z - ZOOM_STEP, ZOOM_MIN))}
        onZoomReset={() => setZoom(ZOOM_DEFAULT)}
        previewMode={previewMode}
        onTogglePreview={() => setPreviewMode(p => !p)}
        stripMetadata={stripMetadata}
        onToggleStripMetadata={() => setStripMetadata(s => !s)}
        boxCount={boxes.length}
        onUndo={undo}
        onClearAll={clearAll}
        onRedact={handleRedact}
        isProcessing={isProcessing}
      />

      <div className="flex flex-1 overflow-hidden">
        <ThumbnailSidebar
          pdfDoc={pdfDoc}
          pageCount={uploadResp.page_count}
          currentPage={currentPage}
          onPageSelect={setCurrentPage}
        />

        <main className="flex-1 overflow-auto p-8 pt-12 flex flex-col items-center">
          {boxes.length === 0 && (
            <div className="mb-6 bg-navy-700/10 border border-navy-200 text-navy-600 text-sm rounded-xl px-5 py-3 max-w-lg text-center">
              Click and drag anywhere on the page to draw a redaction box. Draw multiple boxes, then click <strong>Redact &amp; Download</strong>.
            </div>
          )}

          <PageCanvas
            pdfDoc={pdfDoc}
            pageIndex={currentPage}
            zoom={zoom}
            boxes={pageBoxes}
            drawingState={drawingState}
            previewMode={previewMode}
            onOverlayMouseDown={onOverlayMouseDown}
          />

          <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-navy-300 select-none">
            {([
              ['+/−',       'Zoom'],
              ['Ctrl+Wheel','Zoom'],
              ['← →',       'Navigate pages'],
              ['Del',        'Remove selected box'],
              ['Esc',        'Deselect / cancel'],
              ['Ctrl+Z',     'Undo'],
            ] as [string, string][]).map(([key, desc]) => (
              <span key={key}>
                <kbd className="bg-white border border-navy-200 rounded px-1.5 py-0.5 font-mono text-navy-400">{key}</kbd>
                {' '}{desc}
              </span>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
