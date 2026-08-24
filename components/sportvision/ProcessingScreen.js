'use client'

import { useEffect, useState } from 'react'

const STAGES = ['Uploading to Gemini', 'Athlete Detection', 'Trajectory Computation', 'Biomechanical Inference', 'Compiling Report']

const ProcessingScreen = ({ sport }) => {
  const [stageIndex, setStageIndex] = useState(0)
  const [progress, setProgress] = useState(4)

  useEffect(() => {
    const stageTimer = setInterval(() => setStageIndex((i) => (i < STAGES.length - 1 ? i + 1 : i)), 4000)
    const progressTimer = setInterval(() => setProgress((p) => (p < 92 ? p + Math.random() * 4 : p)), 600)
    return () => { clearInterval(stageTimer); clearInterval(progressTimer) }
  }, [])

  return (
    <main className="max-w-lg mx-auto px-6 py-24 text-center">
      <div className="relative w-28 h-28 mx-auto mb-8">
        <div className="absolute inset-0 rounded-full border-4 border-white/[0.08]" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-3xl">{sport.emoji}</div>
      </div>
      <h2 className="text-2xl font-semibold tracking-tight mb-2">Analyzing your {sport.name} footage</h2>
      <p className="text-white/40 mb-8">Gemini is reviewing the video for biomechanics, technique and events. This can take up to a minute.</p>
      <div className="h-1.5 w-full bg-white/[0.08] rounded-full overflow-hidden mb-2">
        <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(progress, 96)}%` }} />
      </div>
      <div className="text-xs text-white/30 mb-8 font-mono">{Math.round(Math.min(progress, 96))}%</div>
      <div className="space-y-2 text-left sv-card p-3">
        {STAGES.map((s, i) => (
          <div key={s} className={`flex items-center gap-3 text-sm px-4 py-2.5 rounded-2xl border transition-colors duration-300 ${i < stageIndex ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300' : i === stageIndex ? 'border-blue-500/30 bg-blue-500/5 text-blue-300' : 'border-white/[0.04] text-white/30'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${i < stageIndex ? 'bg-emerald-400' : i === stageIndex ? 'bg-blue-400 animate-pulse' : 'bg-white/20'}`} />
            {s}
          </div>
        ))}
      </div>
    </main>
  )
}

export default ProcessingScreen
