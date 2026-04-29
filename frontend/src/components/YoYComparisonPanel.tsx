/**
 * YoYComparisonPanel — Year-over-year financial comparison table.
 * Rendered only when the uploaded document contains comparative prior-year figures.
 */
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { ExtractedData, CertificateType } from '../types'

interface Props {
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
  prevKey: keyof import('../types').PreviousYearData
  higherIsBetter: boolean
}

const NW_ROWS: RowConfig[] = [
  { label: 'Share Capital',       currKey: 'share_capital',      prevKey: 'share_capital',      higherIsBetter: true  },
  { label: 'Reserves & Surplus',  currKey: 'reserves_surplus',   prevKey: 'reserves_surplus',   higherIsBetter: true  },
  { label: 'Accumulated Losses',  currKey: 'accumulated_losses', prevKey: 'accumulated_losses', higherIsBetter: false },
  { label: 'Net Worth',           currKey: 'net_worth',          prevKey: 'net_worth',          higherIsBetter: true  },
  { label: 'Total Assets',        currKey: 'total_assets',       prevKey: 'total_assets',       higherIsBetter: true  },
  { label: 'Total Liabilities',   currKey: 'total_liabilities',  prevKey: 'total_liabilities',  higherIsBetter: false },
]

const TURNOVER_ROWS: RowConfig[] = [
  { label: 'Turnover',    currKey: 'turnover',    prevKey: 'turnover',    higherIsBetter: true },
  { label: 'Net Profit',  currKey: 'net_profit',  prevKey: 'net_profit',  higherIsBetter: true },
  { label: 'Total Assets',currKey: 'total_assets',prevKey: 'total_assets',higherIsBetter: true },
]

export function YoYComparisonPanel({ data, certType }: Props) {
  const py = data.previous_year
  if (!py) return null

  const rows = certType === 'turnover' ? TURNOVER_ROWS : NW_ROWS
  const currFY = data.financial_year || 'Current Year'
  const prevFY = py.financial_year || 'Previous Year'

  const getCurr = (key: keyof ExtractedData): number | null => {
    const f = data[key]
    if (f && typeof f === 'object' && 'value' in f) return (f as { value: number | null }).value
    return null
  }

  const getPrev = (key: keyof import('../types').PreviousYearData): number | null => {
    const v = py[key]
    return typeof v === 'number' ? v : null
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-2">
          Year-over-Year Comparison
        </span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="rounded-xl border border-blue-100 overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ background: 'linear-gradient(to right, #1e3a5f, #2563eb)' }}>
              <th className="px-3 py-2 text-left text-xs font-semibold text-white">Particulars</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-blue-100">{prevFY}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-white">{currFY}</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-blue-100">Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, currKey, prevKey, higherIsBetter }, i) => {
              const curr = getCurr(currKey)
              const prev = getPrev(prevKey)
              const pct = pctChange(curr, prev)
              const isNetworth = currKey === 'net_worth'

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
                    isNetworth
                      ? 'bg-emerald-50 border-t-2 border-emerald-200 font-bold'
                      : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }
                >
                  <td className="px-3 py-1.5 text-xs text-gray-700 border border-gray-200">{label}</td>
                  <td className="px-3 py-1.5 text-right text-xs font-mono text-gray-500 border border-gray-200">
                    {formatINR(prev)}
                  </td>
                  <td className={`px-3 py-1.5 text-right text-xs font-mono border border-gray-200 ${isNetworth ? 'text-emerald-700' : 'text-gray-800'}`}>
                    {formatINR(curr)}
                  </td>
                  <td className={`px-3 py-1.5 text-right border border-gray-200 ${trendColor}`}>
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
    </div>
  )
}
