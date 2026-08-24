'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import Header from '@/components/sportvision/Header'
import KeyVaultModal from '@/components/sportvision/KeyVaultModal'
import HomeScreen from '@/components/sportvision/HomeScreen'
import SportSelectScreen from '@/components/sportvision/SportSelectScreen'
import UploadScreen from '@/components/sportvision/UploadScreen'
import ProcessingScreen from '@/components/sportvision/ProcessingScreen'
import ResultsScreen from '@/components/sportvision/ResultsScreen'
import ComparisonScreen from '@/components/sportvision/ComparisonScreen'

const App = () => {
  const [screen, setScreen] = useState('home')
  const [geminiKey, setGeminiKey] = useState('')
  const [geminiModel, setGeminiModel] = useState('gemini-3.6-flash')
  const [keyModalOpen, setKeyModalOpen] = useState(false)
  const [selectedSport, setSelectedSport] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [history, setHistory] = useState([])
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    const savedKey = localStorage.getItem('sv_gemini_key')
    const savedModel = localStorage.getItem('sv_gemini_model')
    if (savedKey) setGeminiKey(savedKey)
    if (savedModel) setGeminiModel(savedModel)
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history')
      const data = await res.json()
      if (Array.isArray(data)) setHistory(data)
    } catch (e) {
      console.error(e)
    }
  }

  const handleSaveKey = (key, model) => {
    setGeminiKey(key)
    setGeminiModel(model)
    localStorage.setItem('sv_gemini_key', key)
    localStorage.setItem('sv_gemini_model', model)
    setKeyModalOpen(false)
    toast.success('Gemini API key connected')
  }

  const handleSelectSport = (sport) => {
    setSelectedSport(sport)
    setVideoFile(null)
    setVideoUrl(null)
    setUploadError('')
    setScreen('upload')
  }

  const handleFileSelected = (file) => {
    setVideoFile(file)
    setVideoUrl(URL.createObjectURL(file))
    setUploadError('')
  }

  const startAnalysis = async () => {
    if (!geminiKey) {
      toast.error('Connect your Gemini API key first')
      setKeyModalOpen(true)
      return
    }
    if (!videoFile || !selectedSport) return
    setUploadError('')
    setScreen('processing')
    try {
      const form = new FormData()
      form.append('video', videoFile)
      form.append('sportId', selectedSport.id)
      form.append('model', geminiModel)
      const res = await fetch('/api/analysis/start', {
        method: 'POST',
        headers: { 'x-gemini-api-key': geminiKey },
        body: form,
      })
      let data
      try {
        data = await res.json()
      } catch (e) {
        throw new Error('The server sent back an unreadable response. Please try again.')
      }
      if (!res.ok) throw new Error(data.error || 'Analysis failed. Please try again.')
      setAnalysisResult(data)
      setScreen('results')
      fetchHistory()
      if (data.fallbackApplied) {
        toast('Auto-switched to Gemini 3.6 Flash (Pro Preview hit its free-tier quota).')
      }
    } catch (e) {
      const message = e instanceof TypeError
        ? "Can't reach the server right now. Check your connection and try again."
        : (e.message || 'Something went wrong. Please try again.')
      setUploadError(message)
      toast.error(message)
      setScreen('upload')
    }
  }

  const openHistoryItem = async (id) => {
    try {
      const res = await fetch(`/api/analysis/${id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load that analysis.')
      setVideoFile(null)
      setVideoUrl(null)
      setSelectedSport({ id: data.sportId, name: data.sportName, emoji: data.sportEmoji })
      setAnalysisResult(data)
      setScreen('results')
    } catch (e) {
      toast.error(e instanceof TypeError ? "Can't reach the server right now." : (e.message || 'Something went wrong.'))
    }
  }

  const resetToSelect = () => {
    setScreen('select')
    setSelectedSport(null)
    setVideoFile(null)
    setVideoUrl(null)
    setAnalysisResult(null)
  }

  return (
    <div className="min-h-screen bg-[#07080B] text-white overflow-x-hidden">
      <div className="sv-ambient" />
      <Toaster theme="dark" position="top-center" />
      <Header screen={screen} geminiKey={geminiKey} onOpenVault={() => setKeyModalOpen(true)} onGoHome={() => setScreen('home')} />
      <KeyVaultModal open={keyModalOpen} onClose={() => setKeyModalOpen(false)} onSave={handleSaveKey} initialKey={geminiKey} initialModel={geminiModel} />
      <AnimatePresence mode="wait">
        {screen === 'home' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <HomeScreen onStart={() => setScreen('select')} history={history} onOpenHistory={openHistoryItem} onCompare={() => setScreen('compare')} />
          </motion.div>
        )}
        {screen === 'select' && (
          <motion.div key="select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <SportSelectScreen onSelect={handleSelectSport} />
          </motion.div>
        )}
        {screen === 'upload' && selectedSport && (
          <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <UploadScreen sport={selectedSport} videoFile={videoFile} videoUrl={videoUrl} error={uploadError} onDismissError={() => setUploadError('')} onFile={handleFileSelected} onBack={() => setScreen('select')} onAnalyze={startAnalysis} />
          </motion.div>
        )}
        {screen === 'processing' && selectedSport && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <ProcessingScreen sport={selectedSport} />
          </motion.div>
        )}
        {screen === 'results' && analysisResult && selectedSport && (
          <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <ResultsScreen sport={selectedSport} result={analysisResult} videoUrl={videoUrl} geminiKey={geminiKey} onNewAnalysis={resetToSelect} />
          </motion.div>
        )}
        {screen === 'compare' && (
          <motion.div key="compare" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <ComparisonScreen history={history} geminiKey={geminiKey} geminiModel={geminiModel} onBack={() => setScreen('home')} onOpenVault={() => setKeyModalOpen(true)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
