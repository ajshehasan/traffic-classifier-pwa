const benignClasses = 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
const attackClasses = 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'

interface Props {
  // Accepts the binary verdict ('benign' / 'web_attack') or a specific class label
  // such as 'Web Attack - XSS'. Anything that isn't BENIGN is styled as an attack.
  label: string
  size?: 'sm' | 'md' | 'lg'
}

export default function VerdictChip({ label, size = 'md' }: Props) {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-4 py-1.5 text-base' : 'px-3 py-1 text-sm'
  const isBenign = label.trim().toUpperCase() === 'BENIGN' || label === 'benign'
  // Prettify the legacy binary string so "web_attack" never surfaces in the UI.
  const display = label === 'web_attack' ? 'Web Attack' : label
  return (
    <span className={`inline-block font-mono font-semibold border rounded ${sizeClass} ${isBenign ? benignClasses : attackClasses}`}>
      {display}
    </span>
  )
}
