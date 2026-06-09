'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  UTILIZZI,
  SPECIALIZZAZIONI,
  getFontiMultiple,
  PROFESSIONI_LIST,
  type Professione,
  type Fonte,
} from '@/lib/onboarding/config'
import DriveFolderPicker, { DriveFolder } from '@/components/DriveFolderPicker'
import FileTree from '@/components/FileTree'

type Ambito = 'lavoro' | 'studio' | 'personale'

interface AmbitoData {
  ambito: Ambito
  professione: string
  utilizzo: string
  specializzazioni: string[]
  specializzazione_custom: string
  fonti: Fonte[]
  fonti_escluse: string[]
  citazione: string
  conflitto_fonti: string
  tono: string
  livello_studio: string
  materia_studio: string
  uso_personale: string
}

interface UserFile {
  id: string
  nome: string
  mime_type: string
  dimensione: number
  created_at: string
  storage_path: string
  ambito: string | null
}

interface ShareLink {
  share_token: string
  conversation_id: string
  titolo: string
  expires_at: string | null
  has_password: boolean
  created_at: string
}

// File/cartelle da ignorare nell'upload cartella
const IGNORA = ['node_modules', '.git', '.next', 'dist', 'build', '.cache', '__pycache__', '.DS_Store', 'Thumbs.db']

function deveIgnorare(path: string): boolean {
  return IGNORA.some(p => path.includes(`/${p}`) || path.includes(`\\${p}`) || path.startsWith(p))
}

const PROFESSIONI_PER_CATEGORIA = PROFESSIONI_LIST.reduce((acc, p) => {
  if (!acc[p.categoria]) acc[p.categoria] = []
  acc[p.categoria].push(p)
  return acc
}, {} as Record<string, typeof PROFESSIONI_LIST>)

const AMBITI_CONFIG = [
  { value: 'lavoro' as Ambito, label: 'Lavoro', emoji: '💼' },
  { value: 'studio' as Ambito, label: 'Studio', emoji: '📖' },
  { value: 'personale' as Ambito, label: 'Uso personale', emoji: '🏠' },
]

const TONI = [
  { value: 'formale', label: 'Formale e preciso' },
  { value: 'diretto', label: 'Diretto e conciso' },
  { value: 'colloquiale', label: 'Colloquiale e semplice' },
]

const STUDI = [
  { value: 'universita', label: 'Università' },
  { value: 'liceo', label: 'Liceo' },
  { value: 'media', label: 'Scuola media' },
  { value: 'professionale', label: 'Formazione professionale' },
]

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function getFileIcon(mime: string) {
  if (mime === 'application/pdf') return '📄'
  if (mime.includes('word')) return '📝'
  if (mime.includes('sheet')) return '📊'
  if (mime.includes('presentation')) return '📑'
  if (mime.startsWith('image/')) return '🖼️'
  if (mime.startsWith('text/') || mime === 'application/json') return '📝'
  return '📎'
}

function normalizeAmbitoData(raw: Record<string, unknown>): AmbitoData {
  return {
    ambito: raw.ambito as Ambito,
    professione: (raw.professione as string) || '',
    utilizzo: (raw.utilizzo as string) || '',
    specializzazioni: Array.isArray(raw.specializzazioni)
      ? raw.specializzazioni as string[]
      : raw.specializzazione ? [raw.specializzazione as string] : [],
    specializzazione_custom: (raw.specializzazione_custom as string) || '',
    fonti: (raw.fonti as Fonte[]) || [],
    fonti_escluse: (raw.fonti_escluse as string[]) || [],
    citazione: (raw.citazione as string) || 'sempre',
    conflitto_fonti: (raw.conflitto_fonti as string) || 'gerarchia',
    tono: (raw.tono as string) || 'formale',
    livello_studio: (raw.livello_studio as string) || '',
    materia_studio: (raw.materia_studio as string) || '',
    uso_personale: (raw.uso_personale as string) || '',
  }
}

interface FolderProgress {
  totale: number
  completati: number
  corrente: string
  errori: number
}

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [folderProgress, setFolderProgress] = useState<FolderProgress | null>(null)
  const [activeTab, setActiveTab] = useState<'ambiti' | 'file' | 'drive' | 'prompt' | 'link'>('ambiti')
  const [shares, setShares] = useState<ShareLink[]>([])
  const [sharesLoading, setSharesLoading] = useState(false)
  const [activeAmbito, setActiveAmbito] = useState<Ambito | null>(null)
  const [nomeUtente, setNomeUtente] = useState('')
  const [ambitiData, setAmbitiData] = useState<AmbitoData[]>([])
  const [profileFiles, setProfileFiles] = useState<UserFile[]>([])
  const [systemPrompt, setSystemPrompt] = useState('')
  const [systemPromptExtras, setSystemPromptExtras] = useState<Record<string, string>>({})
  const [promptAmbitoView, setPromptAmbitoView] = useState<string>('lavoro')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [activeFileAmbito, setActiveFileAmbito] = useState<string>('tutti')
  const [driveFolders, setDriveFolders] = useState<DriveFolder[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const savedProfessione = useRef<string>('')

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    setNomeUtente(user.user_metadata?.nome || user.email?.split('@')[0] || '')

    const { data: ambiti } = await supabase
      .from('user_ambiti').select('*').eq('user_id', user.id).eq('attivo', true)
    if (ambiti && ambiti.length > 0) {
      setAmbitiData(ambiti.map(a => normalizeAmbitoData(a.onboarding_data)))
      setActiveAmbito(ambiti[0].onboarding_data.ambito)
      const lavoro = ambiti.find(a => a.onboarding_data?.ambito === 'lavoro')
      savedProfessione.current = lavoro?.onboarding_data?.professione || ''
      setSystemPromptExtras(Object.fromEntries(ambiti.map(a => [a.ambito, a.system_prompt_extra || ''])))
      setPromptAmbitoView(lavoro ? 'lavoro' : ambiti[0].ambito)
    }

    const { data: config } = await supabase
      .from('user_configs').select('system_prompt_base, drive_folders').eq('user_id', user.id).single()
    if (config) {
      setSystemPrompt(config.system_prompt_base)
      if (config.drive_folders) setDriveFolders(config.drive_folders)
    }

    const { data: files } = await supabase
      .from('user_files').select('*').eq('user_id', user.id)
      .eq('tipo_contesto', 'profile').order('created_at', { ascending: false })
    if (files) setProfileFiles(files)

    setLoading(false)
  }

  async function loadShares() {
    setSharesLoading(true)
    try {
      const res = await fetch('/api/conversations/shares')
      if (res.ok) setShares(await res.json())
    } finally {
      setSharesLoading(false)
    }
  }

  async function revokeShare(conversationId: string) {
    await fetch(`/api/conversations/${conversationId}/share`, { method: 'DELETE' })
    setShares(prev => prev.filter(s => s.conversation_id !== conversationId))
    setSuccessMsg('Link revocato')
    setTimeout(() => setSuccessMsg(''), 2000)
  }

  function formatExpiry(expiresAt: string | null): string {
    if (!expiresAt) return 'Nessuna scadenza'
    const d = new Date(expiresAt)
    const now = new Date()
    if (d < now) return 'Scaduto'
    return `Scade ${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }

  function updateAmbitoField(ambito: Ambito, field: keyof AmbitoData, value: unknown) {
    setAmbitiData(prev => prev.map(a => a.ambito === ambito ? { ...a, [field]: value } : a))
  }

  function toggleEscludi(ambito: Ambito, fonteId: string) {
    const ad = ambitiData.find(a => a.ambito === ambito)
    if (!ad) return
    updateAmbitoField(ambito, 'fonti_escluse',
      ad.fonti_escluse.includes(fonteId)
        ? ad.fonti_escluse.filter(f => f !== fonteId)
        : [...ad.fonti_escluse, fonteId]
    )
  }

  function onDragStart(index: number) { setDragIndex(index) }
  function onDragOver(e: React.DragEvent, index: number, ambito: Ambito) {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return
    const ad = ambitiData.find(a => a.ambito === ambito)
    if (!ad) return
    const newFonti = [...ad.fonti]
    const [moved] = newFonti.splice(dragIndex, 1)
    newFonti.splice(index, 0, moved)
    updateAmbitoField(ambito, 'fonti', newFonti)
    setDragIndex(index)
  }
  function onDragEnd() { setDragIndex(null) }

  function refreshFonti(ambito: Ambito, professione: string, utilizzo: string, specializzazioni: string[]) {
    if (!professione || !utilizzo || specializzazioni.length === 0) return
    const fonti = getFontiMultiple(professione, utilizzo, specializzazioni)
    if (fonti.length > 0) updateAmbitoField(ambito, 'fonti', fonti)
  }

  async function saveAmbito(ambito: Ambito) {
    const ad = ambitiData.find(a => a.ambito === ambito)
    if (!ad) return

    if (ambito === 'lavoro' && ad.professione && ad.professione !== savedProfessione.current) {
      await regeneratePrompt()
      savedProfessione.current = ad.professione
      localStorage.setItem('assistente_intro', '1')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('user_ambiti')
        .upsert({ user_id: user.id, ambito, onboarding_data: ad, attivo: true }, { onConflict: 'user_id,ambito' })
      setSuccessMsg('Salvato!')
      setTimeout(() => setSuccessMsg(''), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function regeneratePrompt() {
    setSaving(true)
    try {
      const res = await fetch('/api/onboarding/generate-multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeUtente, ambitiData, note_libere: '' }),
      })
      const json = await res.json()
      if (!json.system_prompt) throw new Error('Errore generazione')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('user_configs').upsert(
        { user_id: user.id, system_prompt_base: json.system_prompt }, { onConflict: 'user_id' }
      )
      for (let i = 0; i < ambitiData.length; i++) {
        await supabase.from('user_ambiti').upsert({
          user_id: user.id, ambito: ambitiData[i].ambito,
          onboarding_data: ambitiData[i], system_prompt_extra: json.ambiti_prompts?.[i] || '', attivo: true,
        }, { onConflict: 'user_id,ambito' })
      }
      setSystemPrompt(json.system_prompt)
      setSystemPromptExtras(Object.fromEntries(ambitiData.map((ad, i) => [ad.ambito, json.ambiti_prompts?.[i] || ''])))
      const lavoro = ambitiData.find(a => a.ambito === 'lavoro')
      if (lavoro) savedProfessione.current = lavoro.professione
      setSuccessMsg('System prompt rigenerato!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('tipo_contesto', 'profile')
      if (activeFileAmbito && activeFileAmbito !== 'tutti') {
        formData.append('ambito', activeFileAmbito)
      }
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      setProfileFiles(prev => [{
        id: data.id, nome: data.nome, mime_type: data.mime_type,
        dimensione: data.dimensione, created_at: new Date().toISOString(),
        storage_path: data.storage_path,
        ambito: data.ambito || null,
      }, ...prev])
      setSuccessMsg('File caricato!')
      setTimeout(() => setSuccessMsg(''), 2000)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Upload cartella locale ──────────────────────────────────
  async function handleFolderUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const fileDaCaricare = files.filter(f => {
      const path = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name
      return !deveIgnorare(path)
    })

    if (fileDaCaricare.length === 0) return

    setFolderProgress({ totale: fileDaCaricare.length, completati: 0, corrente: '', errori: 0 })
    let errori = 0
    const nuoviFile: UserFile[] = []

    for (let i = 0; i < fileDaCaricare.length; i++) {
      const file = fileDaCaricare[i]
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name

      setFolderProgress(prev => prev ? { ...prev, completati: i, corrente: relativePath } : null)

      try {
        const formData = new FormData()
        const fileConPercorso = new File([file], relativePath.replace(/\\/g, '/'), { type: file.type })
        formData.append('file', fileConPercorso)
        formData.append('tipo_contesto', 'profile')
        if (activeFileAmbito && activeFileAmbito !== 'tutti') {
          formData.append('ambito', activeFileAmbito)
        }

        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()

        if (data.error) {
          errori++
        } else {
          nuoviFile.push({
            id: data.id, nome: data.nome, mime_type: data.mime_type,
            dimensione: data.dimensione, created_at: new Date().toISOString(),
            storage_path: data.storage_path, ambito: data.ambito || null,
          })
        }
      } catch {
        errori++
      }
    }

    setProfileFiles(prev => [...nuoviFile.reverse(), ...prev])
    setFolderProgress({ totale: fileDaCaricare.length, completati: fileDaCaricare.length, corrente: '', errori })
    setSuccessMsg(`Cartella caricata! ${fileDaCaricare.length - errori} file, ${errori} errori`)
    setTimeout(() => { setSuccessMsg(''); setFolderProgress(null) }, 4000)

    if (folderInputRef.current) folderInputRef.current.value = ''
  }
  // ─────────────────────────────────────────────────────────────

  async function deleteFile(fileId: string, storagePath: string) {
    const supabase = createClient()
    await supabase.storage.from('user-files').remove([storagePath])
    await supabase.from('user_files').delete().eq('id', fileId)
    setProfileFiles(prev => prev.filter(f => f.id !== fileId))
  }

  async function deleteFolder(files: { id: string; storage_path: string }[]) {
    const supabase = createClient()
    const paths = files.map(f => f.storage_path)
    const ids = files.map(f => f.id)
    await supabase.storage.from('user-files').remove(paths)
    await supabase.from('user_files').delete().in('id', ids)
    setProfileFiles(prev => prev.filter(f => !ids.includes(f.id)))
  }

  async function saveDriveFolders() {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('user_configs').upsert(
        { user_id: user.id, drive_folders: driveFolders },
        { onConflict: 'user_id' }
      )
      setSuccessMsg('Cartelle Drive salvate!')
      setTimeout(() => setSuccessMsg(''), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Caricamento...</p>
      </div>
    )
  }

  const currentAmbito = ambitiData.find(a => a.ambito === activeAmbito)

  return (
    <div className="min-h-screen bg-gray-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/chat')}
            className="w-9 h-9 flex items-center justify-center text-gray-400 active:text-gray-600 rounded-xl">
            ←
          </button>
          <div>
            <h1 className="text-base font-semibold text-gray-900">Profilo</h1>
            <p className="text-xs text-gray-400">{nomeUtente}</p>
          </div>
        </div>
        {successMsg && <span className="text-sm text-green-600 font-medium">{successMsg}</span>}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">

        {/* Tab */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 overflow-x-auto"
          style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {[
            { key: 'ambiti', label: 'Ambiti' },
            { key: 'file', label: 'File' },
            { key: 'drive', label: '🗂 Drive' },
            { key: 'prompt', label: 'Prompt' },
            { key: 'link', label: '🔗 Link' },
          ].map(tab => (
            <button key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as 'ambiti' | 'file' | 'drive' | 'prompt' | 'link')
                if (tab.key === 'link') loadShares()
              }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB AMBITI */}
        {activeTab === 'ambiti' && (
          <div>
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1"
              style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              {ambitiData.map(ad => {
                const config = AMBITI_CONFIG.find(a => a.value === ad.ambito)
                return (
                  <button key={ad.ambito} onClick={() => setActiveAmbito(ad.ambito)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                      activeAmbito === ad.ambito
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 bg-white text-gray-700'
                    }`}>
                    <span>{config?.emoji}</span><span>{config?.label}</span>
                  </button>
                )
              })}
            </div>

            {currentAmbito && (
              <div className="space-y-4">
                {currentAmbito.ambito === 'lavoro' && (
                  <>
                    <div className="bg-white rounded-2xl border border-gray-200 p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">Professione</h3>
                      <div className="space-y-4">
                        {Object.entries(PROFESSIONI_PER_CATEGORIA).map(([categoria, professioni]) => (
                          <div key={categoria}>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">{categoria}</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {professioni.map(p => (
                                <button key={p.value}
                                  onClick={() => {
                                    updateAmbitoField('lavoro', 'professione', p.value)
                                    updateAmbitoField('lavoro', 'utilizzo', '')
                                    updateAmbitoField('lavoro', 'specializzazioni', [])
                                    updateAmbitoField('lavoro', 'fonti', [])
                                  }}
                                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-xs font-medium transition-all text-center ${
                                    currentAmbito.professione === p.value
                                      ? 'border-gray-900 bg-gray-900 text-white'
                                      : 'border-gray-200 text-gray-700'
                                  }`}>
                                  <span className="text-xl">{p.emoji}</span>
                                  <span className="leading-tight">{p.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {currentAmbito.professione && currentAmbito.professione !== 'altro' &&
                      UTILIZZI[currentAmbito.professione as Professione]?.length > 0 && (
                      <div className="bg-white rounded-2xl border border-gray-200 p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Utilizzo principale</h3>
                        <div className="space-y-2">
                          {UTILIZZI[currentAmbito.professione as Professione].map(u => (
                            <button key={u.value}
                              onClick={() => {
                                updateAmbitoField('lavoro', 'utilizzo', u.value)
                                updateAmbitoField('lavoro', 'specializzazioni', [])
                                updateAmbitoField('lavoro', 'fonti', [])
                              }}
                              className={`w-full px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all ${
                                currentAmbito.utilizzo === u.value
                                  ? 'border-gray-900 bg-gray-900 text-white'
                                  : 'border-gray-200 text-gray-700'
                              }`}>
                              {u.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentAmbito.utilizzo &&
                      SPECIALIZZAZIONI[`${currentAmbito.professione}_${currentAmbito.utilizzo}`]?.length > 0 && (
                      <div className="bg-white rounded-2xl border border-gray-200 p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">Specializzazione</h3>
                        <p className="text-xs text-gray-400 mb-3">Puoi selezionarne più di una</p>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {SPECIALIZZAZIONI[`${currentAmbito.professione}_${currentAmbito.utilizzo}`].map(s => {
                            const selected = (currentAmbito.specializzazioni || []).includes(s.value)
                            return (
                              <button key={s.value}
                                onClick={() => {
                                  const curr = currentAmbito.specializzazioni || []
                                  const next = selected
                                    ? curr.filter(x => x !== s.value)
                                    : [...curr, s.value]
                                  updateAmbitoField('lavoro', 'specializzazioni', next)
                                  refreshFonti('lavoro', currentAmbito.professione, currentAmbito.utilizzo, next)
                                }}
                                className={`w-full px-4 py-3 rounded-xl border text-sm font-medium text-left flex items-center justify-between transition-all ${
                                  selected ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-700'
                                }`}>
                                <span>{s.label}</span>
                                {selected && <span>✓</span>}
                              </button>
                            )
                          })}
                        </div>
                        <input type="text"
                          value={currentAmbito.specializzazione_custom || ''}
                          onChange={e => updateAmbitoField('lavoro', 'specializzazione_custom', e.target.value)}
                          placeholder="Altra specializzazione..."
                          className="mt-3 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900" />
                      </div>
                    )}

                    {currentAmbito.fonti.length > 0 && (
                      <div className="bg-white rounded-2xl border border-gray-200 p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">Gerarchia fonti</h3>
                        <p className="text-xs text-gray-400 mb-4">Trascina per riordinare</p>
                        <div className="space-y-2">
                          {currentAmbito.fonti.map((fonte, index) => (
                            <div key={fonte.id} draggable
                              onDragStart={() => onDragStart(index)}
                              onDragOver={e => onDragOver(e, index, 'lavoro')}
                              onDragEnd={onDragEnd}
                              className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-grab transition-all ${
                                dragIndex === index ? 'opacity-50' : ''
                              } ${currentAmbito.fonti_escluse.includes(fonte.id) ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                              <span className="text-gray-300 text-sm font-mono">{index + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${currentAmbito.fonti_escluse.includes(fonte.id) ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                  {fonte.label}
                                </p>
                                {fonte.descrizione && <p className="text-xs text-gray-400 truncate">{fonte.descrizione}</p>}
                              </div>
                              <button onClick={() => toggleEscludi('lavoro', fonte.id)}
                                className={`text-xs px-2.5 py-1.5 rounded-lg flex-shrink-0 ${
                                  currentAmbito.fonti_escluse.includes(fonte.id) ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                                }`}>
                                {currentAmbito.fonti_escluse.includes(fonte.id) ? 'Ripristina' : 'Escludi'}
                              </button>
                              <span className="text-gray-300 flex-shrink-0">⠿</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-white rounded-2xl border border-gray-200 p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Citazione fonti</h3>
                      <div className="space-y-2">
                        {[
                          { value: 'sempre', label: 'Sempre con riferimento preciso' },
                          { value: 'essenziale', label: 'Solo quando essenziale' },
                          { value: 'mai', label: 'Mai — solo contenuto' },
                        ].map(c => (
                          <button key={c.value} onClick={() => updateAmbitoField('lavoro', 'citazione', c.value)}
                            className={`w-full px-4 py-3 rounded-xl border text-sm text-left transition-all ${
                              currentAmbito.citazione === c.value
                                ? 'border-gray-900 bg-gray-900 text-white'
                                : 'border-gray-200 text-gray-700'
                            }`}>
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {currentAmbito.ambito === 'studio' && (
                  <>
                  <div className="bg-white rounded-2xl border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Materia / Corso di studio</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {['Ingegneria', 'Medicina', 'Giurisprudenza', 'Economia', 'Psicologia', 'Architettura', 'Informatica', 'Scienze politiche', 'Lettere', 'Fisica / Matematica', 'Biologia', 'Chimica'].map(m => (
                        <button key={m} onClick={() => updateAmbitoField('studio', 'materia_studio', m)}
                          className={`px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                            currentAmbito.materia_studio === m
                              ? 'border-gray-900 bg-gray-900 text-white'
                              : 'border-gray-200 text-gray-700'
                          }`}>
                          {m}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={currentAmbito.materia_studio}
                      onChange={e => updateAmbitoField('studio', 'materia_studio', e.target.value)}
                      placeholder="Altra materia..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Livello scolastico</h3>
                    <div className="space-y-2">
                      {STUDI.map(s => (
                        <button key={s.value} onClick={() => updateAmbitoField('studio', 'livello_studio', s.value)}
                          className={`w-full px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all ${
                            currentAmbito.livello_studio === s.value
                              ? 'border-gray-900 bg-gray-900 text-white'
                              : 'border-gray-200 text-gray-700'
                          }`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  </>
                )}

                {currentAmbito.ambito === 'personale' && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Uso principale</h3>
                    <div className="space-y-2">
                      {['Organizzazione', 'Scrittura', 'Ricerca', 'Hobby', 'Benessere'].map(u => (
                        <button key={u} onClick={() => updateAmbitoField('personale', 'uso_personale', u.toLowerCase())}
                          className={`w-full px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all ${
                            currentAmbito.uso_personale === u.toLowerCase()
                              ? 'border-gray-900 bg-gray-900 text-white'
                              : 'border-gray-200 text-gray-700'
                          }`}>
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Tono</h3>
                  <div className="space-y-2">
                    {TONI.map(t => (
                      <button key={t.value} onClick={() => updateAmbitoField(currentAmbito.ambito, 'tono', t.value)}
                        className={`w-full px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all ${
                          currentAmbito.tono === t.value
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-200 text-gray-700'
                        }`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pb-4">
                  <button onClick={() => saveAmbito(currentAmbito.ambito)} disabled={saving}
                    className="flex-1 bg-gray-900 text-white rounded-xl py-3.5 text-sm font-medium active:bg-gray-800 disabled:opacity-40 transition-colors">
                    {saving ? 'Salvo...' : 'Salva modifiche'}
                  </button>
                  <button onClick={regeneratePrompt} disabled={saving}
                    className="px-4 py-3.5 border border-gray-200 rounded-xl text-sm text-gray-600 active:border-gray-400 disabled:opacity-40 transition-colors"
                    title="Rigenera il system prompt">
                    🔄
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB FILE */}
        {activeTab === 'file' && (
          <div>
            <div className="flex gap-1 mb-4 overflow-x-auto" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              {[
                { key: 'tutti', label: 'Tutti', emoji: '📁' },
                ...ambitiData.map(ad => {
                  const cfg = AMBITI_CONFIG.find(a => a.value === ad.ambito)
                  return { key: ad.ambito, label: cfg?.label || ad.ambito, emoji: cfg?.emoji || '' }
                }),
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveFileAmbito(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                    activeFileAmbito === tab.key
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}>
                  <span>{tab.emoji}</span><span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  {activeFileAmbito === 'tutti' ? 'Tutti i file permanenti' : `File — ${AMBITI_CONFIG.find(a => a.value === activeFileAmbito)?.label || activeFileAmbito}`}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {activeFileAmbito === 'tutti' ? 'Tutti i file caricati permanentemente' : `Disponibili nelle chat ${AMBITI_CONFIG.find(a => a.value === activeFileAmbito)?.label?.toLowerCase() || ''}`}
                </p>
              </div>
              {/* Bottoni upload */}
              <div className="flex gap-2">
                <button onClick={() => folderInputRef.current?.click()} disabled={!!folderProgress}
                  className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-2.5 rounded-xl text-sm font-medium active:bg-gray-50 disabled:opacity-40 transition-colors">
                  📁
                </button>
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium active:bg-gray-800 disabled:opacity-40 transition-colors">
                  {uploading ? '...' : '+ File'}
                </button>
              </div>
            </div>

            {/* Progress upload cartella */}
            {folderProgress && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-blue-800">
                    Caricamento cartella... {folderProgress.completati}/{folderProgress.totale}
                  </p>
                  {folderProgress.errori > 0 && (
                    <p className="text-xs text-amber-600">{folderProgress.errori} saltati</p>
                  )}
                </div>
                <div className="w-full bg-blue-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(folderProgress.completati / folderProgress.totale) * 100}%` }}
                  />
                </div>
                {folderProgress.corrente && (
                  <p className="text-xs text-blue-500 mt-1.5 truncate">{folderProgress.corrente}</p>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp,.ts,.tsx,.js,.jsx,.py,.json,.md,.csv,.html,.css,.yaml,.yml"
              onChange={handleFileUpload} className="hidden" />

            {/* Input cartella — webkitdirectory */}
            <input
              ref={folderInputRef}
              type="file"
              // @ts-expect-error webkitdirectory non è nel tipo standard
              webkitdirectory=""
              multiple
              onChange={handleFolderUpload}
              className="hidden"
            />

            {(() => {
              const filtered = activeFileAmbito === 'tutti'
                ? profileFiles
                : profileFiles.filter(f => f.ambito === activeFileAmbito)
              return filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                  <p className="text-gray-400 text-sm">Nessun file caricato</p>
                  <p className="text-gray-300 text-xs mt-1">Carica file singoli o un&apos;intera cartella</p>
                </div>
              ) : (
                <FileTree files={filtered} onDelete={deleteFile} onDeleteFolder={deleteFolder} />
              )
            })()}
          </div>
        )}

        {/* TAB DRIVE */}
        {activeTab === 'drive' && (
          <div>
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Cartelle Google Drive</h2>
              <p className="text-xs text-gray-400 mt-0.5">L&apos;AI le consulta automaticamente in tutte le chat</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 mb-4 flex gap-2">
              <span className="text-base flex-shrink-0">💡</span>
              <p className="text-xs text-blue-700 leading-relaxed">
                Le cartelle Drive non sono legate a nessun ambito specifico. Aggiungi sempre un contesto chiaro così l&apos;AI sa quando consultarle.
              </p>
            </div>
            <DriveFolderPicker folders={driveFolders} onChange={setDriveFolders} />
            <button onClick={saveDriveFolders} disabled={saving}
              className="mt-4 w-full bg-gray-900 text-white rounded-xl py-3.5 text-sm font-medium active:bg-gray-800 disabled:opacity-40 transition-colors">
              {saving ? 'Salvo...' : 'Salva cartelle Drive'}
            </button>
          </div>
        )}

        {/* TAB SYSTEM PROMPT */}
        {activeTab === 'prompt' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">System prompt attivo</h2>
                <p className="text-xs text-gray-400 mt-0.5">Prompt completo inviato a Claude</p>
              </div>
              <button onClick={regeneratePrompt} disabled={saving}
                className="flex items-center gap-2 border border-gray-200 text-gray-600 px-3 py-2 rounded-xl text-sm active:border-gray-400 disabled:opacity-40 transition-colors">
                🔄 {saving ? 'Rigenerando...' : 'Rigenera'}
              </button>
            </div>

            {/* Selettore ambito */}
            {Object.keys(systemPromptExtras).length > 1 && (
              <div className="flex gap-2 mb-3">
                {Object.keys(systemPromptExtras).map(a => (
                  <button key={a} onClick={() => setPromptAmbitoView(a)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      promptAmbitoView === a ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                    {a === 'lavoro' ? '💼 Lavoro' : a === 'studio' ? '📖 Studio' : '🏠 Personale'}
                  </button>
                ))}
              </div>
            )}

            {/* Prompt base */}
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-500 mb-1.5 px-1">Base</p>
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
                  rows={5} className="w-full text-sm text-gray-900 font-mono leading-relaxed resize-none focus:outline-none" />
              </div>
            </div>

            {/* Estensione ambito */}
            {systemPromptExtras[promptAmbitoView] && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-1.5 px-1">
                  Estensione {promptAmbitoView === 'lavoro' ? 'lavoro' : promptAmbitoView === 'studio' ? 'studio' : 'personale'}
                </p>
                <div className="bg-white rounded-2xl border border-gray-200 p-4 max-h-72 overflow-y-auto">
                  <pre className="text-sm text-gray-700 font-mono leading-relaxed whitespace-pre-wrap">{systemPromptExtras[promptAmbitoView]}</pre>
                </div>
              </div>
            )}

            <button
              onClick={async () => {
                setSaving(true)
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                  await supabase.from('user_configs').upsert(
                    { user_id: user.id, system_prompt_base: systemPrompt }, { onConflict: 'user_id' }
                  )
                  setSuccessMsg('Salvato!')
                  setTimeout(() => setSuccessMsg(''), 2000)
                }
                setSaving(false)
              }}
              disabled={saving}
              className="mt-1 w-full bg-gray-900 text-white rounded-xl py-3.5 text-sm font-medium active:bg-gray-800 disabled:opacity-40 transition-colors">
              {saving ? 'Salvo...' : 'Salva prompt base'}
            </button>
          </div>
        )}

        {/* TAB LINK CONDIVISI */}
        {activeTab === 'link' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Link condivisi</h2>
                <p className="text-xs text-gray-400 mt-0.5">Conversazioni con link pubblico attivo</p>
              </div>
              <button onClick={loadShares} disabled={sharesLoading}
                className="text-xs text-gray-400 border border-gray-200 px-3 py-2 rounded-xl active:bg-gray-50 disabled:opacity-40">
                {sharesLoading ? '...' : '↻ Aggiorna'}
              </button>
            </div>

            {sharesLoading ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <p className="text-gray-400 text-sm">Caricamento...</p>
              </div>
            ) : shares.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <p className="text-gray-400 text-sm">Nessun link condiviso attivo</p>
                <p className="text-gray-300 text-xs mt-1">Condividi una conversazione dalla chat per vederla qui</p>
              </div>
            ) : (
              <div className="space-y-2">
                {shares.map(share => {
                  const url = `${window.location.origin}/conv/${share.share_token}`
                  return (
                    <div key={share.share_token} className="bg-white rounded-2xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{share.titolo}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs ${new Date(share.expires_at || '9999') < new Date() ? 'text-red-500' : 'text-gray-400'}`}>
                              {formatExpiry(share.expires_at)}
                            </span>
                            {share.has_password && (
                              <span className="text-xs text-gray-400">• Password</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => revokeShare(share.conversation_id)}
                          className="flex-shrink-0 text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg active:bg-red-50 transition-colors">
                          Revoca
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="flex-1 text-xs text-gray-400 font-mono truncate bg-gray-50 rounded-lg px-3 py-2">
                          {url}
                        </p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(url)
                            setSuccessMsg('Link copiato!')
                            setTimeout(() => setSuccessMsg(''), 2000)
                          }}
                          className="flex-shrink-0 text-xs text-gray-600 border border-gray-200 px-3 py-2 rounded-lg active:bg-gray-50 transition-colors">
                          Copia
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Zona pericolosa */}
        <div className="mt-10 pt-6 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Zona pericolosa</p>
          <div className="bg-white rounded-2xl border border-red-100 p-4">
            <p className="text-sm font-medium text-gray-900 mb-1">Elimina account</p>
            <p className="text-xs text-gray-400 mb-4">
              Elimina permanentemente il tuo account, tutte le conversazioni, i file e le impostazioni. Questa azione è irreversibile.
            </p>
            <button
              onClick={async () => {
                if (!confirm('Sei sicuro? Questa azione è irreversibile e cancellerà tutti i tuoi dati.')) return
                if (!confirm('Ultima conferma: eliminare definitivamente l\'account?')) return
                const res = await fetch('/api/account/delete', { method: 'DELETE' })
                if (res.ok) {
                  const supabase = createClient()
                  await supabase.auth.signOut()
                  router.push('/')
                } else {
                  const d = await res.json()
                  alert(d.error || 'Errore durante l\'eliminazione')
                }
              }}
              className="text-sm text-red-500 border border-red-200 px-4 py-2.5 rounded-xl active:bg-red-50 transition-colors"
            >
              Elimina il mio account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
