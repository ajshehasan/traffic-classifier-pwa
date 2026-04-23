import { useState } from 'react'
import type { AttackClass } from '../types'
import { examples } from '../data/examples'
import ConnectionCard from '../components/ConnectionCard'
import VerdictChip from '../components/VerdictChip'

const ALL_CLASSES: AttackClass[] = ['benign', 'web_attack']

export default function Learn() {
  const [selected, setSelected] = useState<AttackClass | null>(null)

  const visible = selected ? examples.filter(e => e.label === selected) : examples

  const filterBtn = (active: boolean, mono = false) =>
    `px-4 py-1.5 rounded-full text-sm border transition-colors shrink-0 ${mono ? 'font-mono' : ''} ${
      active
        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Mobile: horizontal scroll pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 md:hidden mb-4 -mx-4 px-4">
        <button onClick={() => setSelected(null)} className={filterBtn(selected === null)}>All</button>
        {ALL_CLASSES.map(cls => (
          <button key={cls} onClick={() => setSelected(cls)} className={filterBtn(selected === cls, true)}>{cls}</button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Sidebar — desktop only */}
        <aside className="hidden md:block w-40 shrink-0 space-y-1">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 px-2">Attack type</div>
          <button
            onClick={() => setSelected(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              selected === null
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All types
          </button>
          {ALL_CLASSES.map(cls => (
            <button
              key={cls}
              onClick={() => setSelected(cls)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-mono transition-colors ${
                selected === cls
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cls}
            </button>
          ))}
        </aside>

        {/* Cards */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {selected ? `${selected} examples` : 'All examples'}
            </h1>
            <span className="text-sm text-slate-500 dark:text-slate-400">{visible.length} connections</span>
          </div>
          {visible.map(ex => (
            <div key={ex.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <VerdictChip label={ex.label} size="sm" />
              </div>
              <ConnectionCard features={ex.features} />
              <p className="text-sm text-slate-600 dark:text-slate-400">{ex.explanation}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
