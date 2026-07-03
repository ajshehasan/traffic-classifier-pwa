import { useEffect, useMemo, useState } from 'react'
import { getClassifications, getQuizAnswers } from '../db'
import VerdictChip from '../components/VerdictChip'

type SourceFilter = 'all' | 'classify' | 'quiz' | 'batch'
type TimeRange = 'hour' | 'day' | '7d' | '30d' | 'all'
type Sort = 'newest' | 'oldest' | 'conf-high' | 'conf-low'

interface Row {
  id: string
  timestamp: number
  uri: string
  verdict: string
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

const TIME_RANGE_MS: Record<TimeRange, number> = {
  hour: 3_600_000,
  day:  86_400_000,
  '7d': 7 * 86_400_000,
  '30d':30 * 86_400_000,
  all:  Infinity,
}

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  hour: 'Last hour',
  day:  'Last 24h',
  '7d': 'Last 7 days',
  '30d':'Last 30 days',
  all:  'All time',
}

const SORT_LABELS: Record<Sort, string> = {
  newest:     'Newest first',
  oldest:     'Oldest first',
  'conf-high':'Highest confidence',
  'conf-low': 'Lowest confidence',
}

export default function History() {
  const [rows, setRows] = useState<Row[]>([])
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [sort, setSort] = useState<Sort>('newest')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    async function load() {
      const [clss, quizzes] = await Promise.all([getClassifications(), getQuizAnswers()])
      const clsRows: Row[] = clss.map(c => ({
        id: `c-${c.id}`,
        timestamp: c.timestamp,
        uri: c.features.http_uri ?? c.features.service,
        verdict: c.prediction.predictedClass ?? c.prediction.top,
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
      setRows([...clsRows, ...quizRows].sort((a, b) => b.timestamp - a.timestamp))
    }
    load()
  }, [])

  // Debounce search input 300ms
  useEffect(() => {
    const id = setTimeout(() => { setSearch(searchInput); setPage(1) }, 300)
    return () => clearTimeout(id)
  }, [searchInput])

  // Reset page when any filter changes
  useEffect(() => { setPage(1) }, [sourceFilter, timeRange, sort])

  // ── filtering pipeline ────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const now = Date.now()
    const cutoff = timeRange === 'all' ? 0 : now - TIME_RANGE_MS[timeRange]
    const q = search.toLowerCase()

    let result = rows.filter(r => {
      if (sourceFilter === 'classify') return r.source === 'classified'
      if (sourceFilter === 'quiz') return r.source === 'quiz ✓' || r.source === 'quiz ✗'
      if (sourceFilter === 'batch') return r.source === 'batch'
      return true
    })

    if (timeRange !== 'all') result = result.filter(r => r.timestamp >= cutoff)
    if (q) result = result.filter(r => r.uri.toLowerCase().includes(q))

    result = [...result].sort((a, b) => {
      if (sort === 'oldest')     return a.timestamp - b.timestamp
      if (sort === 'conf-high')  return b.confidence - a.confidence
      if (sort === 'conf-low')   return a.confidence - b.confidence
      return b.timestamp - a.timestamp // newest
    })

    return result
  }, [rows, sourceFilter, timeRange, search, sort])

  // Source counts (after time range + search, before source filter)
  const counts = useMemo(() => {
    const now = Date.now()
    const cutoff = timeRange === 'all' ? 0 : now - TIME_RANGE_MS[timeRange]
    const q = search.toLowerCase()
    const base = rows
      .filter(r => timeRange === 'all' || r.timestamp >= cutoff)
      .filter(r => !q || r.uri.toLowerCase().includes(q))
    return {
      all:      base.length,
      classify: base.filter(r => r.source === 'classified').length,
      quiz:     base.filter(r => r.source === 'quiz ✓' || r.source === 'quiz ✗').length,
      batch:    base.filter(r => r.source === 'batch').length,
    }
  }, [rows, timeRange, search])

  // Batch groups derived from filtered rows
  const batchGroups = useMemo((): BatchGroup[] => {
    const map = new Map<string, BatchGroup>()
    filtered.filter(r => r.source === 'batch' && r.batch_id).forEach(r => {
      const bid = r.batch_id!
      if (!map.has(bid)) map.set(bid, { batch_id: bid, timestamp: r.timestamp, rows: [] })
      map.get(bid)!.rows.push(r)
    })
    return [...map.values()].sort((a, b) => b.timestamp - a.timestamp)
  }, [filtered])

  const visible = filtered.slice(0, page * PAGE_SIZE)

  // ── empty state helpers ────────────────────────────────────────────────────────

  const emptyReason = (() => {
    if (rows.length === 0) return 'No records yet. Start classifying or take a quiz!'
    if (search && timeRange !== 'all' && filtered.length === 0)
      return `No matches for "${search}" in ${TIME_RANGE_LABELS[timeRange].toLowerCase()}.`
    if (search && filtered.length === 0)
      return `No matches found for "${search}". Try different keywords.`
    if (timeRange !== 'all' && filtered.length === 0)
      return `No activity in ${TIME_RANGE_LABELS[timeRange].toLowerCase()}.`
    return 'No records in this filter.'
  })()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">History</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Search + Time range + Sort row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search bar */}
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search by URI…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>

        {/* Time range */}
        <div className="relative">
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value as TimeRange)}
            className="appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 cursor-pointer"
          >
            {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map(k => (
              <option key={k} value={k}>{TIME_RANGE_LABELS[k]}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
            </svg>
          </span>
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={sort}
            onChange={e => setSort(e.target.value as Sort)}
            className="appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 cursor-pointer"
          >
            {(Object.keys(SORT_LABELS) as Sort[]).map(k => (
              <option key={k} value={k}>{SORT_LABELS[k]}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
            </svg>
          </span>
        </div>
      </div>

      {/* Source filter pills */}
      <div className="flex gap-2 flex-wrap">
        {([
          ['all',      'All'],
          ['classify', 'Classify'],
          ['quiz',     'Quiz'],
          ['batch',    'Batch'],
        ] as [SourceFilter, string][]).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setSourceFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              sourceFilter === f
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {label}{' '}
            <span className="opacity-60 text-xs">({counts[f]})</span>
          </button>
        ))}
      </div>

      {/* Batch grouped view */}
      {sourceFilter === 'batch' ? (
        batchGroups.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-10 text-center text-slate-500 dark:text-slate-400 text-sm">
            {rows.filter(r => r.source === 'batch').length === 0
              ? 'No batch uploads yet. Use the CSV upload on the Classify page.'
              : emptyReason}
          </div>
        ) : (
          <div className="space-y-6">
            {batchGroups.map(group => {
              const groupAttacks = group.rows.filter(r => r.verdict === 'web_attack').length
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
                      <span className="text-red-600 dark:text-red-400 font-medium">{groupAttacks} attack{groupAttacks !== 1 ? 's' : ''}</span>
                      <span className="text-green-600 dark:text-green-400 font-medium">{group.rows.length - groupAttacks} benign</span>
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
        /* Flat table */
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
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400 text-sm">
                      {emptyReason}
                    </td>
                  </tr>
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
                        row.source === 'batch'      ? 'text-blue-600 dark:text-blue-400' :
                        row.source === 'quiz ✓'    ? 'text-green-600 dark:text-green-400'
                                                    : 'text-red-500 dark:text-red-400'
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
