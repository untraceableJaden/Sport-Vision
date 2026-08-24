'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { SPORTS, CATEGORIES } from '@/lib/sports-data'

const SportSelectScreen = ({ onSelect }) => {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')

  const filtered = useMemo(() => SPORTS.filter((s) => {
    const matchCat = category === 'all' || s.category === category
    const matchQuery = s.name.toLowerCase().includes(query.toLowerCase())
    return matchCat && matchQuery
  }), [query, category])

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-semibold mb-1">Select a sport</h1>
      <p className="text-white/40 mb-6">Choose the sport for your upcoming video analysis.</p>
      <div className="relative mb-5">
        <Search className="w-4 h-4 text-white/30 absolute left-4 top-1/2 -translate-y-1/2" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search sports..." className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 transition-colors" />
      </div>
      <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button key={c.id} onClick={() => setCategory(c.id)} className={`sv-press px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors border ${category === c.id ? 'bg-blue-500 border-blue-500 text-white' : 'border-white/[0.1] text-white/50 hover:text-white hover:border-white/20'}`}>{c.label}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filtered.map((s) => (
          <button key={s.id} onClick={() => onSelect(s)} className="group text-left p-5 sv-card sv-card-hover">
            <div className="text-3xl mb-3">{s.emoji}</div>
            <div className="font-medium text-white text-sm mb-1">{s.name}</div>
            <div className="text-[11px] text-white/35 capitalize">{s.category.replace('_', ' ')}</div>
          </button>
        ))}
        {filtered.length === 0 && <p className="text-white/40 col-span-full text-center py-10">No sports match your search.</p>}
      </div>
    </main>
  )
}

export default SportSelectScreen
