/**
 * YoYComparisonModal — Year-over-year financial comparison.
 * Shown only when the uploaded document contained comparative prior-year figures.
 */
import { X, TrendingUp, TrendingDown, Minus, GitCompareArrows } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ExtractedData, CertificateType } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  data: ExtractedData
  certType: CertificateType
}

function formatINR(value: number | null | undefined): string {
  if (value == null) return '—'
  const abs = Math.abs(value)
  const s = Math.round(abs).toString()
  let formatted = s.length <= 3 ? s : s.slice(-3)
  let remaining = s.length <= 3 ? '' : s.slice(0, -3)
  while (remaining.length > 2) {
    formatted = remaining.slice(-2) + ',' + formatted
    remaining = remaining.slice(0, -2)
  }
  if (remaining) formatted = remaining + ',' + formatted
  return `₹${value < 0 ? '-' : ''}${formatted}`
}

function pctChange(curr: number | null | undefined, prev: number | null | undefined): number | null {
  if (curr == null || prev == null || prev === 0) return null
  return ((curr - prev) / Math.abs(prev)) * 100
}

interface RowConfig {
  label: string
  currKey: keyof ExtractedData
  prevKey: keyof NonNullable<ExtractedData['previous_year']>
  higherIsBetter: boolean
  isHighlight?: boolean
}

const NW_ROWS: RowConfig[] = [
  { label: 'Share Capital',      currKey: 'share_capital',      prevKey: 'share_capital',      higherIsBetter: true  },
  { label: 'Reserves & Surplus', currKey: 'reserves_surplus',   prevKey: 'reserves_surplus',   higherIsBetter: true  },
  { label: 'Accumulated Losses', currKey: 'accumulated_losses', prevKey: 'accumulated_losses', higherIsBetter: false },
  { label: 'Net Worth',          currKey: 'net_worth',          prevKey: 'net_worth',          higherIsBetter: true, isHighlight: true },
  { label: 'Total Assets',       currKey: 'total_assets',       prevKey: 'total_assets',       higherIsBetter: true  },
  { label: 'Total Liabilities',  currKey: 'total_liabilities',  prevKey: 'total_liabilities',  higherIsBetter: false },
]

const TURNOVER_ROWS: RowConfig[] = [
  { label: 'Turnover',     currKey: 'turnover',     prevKey: 'turnover',     higherIsBetter: true, isHighlight: true },
  { label: 'Net Profit',   currKey: 'net_profit',   prevKey: 'net_profit',   higherIsBetter: true  },
  { label: 'Total Assets', currKey: 'total_assets', prevKey: 'total_assets', higherIsBetter: true  },
]

const WC_ROWS: RowConfig[] = [
  { label: 'Current Assets',      currKey: 'current_assets',      prevKey: 'current_assets',      higherIsBetter: true  },
  { label: 'Current Liabilities', currKey: 'current_liabilities', prevKey: 'current_liabilities', higherIsBetter: false },
  { label: 'Working Capital',     currKey: 'working_capital',     prevKey: 'working_capital',     higherIsBetter: true, isHighlight: true },
]

export function YoYComparisonModal({ open, onClose, data, certType }: Props) {
  const py = data.previous_year
  const rows = certType === 'turnover' ? TURNOVER_ROWS : certType === 'working_capital' ? WC_ROWS : NW_ROWS
  const currFY = data.financial_year || 'Current Year'
  const prevFY = py?.financial_year || 'Previous Year'

  const getCurr = (key: keyof ExtractedData): number | null => {
    const f = data[key]
    if (f && typeof f === 'object' && 'value' in f) return (f as { value: number | null }).value
    return null
  }

  const getPrev = (key: keyof NonNullable<ExtractedData['previous_year']>): number | null => {
    if (!py) return null
    const v = py[key]
    return typeof v === 'number' ? v : null
  }

  const hasData = py != null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(10,22,40,0.75)', backdropFilter: 'blur(10px)' }}
          onClick={e => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.22 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-gray-100"
              style={{ background: 'linear-gradient(to right, #f8fafc, #f0f4fb)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-navy-50 border border-navy-100 flex items-center justify-center">
                  <GitCompareArrows className="w-4 h-4 text-navy-600" />
                </div>
                <div>
                  <h2 className="font-bold text-navy-900 text-base">Year-over-Year Comparison</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {hasData ? `${prevFY} → ${currFY}` : 'No comparative data found in this document'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="p-6">
              {!hasData ? (
                <div className="text-center py-10 text-gray-400">
                  <GitCompareArrows className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold text-sm">No prior-year data detected</p>
                  <p className="text-xs mt-1">
                    Upload a document that includes a comparative column (e.g. a Schedule III Balance Sheet)
                    to see year-over-year analysis.
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr style={{ background: 'linear-gradient(to right, #1e3a5f, #2563eb)' }}>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-white">Particulars</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-blue-200">{prevFY}</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-white">{currFY}</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-blue-200">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(({ label, currKey, prevKey, higherIsBetter, isHighlight }, i) => {
                          const curr = getCurr(currKey)
                          const prev = getPrev(prevKey)
                          const pct = pctChange(curr, prev)

                          let trendColor = 'text-gray-400'
                          let TrendIcon = Minus
                          if (pct != null) {
                            const positive = pct > 0
                            const good = higherIsBetter ? positive : !positive
                            trendColor = good ? 'text-emerald-600' : 'text-red-500'
                            TrendIcon = positive ? TrendingUp : TrendingDown
                          }

                          return (
                            <tr
                              key={currKey}
                              className={
                                isHighlight
                                  ? 'bg-emerald-50 border-t-2 border-emerald-200 font-bold'
                                  : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                              }
                            >
                              <td className="px-4 py-2.5 text-xs text-gray-700 border border-gray-200">{label}</td>
                              <td className="px-4 py-2.5 text-right text-xs font-mono text-gray-500 border border-gray-200">
                                {formatINR(prev)}
                              </td>
                              <td className={`px-4 py-2.5 text-right text-xs font-mono border border-gray-200 ${isHighlight ? 'text-emerald-700' : 'text-gray-800'}`}>
                                {formatINR(curr)}
                              </td>
                              <td className={`px-4 py-2.5 text-right border border-gray-200 ${trendColor}`}>
                                {pct != null ? (
                                  <span className="flex items-center justify-end gap-1 text-xs font-semibold">
                                    <TrendIcon className="w-3 h-3" />
                                    {Math.abs(pct).toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-300">—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[10px] text-gray-400 mt-3">
                    Comparative figures extracted from the uploaded document. Green = improvement, Red = decline.
                  </p>
                </>
              )}
            </div>

            <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
              <button onClick={onClose} className="btn-ghost text-sm">Close</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
