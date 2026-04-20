import type { AttackClass, ConnectionFeatures } from '../types'

export interface Example {
  id: string
  label: AttackClass
  features: ConnectionFeatures
  explanation: string
}

export const examples: Example[] = [
  // normal
  {
    id: 'n1',
    label: 'benign',
    features: { proto: 'tcp', service: 'http', duration: 0.34, src_bytes: 512, dst_bytes: 8192, http_method: 'GET', http_uri: '/home', http_status_code: 200, http_user_agent: 'Mozilla/5.0' },
    explanation: 'Standard homepage fetch — moderate bytes, short duration, 200 OK.',
  },
  {
    id: 'n2',
    label: 'benign',
    features: { proto: 'tcp', service: 'http', duration: 1.12, src_bytes: 340, dst_bytes: 21000, http_method: 'GET', http_uri: '/api/products', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Chrome/120' },
    explanation: 'REST API call returning a product list — normal request/response sizes.',
  },
  {
    id: 'n3',
    label: 'benign',
    features: { proto: 'tcp', service: 'ssl', duration: 1.8, src_bytes: 900, dst_bytes: 15000, http_method: 'POST', http_uri: '/api/checkout', http_status_code: 201, http_user_agent: 'Mozilla/5.0 Safari' },
    explanation: 'HTTPS checkout POST — encrypted, reasonable payload, successful 201 response.',
  },

  // injection
  {
    id: 'inj1',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'http', duration: 5.1, src_bytes: 420, dst_bytes: 0, http_method: 'GET', http_uri: "/?id=3');SELECT PG_SLEEP(5)--", http_status_code: 200, http_user_agent: 'sqlmap/1.7' },
    explanation: 'Classic time-based SQL injection — tests database sleep function with sqlmap.',
  },
  {
    id: 'inj2',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'http', duration: 0.2, src_bytes: 380, dst_bytes: 4400, http_method: 'GET', http_uri: "/search?q=' UNION SELECT username,password FROM users--", http_status_code: 200, http_user_agent: 'python-requests/2.28' },
    explanation: 'UNION-based SQL injection extracting credentials from the users table.',
  },
  {
    id: 'inj3',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'http', duration: 0.08, src_bytes: 290, dst_bytes: 1200, http_method: 'GET', http_uri: '/page?file=../../../etc/passwd', http_status_code: 200, http_user_agent: 'curl/7.85.0' },
    explanation: 'Path traversal injection attempting to read /etc/passwd via directory climbing.',
  },

  // xss
  {
    id: 'xss1',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'http', duration: 0.15, src_bytes: 310, dst_bytes: 1800, http_method: 'GET', http_uri: '/search?q=<script>alert(1)</script>', http_status_code: 200, http_user_agent: 'Mozilla/5.0' },
    explanation: 'Reflected XSS probe — injects a script tag into the search query parameter.',
  },
  {
    id: 'xss2',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'http', duration: 0.3, src_bytes: 440, dst_bytes: 900, http_method: 'HEAD', http_uri: '/dvwa/vulnerabilities/xss_r/?name=<img src=x onerror=alert(1)>', http_status_code: 302, http_user_agent: 'Mozilla/5.0' },
    explanation: 'DOM XSS via img onerror handler — common DVWA test payload.',
  },
  {
    id: 'xss3',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'http', duration: 0.12, src_bytes: 360, dst_bytes: 600, http_method: 'GET', http_uri: '/comment?text=%3Cscript%3Edocument.cookie%3C%2Fscript%3E', http_status_code: 200, http_user_agent: 'Mozilla/5.0' },
    explanation: 'URL-encoded XSS payload attempting cookie theft via stored comment field.',
  },

  // ddos
  {
    id: 'ddos1',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'http', duration: 0.01, src_bytes: 120, dst_bytes: 80, http_method: 'GET', http_uri: '/dvwa/login.php', http_status_code: 404, http_user_agent: 'Mozilla/5.0' },
    explanation: 'Flood of rapid GET requests to login endpoint — short duration DDoS burst.',
  },
  {
    id: 'ddos2',
    label: 'web_attack',
    features: { proto: 'udp', service: '-', duration: 0.005, src_bytes: 64, dst_bytes: 0, http_status_code: undefined },
    explanation: 'UDP flood packet — tiny payload, near-zero duration, no service response.',
  },
  {
    id: 'ddos3',
    label: 'web_attack',
    features: { proto: 'icmp', service: '-', duration: 0.003, src_bytes: 84, dst_bytes: 84, http_status_code: undefined },
    explanation: 'ICMP flood (ping flood) — symmetric packet sizes at very high rate.',
  },

  // scanning
  {
    id: 'scan1',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'http', duration: 0.02, src_bytes: 140, dst_bytes: 200, http_method: 'GET', http_uri: '/admin', http_status_code: 404, http_user_agent: 'Nikto/2.1.6' },
    explanation: 'Nikto scanner probing for admin panel — 404 response, automated user-agent.',
  },
  {
    id: 'scan2',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'http', duration: 0.018, src_bytes: 150, dst_bytes: 180, http_method: 'GET', http_uri: '/phpmyadmin', http_status_code: 404, http_user_agent: 'Nikto/2.1.6' },
    explanation: 'Automated scan for phpMyAdmin installation — classic vulnerability scanner pattern.',
  },
  {
    id: 'scan3',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'http', duration: 0.022, src_bytes: 145, dst_bytes: 195, http_method: 'GET', http_uri: '/wp-login.php', http_status_code: 404, http_user_agent: 'WPScan v3.8' },
    explanation: 'WordPress login page probe — WPScan tool fingerprinting the CMS.',
  },

  // password
  {
    id: 'pw1',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'http', duration: 0.09, src_bytes: 860, dst_bytes: 340, http_method: 'POST', http_uri: '/login', http_status_code: 401, http_user_agent: 'Hydra 9.4' },
    explanation: 'Hydra brute-force on login — POST with credential pairs, 401 unauthorized.',
  },
  {
    id: 'pw2',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'http', duration: 0.11, src_bytes: 920, dst_bytes: 310, http_method: 'POST', http_uri: '/wp-login.php?password=abc123', http_status_code: 401, http_user_agent: 'python-requests/2.29' },
    explanation: 'Scripted WordPress brute-force — password param in URI, rapid attempts.',
  },
  {
    id: 'pw3',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'ftp', duration: 0.14, src_bytes: 200, dst_bytes: 140, http_status_code: undefined },
    explanation: 'FTP credential stuffing — repeated short FTP sessions testing username/password combos.',
  },

  // backdoor
  {
    id: 'bd1',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'http', duration: 0.25, src_bytes: 330, dst_bytes: 2100, http_method: 'GET', http_uri: '/cmd.php?c=whoami', http_status_code: 200, http_user_agent: 'curl/7.68.0' },
    explanation: 'Web shell command execution — cmd.php with OS command in query parameter.',
  },
  {
    id: 'bd2',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'http', duration: 0.3, src_bytes: 410, dst_bytes: 3800, http_method: 'GET', http_uri: '/shell.php?exec=id', http_status_code: 200, http_user_agent: 'curl/7.68.0' },
    explanation: 'Uploaded PHP shell executing id command — typical post-exploitation beacon.',
  },
  {
    id: 'bd3',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'http', duration: 60.0, src_bytes: 512, dst_bytes: 512, http_method: 'GET', http_uri: '/gate.php?heartbeat=1', http_status_code: 200, http_user_agent: 'Go-http-client/1.1' },
    explanation: 'C2 heartbeat — long-duration keep-alive to command-and-control gate endpoint.',
  },

  // ransomware
  {
    id: 'rw1',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'http', duration: 3.5, src_bytes: 98000, dst_bytes: 800, http_method: 'POST', http_uri: '/upload/files.enc', http_status_code: 200, http_user_agent: 'WinHTTP' },
    explanation: 'Encrypted file exfiltration — large POST to .enc endpoint before encryption.',
  },
  {
    id: 'rw2',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'http', duration: 2.1, src_bytes: 65000, dst_bytes: 420, http_method: 'POST', http_uri: '/beacon/payload.locked', http_status_code: 200, http_user_agent: 'WinHTTP' },
    explanation: 'Ransomware C2 — POSTing locked payload bytes to attacker-controlled server.',
  },
  {
    id: 'rw3',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'ssl', duration: 4.0, src_bytes: 120000, dst_bytes: 600, http_method: 'POST', http_uri: '/data/backup.crypt', http_status_code: 200, http_user_agent: 'WinHTTP' },
    explanation: 'TLS-wrapped mass exfil — encrypting and sending data to remote C2 over HTTPS.',
  },

  // mitm
  {
    id: 'mitm1',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'ssl', duration: 0.8, src_bytes: 300, dst_bytes: 150000, http_method: 'GET', http_uri: '/api/auth/token', http_status_code: 200, http_user_agent: 'Mozilla/5.0' },
    explanation: 'Asymmetric TLS response — huge dst_bytes vs tiny src_bytes suggests cert interception.',
  },
  {
    id: 'mitm2',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'ssl', duration: 1.2, src_bytes: 450, dst_bytes: 180000, http_method: 'GET', http_uri: '/session/renew', http_status_code: 200, http_user_agent: 'Mozilla/5.0' },
    explanation: 'Session token intercept — MitM proxy injecting extra data into encrypted stream.',
  },
  {
    id: 'mitm3',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'ssl', duration: 0.5, src_bytes: 220, dst_bytes: 200000, http_method: 'POST', http_uri: '/pay/process', http_status_code: 200, http_user_agent: 'Mozilla/5.0' },
    explanation: 'Payment page MitM — attacker relays and reads unencrypted card data mid-stream.',
  },

  // dos
  {
    id: 'dos1',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'http', duration: 0.01, src_bytes: 200, dst_bytes: 200, http_method: 'GET', http_uri: '/', http_status_code: 200, http_user_agent: 'ApacheBench/2.3' },
    explanation: 'ApacheBench stress test pushed beyond limits — identical rapid GET to root.',
  },
  {
    id: 'dos2',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'http', duration: 0.008, src_bytes: 180, dst_bytes: 180, http_method: 'GET', http_uri: '/heavy-endpoint', http_status_code: 503, http_user_agent: 'LOIC' },
    explanation: 'LOIC DoS tool hammering a heavy endpoint — 503 Service Unavailable returned.',
  },
  {
    id: 'dos3',
    label: 'web_attack',
    features: { proto: 'tcp', service: 'http', duration: 0.012, src_bytes: 150, dst_bytes: 150, http_method: 'GET', http_uri: '/slow', http_status_code: 200, http_user_agent: 'slowhttptest/1.8' },
    explanation: 'Slow HTTP DoS — tool sending partial requests to exhaust server thread pool.',
  },
]

export function randomExample(): Example {
  return examples[Math.floor(Math.random() * examples.length)]
}

export function examplesByClass(label: AttackClass): Example[] {
  return examples.filter(e => e.label === label)
}
