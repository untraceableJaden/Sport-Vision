'use client'

import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles, GitCompareArrows } from 'lucide-react'
import { SPORTS } from '@/lib/sports-data'

const HomeScreen = ({ onStart, history, onOpenHistory, onCompare }) => {
  return (
    <main>
      <section className="relative px-6 pt-24 pb-20 max-w-5xl mx-auto text-center overflow-hidden">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px]" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.1] bg-white/[0.04] text-xs text-white/60 mb-6">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Powered by Gemini 2.5 Multimodal Vision
        </div>
        <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight leading-[1.05] mb-5">
          Elite performance analysis,<br /><span className="text-blue-400">for every sport.</span>
        </h1>
        <p className="text-white/50 text-lg max-w-xl mx-auto mb-8">
          Upload any match or training clip. SportVision AI Pro breaks down biomechanics, tactics and technique across 20 sports — instantly.
        </p>
        <Button onClick={onStart} size="lg" className="sv-btn-primary text-white px-8 h-12 text-base group border-0">
          Start Analysis <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
        <div className="flex justify-center gap-10 mt-14 text-sm">
          <div><div className="text-2xl font-semibold text-white">20</div><div className="text-white/40">Sports</div></div>
          <div><div className="text-2xl font-semibold text-white">6-axis</div><div className="text-white/40">Kinematic Radar</div></div>
          <div><div className="text-2xl font-semibold text-emerald-400">Real AI</div><div className="text-white/40">Coaching Insights</div></div>
        </div>
      </section>

      <div className="border-y border-white/[0.06] bg-white/[0.02] py-4 overflow-hidden">
        <div className="flex gap-8 animate-[scroll_35s_linear_infinite] whitespace-nowrap">
          {[...SPORTS, ...SPORTS].map((s, i) => (
            <span key={i} className="text-white/30 text-sm flex items-center gap-2">{s.emoji} {s.name}</span>
          ))}
        </div>
      </div>

      {history?.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-16">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm uppercase tracking-widest text-white/40">Recent Analyses</h2>
            {history.length >= 2 && (
              <button onClick={onCompare} className="sv-press flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300">
                <GitCompareArrows className="w-3.5 h-3.5" /> Compare Sessions
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {history.slice(0, 6).map((h) => (
              <button key={h.id} onClick={() => onOpenHistory(h.id)} className="text-left p-4 sv-card sv-card-hover">
                <div className="text-2xl mb-2">{h.sportEmoji}</div>
                <div className="font-medium text-white">{h.sportName}</div>
                <div className="text-xs text-white/40 mt-1">{new Date(h.createdAt).toLocaleString()}</div>
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

export default HomeScreen
