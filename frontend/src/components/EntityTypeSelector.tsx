import { motion } from 'framer-motion'
import { Building2, Users, Briefcase, User } from 'lucide-react'
import type { EntityType } from '../types'

interface EntityCard {
  type: EntityType
  label: string
  sublabel: string
  icon: React.ReactNode
  examples: string
}

const ENTITIES: EntityCard[] = [
  {
    type: 'company',
    label: 'Company',
    sublabel: 'Pvt Ltd / Ltd / OPC',
    icon: <Building2 className="w-5 h-5" />,
    examples: 'ABC Pvt Ltd, XYZ Ltd',
  },
  {
    type: 'llp',
    label: 'LLP',
    sublabel: 'Limited Liability Partnership',
    icon: <Users className="w-5 h-5" />,
    examples: 'ABC LLP, XYZ & Co LLP',
  },
  {
    type: 'partnership',
    label: 'Partnership',
    sublabel: 'Partnership Firm',
    icon: <Briefcase className="w-5 h-5" />,
    examples: 'M/s ABC & Co, M/s XYZ',
  },
  {
    type: 'proprietorship',
    label: 'Proprietorship',
    sublabel: 'Sole Proprietor',
    icon: <User className="w-5 h-5" />,
    examples: 'Ramesh Traders, Suresh Enterprises',
  },
]

interface Props {
  selected: EntityType
  onSelect: (type: EntityType) => void
}

export function EntityTypeSelector({ selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {ENTITIES.map((entity) => {
        const isSelected = selected === entity.type
        return (
          <motion.button
            key={entity.type}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(entity.type)}
            className={`relative text-left p-4 rounded-2xl border-2 transition-all duration-200
              ${isSelected
                ? 'border-navy-600 bg-navy-50 shadow-md'
                : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
              }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5
              ${isSelected ? 'bg-navy-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {entity.icon}
            </div>
            <p className={`font-bold text-sm mb-0.5 ${isSelected ? 'text-navy-800' : 'text-gray-800'}`}>
              {entity.label}
            </p>
            <p className={`text-xs font-medium mb-1 ${isSelected ? 'text-navy-600' : 'text-gray-500'}`}>
              {entity.sublabel}
            </p>
            <p className="text-[10px] text-gray-400 leading-relaxed">{entity.examples}</p>
            {isSelected && (
              <motion.div
                layoutId="entity-check"
                className="absolute top-3 right-3 w-5 h-5 rounded-full bg-navy-600 flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
