import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { classify, getModelMeta, isRealModelActive, isFallbackActive } from '../model'
import { randomExample } from '../data/examples'
import type { Prediction } from '../types'
import type { Example } from '../data/examples'
import ConnectionCard from '../components/ConnectionCard'
import ProbabilityBars from '../components/ProbabilityBars'
import VerdictChip from '../components/VerdictChip'
import { prefs } from '../prefs'
import { getQuizAnswers, getClassificationsThisWeek } from '../db'

export default function Home() {
  const navigate = useNavigate()
  const [example, setExample] = useState<Example | null>(null)
  const [modelLabel, setModelLabel] = useState('Loading model…')
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(true)
  const [showWhy, setShowWhy] = useState(false)
  const [stats, setStats] = useState({ accuracy: 0, weekScans: 0, weakSpot: 'unknown' })

  const runExample = useCallback(async (ex: Example) => {
    setLoading(true)
    setShowWhy(false)
    const pred = await classify(ex.features)
    setPrediction(pred)
    setLoading(false)
  }, [])

  const pickRandom = useCallback(() => {
    const ex = randomExample()
    setExample(ex)
    runExample(ex)
  }, [runExample])

  useEffect(() => {
    pickRandom()
    // Poll until model finishes loading (max ~3s)
    const check = setInterval(() => {
      if (isRealModelActive()) {
        const m = getModelMeta()!
        setModelLabel(`Real model loaded · ${(m.test_accuracy * 100).toFixed(0)}% accuracy · ${m.dataset}`)
        clearInterval(check)
      } else if (isFallbackActive()) {
        setModelLabel('Rule-based fallback active — model failed to load')
        clearInterval(check)
      }
    }, 300)
    async function loadStats() {
      const [answers, weekClasses] = await Promise.all([getQuizAnswers(), getClassificationsThisWeek()])
      const accuracy = answers.length > 0
        ? Math.round((answers.filter(a => a.correct).length / answers.length) * 100)
        : 0
      const wrongByClass: Record<string, number> = {}
      answers.filter(a => !a.correct).forEach(a => {
        wrongByClass[a.questionClass] = (wrongByClass[a.questionClass] ?? 0) + 1
      })
      const weakSpot = Object.entries(wrongByClass).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'none yet'
      setStats({ accuracy, weekScans: weekClasses.length, weakSpot })
    }
    loadStats()
  }, [pickRandom])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Hero */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Live Classification</h1>
          <p className="text-slate-500 text-sm mb-4">Model running in your browser on a random example connection</p>
          {example && <ConnectionCard features={example.features} />}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          {loading ? (
            <div className="text-slate-400 text-sm animate-pulse">Classifying…</div>
          ) : prediction ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Verdict</span>
                <VerdictChip label={prediction.top} size="lg" />
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wide">Top 3 probabilities</span>
                <div className="mt-2">
                  <ProbabilityBars probabilities={prediction.probabilities} topN={3} />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={pickRandom}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Show me another
                </button>
                <button
                  onClick={() => setShowWhy(v => !v)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  {showWhy ? 'Hide' : 'Why this verdict?'}
                </button>
              </div>
              {showWhy && (
                <ul className="text-sm text-slate-600 space-y-1 border-t border-slate-100 pt-3">
                  {prediction.features_that_fired.map((f, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-red-500 shrink-0">›</span>
                      {f}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Quiz banner */}
      <div
        onClick={() => navigate('/quiz')}
        className="cursor-pointer bg-red-600 rounded-xl p-5 flex items-center justify-between hover:bg-red-700 transition-colors"
      >
        <div>
          <div className="text-white font-semibold text-lg">Today's quiz</div>
          <div className="text-red-100 text-sm">Keep your streak going!</div>
        </div>
        <div className="text-right">
          <div className="text-white text-3xl font-bold">{prefs.streakDays}</div>
          <div className="text-red-200 text-xs">day streak</div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/classify')}
          className="text-left border border-slate-200 rounded-xl p-5 hover:border-red-300 hover:bg-red-50 transition-colors group"
        >
          <div className="font-semibold text-slate-900 group-hover:text-red-700">Classify a connection</div>
          <div className="text-sm text-slate-500 mt-1">Enter connection fields and get a prediction</div>
        </button>
        <button
          onClick={() => navigate('/learn')}
          className="text-left border border-slate-200 rounded-xl p-5 hover:border-slate-400 hover:bg-slate-50 transition-colors"
        >
          <div className="font-semibold text-slate-900">Browse examples</div>
          <div className="text-sm text-slate-500 mt-1">Study 30 real attack patterns by type</div>
        </button>
      </div>

      {/* Stat mini-cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-slate-900">{stats.accuracy}%</div>
          <div className="text-xs text-slate-500 mt-1">Quiz accuracy</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-slate-900">{stats.weekScans}</div>
          <div className="text-xs text-slate-500 mt-1">Scans this week</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-sm font-bold text-slate-900 font-mono truncate">{stats.weakSpot}</div>
          <div className="text-xs text-slate-500 mt-1">Weak spot</div>
        </div>
      </div>

      {/* Model status */}
      <div className="text-center">
        <span className="inline-block text-xs font-mono text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
          {modelLabel}
        </span>
      </div>
    </div>
  )
}
