import { motion } from 'framer-motion'
import { Star, Lock, CheckCircle } from 'lucide-react'
import type { NetWorthMethodResult, NWMethod } from '../types'

function formatINR(value: number | null | undefined): string {
  if (value == null) return '—'
  const abs = Math.abs(value)
  const s = Math.round(abs).toString()
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

interface Props {
  methods: NetWorthMethodResult[]
  selected: NWMethod | null
  onSelect: (method: NWMethod) => void
}

export function NetWorthMethodSelector({ methods, selected, onSelect }: Props) {
  return (
    <div className="space-y-2">
      {methods.map((m, idx) => {
        const isSelected = selected === m.method_id
        const isDisabled = !m.applicable || m.coming_soon

        return (
          <motion.div
            key={m.method_id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
          >
            <button
              onClick={() => !isDisabled && onSelect(m.method_id as NWMethod)}
              disabled={isDisabled}
              className={`w-full text-left rounded-2xl border-2 p-4 transition-all duration-200
                ${isSelected
                  ? 'border-navy-600 bg-navy-50 shadow-md'
                  : isDisabled
                  ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                  : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm cursor-pointer'
                }`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left: method info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`font-bold text-sm ${isSelected ? 'text-navy-800' : isDisabled ? 'text-gray-400' : 'text-gray-800'}`}>
                      {m.label}
                    </span>
                    {m.recommended && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                        Recommended
                      </span>
                    )}
                    {m.coming_soon && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        <Lock className="w-2.5 h-2.5" />
                        Coming soon
                      </span>
                    )}
                    {!m.applicable && !m.coming_soon && (
                      <span className="text-[10px] font-semibold text-gray-400 italic">Not applicable</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 font-mono mb-1 truncate">{m.formula}</p>
                  <p className="text-[11px] text-gray-400">{m.context}</p>
                </div>

                {/* Right: value + selector */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`font-bold font-mono text-sm ${
                    m.value == null ? 'text-gray-300' : isSelected ? 'text-navy-700' : 'text-gray-700'
                  }`}>
                    {formatINR(m.value)}
                  </span>
                  {isSelected ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      <CheckCircle className="w-5 h-5 text-navy-600" />
                    </motion.div>
                  ) : (
                    !isDisabled && (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-200" />
                    )
                  )}
                </div>
              </div>
            </button>
          </motion.div>
        )
      })}
    </div>
  )
}
