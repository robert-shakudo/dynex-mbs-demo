import React, { useState, useEffect } from 'react'
import { Shield, ExternalLink, Activity, Clock, Cpu, AlertCircle, CheckCircle } from 'lucide-react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || ''

const ACTION_LABELS = {
  analyze_exposure: 'Portfolio Analysis',
  generate_briefing: 'Briefing Generation',
  extract_10q: '10-Q Extraction',
  llm_call: 'LLM Call',
}

function StatusBadge({ status }) {
  return status === 'success'
    ? <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle size={10} />ok</span>
    : <span className="flex items-center gap-1 text-red-400 text-xs"><AlertCircle size={10} />err</span>
}

export default function AuditTrail() {
  const [log, setLog] = useState([])
  const [stats, setStats] = useState(null)
  const [langfuseUrl] = useState('https://langfuse.dev.hyperplane.dev')
  const [loading, setLoading] = useState(true)

  const fetchLog = () => {
    axios.get(`${API}/api/audit-log`).then(r => {
      setLog(r.data.entries || [])
      setStats(r.data.stats || null)
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchLog()
    const interval = setInterval(fetchLog, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">AI Governance — Every Call, Logged.</h1>
          <p className="text-sm mt-0.5" style={{ color: '#8A9BAE' }}>
            In-app audit log · All LLM calls captured with latency and token counts
          </p>
        </div>
        <a
          href={langfuseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded text-sm border border-border text-gray-300 hover:border-primary transition-colors"
          style={{ background: '#132035' }}
        >
          <ExternalLink size={13} />
          Langfuse Dashboard
        </a>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total LLM Calls', value: stats.total_calls, color: '#C8A951', icon: Activity },
            { label: 'Avg Latency', value: `${stats.avg_latency_ms}ms`, color: '#22c55e', icon: Clock },
            { label: 'Total Tokens', value: stats.total_tokens.toLocaleString(), color: '#8A9BAE', icon: Cpu },
            { label: 'Error Rate', value: stats.total_calls > 0 ? `${Math.round((stats.errors / stats.total_calls) * 100)}%` : '0%', color: stats.errors > 0 ? '#ef4444' : '#22c55e', icon: Shield },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="rounded-lg border border-border p-4" style={{ background: '#132035' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <Icon size={12} style={{ color }} />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
              <p className="text-lg font-semibold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden" style={{ background: '#132035' }}>
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400">LLM Call History</span>
          <div className="flex items-center gap-3">
            {stats && <span className="text-xs text-gray-600">Models: {stats.models_used?.join(', ')}</span>}
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400">Live</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading audit log…</div>
        ) : log.length === 0 ? (
          <div className="p-8 text-center">
            <Activity size={20} className="mx-auto mb-2 text-gray-600" />
            <p className="text-sm text-gray-500">No LLM calls yet. Use Portfolio Intelligence or generate a briefing to see calls here.</p>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {['Time', 'Action', 'Model', 'Latency', 'Tokens', 'Status'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {log.map((entry, i) => (
                  <tr key={entry.id || i} className="border-b border-border hover:bg-surface">
                    <td className="px-3 py-2 font-mono text-gray-500 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#1B3A6B', color: '#C8A951' }}>
                        {ACTION_LABELS[entry.action] || entry.action}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-400">{entry.model}</td>
                    <td className="px-3 py-2 font-mono">
                      <span className={entry.latency_ms > 5000 ? 'text-yellow-400' : 'text-gray-300'}>{entry.latency_ms}ms</span>
                    </td>
                    <td className="px-3 py-2 text-gray-400 font-mono">
                      {entry.total_tokens > 0 ? entry.total_tokens.toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={entry.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-border p-4" style={{ background: '#132035' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-medium text-gray-400">Full Observability via Langfuse</div>
          <a href={langfuseUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
            <ExternalLink size={10} />{langfuseUrl}
          </a>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
          {[
            'Full prompt + response for every call',
            'User-level usage tracking and cost breakdown',
            'Latency percentiles and regression alerts',
            'Evaluation scores and quality metrics',
            'Session traces across multi-turn conversations',
            'Export to CSV for compliance reporting',
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#C8A951' }} />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
