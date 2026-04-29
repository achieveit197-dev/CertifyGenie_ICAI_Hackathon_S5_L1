import { Layers } from 'lucide-react'

interface Props {
  label: string
  small?: boolean
}

export function MethodBadge({ label, small = false }: Props) {
  if (!label) return null
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full border border-navy-200 bg-navy-50 text-navy-700
        ${small ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}
    >
      <Layers className={small ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {label}
    </span>
  )
}
