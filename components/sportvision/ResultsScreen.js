'use client'

import { useState, useEffect, useRef } from 'react'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Download, Send, AlertTriangle, Sparkles, Gauge, Share2, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import MarkdownMessage from './MarkdownMessage'

const SEVERITY_COLOR = { good: 'bg-emerald-400', neutral: 'bg-blue-400', warning: 'bg-amber-400' }
const CATEGORY_LABEL = { biomechanics: 'Biomechanics', tactical: 'Tactical', injury_prevention: 'Injury Prevention', technique: 'Technique' }

function confColor(c) {
  if (c >= 0.7) return 'bg-emerald-400'
  if (c >= 0.4) return 'bg-amber-400'
  return 'bg-red-400'
}

const ResultsScreen = ({ sport, result, videoUrl, geminiKey, onNewAnalysis }) => {
  const videoRef = useRef(null)
  const analysis = result.analysis
  const [chatHistory, setChatHistory] = useState(result.chatHistory || [])
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed
  }, [speed])

  const seekTo = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds
      videoRef.current.play()
    }
  }

  const askQuestion = async () => {
    if (!question.trim()) return
    if (!geminiKey) { toast.error('Connect your Gemini key first'); return }
    const q = question.trim()
    setChatHistory((h) => [...h, { role: 'user', text: q }])
    setQuestion('')
    setAsking(true)
    try {
      const res = await fetch(`/api/analysis/${result.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-gemini-api-key': geminiKey },
        body: JSON.stringify({ question: q }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not get an answer. Please try again.')
      setChatHistory((h) => [...h, { role: 'model', text: data.answer }])
      if (data.fallbackApplied) toast('Switched to Gemini 3.6 Flash for this reply (Pro Preview quota reached).')
    } catch (e) {
      toast.error(e instanceof TypeError ? "Can't reach the server right now." : (e.message || 'Something went wrong.'))
      setChatHistory((h) => h.slice(0, -1))
    } finally {
      setAsking(false)
    }
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sportvision-${sport.id}-${result.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyShareLink = () => {
    const link = `${window.location.origin}/share/${result.id}`
    navigator.clipboard.writeText(link).then(() => {
      toast.success('Share link copied to clipboard')
    }).catch(() => {
      toast.error('Could not copy link. Please copy it manually: ' + link)
    })
  }

  const radarData = analysis?.radar
    ? Object.entries(analysis.radar).map(([k, v]) => ({ axis: k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()), value: v }))
    : []

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{sport.emoji}</div>
          <div>
            <div className="text-xl font-semibold">{sport.name} Analysis</div>
            <div className="text-white/40 text-xs flex items-center gap-2">
              {result.model} · {new Date(result.createdAt).toLocaleString()}
              {result.fallbackApplied && (
                <span className="inline-flex items-center gap-1 text-amber-400/80 text-[11px]"><Wand2 className="w-3 h-3" /> auto-switched to Flash (quota)</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyShareLink} className="sv-press border-white/[0.12] text-white/70 hover:text-white hover:bg-white/[0.06] bg-transparent rounded-full"><Share2 className="w-4 h-4 mr-2" />Share Link</Button>
          <Button variant="outline" onClick={exportJson} className="sv-press border-white/[0.12] text-white/70 hover:text-white hover:bg-white/[0.06] bg-transparent rounded-full"><Download className="w-4 h-4 mr-2" />Export JSON</Button>
          <Button onClick={onNewAnalysis} className="sv-btn-primary text-white border-0">New Analysis</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="sv-card p-5">
            {videoUrl ? (
              <>
                <video ref={videoRef} src={videoUrl} controls className="w-full rounded-xl max-h-[420px] bg-black" />
                <div className="flex gap-2 mt-3">
                  {[0.25, 0.5, 1, 2].map((s) => (
                    <button key={s} onClick={() => setSpeed(s)} className={`sv-press px-3 py-1 rounded-full text-xs border transition-colors ${speed === s ? 'bg-blue-500 border-blue-500 text-white' : 'border-white/[0.1] text-white/50 hover:text-white hover:border-white/20'}`}>{s}x</button>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-40 flex items-center justify-center text-white/30 text-sm">Video preview unavailable for past sessions.</div>
            )}
          </div>

          <div className="sv-card p-5">
            <div className="flex items-center gap-2 mb-3 text-white/70 text-sm font-medium"><Sparkles className="w-4 h-4 text-blue-400" /> AI Summary</div>
            <p className="text-white/60 text-sm leading-relaxed">{analysis?.summary}</p>
          </div>

          <div className="sv-card p-5">
            <div className="text-white/70 text-sm font-medium mb-4">Performance Metrics</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {analysis?.metrics?.map((m, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
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
                <button key={i} onClick={() => seekTo(e.timestampSeconds)} className="w-full flex items-start gap-3 text-left p-3 rounded-2xl hover:bg-white/[0.05] transition-colors sv-press">
                  <span className={`w-2 h-2 rounded-full mt-1.5 ${SEVERITY_COLOR[e.severity] || 'bg-blue-400'}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-white">{e.type} <span className="text-white/30 text-xs font-mono">{new Date(e.timestampSeconds * 1000).toISOString().substr(14, 5)}</span></div>
                    <div className="text-xs text-white/40">{e.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
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
                <div key={i} className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
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

          <div className="sv-card p-5 flex flex-col h-[420px]">
            <div className="text-white/70 text-sm font-medium mb-3">Ask the Gemini Sports Analyst</div>
            <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">
              {chatHistory.length === 0 && <p className="text-white/30 text-xs">Ask about technique, tactics, or specific moments — e.g. "What should I fix about my footwork?"</p>}
              {chatHistory.map((m, i) => (
                <div key={i} className={`px-3.5 py-2.5 max-w-[90%] ${m.role === 'user' ? 'ml-auto bg-blue-500/25 text-white rounded-2xl rounded-tr-md' : 'bg-white/[0.06] text-white/75 rounded-2xl rounded-tl-md'}`}>
                  <MarkdownMessage text={m.text} />
                </div>
              ))}
              {asking && <div className="text-xs text-white/30 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />Analyzing your question...</div>}
            </div>
            <div className="flex gap-2">
              <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askQuestion() } }} placeholder="Ask a question..." className="bg-white/[0.04] border-white/[0.1] text-white text-sm resize-none h-10 min-h-10 rounded-2xl" />
              <Button size="icon" onClick={askQuestion} disabled={asking} className="sv-btn-primary shrink-0 border-0"><Send className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default ResultsScreen
