export type Theme = 'light' | 'dark' | 'auto'
export type Difficulty = 3 | 6 | 9

export interface Prefs {
  notificationsEnabled: boolean
  theme: Theme
  quizDifficulty: Difficulty
  revealModelPrediction: boolean
  streakDays: number
  lastQuizDate: string | null
}

const DEFAULTS: Prefs = {
  notificationsEnabled: false,
  theme: 'auto',
  quizDifficulty: 6,
  revealModelPrediction: true,
  streakDays: 0,
  lastQuizDate: null,
}

function get<K extends keyof Prefs>(key: K): Prefs[K] {
  const raw = localStorage.getItem(key)
  if (raw === null) return DEFAULTS[key]
  try { return JSON.parse(raw) } catch { return DEFAULTS[key] }
}

function set<K extends keyof Prefs>(key: K, value: Prefs[K]): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export const prefs = {
  get notificationsEnabled() { return get('notificationsEnabled') },
  set notificationsEnabled(v: boolean) { set('notificationsEnabled', v) },

  get theme() { return get('theme') },
  set theme(v: Theme) { set('theme', v) },

  get quizDifficulty() { return get('quizDifficulty') },
  set quizDifficulty(v: Difficulty) { set('quizDifficulty', v) },

  get revealModelPrediction() { return get('revealModelPrediction') },
  set revealModelPrediction(v: boolean) { set('revealModelPrediction', v) },

  get streakDays() { return get('streakDays') },
  set streakDays(v: number) { set('streakDays', v) },

  get lastQuizDate() { return get('lastQuizDate') },
  set lastQuizDate(v: string | null) { set('lastQuizDate', v) },
}

export function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

export function updateStreak(): void {
  const today = todayString()
  const last = prefs.lastQuizDate
  if (last === today) return
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  prefs.streakDays = last === yesterday ? prefs.streakDays + 1 : 1
  prefs.lastQuizDate = today
}
