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
  system_prompt: string
  ambiti: string[]
}

interface Skill {
  id: string
  slug: string
  label: string
  extra_sys: string
  categoria: string
  pubblica: boolean
}

interface Stats {
  totale_messaggi: number
  totale_costo: number
  totale_tokens: number
  per_modello: {
    model: string
    label: string
    count: number
    tokens_input: number
    tokens_output: number
    costo_totale: number
  }[]
  per_utente: {
    user_id: string
    messaggi: number
    costo_totale: number
    modelli: Record<string, number>
  }[]
  per_giorno: { data: string; costo: number }[]
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'utenti' | 'skill' | 'stats'>('utenti')
  const [users, setUsers] = useState<User[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [newSkill, setNewSkill] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const [skillForm, setSkillForm] = useState({
    slug: '', label: '', extra_sys: '', categoria: 'generale', pubblica: true
  })

  useEffect(() => { checkAdminAndLoad() }, [])

  async function checkAdminAndLoad() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: admin } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

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
    const { data } = await supabase
      .from('skills')
      .select('*')
      .order('categoria')
    setSkills(data || [])
  }

  async function loadStats() {
    if (stats) return // già caricato
    const res = await fetch('/api/admin/stats')
    const data = await res.json()
    setStats(data)
  }

  async function saveSkill() {
    setSaving(true)
    try {
      const supabase = createClient()
      if (editingSkill) {
        await supabase.from('skills').update(skillForm).eq('id', editingSkill.id)
      } else {
        await supabase.from('skills').insert(skillForm)
      }
      setSuccessMsg('Skill salvata!')
      setTimeout(() => setSuccessMsg(''), 2000)
      setEditingSkill(null)
      setNewSkill(false)
      loadSkills()
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

  async function deleteUser(userId: string) {
    if (!confirm('Eliminare questo utente e tutti i suoi dati?')) return
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    if (res.ok) loadUsers()
  }

  function openEditSkill(skill: Skill) {
    setEditingSkill(skill)
    setSkillForm({
      slug: skill.slug, label: skill.label, extra_sys: skill.extra_sys,
      categoria: skill.categoria, pubblica: skill.pubblica,
    })
    setNewSkill(false)
  }

  function openNewSkill() {
    setNewSkill(true)
    setEditingSkill(null)
    setSkillForm({ slug: '', label: '', extra_sys: '', categoria: 'generale', pubblica: true })
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/chat')} className="text-gray-400 hover:text-gray-600">←</button>
          <div>
            <h1 className="text-base font-semibold text-gray-900">Admin Panel</h1>
            <p className="text-xs text-gray-400">{users.length} utenti · {skills.length} skill</p>
          </div>
        </div>
        {successMsg && <span className="text-sm text-green-600 font-medium">{successMsg}</span>}
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Tab */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          {[
            { key: 'utenti', label: `Utenti (${users.length})` },
            { key: 'skill', label: `Skill (${skills.length})` },
            { key: 'stats', label: '📊 Statistiche' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as 'utenti' | 'skill' | 'stats')
                if (tab.key === 'stats') loadStats()
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
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
                <div key={user.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900">{user.nome || 'Senza nome'}</p>
                        {user.ambiti?.length > 0 && (
                          <div className="flex gap-1">
                            {user.ambiti.map(a => (
                              <span key={a} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{a}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{user.email}</p>
                      <p className="text-xs text-gray-300 mt-0.5">
                        Registrato: {new Date(user.created_at).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
                        className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:border-gray-400 transition-colors"
                      >
                        {selectedUser?.id === user.id ? 'Chiudi' : 'Prompt'}
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="text-xs px-3 py-1.5 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                      >
                        Elimina
                      </button>
                    </div>
                  </div>
                  {selectedUser?.id === user.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-2">System Prompt</p>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                          {user.system_prompt || 'Nessun system prompt configurato'}
                        </pre>
                      </div>
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
              <p className="text-sm text-gray-500">Gestisci le skill disponibili per tutti gli utenti</p>
              <button
                onClick={openNewSkill}
                className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                + Nuova skill
              </button>
            </div>

            {(newSkill || editingSkill) && (
              <div className="bg-white rounded-2xl border border-gray-900 p-6 mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  {editingSkill ? `Modifica: ${editingSkill.label}` : 'Nuova skill'}
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Label</label>
                      <input
                        type="text"
                        value={skillForm.label}
                        onChange={e => setSkillForm(p => ({ ...p, label: e.target.value }))}
                        placeholder="Es. Risposte brevi"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Slug</label>
                      <input
                        type="text"
                        value={skillForm.slug}
                        onChange={e => setSkillForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                        placeholder="Es. risposte_brevi"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Categoria</label>
                      <input
                        type="text"
                        value={skillForm.categoria}
                        onChange={e => setSkillForm(p => ({ ...p, categoria: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                    <div className="flex items-end pb-1">
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
                    <label className="text-xs text-gray-500 mb-1 block">Extra System Prompt</label>
                    <textarea
                      value={skillForm.extra_sys}
                      onChange={e => setSkillForm(p => ({ ...p, extra_sys: e.target.value }))}
                      placeholder="Istruzioni aggiuntive da iniettare..."
                      rows={6}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={saveSkill}
                      disabled={saving || !skillForm.label || !skillForm.slug || !skillForm.extra_sys}
                      className="flex-1 bg-gray-900 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-40 transition-colors"
                    >
                      {saving ? 'Salvo...' : 'Salva skill'}
                    </button>
                    <button
                      onClick={() => { setEditingSkill(null); setNewSkill(false) }}
                      className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-400 transition-colors"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {Object.entries(
                skills.reduce((acc, s) => {
                  if (!acc[s.categoria]) acc[s.categoria] = []
                  acc[s.categoria].push(s)
                  return acc
                }, {} as Record<string, Skill[]>)
              ).map(([categoria, categorySkills]) => (
                <div key={categoria}>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 mt-4">{categoria}</p>
                  {categorySkills.map(skill => (
                    <div key={skill.id} className="bg-white rounded-2xl border border-gray-200 p-4 mb-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-gray-900">{skill.label}</p>
                            <span className="text-xs text-gray-400 font-mono">{skill.slug}</span>
                            {!skill.pubblica && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Privata</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2">{skill.extra_sys}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => openEditSkill(skill)}
                            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:border-gray-400 transition-colors"
                          >
                            Modifica
                          </button>
                          <button
                            onClick={() => deleteSkill(skill.id)}
                            className="text-xs px-3 py-1.5 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
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

                {/* KPI */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <p className="text-xs text-gray-400 mb-1">Messaggi totali</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totale_messaggi.toLocaleString()}</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <p className="text-xs text-gray-400 mb-1">Costo totale stimato</p>
                    <p className="text-2xl font-semibold text-gray-900">${stats.totale_costo.toFixed(4)}</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-5">
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
                      {stats.per_modello
                        .sort((a, b) => b.count - a.count)
                        .map(m => {
                          const pct = stats.totale_messaggi > 0
                            ? Math.round((m.count / stats.totale_messaggi) * 100)
                            : 0
                          return (
                            <div key={m.model}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${modelColor(m.model)}`}>
                                    {m.label}
                                  </span>
                                  <span className="text-xs text-gray-500">{m.count} msg · {pct}%</span>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-medium text-gray-900">${m.costo_totale.toFixed(4)}</p>
                                  <p className="text-xs text-gray-400">
                                    {((m.tokens_input + m.tokens_output) / 1000).toFixed(1)}K token
                                  </p>
                                </div>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gray-900 rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
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
                  {stats.per_utente.length === 0 ? (
                    <p className="text-xs text-gray-400">Nessun dato ancora</p>
                  ) : (
                    <div className="space-y-2">
                      {stats.per_utente.slice(0, 10).map(u => (
                        <div key={u.user_id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">{getUserEmail(u.user_id)}</p>
                            <div className="flex gap-1 mt-0.5">
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
                  )}
                </div>

                {/* Costo per giorno */}
                {stats.per_giorno.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Costo ultimi 30 giorni</h3>
                    <div className="flex items-end gap-1 h-24">
                      {(() => {
                        const max = Math.max(...stats.per_giorno.map(d => d.costo), 0.0001)
                        return stats.per_giorno.map(d => (
                          <div
                            key={d.data}
                            className="flex-1 bg-gray-900 rounded-t opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
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
      </div>
    </div>
  )
}
