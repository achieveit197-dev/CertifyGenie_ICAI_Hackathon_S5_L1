import axios from 'axios'
import type {
  UploadResponse,
  ExtractionResponse,
  CertificateResponse,
  CertificateType,
  CADetails,
  EntityType,
  NetWorthMethodsResponse,
  HistoryEntry,
} from '../types'

const HISTORY_KEY = 'certify_genie_history'

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : []
  } catch { return [] }
}

export function saveToHistory(entry: HistoryEntry): void {
  const history = loadHistory()
  // Keep latest 50 entries
  const updated = [...history, entry].slice(-50)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY)
}

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred'
    return Promise.reject(new Error(message))
  }
)

export const uploadFile = async (file: File): Promise<UploadResponse> => {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<UploadResponse>('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const extractData = async (
  fileId: string,
  certificateType: CertificateType = 'net_worth'
): Promise<ExtractionResponse> => {
  const { data } = await api.post<ExtractionResponse>(`/extract/${fileId}`, {
    certificate_type: certificateType,
  })
  return data
}

export const fetchNetWorthMethods = async (
  fileId: string,
  entityType: EntityType
): Promise<NetWorthMethodsResponse> => {
  const { data } = await api.post<NetWorthMethodsResponse>(`/networth-methods/${fileId}`, {
    entity_type: entityType,
  })
  return data
}

export interface GenerateOptions {
  overrides?: Record<string, number>
  customNarrative?: string
  additionalNotes?: string
  customRowLabels?: Record<string, string>
  customCertNumber?: string
  customCompanyName?: string
  customFinancialYear?: string
  udin?: string
  nwMethodLabel?: string
  nwMethod?: string
  pdfPassword?: string
  wcPurpose?: string
}

export const generateCertificate = async (
  fileId: string,
  certificateType: CertificateType,
  caDetails: CADetails,
  opts: GenerateOptions = {}
): Promise<CertificateResponse> => {
  const { data } = await api.post<CertificateResponse>(`/generate/${fileId}`, {
    certificate_type: certificateType,
    ca_details: caDetails,
    overrides: opts.overrides ?? {},
    custom_narrative: opts.customNarrative || null,
    additional_notes: opts.additionalNotes || null,
    custom_row_labels: opts.customRowLabels || null,
    custom_cert_number: opts.customCertNumber || null,
    custom_company_name: opts.customCompanyName || null,
    custom_financial_year: opts.customFinancialYear || null,
    udin: opts.udin || null,
    nw_method_label: opts.nwMethodLabel || null,
    nw_method: opts.nwMethod || null,
    pdf_password: opts.pdfPassword || null,
    wc_purpose: opts.wcPurpose || null,
  })
  return data
}

export const getDownloadUrl = (certId: string, format: 'pdf' | 'docx'): string =>
  `/api/download/${certId}/${format}`

export interface SendEmailOptions {
  recipient_email: string
  subject: string
  body: string
}

export const sendCertificateEmail = async (
  certId: string,
  opts: SendEmailOptions
): Promise<{ message: string }> => {
  const { data } = await api.post<{ message: string }>(`/send-email/${certId}`, opts)
  return data
}
