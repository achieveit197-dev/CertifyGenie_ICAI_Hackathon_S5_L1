import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import type { UploadResponse } from './types'
import PdfViewer from './components/PdfViewer'
import UploadZone from './components/UploadZone'

interface EditorState {
  uploadResp: UploadResponse
  pdfFile: File
}

export default function App() {
  const [editorState, setEditorState] = useState<EditorState | null>(null)

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1E3A5F',
            color: '#fff',
            borderRadius: '10px',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#2ECC71', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />

      {editorState ? (
        <PdfViewer
          uploadResp={editorState.uploadResp}
          pdfFile={editorState.pdfFile}
          onReset={() => setEditorState(null)}
        />
      ) : (
        <UploadZone
          onUpload={(resp, file) => setEditorState({ uploadResp: resp, pdfFile: file })}
        />
      )}
    </>
  )
}
