import { prefs, todayString } from './prefs'

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

let reminderScheduled = false

export function scheduleQuizReminder(streak: number): void {
  if (reminderScheduled) return
  if (!prefs.notificationsEnabled) return
  if (!('serviceWorker' in navigator)) return
  if (prefs.lastQuizDate === todayString()) return

  // Don't fire again if we already sent the reminder today
  if (localStorage.getItem('reminder-sent-date') === todayString()) return

  const now = new Date()
  const reminder = new Date()
  reminder.setHours(18, 0, 0, 0)

  // If it's already past 18:00, don't schedule — wait until tomorrow
  if (reminder.getTime() <= now.getTime()) return

  reminderScheduled = true

  setTimeout(async () => {
    if (prefs.lastQuizDate === todayString()) return
    localStorage.setItem('reminder-sent-date', todayString())
    const reg = await navigator.serviceWorker.ready
    reg.showNotification("Time for today's quiz", {
      body: `Classify 10 connections to keep your streak (${streak} days)`,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
    })
  }, reminder.getTime() - now.getTime())
}

export async function fireCompletionNotification(message: string, body: string): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  if (Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker.ready
  reg.showNotification(message, {
    body,
    icon: '/pwa-192x192.png',
  })
}
