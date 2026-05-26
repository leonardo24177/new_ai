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
  uso_personale: string
}

interface UserFile {
  id: string
  nome: string
  mime_type: string
  dimensione: number
  created_at: string
  storage_path: string
}

// Raggruppa professioni per categoria (stesso approccio dell'onboarding)
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
    uso_personale: (raw.uso_personale as string) || '',
  }
}

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState<'ambiti' | 'file' | 'prompt'>('ambiti')
  const [activeAmbito, setActiveAmbito] = useState<Ambito | null>(null)
  const [nomeUtente, setNomeUtente] = useState('')
  const [ambitiData, setAmbitiData] = useState<AmbitoData[]>([])
  const [profileFiles, setProfileFiles] = useState<UserFile[]>([])
  const [systemPrompt, setSystemPrompt] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    }

    const { data: config } = await supabase
      .from('user_configs').select('system_prompt_base').eq('user_id', user.id).single()
    if (config) setSystemPrompt(config.system_prompt_base)

    const { data: files } = await supabase
      .from('user_files').select('*').eq('user_id', user.id)
      .eq('tipo_contesto', 'profile').order('created_at', { ascending: false })
    if (files) setProfileFiles(files)

    setLoading(false)
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
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const ad = ambitiData.find(a => a.ambito === ambito)
      if (!ad) return
      await supabase.from('user_ambiti')
        .upsert({ user_id: user.id, ambito, onboarding_data: ad }, { onConflict: 'user_id,ambito' })
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
          onboarding_data: ambitiData[i], system_prompt_extra: json.ambiti_prompts?.[i] || '',
        }, { onConflict: 'user_id,ambito' })
      }
      setSystemPrompt(json.system_prompt)
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
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      setProfileFiles(prev => [{
        id: data.id, nome: data.nome, mime_type: data.mime_type,
        dimensione: data.dimensione, created_at: new Date().toISOString(),
        storage_path: data.storage_path,
      }, ...prev])
      setSuccessMsg('File caricato!')
      setTimeout(() => setSuccessMsg(''), 2000)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function deleteFile(fileId: string, storagePath: string) {
    const supabase = createClient()
    await supabase.storage.from('user-files').remove([storagePath])
    await supabase.from('user_files').delete().eq('id', fileId)
    setProfileFiles(prev => prev.filter(f => f.id !== fileId))
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
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5"
          style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {[{ key: 'ambiti', label: 'Ambiti' }, { key: 'file', label: 'File' }, { key: 'prompt', label: 'System Prompt' }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as 'ambiti' | 'file' | 'prompt')}
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
            {/* Selettore ambito */}
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

                {/* ── LAVORO ── */}
                {currentAmbito.ambito === 'lavoro' && (
                  <>
                    {/* Professione — raggruppata per categoria, identica all'onboarding */}
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

                    {/* Utilizzo */}
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

                    {/* Specializzazione — multipla */}
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

                    {/* Fonti */}
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

                    {/* Citazione */}
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

                {/* ── STUDIO ── */}
                {currentAmbito.ambito === 'studio' && (
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
                )}

                {/* ── PERSONALE ── */}
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

                {/* Tono */}
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

                {/* Bottoni azione */}
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
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">File permanenti</h2>
                <p className="text-xs text-gray-400 mt-0.5">Disponibili in tutte le conversazioni</p>
              </div>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium active:bg-gray-800 disabled:opacity-40 transition-colors">
                {uploading ? '...' : '+ Aggiungi'}
              </button>
            </div>
            <input ref={fileInputRef} type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp"
              onChange={handleFileUpload} className="hidden" />
            {profileFiles.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <p className="text-gray-400 text-sm">Nessun file caricato</p>
                <p className="text-gray-300 text-xs mt-1">I file permanenti sono disponibili in tutte le chat</p>
              </div>
            ) : (
              <div className="space-y-2">
                {profileFiles.map(f => (
                  <div key={f.id} className="bg-white rounded-2xl border border-gray-200 px-4 py-3.5 flex items-center gap-3">
                    <span className="text-xl">{getFileIcon(f.mime_type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{f.nome}</p>
                      <p className="text-xs text-gray-400">{formatSize(f.dimensione)}</p>
                    </div>
                    <button onClick={() => deleteFile(f.id, f.storage_path)}
                      className="text-gray-300 active:text-red-500 transition-colors text-lg p-1">🗑</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB SYSTEM PROMPT */}
        {activeTab === 'prompt' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">System prompt attivo</h2>
                <p className="text-xs text-gray-400 mt-0.5">Generato automaticamente</p>
              </div>
              <button onClick={regeneratePrompt} disabled={saving}
                className="flex items-center gap-2 border border-gray-200 text-gray-600 px-3 py-2 rounded-xl text-sm active:border-gray-400 disabled:opacity-40 transition-colors">
                🔄 {saving ? 'Rigenerando...' : 'Rigenera'}
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
                rows={14} className="w-full text-sm text-gray-900 font-mono leading-relaxed resize-none focus:outline-none" />
            </div>
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
              className="mt-3 w-full bg-gray-900 text-white rounded-xl py-3.5 text-sm font-medium active:bg-gray-800 disabled:opacity-40 transition-colors">
              {saving ? 'Salvo...' : 'Salva system prompt'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
