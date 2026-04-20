import type { AttackClass } from '../types'

const palette: Record<AttackClass, string> = {
  benign:     'bg-green-50 text-green-700 border-green-200',
  web_attack: 'bg-red-50 text-red-700 border-red-200',
}

interface Props {
  label: AttackClass
  size?: 'sm' | 'md' | 'lg'
}

export default function VerdictChip({ label, size = 'md' }: Props) {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-4 py-1.5 text-base' : 'px-3 py-1 text-sm'
  return (
    <span className={`inline-block font-mono font-semibold border rounded ${sizeClass} ${palette[label]}`}>
      {label}
    </span>
  )
}
