import type { ConnectionFeatures } from '../types'

interface Props {
  features: ConnectionFeatures
}

const BREAK_ALL_KEYS = new Set(['uri', 'user_agent'])

export default function ConnectionCard({ features }: Props) {
  const rows: [string, string | number | undefined][] = [
    ['proto', features.proto],
    ['service', features.service],
    ['method', features.http_method],
    ['uri', features.http_uri],
    ['status', features.http_status_code],
    ['duration', features.duration !== undefined ? `${features.duration}s` : undefined],
    ['src_bytes', features.src_bytes],
    ['dst_bytes', features.dst_bytes],
    ['user_agent', features.http_user_agent],
  ]

  return (
    <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-200 space-y-1 overflow-hidden">
      {rows
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => (
          <div key={k} className="flex gap-2 min-w-0">
            <span className="text-slate-500 w-24 shrink-0">{k}</span>
            <span className={`text-green-300 min-w-0 ${BREAK_ALL_KEYS.has(k) ? 'break-all' : 'truncate'}`}>
              {String(v)}
            </span>
          </div>
        ))}
    </div>
  )
}
