// Web Worker: runs the TensorFlow.js neural network off the main thread so the UI
// never blocks during inference. Loads the model once, then answers classify requests
// by message. If the model files can't be loaded, it reports failure and the main
// thread falls back to the rule-based stub.

import * as tf from '@tensorflow/tfjs'
import { buildFeatureVector, finalizePrediction } from './classifierShared'
import type { PreprocessingMeta } from './classifierShared'
import type { ConnectionFeatures } from './types'

let model: tf.LayersModel | null = null
let meta: PreprocessingMeta | null = null

type Incoming =
  | { type: 'init' }
  | { type: 'classify'; id: number; features: ConnectionFeatures }

const initPromise: Promise<void> = (async () => {
  try {
    const metaRes = await fetch('/model/preprocessing.json')
    meta = (await metaRes.json()) as PreprocessingMeta
    model = await tf.loadLayersModel('/model/model.json')
    postMessage({ type: 'ready', meta })
  } catch (err) {
    postMessage({ type: 'failed', error: String(err) })
  }
})()

self.onmessage = async (e: MessageEvent<Incoming>) => {
  const data = e.data
  if (data.type === 'classify') {
    await initPromise
    if (!model || !meta) {
      // Model unavailable — tell the main thread to use its fallback for this request.
      postMessage({ type: 'result', id: data.id, fallback: true })
      return
    }
    const raw = buildFeatureVector(data.features, meta.feature_names)
    const normalized = raw.map((v, i) => {
      const std = meta!.feature_std[i]
      return std === 0 ? 0 : (v - meta!.feature_mean[i]) / std
    })

    const input = tf.tensor2d([normalized], [1, 78])
    const output = model.predict(input) as tf.Tensor
    const probs = Array.from(await output.data()) as number[]
    input.dispose()
    output.dispose()

    const prediction = finalizePrediction(data.features, probs, meta.class_names)
    postMessage({ type: 'result', id: data.id, prediction })
  }
}
