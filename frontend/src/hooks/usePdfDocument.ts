import { useEffect, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Use local worker via Vite ?url import — always matches the installed version
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

/**
 * Load a PDF document from a File object, an ArrayBuffer, or a URL string.
 * Pass null to unload.
 */
export function usePdfDocument(source: File | ArrayBuffer | string | null) {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!source) {
      setPdfDoc(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    const load = async (data: ArrayBuffer | string) => {
      try {
        const loadingTask = typeof data === 'string'
          ? pdfjs.getDocument(data)
          : pdfjs.getDocument({ data })
        const doc = await loadingTask.promise
        if (!cancelled) setPdfDoc(doc)
      } catch {
        if (!cancelled)
          setError('Failed to load PDF. The file may be corrupted or password-protected.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    if (source instanceof ArrayBuffer) {
      load(source)
    } else if (typeof source === 'string') {
      load(source)
    } else {
      // File — read to ArrayBuffer exactly like the prototype
      const reader = new FileReader()
      reader.onload = (e) => {
        if (!cancelled) load(e.target?.result as ArrayBuffer)
      }
      reader.readAsArrayBuffer(source)
    }

    return () => { cancelled = true }
  }, [source])

  return { pdfDoc, isLoading, error }
}
