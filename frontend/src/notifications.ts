import { prefs, todayString } from './prefs'

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function scheduleQuizReminder(streak: number): void {
  if (!prefs.notificationsEnabled) return
  if (!('serviceWorker' in navigator)) return
  if (prefs.lastQuizDate === todayString()) return

  const now = new Date()
  const reminder = new Date()
  reminder.setHours(18, 0, 0, 0)

  const delay = reminder.getTime() > now.getTime()
    ? reminder.getTime() - now.getTime()
    : 0

  setTimeout(async () => {
    const reg = await navigator.serviceWorker.ready
    reg.showNotification("Time for today's quiz", {
      body: `Classify 10 connections to keep your streak (${streak} days)`,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
    })
  }, delay)
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
