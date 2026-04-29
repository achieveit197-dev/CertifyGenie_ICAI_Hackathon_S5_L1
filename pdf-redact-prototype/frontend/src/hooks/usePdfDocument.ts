import { useEffect, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Use local worker via Vite ?url import — always matches the installed version
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

export function usePdfDocument(file: File | null) {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPdfDoc(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    const reader = new FileReader()
    reader.onload = async (e) => {
      if (cancelled) return
      try {
        const buffer = e.target?.result as ArrayBuffer
        const loadingTask = pdfjs.getDocument({ data: buffer })
        const doc = await loadingTask.promise
        if (!cancelled) {
          setPdfDoc(doc)
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load PDF. The file may be corrupted or password-protected.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    reader.readAsArrayBuffer(file)

    return () => {
      cancelled = true
    }
  }, [file])

  return { pdfDoc, isLoading, error }
}
