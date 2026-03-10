import React, { useState, useEffect } from 'react'
import { Send, TrendingDown, AlertTriangle, FileText, BarChart3 } from 'lucide-react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8787'

const EXAMPLE_QUERIES = [
  'Which positions are most exposed to duration extension risk this week?',
  'How does the Fed hold affect our FNMA 30Y allocation?',
  'Which pools have the highest OAS and is that sufficient compensation?',
  'What is our total mark-to-market risk if rates rise 50bps?',
]

function fmt(n) {
  if (!n) return '$0'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${n < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${n < 0 ? '-' : ''}$${(abs / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

function ScoreBar({ score }) {
  const color = score > 70 ? '#ef4444' : score > 40 ? '#f59e0b' : '#22c55e'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-mono w-8 text-right" style={{ color }}>{score}</span>
    </div>
  )
}

export default function PortfolioIntelligence({ onBriefingGenerated }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [portfolio, setPortfolio] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    axios.get(`${API}/api/portfolio`).then(r => setPortfolio(r.data.positions || [])).catch(() => {})
  }, [])

  const analyze = async (q) => {
    const queryText = q || query
    if (!queryText.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const { data } = await axios.post(`${API}/api/analyze-exposure`, { query: queryText })
      setResult(data)
    } catch {
      setResult({ error: true, summary: 'Unable to connect to backend. Check API service.' })
    }
    setLoading(false)
  }

  const generateBriefing = async () => {
    setBriefingLoading(true)
    try {
      const { data } = await axios.post(`${API}/api/generate-briefing`, {})
      onBriefingGenerated(data)
      navigate('/briefing')
    } catch {
      setBriefingLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Portfolio Intelligence</h1>
          <p className="text-sm mt-0.5" style={{ color: '#8A9BAE' }}>
            {portfolio.length} positions · Q1 2026 · Ask in plain English
          </p>
        </div>
        <button
          onClick={generateBriefing}
          disabled={briefingLoading}
          className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: '#1B3A6B', border: '1px solid #C8A951' }}
        >
          <FileText size={14} style={{ color: '#C8A951' }} />
          {briefingLoading ? 'Generating…' : 'Generate Full Briefing'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="rounded-lg p-4 border border-border" style={{ background: '#132035' }}>
            <div className="flex gap-2">
              <textarea
                className="flex-1 bg-transparent text-white text-sm resize-none outline-none placeholder-gray-500"
                rows={3}
                placeholder="Which of our positions are most exposed to duration extension risk given this week's Fed tone?"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); analyze() } }}
              />
              <button
                onClick={() => analyze()}
                disabled={loading || !query.trim()}
                className="self-end p-2 rounded transition-colors hover:opacity-90"
                style={{ background: '#1B3A6B' }}
              >
                <Send size={14} className="text-white" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            {EXAMPLE_QUERIES.map((q, i) => (
              <button
                key={i}
                onClick={() => { setQuery(q); analyze(q) }}
                className="w-full text-left text-xs px-3 py-2 rounded border border-border hover:border-primary transition-colors"
                style={{ background: '#0A1520', color: '#8A9BAE' }}
              >
                {q}
              </button>
            ))}
          </div>

          {portfolio.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden" style={{ background: '#132035' }}>
              <div className="px-4 py-2 border-b border-border text-xs font-medium text-gray-400">Portfolio Positions</div>
              <div className="overflow-auto max-h-64">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {['CUSIP', 'Type', 'Face Value', 'Coupon', 'Duration', 'OAS'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map((p, i) => (
                      <tr key={i} className="border-b border-border hover:bg-surface">
                        <td className="px-3 py-1.5 font-mono text-gray-300">{p.CUSIP}</td>
                        <td className="px-3 py-1.5 text-gray-400">{p.Pool_Type}</td>
                        <td className="px-3 py-1.5 text-white">${(parseFloat(p.Face_Value)/1e6).toFixed(1)}M</td>
                        <td className="px-3 py-1.5 text-gray-300">{p.Coupon}%</td>
                        <td className="px-3 py-1.5 text-gray-300">{p.Duration}yr</td>
                        <td className="px-3 py-1.5 text-gray-400">{p.OAS}bps</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div>
          {loading && (
            <div className="rounded-lg border border-border p-8 flex flex-col items-center justify-center gap-3" style={{ background: '#132035' }}>
              <div className="w-8 h-8 border-2 border-primary border-t-accent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Analyzing portfolio against market commentary…</p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              {result.error ? (
                <div className="rounded-lg border border-red-800 p-4 text-sm text-red-400" style={{ background: '#1a0808' }}>
                  {result.summary}
                </div>
              ) : (
                <>
                  <div className="rounded-lg border p-4" style={{ background: '#132035', borderColor: '#C8A951' }}>
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle size={14} style={{ color: '#C8A951' }} className="mt-0.5 flex-shrink-0" />
                      <div className="text-xs font-medium" style={{ color: '#C8A951' }}>Key Theme</div>
                    </div>
                    <p className="text-sm text-white">{result.key_theme}</p>
                    <p className="text-xs mt-2 text-gray-400">{result.summary?.substring(0, 200)}</p>
                    {result.total_at_risk > 0 && (
                      <div className="mt-3 flex items-center gap-2">
                        <TrendingDown size={13} className="text-red-400" />
                        <span className="text-sm font-medium text-red-400">
                          Est. at risk: {fmt(-result.total_at_risk)}
                        </span>
                      </div>
                    )}
                  </div>

                  {result.ranked_positions?.length > 0 && (
                    <div className="rounded-lg border border-border overflow-hidden" style={{ background: '#132035' }}>
                      <div className="px-4 py-2 border-b border-border text-xs font-medium text-gray-400">
                        Ranked Positions — Exposure Analysis
                      </div>
                      <div className="divide-y divide-border">
                        {result.ranked_positions.map((p, i) => (
                          <div key={i} className="px-4 py-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 w-4">{i + 1}</span>
                                <span className="text-sm font-mono font-medium text-white">{p.cusip}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#1B3A6B', color: '#C8A951' }}>{p.pool_type}</span>
                              </div>
                              <span className="text-sm font-medium text-red-400">{fmt(p.impact_estimate)}</span>
                            </div>
                            <ScoreBar score={p.exposure_score} />
                            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{p.reasoning}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {!result && !loading && (
            <div className="rounded-lg border border-border p-8 flex flex-col items-center justify-center gap-2 text-center" style={{ background: '#132035' }}>
              <BarChart3 size={24} style={{ color: '#1B3A6B' }} />
              <p className="text-sm font-medium text-white">Portfolio Intelligence</p>
              <p className="text-xs text-gray-500 max-w-xs">Ask any question about your MBS portfolio. Results cross-referenced against market commentary and current Fed positioning.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
