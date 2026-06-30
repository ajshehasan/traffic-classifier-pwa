import { createClient } from '@supabase/supabase-js'

// The Supabase anon key is a public client key — protected by Row-Level Security, and
// Vite inlines VITE_* vars into the browser bundle anyway, so it is safe to ship.
// Env vars override when present (e.g. a local .env); otherwise we fall back to the
// project's public values so the deployed app works without extra configuration.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://cwumcnwudgdtqtafyogv.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3dW1jbnd1ZGdkdHF0YWZ5b2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NTY3OTUsImV4cCI6MjA5MzAzMjc5NX0.Q52d55CPppJCM0YRTGwHxVJNvVtUGFBZ8ynYiVkK27E'

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
