import { memo, useCallback, useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { usePdfRenderer } from '../../hooks/usePdfRenderer'
import type { DrawingState, SelectionBox } from '../../types/redaction'
import SelectionOverlay from './SelectionOverlay'

const PdfCanvasCore = memo(function PdfCanvasCore({
  pdfDoc, pageIndex, zoom, onSize,
}: {
  pdfDoc: PDFDocumentProxy
  pageIndex: number
  zoom: number
  onSize: (w: number, h: number) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { isRendering, cssWidth, cssHeight } = usePdfRenderer(pdfDoc, pageIndex, zoom, canvasRef)

  useEffect(() => {
    if (cssWidth > 0 && cssHeight > 0) onSize(cssWidth, cssHeight)
  }, [cssWidth, cssHeight, onSize])

  return (
    <>
      <canvas ref={canvasRef} className="block rounded-sm" />
      {isRendering && (
        <div className="absolute inset-0 bg-navy-50/60 flex items-center justify-center rounded-sm" style={{ zIndex: 1 }}>
          <div className="w-8 h-8 border-[3px] border-navy-300 border-t-navy-700 rounded-full animate-spin" />
        </div>
      )}
    </>
  )
})

interface AutoBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

interface Props {
  pdfDoc: PDFDocumentProxy
  pageIndex: number
  zoom: number
  boxes: SelectionBox[]
  drawingState: DrawingState
  previewMode: boolean
  onOverlayMouseDown: (e: React.MouseEvent<HTMLDivElement>, pageIndex: number) => void
  autoBoxes?: AutoBox[]
}

export default function PageCanvas({
  pdfDoc, pageIndex, zoom, boxes, drawingState, previewMode, onOverlayMouseDown,
  autoBoxes = [],
}: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  const onSize = useCallback((w: number, h: number) => setSize({ w, h }), [])

  return (
    <div
      className="relative shadow-lg rounded-sm mb-6 mx-auto bg-white"
      style={{ width: size.w || undefined, minHeight: size.h || 200 }}
    >
      <div className="absolute -top-6 left-0 text-xs text-white/40 font-medium select-none">
        Page {pageIndex + 1}
      </div>

      <PdfCanvasCore pdfDoc={pdfDoc} pageIndex={pageIndex} zoom={zoom} onSize={onSize} />

      {/* Auto-redaction black boxes — overlaid on canvas, non-interactive */}
      {size.w > 0 && autoBoxes.map((box, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left:   box.x0 * zoom,
            top:    box.y0 * zoom,
            width:  (box.x1 - box.x0) * zoom,
            height: (box.y1 - box.y0) * zoom,
            background: '#000',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      ))}

      {size.w > 0 && (
        <SelectionOverlay
          pageIndex={pageIndex}
          cssWidth={size.w}
          cssHeight={size.h}
          boxes={boxes}
          drawingState={drawingState}
          previewMode={previewMode}
          zoom={zoom}
          onMouseDown={(e) => onOverlayMouseDown(e, pageIndex)}
        />
      )}
    </div>
  )
}
