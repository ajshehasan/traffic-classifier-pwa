import { useEffect, useState } from 'react'
import type { AttackClass } from '../types'
import { getClassifications, getQuizAnswers } from '../db'
import VerdictChip from '../components/VerdictChip'

type Filter = 'all' | 'classify' | 'quiz'

interface Row {
  id: string
  timestamp: number
  uri: string
  verdict: AttackClass
  confidence: number
  source: 'classified' | 'quiz ✓' | 'quiz ✗'
}

const PAGE_SIZE = 20

export default function History() {
  const [rows, setRows] = useState<Row[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    async function load() {
      const [clss, quizzes] = await Promise.all([getClassifications(), getQuizAnswers()])
      const clsRows: Row[] = clss.map(c => ({
        id: `c-${c.id}`,
        timestamp: c.timestamp,
        uri: c.features.http_uri ?? c.features.service,
        verdict: c.prediction.top,
        confidence: c.prediction.confidence,
        source: 'classified',
      }))
      const quizRows: Row[] = quizzes.map(q => ({
        id: `q-${q.id}`,
        timestamp: q.timestamp,
        uri: q.features.http_uri ?? q.features.service,
        verdict: q.questionClass,
        confidence: 1,
        source: q.correct ? 'quiz ✓' : 'quiz ✗',
      }))
      const combined = [...clsRows, ...quizRows].sort((a, b) => b.timestamp - a.timestamp)
      setRows(combined)
    }
    load()
  }, [])

  const filtered = rows.filter(r => {
    if (filter === 'classify') return r.source === 'classified'
    if (filter === 'quiz') return r.source.startsWith('quiz')
    return true
  })

  const visible = filtered.slice(0, page * PAGE_SIZE)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">History</h1>
        <span className="text-sm text-slate-400">{filtered.length} records</span>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {(['all', 'classify', 'quiz'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1) }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">When</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Input</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Verdict</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Confidence</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">No records yet. Start classifying or take a quiz!</td></tr>
              ) : visible.map(row => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(row.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700 max-w-xs truncate" title={row.uri}>
                    {row.uri}
                  </td>
                  <td className="px-4 py-3">
                    <VerdictChip label={row.verdict} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {(row.confidence * 100).toFixed(0)}%
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className={`font-medium ${
                      row.source === 'classified' ? 'text-slate-600' :
                      row.source === 'quiz ✓' ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {row.source}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visible.length < filtered.length && (
          <div className="px-4 py-3 border-t border-slate-100 text-center">
            <button
              onClick={() => setPage(p => p + 1)}
              className="text-sm text-red-600 hover:underline font-medium"
            >
              Load more ({filtered.length - visible.length} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
