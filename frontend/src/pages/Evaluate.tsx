import { useState } from 'react'
import { classify } from '../model'
import { evalDataset } from '../data/evalDataset'
import type { TestCase } from '../data/evalDataset'
import type { AttackClass } from '../types'

interface Result {
  tc: TestCase
  predicted: AttackClass
  confidence: number
  correct: boolean
}

interface Metrics {
  tp: number
  fp: number
  tn: number
  fn: number
  accuracy: number
  precision: number
  recall: number
  f1: number
}

// web_attack is the positive class (the thing we want to detect)
function computeMetrics(results: Result[]): Metrics {
  let tp = 0, fp = 0, tn = 0, fn = 0
  for (const r of results) {
    const actualAttack = r.tc.label === 'web_attack'
    const predAttack = r.predicted === 'web_attack'
    if (actualAttack && predAttack) tp++
    else if (!actualAttack && predAttack) fp++
    else if (!actualAttack && !predAttack) tn++
    else fn++
  }
  const total = tp + fp + tn + fn || 1
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp)
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn)
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)
  return { tp, fp, tn, fn, accuracy: (tp + tn) / total, precision, recall, f1 }
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

function downloadCsv(results: Result[]) {
  const header = 'id,actual,predicted,confidence,correct,uri,user_agent\n'
  const rows = results.map(r => {
    const f = r.tc.features
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    return [
      r.tc.id, r.tc.label, r.predicted, r.confidence.toFixed(4), r.correct,
      cell(f.http_uri), cell(f.http_user_agent),
    ].join(',')
  }).join('\n')
  const blob = new Blob([header + rows], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'model-evaluation.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function Evaluate() {
  const [results, setResults] = useState<Result[] | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [tableFilter, setTableFilter] = useState<'all' | 'errors'>('all')

  async function runEvaluation() {
    setRunning(true)
    setResults(null)
    setProgress(0)
    const out: Result[] = []
    for (let i = 0; i < evalDataset.length; i++) {
      const tc = evalDataset[i]
      const pred = await classify(tc.features)
      out.push({
        tc,
        predicted: pred.top,
        confidence: pred.confidence,
        correct: pred.top === tc.label,
      })
      setProgress(Math.round(((i + 1) / evalDataset.length) * 100))
    }
    setResults(out)
    setRunning(false)
  }

  const metrics = results ? computeMetrics(results) : null
  const visibleRows = results
    ? (tableFilter === 'errors' ? results.filter(r => !r.correct) : results)
    : []

  const nBenign = evalDataset.filter(t => t.label === 'benign').length
  const nAttack = evalDataset.filter(t => t.label === 'web_attack').length

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Model evaluation</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Runs the classifier against a held-out, labeled test set of {evalDataset.length} cases
          ({nBenign} benign, {nAttack} attack) and reports standard classification metrics.
          The positive class is <span className="font-mono">web_attack</span>.
        </p>
      </div>

      <button
        onClick={runEvaluation}
        disabled={running}
        className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
      >
        {running ? `Evaluating… ${progress}%` : results ? 'Re-run evaluation' : 'Run evaluation'}
      </button>

      {running && (
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div className="bg-red-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {metrics && results && (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Accuracy', value: pct(metrics.accuracy), hint: '(TP+TN) / total' },
              { label: 'Precision', value: pct(metrics.precision), hint: 'TP / (TP+FP)' },
              { label: 'Recall', value: pct(metrics.recall), hint: 'TP / (TP+FN)' },
              { label: 'F1-score', value: pct(metrics.f1), hint: '2·P·R / (P+R)' },
            ].map(({ label, value, hint }) => (
              <div key={label} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</div>
                <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1">{hint}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Confusion matrix */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <h2 className="font-semibold text-slate-900 dark:text-white mb-4 text-sm">Confusion matrix</h2>
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse w-full">
                  <thead>
                    <tr>
                      <th className="p-2 text-slate-500 dark:text-slate-400 text-left">actual ↓ / predicted →</th>
                      <th className="p-2 text-center text-slate-500 dark:text-slate-400">benign</th>
                      <th className="p-2 text-center text-slate-500 dark:text-slate-400">web_attack</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 font-semibold text-slate-600 dark:text-slate-300">benign</td>
                      <td className="p-3 text-center border border-slate-100 dark:border-slate-700 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold text-lg">{metrics.tn}<div className="text-[10px] font-normal text-slate-400">TN</div></td>
                      <td className="p-3 text-center border border-slate-100 dark:border-slate-700 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold text-lg">{metrics.fp}<div className="text-[10px] font-normal text-slate-400">FP</div></td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold text-slate-600 dark:text-slate-300">web_attack</td>
                      <td className="p-3 text-center border border-slate-100 dark:border-slate-700 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold text-lg">{metrics.fn}<div className="text-[10px] font-normal text-slate-400">FN</div></td>
                      <td className="p-3 text-center border border-slate-100 dark:border-slate-700 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold text-lg">{metrics.tp}<div className="text-[10px] font-normal text-slate-400">TP</div></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                {metrics.fn > 0 && <span className="text-red-500">{metrics.fn} missed attack(s) (false negatives). </span>}
                {metrics.fp > 0 && <span className="text-amber-500">{metrics.fp} false alarm(s) (false positives). </span>}
                {metrics.fn === 0 && metrics.fp === 0 && <span className="text-green-600">Perfect separation — no errors on this test set.</span>}
              </p>
            </div>

            {/* Summary */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
              <h2 className="font-semibold text-slate-900 dark:text-white mb-4 text-sm">Summary</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Test cases</dt><dd className="font-mono text-slate-900 dark:text-white">{results.length}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Correct</dt><dd className="font-mono text-green-600">{results.filter(r => r.correct).length}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Incorrect</dt><dd className="font-mono text-red-500">{results.filter(r => !r.correct).length}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">True positives (attacks caught)</dt><dd className="font-mono text-slate-900 dark:text-white">{metrics.tp}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">False negatives (attacks missed)</dt><dd className="font-mono text-slate-900 dark:text-white">{metrics.fn}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">False positives (false alarms)</dt><dd className="font-mono text-slate-900 dark:text-white">{metrics.fp}</dd></div>
              </dl>
              <button
                onClick={() => downloadCsv(results)}
                className="mt-4 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Export results CSV
              </button>
            </div>
          </div>

          {/* Per-case results table */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Per-case results</h2>
              <div className="flex gap-1 text-xs">
                {(['all', 'errors'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setTableFilter(f)}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      tableFilter === f
                        ? 'bg-red-600 text-white'
                        : 'border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {f === 'all' ? 'All' : 'Errors only'}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2 pr-3">ID</th>
                    <th className="py-2 pr-3">URI / connection</th>
                    <th className="py-2 pr-3">Actual</th>
                    <th className="py-2 pr-3">Predicted</th>
                    <th className="py-2 pr-3">Conf.</th>
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map(r => (
                    <tr key={r.tc.id} className={`border-b border-slate-100 dark:border-slate-700/50 ${!r.correct ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                      <td className="py-2 pr-3 font-mono text-slate-400">{r.tc.id}</td>
                      <td className="py-2 pr-3 font-mono text-slate-700 dark:text-slate-300 max-w-md truncate">{r.tc.features.http_uri ?? `${r.tc.features.proto} / ${r.tc.features.service}`}</td>
                      <td className="py-2 pr-3 font-mono text-slate-600 dark:text-slate-400">{r.tc.label}</td>
                      <td className={`py-2 pr-3 font-mono font-semibold ${r.predicted === 'web_attack' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{r.predicted}</td>
                      <td className="py-2 pr-3 font-mono text-slate-500">{(r.confidence * 100).toFixed(0)}%</td>
                      <td className="py-2 pr-3">{r.correct ? <span className="text-green-600">✓</span> : <span className="text-red-500 font-bold">✗</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleRows.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">No misclassifications 🎉</p>
              )}
            </div>
          </div>
        </>
      )}

      {!results && !running && (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Click <span className="font-medium">Run evaluation</span> to score the model against the test set.
          Each case is passed through the same <span className="font-mono">classify()</span> pipeline used live,
          then compared to its ground-truth label.
        </p>
      )}
    </div>
  )
}
