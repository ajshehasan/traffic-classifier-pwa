import { useState, useRef } from 'react'
import Papa from 'papaparse'
import type { ConnectionFeatures, Prediction } from '../types'
import { classify } from '../model'
import { saveClassification } from '../db'
import { fireCompletionNotification } from '../notifications'
import ConnectionCard from '../components/ConnectionCard'
import ProbabilityBars from '../components/ProbabilityBars'
import VerdictChip from '../components/VerdictChip'

const PROTO_OPTS = ['tcp', 'udp', 'icmp'] as const
const SERVICE_OPTS = ['http', 'dns', 'ssl', 'ftp', '-']
const METHOD_OPTS = ['GET', 'POST', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
const MAX_ROWS = 500

function emptyFeatures(): ConnectionFeatures {
  return { proto: 'tcp', service: 'http', duration: 0, src_bytes: 0, dst_bytes: 0, http_method: 'GET', http_uri: '', http_status_code: 200 }
}

function parseRow(row: Record<string, string>): ConnectionFeatures | null {
  const proto = row.proto?.trim()
  if (!['tcp', 'udp', 'icmp'].includes(proto)) return null
  return {
    proto: proto as 'tcp' | 'udp' | 'icmp',
    service: row.service?.trim() || 'http',
    duration: parseFloat(row.duration) || 0,
    src_bytes: parseInt(row.src_bytes) || 0,
    dst_bytes: parseInt(row.dst_bytes) || 0,
    http_method: row.http_method?.trim() || undefined,
    http_uri: row.http_uri?.trim() || undefined,
    http_status_code: row.http_status_code ? parseInt(row.http_status_code) : undefined,
    http_user_agent: row.http_user_agent?.trim() || undefined,
  }
}

function extractSource(reasons: string[]): string {
  const first = reasons[0] ?? ''
  if (first.startsWith('Rule match:')) return 'Rule'
  if (first.startsWith('Hybrid:')) return 'Hybrid'
  return 'Neural network'
}

interface BatchRow {
  index: number
  features: ConnectionFeatures
  prediction: Prediction
  source: string
}

type Mode = 'single' | 'csv'
type CsvFilter = 'all' | 'attacks' | 'benign'

export default function Classify() {
  // ── Single mode state ──
  const [features, setFeatures] = useState<ConnectionFeatures>(emptyFeatures())
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(false)
  const [showWhy, setShowWhy] = useState(false)

  // ── CSV mode state ──
  const [mode, setMode] = useState<Mode>('single')
  const [csvRows, setCsvRows] = useState<BatchRow[]>([])
  const [csvSkipped, setCsvSkipped] = useState(0)
  const [csvFilter, setCsvFilter] = useState<CsvFilter>('all')
  const [csvRunning, setCsvRunning] = useState(false)
  const [csvElapsed, setCsvElapsed] = useState<number | null>(null)
  const [showFormat, setShowFormat] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function update<K extends keyof ConnectionFeatures>(key: K, value: ConnectionFeatures[K]) {
    setFeatures(f => ({ ...f, [key]: value }))
  }

  async function handleClassify() {
    setLoading(true)
    setPrediction(null)
    const pred = await classify(features)
    setPrediction(pred)
    setLoading(false)
    await saveClassification({ timestamp: Date.now(), features, prediction: pred, source: 'classify' })
    await fireCompletionNotification(
      `Classified: ${pred.top}`,
      `Confidence ${(pred.confidence * 100).toFixed(0)}% — ${pred.features_that_fired[0]}`,
    )
  }

  async function runCSV(rawRows: Record<string, string>[]) {
    const batchId = crypto.randomUUID()
    const t0 = Date.now()
    setCsvRunning(true)
    setCsvRows([])
    setCsvElapsed(null)

    let skipped = 0
    const valid: ConnectionFeatures[] = []
    for (const row of rawRows) {
      const f = parseRow(row)
      if (f) valid.push(f)
      else skipped++
    }
    setCsvSkipped(skipped)

    const results: BatchRow[] = []
    for (let i = 0; i < valid.length; i++) {
      const pred = await classify(valid[i])
      const src = extractSource(pred.features_that_fired)
      results.push({ index: i + 1, features: valid[i], prediction: pred, source: src })
      // Yield to UI every 10 rows
      if (i % 10 === 9) await new Promise(r => setTimeout(r, 0))
    }

    const batchSize = valid.length
    const ts = Date.now()
    await Promise.all(
      results.map(r =>
        saveClassification({
          timestamp: ts,
          features: r.features,
          prediction: r.prediction,
          source: 'csv_batch',
          batch_id: batchId,
          batch_size: batchSize,
        })
      )
    )

    setCsvRows(results)
    setCsvElapsed((Date.now() - t0) / 1000)
    setCsvRunning(false)
  }

  function handleFile(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        if (data.length > MAX_ROWS) {
          alert(`File has ${data.length} rows. Processing is limited to ${MAX_ROWS} rows for performance.`)
          return
        }
        runCSV(data)
      },
    })
  }

  async function handleSample() {
    const res = await fetch('/examples/sample-traffic.csv')
    const text = await res.text()
    const { data } = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true })
    runCSV(data)
  }

  function handleExport() {
    const header = 'proto,service,duration,src_bytes,dst_bytes,http_method,http_uri,http_status_code,http_user_agent,verdict,confidence,source'
    const lines = csvRows.map(r => [
      r.features.proto,
      r.features.service,
      r.features.duration,
      r.features.src_bytes,
      r.features.dst_bytes,
      r.features.http_method ?? '',
      `"${(r.features.http_uri ?? '').replace(/"/g, '""')}"`,
      r.features.http_status_code ?? '',
      `"${(r.features.http_user_agent ?? '').replace(/"/g, '""')}"`,
      r.prediction.top,
      r.prediction.confidence.toFixed(4),
      r.source,
    ].join(','))
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'classified-results.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const visibleRows = csvRows.filter(r => {
    if (csvFilter === 'attacks') return r.prediction.top === 'web_attack'
    if (csvFilter === 'benign') return r.prediction.top === 'benign'
    return true
  })
  const attackCount = csvRows.filter(r => r.prediction.top === 'web_attack').length
  const benignCount = csvRows.length - attackCount

  const inputCls = 'w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 dark:placeholder-slate-400'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Classify a connection</h1>

      {/* Mode tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        {(['single', 'csv'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === m
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {m === 'single' ? 'Single connection' : 'Upload CSV'}
          </button>
        ))}
      </div>

      {/* ── SINGLE MODE ── */}
      {mode === 'single' && (
        <>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-5">
            <div className="grid sm:grid-cols-3 gap-4">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Protocol</span>
                <select className={inputCls} value={features.proto} onChange={e => update('proto', e.target.value as 'tcp')}>
                  {PROTO_OPTS.map(p => <option key={p}>{p}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Service</span>
                <select className={inputCls} value={features.service} onChange={e => update('service', e.target.value)}>
                  {SERVICE_OPTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Duration (s)</span>
                <input type="number" step="0.01" min="0" className={inputCls} value={features.duration}
                  onChange={e => update('duration', parseFloat(e.target.value) || 0)} />
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Src bytes</span>
                <input type="number" min="0" className={inputCls} value={features.src_bytes}
                  onChange={e => update('src_bytes', parseInt(e.target.value) || 0)} />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Dst bytes</span>
                <input type="number" min="0" className={inputCls} value={features.dst_bytes}
                  onChange={e => update('dst_bytes', parseInt(e.target.value) || 0)} />
              </label>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">HTTP method</span>
                <select className={inputCls} value={features.http_method} onChange={e => update('http_method', e.target.value)}>
                  {METHOD_OPTS.map(m => <option key={m}>{m}</option>)}
                </select>
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">HTTP URI</span>
                <input type="text" className={inputCls + ' font-mono'} value={features.http_uri}
                  onChange={e => update('http_uri', e.target.value)} placeholder="/path?query=value" />
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Status code</span>
                <input type="number" className={inputCls} value={features.http_status_code}
                  onChange={e => update('http_status_code', parseInt(e.target.value) || 0)} />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">User-agent</span>
                <input type="text" className={inputCls} value={features.http_user_agent ?? ''}
                  onChange={e => update('http_user_agent', e.target.value)} />
              </label>
            </div>

            <button
              onClick={handleClassify}
              disabled={loading}
              className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {loading ? 'Classifying…' : 'Classify'}
            </button>
          </div>

          {prediction && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 dark:text-white">Result</span>
                <VerdictChip label={prediction.predictedClass ?? prediction.top} size="lg" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Class probabilities</p>
                <ProbabilityBars probabilities={prediction.classProbabilities ?? prediction.probabilities} topN={5} />
              </div>
              <div>
                <button onClick={() => setShowWhy(v => !v)} className="text-sm text-red-600 dark:text-red-400 hover:underline">
                  {showWhy ? 'Hide' : 'Show'} reasons
                </button>
                {showWhy && (
                  <ul className="mt-2 space-y-1">
                    {prediction.features_that_fired.map((f, i) => (
                      <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex gap-2">
                        <span className="text-red-500">›</span>{f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Input reviewed</p>
                <ConnectionCard features={features} />
              </div>
            </div>
          )}
        </>
      )}

      {/* ── CSV MODE ── */}
      {mode === 'csv' && (
        <div className="space-y-4">
          {/* Upload card */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-4">
            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-red-400 dark:hover:border-red-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Drop a CSV file or <span className="text-red-600 dark:text-red-400">click to browse</span></p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Max {MAX_ROWS} rows</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700" />
              <span className="text-xs text-slate-400 dark:text-slate-500">or</span>
              <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700" />
            </div>

            <button
              onClick={handleSample}
              disabled={csvRunning}
              className="w-full py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              Load sample (30 rows — 12 attacks, 18 benign)
            </button>

            {/* Collapsible format reference */}
            <div>
              <button
                onClick={() => setShowFormat(v => !v)}
                className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 transition-transform ${showFormat ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                CSV format
              </button>
              {showFormat && (
                <div className="mt-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 text-xs font-mono text-slate-600 dark:text-slate-400 overflow-x-auto">
                  <div className="text-slate-500 dark:text-slate-400 mb-1">Required columns (header row must be present):</div>
                  <div>proto, service, duration, src_bytes, dst_bytes</div>
                  <div className="text-slate-500 dark:text-slate-400 mt-1">Optional columns:</div>
                  <div>http_method, http_uri, http_status_code, http_user_agent</div>
                  <div className="text-slate-500 dark:text-slate-400 mt-1">proto values: tcp | udp | icmp</div>
                </div>
              )}
            </div>
          </div>

          {/* Running indicator */}
          {csvRunning && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center gap-3">
              <svg className="w-4 h-4 text-red-600 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-sm text-slate-600 dark:text-slate-400">Classifying… {csvRows.length} done</span>
            </div>
          )}

          {/* Results */}
          {csvRows.length > 0 && !csvRunning && (
            <div className="space-y-3">
              {/* Summary strip */}
              <div className="bg-slate-900 dark:bg-slate-700 text-white rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm">
                  Analyzed <strong>{csvRows.length}</strong> connections —{' '}
                  <span className="text-red-400"><strong>{attackCount}</strong> attack{attackCount !== 1 ? 's' : ''}</span>{' '}
                  ({csvRows.length > 0 ? Math.round((attackCount / csvRows.length) * 100) : 0}%)
                  {csvElapsed !== null && <span className="text-slate-400 ml-1">in {csvElapsed.toFixed(1)}s</span>}
                </span>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download results CSV
                </button>
              </div>

              {csvSkipped > 0 && (
                <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                  {csvSkipped} row{csvSkipped !== 1 ? 's' : ''} skipped — missing required fields or invalid proto value
                </div>
              )}

              {/* Filter pills */}
              <div className="flex gap-2">
                {([
                  ['all', `All (${csvRows.length})`],
                  ['attacks', `Attacks (${attackCount})`],
                  ['benign', `Benign (${benignCount})`],
                ] as [CsvFilter, string][]).map(([f, label]) => (
                  <button
                    key={f}
                    onClick={() => setCsvFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      csvFilter === f
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Results table */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-8">#</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Method</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">URI</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Verdict</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Confidence</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {visibleRows.map(row => (
                        <tr
                          key={row.index}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-700/40 ${
                            row.prediction.top === 'web_attack' ? 'bg-red-50/40 dark:bg-red-900/10' : ''
                          }`}
                        >
                          <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">{row.index}</td>
                          <td className="px-3 py-2.5 text-xs font-mono text-slate-600 dark:text-slate-400">{row.features.http_method ?? '—'}</td>
                          <td className="px-3 py-2.5 font-mono text-xs text-slate-700 dark:text-slate-300 max-w-[180px] truncate" title={row.features.http_uri}>
                            {row.features.http_uri || '—'}
                          </td>
                          <td className="px-3 py-2.5"><VerdictChip label={row.prediction.top} size="sm" /></td>
                          <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400">{(row.prediction.confidence * 100).toFixed(0)}%</td>
                          <td className="px-3 py-2.5 text-xs">
                            <span className={`font-medium ${
                              row.source === 'Rule' ? 'text-red-600 dark:text-red-400' :
                              row.source === 'Hybrid' ? 'text-amber-600 dark:text-amber-400' :
                              'text-blue-600 dark:text-blue-400'
                            }`}>
                              {row.source}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
