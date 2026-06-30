// Public model API. Inference runs in a dedicated Web Worker (model.worker.ts) so the
// neural network and TensorFlow.js never execute on the main thread — the UI stays
// responsive even while classifying. This module is a thin message-passing proxy and
// keeps the same API the rest of the app already uses (classify, loadModel, …).

import { stubClassify } from './classifierShared'
import type { PreprocessingMeta } from './classifierShared'
import type { ConnectionFeatures, Prediction } from './types'

let worker: Worker | null = null
let meta: PreprocessingMeta | null = null
let useFallback = false
let realActive = false

interface Pending {
  resolve: (p: Prediction) => void
  features: ConnectionFeatures
}
const pending = new Map<number, Pending>()
let nextId = 1

let resolveReady: () => void
const ready: Promise<void> = new Promise((r) => { resolveReady = r })

function ensureWorker(): void {
  if (worker) return
  try {
    worker = new Worker(new URL('./model.worker.ts', import.meta.url), { type: 'module' })
  } catch (err) {
    console.warn('[model] Web Worker unavailable — using rule-based fallback.', err)
    useFallback = true
    resolveReady()
    return
  }

  worker.onmessage = (e: MessageEvent) => {
    const msg = e.data
    if (msg.type === 'ready') {
      realActive = true
      meta = msg.meta as PreprocessingMeta
      resolveReady()
    } else if (msg.type === 'failed') {
      console.warn('[model] Worker failed to load real model — using rule-based fallback.', msg.error)
      useFallback = true
      resolveReady()
    } else if (msg.type === 'result') {
      const p = pending.get(msg.id)
      if (!p) return
      pending.delete(msg.id)
      p.resolve(msg.fallback ? stubClassify(p.features) : (msg.prediction as Prediction))
    }
  }

  worker.onerror = (err) => {
    console.warn('[model] Worker error — using rule-based fallback.', err)
    useFallback = true
    resolveReady()
  }
}

export async function loadModel(): Promise<void> {
  ensureWorker()
  await ready
}

export function isRealModelActive(): boolean {
  return realActive && !useFallback
}

export function isFallbackActive(): boolean {
  return useFallback
}

export function getModelMeta(): PreprocessingMeta | null {
  return meta
}

export async function classify(features: ConnectionFeatures): Promise<Prediction> {
  ensureWorker()
  await ready
  if (useFallback || !worker) return stubClassify(features)

  return new Promise<Prediction>((resolve) => {
    const id = nextId++
    pending.set(id, { resolve, features })
    worker!.postMessage({ type: 'classify', id, features })
  })
}
