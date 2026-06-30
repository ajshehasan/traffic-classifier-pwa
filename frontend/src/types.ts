export interface ConnectionFeatures {
  proto: 'tcp' | 'udp' | 'icmp'
  service: string
  duration: number
  src_bytes: number
  dst_bytes: number
  http_method?: string
  http_uri?: string
  http_status_code?: number
  http_user_agent?: string
}

export type AttackClass = 'benign' | 'web_attack'

export interface Prediction {
  top: AttackClass
  confidence: number
  probabilities: Record<AttackClass, number>
  features_that_fired: string[]
  // Multi-class detail from the model (3-class: BENIGN / Web Attack - Brute Force / Web Attack - XSS).
  // `top`/`probabilities` above stay binary so existing UI keeps working; these add the specifics.
  predictedClass?: string                    // e.g. 'Web Attack - XSS' or 'BENIGN'
  classProbabilities?: Record<string, number> // full distribution over the model's classes
}

export interface ClassificationRecord {
  id?: number
  timestamp: number
  features: ConnectionFeatures
  prediction: Prediction
  source: 'classify' | 'quiz' | 'csv_batch'
  batch_id?: string
  batch_size?: number
}

export interface QuizAnswer {
  id?: number
  timestamp: number
  questionClass: AttackClass
  userAnswer: AttackClass
  correct: boolean
  sessionId: string
  features: ConnectionFeatures
}
