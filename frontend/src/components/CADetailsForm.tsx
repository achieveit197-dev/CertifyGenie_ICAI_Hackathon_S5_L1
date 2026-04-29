import { motion } from 'framer-motion'
import { User, Building2, Hash, MapPin, Calendar } from 'lucide-react'
import type { CADetails } from '../types'
import { useSession } from '../context/SessionContext'

interface FieldProps {
  label: string
  icon: React.ReactNode
  value: string
  onChange: (v: string) => void
  placeholder: string
  required?: boolean
}

function Field({ label, icon, value, onChange, placeholder, required }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label} {required && <span className="text-red-400 normal-case">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input-field pl-10"
        />
      </div>
    </div>
  )
}

export function CADetailsForm() {
  const { session, updateSession } = useSession()
  const ca = session.caDetails

  const set = (key: keyof CADetails) => (value: string) => {
    updateSession({ caDetails: { ...ca, [key]: value } })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-card p-6"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center">
          <User className="w-5 h-5 text-navy-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">CA / Firm Details</h3>
          <p className="text-xs text-gray-400 mt-0.5">Will appear on the certificate</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="CA Full Name"
          icon={<User className="w-3.5 h-3.5" />}
          value={ca.name}
          onChange={set('name')}
          placeholder="e.g. CA Ramesh Kumar"
          required
        />
        <Field
          label="Firm Name"
          icon={<Building2 className="w-3.5 h-3.5" />}
          value={ca.firm_name}
          onChange={set('firm_name')}
          placeholder="e.g. Kumar & Associates"
          required
        />
        <Field
          label="ICAI Membership No."
          icon={<Hash className="w-3.5 h-3.5" />}
          value={ca.membership_no}
          onChange={set('membership_no')}
          placeholder="e.g. 012345"
          required
        />
        <Field
          label="Certificate Date"
          icon={<Calendar className="w-3.5 h-3.5" />}
          value={ca.date}
          onChange={set('date')}
          placeholder="DD/MM/YYYY"
        />
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Office Address <span className="text-red-400 normal-case">*</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-3 w-3.5 h-3.5 text-gray-400" />
            <textarea
              value={ca.address}
              onChange={(e) => set('address')(e.target.value)}
              placeholder="Full office address..."
              rows={2}
              className="input-field pl-10 resize-none leading-relaxed"
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
