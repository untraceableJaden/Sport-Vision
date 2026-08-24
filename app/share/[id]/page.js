'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import SharedReport from '@/components/sportvision/SharedReport'

export default function SharePage({ params }) {
  const { id } = use(params)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const res = await fetch(`/api/analysis/${id}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'This shared report could not be found.')
        if (active) setData(json)
      } catch (e) {
        if (active) setError(e.message || 'This shared report could not be found.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [id])

  return (
    <div className="min-h-screen bg-[#07080B] text-white">
      <div className="sv-ambient" />
      <header className="border-b border-white/[0.08] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center"><Zap className="w-4 h-4 text-blue-400" /></div>
          <span className="text-lg font-semibold tracking-tight">SportVision <span className="text-blue-400">AI Pro</span></span>
        </Link>
        <Link href="/" className="sv-btn-primary sv-press text-white text-sm px-4 h-9 rounded-full flex items-center">Analyze your own video</Link>
      </header>
      {loading && <div className="text-center py-24 text-white/40">Loading shared report...</div>}
      {error && <div className="text-center py-24 text-red-300 text-sm">{error}</div>}
      {data && <SharedReport result={data} />}
    </div>
  )
}
