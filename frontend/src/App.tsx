import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { loadModel } from './model'
import { prefs } from './prefs'
import { scheduleQuizReminder } from './notifications'
import Header from './components/Header'
import InstallBanner from './components/InstallBanner'

// Routes are lazy-loaded so each page (and its heavy dependencies — TensorFlow.js,
// jsPDF, html2canvas) ships as a separate chunk fetched only when that page is visited.
const Home = lazy(() => import('./pages/Home'))
const Learn = lazy(() => import('./pages/Learn'))
const Quiz = lazy(() => import('./pages/Quiz'))
const Classify = lazy(() => import('./pages/Classify'))
const Stats = lazy(() => import('./pages/Stats'))
const History = lazy(() => import('./pages/History'))
const Monitor = lazy(() => import('./pages/Monitor'))
const Evaluate = lazy(() => import('./pages/Evaluate'))
const Settings = lazy(() => import('./pages/Settings'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-red-500 animate-spin" />
    </div>
  )
}

function App() {
  useEffect(() => {
    loadModel()
    if (prefs.theme === 'dark') document.documentElement.classList.add('dark')
    if (prefs.notificationsEnabled) scheduleQuizReminder(prefs.streakDays)
  }, [])

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <InstallBanner />
        <main>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/classify" element={<Classify />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/monitor" element={<Monitor />} />
              <Route path="/evaluate" element={<Evaluate />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
