import { useEffect, useRef } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'

interface Props {
  pdfDoc: PDFDocumentProxy
  pageCount: number
  currentPage: number
  onPageSelect: (index: number) => void
}

interface ThumbnailItemProps {
  pdfDoc: PDFDocumentProxy
  pageIndex: number
  isActive: boolean
  onClick: () => void
}

function ThumbnailItem({ pdfDoc, pageIndex, isActive, onClick }: ThumbnailItemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const page = await pdfDoc.getPage(pageIndex + 1)
      if (cancelled || !canvasRef.current) return
      const viewport = page.getViewport({ scale: 0.18 })
      const canvas = canvasRef.current
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!
      await page.render({ canvasContext: ctx, viewport }).promise.catch(() => {})
    })()
    return () => { cancelled = true }
  }, [pdfDoc, pageIndex])

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-150
        ${isActive
          ? 'bg-navy-700 shadow-glow'
          : 'hover:bg-navy-100'
        }
      `}
    >
      <div className={`rounded border ${isActive ? 'border-accent' : 'border-navy-200'} overflow-hidden bg-white`}>
        <canvas ref={canvasRef} style={{ display: 'block', maxWidth: 80 }} />
      </div>
      <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-navy-500'}`}>
        {pageIndex + 1}
      </span>
    </button>
  )
}

export default function ThumbnailSidebar({ pdfDoc, pageCount, currentPage, onPageSelect }: Props) {
  return (
    <aside className="w-24 flex-shrink-0 bg-white border-r border-navy-100 overflow-y-auto py-4 px-2 flex flex-col gap-2">
      <p className="text-xs text-navy-400 font-medium text-center mb-2 uppercase tracking-wide">
        Pages
      </p>
      {Array.from({ length: pageCount }, (_, i) => (
        <ThumbnailItem
          key={i}
          pdfDoc={pdfDoc}
          pageIndex={i}
          isActive={i === currentPage}
          onClick={() => onPageSelect(i)}
        />
      ))}
    </aside>
  )
}
