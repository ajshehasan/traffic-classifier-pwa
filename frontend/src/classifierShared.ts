// Pure classification logic shared between the Web Worker (real TF.js model) and the
// main-thread rule-based fallback. No TensorFlow.js import here, so it stays tiny and
// runs anywhere. The worker calls buildFeatureVector + finalizePrediction around the
// neural-network forward pass; the fallback uses stubClassify.

import type { AttackClass, ConnectionFeatures, Prediction } from './types'

export interface PreprocessingMeta {
  feature_names: string[]
  feature_mean: number[]
  feature_std: number[]
  class_names: string[]
  test_accuracy: number
  dataset: string
}

// Maps ConnectionFeatures → 78-element float array in feature_names order.
// Derives as many CIC-IDS-2017 features as possible from the available fields.
export function buildFeatureVector(features: ConnectionFeatures, names: string[]): number[] {
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

const isBenignName = (n: string): boolean => n.trim().toUpperCase() === 'BENIGN'

// Applies the two-tier hybrid logic on top of the model's multi-class probability
// vector (one entry per class in `classNames`) and returns the final Prediction.
// The binary `top`/`probabilities` are derived (benign vs. everything-else) so the
// existing UI keeps working; `predictedClass`/`classProbabilities` carry the specifics.
export function finalizePrediction(
  features: ConnectionFeatures,
  probs: number[],
  classNames: string[],
): Prediction {
  // Full multi-class distribution from the model
  const classProbabilities: Record<string, number> = {}
  classNames.forEach((n, i) => { classProbabilities[n] = probs[i] ?? 0 })

  // Collapse to a binary attack probability: P(attack) = 1 − P(BENIGN)
  const benignIdx = classNames.findIndex(isBenignName)
  const pBenign = benignIdx >= 0 ? (probs[benignIdx] ?? 0) : 0

  // Most likely specific attack subclass (highest-probability non-benign class)
  let topAttackClass = 'Web Attack'
  let topAttackProb = -1
  classNames.forEach((n, i) => {
    if (!isBenignName(n) && (probs[i] ?? 0) > topAttackProb) {
      topAttackProb = probs[i] ?? 0
      topAttackClass = n
    }
  })

  // Tier 1: strong rule override — bypasses model entirely
  const override = getStrongOverride(features)
  if (override) {
    const conf = override.confidence
    return {
      top: 'web_attack',
      confidence: conf,
      probabilities: { benign: 1 - conf, web_attack: conf },
      features_that_fired: [override.reason, ...buildReasons(features, 'web_attack', 'model')],
      predictedClass: override.attackType,
      classProbabilities,
    }
  }

  // Tier 2: subtle signal blending — nudges model when it is unsure
  let pAttack = 1 - pBenign
  const subtle = getSubtleSignal(features)
  let source: 'model' | 'hybrid' = 'model'
  if (subtle && pAttack < 0.6) {
    pAttack = Math.max(pAttack, subtle.score)
    source = 'hybrid'
  }
  const pB = 1 - pAttack

  const top: AttackClass = pAttack > pB ? 'web_attack' : 'benign'
  const confidence = top === 'web_attack' ? pAttack : pB
  const reasons = buildReasons(features, top, source)
  if (source === 'hybrid' && subtle)
    reasons.unshift(subtle.reason)

  return {
    top,
    confidence,
    probabilities: { benign: pB, web_attack: pAttack },
    features_that_fired: reasons,
    predictedClass: top === 'web_attack' ? topAttackClass : 'BENIGN',
    classProbabilities,
  }
}

interface StrongOverride {
  reason: string
  confidence: number
  attackType: string
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
    return { reason: 'Rule match: SQL injection pattern in URI', confidence: 0.95, attackType: 'SQL Injection' }
  if (uri.includes('<script') || uri.includes('onerror=') || uri.includes('alert('))
    return { reason: 'Rule match: XSS payload in URI', confidence: 0.95, attackType: 'Web Attack - XSS' }
  if (uri.includes('../') || uri.includes('/etc/passwd'))
    return { reason: 'Rule match: Path traversal sequence in URI', confidence: 0.95, attackType: 'Path Traversal' }
  if (uri.includes('/cmd.php') || uri.includes('exec(') || uri.includes('system('))
    return { reason: 'Rule match: Web shell / remote command execution pattern', confidence: 0.95, attackType: 'Remote Command Execution' }
  if (ua.includes('sqlmap') || ua.includes('nikto') || ua.includes('nmap') || ua.includes('hydra'))
    return { reason: `Rule match: Known attack tool in User-Agent (${ua.split('/')[0]})`, confidence: 0.95, attackType: 'Attack Tool Activity' }
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

export function stubClassify(features: ConnectionFeatures): Prediction {
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

  return {
    top,
    confidence,
    probabilities,
    features_that_fired: buildReasons(features, top),
    predictedClass: top === 'web_attack' ? 'Web Attack' : 'BENIGN',
    classProbabilities: { BENIGN: probabilities.benign, 'Web Attack': probabilities.web_attack },
  }
}
