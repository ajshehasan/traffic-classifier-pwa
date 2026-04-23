import { useEffect, useState } from 'react'
import type { AttackClass } from '../types'
import { getQuizAnswers, getClassificationsThisWeek, getClassifications } from '../db'
import { prefs } from '../prefs'

const TOP_CLASSES: AttackClass[] = ['benign', 'web_attack']

interface DayBar { day: string; count: number }

export default function Stats() {
  const [accuracy, setAccuracy] = useState(0)
  const [streak, setStreak] = useState(0)
  const [weekScans, setWeekScans] = useState(0)
  const [weakSpot, setWeakSpot] = useState<string>('none yet')
  const [matrix, setMatrix] = useState<Record<string, Record<string, number>>>({})
  const [bars, setBars] = useState<DayBar[]>([])

  useEffect(() => {
    async function load() {
      const [answers, weekCls, allCls] = await Promise.all([
        getQuizAnswers(), getClassificationsThisWeek(), getClassifications(),
      ])

      const correct = answers.filter(a => a.correct).length
      setAccuracy(answers.length > 0 ? Math.round((correct / answers.length) * 100) : 0)
      setStreak(prefs.streakDays)
      setWeekScans(weekCls.length)

      const wrongByClass: Record<string, number> = {}
      answers.filter(a => !a.correct).forEach(a => {
        wrongByClass[a.questionClass] = (wrongByClass[a.questionClass] ?? 0) + 1
      })
      const sorted = Object.entries(wrongByClass).sort((a, b) => b[1] - a[1])
      setWeakSpot(sorted[0]?.[0] ?? 'none yet')

      const m: Record<string, Record<string, number>> = {}
      TOP_CLASSES.forEach(a => { m[a] = {}; TOP_CLASSES.forEach(b => { m[a][b] = 0 }) })
      answers.forEach(a => {
        if (TOP_CLASSES.includes(a.questionClass as AttackClass) && TOP_CLASSES.includes(a.userAnswer as AttackClass)) {
          m[a.questionClass][a.userAnswer] = (m[a.questionClass][a.userAnswer] ?? 0) + 1
        }
      })
      setMatrix(m)

      const dayMap: Record<string, number> = {}
      const today = new Date()
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today); d.setDate(today.getDate() - i)
        dayMap[d.toISOString().slice(0, 10)] = 0
      }
      ;[...answers.map(a => a.timestamp), ...allCls.map(c => c.timestamp)].forEach(ts => {
        const key = new Date(ts).toISOString().slice(0, 10)
        if (key in dayMap) dayMap[key]++
      })
      setBars(Object.entries(dayMap).map(([day, count]) => ({ day: day.slice(5), count })))
    }
    load()
  }, [])

  const maxBar = Math.max(...bars.map(b => b.count), 1)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Your stats</h1>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Day streak', value: streak },
          { label: 'Quiz accuracy', value: `${accuracy}%` },
          { label: 'Scans this week', value: weekScans },
          { label: 'Weak spot', value: weakSpot, mono: true },
        ].map(({ label, value, mono }) => (
          <div key={label} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className={`text-2xl font-bold text-slate-900 dark:text-white truncate ${mono ? 'font-mono text-base' : ''}`}>{value}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Confusion matrix */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4 text-sm">Confusion matrix (quiz answers)</h2>
          <div className="overflow-x-auto">
            <table className="text-xs font-mono border-collapse">
              <thead>
                <tr>
                  <th className="p-1 text-slate-500 dark:text-slate-400 text-left w-20">actual ↓ / pred →</th>
                  {TOP_CLASSES.map(c => (
                    <th key={c} className="p-1 text-center text-slate-500 dark:text-slate-400 w-14">{c.slice(0, 4)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TOP_CLASSES.map(actual => (
                  <tr key={actual}>
                    <td className="p-1 text-slate-600 dark:text-slate-300 font-semibold">{actual.slice(0, 4)}</td>
                    {TOP_CLASSES.map(pred => {
                      const val = matrix[actual]?.[pred] ?? 0
                      const isCorrect = actual === pred
                      return (
                        <td key={pred} className={`p-1 text-center border border-slate-100 dark:border-slate-700 ${
                          val === 0 ? 'text-slate-300 dark:text-slate-600' :
                          isCorrect ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                        }`}>
                          {val}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity chart */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4 text-sm">7-day activity</h2>
          <div className="flex items-end gap-3 h-40">
            {bars.map(({ day, count }) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-red-500 rounded-t transition-all"
                  style={{ height: `${(count / maxBar) * 130}px`, minHeight: count > 0 ? 4 : 0 }}
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">{day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
