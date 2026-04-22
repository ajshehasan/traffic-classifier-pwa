import { useState } from 'react'
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

function emptyFeatures(): ConnectionFeatures {
  return { proto: 'tcp', service: 'http', duration: 0, src_bytes: 0, dst_bytes: 0, http_method: 'GET', http_uri: '', http_status_code: 200 }
}

export default function Classify() {
  const [features, setFeatures] = useState<ConnectionFeatures>(emptyFeatures())
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(false)
  const [showWhy, setShowWhy] = useState(false)

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

  const inputCls = 'w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 dark:placeholder-slate-400'
  const selectCls = inputCls

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Classify a connection</h1>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-5">
        <div className="grid sm:grid-cols-3 gap-4">
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Protocol</span>
            <select className={selectCls} value={features.proto} onChange={e => update('proto', e.target.value as 'tcp')}>
              {PROTO_OPTS.map(p => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Service</span>
            <select className={selectCls} value={features.service} onChange={e => update('service', e.target.value)}>
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
            <select className={selectCls} value={features.http_method} onChange={e => update('http_method', e.target.value)}>
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
            <VerdictChip label={prediction.top} size="lg" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Probabilities</p>
            <ProbabilityBars probabilities={prediction.probabilities} topN={5} />
          </div>
          <div>
            <button
              onClick={() => setShowWhy(v => !v)}
              className="text-sm text-red-600 dark:text-red-400 hover:underline"
            >
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
    </div>
  )
}
