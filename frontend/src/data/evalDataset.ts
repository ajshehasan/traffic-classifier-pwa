import type { AttackClass, ConnectionFeatures } from '../types'

/**
 * Held-out, labeled test set used by the Evaluation page to measure real model
 * performance (confusion matrix, precision/recall/F1).
 *
 * Kept separate from `examples.ts` (which feeds the Quiz/Learn pages) so this acts
 * as an independent test set — the model is never tuned against these specific rows.
 * The set is balanced: 40 benign + 40 web_attack = 80 cases.
 */
export interface TestCase {
  id: string
  label: AttackClass
  features: ConnectionFeatures
}

const benign: TestCase[] = [
  { id: 'b01', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.21, src_bytes: 480, dst_bytes: 9100, http_method: 'GET', http_uri: '/home', http_status_code: 200, http_user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0' } },
  { id: 'b02', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.44, src_bytes: 360, dst_bytes: 22400, http_method: 'GET', http_uri: '/api/products', http_status_code: 200, http_user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1' } },
  { id: 'b03', label: 'benign', features: { proto: 'tcp', service: 'ssl', duration: 1.6, src_bytes: 880, dst_bytes: 15800, http_method: 'POST', http_uri: '/api/checkout', http_status_code: 201, http_user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4) Safari/604.1' } },
  { id: 'b04', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.09, src_bytes: 290, dst_bytes: 1450, http_method: 'GET', http_uri: '/favicon.ico', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Chrome/124.0' } },
  { id: 'b05', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.13, src_bytes: 310, dst_bytes: 5600, http_method: 'GET', http_uri: '/static/main.js', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Firefox/125.0' } },
  { id: 'b06', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.11, src_bytes: 305, dst_bytes: 4800, http_method: 'GET', http_uri: '/static/styles.css', http_status_code: 304, http_user_agent: 'Mozilla/5.0 Chrome/124.0' } },
  { id: 'b07', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.52, src_bytes: 620, dst_bytes: 12800, http_method: 'GET', http_uri: '/dashboard', http_status_code: 200, http_user_agent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/124.0' } },
  { id: 'b08', label: 'benign', features: { proto: 'tcp', service: 'ssl', duration: 0.78, src_bytes: 540, dst_bytes: 9300, http_method: 'GET', http_uri: '/api/users/profile', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Safari/605.1' } },
  { id: 'b09', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.34, src_bytes: 420, dst_bytes: 7600, http_method: 'GET', http_uri: '/api/orders/history', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Chrome/124.0' } },
  { id: 'b10', label: 'benign', features: { proto: 'tcp', service: 'ssl', duration: 0.9, src_bytes: 700, dst_bytes: 11200, http_method: 'POST', http_uri: '/api/login', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Firefox/125.0' } },
  { id: 'b11', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.28, src_bytes: 360, dst_bytes: 6100, http_method: 'GET', http_uri: '/api/search?q=shoes', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Chrome/124.0' } },
  { id: 'b12', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.41, src_bytes: 390, dst_bytes: 8400, http_method: 'GET', http_uri: '/api/search?q=laptop', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Safari/605.1' } },
  { id: 'b13', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.06, src_bytes: 280, dst_bytes: 920, http_method: 'HEAD', http_uri: '/health', http_status_code: 200, http_user_agent: 'kube-probe/1.28' } },
  { id: 'b14', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.07, src_bytes: 300, dst_bytes: 1100, http_method: 'GET', http_uri: '/metrics', http_status_code: 200, http_user_agent: 'Prometheus/2.49' } },
  { id: 'b15', label: 'benign', features: { proto: 'tcp', service: 'ssl', duration: 1.3, src_bytes: 950, dst_bytes: 18600, http_method: 'POST', http_uri: '/api/cart', http_status_code: 201, http_user_agent: 'Mozilla/5.0 Chrome/124.0' } },
  { id: 'b16', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.19, src_bytes: 340, dst_bytes: 5200, http_method: 'GET', http_uri: '/about', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Safari/605.1' } },
  { id: 'b17', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.23, src_bytes: 350, dst_bytes: 6800, http_method: 'GET', http_uri: '/contact', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Firefox/125.0' } },
  { id: 'b18', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.16, src_bytes: 330, dst_bytes: 4300, http_method: 'GET', http_uri: '/images/logo.png', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Chrome/124.0' } },
  { id: 'b19', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.18, src_bytes: 335, dst_bytes: 38000, http_method: 'GET', http_uri: '/images/banner.jpg', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Safari/605.1' } },
  { id: 'b20', label: 'benign', features: { proto: 'tcp', service: 'ssl', duration: 0.66, src_bytes: 510, dst_bytes: 8900, http_method: 'GET', http_uri: '/api/notifications', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Chrome/124.0' } },
  { id: 'b21', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.39, src_bytes: 400, dst_bytes: 7100, http_method: 'GET', http_uri: '/api/settings', http_status_code: 200, http_user_agent: 'axios/1.6.0' } },
  { id: 'b22', label: 'benign', features: { proto: 'tcp', service: 'ssl', duration: 0.85, src_bytes: 720, dst_bytes: 10400, http_method: 'PUT', http_uri: '/api/users/preferences', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Chrome/124.0' } },
  { id: 'b23', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.05, src_bytes: 270, dst_bytes: 0, http_method: 'OPTIONS', http_uri: '/api/cors', http_status_code: 204, http_user_agent: 'Mozilla/5.0 Firefox/125.0' } },
  { id: 'b24', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.31, src_bytes: 380, dst_bytes: 6400, http_method: 'GET', http_uri: '/api/v2/feed', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Chrome/124.0' } },
  { id: 'b25', label: 'benign', features: { proto: 'tcp', service: 'ssl', duration: 1.05, src_bytes: 820, dst_bytes: 13500, http_method: 'POST', http_uri: '/api/register', http_status_code: 201, http_user_agent: 'Mozilla/5.0 Safari/605.1' } },
  { id: 'b26', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.27, src_bytes: 355, dst_bytes: 5900, http_method: 'GET', http_uri: '/api/products/list', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Chrome/124.0' } },
  { id: 'b27', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.48, src_bytes: 430, dst_bytes: 9700, http_method: 'GET', http_uri: '/api/products/search', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Firefox/125.0' } },
  { id: 'b28', label: 'benign', features: { proto: 'tcp', service: 'ssl', duration: 0.72, src_bytes: 560, dst_bytes: 8200, http_method: 'POST', http_uri: '/api/auth/refresh', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Chrome/124.0' } },
  { id: 'b29', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.14, src_bytes: 320, dst_bytes: 3100, http_method: 'GET', http_uri: '/robots.txt', http_status_code: 200, http_user_agent: 'Googlebot/2.1' } },
  { id: 'b30', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.62, src_bytes: 470, dst_bytes: 10100, http_method: 'GET', http_uri: '/api/users', http_status_code: 200, http_user_agent: 'python-requests/2.31.0' } },
  { id: 'b31', label: 'benign', features: { proto: 'tcp', service: 'ssl', duration: 0.95, src_bytes: 690, dst_bytes: 12200, http_method: 'GET', http_uri: '/api/orders', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Chrome/124.0' } },
  { id: 'b32', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.37, src_bytes: 395, dst_bytes: 7300, http_method: 'GET', http_uri: '/api/logout', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Safari/605.1' } },
  { id: 'b33', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.24, src_bytes: 345, dst_bytes: 5500, http_method: 'GET', http_uri: '/api/v2/users', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Chrome/124.0' } },
  { id: 'b34', label: 'benign', features: { proto: 'tcp', service: 'ssl', duration: 1.15, src_bytes: 900, dst_bytes: 16800, http_method: 'POST', http_uri: '/api/orders', http_status_code: 201, http_user_agent: 'Mozilla/5.0 Firefox/125.0' } },
  { id: 'b35', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.46, src_bytes: 410, dst_bytes: 8800, http_method: 'GET', http_uri: '/api/users/preferences', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Chrome/124.0' } },
  { id: 'b36', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.08, src_bytes: 285, dst_bytes: 1300, http_method: 'GET', http_uri: '/login', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Safari/605.1' } },
  { id: 'b37', label: 'benign', features: { proto: 'tcp', service: 'ssl', duration: 0.58, src_bytes: 500, dst_bytes: 8600, http_method: 'GET', http_uri: '/api/feed', http_status_code: 200, http_user_agent: 'Go-http-client/2.0' } },
  { id: 'b38', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.33, src_bytes: 385, dst_bytes: 6900, http_method: 'GET', http_uri: '/api/metrics/summary', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Chrome/124.0' } },
  { id: 'b39', label: 'benign', features: { proto: 'tcp', service: 'ssl', duration: 1.42, src_bytes: 1020, dst_bytes: 19500, http_method: 'POST', http_uri: '/api/upload/avatar', http_status_code: 201, http_user_agent: 'Mozilla/5.0 Chrome/124.0' } },
  { id: 'b40', label: 'benign', features: { proto: 'tcp', service: 'http', duration: 0.29, src_bytes: 370, dst_bytes: 6200, http_method: 'GET', http_uri: '/api/products/123', http_status_code: 200, http_user_agent: 'Mozilla/5.0 Firefox/125.0' } },
]

const attack: TestCase[] = [
  // SQL injection
  { id: 'a01', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 4.8, src_bytes: 410, dst_bytes: 0, http_method: 'GET', http_uri: "/products?id=1 AND pg_sleep(5)--", http_status_code: 200, http_user_agent: 'Mozilla/5.0' } },
  { id: 'a02', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.22, src_bytes: 390, dst_bytes: 4300, http_method: 'GET', http_uri: "/search?q=' UNION SELECT username,password FROM users--", http_status_code: 200, http_user_agent: 'python-requests/2.28' } },
  { id: 'a03', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.3, src_bytes: 420, dst_bytes: 800, http_method: 'POST', http_uri: '/api/login', http_status_code: 200, http_user_agent: 'sqlmap/1.7.8#stable' } },
  { id: 'a04', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.18, src_bytes: 370, dst_bytes: 1200, http_method: 'GET', http_uri: "/users?name=' OR 1=1--", http_status_code: 200, http_user_agent: 'Mozilla/5.0' } },
  { id: 'a05', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.25, src_bytes: 400, dst_bytes: 600, http_method: 'GET', http_uri: "/api/items?q='; DROP TABLE users;--", http_status_code: 500, http_user_agent: 'Mozilla/5.0' } },
  { id: 'a06', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.2, src_bytes: 360, dst_bytes: 700, http_method: 'GET', http_uri: '/news?id=5 UNION SELECT credit_card FROM payments', http_status_code: 200, http_user_agent: 'Mozilla/5.0' } },
  // XSS
  { id: 'a07', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.14, src_bytes: 320, dst_bytes: 1700, http_method: 'GET', http_uri: '/search?q=<script>alert(1)</script>', http_status_code: 200, http_user_agent: 'Mozilla/5.0' } },
  { id: 'a08', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.16, src_bytes: 340, dst_bytes: 900, http_method: 'GET', http_uri: '/profile?name=<img src=x onerror=alert(document.cookie)>', http_status_code: 200, http_user_agent: 'Mozilla/5.0' } },
  { id: 'a09', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.12, src_bytes: 330, dst_bytes: 750, http_method: 'GET', http_uri: '/feedback?msg=<svg onload=alert(1)>', http_status_code: 200, http_user_agent: 'Mozilla/5.0' } },
  { id: 'a10', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.13, src_bytes: 360, dst_bytes: 620, http_method: 'GET', http_uri: '/comment?text=%3Cscript%3Edocument.cookie%3C%2Fscript%3E', http_status_code: 200, http_user_agent: 'Mozilla/5.0' } },
  // Path traversal
  { id: 'a11', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.08, src_bytes: 290, dst_bytes: 1200, http_method: 'GET', http_uri: '/download?file=../../../../etc/passwd', http_status_code: 200, http_user_agent: 'curl/7.85.0' } },
  { id: 'a12', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.09, src_bytes: 300, dst_bytes: 1100, http_method: 'GET', http_uri: '/files?path=../../etc/shadow', http_status_code: 403, http_user_agent: 'Mozilla/5.0' } },
  { id: 'a13', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.07, src_bytes: 285, dst_bytes: 900, http_method: 'GET', http_uri: '/api/file?name=../../../etc/hosts', http_status_code: 404, http_user_agent: 'Mozilla/5.0' } },
  { id: 'a14', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.1, src_bytes: 310, dst_bytes: 1000, http_method: 'GET', http_uri: '/static?f=%2e%2e%2f%2e%2e%2fetc%2fpasswd', http_status_code: 200, http_user_agent: 'Mozilla/5.0' } },
  // Web shell / RCE
  { id: 'a15', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.26, src_bytes: 330, dst_bytes: 2100, http_method: 'GET', http_uri: '/cmd.php?c=whoami', http_status_code: 200, http_user_agent: 'curl/7.68.0' } },
  { id: 'a16', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.31, src_bytes: 410, dst_bytes: 3800, http_method: 'POST', http_uri: '/uploads/shell.php?cmd=id', http_status_code: 200, http_user_agent: 'curl/7.81.0' } },
  { id: 'a17', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.28, src_bytes: 380, dst_bytes: 2600, http_method: 'GET', http_uri: '/api/exec?cmd=ls -la /etc', http_status_code: 200, http_user_agent: 'Mozilla/5.0' } },
  // Scanners
  { id: 'a18', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.02, src_bytes: 140, dst_bytes: 200, http_method: 'GET', http_uri: '/admin', http_status_code: 404, http_user_agent: 'Nikto/2.1.6' } },
  { id: 'a19', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.018, src_bytes: 150, dst_bytes: 180, http_method: 'GET', http_uri: '/phpmyadmin', http_status_code: 404, http_user_agent: 'Nikto/2.1.6' } },
  { id: 'a20', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.015, src_bytes: 145, dst_bytes: 175, http_method: 'GET', http_uri: '/.env', http_status_code: 404, http_user_agent: 'python-httpx/0.27.0' } },
  { id: 'a21', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.021, src_bytes: 148, dst_bytes: 190, http_method: 'GET', http_uri: '/wp-admin/admin-ajax.php', http_status_code: 404, http_user_agent: 'Nikto/2.1.6' } },
  { id: 'a22', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.019, src_bytes: 152, dst_bytes: 185, http_method: 'GET', http_uri: '/config.bak', http_status_code: 404, http_user_agent: 'masscan/1.3' } },
  // Brute force / credential stuffing
  { id: 'a23', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.09, src_bytes: 860, dst_bytes: 340, http_method: 'POST', http_uri: '/login', http_status_code: 401, http_user_agent: 'Hydra 9.4' } },
  { id: 'a24', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.11, src_bytes: 920, dst_bytes: 310, http_method: 'POST', http_uri: '/wp-login.php', http_status_code: 401, http_user_agent: 'python-requests/2.29' } },
  { id: 'a25', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.1, src_bytes: 880, dst_bytes: 320, http_method: 'POST', http_uri: '/login', http_status_code: 401, http_user_agent: 'Mozilla/5.0' } },
  { id: 'a26', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.12, src_bytes: 900, dst_bytes: 330, http_method: 'POST', http_uri: '/api/admin', http_status_code: 401, http_user_agent: 'Hydra/9.5' } },
  // Backdoor / C2
  { id: 'a27', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 60.0, src_bytes: 512, dst_bytes: 512, http_method: 'GET', http_uri: '/gate.php?heartbeat=1', http_status_code: 200, http_user_agent: 'Go-http-client/1.1' } },
  { id: 'a28', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 45.0, src_bytes: 480, dst_bytes: 480, http_method: 'POST', http_uri: '/beacon/checkin', http_status_code: 200, http_user_agent: 'Go-http-client/1.1' } },
  // Ransomware exfil
  { id: 'a29', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 3.5, src_bytes: 98000, dst_bytes: 800, http_method: 'POST', http_uri: '/upload/files.enc', http_status_code: 200, http_user_agent: 'WinHTTP' } },
  { id: 'a30', label: 'web_attack', features: { proto: 'tcp', service: 'ssl', duration: 4.0, src_bytes: 120000, dst_bytes: 600, http_method: 'POST', http_uri: '/data/backup.crypt', http_status_code: 200, http_user_agent: 'WinHTTP' } },
  // MitM (asymmetric TLS)
  { id: 'a31', label: 'web_attack', features: { proto: 'tcp', service: 'ssl', duration: 0.8, src_bytes: 300, dst_bytes: 150000, http_method: 'GET', http_uri: '/api/auth/token', http_status_code: 200, http_user_agent: 'Mozilla/5.0' } },
  { id: 'a32', label: 'web_attack', features: { proto: 'tcp', service: 'ssl', duration: 0.5, src_bytes: 220, dst_bytes: 200000, http_method: 'POST', http_uri: '/pay/process', http_status_code: 200, http_user_agent: 'Mozilla/5.0' } },
  // DoS / flood
  { id: 'a33', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.008, src_bytes: 180, dst_bytes: 180, http_method: 'GET', http_uri: '/heavy-endpoint', http_status_code: 503, http_user_agent: 'LOIC' } },
  { id: 'a34', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.012, src_bytes: 150, dst_bytes: 150, http_method: 'GET', http_uri: '/slow', http_status_code: 200, http_user_agent: 'slowhttptest/1.8' } },
  { id: 'a35', label: 'web_attack', features: { proto: 'udp', service: '-', duration: 0.005, src_bytes: 64, dst_bytes: 0, http_status_code: undefined } },
  { id: 'a36', label: 'web_attack', features: { proto: 'icmp', service: '-', duration: 0.003, src_bytes: 84, dst_bytes: 84, http_status_code: undefined } },
  { id: 'a37', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.01, src_bytes: 200, dst_bytes: 200, http_method: 'GET', http_uri: '/', http_status_code: 200, http_user_agent: 'ApacheBench/2.3' } },
  // Encoded SQLi (subtle signal)
  { id: 'a38', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 0.2, src_bytes: 350, dst_bytes: 700, http_method: 'GET', http_uri: '/item?id=%27%20OR%20%271%27%3D%271', http_status_code: 200, http_user_agent: 'Mozilla/5.0' } },
  // Time-based blind SQLi
  { id: 'a39', label: 'web_attack', features: { proto: 'tcp', service: 'http', duration: 5.1, src_bytes: 420, dst_bytes: 0, http_method: 'GET', http_uri: "/?id=3');WAITFOR DELAY '0:0:5'--", http_status_code: 200, http_user_agent: 'Mozilla/5.0' } },
  // FTP brute force
  { id: 'a40', label: 'web_attack', features: { proto: 'tcp', service: 'ftp', duration: 0.14, src_bytes: 200, dst_bytes: 140, http_status_code: undefined } },
]

export const evalDataset: TestCase[] = [...benign, ...attack]
