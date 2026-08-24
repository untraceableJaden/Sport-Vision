'use client'

import { useState, useEffect } from 'react'
import {
  ArrowLeft, GitCompareArrows, TrendingUp, TrendingDown, Minus,
  Sparkles, Target, Shield, Zap, Brain, ChevronRight, Loader2,
  ArrowUpRight, ArrowDownRight, Equal, AlertTriangle, Trophy,
  Swords, Activity, CheckCircle2, XCircle, Clock
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { toast } from 'sonner'
import MarkdownMessage from './MarkdownMessage'

const TRAJECTORY_CONFIG = {
  improved: { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', label: 'Improved' },
  declined: { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', label: 'Declined' },
  mixed: { icon: Activity, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20', label: 'Mixed Results' },
  similar: { icon: Equal, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20', label: 'Similar' },
}

const CHANGE_ICON = {
  improved: { icon: ArrowUpRight, color: 'text-emerald-400' },
  declined: { icon: ArrowDownRight, color: 'text-red-400' },
  unchanged: { icon: Minus, color: 'text-white/30' },
}

const PRIORITY_CONFIG = {
  high: { color: 'bg-red-400/15 text-red-400 border-red-400/20', label: 'HIGH' },
  medium: { color: 'bg-amber-400/15 text-amber-400 border-amber-400/20', label: 'MED' },
  low: { color: 'bg-blue-400/15 text-blue-400 border-blue-400/20', label: 'LOW' },
}

const CATEGORY_CONFIG = {
  biomechanics: { icon: Activity, color: 'text-purple-400', label: 'Biomechanics' },
  tactical: { icon: Swords, color: 'text-blue-400', label: 'Tactical' },
  injury_prevention: { icon: Shield, color: 'text-amber-400', label: 'Injury Prevention' },
  technique: { icon: Target, color: 'text-emerald-400', label: 'Technique' },
}

const SEVERITY_DOT = { good: 'bg-emerald-400', neutral: 'bg-blue-400', warning: 'bg-amber-400' }

const ComparisonScreen = ({ history, geminiKey, geminiModel, onBack, onOpenVault }) => {
  const [idA, setIdA] = useState('')
  const [idB, setIdB] = useState('')
  const [docA, setDocA] = useState(null)
  const [docB, setDocB] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // AI comparison state
  const [aiComparison, setAiComparison] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  // Load both sessions when selections change
  useEffect(() => {
    if (!idA || !idB) { setDocA(null); setDocB(null); setAiComparison(null); return }
    let active = true
    const load = async () => {
      setLoading(true)
      setError('')
      setAiComparison(null)
      setAiError('')
      try {
        const [ra, rb] = await Promise.all([fetch(`/api/analysis/${idA}`), fetch(`/api/analysis/${idB}`)])
        const [da, dbb] = await Promise.all([ra.json(), rb.json()])
        if (!ra.ok) throw new Error(da.error || 'Could not load Session A.')
        if (!rb.ok) throw new Error(dbb.error || 'Could not load Session B.')
        if (active) { setDocA(da); setDocB(dbb) }
      } catch (e) {
        if (active) setError(e.message || 'Could not load one of the sessions.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [idA, idB])

  // Generate AI comparison
  const generateAiComparison = async () => {
    if (!geminiKey) {
      toast.error('Connect your Gemini API key first')
      onOpenVault?.()
      return
    }
    setAiLoading(true)
    setAiError('')
    try {
      const res = await fetch('/api/analysis/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-gemini-api-key': geminiKey },
        body: JSON.stringify({ idA, idB, model: geminiModel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not generate comparison.')
      setAiComparison(data.comparison)
      if (data.fallbackApplied) {
        toast('Auto-switched to Gemini 3.6 Flash for comparison (Pro Preview quota reached).')
      }
    } catch (e) {
      const msg = e instanceof TypeError ? "Can't reach the server right now." : (e.message || 'Something went wrong.')
      setAiError(msg)
      toast.error(msg)
    } finally {
      setAiLoading(false)
    }
  }

  // Radar data
  const radarData = docA && docB && docA.analysis?.radar && docB.analysis?.radar
    ? Object.keys(docA.analysis.radar).map((k) => ({
        axis: k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()),
        A: docA.analysis.radar[k],
        B: docB.analysis.radar[k] ?? 0,
      }))
    : []

  // Metric comparison data
  const metricRows = docA && docB
    ? (docA.analysis?.metrics || [])
        .map((ma) => {
          const mb = (docB.analysis?.metrics || []).find((x) => x.name === ma.name)
          if (!mb) return null
          return { name: ma.name, unit: ma.unit, a: ma.value, b: mb.value, delta: (mb.value ?? 0) - (ma.value ?? 0), confA: ma.confidence, confB: mb.confidence }
        })
        .filter(Boolean)
    : []

  // Bar chart data for metrics
  const barData = metricRows.filter(r => r.a != null && r.b != null).map(r => ({
    name: r.name.length > 18 ? r.name.slice(0, 16) + '…' : r.name,
    fullName: r.name,
    A: r.a,
    B: r.b,
    unit: r.unit,
  }))

  // Insights grouped by category
  const groupInsights = (insights) => {
    const groups = {}
    ;(insights || []).forEach(ins => {
      const cat = ins.category || 'technique'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(ins)
    })
    return groups
  }
  const insightsA = docA ? groupInsights(docA.analysis?.insights) : {}
  const insightsB = docB ? groupInsights(docB.analysis?.insights) : {}
  const allCategories = [...new Set([...Object.keys(insightsA), ...Object.keys(insightsB)])]

  // Merged events timeline
  const mergedEvents = docA && docB
    ? [
        ...(docA.analysis?.events || []).map(e => ({ ...e, session: 'A' })),
        ...(docB.analysis?.events || []).map(e => ({ ...e, session: 'B' })),
      ].sort((a, b) => a.timestampSeconds - b.timestampSeconds)
    : []

  const formatTs = (s) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <button onClick={onBack} className="flex items-center gap-1 text-white/40 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center border border-white/[0.08]">
          <GitCompareArrows className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Session Comparison</h1>
          <p className="text-white/40 text-sm">Deep-dive analysis of two training sessions</p>
        </div>
      </div>

      {/* Session Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 mb-8">
        <div className="sv-card p-4">
          <div className="text-xs text-blue-400 font-medium mb-2 uppercase tracking-wider">Session A · Baseline</div>
          <Select value={idA} onValueChange={setIdA}>
            <SelectTrigger className="bg-white/[0.04] border-white/[0.1] text-white"><SelectValue placeholder="Choose a session" /></SelectTrigger>
            <SelectContent className="bg-[#0F121C] border-white/[0.1] text-white">
              {history.map((h) => <SelectItem key={h.id} value={h.id} disabled={h.id === idB}>{h.sportEmoji} {h.sportName} — {new Date(h.createdAt).toLocaleDateString()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="sv-card p-4">
          <div className="text-xs text-emerald-400 font-medium mb-2 uppercase tracking-wider">Session B · Latest</div>
          <Select value={idB} onValueChange={setIdB}>
            <SelectTrigger className="bg-white/[0.04] border-white/[0.1] text-white"><SelectValue placeholder="Choose a session" /></SelectTrigger>
            <SelectContent className="bg-[#0F121C] border-white/[0.1] text-white">
              {history.map((h) => <SelectItem key={h.id} value={h.id} disabled={h.id === idA}>{h.sportEmoji} {h.sportName} — {new Date(h.createdAt).toLocaleDateString()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Empty state */}
      {(!idA || !idB) && (
        <div className="text-center py-16">
          <GitCompareArrows className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/30 text-sm">Select two sessions above to see a full comparison.</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-white/40 text-sm">Loading sessions…</p>
        </div>
      )}
      {error && <p className="text-red-300 text-sm text-center py-8">{error}</p>}

      {docA && docB && !loading && !error && (
        <div className="space-y-6">

          {/* ═══════════════ SECTION 1: Session Overview Cards ═══════════════ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { doc: docA, label: 'Session A', accent: 'blue' },
              { doc: docB, label: 'Session B', accent: 'emerald' },
            ].map(({ doc, label, accent }) => (
              <div key={label} className="sv-card p-5 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r ${accent === 'blue' ? 'from-blue-500 to-blue-400' : 'from-emerald-500 to-emerald-400'}`} />
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className={`text-xs font-medium uppercase tracking-wider mb-1 ${accent === 'blue' ? 'text-blue-400' : 'text-emerald-400'}`}>{label}</div>
                    <div className="text-lg font-semibold flex items-center gap-2">
                      <span>{doc.sportEmoji}</span>
                      <span>{doc.sportName}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-white/30">{new Date(doc.createdAt).toLocaleDateString()}</div>
                    <div className="text-[11px] text-white/30 mt-0.5">{doc.model}</div>
                    {doc.fallbackApplied && (
                      <span className="text-[10px] text-amber-400/70">auto-fallback</span>
                    )}
                  </div>
                </div>
                <p className="text-white/50 text-sm leading-relaxed line-clamp-4">{doc.analysis?.summary}</p>
                <div className="flex gap-3 mt-3">
                  <div className="text-[11px] text-white/30">
                    <span className="text-white/50 font-medium">{doc.analysis?.metrics?.length || 0}</span> metrics
                  </div>
                  <div className="text-[11px] text-white/30">
                    <span className="text-white/50 font-medium">{doc.analysis?.events?.length || 0}</span> events
                  </div>
                  <div className="text-[11px] text-white/30">
                    <span className="text-white/50 font-medium">{doc.analysis?.insights?.length || 0}</span> insights
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ═══════════════ SECTION 2: Radar + Metric Bars ═══════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Radar */}
            <div className="sv-card p-5">
              <div className="text-white/70 text-sm font-medium mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                Kinematic Radar — A vs B
              </div>
              {radarData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                      <PolarGrid stroke="rgba(255,255,255,0.08)" />
                      <PolarAngleAxis dataKey="axis" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                      <Radar name="Session A" dataKey="A" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} strokeWidth={2} />
                      <Radar name="Session B" dataKey="B" stroke="#10B981" fill="#10B981" fillOpacity={0.2} strokeWidth={2} />
                      <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-white/30 text-xs py-8 text-center">No radar data available.</p>
              )}
            </div>

            {/* Metric-by-Metric Bars */}
            <div className="sv-card p-5">
              <div className="text-white/70 text-sm font-medium mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Metric-by-Metric Comparison
              </div>
              {barData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} width={100} />
                      <Tooltip
                        contentStyle={{ background: '#141722', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 12 }}
                        formatter={(value, name, props) => [`${value} ${props.payload.unit}`, name === 'A' ? 'Session A' : 'Session B']}
                      />
                      <Bar dataKey="A" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={10} />
                      <Bar dataKey="B" fill="#10B981" radius={[0, 4, 4, 0]} barSize={10} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-white/30 text-xs py-8 text-center">No matching metrics to compare.</p>
              )}
            </div>
          </div>

          {/* ═══════════════ SECTION 3: Metric Deltas Table ═══════════════ */}
          {metricRows.length > 0 && (
            <div className="sv-card p-5">
              <div className="text-white/70 text-sm font-medium mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400" />
                Detailed Metric Deltas
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/40 text-xs uppercase tracking-wider border-b border-white/[0.06]">
                      <th className="text-left py-2 px-3">Metric</th>
                      <th className="text-center py-2 px-3">Session A</th>
                      <th className="text-center py-2 px-3">Session B</th>
                      <th className="text-center py-2 px-3">Delta</th>
                      <th className="text-center py-2 px-3">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricRows.map((r, i) => (
                      <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3 text-white/70 font-medium">{r.name}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-blue-400">{r.a != null ? `${r.a}` : '—'}</span>
                          <span className="text-white/20 text-xs ml-0.5">{r.a != null ? r.unit : ''}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-emerald-400">{r.b != null ? `${r.b}` : '—'}</span>
                          <span className="text-white/20 text-xs ml-0.5">{r.b != null ? r.unit : ''}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {r.a != null && r.b != null ? (
                            <span className={`font-medium ${r.delta > 0 ? 'text-emerald-400' : r.delta < 0 ? 'text-red-400' : 'text-white/30'}`}>
                              {r.delta > 0 ? '+' : ''}{r.delta.toFixed(1)}{r.unit}
                            </span>
                          ) : <span className="text-white/20">—</span>}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {r.a != null && r.b != null ? (
                            r.delta > 0 ? <ArrowUpRight className="w-4 h-4 text-emerald-400 mx-auto" />
                              : r.delta < 0 ? <ArrowDownRight className="w-4 h-4 text-red-400 mx-auto" />
                              : <Minus className="w-4 h-4 text-white/20 mx-auto" />
                          ) : <Minus className="w-4 h-4 text-white/10 mx-auto" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══════════════ SECTION 4: Tactical & Coaching Insights ═══════════════ */}
          <div className="sv-card p-5">
            <div className="text-white/70 text-sm font-medium mb-5 flex items-center gap-2">
              <Brain className="w-4 h-4 text-pink-400" />
              Coaching Insights — Side by Side
            </div>
            {allCategories.length === 0 ? (
              <p className="text-white/30 text-xs text-center py-6">No coaching insights available in either session.</p>
            ) : (
              <div className="space-y-6">
                {allCategories.map(cat => {
                  const cfg = CATEGORY_CONFIG[cat] || { icon: Target, color: 'text-white/50', label: cat }
                  const Icon = cfg.icon
                  const aInsights = insightsA[cat] || []
                  const bInsights = insightsB[cat] || []
                  return (
                    <div key={cat}>
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                        <span className="text-sm font-medium text-white/60">{cfg.label}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Session A insights */}
                        <div className="space-y-2">
                          <div className="text-[11px] text-blue-400/70 font-medium uppercase tracking-wider mb-1">Session A</div>
                          {aInsights.length === 0 ? (
                            <p className="text-white/20 text-xs italic">No {cfg.label.toLowerCase()} insights</p>
                          ) : aInsights.map((ins, i) => (
                            <div key={i} className="p-3 rounded-xl bg-blue-500/[0.04] border border-blue-500/[0.08]">
                              <div className="text-sm text-white/80 font-medium">{ins.title}</div>
                              <p className="text-xs text-white/40 mt-1">{ins.finding}</p>
                              {ins.limitation && <p className="text-[10px] text-white/20 mt-1 italic">⚠ {ins.limitation}</p>}
                            </div>
                          ))}
                        </div>
                        {/* Session B insights */}
                        <div className="space-y-2">
                          <div className="text-[11px] text-emerald-400/70 font-medium uppercase tracking-wider mb-1">Session B</div>
                          {bInsights.length === 0 ? (
                            <p className="text-white/20 text-xs italic">No {cfg.label.toLowerCase()} insights</p>
                          ) : bInsights.map((ins, i) => (
                            <div key={i} className="p-3 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/[0.08]">
                              <div className="text-sm text-white/80 font-medium">{ins.title}</div>
                              <p className="text-xs text-white/40 mt-1">{ins.finding}</p>
                              {ins.limitation && <p className="text-[10px] text-white/20 mt-1 italic">⚠ {ins.limitation}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ═══════════════ SECTION 5: Events Timeline ═══════════════ */}
          <div className="sv-card p-5">
            <div className="text-white/70 text-sm font-medium mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Events Timeline — Both Sessions
            </div>
            {mergedEvents.length === 0 ? (
              <p className="text-white/30 text-xs text-center py-6">No events detected in either session.</p>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[23px] top-0 bottom-0 w-px bg-white/[0.06]" />
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-2">
                  {mergedEvents.map((ev, i) => {
                    const isA = ev.session === 'A'
                    return (
                      <div key={i} className="flex items-start gap-3 pl-1 group">
                        <div className="flex flex-col items-center mt-1 shrink-0">
                          <div className={`w-3 h-3 rounded-full border-2 ${isA ? 'border-blue-400 bg-blue-400/30' : 'border-emerald-400 bg-emerald-400/30'}`} />
                        </div>
                        <div className={`flex-1 p-3 rounded-xl transition-colors group-hover:bg-white/[0.03] ${isA ? 'border-l-2 border-l-blue-500/30' : 'border-l-2 border-l-emerald-500/30'}`}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-medium uppercase tracking-wider ${isA ? 'text-blue-400' : 'text-emerald-400'}`}>
                              {isA ? 'A' : 'B'}
                            </span>
                            <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[ev.severity] || 'bg-blue-400'}`} />
                            <span className="text-sm text-white/80 font-medium">{ev.type}</span>
                            <span className="text-xs text-white/25 font-mono">{formatTs(ev.timestampSeconds)}</span>
                          </div>
                          <p className="text-xs text-white/40 mt-0.5">{ev.description}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════ SECTION 6: AI Deep Comparison ═══════════════ */}
          <div className="sv-card p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500" />
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white/80">AI Deep Comparison</div>
                  <div className="text-[11px] text-white/30">Powered by Gemini — analyzes tactics, technique & performance</div>
                </div>
              </div>
              {!aiComparison && !aiLoading && (
                <Button
                  onClick={generateAiComparison}
                  className="sv-btn-primary text-white border-0 gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate AI Comparison
                </Button>
              )}
            </div>

            {/* Loading state */}
            {aiLoading && (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
                <p className="text-white/40 text-sm">Gemini is analyzing both sessions…</p>
                <p className="text-white/20 text-xs mt-1">This may take 10–20 seconds</p>
              </div>
            )}

            {/* Error state */}
            {aiError && !aiLoading && (
              <div className="text-center py-8">
                <AlertTriangle className="w-8 h-8 text-red-400/50 mx-auto mb-2" />
                <p className="text-red-300 text-sm mb-3">{aiError}</p>
                <Button onClick={generateAiComparison} variant="outline" className="border-white/[0.12] text-white/70 hover:text-white hover:bg-white/[0.06] bg-transparent">
                  Try Again
                </Button>
              </div>
            )}

            {/* AI Comparison Results */}
            {aiComparison && !aiLoading && (
              <div className="space-y-6">
                {/* Overall Verdict Banner */}
                {(() => {
                  const traj = TRAJECTORY_CONFIG[aiComparison.trajectoryDirection] || TRAJECTORY_CONFIG.similar
                  const TrajIcon = traj.icon
                  return (
                    <div className={`p-4 rounded-2xl border ${traj.bg}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <TrajIcon className={`w-6 h-6 ${traj.color}`} />
                        <div>
                          <span className={`text-sm font-semibold ${traj.color}`}>{traj.label}</span>
                          <span className="text-white/20 mx-2">·</span>
                          <span className="text-xs text-white/40">Overall Trajectory</span>
                        </div>
                      </div>
                      <p className="text-white/70 text-sm leading-relaxed">{aiComparison.overallVerdict}</p>
                    </div>
                  )
                })()}

                {/* Performance Summary */}
                <div>
                  <div className="text-xs text-white/40 uppercase tracking-wider mb-2 font-medium">Performance Summary</div>
                  <p className="text-white/60 text-sm leading-relaxed">{aiComparison.performanceSummary}</p>
                </div>

                {/* Tactical Differences */}
                {aiComparison.tacticalDifferences?.length > 0 && (
                  <div>
                    <div className="text-xs text-white/40 uppercase tracking-wider mb-3 font-medium flex items-center gap-2">
                      <Swords className="w-3.5 h-3.5 text-blue-400" /> Tactical Differences
                    </div>
                    <div className="space-y-3">
                      {aiComparison.tacticalDifferences.map((td, i) => (
                        <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                          <div className="text-sm text-white/80 font-medium mb-2">{td.aspect}</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                            <div className="p-2.5 rounded-lg bg-blue-500/[0.05] border border-blue-500/[0.1]">
                              <div className="text-[10px] text-blue-400 font-medium uppercase mb-1">Session A</div>
                              <p className="text-xs text-white/50">{td.sessionA}</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/[0.1]">
                              <div className="text-[10px] text-emerald-400 font-medium uppercase mb-1">Session B</div>
                              <p className="text-xs text-white/50">{td.sessionB}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-1.5 mt-1">
                            <ChevronRight className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-purple-300/80">{td.verdict}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technique Progression */}
                {aiComparison.techniqueProgression?.length > 0 && (
                  <div>
                    <div className="text-xs text-white/40 uppercase tracking-wider mb-3 font-medium flex items-center gap-2">
                      <Target className="w-3.5 h-3.5 text-emerald-400" /> Technique Progression
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {aiComparison.techniqueProgression.map((tp, i) => {
                        const cfg = CHANGE_ICON[tp.change] || CHANGE_ICON.unchanged
                        const ChangeIcon = cfg.icon
                        return (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                            <ChangeIcon className={`w-5 h-5 ${cfg.color} shrink-0 mt-0.5`} />
                            <div>
                              <div className="text-sm text-white/70 font-medium">{tp.area}</div>
                              <p className="text-xs text-white/40 mt-0.5">{tp.detail}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Session A */}
                  <div className="space-y-3">
                    <div className="text-[11px] text-blue-400 font-medium uppercase tracking-wider">Session A</div>
                    {aiComparison.strengthsA?.length > 0 && (
                      <div className="p-3 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/[0.08]">
                        <div className="text-[10px] text-emerald-400 font-medium uppercase mb-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Strengths</div>
                        <ul className="space-y-1.5">
                          {aiComparison.strengthsA.map((s, i) => (
                            <li key={i} className="text-xs text-white/50 flex items-start gap-2">
                              <span className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiComparison.weaknessesA?.length > 0 && (
                      <div className="p-3 rounded-xl bg-red-500/[0.03] border border-red-500/[0.08]">
                        <div className="text-[10px] text-red-400 font-medium uppercase mb-2 flex items-center gap-1"><XCircle className="w-3 h-3" /> Weaknesses</div>
                        <ul className="space-y-1.5">
                          {aiComparison.weaknessesA.map((w, i) => (
                            <li key={i} className="text-xs text-white/50 flex items-start gap-2">
                              <span className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0" />
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  {/* Session B */}
                  <div className="space-y-3">
                    <div className="text-[11px] text-emerald-400 font-medium uppercase tracking-wider">Session B</div>
                    {aiComparison.strengthsB?.length > 0 && (
                      <div className="p-3 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/[0.08]">
                        <div className="text-[10px] text-emerald-400 font-medium uppercase mb-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Strengths</div>
                        <ul className="space-y-1.5">
                          {aiComparison.strengthsB.map((s, i) => (
                            <li key={i} className="text-xs text-white/50 flex items-start gap-2">
                              <span className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiComparison.weaknessesB?.length > 0 && (
                      <div className="p-3 rounded-xl bg-red-500/[0.03] border border-red-500/[0.08]">
                        <div className="text-[10px] text-red-400 font-medium uppercase mb-2 flex items-center gap-1"><XCircle className="w-3 h-3" /> Weaknesses</div>
                        <ul className="space-y-1.5">
                          {aiComparison.weaknessesB.map((w, i) => (
                            <li key={i} className="text-xs text-white/50 flex items-start gap-2">
                              <span className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0" />
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommendations */}
                {aiComparison.recommendations?.length > 0 && (
                  <div>
                    <div className="text-xs text-white/40 uppercase tracking-wider mb-3 font-medium flex items-center gap-2">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" /> Actionable Recommendations
                    </div>
                    <div className="space-y-2">
                      {aiComparison.recommendations.map((rec, i) => {
                        const pri = PRIORITY_CONFIG[rec.priority] || PRIORITY_CONFIG.medium
                        return (
                          <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-colors">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border shrink-0 mt-0.5 ${pri.color}`}>{pri.label}</span>
                            <div>
                              <div className="text-sm text-white/80 font-medium">{rec.title}</div>
                              <p className="text-xs text-white/40 mt-0.5">{rec.detail}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Regenerate button */}
                <div className="text-center pt-2">
                  <Button onClick={generateAiComparison} variant="outline" className="border-white/[0.1] text-white/40 hover:text-white hover:bg-white/[0.06] bg-transparent text-xs">
                    <Sparkles className="w-3 h-3 mr-1.5" /> Regenerate AI Comparison
                  </Button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </main>
  )
}

export default ComparisonScreen
