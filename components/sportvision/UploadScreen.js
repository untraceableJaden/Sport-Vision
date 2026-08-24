'use client'

import { useRef, useState } from 'react'
import { ArrowLeft, UploadCloud, FileVideo, CheckCircle2, AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const UploadScreen = ({ sport, videoFile, videoUrl, error, onDismissError, onFile, onBack, onAnalyze }) => {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onFile(file)
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <button onClick={onBack} className="flex items-center gap-1 text-white/40 hover:text-white text-sm mb-6 transition-colors"><ArrowLeft className="w-4 h-4" /> Back to sports</button>

      {error && (
        <div className="mb-5 flex items-start gap-3 p-4 rounded-2xl bg-red-500/[0.08] border border-red-500/[0.2] text-red-300">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-sm flex-1 leading-relaxed">{error}</p>
          <button onClick={onDismissError} className="text-red-300/50 hover:text-red-300 shrink-0"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex items-center gap-4 mb-8 p-5 sv-card">
        <div className="text-4xl">{sport.emoji}</div>
        <div>
          <div className="text-xl font-semibold tracking-tight">{sport.name}</div>
          <div className="text-white/40 text-sm">{sport.description}</div>
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`rounded-[28px] border-2 border-dashed transition-all duration-300 cursor-pointer p-14 text-center ${dragging ? 'border-blue-500 bg-blue-500/[0.06] scale-[1.01]' : 'border-white/[0.12] hover:border-white/25 hover:bg-white/[0.02]'}`}
      >
        <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        <UploadCloud className="w-10 h-10 text-white/30 mx-auto mb-4" />
        <p className="text-white/70 mb-1">Drag & drop your video, or click to browse</p>
        <p className="text-white/30 text-xs">MP4, MOV, WEBM — under ~50MB recommended for fastest results</p>
      </div>

      {videoFile && (
        <div className="mt-5 flex items-center justify-between p-4 sv-card">
          <div className="flex items-center gap-3">
            <FileVideo className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-sm text-white">{videoFile.name}</div>
              <div className="text-xs text-white/40">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB</div>
            </div>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>
      )}

      {videoUrl && (
        <video src={videoUrl} controls className="w-full mt-5 rounded-2xl border border-white/[0.08] max-h-[360px]" />
      )}

      <Button onClick={onAnalyze} disabled={!videoFile} className="sv-btn-primary w-full mt-6 h-12 text-white text-base border-0 disabled:opacity-30 disabled:shadow-none disabled:bg-white/10 disabled:bg-none">
        Analyze Video
      </Button>
    </main>
  )
}

export default UploadScreen
