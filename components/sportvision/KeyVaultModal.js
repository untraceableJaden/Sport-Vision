'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ShieldCheck, ExternalLink } from 'lucide-react'

const KeyVaultModal = ({ open, onClose, onSave, initialKey, initialModel }) => {
  const [key, setKey] = useState(initialKey || '')
  const [model, setModel] = useState(initialModel || 'gemini-3.6-flash')

  useEffect(() => {
    setKey(initialKey || '')
    setModel(initialModel || 'gemini-3.6-flash')
  }, [initialKey, initialModel, open])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#0F121C] border-white/[0.08] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="w-5 h-5 text-emerald-400" /> Gemini BYOK Vault</DialogTitle>
          <DialogDescription className="text-white/50">
            Your key stays in this browser only and is sent directly with each request. We never store it on our servers.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-white/70 text-xs">Gemini API Key</Label>
            <Input type="password" placeholder="AIza..." value={key} onChange={(e) => setKey(e.target.value)} className="bg-white/[0.04] border-white/[0.1] text-white" />
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-xs text-blue-400 flex items-center gap-1 hover:underline">Get a free key from Google AI Studio <ExternalLink className="w-3 h-3" /></a>
          </div>
          <div className="space-y-2">
            <Label className="text-white/70 text-xs">Analysis Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="bg-white/[0.04] border-white/[0.1] text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#0F121C] border-white/[0.1] text-white">
                <SelectItem value="gemini-3.6-flash">Gemini 3.6 Flash — fast, agentic analysis</SelectItem>
                <SelectItem value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview — deep reasoning breakdown</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-white/30">Note: Pro Preview typically needs a paid Gemini API plan (free tier has 0 quota for it). Flash has a generous free tier and is recommended by default.</p>
          </div>
          <Button className="sv-btn-primary w-full text-white border-0" disabled={!key.trim()} onClick={() => onSave(key.trim(), model)}>Save & Connect</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default KeyVaultModal
