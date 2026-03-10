import React, { useState } from 'react'
import { Upload, Download, FileText, CheckCircle, Loader } from 'lucide-react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8787'

function fmt(n) {
  if (!n) return '—'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
  return `$${n.toLocaleString()}`
}

function exportCSV(records) {
  if (!records?.length) return
  const headers = Object.keys(records[0]).join(',')
  const rows = records.map(r => Object.values(r).join(',')).join('\n')
  const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'mbs_pool_extraction.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function ExtractionView() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const extract = async (f) => {
    const target = f || file
    if (!target) return
    setLoading(true)
    setResult(null)
    try {
      const form = new FormData()
      form.append('file', target)
      const { data } = await axios.post(`${API}/api/extract-10q`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(data)
    } catch {
      const { data } = await axios.post(`${API}/api/extract-10q`, {})
      setResult(data)
    }
    setLoading(false)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) { setFile(f); extract(f) }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">10-Q Extraction</h1>
          <p className="text-sm mt-0.5" style={{ color: '#8A9BAE' }}>Upload FNMA, FHLMC, or GNMA 10-Q filing · ExtractFlow AI extraction</p>
        </div>
        {result?.records && (
          <button
            onClick={() => exportCSV(result.records)}
            className="flex items-center gap-2 px-3 py-2 rounded text-sm border border-border text-gray-300 hover:border-primary transition-colors"
            style={{ background: '#132035' }}
          >
            <Download size={13} />
            Export Excel
          </button>
        )}
      </div>

      {!result && !loading && (
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          className="rounded-lg border-2 border-dashed p-12 flex flex-col items-center gap-4 text-center cursor-pointer transition-colors"
          style={{
            background: dragOver ? '#0f2030' : '#132035',
            borderColor: dragOver ? '#C8A951' : '#1E3450',
          }}
          onClick={() => document.getElementById('file-input').click()}
        >
          <input id="file-input" type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); extract(f) } }} />
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#1B3A6B' }}>
            <Upload size={20} style={{ color: '#C8A951' }} />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Drop 10-Q PDF here or click to upload</p>
            <p className="text-xs mt-1 text-gray-500">ExtractFlow parses pool-level MBS data · Results in under 2 minutes</p>
          </div>
          <div className="flex gap-6 text-xs text-gray-600 mt-2">
            {['FNMA', 'FHLMC', 'GNMA'].map(i => (
              <span key={i} className="flex items-center gap-1">
                <FileText size={10} />
                {i} 10-Q
              </span>
            ))}
          </div>
          <button
            className="mt-2 px-4 py-1.5 rounded text-xs font-medium text-white"
            style={{ background: '#1B3A6B' }}
            onClick={e => { e.stopPropagation(); extract() }}
          >
            Run Demo Extraction (FNMA Q4 2025)
          </button>
        </div>
      )}

      {loading && (
        <div className="rounded-lg border border-border p-12 flex flex-col items-center gap-3" style={{ background: '#132035' }}>
          <Loader size={24} className="animate-spin" style={{ color: '#C8A951' }} />
          <p className="text-sm text-gray-400">ExtractFlow parsing MBS pool data…</p>
          <p className="text-xs text-gray-600">Extracting coupon, WAC, WAM, face value, prepayment speed</p>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-4">
          <div className="rounded-lg border p-4 flex items-center gap-3" style={{ background: '#0f2e1a', borderColor: '#22c55e' }}>
            <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-green-400 font-medium">Extraction Complete</p>
              <p className="text-xs text-green-600 mt-0.5">
                {result.total_pools} pools · {fmt(result.total_face_value)} total face · {result.source}
              </p>
            </div>
            {result.note && <p className="text-xs text-gray-500 max-w-xs text-right">{result.note}</p>}
          </div>

          <div className="rounded-lg border border-border overflow-hidden" style={{ background: '#132035' }}>
            <div className="px-4 py-2 border-b border-border flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">MBS Pool Data — Structured Output</span>
              <span className="text-xs text-gray-600">{result.records?.length} records</span>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['Pool #', 'Issuer', 'Face Value', 'Coupon', 'WAC', 'WAM', 'CPR', 'Credit Enhancement'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.records?.map((r, i) => (
                    <tr key={i} className="border-b border-border hover:bg-surface">
                      <td className="px-3 py-2 font-mono text-gray-300">{r.Pool_Number}</td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: '#1B3A6B', color: '#C8A951' }}>{r.Issuer}</span>
                      </td>
                      <td className="px-3 py-2 text-white font-medium">{fmt(r.Face_Value)}</td>
                      <td className="px-3 py-2 text-gray-300">{r.Coupon}%</td>
                      <td className="px-3 py-2 text-gray-400">{r.WAC}%</td>
                      <td className="px-3 py-2 text-gray-400">{r.WAM}mo</td>
                      <td className="px-3 py-2 text-gray-300">{r.Prepayment_Speed_CPR} CPR</td>
                      <td className="px-3 py-2 text-gray-500">{r.Credit_Enhancement}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
