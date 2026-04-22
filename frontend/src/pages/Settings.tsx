import { useState, useEffect } from 'react'
import { prefs, type Theme, type Difficulty } from '../prefs'
import { clearClassifications, clearQuizAnswers, countClassifications, countQuizAnswers } from '../db'
import { requestNotificationPermission, scheduleQuizReminder } from '../notifications'
import { isRealModelActive, isFallbackActive, getModelMeta } from '../model'

export default function Settings() {
  const [notif, setNotif] = useState(prefs.notificationsEnabled)
  const [theme, setTheme] = useState<Theme>(prefs.theme)
  const [difficulty, setDifficulty] = useState<Difficulty>(prefs.quizDifficulty)
  const [reveal, setReveal] = useState(prefs.revealModelPrediction)
  const [clsCount, setClsCount] = useState(0)
  const [quizCount, setQuizCount] = useState(0)
  const [modelStatus, setModelStatus] = useState('Loading…')

  useEffect(() => {
    const check = setInterval(() => {
      if (isRealModelActive()) {
        const m = getModelMeta()!
        setModelStatus(`Real model active · ${(m.test_accuracy * 100).toFixed(0)}% accuracy · ${m.dataset}`)
        clearInterval(check)
      } else if (isFallbackActive()) {
        setModelStatus('Rule-based fallback active — model failed to load')
        clearInterval(check)
      }
    }, 300)
    return () => clearInterval(check)
  }, [])

  useEffect(() => {
    Promise.all([countClassifications(), countQuizAnswers()]).then(([c, q]) => {
      setClsCount(c); setQuizCount(q)
    })
  }, [])

  async function handleNotifToggle() {
    if (!notif) {
      const granted = await requestNotificationPermission()
      if (!granted) { alert('Notification permission denied.'); return }
      scheduleQuizReminder(prefs.streakDays)
    }
    const next = !notif
    prefs.notificationsEnabled = next
    setNotif(next)
  }

  function handleTheme(t: Theme) {
    prefs.theme = t
    setTheme(t)
    document.documentElement.classList.toggle('dark', t === 'dark')
  }

  function handleDifficulty(d: Difficulty) {
    prefs.quizDifficulty = d
    setDifficulty(d)
  }

  function handleReveal(v: boolean) {
    prefs.revealModelPrediction = v
    setReveal(v)
  }

  async function handleClearCls() {
    if (!confirm('Clear all classification history?')) return
    await clearClassifications()
    setClsCount(0)
  }

  async function handleClearQuiz() {
    if (!confirm('Clear all quiz history?')) return
    await clearQuizAnswers()
    setQuizCount(0)
  }

  const toggleCls = 'relative inline-flex h-6 w-11 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none'
  const knobCls = 'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      {/* Preferences */}
      <section className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        <div className="px-5 py-3 bg-slate-50 rounded-t-xl">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Preferences · saved in localStorage
          </h2>
        </div>

        {/* Notifications */}
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-900">Daily quiz reminder</div>
            <div className="text-xs text-slate-500">Sends a notification at 18:00 if you haven't quizzed today</div>
          </div>
          <button
            onClick={handleNotifToggle}
            className={`${toggleCls} ${notif ? 'bg-red-600' : 'bg-slate-200'}`}
            role="switch" aria-checked={notif}
          >
            <span className={`${knobCls} ${notif ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Theme */}
        <div className="px-5 py-4">
          <div className="text-sm font-medium text-slate-900 mb-2">Theme</div>
          <div className="flex gap-2">
            {(['light', 'dark', 'auto'] as Theme[]).map(t => (
              <button
                key={t}
                onClick={() => handleTheme(t)}
                className={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${
                  theme === t ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="px-5 py-4">
          <div className="text-sm font-medium text-slate-900 mb-1">Quiz difficulty</div>
          <div className="text-xs text-slate-500 mb-2">Number of answer choices shown per question</div>
          <div className="flex gap-2">
            {([3, 6, 9] as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={() => handleDifficulty(d)}
                className={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${
                  difficulty === d ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {d === 3 ? 'Easy (3)' : d === 6 ? 'Medium (6)' : 'Hard (9)'}
              </button>
            ))}
          </div>
        </div>

        {/* Reveal model prediction */}
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-900">Reveal model prediction after quiz</div>
            <div className="text-xs text-slate-500">Shows what the model predicted alongside the correct answer</div>
          </div>
          <button
            onClick={() => handleReveal(!reveal)}
            className={`${toggleCls} ${reveal ? 'bg-red-600' : 'bg-slate-200'}`}
            role="switch" aria-checked={reveal}
          >
            <span className={`${knobCls} ${reveal ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </section>

      {/* Data */}
      <section className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        <div className="px-5 py-3 bg-slate-50 rounded-t-xl">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Data · stored in IndexedDB
          </h2>
        </div>

        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-900">Classification history</div>
            <div className="text-xs text-slate-500">{clsCount} records stored</div>
          </div>
          <button onClick={handleClearCls} className="text-sm text-red-600 hover:underline font-medium">Clear</button>
        </div>

        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-900">Quiz history</div>
            <div className="text-xs text-slate-500">{quizCount} answers stored</div>
          </div>
          <button onClick={handleClearQuiz} className="text-sm text-red-600 hover:underline font-medium">Clear</button>
        </div>

        <div className="px-5 py-4">
          <div className="text-sm font-medium text-slate-900 mb-1">Model status</div>
          <div className="text-xs text-slate-500 font-mono">{modelStatus}</div>
        </div>
      </section>
    </div>
  )
}
