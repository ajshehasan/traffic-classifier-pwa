import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { loadModel } from './model'
import { prefs } from './prefs'
import { scheduleQuizReminder } from './notifications'
import Header from './components/Header'
import Home from './pages/Home'
import Learn from './pages/Learn'
import Quiz from './pages/Quiz'
import Classify from './pages/Classify'
import Stats from './pages/Stats'
import History from './pages/History'
import Settings from './pages/Settings'

function App() {
  useEffect(() => {
    loadModel()
    // Apply saved theme
    if (prefs.theme === 'dark') document.documentElement.classList.add('dark')
    // Schedule quiz reminder if enabled
    if (prefs.notificationsEnabled) scheduleQuizReminder(prefs.streakDays)
  }, [])

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/classify" element={<Classify />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
