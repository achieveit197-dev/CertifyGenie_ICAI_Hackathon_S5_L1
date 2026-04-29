import { motion } from 'framer-motion'
import { CheckCircle, AlertTriangle, XCircle, Shield } from 'lucide-react'
import type { ValidationResult, RedactionSummary } from '../types'

interface Props {
  validation: ValidationResult
  redaction: RedactionSummary
}

export function ValidationPanel({ validation, redaction }: Props) {
  const statusStyles = {
    pass: {
      card: 'border-emerald-100 bg-emerald-50/60',
      iconWrap: 'bg-emerald-100',
      title: 'text-emerald-800',
      text: 'text-emerald-700',
    },
    warning: {
      card: 'border-amber-100 bg-amber-50/60',
      iconWrap: 'bg-amber-100',
      title: 'text-amber-800',
      text: 'text-amber-700',
    },
    fail: {
      card: 'border-red-100 bg-red-50/60',
      iconWrap: 'bg-red-100',
      title: 'text-red-800',
      text: 'text-red-700',
    },
  }[validation.overall_status]

  const StatusIcon = {
    pass: <CheckCircle className="w-4 h-4 text-emerald-600" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-600" />,
    fail: <XCircle className="w-4 h-4 text-red-600" />,
  }[validation.overall_status]

  const statusLabel = {
    pass: 'All checks passed',
    warning: 'Needs attention',
    fail: 'Validation failed',
  }[validation.overall_status]

  return (
    <div className="space-y-3">
      {/* Validation status */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border p-4 ${statusStyles.card}`}
      >
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${statusStyles.iconWrap}`}>
            {StatusIcon}
          </div>
          <div>
            <h4 className={`font-semibold text-sm ${statusStyles.title}`}>{statusLabel}</h4>
          </div>
        </div>
        <ul className="space-y-1 pl-9">
          {validation.messages.map((msg, i) => (
            <li key={i} className={`text-xs leading-relaxed ${statusStyles.text}`}>
              {msg}
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Redaction summary */}
      {redaction.total_redacted > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-navy-100 bg-navy-50/40 p-4"
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-lg bg-navy-100 flex items-center justify-center">
              <Shield className="w-4 h-4 text-navy-600" />
            </div>
            <div>
              <h4 className="font-semibold text-navy-800 text-sm">Privacy Protection Active</h4>
              <p className="text-xs text-navy-600 mt-0.5">
                {redaction.total_redacted} item{redaction.total_redacted !== 1 ? 's' : ''} redacted before AI processing
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pl-9">
            {redaction.cin_count > 0 && (
              <Badge label="CIN" count={redaction.cin_count} />
            )}
            {redaction.pan_count > 0 && (
              <Badge label="PAN" count={redaction.pan_count} />
            )}
            {redaction.aadhaar_count > 0 && (
              <Badge label="Aadhaar" count={redaction.aadhaar_count} />
            )}
            {redaction.mobile_count > 0 && (
              <Badge label="Mobile" count={redaction.mobile_count} />
            )}
            {redaction.email_count > 0 && (
              <Badge label="Email" count={redaction.email_count} />
            )}
            {redaction.gstin_count > 0 && (
              <Badge label="GSTIN" count={redaction.gstin_count} />
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}

function Badge({ label, count }: { label: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-white text-navy-700 border border-navy-200 text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
      <CheckCircle className="w-3 h-3 text-emerald-500" />
      {count} {label}
    </span>
  )
}
