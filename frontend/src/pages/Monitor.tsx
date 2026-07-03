import { useEffect, useMemo, useRef, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import Papa from 'papaparse'
import type jsPDF from 'jspdf'
import { supabase } from '../supabase'
import type { LiveLog } from '../supabase'
import { classify } from '../model'
import { startLogGenerator } from '../logGenerator'

type AttackType =
  | 'SQL Injection'
  | 'XSS'
  | 'Brute Force'
  | 'Path Traversal'
  | 'Command Injection'
  | 'Attack Tools'
  | 'Other'

interface MonitorEntry {
  id: number
  time: string       // HH:MM:SS — tooltip
  isoTime: string    // raw ISO — relative time computation
  minuteKey: string  // HH:MM — timeline bucketing
  ip: string
  method: string
  uri: string
  status: number
  verdict: string    // multi-class label, e.g. 'BENIGN' / 'Web Attack - XSS' / 'SQL Injection'
  confidence: number
  source: 'Rule' | 'Neural network' | 'Hybrid'
  attackType: AttackType | null
}

type Filter = 'all' | 'attacks' | 'benign'
type ConnStatus = 'connecting' | 'live' | 'disconnected'
type ChartRange = 5 | 10 | 30 | 60

const ATTACK_COLORS: Record<AttackType, string> = {
  'SQL Injection':     '#f87171',
  'XSS':              '#fb923c',
  'Brute Force':      '#f472b6',
  'Path Traversal':   '#a78bfa',
  'Command Injection':'#facc15',
  'Attack Tools':     '#60a5fa',
  'Other':            '#94a3b8',
}

const TOOLTIP_STYLE: React.CSSProperties = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#f1f5f9',
  fontSize: '12px',
}

// ── helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour12: false })
}

function formatMinuteKey(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function relativeTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return formatTime(iso)
}

function statusColor(code: number): string {
  if (code >= 500) return 'text-red-400'
  if (code >= 400) return 'text-orange-400'
  if (code >= 300) return 'text-yellow-400'
  return 'text-green-400'
}

function inferSource(firedReasons: string[]): MonitorEntry['source'] {
  const first = firedReasons[0] ?? ''
  if (first.startsWith('Rule match:')) return 'Rule'
  if (first.startsWith('Hybrid:')) return 'Hybrid'
  return 'Neural network'
}

function detectAttackType(uri: string, userAgent: string): AttackType {
  const u = uri.toLowerCase()
  const ua = userAgent.toLowerCase()
  if (ua.includes('sqlmap') || ua.includes('nikto') || ua.includes('nmap') ||
      ua.includes('burpsuite') || ua.includes('hydra') || ua.includes('masscan'))
    return 'Attack Tools'
  if (u.includes('select') || u.includes('union') || u.includes('insert') ||
      u.includes('drop') || u.includes("'--") || u.includes('or 1=1') ||
      u.includes('pg_sleep') || u.includes('waitfor') || u.includes("' or '"))
    return 'SQL Injection'
  if (u.includes('<script') || u.includes('javascript:') || u.includes('onerror=') ||
      u.includes('alert(') || u.includes('<iframe') || u.includes('onload='))
    return 'XSS'
  if (u.includes('../') || u.includes('/etc/') || u.includes('%2e%2e'))
    return 'Path Traversal'
  if (u.includes('cmd=') || u.includes('exec(') || u.includes('system(') ||
      u.includes('whoami') || u.includes('/bin/'))
    return 'Command Injection'
  return 'Other'
}

// A verdict is an attack unless it is explicitly benign. This is more robust than
// checking for "attack" in the string, since rule verdicts like "SQL Injection" or
// "Path Traversal" don't contain that word.
function isAttackVerdict(verdict: string): boolean {
  return verdict.trim().toLowerCase() !== 'benign'
}

// For the donut: prefer the model's class label, then fall back to URI/UA heuristics.
function deriveAttackType(verdict: string, uri: string, userAgent: string): AttackType {
  if (verdict.includes('XSS')) return 'XSS'
  if (verdict.includes('Brute Force')) return 'Brute Force'
  if (verdict.includes('SQL')) return 'SQL Injection'
  return detectAttackType(uri, userAgent)
}

// Colour a verdict badge by its specific type (benign green, else per attack type).
function verdictColor(verdict: string): string {
  if (!isAttackVerdict(verdict)) return '#16a34a'
  if (verdict.includes('XSS')) return ATTACK_COLORS['XSS']
  if (verdict.includes('Brute Force')) return ATTACK_COLORS['Brute Force']
  if (verdict.includes('SQL')) return ATTACK_COLORS['SQL Injection']
  if (verdict.includes('Traversal')) return ATTACK_COLORS['Path Traversal']
  if (verdict.includes('Command') || verdict.includes('Execution')) return ATTACK_COLORS['Command Injection']
  if (verdict.includes('Tool')) return ATTACK_COLORS['Attack Tools']
  return '#ef4444'
}

async function classifyLog(log: LiveLog): Promise<MonitorEntry> {
  const prediction = await classify({
    proto: (log.proto === 'tcp' || log.proto === 'udp' || log.proto === 'icmp'
      ? log.proto : 'tcp') as 'tcp' | 'udp' | 'icmp',
    service: log.service,
    duration: log.duration_ms / 1000,
    src_bytes: log.bytes,
    dst_bytes: 0,
    http_method: log.method,
    http_uri: log.uri,
    http_status_code: log.status_code,
    http_user_agent: log.user_agent,
  })
  const verdict = prediction.predictedClass ?? prediction.top
  return {
    id: log.id,
    time: formatTime(log.created_at),
    isoTime: log.created_at,
    minuteKey: formatMinuteKey(log.created_at),
    ip: log.ip_address,
    method: log.method,
    uri: log.uri,
    status: log.status_code,
    verdict,
    confidence: prediction.confidence,
    source: inferSource(prediction.features_that_fired),
    attackType: isAttackVerdict(verdict)
      ? deriveAttackType(verdict, log.uri, log.user_agent) : null,
  }
}

function exportFilename(ext: string): string {
  return `traffic-monitor-${new Date().toISOString().slice(0, 16).replace(/:/g, '-')}.${ext}`
}

// ── component ─────────────────────────────────────────────────────────────────

export default function Monitor() {
  const [entries, setEntries] = useState<MonitorEntry[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [connStatus, setConnStatus] = useState<ConnStatus>('connecting')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [lastUpdateLabel, setLastUpdateLabel] = useState('')
  const [paused, setPaused] = useState(false)
  const [autoScroll, setAutoScroll] = useState(
    () => localStorage.getItem('monitor-autoscroll') !== 'false',
  )
  const [chartRange, setChartRange] = useState<ChartRange>(10)
  const [loading, setLoading] = useState(true)

  const pausedRef    = useRef(false)
  const tableRef     = useRef<HTMLDivElement>(null)
  const channelRef   = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const stopGenRef   = useRef<(() => void) | null>(null)

  const [generating, setGenerating]     = useState(false)
  const [genInterval, setGenInterval]   = useState<500 | 1000 | 2000>(1000)

  const toggleGenerator = () => {
    if (generating) {
      stopGenRef.current?.()
      stopGenRef.current = null
      setGenerating(false)
    } else {
      stopGenRef.current = startLogGenerator(genInterval)
      setGenerating(true)
    }
  }

  // Restart generator at new interval when speed changes while running
  useEffect(() => {
    if (!generating) return
    stopGenRef.current?.()
    stopGenRef.current = startLogGenerator(genInterval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genInterval])

  // Sync pausedRef so the async realtime handler reads the current value
  useEffect(() => { pausedRef.current = paused }, [paused])

  // Persist auto-scroll preference
  useEffect(() => {
    localStorage.setItem('monitor-autoscroll', String(autoScroll))
  }, [autoScroll])

  // Auto-scroll table to top (newest row) when new entries arrive
  useEffect(() => {
    if (autoScroll && !paused && tableRef.current) {
      tableRef.current.scrollTop = 0
    }
  }, [entries, autoScroll, paused])

  // Update "last update X ago" label every second
  useEffect(() => {
    const id = setInterval(() => {
      if (!lastUpdate) return
      const s = Math.floor((Date.now() - lastUpdate.getTime()) / 1000)
      setLastUpdateLabel(s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`)
    }, 1_000)
    return () => clearInterval(id)
  }, [lastUpdate])

  // Initial load + realtime subscription
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>

    async function init() {
      setLoading(true)
      const { data } = await supabase
        .from('live_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (data && data.length > 0) {
        const classified = await Promise.all((data as LiveLog[]).map(classifyLog))
        setEntries(classified) // newest first
        setLastUpdate(new Date())
      }
      setLoading(false)

      channel = supabase
        .channel('live_logs_monitor')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'live_logs' },
          async (payload) => {
            if (pausedRef.current) return
            const entry = await classifyLog(payload.new as LiveLog)
            setEntries(prev => [entry, ...prev].slice(0, 100))
            setLastUpdate(new Date())
          },
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') setConnStatus('live')
          else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setConnStatus('disconnected')
          else setConnStatus('connecting')
        })

      channelRef.current = channel
    }

    init()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [])

  // ── derived data ─────────────────────────────────────────────────────────────

  const attacks = entries.filter(e => isAttackVerdict(e.verdict))
  const benign  = entries.filter(e => !isAttackVerdict(e.verdict))
  const attackRate = entries.length > 0
    ? ((attacks.length / entries.length) * 100).toFixed(1)
    : '0.0'

  const timelineData = useMemo(() => {
    const now = new Date()
    const buckets: { time: string; attacks: number; benign: number }[] = []
    for (let i = chartRange - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60_000)
      const time = d.toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit', hour12: false,
      })
      buckets.push({ time, attacks: 0, benign: 0 })
    }
    entries.forEach(e => {
      const b = buckets.find(bk => bk.time === e.minuteKey)
      if (b) isAttackVerdict(e.verdict) ? b.attacks++ : b.benign++
    })
    return buckets
  }, [entries, chartRange])

  const attackTypeData = useMemo(() => {
    const counts: Partial<Record<AttackType, number>> = {}
    attacks.forEach(e => {
      if (e.attackType) counts[e.attackType] = (counts[e.attackType] ?? 0) + 1
    })
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value })) as { name: AttackType; value: number }[]
  }, [attacks])

  const topEndpoints = useMemo(() => {
    const counts: Record<string, number> = {}
    attacks.forEach(e => { counts[e.uri] = (counts[e.uri] ?? 0) + 1 })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([uri, count]) => ({ uri, count }))
  }, [attacks])

  const visible = filter === 'attacks' ? attacks
    : filter === 'benign' ? benign
    : entries

  // ── exports ───────────────────────────────────────────────────────────────────

  const handleExportCSV = () => {
    const csv = Papa.unparse(entries.map(e => ({
      timestamp: e.isoTime,
      ip_address: e.ip,
      method: e.method,
      uri: e.uri,
      status_code: e.status,
      verdict: e.verdict,
      confidence: (e.confidence * 100).toFixed(1) + '%',
      source: e.source,
      attack_type: e.attackType ?? '',
    })))
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exportFilename('csv')
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPDF = async () => {
    // Load the PDF libraries on demand so they aren't in the initial Monitor chunk.
    const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ])
    const doc = new JsPDF()
    const ts = new Date().toLocaleString()
    type DocWithTable = jsPDF & { lastAutoTable: { finalY: number } }
    const getY = () => (doc as DocWithTable).lastAutoTable?.finalY ?? 30

    doc.setFontSize(18)
    doc.setTextColor(30, 41, 59)
    doc.text('Traffic Monitor Report', 14, 20)
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text(`Generated: ${ts}`, 14, 27)

    // Stats
    doc.setFontSize(11)
    doc.setTextColor(30, 41, 59)
    doc.text('Summary', 14, 38)
    autoTable(doc, {
      startY: 42,
      head: [['Metric', 'Value']],
      body: [
        ['Total Requests', String(entries.length)],
        ['Attacks Detected', String(attacks.length)],
        ['Benign', String(benign.length)],
        ['Attack Rate', `${attackRate}%`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85] },
      tableWidth: 90,
      styles: { fontSize: 9 },
    })

    // Top endpoints
    const y1 = getY() + 10
    doc.setFontSize(11)
    doc.text('Most Targeted Endpoints', 14, y1)
    autoTable(doc, {
      startY: y1 + 4,
      head: [['#', 'URI', 'Attacks']],
      body: topEndpoints.map(({ uri, count }, i) => [i + 1, uri, count]),
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85] },
      styles: { fontSize: 8 },
      columnStyles: { 1: { cellWidth: 130 } },
    })

    // Full log
    const y2 = getY() + 10
    doc.setFontSize(11)
    doc.text('Traffic Log', 14, y2)
    autoTable(doc, {
      startY: y2 + 4,
      head: [['Time', 'IP', 'Method', 'URI', 'Status', 'Verdict', 'Source']],
      body: entries.map(e => [
        e.time,
        e.ip,
        e.method,
        e.uri.length > 50 ? e.uri.slice(0, 47) + '…' : e.uri,
        e.status,
        e.verdict,
        e.source,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85] },
      styles: { fontSize: 7 },
      didParseCell: (data) => {
        if (data.section === 'body' && isAttackVerdict(String((data.row.raw as string[])[5]))) {
          data.cell.styles.textColor = [239, 68, 68]
        }
      },
    })

    doc.save(exportFilename('pdf'))
  }

  // ── render ────────────────────────────────────────────────────────────────────

  const connBadge = {
    live:         'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    connecting:   'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    disconnected: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  }[connStatus]

  const connDot = {
    live: 'bg-green-500 animate-pulse',
    connecting: 'bg-yellow-400 animate-pulse',
    disconnected: 'bg-red-500',
  }[connStatus]

  const connLabel = {
    live: 'Live',
    connecting: 'Connecting…',
    disconnected: 'Disconnected',
  }[connStatus]

  const tickInterval = chartRange <= 10 ? 0 : chartRange <= 30 ? 4 : 9

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Live Monitor</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time traffic classified as it arrives
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Log generator */}
          <div className="flex items-center rounded-lg border overflow-hidden border-slate-200 dark:border-slate-600">
            <button
              onClick={toggleGenerator}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                generating
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {generating ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Stop Generator
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  Start Generator
                </>
              )}
            </button>
            <select
              value={genInterval}
              onChange={e => setGenInterval(Number(e.target.value) as 500 | 1000 | 2000)}
              className="text-xs border-l border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1.5 focus:outline-none cursor-pointer"
              title="Log generation speed"
            >
              <option value={500}>Fast (0.5s)</option>
              <option value={1000}>Normal (1s)</option>
              <option value={2000}>Slow (2s)</option>
            </select>
          </div>

          {/* Pause / Resume */}
          <button
            onClick={() => setPaused(v => !v)}
            title={paused ? 'Resume live updates' : 'Pause live updates'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              paused
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500'
            }`}
          >
            {paused ? (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Resume
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
                Pause
              </>
            )}
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={entries.length === 0}
            title="Export as CSV"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            CSV
          </button>

          {/* Export PDF */}
          <button
            onClick={handleExportPDF}
            disabled={entries.length === 0}
            title="Export as PDF report"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            PDF
          </button>

          {/* Connection badge */}
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border ${connBadge}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${connDot}`} />
            {connLabel}
            {connStatus === 'live' && lastUpdateLabel && (
              <span className="opacity-60">· {lastUpdateLabel}</span>
            )}
          </span>
        </div>
      </div>

      {/* Paused banner */}
      {paused && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
          Live updates paused — new logs are not being added to the view.
          <button onClick={() => setPaused(false)} className="ml-auto font-semibold underline text-xs">
            Resume
          </button>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Total Requests
          </p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
            {entries.length}
          </p>
        </div>
        <div className="bg-red-900/10 border border-red-900/20 dark:border-red-800/40 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-500 dark:text-red-400 mb-1">
            Attacks Detected
          </p>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400 tabular-nums">
            {attacks.length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Attack Rate
          </p>
          <p className={`text-3xl font-bold tabular-nums ${
            parseFloat(attackRate) > 30 ? 'text-red-500 dark:text-red-400' : 'text-slate-900 dark:text-white'
          }`}>
            {attackRate}%
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="space-y-4">
        {/* Timeline */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Traffic Over Time
            </h2>
            <div className="flex gap-1">
              {([5, 10, 30, 60] as ChartRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => setChartRange(r)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    chartRange === r
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {r}m
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={timelineData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="time"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={tickInterval}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={28}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: '#475569' }} />
              <Legend
                formatter={(value) => (
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>{value}</span>
                )}
              />
              <Line type="monotone" dataKey="attacks" stroke="#f87171" strokeWidth={2} dot={false} name="Attacks" activeDot={{ r: 4, fill: '#f87171' }} />
              <Line type="monotone" dataKey="benign"  stroke="#4ade80" strokeWidth={2} dot={false} name="Benign"  activeDot={{ r: 4, fill: '#4ade80' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Attack Types + Top Endpoints */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Donut */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
              Attack Types
            </h2>
            {attackTypeData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-slate-400 dark:text-slate-500">
                No attacks classified yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie data={attackTypeData} cx="50%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={3} dataKey="value">
                    {attackTypeData.map((entry) => (
                      <Cell key={entry.name} fill={ATTACK_COLORS[entry.name] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top Endpoints */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
              Most Targeted Endpoints
            </h2>
            {topEndpoints.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-slate-400 dark:text-slate-500">
                No attacks classified yet
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {topEndpoints.map(({ uri, count }, i) => (
                  <div key={uri} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 dark:text-slate-500 w-4 shrink-0 tabular-nums">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate" title={uri}>
                          {uri}
                        </span>
                        <span className="text-xs font-semibold text-red-500 dark:text-red-400 shrink-0 tabular-nums">
                          {count}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                        <div
                          className="bg-red-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${(count / topEndpoints[0].count) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter pills + table controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          {([
            ['all', 'All', entries.length],
            ['attacks', 'Attacks', attacks.length],
            ['benign', 'Benign', benign.length],
          ] as [Filter, string, number][]).map(([f, label, count]) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {label} <span className="opacity-60 text-xs ml-0.5">({count})</span>
            </button>
          ))}
        </div>

        {/* Auto-scroll toggle */}
        <button
          onClick={() => setAutoScroll(v => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            autoScroll
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
          }`}
          title={autoScroll ? 'Auto-scroll is on — click to disable' : 'Auto-scroll is off — click to enable'}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
          Auto-scroll {autoScroll ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Live feed table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div ref={tableRef} className="overflow-y-auto" style={{ maxHeight: '600px' }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-700/80 border-b border-slate-200 dark:border-slate-700">
              <tr>
                {['TIME', 'IP', 'METHOD', 'URI', '', 'STATUS', 'VERDICT', 'SOURCE'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                    Loading initial data…
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                    {connStatus === 'connecting'
                      ? 'Connecting to Supabase Realtime…'
                      : connStatus === 'disconnected'
                      ? 'Disconnected — check your network connection.'
                      : 'Waiting for traffic… start the log generator to see entries.'}
                  </td>
                </tr>
              ) : visible.map(e => (
                <tr
                  key={e.id}
                  className={`transition-colors ${
                    isAttackVerdict(e.verdict)
                      ? 'bg-red-900/10 hover:bg-red-900/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                  }`}
                >
                  <td className="px-3 py-2 font-mono text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                    <span title={e.time}>{relativeTime(e.isoTime)}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {e.ip}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {e.method}
                    </span>
                  </td>
                  <td colSpan={2} className="px-3 py-2 max-w-xs">
                    <span className="font-mono text-xs text-slate-700 dark:text-slate-300 block truncate" title={e.uri}>
                      {e.uri}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`font-mono text-xs font-semibold ${statusColor(e.status)}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold font-mono border text-slate-700 dark:text-slate-200"
                      style={{ backgroundColor: `${verdictColor(e.verdict)}1a`, borderColor: `${verdictColor(e.verdict)}59` }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: verdictColor(e.verdict) }} />
                      {e.verdict}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="text-xs text-slate-400 dark:text-slate-500">{e.source}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {entries.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-400 dark:text-slate-500">
            Showing {visible.length} of {entries.length} — last 100 kept in memory
          </div>
        )}
      </div>
    </div>
  )
}
