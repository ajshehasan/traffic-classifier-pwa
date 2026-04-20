import { openDB, type IDBPDatabase } from 'idb'
import type { ClassificationRecord, QuizAnswer } from './types'

const DB_NAME = 'traffic-classifier'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('classifications')) {
          const cs = db.createObjectStore('classifications', { keyPath: 'id', autoIncrement: true })
          cs.createIndex('timestamp', 'timestamp')
        }
        if (!db.objectStoreNames.contains('quiz_answers')) {
          const qa = db.createObjectStore('quiz_answers', { keyPath: 'id', autoIncrement: true })
          qa.createIndex('timestamp', 'timestamp')
          qa.createIndex('sessionId', 'sessionId')
        }
      },
    })
  }
  return dbPromise
}

export async function saveClassification(record: Omit<ClassificationRecord, 'id'>): Promise<number> {
  const db = await getDB()
  return db.add('classifications', record) as Promise<number>
}

export async function getClassifications(): Promise<ClassificationRecord[]> {
  const db = await getDB()
  return db.getAll('classifications')
}

export async function clearClassifications(): Promise<void> {
  const db = await getDB()
  return db.clear('classifications')
}

export async function countClassifications(): Promise<number> {
  const db = await getDB()
  return db.count('classifications')
}

export async function getClassificationsThisWeek(): Promise<ClassificationRecord[]> {
  const db = await getDB()
  const all = await db.getAll('classifications')
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  return all.filter(r => r.timestamp > weekAgo)
}

export async function saveQuizAnswer(answer: Omit<QuizAnswer, 'id'>): Promise<number> {
  const db = await getDB()
  return db.add('quiz_answers', answer) as Promise<number>
}

export async function getQuizAnswers(): Promise<QuizAnswer[]> {
  const db = await getDB()
  return db.getAll('quiz_answers')
}

export async function clearQuizAnswers(): Promise<void> {
  const db = await getDB()
  return db.clear('quiz_answers')
}

export async function countQuizAnswers(): Promise<number> {
  const db = await getDB()
  return db.count('quiz_answers')
}

export async function getQuizAnswersBySession(sessionId: string): Promise<QuizAnswer[]> {
  const db = await getDB()
  return db.getAllFromIndex('quiz_answers', 'sessionId', sessionId)
}
