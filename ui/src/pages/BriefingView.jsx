import React, { useState } from 'react'
import { CheckCircle, Clock, Send, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8787'

const URGENCY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }
const RISK_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }

export default function BriefingView({ briefing }) {
  const [approvalStatus, setApprovalStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [polling, setPolling] = useState(false)

  const submitApproval = async () => {
    if (!briefing?.briefing_id) return
    setSubmitting(true)
    try {
      await axios.post(`${API}/api/approve-briefing`, {
        briefing_id: briefing.briefing_id,
        approved: true,
        comments: 'Submitted for CFO review',
      })
      setApprovalStatus('submitted')
      pollStatus(briefing.briefing_id)
    } catch {
      setSubmitting(false)
    }
  }

  const pollStatus = (id) => {
    setPolling(true)
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const { data } = await axios.get(`${API}/api/briefing/${id}/status`)
        if (data.status === 'approved' || data.status === 'rejected') {
          setApprovalStatus(data.status)
          clearInterval(interval)
          setPolling(false)
        }
      } catch {}
      if (attempts > 20) { clearInterval(interval); setPolling(false) }
    }, 5000)
  }

  if (!briefing) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold text-white mb-6">Briefing View</h1>
        <div className="rounded-lg border border-border p-12 flex flex-col items-center gap-3 text-center" style={{ background: '#132035' }}>
          <Clock size={24} style={{ color: '#1B3A6B' }} />
          <p className="text-sm font-medium text-white">No briefing generated yet</p>
          <p className="text-xs text-gray-500">Go to Portfolio Intelligence and click "Generate Full Briefing"</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Daily Market Briefing</h1>
          <p className="text-sm mt-0.5" style={{ color: '#8A9BAE' }}>
            ID: {briefing.briefing_id} · {new Date(briefing.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {briefing.risk_level && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border" style={{
              color: RISK_COLORS[briefing.risk_level],
              borderColor: RISK_COLORS[briefing.risk_level],
              background: `${RISK_COLORS[briefing.risk_level]}15`,
            }}>
              {briefing.risk_level === 'high' ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
              {briefing.risk_level?.toUpperCase()} RISK
            </div>
          )}
          {approvalStatus === 'submitted' ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded text-sm" style={{ background: '#132035', border: '1px solid #1B3A6B', color: '#8A9BAE' }}>
              {polling ? <div className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin" /> : <Clock size={13} />}
              {polling ? 'Awaiting CFO…' : 'Submitted to CFO'}
            </div>
          ) : approvalStatus === 'approved' ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded text-sm" style={{ background: '#0f2e1a', border: '1px solid #22c55e', color: '#22c55e' }}>
              <CheckCircle size={13} />
              CFO Approved
            </div>
          ) : (
            <button
              onClick={submitApproval}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium text-white hover:opacity-90 transition-opacity"
              style={{ background: '#1B3A6B', border: '1px solid #C8A951' }}
            >
              <Send size={13} style={{ color: '#C8A951' }} />
              {submitting ? 'Submitting…' : 'Submit for CFO Approval'}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {briefing.executive_summary && (
          <div className="rounded-lg border p-4" style={{ background: '#132035', borderColor: '#1B3A6B' }}>
            <div className="text-xs font-medium mb-2" style={{ color: '#C8A951' }}>Executive Summary</div>
            <p className="text-sm text-white leading-relaxed">{briefing.executive_summary}</p>
          </div>
        )}

        {briefing.themes?.length > 0 && (
          <div className="rounded-lg border border-border p-4" style={{ background: '#132035' }}>
            <div className="text-xs font-medium text-gray-400 mb-3">Key Market Themes</div>
            <div className="space-y-2">
              {briefing.themes.map((t, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-mono" style={{ background: '#1B3A6B', color: '#C8A951' }}>{i + 1}</div>
                  <p className="text-sm text-gray-200">{t}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {briefing.impact_summary && (
            <div className="rounded-lg border border-border p-4" style={{ background: '#132035' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle size={13} style={{ color: '#f59e0b' }} />
                <div className="text-xs font-medium text-gray-400">Portfolio Impact</div>
              </div>
              <p className="text-sm text-gray-200 leading-relaxed">{briefing.impact_summary}</p>
            </div>
          )}

          {briefing.positions_affected?.length > 0 && (
            <div className="rounded-lg border border-border p-4" style={{ background: '#132035' }}>
              <div className="text-xs font-medium text-gray-400 mb-3">Positions Affected</div>
              <div className="flex flex-wrap gap-1.5">
                {briefing.positions_affected.map((c, i) => (
                  <span key={i} className="px-2 py-1 rounded text-xs font-mono" style={{ background: '#1B3A6B', color: '#F0F4F8' }}>{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {briefing.recommended_actions?.length > 0 && (
          <div className="rounded-lg border border-border overflow-hidden" style={{ background: '#132035' }}>
            <div className="px-4 py-2 border-b border-border text-xs font-medium text-gray-400">Recommended Actions</div>
            <div className="divide-y divide-border">
              {briefing.recommended_actions.map((a, i) => (
                <div key={i} className="px-4 py-3 flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-xs font-medium border" style={{
                    color: URGENCY_COLORS[a.urgency],
                    borderColor: URGENCY_COLORS[a.urgency],
                    background: `${URGENCY_COLORS[a.urgency]}15`,
                  }}>
                    {a.urgency?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{a.action}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{a.rationale}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
