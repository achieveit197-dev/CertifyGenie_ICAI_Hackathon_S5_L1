/**
 * ExtractionConfidenceModal — Per-field AI confidence breakdown.
 * Shown as a popup from Step 3 (extraction review) and Step 5 (preview).
 */
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ExtractedData, FinancialFigure, FieldStatus } from '../types'

interface FieldDef { label: string; key: keyof ExtractedData }

const FIELDS: FieldDef[] = [
  { label: 'Share Capital',        key: 'share_capital' },
  { label: 'Reserves & Surplus',   key: 'reserves_surplus' },
  { label: 'Accumulated Losses',   key: 'accumulated_losses' },
  { label: 'Net Worth',            key: 'net_worth' },
  { label: 'Total Assets',         key: 'total_assets' },
  { label: 'Total Liabilities',    key: 'total_liabilities' },
  { label: 'Turnover',             key: 'turnover' },
  { label: 'Net Profit',           key: 'net_profit' },
  { label: 'Intangible Assets',    key: 'intangible_assets' },
  { label: 'Goodwill',             key: 'goodwill' },
  { label: 'Revaluation Reserve',  key: 'revaluation_reserve' },
  { label: 'Deferred Expenditure', key: 'deferred_expenditure' },
]

const STATUS_CONFIG: Record<FieldStatus, { label: string; icon: React.ReactNode; bg: string; text: string; border: string }> = {
  verified:     { label: 'Verified',   icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,  bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
  needs_review: { label: 'Review',     icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,  bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-100'  },
  not_found:    { label: 'Not Found',  icon: <XCircle className="w-4 h-4 text-gray-400" />,         bg: 'bg-gray-50',    text: 'text-gray-500',    border: 'border-gray-100'   },
}

function formatINR(v: number | null): string {
  if (v == null) return '—'
  const abs = Math.abs(v)
  let s = Math.round(abs).toString()
  let f = s.length <= 3 ? s : s.slice(-3)
  let r = s.length > 3 ? s.slice(0, -3) : ''
  while (r.length > 2) { f = r.slice(-2) + ',' + f; r = r.slice(0, -2) }
  if (r) f = r + ',' + f
  return `₹${v < 0 ? '-' : ''}${f}`
}

interface Props {
  open: boolean
  onClose: () => void
  data: ExtractedData
}

export function ExtractionConfidenceModal({ open, onClose, data }: Props) {
  const score = Math.round(data.confidence_score * 100)
  const verified = FIELDS.filter(f => {
    const field = data[f.key]
    return field && typeof field === 'object' && 'status' in field && (field as FinancialFigure).status === 'verified'
  }).length
  const review = FIELDS.filter(f => {
    const field = data[f.key]
    return field && typeof field === 'object' && 'status' in field && (field as FinancialFigure).status === 'needs_review'
  }).length
  const missing = FIELDS.filter(f => {
    const field = data[f.key]
    return !field || !(typeof field === 'object' && 'status' in field) || (field as FinancialFigure).status === 'not_found' || (field as FinancialFigure).value == null
  }).length

  const scoreColor = score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'
  const barColor   = score >= 80 ? 'bg-emerald-500'  : score >= 60 ? 'bg-amber-400'   : 'bg-red-500'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(10,22,40,0.70)', backdropFilter: 'blur(10px)' }}
          onClick={e => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.22 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"
              style={{ background: 'linear-gradient(to right, #f8fafc, #f0f4fb)' }}>
              <div>
                <h2 className="font-bold text-navy-900 text-base">AI Extraction Confidence</h2>
                <p className="text-xs text-gray-500 mt-0.5">Per-field status from Claude AI extraction</p>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Overall score */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                  <span className={`text-xl font-extrabold ${scoreColor}`}>{score}%</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1.5">Overall extraction confidence</p>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div className={`h-full rounded-full ${barColor}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="flex gap-3 mt-2">
                    <span className="text-[11px] text-emerald-600 font-semibold">{verified} verified</span>
                    <span className="text-[11px] text-amber-600 font-semibold">{review} needs review</span>
                    <span className="text-[11px] text-gray-400 font-semibold">{missing} not found</span>
                  </div>
                </div>
              </div>
              {score < 80 && (
                <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 text-xs text-amber-700">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <p>Some fields scored below confidence threshold. Review highlighted rows and manually override if needed.</p>
                </div>
              )}
            </div>

            {/* Per-field breakdown */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-2">
              {FIELDS.map(({ label, key }) => {
                const raw = data[key]
                const field = (raw && typeof raw === 'object' && 'status' in raw) ? raw as FinancialFigure : null
                if (!field) return null
                const cfg = STATUS_CONFIG[field.status]
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`rounded-xl border px-3.5 py-2.5 ${cfg.bg} ${cfg.border}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {cfg.icon}
                        <span className={`text-sm font-semibold ${cfg.text}`}>{label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {field.value != null && (
                          <span className="font-mono text-xs text-gray-600">{formatINR(field.value)}</span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                    {field.source_line && (
                      <p className={`text-[10px] mt-1 truncate ${cfg.text} opacity-70`} title={field.source_line}>
                        Source: "{field.source_line}"
                      </p>
                    )}
                  </motion.div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 text-center">
              <p className="text-[10px] text-gray-400">
                Fields marked "Needs Review" should be manually verified before issuing the certificate.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
