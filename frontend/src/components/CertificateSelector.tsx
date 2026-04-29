import { motion } from 'framer-motion'
import { TrendingUp, BarChart2, Droplets, CheckCircle, ArrowRight } from 'lucide-react'
import type { CertificateType } from '../types'

interface CertCard {
  type: CertificateType
  title: string
  description: string
  icon: React.ReactNode
  badge?: string
  highlights: string[]
}

const CERT_CARDS: CertCard[] = [
  {
    type: 'net_worth',
    title: 'Net Worth Certificate',
    description: 'ICAI-format certificate computing Net Worth from audited Balance Sheet with full citation trail.',
    icon: <TrendingUp className="w-6 h-6" />,
    badge: 'Most Used',
    highlights: ['Share Capital + Reserves', 'Auto Net Worth computation', 'Balance sheet verification'],
  },
  {
    type: 'turnover',
    title: 'Turnover Certificate',
    description: 'Certifies annual turnover and net profit from audited financial statements.',
    icon: <BarChart2 className="w-6 h-6" />,
    highlights: ['Annual turnover', 'Net profit / loss', 'Audited basis'],
  },
  {
    type: 'working_capital',
    title: 'Working Capital Certificate',
    description: 'Certifies short-term liquidity position — Current Assets minus Current Liabilities.',
    icon: <Droplets className="w-6 h-6" />,
    highlights: ['Current assets & liabilities', 'Working capital computation', 'Bank / tender use'],
  },
]

interface Props {
  selected: CertificateType | null
  onSelect: (type: CertificateType) => void
}

export function CertificateSelector({ selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl mx-auto">
      {CERT_CARDS.map((card, i) => {
        const isSelected = selected === card.type
        return (
          <motion.button
            key={card.type}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.35, ease: 'easeOut' }}
            onClick={() => onSelect(card.type)}
            className={`
              relative text-left p-6 rounded-2xl border-2 transition-all duration-250 group
              ${isSelected
                ? 'border-navy-600 bg-gradient-to-br from-navy-50 to-blue-50/50 shadow-card ring-2 ring-navy-600/10'
                : 'border-gray-100 bg-white hover:border-navy-200 hover:shadow-card-hover'
              }
            `}
          >
            {card.badge && (
              <span className={`absolute top-4 right-4 text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide ${
                isSelected
                  ? 'bg-navy-700 text-white'
                  : 'bg-brand-accent/10 text-brand-accent'
              }`}>
                {card.badge}
              </span>
            )}

            <div className={`w-13 h-13 rounded-xl flex items-center justify-center mb-5 transition-all duration-200
              ${isSelected
                ? 'bg-navy-700 text-white shadow-md'
                : 'bg-navy-50 text-navy-600 group-hover:bg-navy-100'
              }`}
              style={{ width: 52, height: 52 }}
            >
              {card.icon}
            </div>

            <h3 className={`font-bold text-base mb-2 transition-colors ${
              isSelected ? 'text-navy-900' : 'text-gray-900'
            }`}>
              {card.title}
            </h3>
            <p className="text-gray-500 text-xs leading-relaxed mb-4">{card.description}</p>

            <ul className="space-y-1.5">
              {card.highlights.map((h) => (
                <li key={h} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSelected ? 'bg-brand-accent' : 'bg-gray-300'}`} />
                  {h}
                </li>
              ))}
            </ul>

            <div className={`mt-5 flex items-center gap-1.5 text-xs font-semibold transition-colors ${
              isSelected ? 'text-navy-700' : 'text-gray-400 group-hover:text-navy-600'
            }`}>
              {isSelected ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-brand-accent" strokeWidth={2.5} />
                  Selected
                </>
              ) : (
                <>
                  Select
                  <ArrowRight className="w-3 h-3" />
                </>
              )}
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
