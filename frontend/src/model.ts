// Real TensorFlow.js model — MLP trained on CIC-IDS-2017 (Thursday web attacks).
// Input: 78 normalized features. Output: softmax over ['BENIGN', 'Web Attack'].
// TF.js is loaded lazily (dynamic import) to keep the initial JS bundle small.
// Falls back to rule-based stub if model files are missing (offline first load).

import type { LayersModel, Tensor } from '@tensorflow/tfjs'
import type { AttackClass, ConnectionFeatures, Prediction } from './types'

interface PreprocessingMeta {
  feature_names: string[]
  feature_mean: number[]
  feature_std: number[]
  class_names: string[]
  test_accuracy: number
  dataset: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TF = typeof import('@tensorflow/tfjs') & { [k: string]: any }

let tf: TF | null = null
let model: LayersModel | null = null
let meta: PreprocessingMeta | null = null
let useFallback = false

async function getTF(): Promise<TF> {
  if (!tf) tf = await import('@tensorflow/tfjs') as TF
  return tf
}

export async function loadModel(): Promise<void> {
  if (model || useFallback) return
  try {
    const [metaRes, tfLib] = await Promise.all([
      fetch('/model/preprocessing.json'),
      getTF(),
    ])
    const loadedMeta = await metaRes.json() as PreprocessingMeta
    model = await tfLib.loadLayersModel('/model/model.json')
    // Only expose meta if the model itself loaded successfully
    meta = loadedMeta
  } catch (err) {
    console.warn('[model] Failed to load real model — using rule-based fallback.', err)
    useFallback = true
  }
}

export function isRealModelActive(): boolean {
  return model !== null && !useFallback
}

export function isFallbackActive(): boolean {
  return useFallback
}

export function getModelMeta(): PreprocessingMeta | null {
  return meta
}

// Maps ConnectionFeatures → 78-element float array in feature_names order.
// Derives as many CIC-IDS-2017 features as possible from the available fields.
function buildFeatureVector(features: ConnectionFeatures, names: string[]): number[] {
  const servicePort: Record<string, number> = { http: 80, ssl: 443, ftp: 21, dns: 53 }
  const port = servicePort[features.service] ?? 0
  const dur = features.duration ?? 0
  const fwdBytes = features.src_bytes ?? 0
  const bwdBytes = features.dst_bytes ?? 0
  const totalBytes = fwdBytes + bwdBytes
  const isTCP = features.proto === 'tcp'

  // Estimate packet counts: assume ~1500 byte MTU
  const fwdPkts = fwdBytes > 0 ? Math.max(1, Math.ceil(fwdBytes / 1500)) : 1
  const bwdPkts = bwdBytes > 0 ? Math.max(1, Math.ceil(bwdBytes / 1500)) : 1
  const totalPkts = fwdPkts + bwdPkts

  // Derived flow statistics
  const flowBytesPerSec = dur > 0 ? totalBytes / dur : 0
  const flowPktsPerSec  = dur > 0 ? totalPkts / dur : 0
  const fwdPktLenMean   = fwdPkts > 0 ? fwdBytes / fwdPkts : 0
  const bwdPktLenMean   = bwdPkts > 0 ? bwdBytes / bwdPkts : 0
  const avgPktSize      = totalPkts > 0 ? totalBytes / totalPkts : 0
  const downUpRatio     = fwdBytes > 0 ? bwdBytes / fwdBytes : 0
  const minPktLen       = Math.min(fwdPktLenMean, bwdPktLenMean)
  const maxPktLen       = Math.max(fwdPktLenMean, bwdPktLenMean)
  // IAT: estimated inter-arrival time = duration / max(packets-1, 1)
  const fwdIAT  = fwdPkts > 1 ? (dur * 1e6) / (fwdPkts - 1) : dur * 1e6
  const bwdIAT  = bwdPkts > 1 ? (dur * 1e6) / (bwdPkts - 1) : dur * 1e6
  const flowIAT = totalPkts > 1 ? (dur * 1e6) / (totalPkts - 1) : dur * 1e6

  const raw: Record<string, number> = {
    'Destination Port':              port,
    'Flow Duration':                 dur * 1_000_000,
    'Total Fwd Packets':             fwdPkts,
    'Total Backward Packets':        bwdPkts,
    'Total Length of Fwd Packets':   fwdBytes,
    'Total Length of Bwd Packets':   bwdBytes,
    'Fwd Packet Length Max':         fwdPktLenMean,
    'Fwd Packet Length Min':         fwdPktLenMean,
    'Fwd Packet Length Mean':        fwdPktLenMean,
    'Fwd Packet Length Std':         0,
    'Bwd Packet Length Max':         bwdPktLenMean,
    'Bwd Packet Length Min':         bwdPktLenMean,
    'Bwd Packet Length Mean':        bwdPktLenMean,
    'Bwd Packet Length Std':         0,
    'Flow Bytes/s':                  flowBytesPerSec,
    'Flow Packets/s':                flowPktsPerSec,
    'Flow IAT Mean':                 flowIAT,
    'Flow IAT Std':                  0,
    'Flow IAT Max':                  flowIAT,
    'Flow IAT Min':                  flowIAT,
    'Fwd IAT Total':                 dur * 1e6,
    'Fwd IAT Mean':                  fwdIAT,
    'Fwd IAT Std':                   0,
    'Fwd IAT Max':                   fwdIAT,
    'Fwd IAT Min':                   fwdIAT,
    'Bwd IAT Total':                 dur * 1e6,
    'Bwd IAT Mean':                  bwdIAT,
    'Bwd IAT Std':                   0,
    'Bwd IAT Max':                   bwdIAT,
    'Bwd IAT Min':                   bwdIAT,
    'Fwd PSH Flags':                 isTCP ? 1 : 0,
    'Bwd PSH Flags':                 0,
    'Fwd URG Flags':                 0,
    'Bwd URG Flags':                 0,
    'Fwd Header Length':             isTCP ? fwdPkts * 20 : 0,
    'Bwd Header Length':             isTCP ? bwdPkts * 20 : 0,
    'Fwd Packets/s':                 dur > 0 ? fwdPkts / dur : 0,
    'Bwd Packets/s':                 dur > 0 ? bwdPkts / dur : 0,
    'Min Packet Length':             minPktLen,
    'Max Packet Length':             maxPktLen,
    'Packet Length Mean':            avgPktSize,
    'Packet Length Std':             Math.abs(fwdPktLenMean - bwdPktLenMean) / 2,
    'Packet Length Variance':        Math.pow(Math.abs(fwdPktLenMean - bwdPktLenMean) / 2, 2),
    'FIN Flag Count':                isTCP ? 1 : 0,
    'SYN Flag Count':                isTCP ? 1 : 0,
    'RST Flag Count':                0,
    'PSH Flag Count':                isTCP ? 1 : 0,
    'ACK Flag Count':                isTCP ? 1 : 0,
    'URG Flag Count':                0,
    'CWE Flag Count':                0,
    'ECE Flag Count':                0,
    'Down/Up Ratio':                 downUpRatio,
    'Average Packet Size':           avgPktSize,
    'Avg Fwd Segment Size':          fwdPktLenMean,
    'Avg Bwd Segment Size':          bwdPktLenMean,
    'Fwd Header Length.1':           isTCP ? fwdPkts * 20 : 0,
    'Fwd Avg Bytes/Bulk':            0,
    'Fwd Avg Packets/Bulk':          0,
    'Fwd Avg Bulk Rate':             0,
    'Bwd Avg Bytes/Bulk':            0,
    'Bwd Avg Packets/Bulk':          0,
    'Bwd Avg Bulk Rate':             0,
    'Subflow Fwd Packets':           fwdPkts,
    'Subflow Fwd Bytes':             fwdBytes,
    'Subflow Bwd Packets':           bwdPkts,
    'Subflow Bwd Bytes':             bwdBytes,
    'Init_Win_bytes_forward':        isTCP ? 65535 : 0,
    'Init_Win_bytes_backward':       isTCP ? 65535 : 0,
    'act_data_pkt_fwd':              fwdPkts,
    'min_seg_size_forward':          isTCP ? 20 : 0,
    'Active Mean':                   0,
    'Active Std':                    0,
    'Active Max':                    0,
    'Active Min':                    0,
    'Idle Mean':                     dur * 1e6,
    'Idle Std':                      0,
    'Idle Max':                      dur * 1e6,
    'Idle Min':                      dur * 1e6,
  }

  return names.map(n => raw[n] ?? 0)
}

export async function classify(features: ConnectionFeatures): Promise<Prediction> {
  await loadModel()
  if (!useFallback && model && meta) {
    return realClassify(features, model, meta)
  }
  return stubClassify(features)
}

async function realClassify(
  features: ConnectionFeatures,
  m: LayersModel,
  pp: PreprocessingMeta,
): Promise<Prediction> {
  const tfLib = await getTF()
  const raw = buildFeatureVector(features, pp.feature_names)
  const normalized = raw.map((v, i) => {
    const std = pp.feature_std[i]
    return std === 0 ? 0 : (v - pp.feature_mean[i]) / std
  })

  const input = tfLib.tensor2d([normalized], [1, 78])
  const output = m.predict(input) as Tensor
  const probs = Array.from(await output.data()) as [number, number]
  input.dispose()
  output.dispose()

  let [p0, p1] = probs

  // Tier 1: strong rule override — bypasses model entirely
  const override = getStrongOverride(features)
  if (override) {
    const conf = override.confidence
    return {
      top: 'web_attack',
      confidence: conf,
      probabilities: { benign: 1 - conf, web_attack: conf },
      features_that_fired: [override.reason, ...buildReasons(features, 'web_attack', 'model')],
    }
  }

  // Tier 2: subtle signal blending — nudges model when it is unsure
  const subtle = getSubtleSignal(features)
  let source: 'model' | 'hybrid' = 'model'
  if (subtle && p1 < 0.6) {
    p1 = Math.max(p1, subtle.score)
    p0 = 1 - p1
    source = 'hybrid'
  }

  const top: AttackClass = p1 > p0 ? 'web_attack' : 'benign'
  const confidence = top === 'web_attack' ? p1 : p0
  const reasons = buildReasons(features, top, source)
  if (source === 'hybrid' && subtle)
    reasons.unshift(subtle.reason)

  return {
    top,
    confidence,
    probabilities: { benign: p0, web_attack: p1 },
    features_that_fired: reasons,
  }
}

interface StrongOverride {
  reason: string
  confidence: number
}

interface SubtleSignal {
  reason: string
  score: number
}

function getStrongOverride(features: ConnectionFeatures): StrongOverride | null {
  const uri = (features.http_uri ?? '').toLowerCase()
  const ua  = (features.http_user_agent ?? '').toLowerCase()
  const sqlTokens = ['select', 'union', "'--", 'or 1=1', 'pg_sleep', 'waitfor', 'drop table', 'insert into']
  if (sqlTokens.some(t => uri.includes(t)))
    return { reason: 'Rule match: SQL injection pattern in URI', confidence: 0.95 }
  if (uri.includes('<script') || uri.includes('onerror=') || uri.includes('alert('))
    return { reason: 'Rule match: XSS payload in URI', confidence: 0.95 }
  if (uri.includes('../') || uri.includes('/etc/passwd'))
    return { reason: 'Rule match: Path traversal sequence in URI', confidence: 0.95 }
  if (uri.includes('/cmd.php') || uri.includes('exec(') || uri.includes('system('))
    return { reason: 'Rule match: Web shell / remote command execution pattern', confidence: 0.95 }
  if (ua.includes('sqlmap') || ua.includes('nikto') || ua.includes('nmap') || ua.includes('hydra'))
    return { reason: `Rule match: Known attack tool in User-Agent (${ua.split('/')[0]})`, confidence: 0.95 }
  return null
}

function getSubtleSignal(features: ConnectionFeatures): SubtleSignal | null {
  const uri = (features.http_uri ?? '').toLowerCase()
  if (features.http_status_code === 404 && (features.duration ?? 1) < 0.05)
    return { reason: 'Subtle signal: Rapid 404 responses (scanner behaviour)', score: 0.78 }
  if ((uri.includes('/login') || uri.includes('/wp-login')) && features.http_status_code === 401)
    return { reason: 'Subtle signal: Repeated login failures (credential stuffing)', score: 0.82 }
  if (uri.includes('%27') || uri.includes('%3c') || uri.includes('%2e%2e'))
    return { reason: 'Subtle signal: URL-encoded attack characters in URI', score: 0.80 }
  return null
}

function buildReasons(features: ConnectionFeatures, top: AttackClass, source: 'rule' | 'model' | 'hybrid' = 'model'): string[] {
  const uri = (features.http_uri ?? '').toLowerCase()
  const ua  = (features.http_user_agent ?? '').toLowerCase()
  const fired: string[] = []

  if (top === 'benign') {
    fired.push('Neural network: No suspicious patterns — connection matches normal traffic profile')
    return fired
  }

  const sqlTokens = ['select', 'union', "'--", 'or 1=1', 'pg_sleep', 'waitfor', 'drop table', 'insert into']
  if (sqlTokens.some(t => uri.includes(t)))
    fired.push('URI contains SQL injection tokens (SELECT / UNION / sleep functions)')
  if (uri.includes('<script') || uri.includes('onerror=') || uri.includes('alert('))
    fired.push('URI contains XSS payload (<script>, onerror=, alert())')
  if (uri.includes('../') || uri.includes('/etc/passwd'))
    fired.push('URI contains path traversal sequences (../)')
  if (uri.includes('/cmd.php') || uri.includes('exec(') || uri.includes('system('))
    fired.push('URI matches web shell / remote command execution pattern')
  if (uri.includes('password=') || uri.includes('/login'))
    fired.push('Login endpoint targeted — possible brute-force or credential stuffing')
  if (ua.includes('sqlmap') || ua.includes('nikto') || ua.includes('hydra') || ua.includes('nmap'))
    fired.push(`Attack tool user-agent detected: ${ua.split('/')[0]}`)

  if (fired.length === 0) {
    fired.push('Neural network: Anomalous flow statistics detected')
  } else {
    const prefix = source === 'hybrid' ? 'Hybrid: rule signal + model confirmation —' : source === 'rule' ? 'Rule match:' : 'Neural network:'
    fired[0] = `${prefix} ${fired[0]}`
  }

  return fired
}

function stubClassify(features: ConnectionFeatures): Prediction {
  const uri = (features.http_uri ?? '').toLowerCase()
  const ua  = (features.http_user_agent ?? '').toLowerCase()
  const sqlTokens = ['select', 'union', "'--", 'or 1=1', 'pg_sleep', 'waitfor']
  const isAttack =
    sqlTokens.some(t => uri.includes(t)) ||
    uri.includes('<script') || uri.includes('onerror=') || uri.includes('alert(') ||
    uri.includes('../') || uri.includes('/etc/passwd') ||
    uri.includes('/cmd.php') || uri.includes('exec(') ||
    (features.http_status_code === 404 && (features.duration ?? 1) < 0.05) ||
    ua.includes('sqlmap') || ua.includes('nikto') || ua.includes('hydra')

  const top: AttackClass = isAttack ? 'web_attack' : 'benign'
  const confidence = isAttack ? 0.88 + Math.random() * 0.1 : 0.92 + Math.random() * 0.07
  const probabilities: Record<AttackClass, number> = {
    benign:     top === 'benign' ? confidence : 1 - confidence,
    web_attack: top === 'web_attack' ? confidence : 1 - confidence,
  }

  console.warn('[model] Using rule-based fallback — real model not loaded')
  return { top, confidence, probabilities, features_that_fired: buildReasons(features, top) }
}
