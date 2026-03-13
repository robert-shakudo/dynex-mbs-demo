import React, { useState, useEffect } from 'react'
import { Shield, ExternalLink, Activity } from 'lucide-react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || ''

export default function AuditTrail() {
  const [phoenixUrl, setPhoenixUrl] = useState('https://arize-phoenix.dev.hyperplane.dev')
  const [phoenixActive, setPhoenixActive] = useState(false)

  useEffect(() => {
    axios.get(`${API}/api/audit-traces`).then(r => {
      setPhoenixUrl(r.data.phoenix_url || phoenixUrl)
      setPhoenixActive(r.data.phoenix_active || false)
    }).catch(() => {})
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">AI Governance — Every Call, Logged.</h1>
          <p className="text-sm mt-0.5" style={{ color: '#8A9BAE' }}>OpenTelemetry instrumentation via Arize Phoenix · All LLM calls traced</p>
        </div>
        <a
          href={`${phoenixUrl}/projects`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 rounded text-sm border border-border text-gray-300 hover:border-primary transition-colors"
          style={{ background: '#132035' }}
        >
          <ExternalLink size={13} />
          Open Phoenix
        </a>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Tracing Status', value: phoenixActive ? 'Active' : 'Connected', color: '#22c55e', icon: Activity },
          { label: 'Instrumented', value: 'All LLM Calls', color: '#C8A951', icon: Shield },
          { label: 'Platform', value: 'Arize Phoenix', color: '#8A9BAE', icon: ExternalLink },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-lg border border-border p-4" style={{ background: '#132035' }}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={13} style={{ color }} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
            <p className="text-sm font-medium" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border overflow-hidden" style={{ background: '#132035' }}>
        <div className="px-4 py-2 border-b border-border flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400">Live Trace Dashboard</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400">Streaming</span>
          </div>
        </div>
        <iframe
          src={`${phoenixUrl}/projects`}
          className="w-full border-0"
          style={{ height: '600px', background: '#0D1B2A' }}
          title="Arize Phoenix — AI Audit Trail"
        />
      </div>

      <div className="mt-4 rounded-lg border border-border p-4" style={{ background: '#132035' }}>
        <div className="text-xs font-medium text-gray-400 mb-3">What Corbin Sees Here</div>
        <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
          {[
            'Every LLM call — timestamp, model, latency, token count',
            'Which analyst triggered each call',
            'Full prompt and response for each AI interaction',
            'Failure rates and error patterns',
            'Cost per call, per session, per user',
            'Anomalous calls flagged automatically',
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
