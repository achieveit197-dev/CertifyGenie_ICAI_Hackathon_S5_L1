/**
 * RatioAnalysisModal — Financial ratio analysis with thumb-rule commentary.
 * Triggered from the Step 5 Preview page via the "Ratio Analysis" button.
 */
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ExtractedData, CertificateEditorState } from '../types'

type RatioStatus = 'excellent' | 'good' | 'average' | 'poor' | 'danger'

interface RatioResult {
  name: string
  value: number | null
  display: string
  unit: string
  status: RatioStatus | null
  comment: string
  formula: string
  benchmark: string
  higherIsBetter: boolean
}

const STATUS_CONFIG: Record<RatioStatus, { label: string; bg: string; text: string; bar: string }> = {
  excellent: { label: 'Excellent', bg: 'bg-emerald-50',  text: 'text-emerald-700', bar: 'bg-emerald-500' },
  good:      { label: 'Good',      bg: 'bg-green-50',    text: 'text-green-700',   bar: 'bg-green-400'  },
  average:   { label: 'Average',   bg: 'bg-amber-50',    text: 'text-amber-700',   bar: 'bg-amber-400'  },
  poor:      { label: 'Poor',      bg: 'bg-orange-50',   text: 'text-orange-700',  bar: 'bg-orange-500' },
  danger:    { label: 'Danger',    bg: 'bg-red-50',      text: 'text-red-700',     bar: 'bg-red-500'    },
}

// ── Ratio evaluators ──────────────────────────────────────────────────────────

function evalDebt(val: number): { status: RatioStatus; comment: string } {
  if (val < 0)    return { status: 'danger',    comment: 'Negative net worth — liabilities exceed total equity. Requires immediate attention.' }
  if (val <= 0.5) return { status: 'excellent', comment: 'Very low leverage. Company is primarily equity-funded — financially resilient.' }
  if (val <= 1)   return { status: 'good',      comment: 'Healthy balance between debt and equity. Manageable leverage.' }
  if (val <= 2)   return { status: 'average',   comment: 'Above-average leverage. Raising further debt may be difficult.' }
  return            { status: 'danger',          comment: 'Very high leverage. Significant financial risk — creditors hold more than 2× equity.' }
}

function evalRonw(val: number): { status: RatioStatus; comment: string } {
  if (val > 20)   return { status: 'excellent', comment: 'Exceptional returns on equity — management is highly efficient at generating profit.' }
  if (val > 15)   return { status: 'good',      comment: 'Strong return on equity. Above industry average performance.' }
  if (val > 8)    return { status: 'average',   comment: 'Moderate return. Adequate but has room for improvement.' }
  if (val >= 0)   return { status: 'poor',      comment: 'Low returns on equity. Business may not be generating sufficient profit.' }
  return            { status: 'danger',          comment: 'Negative returns — company is generating losses against equity invested.' }
}

function evalNpm(val: number): { status: RatioStatus; comment: string } {
  if (val > 20)   return { status: 'excellent', comment: 'Excellent profit margins — strong pricing power and cost control.' }
  if (val > 10)   return { status: 'good',      comment: 'Good profitability. Company retains a healthy share of each revenue rupee.' }
  if (val > 5)    return { status: 'average',   comment: 'Moderate margins. Typical for competitive or high-volume industries.' }
  if (val >= 0)   return { status: 'poor',      comment: 'Very thin margins. Vulnerable to cost increases or revenue dips.' }
  return            { status: 'danger',          comment: 'Negative margins — operations are loss-making. Revenue does not cover costs.' }
}

function evalAto(val: number): { status: RatioStatus; comment: string } {
  if (val > 2)    return { status: 'excellent', comment: 'High asset efficiency — every rupee of assets generates over ₹2 in revenue.' }
  if (val > 1)    return { status: 'good',      comment: 'Good asset utilisation. Assets are productively deployed.' }
  if (val > 0.5)  return { status: 'average',   comment: 'Moderate utilisation. Assets could be better leveraged for revenue generation.' }
  return            { status: 'poor',            comment: 'Low asset turnover. Large asset base relative to revenue — possible overcapitalisation.' }
}

function evalEquity(val: number): { status: RatioStatus; comment: string } {
  if (val > 60)   return { status: 'excellent', comment: 'Strong equity base — over 60% of assets funded by owners. Very low dependence on debt.' }
  if (val > 40)   return { status: 'good',      comment: 'Good equity proportion. Comfortable buffer for creditors.' }
  if (val > 25)   return { status: 'average',   comment: 'Moderate equity ratio. Debt dependency is notable but not alarming.' }
  if (val >= 0)   return { status: 'poor',      comment: 'Low equity proportion. High debt dependency — vulnerable to interest rate changes.' }
  return            { status: 'danger',          comment: 'Negative equity — technical insolvency. Liabilities exceed assets entirely.' }
}

function evalDebtRatio(val: number): { status: RatioStatus; comment: string } {
  if (val < 0.4)  return { status: 'excellent', comment: 'Less than 40% of assets are debt-financed. Very sound financial structure.' }
  if (val < 0.6)  return { status: 'good',      comment: 'Moderate debt ratio. Assets are reasonably self-funded.' }
  if (val < 0.75) return { status: 'average',   comment: 'More than half the asset base is debt-funded — watch for rising interest costs.' }
  return            { status: 'danger',          comment: 'Over 75% of assets are debt-financed. Very high financial risk.' }
}

// ── Value getter (respects CA overrides and method-specific NW) ───────────────

function val(key: string, data: ExtractedData, editor: CertificateEditorState): number | null {
  if (editor.rowValues[key] != null) return editor.rowValues[key]
  const f = data[key as keyof ExtractedData]
  if (f && typeof f === 'object' && 'value' in f) return (f as { value: number | null }).value
  return null
}

// ── Ratio computer ────────────────────────────────────────────────────────────

function computeRatios(data: ExtractedData, editor: CertificateEditorState): RatioResult[] {
  const nw = val('net_worth', data, editor)
  const ta = val('total_assets', data, editor)
  const tl = val('total_liabilities', data, editor)
  const tv = val('turnover', data, editor)
  const np = val('net_profit', data, editor)

  const ratios: RatioResult[] = []

  // 1. Debt-to-Equity
  if (nw != null && tl != null) {
    const de = nw !== 0 ? tl / nw : null
    const ev = de != null ? evalDebt(de) : null
    ratios.push({
      name: 'Debt-to-Equity Ratio', value: de,
      display: de != null ? de.toFixed(2) : 'N/A', unit: 'x',
      status: ev?.status ?? null, comment: ev?.comment ?? 'Insufficient data.',
      formula: 'Total Liabilities ÷ Net Worth',
      benchmark: '< 1.0 is good · < 0.5 is excellent · > 2.0 is risky',
      higherIsBetter: false,
    })
  }

  // 2. Return on Net Worth
  if (nw != null && np != null && nw !== 0) {
    const ronw = (np / nw) * 100
    const ev = evalRonw(ronw)
    ratios.push({
      name: 'Return on Net Worth', value: ronw,
      display: ronw.toFixed(1), unit: '%',
      status: ev.status, comment: ev.comment,
      formula: '(Net Profit ÷ Net Worth) × 100',
      benchmark: '> 15% good · > 20% excellent · < 0% loss-making',
      higherIsBetter: true,
    })
  }

  // 3. Net Profit Margin
  if (tv != null && np != null && tv !== 0) {
    const npm = (np / tv) * 100
    const ev = evalNpm(npm)
    ratios.push({
      name: 'Net Profit Margin', value: npm,
      display: npm.toFixed(1), unit: '%',
      status: ev.status, comment: ev.comment,
      formula: '(Net Profit ÷ Turnover) × 100',
      benchmark: '> 10% good · > 20% excellent · < 5% thin',
      higherIsBetter: true,
    })
  }

  // 4. Asset Turnover Ratio
  if (ta != null && tv != null && ta !== 0) {
    const ato = tv / ta
    const ev = evalAto(ato)
    ratios.push({
      name: 'Asset Turnover Ratio', value: ato,
      display: ato.toFixed(2), unit: 'x',
      status: ev.status, comment: ev.comment,
      formula: 'Turnover ÷ Total Assets',
      benchmark: '> 1.0 good · > 2.0 excellent · < 0.5 low utilisation',
      higherIsBetter: true,
    })
  }

  // 5. Equity Ratio (Proprietary Ratio)
  if (ta != null && nw != null && ta !== 0) {
    const er = (nw / ta) * 100
    const ev = evalEquity(er)
    ratios.push({
      name: 'Equity Ratio', value: er,
      display: er.toFixed(1), unit: '%',
      status: ev.status, comment: ev.comment,
      formula: '(Net Worth ÷ Total Assets) × 100',
      benchmark: '> 40% good · > 60% excellent · < 25% high debt dependency',
      higherIsBetter: true,
    })
  }

  // 6. Debt Ratio
  if (ta != null && tl != null && ta !== 0) {
    const dr = tl / ta
    const ev = evalDebtRatio(dr)
    ratios.push({
      name: 'Debt Ratio', value: dr,
      display: dr.toFixed(2), unit: 'x',
      status: ev.status, comment: ev.comment,
      formula: 'Total Liabilities ÷ Total Assets',
      benchmark: '< 0.4 excellent · < 0.6 good · > 0.75 risky',
      higherIsBetter: false,
    })
  }

  return ratios
}

// ── Trend Icon ────────────────────────────────────────────────────────────────

function TrendIcon({ status, higher }: { status: RatioStatus | null; higher: boolean }) {
  if (!status) return <Minus className="w-3.5 h-3.5 text-gray-400" />
  const good = status === 'excellent' || status === 'good'
  const bad  = status === 'danger'   || status === 'poor'
  if (good)  return higher ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> : <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
  if (bad)   return higher ? <TrendingDown className="w-3.5 h-3.5 text-red-500" />   : <TrendingUp className="w-3.5 h-3.5 text-red-500" />
  return <Minus className="w-3.5 h-3.5 text-amber-500" />
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  data: ExtractedData
  editorState: CertificateEditorState
}

export function RatioAnalysisModal({ open, onClose, data, editorState }: Props) {
  const ratios = computeRatios(data, editorState)
  const dangerCount  = ratios.filter(r => r.status === 'danger').length
  const warningCount = ratios.filter(r => r.status === 'poor' || r.status === 'average').length

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
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"
              style={{ background: 'linear-gradient(to right, #f8fafc, #f0f4fb)' }}>
              <div>
                <h2 className="font-bold text-navy-900 text-base">Financial Ratio Analysis</h2>
                <p className="text-xs text-gray-500 mt-0.5">Based on extracted figures · Thumb-rule thresholds</p>
              </div>
              <div className="flex items-center gap-3">
                {dangerCount > 0 && (
                  <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
                    {dangerCount} Danger
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                    {warningCount} Warning
                  </span>
                )}
                <button onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
              {ratios.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="font-semibold">Not enough data for ratio analysis.</p>
                  <p className="text-sm mt-1">Net Profit, Turnover, and Total Assets are needed.</p>
                </div>
              ) : ratios.map((r) => {
                const cfg = r.status ? STATUS_CONFIG[r.status] : null
                return (
                  <motion.div
                    key={r.name}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-gray-100 p-4 bg-white hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <TrendIcon status={r.status} higher={r.higherIsBetter} />
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{r.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{r.formula}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-extrabold text-navy-800 text-lg">
                          {r.display}<span className="text-xs text-gray-400 ml-0.5">{r.unit}</span>
                        </span>
                        {cfg && (
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.text}`}>
                            {cfg.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Comment */}
                    <p className={`text-xs leading-relaxed rounded-xl px-3 py-2 ${cfg ? `${cfg.bg} ${cfg.text}` : 'bg-gray-50 text-gray-500'}`}>
                      {r.comment}
                    </p>

                    {/* Benchmark */}
                    <p className="text-[10px] text-gray-400 mt-1.5 italic">{r.benchmark}</p>
                  </motion.div>
                )
              })}
            </div>

            {/* Footer disclaimer */}
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 text-center">
              <p className="text-[10px] text-gray-400">
                Ratios are based on thumb rules and general industry benchmarks. Consult a professional for sector-specific interpretation.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
