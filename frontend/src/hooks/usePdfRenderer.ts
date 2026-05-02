import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'

interface RendererResult {
  isRendering: boolean
  cssWidth: number
  cssHeight: number
}

export function usePdfRenderer(
  pdfDoc: PDFDocumentProxy | null,
  pageIndex: number,
  zoom: number,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
): RendererResult {
  const [isRendering, setIsRendering] = useState(false)
  const [cssWidth, setCssWidth] = useState(0)
  const [cssHeight, setCssHeight] = useState(0)
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null)

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return

    // Cancel any in-flight render
    renderTaskRef.current?.cancel()

    let cancelled = false
    setIsRendering(true)

    ;(async () => {
      try {
        const page = await pdfDoc.getPage(pageIndex + 1) // pdfjs is 1-indexed
        if (cancelled) return

        const dpr = window.devicePixelRatio || 1
        // Viewport at zoom*dpr for high-DPI sharpness; CSS size is zoom-only
        const viewport = page.getViewport({ scale: zoom * dpr })
        const cssW = Math.round(viewport.width / dpr)
        const cssH = Math.round(viewport.height / dpr)

        const canvas = canvasRef.current!
        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.width = `${cssW}px`
        canvas.style.height = `${cssH}px`

        const ctx = canvas.getContext('2d')!
        const task = page.render({ canvasContext: ctx, viewport })
        renderTaskRef.current = task

        await task.promise
        if (!cancelled) {
          setCssWidth(cssW)
          setCssHeight(cssH)
        }
      } catch (err: unknown) {
        // RenderingCancelledException is expected on rapid zoom/page changes
        const name = (err as { name?: string })?.name
        if (name !== 'RenderingCancelledException') {
          console.error('PDF render error:', err)
        }
      } finally {
        if (!cancelled) setIsRendering(false)
      }
    })()

    return () => {
      cancelled = true
      renderTaskRef.current?.cancel()
    }
  }, [pdfDoc, pageIndex, zoom, canvasRef])

  return { isRendering, cssWidth, cssHeight }
}
