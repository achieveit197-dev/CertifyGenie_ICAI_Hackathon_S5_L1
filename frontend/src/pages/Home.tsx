import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Shield, Zap, FileCheck, ArrowRight, TrendingUp, BarChart2,
  Upload, X, CheckCircle, AlertCircle, Loader2, Lock,
  Sparkles, ChevronRight, Eye, GitBranch, Layers,
  GitCompareArrows, Briefcase, Mail, History,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { ManualRedactionModal } from '../components/ManualRedactionModal'
import { applyManualRedaction, uploadFile } from '../api/client'
import type { RedactionPayload } from '../types'

type RedactState = 'idle' | 'uploading' | 'preview' | 'loading' | 'done' | 'clean' | 'error'

interface RedactCounts { CIN: number; PAN: number; GSTIN: number; AADHAAR: number; MOBILE: number; EMAIL: number; Total: number }

function parseRedactSummary(header: string): RedactCounts {
  const get = (key: string) => { const m = header.match(new RegExp(`${key}:(\\d+)`)); return m ? parseInt(m[1]) : 0 }
  return { CIN: get('CIN'), PAN: get('PAN'), GSTIN: get('GSTIN'), AADHAAR: get('AADHAAR'), MOBILE: get('MOBILE'), EMAIL: get('EMAIL'), Total: get('Total') }
}

function RedactModal({ onClose }: { onClose: () => void }) {
  const [file, setFile]               = useState<File | null>(null)
  const [fileId, setFileId]           = useState<string | null>(null)
  const [state, setState]             = useState<RedactState>('idle')
  const [summary, setSummary]         = useState<RedactCounts | null>(null)
  const [errorMsg, setErrorMsg]       = useState<string>('')
  const [dragging, setDragging]       = useState(false)
  const [showViewer, setShowViewer]   = useState(false)
  const [manualBoxCount, setManualBoxCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (f: File) => {
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Only PDF files are supported.')
      setState('error')
      return
    }
    setFile(f)
    setState('uploading')
    setErrorMsg('')
    setSummary(null)
    try {
      const resp = await uploadFile(f)
      setFileId(resp.file_id)
      setState('preview')
      setShowViewer(true)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed')
      setState('error')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleRedactAndDownload = async (boxes: RedactionPayload[]) => {
    if (!fileId || !file) return
    setManualBoxCount(boxes.length)
    setShowViewer(false)
    setState('loading')
    try {
      const { blob, summary: hdr } = await applyManualRedaction(fileId, boxes)
      const summaryHeader = hdr
      const totalMatch = summaryHeader.match(/Total:(\d+)/)
      const total = totalMatch ? parseInt(totalMatch[1]) : 0

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name.replace(/\.pdf$/i, '_redacted.pdf')
      a.click()
      URL.revokeObjectURL(url)

      if (total === 0 && boxes.length === 0) {
        setState('clean')
      } else {
        setSummary(parseRedactSummary(summaryHeader))
        setState('done')
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error')
      setState('error')
    }
  }

  const handleReset = () => {
    setFile(null)
    setFileId(null)
    setState('idle')
    setSummary(null)
    setErrorMsg('')
    setShowViewer(false)
    setManualBoxCount(0)
  }

  // Full-screen viewer — rendered outside the small modal
  if (showViewer && fileId && file) {
    return (
      <ManualRedactionModal
        open={true}
        file={file}
        fileId={fileId}
        confirmLabel="Redact & Download"
        onClose={() => handleRedactAndDownload([])}
        onConfirm={handleRedactAndDownload}
      />
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(14, 30, 50, 0.65)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 12 }}
        transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">Check Redaction</h2>
              <p className="text-xs text-gray-500 mt-0.5">CIN, PAN, GSTIN, Aadhaar, Mobile &amp; Email</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {(state === 'idle' || state === 'error') && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 mb-4 ${
                dragging ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
              <div className="w-10 h-10 rounded-xl bg-gray-100 mx-auto mb-3 flex items-center justify-center">
                <Upload className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">Drop PDF here or <span className="text-navy-600 underline underline-offset-2">browse</span></p>
              <p className="text-xs text-gray-400 mt-1">PDF only · Max 20 MB</p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {state === 'uploading' && (
              <motion.div key="uploading" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-4 mb-4">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-800">Uploading &amp; scanning…</p>
                  <p className="text-xs text-blue-600 mt-0.5">{file?.name}</p>
                </div>
              </motion.div>
            )}
            {state === 'loading' && (
              <motion.div key="loading" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-4 mb-4">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                <p className="text-sm font-semibold text-blue-800">Applying redactions…</p>
              </motion.div>
            )}
            {state === 'clean' && (
              <motion.div key="clean" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-4">
                <span className="text-xl">🎉</span>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">You're all clear — AI-ready!</p>
                  <p className="text-xs text-emerald-700 mt-0.5">No sensitive identifiers found.</p>
                </div>
              </motion.div>
            )}
            {state === 'done' && summary && (
              <motion.div key="done" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <p className="text-sm font-semibold text-green-800">Redacted PDF downloaded!</p>
                  <span className="ml-auto text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{summary.Total} auto-redacted</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {(['CIN', 'PAN', 'GSTIN', 'AADHAAR', 'MOBILE', 'EMAIL'] as const).map((key) => (
                    <div key={key} className={`rounded-lg px-2.5 py-1.5 flex items-center justify-between ${summary[key] > 0 ? 'bg-green-100' : 'bg-white/60'}`}>
                      <span className={`text-[10px] font-bold tracking-wide ${summary[key] > 0 ? 'text-green-700' : 'text-gray-400'}`}>{key}</span>
                      <span className={`text-xs font-black ${summary[key] > 0 ? 'text-green-800' : 'text-gray-300'}`}>{summary[key]}</span>
                    </div>
                  ))}
                </div>
                <div className={`rounded-lg px-2.5 py-1.5 flex items-center justify-between ${manualBoxCount > 0 ? 'bg-blue-50 border border-blue-100' : 'bg-white/60'}`}>
                  <span className={`text-[10px] font-bold tracking-wide ${manualBoxCount > 0 ? 'text-blue-700' : 'text-gray-400'}`}>MANUAL BOXES</span>
                  <span className={`text-xs font-black ${manualBoxCount > 0 ? 'text-blue-800' : 'text-gray-300'}`}>{manualBoxCount}</span>
                </div>
                <button onClick={handleReset} className="mt-3 text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors">
                  Redact another file
                </button>
              </motion.div>
            )}
            {state === 'error' && (
              <motion.div key="error" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700">{errorMsg}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-xs text-gray-400 text-center mt-2">Auto + manual redaction · No AI · Secure download</p>
        </div>
      </motion.div>
    </div>
  )
}

const CERT_TYPES = [
  {
    icon: TrendingUp,
    title: 'Net Worth Certificate',
    desc: 'Share Capital, Reserves & computed Net Worth from audited Balance Sheet with full verification.',
    badge: 'Most Used',
    color: 'from-blue-500/10 to-navy-500/5',
    iconBg: 'bg-navy-50',
    iconColor: 'text-navy-600',
  },
  {
    icon: BarChart2,
    title: 'Turnover Certificate',
    desc: 'Annual turnover and net profit from audited financial statements for the given financial year.',
    badge: null,
    color: 'from-emerald-500/10 to-teal-500/5',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    icon: Briefcase,
    title: 'Working Capital Certificate',
    desc: 'Current Assets vs Current Liabilities — net Working Capital for banking and credit facility compliance.',
    badge: 'New',
    color: 'from-violet-500/10 to-purple-500/5',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
]

const FEATURES = [
  {
    icon: Lock,
    title: 'Privacy First',
    desc: 'Auto-redacts CIN, PAN, GSTIN, Aadhaar & mobile. Draw custom boxes over any additional sensitive content before AI sees the document.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
  },
  {
    icon: Zap,
    title: 'Extracts in Seconds',
    desc: 'Claude AI reads your PDF or Excel balance sheet and pulls exact figures with per-field confidence scores instantly.',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    icon: Eye,
    title: 'Full Citation Trail',
    desc: 'Every figure is traced to its exact source line in the document — full audit trail for every certificate generated.',
    color: 'text-violet-500',
    bg: 'bg-violet-50',
  },
  {
    icon: GitBranch,
    title: 'Live Edit & Preview',
    desc: 'Override values, customise narrative, add UDIN, set a PDF password, and preview the certificate in real time.',
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
  {
    icon: Layers,
    title: '7 Net Worth Methods',
    desc: 'Book Value, Tangible NW, Companies Act, SEBI LODR, NAV, Consolidated & more — entity-aware method selection for Company, LLP, Partnership & Proprietorship.',
    color: 'text-indigo-500',
    bg: 'bg-indigo-50',
  },
  {
    icon: GitCompareArrows,
    title: 'Year-on-Year Analysis',
    desc: 'Compare current year against prior year figures with trend indicators, ratio analysis, and YoY growth built in.',
    color: 'text-purple-500',
    bg: 'bg-purple-50',
  },
  {
    icon: Mail,
    title: 'Email to Client',
    desc: 'Send the generated certificate directly to the client with a professional email — no manual download and re-attach.',
    color: 'text-sky-500',
    bg: 'bg-sky-50',
  },
  {
    icon: History,
    title: 'Certificate History',
    desc: 'Every certificate generated is saved locally — revisit, re-download PDF or DOCX, and track all past certificates.',
    color: 'text-rose-500',
    bg: 'bg-rose-50',
  },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Upload Document', desc: 'Drop in your PDF balance sheet or Excel file — up to 10 MB.' },
  { step: '02', title: 'AI Extracts Figures', desc: 'PII is redacted first, then Claude reads the clean document and pulls financial data.' },
  { step: '03', title: 'Review & Edit', desc: 'Override values, customise narrative, and preview the certificate live.' },
  { step: '04', title: 'Download', desc: 'Get a professional ICAI-format PDF and editable DOCX in seconds.' },
]

const container = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } }
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } } }

export default function Home() {
  const navigate = useNavigate()
  const [showRedact, setShowRedact] = useState(false)

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <AnimatePresence>{showRedact && <RedactModal onClose={() => setShowRedact(false)} />}</AnimatePresence>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0e1e32 40%, #162c49 100%)' }}>
        {/* Ambient glow orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-30 blur-[100px]"
            style={{ background: 'radial-gradient(circle, #2561a9 0%, transparent 70%)' }} />
          <div className="absolute -bottom-16 right-0 w-[450px] h-[450px] rounded-full opacity-20 blur-[90px]"
            style={{ background: 'radial-gradient(circle, #2ECC71 0%, transparent 70%)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] rounded-full opacity-[0.06] blur-[80px]"
            style={{ background: 'radial-gradient(ellipse, #5181bb 0%, transparent 70%)' }} />
          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-8 pb-16">
          {/* Nav */}
          <nav className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-accent/20 border border-brand-accent/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-brand-accent" />
              </div>
              <span className="font-bold text-white text-lg tracking-tight">Certify Genie</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowRedact(true)}
                className="hidden sm:flex items-center gap-2 text-white/60 hover:text-white text-sm font-medium transition-colors"
              >
                <Shield className="w-3.5 h-3.5" /> Check Redaction
              </button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/generate')}
                className="inline-flex items-center gap-2 bg-white text-navy-900 font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-white/90 transition-colors shadow-sm"
              >
                Get Started <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </nav>

          {/* Hero content */}
          <div className="text-center max-w-4xl mx-auto">
            {/* Hackathon badge */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full text-xs font-semibold text-white/70"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
              ICAI AI Hackathon Season 5
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-[72px] font-extrabold text-white tracking-tight leading-[1.04] mb-6"
            >
              Generate CA Certificates{' '}
              <span className="relative">
                <span style={{ background: 'linear-gradient(135deg, #2ECC71, #5DE5A0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  with AI
                </span>
                <motion.svg
                  className="absolute -bottom-2 left-0 right-0 w-full"
                  viewBox="0 0 300 8"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                >
                  <path d="M2 5 Q75 1 150 5 Q225 9 298 5" stroke="#2ECC71" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
                </motion.svg>
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-white/55 mb-10 max-w-xl mx-auto leading-relaxed"
            >
              Upload a balance sheet or Excel file. Claude AI extracts figures, redacts PII, and generates professional ICAI-format certificates — no manual entry.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <motion.button
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/generate')}
                className="inline-flex items-center gap-2.5 font-bold px-8 py-4 rounded-2xl text-base transition-all"
                style={{
                  background: 'linear-gradient(135deg, #2ECC71, #27AE60)',
                  color: 'white',
                  boxShadow: '0 8px 32px rgba(46, 204, 113, 0.35)',
                }}
              >
                Start Generating <ArrowRight className="w-4.5 h-4.5" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowRedact(true)}
                className="inline-flex items-center gap-2 font-semibold px-6 py-4 rounded-2xl text-base text-white/80 hover:text-white transition-all"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <Shield className="w-4 h-4 text-emerald-400" /> Check Redaction
              </motion.button>
            </motion.div>

            {/* Trust chips */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-10 text-xs text-white/35 font-medium"
            >
              {['PDF & Excel support', 'Manual PDF redaction', '3 certificate types', '7 NW methods', 'PDF + DOCX + Email', 'UDIN & history'].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3 text-brand-accent/60" /> {t}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="section-label">Workflow</p>
          <h2 className="text-3xl font-bold text-gray-900">From document to certificate in 4 steps</h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOW_IT_WORKS.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.45 }}
              className="relative"
            >
              {i < HOW_IT_WORKS.length - 1 && (
                <div className="hidden lg:block absolute top-7 left-[calc(100%-12px)] w-6 h-px bg-gradient-to-r from-gray-300 to-transparent z-10" />
              )}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 h-full"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.05)' }}>
                <div className="text-3xl font-black text-gray-100 mb-3 leading-none">{step.step}</div>
                <h3 className="font-bold text-gray-900 text-sm mb-1.5">{step.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Certificates ── */}
      <section className="py-16 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <p className="section-label">Certificate Types</p>
            <h2 className="text-3xl font-bold text-gray-900">What we generate</h2>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {CERT_TYPES.map((ct) => (
              <motion.div
                key={ct.title}
                variants={item}
                className={`group relative bg-gradient-to-br ${ct.color} border border-gray-100 rounded-2xl p-6 hover:border-gray-200 hover:shadow-card-hover transition-all duration-300 cursor-default`}
              >
                {ct.badge && (
                  <span className="absolute top-4 right-4 text-[10px] font-bold bg-brand-accent/10 text-brand-accent px-2.5 py-1 rounded-full tracking-wide">
                    {ct.badge}
                  </span>
                )}
                <div className={`w-12 h-12 rounded-xl ${ct.iconBg} group-hover:scale-105 flex items-center justify-center ${ct.iconColor} mb-4 transition-transform duration-200`}>
                  <ct.icon className="w-5.5 h-5.5" style={{ width: 22, height: 22 }} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-base">{ct.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{ct.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="section-label">Why Certify Genie</p>
          <h2 className="text-3xl font-bold text-gray-900">Built for CA firms</h2>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={item}
              className="flex items-start gap-4 bg-white border border-gray-100 rounded-2xl p-5"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)' }}
            >
              <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center flex-shrink-0`}>
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-12 max-w-5xl mx-auto px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl px-10 py-14 text-center"
          style={{
            background: 'linear-gradient(135deg, #0a1628 0%, #0e1e32 50%, #162c49 100%)',
          }}
        >
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20 blur-[70px]"
            style={{ background: 'radial-gradient(circle, #2ECC71, transparent)' }} />

          <div className="relative">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(46,204,113,0.15)', border: '1px solid rgba(46,204,113,0.25)' }}>
              <FileCheck className="w-7 h-7 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Ready to automate your certificates?</h3>
            <p className="text-white/50 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
              Upload your first document and generate a professional certificate in under 30 seconds.
            </p>
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/generate')}
              className="inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-xl text-sm text-navy-900 transition-all"
              style={{ background: 'white', boxShadow: '0 4px 20px rgba(255,255,255,0.15)' }}
            >
              Start Generating <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#0a1628' }} className="text-white/40 py-8 text-center text-xs border-t border-white/5">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-brand-accent/15 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-brand-accent" />
          </div>
          <span className="font-semibold text-white/60 text-sm">Certify Genie</span>
        </div>
        <p>ICAI AI Hackathon Season 5 &nbsp;·&nbsp; FastAPI + React + Claude claude-sonnet-4-6</p>
      </footer>
    </div>
  )
}
