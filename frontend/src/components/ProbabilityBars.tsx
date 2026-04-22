import type { AttackClass } from '../types'

const barColor: Record<AttackClass, string> = {
  benign:     'bg-green-500',
  web_attack: 'bg-red-600',
}

interface Props {
  probabilities: Record<AttackClass, number>
  topN?: number
}

export default function ProbabilityBars({ probabilities, topN = 3 }: Props) {
  const sorted = (Object.entries(probabilities) as [AttackClass, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)

  return (
    <div className="space-y-2">
      {sorted.map(([cls, prob]) => (
        <div key={cls} className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400 w-20 shrink-0">{cls}</span>
          <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor[cls]}`}
              style={{ width: `${(prob * 100).toFixed(1)}%` }}
            />
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-300 w-12 text-right shrink-0">
            {(prob * 100).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}
