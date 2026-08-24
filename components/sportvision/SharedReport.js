'use client'

import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts'
import { AlertTriangle, Sparkles, Gauge } from 'lucide-react'
import MarkdownMessage from './MarkdownMessage'

const SEVERITY_COLOR = { good: 'bg-emerald-400', neutral: 'bg-blue-400', warning: 'bg-amber-400' }
const CATEGORY_LABEL = { biomechanics: 'Biomechanics', tactical: 'Tactical', injury_prevention: 'Injury Prevention', technique: 'Technique' }

function confColor(c) {
  if (c >= 0.7) return 'bg-emerald-400'
  if (c >= 0.4) return 'bg-amber-400'
  return 'bg-red-400'
}

const SharedReport = ({ result }) => {
  const analysis = result.analysis
  const radarData = analysis?.radar
    ? Object.entries(analysis.radar).map(([k, v]) => ({ axis: k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()), value: v }))
    : []

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="text-3xl">{result.sportEmoji}</div>
        <div>
          <div className="text-xl font-semibold tracking-tight">{result.sportName} Analysis</div>
          <div className="text-white/40 text-xs">Shared read-only report · {result.model} · {new Date(result.createdAt).toLocaleString()}</div>
        </div>
      </div>
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.1] bg-white/[0.04] text-[11px] text-white/40 mb-8">
        Read-only shared view — video preview is not included in shared links
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="sv-card p-5">
            <div className="flex items-center gap-2 mb-3 text-white/70 text-sm font-medium"><Sparkles className="w-4 h-4 text-blue-400" /> AI Summary</div>
            <p className="text-white/60 text-sm leading-relaxed">{analysis?.summary}</p>
          </div>

          <div className="sv-card p-5">
            <div className="text-white/70 text-sm font-medium mb-4">Performance Metrics</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {analysis?.metrics?.map((m, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-2xl font-semibold text-white tracking-tight">{m.value ?? 'N/A'}<span className="text-xs text-white/40 ml-1">{m.value != null ? m.unit : ''}</span></div>
                  <div className="text-xs text-white/40 mt-1 mb-2">{m.name}</div>
                  <div className="h-1 w-full bg-white/[0.08] rounded-full overflow-hidden"><div className={`h-full rounded-full ${confColor(m.confidence)}`} style={{ width: `${Math.round(m.confidence * 100)}%` }} /></div>
                </div>
              ))}
            </div>
          </div>

          <div className="sv-card p-5">
            <div className="text-white/70 text-sm font-medium mb-4">Detected Events Timeline</div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {analysis?.events?.map((e, i) => (
                <div key={i} className="w-full flex items-start gap-3 p-3 rounded-2xl">
                  <span className={`w-2 h-2 rounded-full mt-1.5 ${SEVERITY_COLOR[e.severity] || 'bg-blue-400'}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-white">{e.type} <span className="text-white/30 text-xs font-mono">{new Date(e.timestampSeconds * 1000).toISOString().substr(14, 5)}</span></div>
                    <div className="text-xs text-white/40">{e.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {result.chatHistory?.length > 0 && (
            <div className="sv-card p-5">
              <div className="text-white/70 text-sm font-medium mb-3">Coaching Q&A</div>
              <div className="space-y-3">
                {result.chatHistory.map((m, i) => (
                  <div key={i} className={`px-3.5 py-2.5 max-w-[90%] ${m.role === 'user' ? 'ml-auto bg-blue-500/25 text-white rounded-2xl rounded-tr-md' : 'bg-white/[0.06] text-white/75 rounded-2xl rounded-tl-md'}`}>
                    <MarkdownMessage text={m.text} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="sv-card p-5">
            <div className="text-white/70 text-sm font-medium mb-2 flex items-center gap-2"><Gauge className="w-4 h-4 text-emerald-400" /> Kinematic Radar Profile</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="axis" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                  <Radar dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="sv-card p-5">
            <div className="text-white/70 text-sm font-medium mb-3">Coaching Insights</div>
            <div className="space-y-3">
              {analysis?.insights?.map((ins, i) => (
                <div key={i} className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm text-white font-medium">{ins.title}</div>
                    <span className="text-[10px] uppercase tracking-wide text-blue-400/70">{CATEGORY_LABEL[ins.category] || ins.category}</span>
                  </div>
                  <p className="text-xs text-white/50">{ins.finding}</p>
                  {ins.limitation && <p className="text-[11px] text-white/30 mt-1 italic">Limitation: {ins.limitation}</p>}
                </div>
              ))}
            </div>
          </div>

          {analysis?.unavailableMetrics?.length > 0 && (
            <div className="rounded-2xl bg-amber-500/[0.04] border border-amber-500/[0.15] p-5">
              <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-2"><AlertTriangle className="w-4 h-4" /> Not Measurable From Video</div>
              <div className="flex flex-wrap gap-2">
                {analysis.unavailableMetrics.map((u, i) => <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-white/[0.05] text-white/50 border border-white/[0.08]">{u}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default SharedReport
