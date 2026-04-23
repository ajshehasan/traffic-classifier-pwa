import { useEffect, useState } from 'react'
import type { AttackClass } from '../types'
import { getClassifications, getQuizAnswers } from '../db'
import VerdictChip from '../components/VerdictChip'

type Filter = 'all' | 'classify' | 'quiz' | 'batch'

interface Row {
  id: string
  timestamp: number
  uri: string
  verdict: AttackClass
  confidence: number
  source: 'classified' | 'quiz ✓' | 'quiz ✗' | 'batch'
  batch_id?: string
}

interface BatchGroup {
  batch_id: string
  timestamp: number
  rows: Row[]
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
        source: c.source === 'csv_batch' ? 'batch' : 'classified',
        batch_id: c.batch_id,
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
    if (filter === 'quiz') return r.source === 'quiz ✓' || r.source === 'quiz ✗'
    if (filter === 'batch') return r.source === 'batch'
    return true
  })

  // Group batch rows by batch_id
  const batchGroups: BatchGroup[] = (() => {
    const map = new Map<string, BatchGroup>()
    rows.filter(r => r.source === 'batch' && r.batch_id).forEach(r => {
      const bid = r.batch_id!
      if (!map.has(bid)) map.set(bid, { batch_id: bid, timestamp: r.timestamp, rows: [] })
      map.get(bid)!.rows.push(r)
    })
    return [...map.values()].sort((a, b) => b.timestamp - a.timestamp)
  })()

  const visible = filtered.slice(0, page * PAGE_SIZE)
  const batchCount = rows.filter(r => r.source === 'batch').length

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">History</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} records</span>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {([
          ['all', 'All'],
          ['classify', 'Classify'],
          ['quiz', 'Quiz'],
          ['batch', `Batch (${batchCount})`],
        ] as [Filter, string][]).map(([f, label]) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1) }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Batch grouped view */}
      {filter === 'batch' ? (
        batchGroups.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
            No batch uploads yet. Use the CSV upload on the Classify page.
          </div>
        ) : (
          <div className="space-y-6">
            {batchGroups.map(group => {
              const attacks = group.rows.filter(r => r.verdict === 'web_attack').length
              return (
                <div key={group.batch_id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Batch · {new Date(group.timestamp).toLocaleString()}
                      </span>
                      <span className="ml-3 text-xs text-slate-400 dark:text-slate-500 font-mono">{group.batch_id.slice(0, 8)}…</span>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <span className="text-slate-500 dark:text-slate-400">{group.rows.length} rows</span>
                      <span className="text-red-600 dark:text-red-400 font-medium">{attacks} attack{attacks !== 1 ? 's' : ''}</span>
                      <span className="text-green-600 dark:text-green-400 font-medium">{group.rows.length - attacks} benign</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-700/30 border-b border-slate-100 dark:border-slate-700">
                        <tr>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">#</th>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">URI</th>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Verdict</th>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Confidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {group.rows.map((row, i) => (
                          <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                            <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">{i + 1}</td>
                            <td className="px-4 py-2 font-mono text-xs text-slate-700 dark:text-slate-300 max-w-xs truncate" title={row.uri}>{row.uri}</td>
                            <td className="px-4 py-2"><VerdictChip label={row.verdict} size="sm" /></td>
                            <td className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400">{(row.confidence * 100).toFixed(0)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        /* Regular flat table */
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">When</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Input</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Verdict</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Confidence</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {visible.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">No records yet. Start classifying or take a quiz!</td></tr>
                ) : visible.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                      {new Date(row.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300 max-w-xs truncate" title={row.uri}>
                      {row.uri}
                    </td>
                    <td className="px-4 py-3">
                      <VerdictChip label={row.verdict} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">
                      {(row.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`font-medium ${
                        row.source === 'classified' ? 'text-slate-600 dark:text-slate-400' :
                        row.source === 'batch' ? 'text-blue-600 dark:text-blue-400' :
                        row.source === 'quiz ✓' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
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
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-center">
              <button
                onClick={() => setPage(p => p + 1)}
                className="text-sm text-red-600 dark:text-red-400 hover:underline font-medium"
              >
                Load more ({filtered.length - visible.length} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
