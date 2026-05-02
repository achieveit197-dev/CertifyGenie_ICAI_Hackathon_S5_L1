export type { RedactionPayload, SelectionBox, DrawingState, DrawMode, ResizeHandle } from './redaction'

export type CertificateType = 'net_worth' | 'turnover' | 'working_capital'
export type FileType = 'pdf' | 'excel'
export type ExtractionMode = 'text' | 'vision'
export type FieldStatus = 'verified' | 'needs_review' | 'not_found'
export type ValidationStatus = 'pass' | 'warning' | 'fail'
export type EntityType = 'company' | 'llp' | 'partnership' | 'proprietorship'
export type NWMethod =
  | 'book_value' | 'companies_act' | 'tangible_nw'
  | 'nav' | 'sebi_lodr' | 'adjusted_tbv' | 'consolidated'

export interface NetWorthMethodResult {
  method_id: NWMethod
  label: string
  formula: string
  context: string
  value: number | null
  applicable: boolean
  coming_soon: boolean
  recommended: boolean
}

export interface NetWorthMethodsResponse {
  file_id: string
  entity_type: EntityType
  methods: NetWorthMethodResult[]
}

export interface UploadResponse {
  file_id: string
  filename: string
  file_type: FileType
  size_bytes: number
  message: string
}

export interface FinancialFigure {
  value: number | null
  source_line: string | null
  status: FieldStatus
}

export interface PreviousYearData {
  financial_year: string | null
  share_capital: number | null
  reserves_surplus: number | null
  accumulated_losses: number | null
  net_worth: number | null
  total_assets: number | null
  total_liabilities: number | null
  turnover: number | null
  net_profit: number | null
  current_assets: number | null
  current_liabilities: number | null
  working_capital: number | null
}

export interface ExtractedData {
  share_capital: FinancialFigure | null
  reserves_surplus: FinancialFigure | null
  accumulated_losses: FinancialFigure | null
  total_assets: FinancialFigure | null
  total_liabilities: FinancialFigure | null
  net_worth: FinancialFigure | null
  turnover: FinancialFigure | null
  net_profit: FinancialFigure | null
  current_assets: FinancialFigure | null
  current_liabilities: FinancialFigure | null
  working_capital: FinancialFigure | null
  // Method-specific fields extracted in Phase 6
  intangible_assets?: FinancialFigure | null
  goodwill?: FinancialFigure | null
  revaluation_reserve?: FinancialFigure | null
  deferred_expenditure?: FinancialFigure | null
  financial_year: string | null
  company_name: string | null
  currency: string
  confidence_score: number
  extraction_notes: string | null
  previous_year: PreviousYearData | null
}

export interface ValidationResult {
  net_worth_equation_valid: boolean | null
  balance_sheet_balanced: boolean | null
  net_worth_discrepancy: number | null
  balance_sheet_discrepancy: number | null
  messages: string[]
  overall_status: ValidationStatus
}

export interface RedactionSummary {
  cin_count: number
  pan_count: number
  aadhaar_count: number
  mobile_count: number
  email_count: number
  gstin_count: number
  total_redacted: number
}

export interface ExtractionResponse {
  file_id: string
  certificate_type: CertificateType
  extracted_data: ExtractedData
  validation_results: ValidationResult
  redaction_summary: RedactionSummary
  tokens_used: number
  extraction_mode: ExtractionMode
}

export interface CADetails {
  name: string
  firm_name: string
  membership_no: string
  address: string
  date: string
}

export interface CertificateResponse {
  certificate_id: string
  certificate_number: string
  download_url_pdf: string
  download_url_docx: string
  generated_at: string
  message: string
}

export interface CertificateRowLabel {
  key: string
  label: string
  value: number | null
}

export interface CertificateEditorState {
  narrative: string
  additionalNotes: string
  rowLabels: Record<string, string>   // field_key → custom display label
  rowValues: Record<string, number>   // field_key → overridden value
  // Document header fields
  companyName: string
  financialYear: string
  customCertNumber: string            // blank = auto-generate
  udin: string                        // Unique Document Identification Number
  // CA details (mirror of caDetails, editable here too)
  caName: string
  caFirmName: string
  caMembershipNo: string
  caAddress: string
  certDate: string
  // Net worth method
  nwMethodLabel: string               // display label for selected method
  nwMethodId: string                  // method_id — controls table row structure
  // PDF security
  pdfPassword: string                 // blank = no protection
  pdfPasswordEnabled: boolean
  // Working Capital purpose line
  wcPurpose: string
}

// Certificate history entry (stored in localStorage)
export interface HistoryEntry {
  id: string
  cert_number: string
  cert_type: string
  company: string
  financial_year: string
  method_label: string
  generated_at: string
  pdf_url: string
  docx_url: string
}

// Session state persisted to localStorage
export interface SessionState {
  step: number
  uploadResponse: UploadResponse | null
  certificateType: CertificateType | null
  extractionResponse: ExtractionResponse | null
  certificateResponse: CertificateResponse | null
  caDetails: CADetails
  overrides: Record<string, number>
  editorState: CertificateEditorState | null
  entityType: EntityType
  selectedNWMethod: NWMethod | null
  nwMethodResults: NetWorthMethodResult[]
}
