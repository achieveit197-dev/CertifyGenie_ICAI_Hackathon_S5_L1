import axios from 'axios'
import type { RedactionPayload, UploadResponse } from './types'

const client = axios.create({
  baseURL: '/api',
  timeout: 60_000,
})

export async function uploadPdf(file: File): Promise<UploadResponse> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.post<UploadResponse>('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function applyRedactions(
  fileId: string,
  redactions: RedactionPayload[],
  stripMetadata: boolean,
): Promise<void> {
  const response = await client.post(
    '/redact',
    { file_id: fileId, redactions, strip_metadata: stripMetadata },
    { responseType: 'blob' },
  )

  const blob = new Blob([response.data], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `redacted_${fileId.slice(0, 8)}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
