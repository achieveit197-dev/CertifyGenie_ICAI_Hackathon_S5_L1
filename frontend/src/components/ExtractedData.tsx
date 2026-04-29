import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, AlertTriangle, XCircle, Edit3, Check } from 'lucide-react'
import type { ExtractedData as ExtractedDataType, FinancialFigure, FieldStatus } from '../types'
import { useSession } from '../context/SessionContext'

function formatINR(value: number | null | undefined): string {
  if (value == null) return '—'
  const abs = Math.abs(value)
  const s = abs.toFixed(0)
  let formatted = ''
  if (s.length <= 3) {
    formatted = s
  } else {
    formatted = s.slice(-3)
    let remaining = s.slice(0, -3)
    while (remaining.length > 2) {
      formatted = remaining.slice(-2) + ',' + formatted
      remaining = remaining.slice(0, -2)
    }
    if (remaining) formatted = remaining + ',' + formatted
  }
  return `₹${value < 0 ? '-' : ''}${formatted}`
}

const STATUS_ICON: Record<FieldStatus, React.ReactNode> = {
  verified: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
  needs_review: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
  not_found: <XCircle className="w-3.5 h-3.5 text-gray-400" />,
}

const STATUS_LABEL: Record<FieldStatus, string> = {
  verified: 'Verified',
  needs_review: 'Review',
  not_found: 'Not Found',
}

const STATUS_CLASS: Record<FieldStatus, string> = {
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  needs_review: 'bg-amber-50 text-amber-700 border-amber-100',
  not_found: 'bg-gray-50 text-gray-500 border-gray-100',
}

interface RowProps {
  label: string
  field: FinancialFigure | null | undefined
  fieldKey: string
}

function DataRow({ label, field, fieldKey }: RowProps) {
  const { session, updateSession } = useSession()
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

  const status: FieldStatus = field?.status ?? 'not_found'
  const currentOverride = session.overrides[fieldKey]
  const displayValue = currentOverride != null ? currentOverride : field?.value

  const startEdit = () => {
    setEditValue(String(displayValue ?? ''))
    setEditing(true)
  }

  const saveEdit = () => {
    const parsed = parseFloat(editValue.replace(/[,₹\s]/g, ''))
    if (!isNaN(parsed)) {
      updateSession({ overrides: { ...session.overrides, [fieldKey]: parsed } })
    }
    setEditing(false)
  }

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors"
    >
      <td className="px-4 py-3 text-sm font-medium text-gray-700 w-48">{label}</td>
      <td className="px-4 py-3 text-sm font-mono">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
              autoFocus
              className="border border-navy-300 rounded-lg px-2.5 py-1.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 transition-all"
            />
            <button
              onClick={saveEdit}
              className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 flex items-center justify-center transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className={currentOverride != null ? 'text-amber-700 font-semibold' : 'text-gray-800'}>
              {formatINR(displayValue)}
            </span>
            {field?.value != null && (
              <button
                onClick={startEdit}
                className="w-6 h-6 rounded-md text-gray-300 hover:text-navy-600 hover:bg-navy-50 flex items-center justify-center transition-colors"
                title="Override value"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            )}
            {currentOverride != null && (
              <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-md">
                edited
              </span>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_CLASS[status]}`}>
          {STATUS_ICON[status]}
          {STATUS_LABEL[status]}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate" title={field?.source_line ?? ''}>
        {field?.source_line || '—'}
      </td>
    </motion.tr>
  )
}

interface Props {
  data: ExtractedDataType
}

export function ExtractedDataView({ data }: Props) {
  const rows: Array<{ label: string; key: keyof ExtractedDataType }> = [
    { label: 'Share Capital', key: 'share_capital' },
    { label: 'Reserves & Surplus', key: 'reserves_surplus' },
    { label: 'Accumulated Losses', key: 'accumulated_losses' },
    { label: 'Net Worth', key: 'net_worth' },
    { label: 'Total Assets', key: 'total_assets' },
    { label: 'Total Liabilities', key: 'total_liabilities' },
    { label: 'Turnover', key: 'turnover' },
    { label: 'Net Profit', key: 'net_profit' },
  ]

  const confidencePct = Math.round(data.confidence_score * 100)
  const confidenceColor = data.confidence_score >= 0.8
    ? 'bg-emerald-500'
    : data.confidence_score >= 0.6
    ? 'bg-amber-400'
    : 'bg-red-400'
  const confidenceTextColor = data.confidence_score >= 0.8
    ? 'text-emerald-700'
    : data.confidence_score >= 0.6
    ? 'text-amber-700'
    : 'text-red-600'

  return (
    <div className="w-full">
      {/* Confidence + meta row */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">AI Confidence</span>
          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
            <motion.div
              className={`h-1.5 rounded-full ${confidenceColor}`}
              initial={{ width: 0 }}
              animate={{ width: `${confidencePct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <span className={`text-sm font-bold w-10 text-right ${confidenceTextColor}`}>
            {confidencePct}%
          </span>
        </div>
      </div>

      {/* Company & FY chips */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Company</p>
          <p className="font-semibold text-navy-800 text-sm truncate">{data.company_name || '—'}</p>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Financial Year</p>
          <p className="font-semibold text-navy-800 text-sm">{data.financial_year || '—'}</p>
        </div>
      </div>

      {/* Data table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-card">
        <table className="w-full">
          <thead>
            <tr className="bg-navy-900 text-white/70 text-[11px] uppercase tracking-wide">
              <th className="px-4 py-3 text-left font-semibold">Field</th>
              <th className="px-4 py-3 text-left font-semibold">Value</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Source Citation</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {rows.map(({ label, key }) => (
              <DataRow
                key={key}
                label={label}
                field={data[key] as FinancialFigure | null}
                fieldKey={key}
              />
            ))}
          </tbody>
        </table>
      </div>

      {data.extraction_notes && (
        <p className="mt-3 text-xs text-gray-400 italic">{data.extraction_notes}</p>
      )}
    </div>
  )
}
