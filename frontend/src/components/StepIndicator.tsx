import { motion } from 'framer-motion'
import { Check, Upload, Cpu, ClipboardCheck, Layers, Download } from 'lucide-react'

const STEPS = [
  { label: 'Upload', icon: Upload },
  { label: 'Extract', icon: Cpu },
  { label: 'Review', icon: ClipboardCheck },
  { label: 'Method', icon: Layers },
  { label: 'Download', icon: Download },
]

interface Props { current: number }

export function StepIndicator({ current }: Props) {
  return (
    <div className="flex items-center justify-center mb-8 select-none px-2">
      {STEPS.map((step, i) => {
        const stepNum = i + 1
        const done = current > stepNum
        const active = current === stepNum
        const Icon = step.icon

        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center gap-2">
              <motion.div
                animate={{
                  scale: active ? 1.08 : 1,
                }}
                transition={{ duration: 0.25 }}
                className="relative"
              >
                <motion.div
                  animate={{
                    backgroundColor: done
                      ? '#2ECC71'
                      : active
                      ? '#1e3a5f'
                      : '#F1F5F9',
                    boxShadow: active
                      ? '0 0 0 4px rgba(30,58,95,0.12), 0 2px 8px rgba(30,58,95,0.2)'
                      : done
                      ? '0 0 0 3px rgba(46,204,113,0.15)'
                      : 'none',
                  }}
                  transition={{ duration: 0.3 }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                >
                  {done ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      <Check className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} strokeWidth={2.5} />
                    </motion.div>
                  ) : (
                    <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-gray-400'}`} />
                  )}
                </motion.div>
              </motion.div>

              <motion.span
                animate={{
                  color: active ? '#1e3a5f' : done ? '#2ECC71' : '#9CA3AF',
                  fontWeight: active ? '700' : done ? '600' : '500',
                }}
                transition={{ duration: 0.2 }}
                className="text-[10px] tracking-wide"
              >
                {step.label}
              </motion.span>
            </div>

            {i < STEPS.length - 1 && (
              <div className="w-14 md:w-20 h-0.5 mx-1 mb-6 relative overflow-hidden bg-gray-200 rounded-full">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #2ECC71, #27AE60)' }}
                  animate={{ width: done ? '100%' : '0%' }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
