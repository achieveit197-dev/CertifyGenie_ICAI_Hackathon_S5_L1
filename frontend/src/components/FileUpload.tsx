import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, AlertCircle, Loader2, Lock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { uploadFile } from '../api/client'
import { useSession } from '../context/SessionContext'

const MAX_SIZE_MB = 10
const ACCEPTED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
}

interface FileUploadProps {
  onAfterUpload?: (fileId: string, file: File) => void
}

export function FileUpload({ onAfterUpload }: FileUploadProps) {
  const { updateSession, setStep } = useSession()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setUploading(true)
      setProgress(10)

      // Simulate incremental progress while upload happens
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 15, 85))
      }, 300)

      try {
        const response = await uploadFile(file)
        clearInterval(progressInterval)
        setProgress(100)

        updateSession({ uploadResponse: response })
        toast.success('✅ File uploaded securely')

        setTimeout(() => {
          if (onAfterUpload) {
            onAfterUpload(response.file_id, file)
          } else {
            setStep(2)
          }
        }, 600)
      } catch (error) {
        clearInterval(progressInterval)
        setProgress(0)
        const msg = error instanceof Error ? error.message : 'Upload failed'
        toast.error(msg)
      } finally {
        setUploading(false)
      }
    },
    [updateSession, setStep, onAfterUpload]
  )

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE_MB * 1024 * 1024,
    multiple: false,
    disabled: uploading,
  })

  const rejection = fileRejections[0]

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
          transition-all duration-200 select-none overflow-hidden
          ${isDragActive
            ? 'border-brand-accent bg-emerald-50 scale-[1.02]'
            : 'border-gray-200 bg-white hover:border-navy-300 hover:bg-navy-50/30'
          }
          ${uploading ? 'pointer-events-none opacity-70' : ''}
        `}
      >
        <input {...getInputProps()} />

        {/* Upload progress bar at top */}
        {uploading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-100">
            <motion.div
              className="h-full bg-brand-accent"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          {uploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-navy-50 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-navy-700 animate-spin" />
              </div>
              <div>
                <p className="text-navy-700 font-semibold text-sm">Uploading securely…</p>
                <p className="text-gray-400 text-xs mt-1">{progress}% complete</p>
              </div>
            </motion.div>
          ) : isDragActive ? (
            <motion.div
              key="dragging"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <Upload className="w-7 h-7 text-brand-accent" />
              </div>
              <p className="text-brand-accent font-semibold">Drop your file here</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-navy-50 flex items-center justify-center">
                <FileText className="w-7 h-7 text-navy-600" />
              </div>
              <div>
                <p className="text-gray-800 font-semibold text-sm">
                  Drag &amp; drop your financial document
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  or <span className="text-navy-600 underline underline-offset-2">click to browse</span>
                </p>
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                {['PDF', 'XLSX', 'XLS'].map((ext) => (
                  <span
                    key={ext}
                    className="px-2.5 py-1 bg-navy-50 text-navy-600 text-xs font-semibold rounded-lg border border-navy-100"
                  >
                    {ext}
                  </span>
                ))}
              </div>
              <p className="text-gray-400 text-xs">Maximum file size: {MAX_SIZE_MB} MB</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Privacy badge */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-3 flex items-center justify-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5"
      >
        <Lock className="w-3.5 h-3.5 flex-shrink-0 text-emerald-500" />
        <span>CIN, PAN, GSTIN, Aadhaar &amp; Mobile are redacted before AI processing</span>
      </motion.div>

      {/* Rejection error */}
      {rejection && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5"
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-red-500" />
          <span>
            {rejection.errors[0]?.code === 'file-too-large'
              ? `File exceeds ${MAX_SIZE_MB}MB limit. Please compress and retry.`
              : rejection.errors[0]?.code === 'file-invalid-type'
              ? 'Unsupported format. Please upload PDF, XLSX, or XLS files only.'
              : rejection.errors[0]?.message}
          </span>
        </motion.div>
      )}
    </div>
  )
}
