'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('App error boundary:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#07080B] text-white flex items-center justify-center px-6">
      <div className="sv-ambient" />
      <div className="sv-card p-8 max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
        <p className="text-white/50 text-sm mb-6">SportVision AI Pro hit an unexpected error. This is usually temporary — try again.</p>
        <button onClick={() => reset()} className="sv-btn-primary sv-press inline-flex items-center gap-2 text-white px-6 h-11 rounded-full text-sm font-medium">
          <RotateCcw className="w-4 h-4" /> Try again
        </button>
      </div>
    </div>
  )
}
