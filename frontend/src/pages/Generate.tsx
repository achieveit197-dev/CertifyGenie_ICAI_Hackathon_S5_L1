import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Loader2, Bot, RefreshCw,
  Download, Copy, Check, Eye, Sparkles, Layers,
  BarChart2, ShieldCheck, Mail, History, GitCompareArrows,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { StepIndicator } from '../components/StepIndicator'
import { FileUpload } from '../components/FileUpload'
import { CertificateSelector } from '../components/CertificateSelector'
import { ExtractedDataView } from '../components/ExtractedData'
import { ValidationPanel } from '../components/ValidationPanel'
import { CADetailsForm } from '../components/CADetailsForm'
import { CertificatePreviewPanel } from '../components/CertificatePreviewPanel'
import { CertificateEditorPanel } from '../components/CertificateEditorPanel'
import { EntityTypeSelector } from '../components/EntityTypeSelector'
import { NetWorthMethodSelector } from '../components/NetWorthMethodSelector'
import { RatioAnalysisModal } from '../components/RatioAnalysisModal'
import { ExtractionConfidenceModal } from '../components/ExtractionConfidenceModal'
import { EmailModal } from '../components/EmailModal'
import { YoYComparisonModal } from '../components/YoYComparisonModal'
import { extractData, generateCertificate, fetchNetWorthMethods, saveToHistory } from '../api/client'
import { ManualRedactionModal } from '../components/ManualRedactionModal'
import type { CertificateType, CertificateEditorState, EntityType, NWMethod, RedactionPayload } from '../types'

const CERT_LABELS: Record<CertificateType, string> = {
  net_worth: 'Net Worth Certificate',
  turnover: 'Turnover Certificate',
  working_capital: 'Working Capital Certificate',
}

const DEFAULT_NARRATIVES: Record<CertificateType, (company: string, fy: string) => string> = {
  net_worth: (company, fy) =>
    `This is to certify that based on the audited financial statements of ${company} for the financial year ${fy}, the Net Worth has been computed as under:`,
  turnover: (company, fy) =>
    `This is to certify that the turnover of ${company} for the financial year ${fy} is as under:`,
  working_capital: (company, fy) =>
    `This is to certify that based on the audited financial statements of ${company} for the financial year ${fy}, the Working Capital has been computed as under:`,
}

export default function Generate() {
  const navigate = useNavigate()
  const { session, setStep, updateSession, resetSession } = useSession()
  const [extracting, setExtracting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showRatios, setShowRatios] = useState(false)
  const [showConfidence, setShowConfidence] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [showYoY, setShowYoY] = useState(false)

  // Manual redaction state
  const [pendingFileId, setPendingFileId]             = useState<string | null>(null)
  const [pendingFile, setPendingFile]                 = useState<File | null>(null)
  const [showRedactPrompt, setShowRedactPrompt]       = useState(false)
  const [showManualRedaction, setShowManualRedaction] = useState(false)

  // Initialise editor state when entering Step 5 (Preview & Edit)
  useEffect(() => {
    if (session.step === 5 && !session.editorState && session.extractionResponse && session.certificateType) {
      const extracted = session.extractionResponse.extracted_data
      const company = extracted.company_name || 'The Client'
      const fy = extracted.financial_year || 'FY 2024-25'
      const narrative = DEFAULT_NARRATIVES[session.certificateType](company, fy)
      const ca = session.caDetails

      // Determine net worth value from selected method (if any)
      const selectedMethod = session.nwMethodResults.find(
        (m) => m.method_id === session.selectedNWMethod
      )
      const methodNwValue = selectedMethod?.value ?? null
      const nwMethodLabel = selectedMethod?.label ?? ''

      const rowValues: Record<string, number> = { ...session.overrides }
      if (methodNwValue != null) {
        rowValues['net_worth'] = methodNwValue
      }

      const initialEditor: CertificateEditorState = {
        narrative,
        additionalNotes: '',
        rowLabels: {},
        rowValues,
        // Header fields
        companyName: company,
        financialYear: fy,
        customCertNumber: '',
        udin: '',
        // CA fields (mirror from caDetails step)
        caName: ca.name,
        caFirmName: ca.firm_name,
        caMembershipNo: ca.membership_no,
        caAddress: ca.address,
        certDate: ca.date || new Date().toLocaleDateString('en-IN'),
        nwMethodLabel,
        nwMethodId: session.selectedNWMethod || '',
        pdfPassword: '',
        pdfPasswordEnabled: false,
        wcPurpose: '',
      }
      updateSession({ editorState: initialEditor })
    }
  }, [session.step]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch method results when entity type changes (in Step 4, net_worth cert only)
  const [fetchingMethods, setFetchingMethods] = useState(false)

  const handleEntityTypeChange = async (entityType: EntityType) => {
    if (!session.uploadResponse) return
    updateSession({ entityType, selectedNWMethod: null, nwMethodResults: [] })
    setFetchingMethods(true)
    try {
      const result = await fetchNetWorthMethods(session.uploadResponse.file_id, entityType)
      updateSession({ nwMethodResults: result.methods })
      // Auto-select the recommended method
      const recommended = result.methods.find((m) => m.recommended)
      if (recommended) {
        updateSession({ selectedNWMethod: recommended.method_id as NWMethod })
      }
    } catch {
      toast.error('Could not load method options')
    } finally {
      setFetchingMethods(false)
    }
  }

  const handleEditorChange = (patch: Partial<CertificateEditorState>) => {
    const merged = { ...session.editorState!, ...patch }
    // Auto-regenerate narrative when company name or FY changes
    if ((patch.companyName !== undefined || patch.financialYear !== undefined) && session.certificateType) {
      merged.narrative = DEFAULT_NARRATIVES[session.certificateType](
        merged.companyName,
        merged.financialYear,
      )
    }
    updateSession({ editorState: merged })
  }

  // ── Called by FileUpload after upload succeeds — show redaction prompt ──────
  const handleAfterUpload = (fileId: string, file: File) => {
    setPendingFileId(fileId)
    setPendingFile(file)
    setShowRedactPrompt(true)
  }

  // ── Run extraction (with optional manual boxes) ───────────────────────────
  const handleAutoExtract = async (fileId: string, manualBoxes: RedactionPayload[] = []) => {
    setShowRedactPrompt(false)
    updateSession({ extractionResponse: null })
    setExtracting(true)
    try {
      const result = await extractData(fileId, session.certificateType ?? 'net_worth', manualBoxes)
      updateSession({ extractionResponse: result })
      setStep(2)
      toast.success('Document analysed — select certificate type')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Extraction failed')
      setStep(1)
    } finally {
      setExtracting(false)
    }
  }

  // ── Step 5: Finalize & Generate ───────────────────────────────────────────
  const handleGenerate = async () => {
    if (!session.uploadResponse || !session.certificateType || !session.extractionResponse) return
    const ca = session.caDetails
    if (!ca.name.trim() || !ca.firm_name.trim() || !ca.membership_no.trim()) {
      toast.error('Please fill in CA Name, Firm Name, and Membership No. in Step 3.')
      return
    }

    const editor = session.editorState
    setGenerating(true)

    // Sync CA details from editor back into caDetails for the request
    const finalCA = {
      ...ca,
      name: editor?.caName || ca.name,
      firm_name: editor?.caFirmName || ca.firm_name,
      membership_no: editor?.caMembershipNo || ca.membership_no,
      address: editor?.caAddress || ca.address,
      date: editor?.certDate || ca.date,
    }

    try {
      const result = await generateCertificate(
        session.uploadResponse.file_id,
        session.certificateType,
        finalCA,
        {
          overrides: Object.keys(editor?.rowValues ?? {}).length > 0 ? editor?.rowValues : undefined,
          customNarrative: editor?.narrative,
          additionalNotes: editor?.additionalNotes,
          customRowLabels: Object.keys(editor?.rowLabels ?? {}).length > 0 ? editor?.rowLabels : undefined,
          customCertNumber: editor?.customCertNumber || undefined,
          customCompanyName: editor?.companyName || undefined,
          customFinancialYear: editor?.financialYear || undefined,
          udin: editor?.udin || undefined,
          nwMethodLabel: editor?.nwMethodLabel || undefined,
          nwMethod: session.selectedNWMethod || undefined,
          pdfPassword: editor?.pdfPasswordEnabled && editor?.pdfPassword ? editor.pdfPassword : undefined,
          wcPurpose: editor?.wcPurpose || undefined,
        }
      )
      updateSession({ certificateResponse: result })
      // Save to history
      saveToHistory({
        id: result.certificate_id,
        cert_number: result.certificate_number,
        cert_type: session.certificateType!,
        company: editor?.companyName || session.extractionResponse?.extracted_data.company_name || '',
        financial_year: editor?.financialYear || session.extractionResponse?.extracted_data.financial_year || '',
        method_label: editor?.nwMethodLabel || '',
        generated_at: result.generated_at,
        pdf_url: result.download_url_pdf,
        docx_url: result.download_url_docx,
      })
      setStep(6)
      toast.success('Certificate generated!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const copyCertNumber = () => {
    if (session.certificateResponse?.certificate_number) {
      navigator.clipboard.writeText(session.certificateResponse.certificate_number)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleReset = () => {
    resetSession()
    toast('Started fresh', { icon: '🔄' })
  }

  // Map internal steps (1-6) to visual step indicator (1-5)
  // Steps 1-3 = visual 1-3; step 4 = visual 4; steps 5-6 = visual 5
  const visualStep = session.step <= 4 ? session.step : 5

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top nav */}
      <div className="text-white px-6 py-3.5 flex items-center justify-between border-b border-white/5"
        style={{ background: 'linear-gradient(to right, #0a1628, #0e1e32)' }}>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-white/50 hover:text-white/90 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Home
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-brand-accent/20 border border-brand-accent/25 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-brand-accent" />
          </div>
          <span className="font-bold text-base tracking-tight">Certify Genie</span>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-white/50 hover:text-white/90 transition-colors text-sm font-medium"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* AI Extraction Loading Overlay */}
      <AnimatePresence>
        {extracting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(10, 22, 40, 0.75)', backdropFilter: 'blur(12px)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-white rounded-3xl p-8 text-center max-w-xs w-full mx-4 shadow-2xl"
            >
              <div className="w-16 h-16 rounded-2xl bg-navy-50 flex items-center justify-center mx-auto mb-5 relative">
                <Bot className="w-8 h-8 text-navy-700" />
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-accent flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                </div>
              </div>
              <h3 className="font-bold text-gray-900 text-base mb-1.5">AI Reading Document</h3>
              <p className="text-sm text-gray-500 mb-5">Extracting figures and redacting PII…</p>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #1e3a5f, #2ECC71)' }}
                  initial={{ width: '0%' }}
                  animate={{ width: '85%' }}
                  transition={{ duration: 8, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}

        {generating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(10, 22, 40, 0.75)', backdropFilter: 'blur(12px)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-white rounded-3xl p-8 text-center max-w-xs w-full mx-4 shadow-2xl"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
              <h3 className="font-bold text-gray-900 text-base mb-1.5">Building Certificate</h3>
              <p className="text-sm text-gray-500">Generating PDF and DOCX files…</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 5 (Preview) gets full-width layout; others get narrow centered layout */}
      {session.step === 5 ? (
        // ── Full-width Preview & Edit layout ──────────────────────────────────
        <div className="flex flex-col h-[calc(100vh-57px)]">
          <div className="px-6 pt-4 pb-3 bg-white border-b border-gray-100">
            <StepIndicator current={visualStep} />
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-navy-900">Preview &amp; Edit Certificate</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Edit on the left — preview updates live on the right
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {/* Analysis buttons */}
                {session.extractionResponse && (
                  <>
                    <button
                      onClick={() => setShowRatios(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl
                        border border-navy-200 text-navy-700 bg-navy-50 hover:bg-navy-100 transition-colors"
                    >
                      <BarChart2 className="w-3.5 h-3.5" /> Ratio Analysis
                    </button>
                    <button
                      onClick={() => setShowConfidence(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl
                        border border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Confidence
                    </button>
                    <button
                      onClick={() => setShowYoY(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl
                        border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
                    >
                      <GitCompareArrows className="w-3.5 h-3.5" /> YoY Analysis
                    </button>
                  </>
                )}
                <button
                  onClick={() => setStep(4)}
                  className="btn-ghost text-sm"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="btn-accent text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                  ) : (
                    <><Check className="w-3.5 h-3.5" /> Finalise &amp; Download</>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Split panel */}
          <div className="flex flex-1 overflow-hidden gap-0 px-4 pb-4 pt-3 bg-[#F8FAFC]">
            {/* Left — editor */}
            <div className="w-2/5 pr-3 overflow-y-auto scrollbar-thin">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 h-full">
                <p className="text-[10px] font-bold text-navy-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Edit Certificate Content
                </p>
                {session.editorState && session.extractionResponse && session.certificateType && (
                  <CertificateEditorPanel
                    certType={session.certificateType}
                    data={session.extractionResponse.extracted_data}
                    editorState={session.editorState}
                    onChange={handleEditorChange}
                  />
                )}
              </div>
            </div>

            {/* Right — live preview */}
            <div className="w-3/5 pl-3 overflow-y-auto scrollbar-thin">
              <div className="h-full">
                {session.editorState && session.extractionResponse && session.certificateType && (
                  <CertificatePreviewPanel
                    certType={session.certificateType}
                    data={session.extractionResponse.extracted_data}
                    editorState={session.editorState}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // ── Narrow wizard layout (Steps 1, 2, 3, 5) ──────────────────────────
        <div className="max-w-3xl mx-auto px-4 py-8">
          <StepIndicator current={visualStep} />

          <AnimatePresence mode="wait">
            {/* ── Step 1: Upload ── */}
            {session.step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div className="step-card mb-6">
                  <h2 className="text-lg font-bold text-navy-900 text-center mb-1">Upload Financial Document</h2>
                  <p className="text-xs text-gray-500 text-center mb-6">PDF, XLSX or XLS · Up to 10 MB</p>
                  <FileUpload onAfterUpload={handleAfterUpload} />
                </div>
                {session.uploadResponse && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm text-emerald-700"
                  >
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span><strong>{session.uploadResponse.filename}</strong> uploaded securely</span>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ── Step 2: Select Certificate Type ── */}
            {session.step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div className="step-card mb-6">
                  <h2 className="text-lg font-bold text-navy-900 text-center mb-1">Select Certificate Type</h2>
                  <p className="text-xs text-gray-500 text-center mb-6">
                    Document analysed · <span className="font-semibold text-navy-700">{session.uploadResponse?.filename}</span>
                  </p>
                  <CertificateSelector
                    selected={session.certificateType}
                    onSelect={(type) => updateSession({ certificateType: type })}
                  />
                  <div className="mt-6 flex justify-center gap-2">
                    <button
                      onClick={() => setStep(1)}
                      className="btn-ghost text-sm"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                    <button
                      onClick={() => {
                        if (!session.certificateType) {
                          toast.error('Please select a certificate type.')
                          return
                        }
                        setStep(3)
                      }}
                      disabled={!session.certificateType}
                      className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Review Extracted Data
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Review Data + CA Details ── */}
            {session.step === 3 && session.extractionResponse && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="step-card">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-navy-900">Review Extracted Data</h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {CERT_LABELS[session.certificateType!]} &nbsp;·&nbsp;
                        {session.extractionResponse.extraction_mode === 'vision' ? 'Vision mode' : 'Text mode'} &nbsp;·&nbsp;
                        {session.extractionResponse.tokens_used.toLocaleString()} tokens
                      </p>
                    </div>
                  </div>
                  <ValidationPanel
                    validation={session.extractionResponse.validation_results}
                    redaction={session.extractionResponse.redaction_summary}
                  />
                </div>

                <div className="step-card">
                  <ExtractedDataView data={session.extractionResponse.extracted_data} />
                </div>

                <CADetailsForm />

                <div className="flex justify-between pt-1">
                  <button
                    onClick={() => setStep(2)}
                    className="btn-ghost text-sm"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <button
                    onClick={() => {
                      const ca = session.caDetails
                      if (!ca.name.trim() || !ca.firm_name.trim() || !ca.membership_no.trim()) {
                        toast.error('Please fill in CA Name, Firm Name, and Membership No.')
                        return
                      }
                      // Reset editorState so it re-initialises with fresh narrative
                      updateSession({ editorState: null })
                      if (session.certificateType === 'net_worth') {
                        // Go to method selection step
                        setStep(4)
                        // Trigger method fetch if entity type already chosen
                        if (session.uploadResponse) {
                          handleEntityTypeChange(session.entityType)
                        }
                      } else {
                        setStep(5)
                      }
                    }}
                    className="btn-primary text-sm"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {session.certificateType === 'net_worth' ? 'Select Method' : 'Preview & Edit'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 4: Net Worth Method Selection ── */}
            {session.step === 4 && session.certificateType === 'net_worth' && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="step-card">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-navy-100 flex items-center justify-center">
                      <Layers className="w-4 h-4 text-navy-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-navy-900">Select Entity Type</h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Determines which calculation methods apply
                      </p>
                    </div>
                  </div>
                  <EntityTypeSelector
                    selected={session.entityType}
                    onSelect={handleEntityTypeChange}
                  />
                </div>

                {fetchingMethods && (
                  <div className="flex items-center justify-center gap-2 py-4 text-navy-600 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Computing methods…
                  </div>
                )}

                {!fetchingMethods && session.nwMethodResults.length > 0 && (
                  <div className="step-card">
                    <div className="mb-3">
                      <h3 className="font-bold text-navy-900 text-sm">Net Worth Calculation Methods</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Select the method appropriate for your use case
                      </p>
                    </div>
                    <NetWorthMethodSelector
                      methods={session.nwMethodResults}
                      selected={session.selectedNWMethod}
                      onSelect={(method) => updateSession({ selectedNWMethod: method })}
                    />
                  </div>
                )}

                <div className="flex justify-between pt-1">
                  <button onClick={() => setStep(3)} className="btn-ghost text-sm">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <button
                    onClick={() => {
                      if (!session.selectedNWMethod) {
                        toast.error('Please select a net worth calculation method.')
                        return
                      }
                      updateSession({ editorState: null })
                      setStep(5)
                    }}
                    disabled={!session.selectedNWMethod}
                    className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview &amp; Edit
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 6: Download ── */}
            {session.step === 6 && session.certificateResponse && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="text-center"
              >
                {/* Success card */}
                <div className="relative overflow-hidden rounded-3xl mb-5 text-white"
                  style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0e1e32 50%, #162c49 100%)' }}>
                  <div className="absolute inset-0 opacity-[0.04]"
                    style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                  <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-[60px] opacity-25"
                    style={{ background: 'radial-gradient(circle, #2ECC71, transparent)' }} />

                  <div className="relative px-6 py-10">
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
                      className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
                      style={{ background: 'rgba(46,204,113,0.2)', border: '2px solid rgba(46,204,113,0.3)' }}
                    >
                      <Check className="w-10 h-10 text-emerald-400" strokeWidth={2.5} />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <h2 className="text-2xl font-extrabold text-white mb-1">Certificate Ready!</h2>
                      <p className="text-white/50 text-sm mb-6">{CERT_LABELS[session.certificateType!]}</p>

                      <div className="inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 mb-8"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
                        <span className="text-xs text-white/40 font-medium">Cert No:</span>
                        <span className="font-mono font-bold text-white/90 text-sm">{session.certificateResponse.certificate_number}</span>
                        <button
                          onClick={copyCertNumber}
                          className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="flex gap-3 justify-center flex-wrap">
                        <motion.a
                          whileHover={{ scale: 1.04, y: -2 }}
                          whileTap={{ scale: 0.97 }}
                          href={session.certificateResponse.download_url_pdf}
                          download
                          className="inline-flex items-center gap-2 font-bold px-6 py-3 rounded-xl text-sm text-navy-900 transition-all"
                          style={{ background: 'white', boxShadow: '0 4px 16px rgba(255,255,255,0.15)' }}
                        >
                          <Download className="w-4 h-4" /> Download PDF
                        </motion.a>
                        <motion.a
                          whileHover={{ scale: 1.04, y: -2 }}
                          whileTap={{ scale: 0.97 }}
                          href={session.certificateResponse.download_url_docx}
                          download
                          className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-xl text-sm text-white transition-all"
                          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)' }}
                        >
                          <Download className="w-4 h-4" /> Download DOCX
                        </motion.a>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Citation trail */}
                {session.extractionResponse && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-left rounded-2xl p-5 text-xs font-mono mb-5"
                    style={{ background: '#080f1e', border: '1px solid #1a2a40' }}
                  >
                    <p className="text-white/20 mb-3 text-[10px] uppercase tracking-widest">AI Extraction Trail</p>
                    {Object.entries(session.extractionResponse.extracted_data)
                      .filter(([k]) => ['share_capital','reserves_surplus','accumulated_losses','net_worth','turnover','total_assets','total_liabilities'].includes(k))
                      .map(([key, val]) => {
                        if (!val || typeof val !== 'object' || !('value' in val) || val.value == null) return null
                        const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                        return (
                          <p key={key} className="leading-relaxed mb-0.5">
                            <span className="text-sky-400">{label}:</span>{' '}
                            <span className="text-emerald-400 font-bold">₹{Number(val.value).toLocaleString('en-IN')}</span>{' '}
                            {val.source_line && <span className="text-white/25">— "{val.source_line}"</span>}
                          </p>
                        )
                      })}
                    <div className="mt-3 pt-3 border-t border-white/[0.06] flex flex-col gap-0.5">
                      <p className="text-white/18 text-[10px]">Powered by Anthropic Claude AI · Certify Genie</p>
                      <p className="text-white/18 text-[10px]">PII redacted before AI · Data not stored after session</p>
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-3 justify-center flex-wrap mb-4">
                  <button
                    onClick={() => setShowEmail(true)}
                    className="inline-flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl text-sm
                      border border-navy-200 text-navy-700 bg-white hover:bg-navy-50 transition-colors shadow-sm"
                  >
                    <Mail className="w-4 h-4" /> Send to Client
                  </button>
                  <button
                    onClick={() => navigate('/history')}
                    className="inline-flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl text-sm
                      border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <History className="w-4 h-4" /> View History
                  </button>
                </div>
                <div className="flex gap-3 justify-center flex-wrap">
                  <button onClick={() => setStep(5)} className="btn-ghost text-sm">
                    <ArrowLeft className="w-3.5 h-3.5" /> Edit Certificate
                  </button>
                  <button onClick={handleReset} className="btn-primary text-sm">
                    Generate New Certificate
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Manual Redaction Prompt ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showRedactPrompt && !showManualRedaction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(10, 22, 40, 0.80)', backdropFilter: 'blur(12px)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.22 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
                <ShieldCheck className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-base mb-2">Add manual redaction?</h3>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Auto-redaction (CIN, PAN, GSTIN, Aadhaar…) has already been applied.
                You can draw additional boxes over any other sensitive content.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowRedactPrompt(false)
                    setShowManualRedaction(true)
                  }}
                  className="w-full font-bold py-3 rounded-xl text-white text-sm transition-all"
                  style={{ background: 'linear-gradient(135deg, #2ECC71, #27AE60)' }}
                >
                  Yes, let me redact
                </button>
                <button
                  onClick={() => pendingFileId && handleAutoExtract(pendingFileId, [])}
                  className="w-full font-semibold py-3 rounded-xl text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  No, continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Manual Redaction Modal ────────────────────────────────────────────── */}
      {pendingFileId && pendingFile && (
        <ManualRedactionModal
          open={showManualRedaction}
          file={pendingFile}
          fileId={pendingFileId}
          onClose={() => {
            setShowManualRedaction(false)
            if (pendingFileId) handleAutoExtract(pendingFileId, [])
          }}
          onConfirm={(boxes) => {
            setShowManualRedaction(false)
            if (pendingFileId) handleAutoExtract(pendingFileId, boxes)
          }}
        />
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {session.extractionResponse && session.editorState && (
        <>
          <RatioAnalysisModal
            open={showRatios}
            onClose={() => setShowRatios(false)}
            data={session.extractionResponse.extracted_data}
            editorState={session.editorState}
          />
          <ExtractionConfidenceModal
            open={showConfidence}
            onClose={() => setShowConfidence(false)}
            data={session.extractionResponse.extracted_data}
          />
          <YoYComparisonModal
            open={showYoY}
            onClose={() => setShowYoY(false)}
            data={session.extractionResponse.extracted_data}
            certType={session.certificateType ?? 'net_worth'}
          />
        </>
      )}
      {session.certificateResponse && session.editorState && session.certificateType && (
        <EmailModal
          open={showEmail}
          onClose={() => setShowEmail(false)}
          certId={session.certificateResponse.certificate_id}
          certNumber={session.certificateResponse.certificate_number}
          certType={session.certificateType}
          companyName={session.editorState.companyName}
          financialYear={session.editorState.financialYear}
          caName={session.editorState.caName}
          caFirmName={session.editorState.caFirmName}
          caMembershipNo={session.editorState.caMembershipNo}
          caAddress={session.editorState.caAddress}
          nwMethodLabel={session.editorState.nwMethodLabel || undefined}
        />
      )}
    </div>
  )
}
