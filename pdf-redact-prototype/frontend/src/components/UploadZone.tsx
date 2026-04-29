import { motion } from 'framer-motion'
import { FileText, Upload } from 'lucide-react'
import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { uploadPdf } from '../api'
import type { UploadResponse } from '../types'

interface Props {
  onUpload: (resp: UploadResponse, file: File) => void
}

const MAX_SIZE = 50 * 1024 * 1024

export default function UploadZone({ onUpload }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handle = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        toast.error('Only PDF files are supported.')
        return
      }
      if (file.size > MAX_SIZE) {
        toast.error('File too large (max 50 MB).')
        return
      }
      setIsUploading(true)
      const toastId = toast.loading('Uploading PDF…')
      try {
        const resp = await uploadPdf(file)
        toast.success(`PDF loaded — ${resp.page_count} page${resp.page_count !== 1 ? 's' : ''}`, { id: toastId })
        onUpload(resp, file)
      } catch {
        toast.error('Upload failed. Please try again.', { id: toastId })
      } finally {
        setIsUploading(false)
      }
    },
    [onUpload],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handle(file)
    },
    [handle],
  )

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handle(file)
      e.target.value = ''
    },
    [handle],
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-navy-100 flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-10"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-navy-700 rounded-xl flex items-center justify-center shadow-glow">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-navy-700">PDF Redact</h1>
        </div>
        <p className="text-navy-500 text-lg">
          Draw selection boxes over any part of your PDF to permanently redact it.
        </p>
      </motion.div>

      <motion.label
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        htmlFor="pdf-input"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`
          w-full max-w-xl cursor-pointer rounded-2xl border-2 border-dashed p-14
          flex flex-col items-center gap-5 transition-all duration-200
          ${isDragging
            ? 'border-accent bg-accent/10 shadow-glow-accent scale-[1.01]'
            : 'border-navy-300 bg-white hover:border-navy-500 hover:shadow-card'
          }
          ${isUploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${isDragging ? 'bg-accent/20' : 'bg-navy-100'}`}>
          <Upload className={`w-8 h-8 ${isDragging ? 'text-accent' : 'text-navy-600'}`} />
        </div>
        <div className="text-center">
          <p className="text-navy-700 font-semibold text-lg">
            {isUploading ? 'Uploading…' : 'Drop a PDF here'}
          </p>
          <p className="text-navy-400 text-sm mt-1">
            or <span className="text-navy-600 underline underline-offset-2">browse to upload</span>
          </p>
          <p className="text-navy-300 text-xs mt-3">PDF only · max 50 MB</p>
        </div>
      </motion.label>

      <input
        id="pdf-input"
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={onChange}
        disabled={isUploading}
      />
    </div>
  )
}
