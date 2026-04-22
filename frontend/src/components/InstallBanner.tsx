import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
  || ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone)

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOS, setShowIOS] = useState(false)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('install-dismissed') === '1')

  useEffect(() => {
    if (isInStandaloneMode || dismissed) return

    if (isIOS) {
      setShowIOS(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [dismissed])

  function dismiss() {
    localStorage.setItem('install-dismissed', '1')
    setDismissed(true)
    setDeferredPrompt(null)
    setShowIOS(false)
  }

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') dismiss()
    else setDeferredPrompt(null)
  }

  if (dismissed || isInStandaloneMode) return null

  if (deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl shadow-xl p-4 flex items-center gap-3">
        <span className="bg-red-600 text-white rounded px-1.5 py-0.5 text-xs font-mono shrink-0">TC</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Install Traffic Classifier</div>
          <div className="text-xs opacity-70">Works offline, loads instantly</div>
        </div>
        <button
          onClick={install}
          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 shrink-0"
        >
          Install
        </button>
        <button onClick={dismiss} className="p-1 opacity-50 hover:opacity-100 shrink-0" aria-label="Dismiss">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  if (showIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl shadow-xl p-4">
        <div className="flex items-start gap-3">
          <span className="bg-red-600 text-white rounded px-1.5 py-0.5 text-xs font-mono shrink-0 mt-0.5">TC</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold mb-1">Install Traffic Classifier</div>
            <div className="text-xs opacity-75 leading-relaxed">
              Tap the <strong>Share</strong> button{' '}
              <svg xmlns="http://www.w3.org/2000/svg" className="inline w-3.5 h-3.5 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>{' '}
              then <strong>"Add to Home Screen"</strong>
            </div>
          </div>
          <button onClick={dismiss} className="p-1 opacity-50 hover:opacity-100 shrink-0" aria-label="Dismiss">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return null
}
