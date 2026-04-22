import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AttackClass } from '../types'
import { examples } from '../data/examples'
import type { Example } from '../data/examples'
import { classify } from '../model'
import { prefs, updateStreak } from '../prefs'
import { saveQuizAnswer } from '../db'
import { fireCompletionNotification } from '../notifications'
import ConnectionCard from '../components/ConnectionCard'
import VerdictChip from '../components/VerdictChip'

const ALL_CLASSES: AttackClass[] = ['benign', 'web_attack']

const TOTAL = 10

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function getChoices(_correct: AttackClass): AttackClass[] {
  return shuffle([...ALL_CLASSES])
}

export default function Quiz() {
  const navigate = useNavigate()
  const sessionId = useRef(crypto.randomUUID())
  const [question, setQuestion] = useState<Example | null>(null)
  const [choices, setChoices] = useState<AttackClass[]>([])
  const [answered, setAnswered] = useState<AttackClass | null>(null)
  const [modelPred, setModelPred] = useState<{ top: AttackClass; confidence: number } | null>(null)
  const [count, setCount] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [done, setDone] = useState(false)
  const [sessionMistakes, setSessionMistakes] = useState<string[]>([])

  const difficulty = prefs.quizDifficulty as 3 | 6 | 9
  const reveal = prefs.revealModelPrediction

  const nextQuestion = useCallback(() => {
    const ex = examples[Math.floor(Math.random() * examples.length)]
    setQuestion(ex)
    setChoices(getChoices(ex.label))
    setAnswered(null)
    setModelPred(null)
  }, [difficulty])

  useEffect(() => { nextQuestion() }, [nextQuestion])

  async function handleAnswer(choice: AttackClass) {
    if (!question || answered) return
    setAnswered(choice)
    const isCorrect = choice === question.label

    if (reveal) {
      const pred = await classify(question.features)
      setModelPred({ top: pred.top, confidence: pred.confidence })
    }

    const newCount = count + 1
    const newCorrect = correct + (isCorrect ? 1 : 0)
    setCount(newCount)
    setCorrect(newCorrect)

    await saveQuizAnswer({
      timestamp: Date.now(),
      questionClass: question.label,
      userAnswer: choice,
      correct: isCorrect,
      sessionId: sessionId.current,
      features: question.features,
    })

    if (!isCorrect) setSessionMistakes(m => [...m, question.id])

    if (newCount >= TOTAL) {
      updateStreak()
      await fireCompletionNotification(
        `Quiz complete! ${newCorrect}/${TOTAL}`,
        newCorrect >= 8 ? 'Excellent work!' : 'Keep practising to improve.',
      )
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="text-5xl font-bold text-slate-900 dark:text-white">{correct}/{TOTAL}</div>
        <div className="text-slate-500 dark:text-slate-400">Quiz complete! Streak: {prefs.streakDays} days</div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { setCount(0); setCorrect(0); setDone(false); setSessionMistakes([]); nextQuestion() }}
            className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
          >
            Play again
          </button>
          {sessionMistakes.length > 0 && (
            <button
              onClick={() => navigate('/history')}
              className="px-5 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              See what you missed
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>Question {count + 1} of {TOTAL}</span>
        <span>{correct} correct</span>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
        <div className="bg-red-600 h-2 rounded-full transition-all" style={{ width: `${(count / TOTAL) * 100}%` }} />
      </div>

      {question && (
        <>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">What attack type does this connection represent?</p>
            <ConnectionCard features={question.features} />
          </div>

          {/* Choices */}
          <div className="grid grid-cols-2 gap-3">
            {choices.map(cls => {
              const isCorrect = cls === question.label
              const isChosen = cls === answered
              let btn = 'border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              if (answered) {
                if (isCorrect) btn = 'border-2 border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                else if (isChosen) btn = 'border-2 border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                else btn = 'border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-600 opacity-60'
              }
              return (
                <button
                  key={cls}
                  onClick={() => handleAnswer(cls)}
                  disabled={!!answered}
                  className={`py-2.5 px-4 rounded-lg text-sm font-mono font-medium transition-colors text-left ${btn}`}
                >
                  {cls}
                </button>
              )
            })}
          </div>

          {/* Post-answer reveal */}
          {answered && (
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
              <div className="flex gap-4 flex-wrap text-sm">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Your answer: </span>
                  <VerdictChip label={answered} size="sm" />
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Correct: </span>
                  <VerdictChip label={question.label} size="sm" />
                </div>
                {modelPred && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Model: </span>
                    <VerdictChip label={modelPred.top} size="sm" />
                    <span className="text-slate-400 dark:text-slate-500 text-xs ml-1">({(modelPred.confidence * 100).toFixed(0)}%)</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{question.explanation}</p>
              {count < TOTAL && (
                <button
                  onClick={nextQuestion}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  Next question →
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
