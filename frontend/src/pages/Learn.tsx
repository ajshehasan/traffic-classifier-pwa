import { useState } from 'react'
import type { AttackClass } from '../types'
import { examples } from '../data/examples'
import ConnectionCard from '../components/ConnectionCard'
import VerdictChip from '../components/VerdictChip'

const ALL_CLASSES: AttackClass[] = ['benign', 'web_attack']

export default function Learn() {
  const [selected, setSelected] = useState<AttackClass | null>(null)

  const visible = selected ? examples.filter(e => e.label === selected) : examples

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="w-40 shrink-0 space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 px-2">Attack type</div>
          <button
            onClick={() => setSelected(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              selected === null ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            All types
          </button>
          {ALL_CLASSES.map(cls => (
            <button
              key={cls}
              onClick={() => setSelected(cls)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-mono transition-colors ${
                selected === cls ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {cls}
            </button>
          ))}
        </aside>

        {/* Cards */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-slate-900">
              {selected ? `${selected} examples` : 'All examples'}
            </h1>
            <span className="text-sm text-slate-400">{visible.length} connections</span>
          </div>
          {visible.map(ex => (
            <div key={ex.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <VerdictChip label={ex.label} size="sm" />
              </div>
              <ConnectionCard features={ex.features} />
              <p className="text-sm text-slate-600">{ex.explanation}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
