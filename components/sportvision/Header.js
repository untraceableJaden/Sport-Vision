'use client'

import { Zap, KeyRound, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const Header = ({ screen, geminiKey, onOpenVault, onGoHome }) => {
  const screenLabel = { home: 'HOME', select: 'SELECT SPORT', upload: 'UPLOAD', processing: 'ANALYZING', results: 'RESULTS', compare: 'COMPARE' }[screen] || ''
  return (
    <header className="sticky top-0 z-50 backdrop-blur-[24px] bg-[#07080B]/70 border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <button onClick={onGoHome} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center group-hover:bg-blue-500/25 transition-colors">
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">SportVision <span className="text-blue-400">AI Pro</span></span>
        </button>
        <div className="flex items-center gap-3">
          {screenLabel && (
            <Badge variant="outline" className="border-white/[0.12] text-white/60 text-[10px] tracking-widest font-medium px-3 py-1 rounded-full">{screenLabel}</Badge>
          )}
          <button onClick={onOpenVault} className={`sv-press flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${geminiKey ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15' : 'border-amber-500/30 bg-amber-500/10 text-amber-400 animate-pulse'}`}>
            {geminiKey ? <CheckCircle2 className="w-3.5 h-3.5" /> : <KeyRound className="w-3.5 h-3.5" />}
            {geminiKey ? 'Gemini Connected' : 'Connect Gemini Key'}
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
