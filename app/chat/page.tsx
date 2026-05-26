'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface FileContext {
  id: string
  nome: string
  testo: string
  mime_type: string
  dimensione: number
}

interface Conversation {
  id: string
  titolo: string | null
  created_at: string
  skill_slug: string | null
}

type Ambito = 'lavoro' | 'studio' | 'personale' | null

const AMBITI_CONFIG = [
  { value: 'lavoro' as Ambito, label: 'Lavoro', emoji: '💼' },
  { value: 'studio' as Ambito, label: 'Studio', emoji: '📖' },
  { value: 'personale' as Ambito, label: 'Personale', emoji: '🏠' },
]

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const hasWarning = !isUser && message.content.startsWith('⚠️ FONTE NON VERIFICATA')
  let warningText = ''
  let mainContent = message.content
  if (hasWarning) {
    const parts = message.content.split('\n\n')
    warningText = parts[0]
    mainContent = parts.slice(1).join('\n\n')
  }
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className="max-w-[80%]">
        {hasWarning && (
          <div className="mb-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-800 font-medium">{warningText}</p>
          </div>
        )}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${isUser ? 'bg-gray-900 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
          {isUser ? (
            <span className="whitespace-pre-wrap">{mainContent}</span>
          ) : (
            <ReactMarkdown components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-sm">{children}</li>,
              h1: ({ children }) => <h1 className="text-base font-bold mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-sm font-bold mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
              code: ({ children }) => <code className="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
              pre: ({ children }) => <pre className="bg-gray-200 text-gray-800 p-3 rounded-lg text-xs font-mono overflow-x-auto mb-2">{children}</pre>,
              blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-400 pl-3 italic text-gray-600 mb-2">{children}</blockquote>,
            }}>
              {mainContent}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  )
}

function FileChip({ file, onRemove }: { file: FileContext; onRemove: () => void }) {
  function getIcon() {
    if (file.mime_type === 'application/pdf') return '📄'
    if (file.mime_type.includes('word')) return '📝'
    if (file.mime_type.includes('sheet')) return '📊'
    if (file.mime_type.includes('presentation')) return '📑'
    if (file.mime_type.startsWith('image/')) return '🖼️'
    return '📎'
  }
  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }
  return (
    <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-xs">
      <span>{getIcon()}</span>
      <span className="text-gray-700 font-medium truncate max-w-[120px]">{file.nome}</span>
      <span className="text-gray-400">{formatSize(file.dimensione)}</span>
      <button onClick={onRemove} className="text-gray-400 hover:text-gray-600 ml-1">✕</button>
    </div>
  )
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Oggi'
  if (days === 1) return 'Ieri'
  if (days < 7) return `${days} giorni fa`
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

export default function ChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [nomeAssistente, setNomeAssistente] = useState('Assistente')
  const [nomeUtente, setNomeUtente] = useState('')
  const [fileContexts, setFileContexts] = useState<FileContext[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [skills, setSkills] = useState<{ id: string; slug: string; label: string; extra_sys: string }[]>([])
  const [activeSkills, setActiveSkills] = useState<string[]>([])
  const [showSkills, setShowSkills] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [ambitoAttivo, setAmbitoAttivo] = useState<Ambito>(null)
  const [ambitiDisponibili, setAmbitiDisponibili] = useState<string[]>([])
  const [showAmbitoMenu, setShowAmbitoMenu] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [showFileDialog, setShowFileDialog] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isFirstMessage = useRef(true)

  useEffect(() => { initChat() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function initChat() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: config } = await supabase
      .from('user_configs')
      .select('nome_assistente')
      .eq('user_id', user.id)
      .single()

    if (!config) { router.push('/onboarding'); return }

    setNomeAssistente(config.nome_assistente || 'Assistente')
    setNomeUtente(user.user_metadata?.nome || user.email?.split('@')[0] || '')

    const { data: ambiti } = await supabase
      .from('user_ambiti')
      .select('ambito')
      .eq('user_id', user.id)
      .eq('attivo', true)

    if (ambiti && ambiti.length > 0) {
      const ambitiList = ambiti.map(a => a.ambito)
      setAmbitiDisponibili(ambitiList)
      setAmbitoAttivo(ambitiList[0] as Ambito)
    }

    const { data: conv } = await supabase
      .from('conversations')
      .insert({ user_id: user.id })
      .select('id')
      .single()

    if (conv) setConversationId(conv.id)

    const { data: publicSkills } = await supabase
      .from('skills')
      .select('id, slug, label, extra_sys')
      .eq('pubblica', true)
    if (publicSkills) setSkills(publicSkills)

    const { data: admin } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .single()
    if (admin) setIsAdmin(true)
  }

  async function loadConversations() {
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/conversations')
      const data = await res.json()
      setConversations(data.conversations || [])
    } finally {
      setLoadingHistory(false)
    }
  }

  async function loadConversation(conv: Conversation) {
    const supabase = createClient()
    const { data: msgs } = await supabase
      .from('messages')
      .select('ruolo, contenuto')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })

    if (msgs) {
      setMessages(msgs.map(m => ({
        role: m.ruolo as 'user' | 'assistant',
        content: m.contenuto,
      })))
    }

    setConversationId(conv.id)
    isFirstMessage.current = false
    setSidebarOpen(false)
  }

  async function newConversation() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: conv } = await supabase
      .from('conversations')
      .insert({ user_id: user.id })
      .select('id')
      .single()

    if (conv) {
      setConversationId(conv.id)
      setMessages([])
      isFirstMessage.current = true
      setSidebarOpen(false)
    }
  }

  async function deleteConversation(e: React.MouseEvent, convId: string) {
    e.stopPropagation()
    await fetch('/api/conversations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: convId }),
    })
    setConversations(prev => prev.filter(c => c.id !== convId))
    if (convId === conversationId) newConversation()
  }

  // Mostra dialog invece di caricare subito
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setShowFileDialog(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Carica il file con il tipo contesto scelto
  async function uploadFile(tipo_contesto: 'chat' | 'profile') {
    if (!pendingFile) return
    setShowFileDialog(false)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', pendingFile)
      formData.append('tipo_contesto', tipo_contesto)
      if (ambitoAttivo) formData.append('ambito', ambitoAttivo)

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.error) { alert(`Errore: ${data.error}`); return }

      if (tipo_contesto === 'chat') {
        setFileContexts(prev => [...prev, {
          id: data.id, nome: data.nome, testo: data.testo_estratto,
          mime_type: data.mime_type, dimensione: data.dimensione,
        }])
      } else {
        // Feedback visivo per file permanente
        alert(`✓ "${data.nome}" aggiunto alle fonti${ambitoAttivo ? ` [${ambitoAttivo}]` : ' permanenti'}`)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setUploading(false)
      setPendingFile(null)
    }
  }

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    const sentFiles = [...fileContexts]
    setFileContexts([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    if (isFirstMessage.current && conversationId) {
      isFirstMessage.current = false
      fetch('/api/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, primo_messaggio: input.trim() }),
      })
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          conversation_id: conversationId,
          file_contexts: sentFiles,
          active_skill_slugs: activeSkills,
          ambito_attivo: ambitoAttivo,
        }),
      })

      if (!res.ok || !res.body) throw new Error('Errore risposta')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let streamedText = ''

      // Aggiungi messaggio vuoto che si riempie in streaming
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.chunk) {
              streamedText += data.chunk
              setMessages(prev => {
                const next = [...prev]
                next[next.length - 1] = { role: 'assistant', content: streamedText }
                return next
              })
            }
          } catch {}
        }
      }
    } catch (e) {
      console.error(e)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Si è verificato un errore. Riprova.' }])
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
  }

  const ambitoConfig = AMBITI_CONFIG.find(a => a.value === ambitoAttivo)

  return (
    <div className="flex h-screen bg-white overflow-hidden">

      {/* Dialog scelta file */}
      {showFileDialog && pendingFile && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 pb-4 px-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-5 w-full max-w-sm">
            <p className="text-sm font-semibold text-gray-900 mb-1 truncate">
              📎 {pendingFile.name}
            </p>
            <p className="text-xs text-gray-400 mb-4">Come vuoi usare questo file?</p>
            <div className="space-y-2">
              <button
                onClick={() => uploadFile('chat')}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-left hover:border-gray-400 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900">Solo questa chat</p>
                <p className="text-xs text-gray-400 mt-0.5">Temporaneo, usato solo in questa conversazione</p>
              </button>
              <button
                onClick={() => uploadFile('profile')}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-left hover:border-gray-400 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900">
                  Aggiungi alle fonti {ambitoAttivo ? `[${ambitoAttivo}]` : 'permanenti'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Disponibile in tutte le chat{ambitoAttivo ? ` di ${ambitoAttivo}` : ''}
                </p>
              </button>
            </div>
            <button
              onClick={() => { setShowFileDialog(false); setPendingFile(null) }}
              className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600 py-1"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-72 bg-gray-50 border-r border-gray-200 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Conversazioni</h2>
          <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-3 border-b border-gray-200">
          <button
            onClick={newConversation}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <span>+</span>
            <span>Nuova conversazione</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {loadingHistory ? (
            <p className="text-xs text-gray-400 text-center py-4">Caricamento...</p>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Nessuna conversazione</p>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => loadConversation(conv)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${conv.id === conversationId ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{conv.titolo || 'Nuova conversazione'}</p>
                  <p className="text-xs text-gray-400">{formatDate(conv.created_at)}</p>
                </div>
                <button
                  onClick={e => deleteConversation(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-2 text-xs transition-opacity"
                >
                  🗑
                </button>
              </div>
            ))
          )}
        </div>
        {/* Footer sidebar con navigazione */}
        <div className="p-4 border-t border-gray-200 space-y-1">
          <button
            onClick={() => router.push('/profile')}
            className="w-full text-sm text-gray-600 hover:text-gray-900 transition-colors text-left py-1 flex items-center gap-2"
          >
            <span>👤</span> Profilo
          </button>
          {isAdmin && (
            <button
              onClick={() => router.push('/admin')}
              className="w-full text-sm text-gray-600 hover:text-gray-900 transition-colors text-left py-1 flex items-center gap-2"
            >
              <span>⚙️</span> Admin
            </button>
          )}
          <button
            onClick={handleLogout}
            className="w-full text-sm text-red-500 hover:text-red-700 transition-colors text-left py-1 flex items-center gap-2"
          >
            <span>→</span> Esci
          </button>
        </div>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/20" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main chat */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Header */}
        <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSidebarOpen(true); loadConversations() }}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4H14M2 8H14M2 12H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
              <span className="text-white text-xs font-medium">AI</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{nomeAssistente}</p>
              {nomeUtente && <p className="text-xs text-gray-400">Ciao, {nomeUtente}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={newConversation}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              + Nuova
            </button>
            <button onClick={() => router.push('/profile')} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Profilo
            </button>
            {isAdmin && (
              <button onClick={() => router.push('/admin')} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Admin
              </button>
            )}
            <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-600 transition-colors">
              Esci
            </button>
          </div>
        </div>

        {/* Messaggi */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <span className="text-2xl">✨</span>
              </div>
              <p className="text-gray-900 font-medium mb-1">Come posso aiutarti?</p>
              {ambitoAttivo && (
                <p className="text-xs text-gray-400 mt-1">
                  Contesto: {ambitoConfig?.emoji} {ambitoConfig?.label}
                </p>
              )}
              <p className="text-gray-400 text-sm mt-1">Scrivi un messaggio o allega un file per iniziare</p>
            </div>
          )}
          {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
          {loading && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Skill selector */}
        {skills.length > 0 && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowSkills(!showSkills)}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                ✦ Skill {activeSkills.length > 0 && `(${activeSkills.length})`}
              </button>
              {showSkills && skills.map(skill => (
                <button
                  key={skill.id}
                  onClick={() => setActiveSkills(prev =>
                    prev.includes(skill.slug)
                      ? prev.filter(s => s !== skill.slug)
                      : [...prev, skill.slug]
                  )}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    activeSkills.includes(skill.slug)
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {skill.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* File allegati */}
        {fileContexts.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {fileContexts.map(f => (
              <FileChip key={f.id} file={f} onRemove={() => setFileContexts(prev => prev.filter(fc => fc.id !== f.id))} />
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-100 px-4 py-3">

          {/* Selector ambito */}
          {ambitiDisponibili.length > 1 && (
            <div className="flex items-center gap-2 mb-2 relative">
              <button
                onClick={() => setShowAmbitoMenu(!showAmbitoMenu)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                  ambitoAttivo
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 text-gray-500'
                }`}
              >
                <span>{ambitoConfig?.emoji}</span>
                <span>{ambitoConfig?.label || 'Contesto'}</span>
                <span className="opacity-60">▾</span>
              </button>

              {showAmbitoMenu && (
                <div className="absolute bottom-8 left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-1 z-10 min-w-[140px]">
                  {ambitiDisponibili.map(a => {
                    const cfg = AMBITI_CONFIG.find(ac => ac.value === a)
                    return (
                      <button
                        key={a}
                        onClick={() => { setAmbitoAttivo(a as Ambito); setShowAmbitoMenu(false) }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          ambitoAttivo === a ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span>{cfg?.emoji}</span>
                        <span>{cfg?.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex items-end gap-2 bg-gray-50 rounded-2xl px-3 py-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-40 transition-colors flex-shrink-0"
              title={`Allega file${ambitoAttivo ? ` (${ambitoAttivo})` : ''}`}
            >
              {uploading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 10V13H14V10M8 2V10M5 5L8 2L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp" onChange={handleFileUpload} className="hidden" />
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={`Scrivi un messaggio${ambitoAttivo ? ` [${ambitoAttivo}]` : ''}... (Invio per inviare)`}
              rows={1}
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none py-1"
              style={{ maxHeight: '160px' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center disabled:opacity-40 hover:bg-gray-800 transition-colors flex-shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L7 13M7 1L2 6M7 1L12 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">Shift+Invio per andare a capo</p>
        </div>
      </div>
    </div>
  )
}
