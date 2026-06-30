import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill it in.')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export interface LiveLog {
  id: number
  created_at: string
  ip_address: string
  method: string
  uri: string
  status_code: number
  bytes: number
  duration_ms: number
  user_agent: string
  proto: string
  service: string
}
