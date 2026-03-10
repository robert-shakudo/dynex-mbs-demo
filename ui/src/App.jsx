import React, { useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { BarChart3, FileText, Shield, Upload } from 'lucide-react'
import PortfolioIntelligence from './pages/PortfolioIntelligence'
import BriefingView from './pages/BriefingView'
import ExtractionView from './pages/ExtractionView'
import AuditTrail from './pages/AuditTrail'

const NAV = [
  { to: '/', icon: BarChart3, label: 'Portfolio Intelligence' },
  { to: '/briefing', icon: FileText, label: 'Briefing View' },
  { to: '/extraction', icon: Upload, label: '10-Q Extraction' },
  { to: '/audit', icon: Shield, label: 'Audit Trail' },
]

export default function App() {
  const [currentBriefing, setCurrentBriefing] = useState(null)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0D1B2A' }}>
      <header className="border-b border-border px-6 py-3 flex items-center justify-between" style={{ background: '#0A1520' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold" style={{ background: '#1B3A6B', color: '#C8A951' }}>DX</div>
          <div>
            <div className="font-semibold text-white text-sm">Dynex Capital</div>
            <div className="text-xs" style={{ color: '#C8A951' }}>MBS Intelligence Platform</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: '#8A9BAE' }}>
          <div className="w-2 h-2 rounded-full bg-green-400"></div>
          Live · LiteLLM · Arize Phoenix
        </div>
      </header>

      <div className="flex flex-1">
        <nav className="w-52 border-r border-border py-4 flex flex-col gap-1 px-2" style={{ background: '#0A1520' }}>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
                  isActive
                    ? 'text-white font-medium'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-surface'
                }`
              }
              style={({ isActive }) => isActive ? { background: '#1B3A6B', color: '#F0F4F8' } : {}}
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<PortfolioIntelligence onBriefingGenerated={setCurrentBriefing} />} />
            <Route path="/briefing" element={<BriefingView briefing={currentBriefing} />} />
            <Route path="/extraction" element={<ExtractionView />} />
            <Route path="/audit" element={<AuditTrail />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
