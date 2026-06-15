'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { modelColor, modelLabel, formatCosto } from '@/lib/model-pricing'

interface User {
  id: string
  email: string
  created_at: string
  nome: string
  system_prompt_base: string
  system_prompts: { ambito: string; prompt: string }[]
  ambiti: string[]
  approvato: boolean
  limite_mensile: number
  modello_max: string | null
}

interface Skill {
  id: string
  slug: string
  label: string
  extra_sys: string
  categoria: string
  pubblica: boolean
  professione: string
}

const PROFESSIONI = [
  { value: 'generale', label: '🌐 Generale (tutti)' },
  { value: 'avvocato', label: '⚖️ Avvocato' },
  { value: 'commercialista', label: '🧾 Commercialista' },
  { value: 'medico', label: '🩺 Medico' },
  { value: 'farmacista', label: '💊 Farmacista' },
  { value: 'psicologo', label: '🧠 Psicologo' },
  { value: 'fisioterapista', label: '🏃 Fisioterapista' },
  { value: 'ingegnere', label: '🏗️ Ingegnere' },
  { value: 'architetto', label: '📐 Architetto' },
  { value: 'revisore_contabile', label: '📊 Revisore contabile' },
  { value: 'notaio', label: '📜 Notaio' },
  { value: 'editore', label: '📖 Editore / Editor' },
]

interface AdminFile {
  id: string
  user_id: string
  nome: string
  mime_type: string
  dimensione: number
  tipo_contesto: string
  ambito: string | null
  tipo: string | null
  url: string | null
  created_at: string
}

type FileContent =
  | { type: 'text'; testo: string; nome: string }
  | { type: 'image'; url: string; nome: string }
  | { type: 'link'; url: string }

interface PersonalSkillAdmin {
  id: string
  user_id: string
  slug: string
  label: string
  extra_sys: string
}

interface AuditLog {
  id: string
  user_id: string
  user_email: string
  action: string
  metadata: Record<string, unknown>
  created_at: string
}

interface ConvMessage {
  id: string
  ruolo: 'user' | 'assistant'
  contenuto: string
  modello: string | null
  costo_stimato: number | null
  created_at: string
}

interface Stats {
  totale_messaggi: number
  totale_costo: number
  totale_tokens: number
  per_modello: { model: string; label: string; count: number; tokens_input: number; tokens_output: number; costo_totale: number }[]
  per_utente: { user_id: string; messaggi: number; costo_totale: number; modelli: Record<string, number> }[]
  per_giorno: { data: string; costo: number }[]
}

function actionColor(action: string): string {
  switch (action) {
    case 'chat_message':  return 'bg-blue-100 text-blue-700'
    case 'file_upload':   return 'bg-green-100 text-green-700'
    case 'share_create':  return 'bg-purple-100 text-purple-700'
    case 'share_revoke':  return 'bg-orange-100 text-orange-700'
    case 'account_delete': return 'bg-red-100 text-red-700'
    case 'user_approved': return 'bg-teal-100 text-teal-700'
    case 'limit_changed': return 'bg-amber-100 text-amber-700'
    case 'model_cap_changed': return 'bg-amber-100 text-amber-700'
    case 'admin_file_deleted':  return 'bg-red-100 text-red-700'
    case 'admin_skill_deleted': return 'bg-red-100 text-red-700'
    default:              return 'bg-gray-100 text-gray-600'
  }
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

function fileTipoCategoria(file: AdminFile): string {
  if (file.tipo === 'link') return 'link'
  const m = file.mime_type || ''
  if (m.startsWith('image/')) return 'immagine'
  if (m === 'application/pdf') return 'pdf'
  if (m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || m === 'application/msword') return 'word'
  if (m === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || m === 'application/vnd.ms-excel') return 'excel'
  if (m === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return 'pptx'
  if (m.startsWith('text/') || m === 'application/json' || m === 'application/xml') return 'testo'
  return 'altro'
}

function metadataSummary(action: string, meta: Record<string, unknown>): string {
  switch (action) {
    case 'chat_message':
      return `model=${meta.model} ambito=${meta.ambito || '—'} in=${meta.tokens_input} out=${meta.tokens_output}`
    case 'file_upload':
      return `${meta.nome} (${meta.mime_type}) ${meta.tipo_contesto}`
    case 'share_create':
      return `conv=${String(meta.conversation_id).slice(0, 8)}… expires=${meta.expires_in || 'mai'} pwd=${meta.has_password}`
    case 'share_revoke':
      return `conv=${String(meta.conversation_id).slice(0, 8)}…`
    case 'account_delete':
      return 'account eliminato'
    case 'user_approved':
      return `target=${String(meta.target_user_id).slice(0, 8)}… approvato=${meta.approvato}`
    case 'limit_changed':
      return `target=${String(meta.target_user_id).slice(0, 8)}… limite=$${meta.limite_mensile}/mese`
    case 'model_cap_changed':
      return `target=${String(meta.target_user_id).slice(0, 8)}… cap=${meta.modello_max || 'rimosso'}`
    case 'admin_file_deleted':
      return `${meta.nome} target=${String(meta.target_user_id).slice(0, 8)}…`
    case 'admin_skill_deleted':
      return `${meta.label} target=${String(meta.target_user_id).slice(0, 8)}…`
    default:
      return JSON.stringify(meta).slice(0, 80)
  }
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'utenti' | 'skill' | 'file' | 'stats' | 'audit'>('utenti')
  const [adminFiles, setAdminFiles] = useState<AdminFile[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [fileUserFilter, setFileUserFilter] = useState('')
  const [fileTypeFilter, setFileTypeFilter] = useState('')
  const [fileContextFilter, setFileContextFilter] = useState('')
  const [expandedFile, setExpandedFile] = useState<string | null>(null)
  const [fileContents, setFileContents] = useState<Record<string, FileContent | 'loading' | 'error'>>({})
  const [personalSkills, setPersonalSkills] = useState<PersonalSkillAdmin[]>([])
  const [expandedPersonalSkill, setExpandedPersonalSkill] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [passwordUser, setPasswordUser] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [limitUser, setLimitUser] = useState<string | null>(null)
  const [newLimit, setNewLimit] = useState('')
  const [savingLimit, setSavingLimit] = useState(false)
  const [modelCapUser, setModelCapUser] = useState<string | null>(null)
  const [newModelCap, setNewModelCap] = useState('')
  const [savingModelCap, setSavingModelCap] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [newSkill, setNewSkill] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditOffset, setAuditOffset] = useState(0)
  const [auditFilters, setAuditFilters] = useState({ action: '', user_email: '', date_from: '', date_to: '' })
  const [convLogId, setConvLogId] = useState<string | null>(null)
  const [convData, setConvData] = useState<{ titolo: string; messaggi: ConvMessage[] } | null>(null)
  const [convLoading, setConvLoading] = useState(false)
  const [convError, setConvError] = useState('')
  const [skillForm, setSkillForm] = useState({
    slug: '', label: '', extra_sys: '', categoria: 'generale', pubblica: true, professione: 'generale'
  })

  useEffect(() => { checkAdminAndLoad() }, [])

  async function checkAdminAndLoad() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: admin } = await supabase.from('admins').select('user_id').eq('user_id', user.id).single()
    if (!admin) { router.push('/chat'); return }
    await Promise.all([loadUsers(), loadSkills()])
    setLoading(false)
  }

  async function loadUsers() {
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    setUsers(data.users || [])
  }

  async function loadSkills() {
    const supabase = createClient()
    // Solo skill globali: quelle personali (user_id valorizzato) si gestiscono dal profilo
    const { data } = await supabase.from('skills').select('*').is('user_id', null).order('categoria')
    setSkills(data || [])
  }

  async function loadAdminFiles() {
    setFilesLoading(true)
    try {
      const res = await fetch('/api/admin/files')
      const data = await res.json()
      setAdminFiles(data.files || [])
    } finally {
      setFilesLoading(false)
    }
  }

  async function loadFileContent(file: AdminFile) {
    const id = file.id
    if (expandedFile === id) {
      setExpandedFile(null)
      return
    }
    setExpandedFile(id)
    if (fileContents[id]) return
    setFileContents(prev => ({ ...prev, [id]: 'loading' }))
    try {
      const res = await fetch(`/api/admin/files/${id}`)
      const data = await res.json()
      if (!res.ok) {
        setFileContents(prev => ({ ...prev, [id]: 'error' }))
      } else {
        setFileContents(prev => ({ ...prev, [id]: data as FileContent }))
      }
    } catch {
      setFileContents(prev => ({ ...prev, [id]: 'error' }))
    }
  }

  async function deleteAdminFile(file: AdminFile) {
    if (!confirm(`Eliminare "${file.nome}" di ${getUserEmail(file.user_id)}?`)) return
    const res = await fetch('/api/admin/files', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: file.id }),
    })
    if (res.ok) {
      setAdminFiles(prev => prev.filter(f => f.id !== file.id))
      setSuccessMsg('File eliminato')
      setTimeout(() => setSuccessMsg(''), 2000)
    }
  }

  async function loadPersonalSkills() {
    const res = await fetch('/api/admin/personal-skills')
    const data = await res.json()
    setPersonalSkills(data.skills || [])
  }

  async function deletePersonalSkill(skill: PersonalSkillAdmin) {
    if (!confirm(`Eliminare la skill "${skill.label}" di ${getUserEmail(skill.user_id)}?`)) return
    const res = await fetch('/api/admin/personal-skills', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill_id: skill.id }),
    })
    if (res.ok) {
      setPersonalSkills(prev => prev.filter(s => s.id !== skill.id))
      setSuccessMsg('Skill eliminata')
      setTimeout(() => setSuccessMsg(''), 2000)
    }
  }

  async function loadStats() {
    // Niente cache: i dati vanno ricaricati a ogni apertura del tab,
    // altrimenti restano quelli della prima visita finché non si ricarica la pagina
    const res = await fetch('/api/admin/stats')
    const data = await res.json()
    setStats(data)
  }

  async function loadAuditLogs(reset = true, filters = auditFilters, offset = 0) {
    setAuditLoading(true)
    if (reset) setAuditOffset(0)
    const params = new URLSearchParams()
    if (filters.action) params.set('action', filters.action)
    if (filters.user_email) params.set('user_email', filters.user_email)
    if (filters.date_from) params.set('date_from', filters.date_from)
    if (filters.date_to) params.set('date_to', filters.date_to)
    params.set('offset', String(reset ? 0 : offset))
    const res = await fetch(`/api/admin/audit?${params}`)
    const data = await res.json()
    if (reset) {
      setAuditLogs(data.logs || [])
    } else {
      setAuditLogs(prev => [...prev, ...(data.logs || [])])
    }
    setAuditTotal(data.total || 0)
    setAuditLoading(false)
  }

  async function toggleConversation(log: AuditLog) {
    const conversationId = log.metadata?.conversation_id
    if (!conversationId) return
    if (convLogId === log.id) {
      setConvLogId(null)
      setConvData(null)
      setConvError('')
      return
    }
    setConvLogId(log.id)
    setConvData(null)
    setConvError('')
    setConvLoading(true)
    const res = await fetch(`/api/admin/conversations/${conversationId}`)
    const data = await res.json()
    if (!res.ok) {
      setConvError(data.error || 'Errore caricamento conversazione')
    } else {
      setConvData({ titolo: data.conversazione?.titolo || 'Senza titolo', messaggi: data.messaggi || [] })
    }
    setConvLoading(false)
  }

  async function saveSkill() {
    setSaving(true)
    try {
      const supabase = createClient()
      if (editingSkill) {
        const { error } = await supabase.from('skills').update(skillForm).eq('id', editingSkill.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('skills').insert(skillForm)
        if (error) throw error
      }
      setSuccessMsg('Skill salvata!')
      setTimeout(() => setSuccessMsg(''), 2000)
      setEditingSkill(null)
      setNewSkill(false)
      loadSkills()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message || 'Errore sconosciuto'
      alert('Errore salvataggio: ' + msg)
      console.error('saveSkill error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function deleteSkill(skillId: string) {
    if (!confirm('Eliminare questa skill?')) return
    const supabase = createClient()
    await supabase.from('skills').delete().eq('id', skillId)
    loadSkills()
  }

  async function approveUser(userId: string, approvato: boolean) {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, approvato }),
    })
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, approvato } : u))
  }

  async function deleteUser(userId: string) {
    if (!confirm('Eliminare questo utente e tutti i suoi dati?')) return
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    if (res.ok) loadUsers()
  }

  async function changePassword(userId: string) {
    if (!newPassword || newPassword.length < 8) return
    setSavingPassword(true)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, new_password: newPassword }),
    })
    setSavingPassword(false)
    if (res.ok) {
      setPasswordUser(null)
      setNewPassword('')
      setSuccessMsg('Password aggiornata!')
      setTimeout(() => setSuccessMsg(''), 2000)
    } else {
      const data = await res.json()
      alert(data.error || 'Errore aggiornamento password')
    }
  }

  async function changeLimit(userId: string) {
    const limite = Number(newLimit)
    if (!Number.isFinite(limite) || limite <= 0 || limite > 1000) return
    setSavingLimit(true)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, limite_mensile: limite }),
    })
    setSavingLimit(false)
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, limite_mensile: limite } : u))
      setLimitUser(null)
      setNewLimit('')
      setSuccessMsg('Limite aggiornato!')
      setTimeout(() => setSuccessMsg(''), 2000)
    } else {
      const data = await res.json()
      alert(data.error || 'Errore aggiornamento limite')
    }
  }

  async function changeModelCap(userId: string) {
    setSavingModelCap(true)
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, modello_max: newModelCap || null }),
    })
    setSavingModelCap(false)
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, modello_max: newModelCap || null } : u))
      setModelCapUser(null)
      setNewModelCap('')
      setSuccessMsg('Cap modello aggiornato!')
      setTimeout(() => setSuccessMsg(''), 2000)
    } else {
      const data = await res.json()
      alert(data.error || 'Errore aggiornamento cap modello')
    }
  }

  function openEditSkill(skill: Skill) {
    setEditingSkill(skill)
    setSkillForm({ slug: skill.slug, label: skill.label, extra_sys: skill.extra_sys, categoria: skill.categoria, pubblica: skill.pubblica, professione: skill.professione || 'generale' })
    setNewSkill(false)
  }

  function openNewSkill() {
    setNewSkill(true)
    setEditingSkill(null)
    setSkillForm({ slug: '', label: '', extra_sys: '', categoria: 'generale', pubblica: true, professione: 'generale' })
  }

  function getUserEmail(userId: string) {
    return users.find(u => u.id === userId)?.email || userId.slice(0, 8) + '...'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Caricamento...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Header — safe area top, padding ridotto su mobile */}
      <div
        className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/chat')}
            className="w-9 h-9 flex items-center justify-center text-gray-400 active:text-gray-600 rounded-xl"
          >
            ←
          </button>
          <div>
            <h1 className="text-base font-semibold text-gray-900">Admin Panel</h1>
            <p className="text-xs text-gray-400">{users.length} utenti · {skills.length} skill</p>
          </div>
        </div>
        {successMsg && <span className="text-sm text-green-600 font-medium">{successMsg}</span>}
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4">

        {/* Tab — scrollabile orizzontalmente su mobile */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 overflow-x-auto" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {[
            { key: 'utenti', label: `Utenti (${users.length})` },
            { key: 'skill', label: `Skill (${skills.length})` },
            { key: 'file', label: '📁 File' },
            { key: 'stats', label: '📊 Stats' },
            { key: 'audit', label: '🔍 Audit' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as 'utenti' | 'skill' | 'file' | 'stats' | 'audit')
                if (tab.key === 'skill') loadPersonalSkills()
                if (tab.key === 'file') loadAdminFiles()
                if (tab.key === 'stats') loadStats()
                if (tab.key === 'audit') loadAuditLogs(true)
              }}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB UTENTI */}
        {activeTab === 'utenti' && (
          <div className="space-y-3">
            {users.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <p className="text-gray-400 text-sm">Nessun utente registrato</p>
              </div>
            ) : (
              users.map(user => (
                <div key={user.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{user.nome || 'Senza nome'}</p>
                        {user.ambiti?.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {user.ambiti.map(a => (
                              <span key={a} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{a}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{user.email}</p>
                      <p className="text-xs text-gray-300 mt-0.5">
                        {new Date(user.created_at).toLocaleDateString('it-IT')} · limite ${user.limite_mensile.toFixed(2)}/mese
                      </p>
                    </div>
                    {/* Bottoni verticali su mobile per più spazio */}
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => approveUser(user.id, !user.approvato)}
                        className={`text-xs px-3 py-2 rounded-lg transition-colors ${
                          user.approvato
                            ? 'border border-green-200 text-green-600 bg-green-50 active:bg-green-100'
                            : 'border border-orange-200 text-orange-600 bg-orange-50 active:bg-orange-100'
                        }`}
                      >
                        {user.approvato ? '✓ Approvato' : 'Approva'}
                      </button>
                      <button
                        onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
                        className="text-xs px-3 py-2 border border-gray-200 rounded-lg text-gray-600 active:border-gray-400 transition-colors"
                      >
                        {selectedUser?.id === user.id ? 'Chiudi' : 'Prompt'}
                      </button>
                      <button
                        onClick={() => { setPasswordUser(passwordUser === user.id ? null : user.id); setNewPassword('') }}
                        className="text-xs px-3 py-2 border border-gray-200 rounded-lg text-gray-600 active:border-gray-400 transition-colors"
                      >
                        Password
                      </button>
                      <button
                        onClick={() => { setLimitUser(limitUser === user.id ? null : user.id); setNewLimit(String(user.limite_mensile)) }}
                        className="text-xs px-3 py-2 border border-gray-200 rounded-lg text-gray-600 active:border-gray-400 transition-colors"
                      >
                        Limite
                      </button>
                      <button
                        onClick={() => { setModelCapUser(modelCapUser === user.id ? null : user.id); setNewModelCap(user.modello_max || '') }}
                        className={`text-xs px-3 py-2 border rounded-lg transition-colors ${user.modello_max ? 'border-amber-200 text-amber-600 bg-amber-50 active:bg-amber-100' : 'border-gray-200 text-gray-600 active:border-gray-400'}`}
                      >
                        {user.modello_max ? `Cap: ${user.modello_max}` : 'Modello'}
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="text-xs px-3 py-2 border border-red-200 rounded-lg text-red-500 active:bg-red-50 transition-colors"
                      >
                        Elimina
                      </button>
                    </div>
                  </div>
                  {passwordUser === user.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Nuova password (min 8 caratteri)"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-9 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(v => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          tabIndex={-1}
                        >
                          {showNewPassword ? '🙈' : '👁️'}
                        </button>
                      </div>
                      <button
                        onClick={() => changePassword(user.id)}
                        disabled={savingPassword || newPassword.length < 8}
                        className="text-xs px-3 py-2 bg-gray-900 text-white rounded-lg disabled:opacity-40 transition-colors"
                      >
                        {savingPassword ? '...' : 'Salva'}
                      </button>
                    </div>
                  )}

                  {limitUser === user.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 items-center">
                      <span className="text-xs text-gray-500 flex-shrink-0">Limite mensile $</span>
                      <input
                        type="number"
                        min="0.5"
                        max="1000"
                        step="0.5"
                        value={newLimit}
                        onChange={e => setNewLimit(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                      <button
                        onClick={() => changeLimit(user.id)}
                        disabled={savingLimit || !Number.isFinite(Number(newLimit)) || Number(newLimit) <= 0 || Number(newLimit) > 1000}
                        className="text-xs px-3 py-2 bg-gray-900 text-white rounded-lg disabled:opacity-40 transition-colors"
                      >
                        {savingLimit ? '...' : 'Salva'}
                      </button>
                    </div>
                  )}

                  {modelCapUser === user.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 items-center flex-wrap">
                      <span className="text-xs text-gray-500 flex-shrink-0">Cap modello</span>
                      <select
                        value={newModelCap}
                        onChange={e => setNewModelCap(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      >
                        <option value="">Automatico (nessun cap)</option>
                        <option value="sonnet">Max Sonnet — risparmio ~80%</option>
                        <option value="haiku">Max Haiku — risparmio ~95%</option>
                      </select>
                      <button
                        onClick={() => changeModelCap(user.id)}
                        disabled={savingModelCap}
                        className="text-xs px-3 py-2 bg-gray-900 text-white rounded-lg disabled:opacity-40 transition-colors"
                      >
                        {savingModelCap ? '...' : 'Salva'}
                      </button>
                    </div>
                  )}

                  {selectedUser?.id === user.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                      {user.system_prompts.length > 0 ? user.system_prompts.map(sp => (
                        <div key={sp.ambito}>
                          <p className="text-xs font-medium text-gray-500 mb-1.5 capitalize">{sp.ambito}</p>
                          <div className="bg-gray-50 rounded-xl p-4">
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
                              {sp.prompt}
                            </pre>
                          </div>
                        </div>
                      )) : (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1.5">Base</p>
                          <div className="bg-gray-50 rounded-xl p-4">
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
                              {user.system_prompt_base || 'Nessun system prompt configurato'}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB SKILL */}
        {activeTab === 'skill' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-500">Skill disponibili per tutti</p>
              <button
                onClick={openNewSkill}
                className="bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium active:bg-gray-800 transition-colors"
              >
                + Nuova
              </button>
            </div>

            {(newSkill || editingSkill) && (
              <div className="bg-white rounded-2xl border border-gray-900 p-5 mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  {editingSkill ? `Modifica: ${editingSkill.label}` : 'Nuova skill'}
                </h3>
                <div className="space-y-3">
                  {/* Grid 1 colonna su mobile, 2 su desktop */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Label</label>
                      <input
                        type="text"
                        value={skillForm.label}
                        onChange={e => setSkillForm(p => ({ ...p, label: e.target.value }))}
                        placeholder="Es. Risposte brevi"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Slug</label>
                      <input
                        type="text"
                        value={skillForm.slug}
                        onChange={e => setSkillForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                        placeholder="Es. risposte_brevi"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Categoria</label>
                      <input
                        type="text"
                        value={skillForm.categoria}
                        onChange={e => setSkillForm(p => ({ ...p, categoria: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={skillForm.pubblica}
                          onChange={e => setSkillForm(p => ({ ...p, pubblica: e.target.checked }))}
                        />
                        <span className="text-sm text-gray-700">Pubblica</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Professione</label>
                    <select
                      value={skillForm.professione}
                      onChange={e => setSkillForm(p => ({ ...p, professione: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    >
                      {PROFESSIONI.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Extra System Prompt</label>
                    <textarea
                      value={skillForm.extra_sys}
                      onChange={e => setSkillForm(p => ({ ...p, extra_sys: e.target.value }))}
                      placeholder="Istruzioni aggiuntive da iniettare..."
                      rows={5}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={saveSkill}
                      disabled={saving || !skillForm.label || !skillForm.slug || !skillForm.extra_sys}
                      className="flex-1 bg-gray-900 text-white rounded-xl py-3 text-sm font-medium active:bg-gray-800 disabled:opacity-40 transition-colors"
                    >
                      {saving ? 'Salvo...' : 'Salva skill'}
                    </button>
                    <button
                      onClick={() => { setEditingSkill(null); setNewSkill(false) }}
                      className="px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 active:border-gray-400 transition-colors"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {(() => {
                // Raggruppa per professione, poi per categoria
                const byProfessione = skills.reduce((acc, s) => {
                  const prof = s.professione || 'generale'
                  if (!acc[prof]) acc[prof] = {}
                  if (!acc[prof][s.categoria]) acc[prof][s.categoria] = []
                  acc[prof][s.categoria].push(s)
                  return acc
                }, {} as Record<string, Record<string, Skill[]>>)

                // Generale prima, poi le altre professioni in ordine
                const ordine = ['generale', ...PROFESSIONI.filter(p => p.value !== 'generale').map(p => p.value)]

                return ordine
                  .filter(prof => byProfessione[prof])
                  .map(prof => {
                    const profLabel = PROFESSIONI.find(p => p.value === prof)?.label || prof
                    const categorie = byProfessione[prof]
                    return (
                      <div key={prof} className="mb-6">
                        <div className="flex items-center gap-2 mb-3 mt-4">
                          <p className="text-sm font-semibold text-gray-700">{profLabel}</p>
                          <span className="text-xs text-gray-400">
                            ({Object.values(categorie).flat().length})
                          </span>
                        </div>
                        {Object.entries(categorie).map(([categoria, categorySkills]) => (
                          <div key={categoria} className="mb-3">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 ml-1">{categoria}</p>
                            {categorySkills.map(skill => (
                              <div key={skill.id} className="bg-white rounded-2xl border border-gray-200 p-4 mb-2">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <p className="text-sm font-semibold text-gray-900">{skill.label}</p>
                                      <span className="text-xs text-gray-400 font-mono">{skill.slug}</span>
                                      {!skill.pubblica && (
                                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Privata</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500 line-clamp-2">{skill.extra_sys}</p>
                                  </div>
                                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                                    <button
                                      onClick={() => openEditSkill(skill)}
                                      className="text-xs px-3 py-2 border border-gray-200 rounded-lg text-gray-600 active:border-gray-400 transition-colors"
                                    >
                                      Modifica
                                    </button>
                                    <button
                                      onClick={() => deleteSkill(skill.id)}
                                      className="text-xs px-3 py-2 border border-red-200 rounded-lg text-red-500 active:bg-red-50 transition-colors"
                                    >
                                      Elimina
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )
                  })
              })()}
            </div>

            {/* Skill personali degli utenti */}
            <div className="mt-6">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-900">✦ Skill personali degli utenti ({personalSkills.length})</h3>
                <p className="text-xs text-gray-400 mt-0.5">Create dagli utenti dal profilo o dalla chat — visibili solo a chi le ha create</p>
              </div>
              {personalSkills.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
                  <p className="text-gray-400 text-sm">Nessuna skill personale</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {personalSkills.map(skill => (
                    <div key={skill.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900">✦ {skill.label}</p>
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{getUserEmail(skill.user_id)}</span>
                          </div>
                          <p className={`text-xs text-gray-500 ${expandedPersonalSkill === skill.id ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>{skill.extra_sys}</p>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => setExpandedPersonalSkill(p => p === skill.id ? null : skill.id)}
                            className="text-xs px-3 py-2 border border-gray-200 rounded-lg text-gray-600 active:border-gray-400 transition-colors"
                          >
                            {expandedPersonalSkill === skill.id ? 'Chiudi' : 'Vedi'}
                          </button>
                          <button
                            onClick={() => deletePersonalSkill(skill)}
                            className="text-xs px-3 py-2 border border-red-200 rounded-lg text-red-500 active:bg-red-50 transition-colors"
                          >
                            Elimina
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB FILE UTENTI */}
        {activeTab === 'file' && (
          <div>
            <div className="flex items-center justify-between mb-4 gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">File degli utenti ({adminFiles.length})</h2>
                <p className="text-xs text-gray-400 mt-0.5">Documenti e link caricati nel profilo o in chat</p>
              </div>
              <button onClick={loadAdminFiles} disabled={filesLoading}
                className="text-xs text-gray-400 border border-gray-200 px-3 py-2 rounded-xl active:bg-gray-50 disabled:opacity-40 flex-shrink-0">
                {filesLoading ? '...' : '↻ Aggiorna'}
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <select value={fileUserFilter} onChange={e => setFileUserFilter(e.target.value)}
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none focus:border-gray-400">
                <option value="">Tutti gli utenti</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
              </select>
              <select value={fileTypeFilter} onChange={e => setFileTypeFilter(e.target.value)}
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none focus:border-gray-400">
                <option value="">Tutti i tipi</option>
                <option value="pdf">PDF</option>
                <option value="immagine">Immagini</option>
                <option value="word">Word</option>
                <option value="excel">Excel</option>
                <option value="pptx">PowerPoint</option>
                <option value="testo">Testo / Codice</option>
                <option value="link">Link</option>
                <option value="altro">Altro</option>
              </select>
              <select value={fileContextFilter} onChange={e => setFileContextFilter(e.target.value)}
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none focus:border-gray-400">
                <option value="">Profilo + Chat</option>
                <option value="profile">Profilo</option>
                <option value="chat">Chat</option>
              </select>
            </div>

            {filesLoading ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <p className="text-gray-400 text-sm">Caricamento...</p>
              </div>
            ) : (() => {
              let filtrati = fileUserFilter ? adminFiles.filter(f => f.user_id === fileUserFilter) : adminFiles
              if (fileTypeFilter) filtrati = filtrati.filter(f => fileTipoCategoria(f) === fileTypeFilter)
              if (fileContextFilter) filtrati = filtrati.filter(f => f.tipo_contesto === fileContextFilter)
              return filtrati.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                  <p className="text-gray-400 text-sm">Nessun file</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtrati.map(file => (
                    <div key={file.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.tipo === 'link' ? '🔗' : file.mime_type?.startsWith('image/') ? '🖼️' : '📄'} {file.nome}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{getUserEmail(file.user_id)}</span>
                            {file.tipo !== 'link' && <span className="text-xs text-gray-400">{formatFileSize(file.dimensione)}</span>}
                            <span className="text-xs text-gray-400">{file.tipo_contesto}{file.ambito ? ` · ${file.ambito}` : ''}</span>
                            <span className="text-xs text-gray-400">{new Date(file.created_at).toLocaleDateString('it-IT')}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => loadFileContent(file)}
                            className="text-xs px-3 py-2 border border-gray-200 rounded-lg text-gray-600 active:border-gray-400 transition-colors"
                          >
                            {expandedFile === file.id ? 'Chiudi' : 'Visualizza'}
                          </button>
                          {file.tipo !== 'link' && (
                            <a
                              href={`/api/admin/files/${file.id}/download`}
                              className="text-xs px-3 py-2 border border-blue-200 rounded-lg text-blue-600 active:bg-blue-50 transition-colors text-center"
                            >
                              Scarica
                            </a>
                          )}
                          <button
                            onClick={() => deleteAdminFile(file)}
                            className="text-xs px-3 py-2 border border-red-200 rounded-lg text-red-500 active:bg-red-50 transition-colors"
                          >
                            Elimina
                          </button>
                        </div>
                      </div>

                      {expandedFile === file.id && (() => {
                        const content = fileContents[file.id]
                        if (!content || content === 'loading') {
                          return (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-xs text-gray-400">Caricamento...</p>
                            </div>
                          )
                        }
                        if (content === 'error') {
                          return (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-xs text-red-400">Errore caricamento contenuto</p>
                            </div>
                          )
                        }
                        if (content.type === 'link') {
                          return (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-xs text-gray-500 mb-1">URL</p>
                              <a href={content.url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-blue-600 underline break-all">
                                {content.url}
                              </a>
                            </div>
                          )
                        }
                        if (content.type === 'image') {
                          return (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={content.url} alt={content.nome}
                                className="max-w-full max-h-96 rounded-xl object-contain bg-gray-50" />
                            </div>
                          )
                        }
                        return (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            {content.testo ? (
                              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto max-h-96 overflow-y-auto bg-gray-50 rounded-xl p-3">
                                {content.testo}
                              </pre>
                            ) : (
                              <p className="text-xs text-gray-400">Nessun testo estratto</p>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}

        {/* TAB STATISTICHE */}
        {activeTab === 'stats' && (
          <div>
            {!stats ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <p className="text-gray-400 text-sm">Caricamento statistiche...</p>
              </div>
            ) : (
              <div className="space-y-4">

                {/* KPI — 1 colonna su mobile, 3 su desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white rounded-2xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-400 mb-1">Messaggi totali</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totale_messaggi.toLocaleString()}</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-400 mb-1">Costo stimato</p>
                    <p className="text-2xl font-semibold text-gray-900">${stats.totale_costo.toFixed(4)}</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-400 mb-1">Token totali</p>
                    <p className="text-2xl font-semibold text-gray-900">{(stats.totale_tokens / 1000).toFixed(1)}K</p>
                  </div>
                </div>

                {/* Per modello */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Distribuzione modelli</h3>
                  {stats.per_modello.length === 0 ? (
                    <p className="text-xs text-gray-400">Nessun dato ancora</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.per_modello.sort((a, b) => b.count - a.count).map(m => {
                        const pct = stats.totale_messaggi > 0 ? Math.round((m.count / stats.totale_messaggi) * 100) : 0
                        return (
                          <div key={m.model}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${modelColor(m.model)}`}>{m.label}</span>
                                <span className="text-xs text-gray-500">{m.count} msg · {pct}%</span>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-medium text-gray-900">${m.costo_totale.toFixed(4)}</p>
                                <p className="text-xs text-gray-400">{((m.tokens_input + m.tokens_output) / 1000).toFixed(1)}K token</p>
                              </div>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-gray-900 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Per utente */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Costo per utente</h3>
                  {(() => {
                    // In coda alla lista anche gli utenti registrati senza messaggi, a costo zero
                    const conCosti = new Set(stats.per_utente.map(u => u.user_id))
                    const aCostoZero = users
                      .filter(u => !conCosti.has(u.id))
                      .map(u => ({ user_id: u.id, messaggi: 0, costo_totale: 0, modelli: {} as Record<string, number> }))
                    const tutti = [...stats.per_utente, ...aCostoZero]
                    return tutti.length === 0 ? (
                    <p className="text-xs text-gray-400">Nessun dato ancora</p>
                  ) : (
                    <div className="space-y-2">
                      {tutti.map(u => (
                        <div key={u.user_id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">{getUserEmail(u.user_id)}</p>
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {Object.entries(u.modelli).map(([mod, count]) => (
                                <span key={mod} className={`text-xs px-1.5 py-0.5 rounded ${modelColor(mod.toLowerCase().includes('haiku') ? 'haiku' : mod.toLowerCase().includes('opus') ? 'opus' : 'sonnet')}`}>
                                  {mod}: {count}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-sm font-medium text-gray-900">{formatCosto(u.costo_totale)}</p>
                            <p className="text-xs text-gray-400">{u.messaggi} msg</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                  })()}
                </div>

                {/* Grafico giornaliero */}
                {stats.per_giorno.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Costo ultimi 30 giorni</h3>
                    <div className="flex items-end gap-0.5 h-20">
                      {(() => {
                        const max = Math.max(...stats.per_giorno.map(d => d.costo), 0.0001)
                        return stats.per_giorno.map(d => (
                          <div
                            key={d.data}
                            className="flex-1 bg-gray-900 rounded-t opacity-80"
                            style={{ height: `${(d.costo / max) * 100}%`, minHeight: '2px' }}
                            title={`${d.data}: ${formatCosto(d.costo)}`}
                          />
                        ))
                      })()}
                    </div>
                    <div className="flex justify-between mt-1">
                      <p className="text-xs text-gray-400">{stats.per_giorno[0]?.data}</p>
                      <p className="text-xs text-gray-400">{stats.per_giorno[stats.per_giorno.length - 1]?.data}</p>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}
        {/* TAB AUDIT */}
        {activeTab === 'audit' && (
          <div>
            {/* Filtri */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Azione</label>
                  <select
                    value={auditFilters.action}
                    onChange={e => setAuditFilters(f => ({ ...f, action: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    <option value="">Tutte</option>
                    <option value="chat_message">chat_message</option>
                    <option value="file_upload">file_upload</option>
                    <option value="share_create">share_create</option>
                    <option value="share_revoke">share_revoke</option>
                    <option value="account_delete">account_delete</option>
                    <option value="user_approved">user_approved</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Email utente</label>
                  <input
                    type="text"
                    value={auditFilters.user_email}
                    onChange={e => setAuditFilters(f => ({ ...f, user_email: e.target.value }))}
                    placeholder="cerca@email.com"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Dal</label>
                  <input
                    type="date"
                    value={auditFilters.date_from}
                    onChange={e => setAuditFilters(f => ({ ...f, date_from: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Al</label>
                  <input
                    type="date"
                    value={auditFilters.date_to}
                    onChange={e => setAuditFilters(f => ({ ...f, date_to: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>
              <button
                onClick={() => loadAuditLogs(true, auditFilters, 0)}
                disabled={auditLoading}
                className="w-full bg-gray-900 text-white rounded-xl py-2.5 text-sm font-medium active:bg-gray-800 disabled:opacity-40 transition-colors"
              >
                {auditLoading ? 'Caricamento...' : 'Applica filtri'}
              </button>
            </div>

            {/* Contatore */}
            <p className="text-xs text-gray-400 mb-3">
              {auditTotal} eventi totali · mostrati {auditLogs.length}
            </p>

            {/* Lista eventi */}
            {auditLogs.length === 0 && !auditLoading ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <p className="text-gray-400 text-sm">Nessun evento trovato</p>
              </div>
            ) : (
              <div className="space-y-2">
                {auditLogs.map(log => {
                  const hasConv = !!log.metadata?.conversation_id
                  return (
                  <div
                    key={log.id}
                    onClick={() => hasConv && toggleConversation(log)}
                    className={`bg-white rounded-2xl border p-3 transition-colors ${hasConv ? 'border-gray-200 cursor-pointer active:bg-gray-50' : 'border-gray-200'} ${convLogId === log.id ? 'border-gray-900' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${actionColor(log.action)}`}>
                            {log.action}
                          </span>
                          <span className="text-xs text-gray-500 truncate">{log.user_email || log.user_id?.slice(0, 8)}</span>
                          {hasConv && (
                            <span className="text-xs text-gray-400">
                              {convLogId === log.id ? '▾ chiudi chat' : '▸ leggi chat'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 font-mono truncate">
                          {metadataSummary(log.action, log.metadata)}
                        </p>
                      </div>
                      <p className="text-xs text-gray-300 flex-shrink-0 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {convLogId === log.id && (
                      <div className="mt-3 pt-3 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                        {convLoading ? (
                          <p className="text-xs text-gray-400 py-2">Caricamento conversazione...</p>
                        ) : convError ? (
                          <p className="text-xs text-red-500 py-2">{convError}</p>
                        ) : convData ? (
                          <div>
                            <p className="text-xs font-medium text-gray-700 mb-3">
                              💬 {convData.titolo} · {convData.messaggi.length} messaggi
                            </p>
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                              {convData.messaggi.map(msg => (
                                <div
                                  key={msg.id}
                                  className={`rounded-xl p-3 ${msg.ruolo === 'user' ? 'bg-gray-100 ml-6' : 'bg-blue-50 mr-6'}`}
                                >
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-xs font-medium text-gray-500">
                                      {msg.ruolo === 'user' ? 'Utente' : 'Assistente'}
                                    </span>
                                    {msg.ruolo === 'assistant' && msg.modello && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded ${modelColor(msg.modello)}`}>
                                        {modelLabel(msg.modello)}
                                      </span>
                                    )}
                                    {msg.ruolo === 'assistant' && msg.costo_stimato != null && (
                                      <span className="text-xs text-gray-400">{formatCosto(msg.costo_stimato)}</span>
                                    )}
                                    <span className="text-xs text-gray-300 ml-auto">
                                      {new Date(msg.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed break-words">
                                    {msg.contenuto}
                                  </p>
                                </div>
                              ))}
                              {convData.messaggi.length === 0 && (
                                <p className="text-xs text-gray-400 py-2">Nessun messaggio in questa conversazione</p>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                  )
                })}

                {auditLogs.length < auditTotal && (
                  <button
                    onClick={() => {
                      const newOffset = auditOffset + 50
                      setAuditOffset(newOffset)
                      loadAuditLogs(false, auditFilters, newOffset)
                    }}
                    disabled={auditLoading}
                    className="w-full py-3 border border-gray-200 rounded-2xl text-sm text-gray-600 active:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    {auditLoading ? 'Caricamento...' : `Carica altri (${auditTotal - auditLogs.length} rimanenti)`}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
