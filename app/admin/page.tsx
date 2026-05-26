'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'utenti' | 'skill'>('utenti')
  const [users, setUsers] = useState<User[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [newSkill, setNewSkill] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  // Form nuova/modifica skill
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

  async function saveSkill() {
    setSaving(true)
    try {
      const supabase = createClient()
      if (editingSkill) {
        await supabase
          .from('skills')
          .update(skillForm)
          .eq('id', editingSkill.id)
      } else {
        await supabase
          .from('skills')
          .insert(skillForm)
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
      slug: skill.slug,
      label: skill.label,
      extra_sys: skill.extra_sys,
      categoria: skill.categoria,
      pubblica: skill.pubblica,
    })
    setNewSkill(false)
  }

  function openNewSkill() {
    setNewSkill(true)
    setEditingSkill(null)
    setSkillForm({ slug: '', label: '', extra_sys: '', categoria: 'generale', pubblica: true })
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
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'utenti' | 'skill')}
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

                  {/* System prompt espandibile */}
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

            {/* Form nuova/modifica skill */}
            {(newSkill || editingSkill) && (
              <div className="bg-white rounded-2xl border border-gray-900 p-6 mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  {editingSkill ? `Modifica: ${editingSkill.label}` : 'Nuova skill'}
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Label (nome visibile)</label>
                      <input
                        type="text"
                        value={skillForm.label}
                        onChange={e => setSkillForm(p => ({ ...p, label: e.target.value }))}
                        placeholder="Es. Risposte brevi"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Slug (identificatore unico)</label>
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
                        placeholder="Es. stile, professionale, educazione"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={skillForm.pubblica}
                          onChange={e => setSkillForm(p => ({ ...p, pubblica: e.target.checked }))}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700">Pubblica (visibile a tutti)</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Extra System Prompt (extra_sys)</label>
                    <textarea
                      value={skillForm.extra_sys}
                      onChange={e => setSkillForm(p => ({ ...p, extra_sys: e.target.value }))}
                      placeholder="Istruzioni aggiuntive da iniettare nel system prompt quando questa skill è attiva..."
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

            {/* Lista skill */}
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
      </div>
    </div>
  )
}
