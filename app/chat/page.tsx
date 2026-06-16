'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { toast } from 'sonner'
import GuidePanel from '@/components/GuidePanel'

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
  storage_path?: string
}

interface Conversation {
  id: string
  titolo: string | null
  created_at: string
  skill_slug: string | null
}

type Ambito = 'lavoro' | 'studio' | 'personale' | null

const AMBITI_THEME: Record<string, {
  header: string; headerText: string; headerBorder: string; bg: string; bubble: string
  inputBg: string; inputBorder: string; badge: string; badgeText: string
  sidebar: string; sidebarActive: string; sendBtn: string; userBubble: string
}> = {
  lavoro: {
    header: 'bg-slate-800', headerText: 'text-white', headerBorder: 'border-slate-700',
    bg: 'bg-slate-50', bubble: 'bg-slate-700', inputBg: 'bg-white', inputBorder: 'border-slate-200',
    badge: 'bg-slate-700 text-white', badgeText: 'text-slate-100', sidebar: 'bg-slate-900',
    sidebarActive: 'bg-slate-700', sendBtn: 'bg-slate-700 hover:bg-slate-600', userBubble: 'bg-slate-700 text-white',
  },
  studio: {
    header: 'bg-green-800', headerText: 'text-white', headerBorder: 'border-green-700',
    bg: 'bg-green-50', bubble: 'bg-green-700', inputBg: 'bg-white', inputBorder: 'border-green-200',
    badge: 'bg-green-700 text-white', badgeText: 'text-green-100', sidebar: 'bg-green-900',
    sidebarActive: 'bg-green-700', sendBtn: 'bg-green-700 hover:bg-green-600', userBubble: 'bg-green-700 text-white',
  },
  personale: {
    header: 'bg-purple-900', headerText: 'text-white', headerBorder: 'border-purple-800',
    bg: 'bg-purple-50', bubble: 'bg-purple-700', inputBg: 'bg-white', inputBorder: 'border-purple-200',
    badge: 'bg-purple-700 text-white', badgeText: 'text-purple-100', sidebar: 'bg-purple-950',
    sidebarActive: 'bg-purple-700', sendBtn: 'bg-purple-700 hover:bg-purple-600', userBubble: 'bg-purple-700 text-white',
  },
  default: {
    header: 'bg-white', headerText: 'text-gray-900', headerBorder: 'border-gray-100',
    bg: 'bg-gray-50', bubble: 'bg-gray-900', inputBg: 'bg-gray-50', inputBorder: 'border-gray-100',
    badge: 'bg-gray-900 text-white', badgeText: 'text-gray-300', sidebar: 'bg-gray-50',
    sidebarActive: 'bg-gray-200', sendBtn: 'bg-gray-900 hover:bg-gray-800', userBubble: 'bg-gray-900 text-white',
  },
}

const AMBITI_CONFIG = [
  { value: 'lavoro' as Ambito, label: 'Lavoro', emoji: '💼' },
  { value: 'studio' as Ambito, label: 'Studio', emoji: '📖' },
  { value: 'personale' as Ambito, label: 'Personale', emoji: '🏠' },
]

function MessageBubble({ message, theme }: { message: Message; theme: typeof AMBITI_THEME.default }) {
  const isUser = message.role === 'user'
  const hasWarning = !isUser && message.content.startsWith('⚠️ FONTE NON VERIFICATA')
  let warningText = ''
  let mainContent = message.content
  if (hasWarning) {
    const parts = message.content.split('\n\n')
    warningText = parts[0]
    mainContent = parts.slice(1).join('\n\n')
  }
  const isTyping = !isUser && message.content === ''
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 message-appear`}>
      <div className="max-w-[82%]">
        {hasWarning && (
          <div className="mb-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-800 font-medium">{warningText}</p>
          </div>
        )}
        <div className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? `${theme.userBubble} rounded-br-sm`
            : 'bg-white text-gray-900 rounded-bl-sm shadow-sm border border-gray-100'
        }`}>
          {isTyping ? (
            <span className="flex items-center gap-1 text-gray-400 py-0.5">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </span>
          ) : isUser ? (
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
              code: ({ children }) => <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
              pre: ({ children }) => <pre className="bg-gray-100 text-gray-800 p-3 rounded-lg text-xs font-mono overflow-x-auto mb-2">{children}</pre>,
              blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-300 pl-3 italic text-gray-600 mb-2">{children}</blockquote>,
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
    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs shadow-sm">
      <span>{getIcon()}</span>
      <span className="text-gray-700 font-medium truncate max-w-[100px]">{file.nome}</span>
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
  const [isDragging, setIsDragging] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [nomeAssistente, setNomeAssistente] = useState('Assistente')
  const [nomeUtente, setNomeUtente] = useState('')
  const [fileContexts, setFileContexts] = useState<FileContext[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [skills, setSkills] = useState<{ id: string; slug: string; label: string; extra_sys: string; categoria: string | null; professione: string | null }[]>([])
  const [activeSkills, setActiveSkills] = useState<string[]>([])
  const [newSkillOpen, setNewSkillOpen] = useState(false)
  const [newSkillLabel, setNewSkillLabel] = useState('')
  const [newSkillExtra, setNewSkillExtra] = useState('')
  const [newSkillSaving, setNewSkillSaving] = useState(false)
  const [newSkillError, setNewSkillError] = useState('')
  const [professione, setProfessione] = useState<string>('')
  const [showSkills, setShowSkills] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [ambitoAttivo, setAmbitoAttivo] = useState<Ambito>(null)
  const [ambitiDisponibili, setAmbitiDisponibili] = useState<string[]>([])
  const [showAmbitoMenu, setShowAmbitoMenu] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [showFileDialog, setShowFileDialog] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [introMessage, setIntroMessage] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isFirstMessage = useRef(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null)

  const [webResults, setWebResults] = useState<{ title: string; url: string; description: string }[] | null>(null)
  const [webSearching, setWebSearching] = useState(false)
  const [webQuery, setWebQuery] = useState('')

  const [showMicHelp, setShowMicHelp] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareConvId, setShareConvId] = useState<string | null>(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null)
  const [shareHasPassword, setShareHasPassword] = useState(false)
  const [shareExpiry, setShareExpiry] = useState<string | null>(null)
  const [sharePassword, setSharePassword] = useState('')
  const [sharePasswordEnabled, setSharePasswordEnabled] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [input])

  const theme = AMBITI_THEME[ambitoAttivo || 'default'] || AMBITI_THEME.default
  const ambitoConfig = AMBITI_CONFIG.find(a => a.value === ambitoAttivo)

  const visibleSkills = ambitoAttivo === 'lavoro'
    ? skills.filter(s => s.professione === professione || s.professione === null)
    : ambitoAttivo === 'studio' || ambitoAttivo === 'personale'
      ? skills.filter(s => s.professione === null)
      : skills

  const ttsInitialized = useRef(false)

  useEffect(() => { initChat() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { setActiveSkills([]); setShowSkills(false) }, [ambitoAttivo])
  useEffect(() => {
    if (!ttsInitialized.current) { ttsInitialized.current = true; return }
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('user_configs').upsert({ user_id: user.id, tts_enabled: ttsEnabled }, { onConflict: 'user_id' })
    })
  }, [ttsEnabled])

  useEffect(() => {
    const meta = document.querySelector('meta[name=viewport]')
    if (meta) meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1')
  }, [])

  async function initChat() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [
      { data: config },
      { data: ambiti },
      { data: ambitoLavoro },
      { data: admin },
    ] = await Promise.all([
      supabase.from('user_configs').select('nome_assistente, tts_enabled').eq('user_id', user.id).single(),
      supabase.from('user_ambiti').select('ambito').eq('user_id', user.id).eq('attivo', true),
      supabase.from('user_ambiti').select('onboarding_data').eq('user_id', user.id).eq('ambito', 'lavoro').single(),
      supabase.from('admins').select('user_id').eq('user_id', user.id).single(),
    ])

    if (!config) { router.push('/onboarding'); return }

    setNomeAssistente(config.nome_assistente || 'Assistente')
    if (config.tts_enabled) setTtsEnabled(true)
    setNomeUtente(user.user_metadata?.nome || user.email?.split('@')[0] || '')

    const professioneUtente = ambitoLavoro?.onboarding_data?.professione || ''
    if (professioneUtente) setProfessione(professioneUtente)

    // Carica skill filtrate per professione (+ quelle generali)
    let skillQuery = supabase
      .from('skills')
      .select('id, slug, label, extra_sys, professione, categoria')
      .eq('pubblica', true)
      .is('user_id', null)

    if (professioneUtente) {
      skillQuery = skillQuery.or(`professione.eq.${professioneUtente},professione.eq.generale,professione.is.null`)
    }

    // Skill personali dell'utente (professione null → visibili in ogni ambito)
    const [{ data: publicSkillsData }, { data: personalSkillsData }] = await Promise.all([
      skillQuery,
      supabase
        .from('skills')
        .select('id, slug, label, extra_sys, professione, categoria')
        .eq('user_id', user.id)
        .order('label'),
    ])
    // Le skill personali compaiono per prime nel selettore
    const publicSkills = [...(personalSkillsData || []), ...(publicSkillsData || [])]

    if (ambiti && ambiti.length > 0) {
      const ambitiList = ambiti.map(a => a.ambito)
      setAmbitiDisponibili(ambitiList)
      setAmbitoAttivo(ambitiList[0] as Ambito)
    }

    // conversationId rimane null — verrà creata al primo messaggio
    if (publicSkills) setSkills(publicSkills)
    if (admin) setIsAdmin(true)

    // Mostra intro se arrivi da onboarding o da cambio professione
    if (typeof window !== 'undefined' && localStorage.getItem('assistente_intro') === '1') {
      localStorage.removeItem('assistente_intro')
      const nome = config?.nome_assistente || 'Assistente'
      const prof = professioneUtente
      const skillsCaricate = publicSkills || []
      setIntroMessage(buildIntroMessage(nome, prof, skillsCaricate))
    }
  }

  // Stessi limiti del tab Skill nel profilo (enforcement client-side, la RLS garantisce l'ownership)
  async function createPersonalSkill() {
    const label = newSkillLabel.trim().slice(0, 40)
    const extra_sys = newSkillExtra.trim().slice(0, 8000)
    if (!label || !extra_sys) { setNewSkillError('Compila nome e istruzioni'); return }
    if (skills.filter(s => s.slug.startsWith('personale-')).length >= 10) {
      setNewSkillError('Massimo 10 skill personali — gestiscile dal profilo')
      return
    }
    setNewSkillSaving(true)
    setNewSkillError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setNewSkillSaving(false); return }

    // Slug random: la colonna ha vincolo UNIQUE globale
    const slug = `personale-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    const { data, error } = await supabase.from('skills')
      .insert({ user_id: user.id, slug, label, extra_sys, categoria: 'personale', pubblica: false, professione: null })
      .select('id, slug, label, extra_sys, professione, categoria').single()
    setNewSkillSaving(false)
    if (error || !data) { setNewSkillError('Errore durante il salvataggio'); return }

    setSkills(prev => [data, ...prev])
    setActiveSkills(prev => [...prev, data.slug])
    setNewSkillOpen(false)
    setNewSkillLabel('')
    setNewSkillExtra('')
  }

  function buildIntroMessage(
    nome: string,
    professione: string,
    skillsCaricate: Array<{ label: string; categoria: string | null; professione: string | null }>
  ): string {
    const profLabel = professione
      ? professione.charAt(0).toUpperCase() + professione.slice(1).replace(/_/g, ' ')
      : ''

    // Mostra solo le skill specifiche della professione dell'utente
    const skillsDaMostrare = professione
      ? skillsCaricate.filter(s => s.professione === professione)
      : skillsCaricate

    let msg = `Ciao! Sono **${nome}**`
    if (profLabel) msg += `, il tuo assistente AI per **${profLabel}**`
    msg += '.\n\n'

    if (skillsDaMostrare.length > 0) {
      const byCategoria: Record<string, string[]> = {}
      skillsDaMostrare.forEach(s => {
        const cat = s.categoria || 'Generali'
        if (!byCategoria[cat]) byCategoria[cat] = []
        byCategoria[cat].push(s.label)
      })
      msg += 'Dal pulsante **✦ Skill** in basso puoi attivare modalità specializzate:\n'
      for (const [cat, labels] of Object.entries(byCategoria)) {
        msg += `\n**${cat}:** ${labels.join(', ')}`
      }
      msg += '\n\n'
    }

    msg += 'Come posso aiutarti oggi?'
    return msg
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
      .from('messages').select('ruolo, contenuto')
      .eq('conversation_id', conv.id).order('created_at', { ascending: true })
    if (msgs) setMessages(msgs.map(m => ({ role: m.ruolo as 'user' | 'assistant', content: m.contenuto })))
    setConversationId(conv.id)
    isFirstMessage.current = false
    setSidebarOpen(false)
  }

  async function newConversation() {
    setConversationId(null)
    setMessages([])
    setFileContexts([])
    isFirstMessage.current = true
    setSidebarOpen(false)
  }

  async function deleteConversation(e: React.MouseEvent, convId: string) {
    e.stopPropagation()
    await fetch('/api/conversations', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: convId }),
    })
    setConversations(prev => prev.filter(c => c.id !== convId))
    if (convId === conversationId) newConversation()
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setShowFileDialog(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

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
      if (data.error) { toast.error(data.error); return }
      if (tipo_contesto === 'chat') {
        setFileContexts(prev => [...prev, { id: data.id, nome: data.nome, testo: data.testo_estratto, mime_type: data.mime_type, dimensione: data.dimensione, storage_path: data.storage_path }])
        toast.success(`"${data.nome}" allegato alla chat`)
      } else {
        toast.success(`"${data.nome}" aggiunto alle fonti${ambitoAttivo ? ` [${ambitoAttivo}]` : ' permanenti'}`)
      }
    } catch (e) {
      console.error(e)
      toast.error('Errore durante il caricamento')
    } finally {
      setUploading(false)
      setPendingFile(null)
    }
  }

  async function uploadFileDirectly(file: File) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('tipo_contesto', 'chat')
      if (ambitoAttivo) formData.append('ambito', ambitoAttivo)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.error) { toast.error(`"${file.name}": ${data.error}`); return }
      setFileContexts(prev => [...prev, { id: data.id, nome: data.nome, testo: data.testo_estratto, mime_type: data.mime_type, dimensione: data.dimensione, storage_path: data.storage_path }])
      toast.success(`"${data.nome}" allegato alla chat`)
    } catch (e) {
      console.error(e)
      toast.error(`"${file.name}": errore durante il caricamento`)
    } finally {
      setUploading(false)
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData.items)
    const imageItem = items.find(item => item.type.startsWith('image/'))
    if (!imageItem) return
    e.preventDefault()
    const file = imageItem.getAsFile()
    if (!file) return
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/webp' ? 'webp' : 'img'
    const namedFile = new File([file], `immagine_incollata.${ext}`, { type: file.type })
    uploadFileDirectly(namedFile)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return
    for (const file of files.slice(0, 3)) {
      uploadFileDirectly(file)
    }
  }

  async function sendMessage() {
    if (!input.trim() || loading) return
    setIntroMessage('')
    const userMessage: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    const sentFiles = [...fileContexts]
    setFileContexts([])
    const sentWebContext = webResults ? { query: webQuery, results: webResults } : null
    setWebResults(null)
    setWebQuery('')
    textareaRef.current?.blur()

    // Crea la conversazione su Supabase solo al primo messaggio reale
    let currentConversationId = conversationId
    if (!currentConversationId) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Sessione scaduta — effettua di nuovo il login')
        setLoading(false)
        return
      }
      const { data: conv } = await supabase.from('conversations').insert({ user_id: user.id }).select('id').single()
      if (!conv) {
        toast.error('Errore nella creazione della conversazione. Riprova.')
        setLoading(false)
        return
      }
      currentConversationId = conv.id
      setConversationId(conv.id)
      isFirstMessage.current = true
      loadConversations()
    }

    if (isFirstMessage.current && currentConversationId) {
      isFirstMessage.current = false
      fetch('/api/conversations', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: currentConversationId, primo_messaggio: input.trim() }),
      })
    }
    try {
      // ── Recupera il token Google solo se l'utente ha cartelle Drive configurate ──
      const supabase = createClient()
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        const { data: userCfg } = await supabase
          .from('user_configs')
          .select('drive_folders, google_drive_token, google_drive_token_expiry')
          .eq('user_id', currentUser.id)
          .single()
        const hasDriveFolders = userCfg?.drive_folders && Array.isArray(userCfg.drive_folders) && userCfg.drive_folders.length > 0
        if (hasDriveFolders) {
          const token = userCfg?.google_drive_token
          const expiry = userCfg?.google_drive_token_expiry
            ? new Date(userCfg.google_drive_token_expiry).getTime()
            : 0
          const tokenValid = token && (!expiry || expiry > Date.now() + 5 * 60 * 1000)
          if (!tokenValid) {
            toast('Google Drive non disponibile — riconnetti il Drive dal profilo', { icon: '⚠️' })
          }
        }
      }

      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          conversation_id: currentConversationId,
          file_contexts: sentFiles,
          active_skill_slugs: activeSkills,
          ambito_attivo: ambitoAttivo,
          web_search_context: sentWebContext,
        }),
      })
      if (!res.ok || !res.body) throw new Error('Errore risposta')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let streamedText = ''
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.chunk) {
              streamedText += data.chunk
              setMessages(prev => { const next = [...prev]; next[next.length - 1] = { role: 'assistant', content: streamedText }; return next })
            }
          } catch {}
        }
      }
      if (streamedText) speakText(streamedText)
    } catch (e) {
      console.error(e)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Si è verificato un errore. Riprova.' }])
    } finally {
      setLoading(false)
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 50)
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 768) { e.preventDefault(); sendMessage() }
  }

  async function handleWebSearch() {
    const q = input.trim()
    if (!q || webSearching || loading) return
    setWebSearching(true)
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      setWebResults(data.results)
      setWebQuery(data.query)
    } catch {
      toast.error('Errore nella ricerca web')
    } finally {
      setWebSearching(false)
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
  }

  async function toggleRecording() {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) { toast.error('Il tuo browser non supporta il riconoscimento vocale'); return }

    const recognition = new SpeechRecognition()
    recognition.lang = 'it-IT'
    recognition.continuous = false
    recognition.interimResults = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      setInput(prev => prev ? prev + ' ' + transcript : transcript)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (e: any) => {
      setIsRecording(false)
      if (e.error === 'not-allowed') setShowMicHelp(true)
      else if (e.error !== 'aborted' && e.error !== 'no-speech') toast.error('Errore microfono')
    }
    recognition.onend = () => setIsRecording(false)
    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  function speakText(text: string) {
    if (!ttsEnabled || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const clean = text.replace(/[#*`_~]/g, '').replace(/\[.*?\]\(.*?\)/g, '').trim()
    const utt = new SpeechSynthesisUtterance(clean)
    utt.lang = 'it-IT'
    utt.rate = 1.05
    utt.onstart = () => setIsSpeaking(true)
    utt.onend = () => setIsSpeaking(false)
    utt.onerror = () => setIsSpeaking(false)
    speechSynthRef.current = utt
    window.speechSynthesis.speak(utt)
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }

  async function openShareModal(e: React.MouseEvent, convId: string) {
    e.stopPropagation()
    setShareConvId(convId)
    setShareToken(null)
    setShareExpiresAt(null)
    setShareHasPassword(false)
    setShareExpiry(null)
    setSharePassword('')
    setSharePasswordEnabled(false)
    setShareCopied(false)
    setShareModalOpen(true)
    setShareLoading(true)
    try {
      const res = await fetch(`/api/conversations/${convId}/share`)
      const data = await res.json()
      setShareToken(data.token)
      setShareExpiresAt(data.expires_at)
      setShareHasPassword(data.has_password)
    } finally {
      setShareLoading(false)
    }
  }

  async function createShare() {
    if (!shareConvId) return
    setShareLoading(true)
    try {
      const res = await fetch(`/api/conversations/${shareConvId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expires_in: shareExpiry,
          password: sharePasswordEnabled && sharePassword.trim() ? sharePassword.trim() : null,
        }),
      })
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      setShareToken(data.token)
      setShareExpiresAt(data.expires_at)
      setShareHasPassword(data.has_password)
    } catch {
      toast.error('Errore nella creazione del link')
    } finally {
      setShareLoading(false)
    }
  }

  async function revokeShare() {
    if (!shareConvId) return
    await fetch(`/api/conversations/${shareConvId}/share`, { method: 'DELETE' })
    setShareToken(null)
    setShareExpiresAt(null)
    setShareHasPassword(false)
    toast.success('Link revocato')
  }

  function copyShareLink() {
    if (!shareToken) return
    navigator.clipboard.writeText(`${window.location.origin}/conv/${shareToken}`)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2000)
  }

  return (
    <div
      className={`flex h-[100dvh] overflow-hidden transition-colors duration-300 ${theme.bg} relative`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-gray-900/30 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-400 px-10 py-8 text-center shadow-xl">
            <p className="text-2xl mb-2">📎</p>
            <p className="text-sm font-semibold text-gray-700">Rilascia per allegare</p>
          </div>
        </div>
      )}

      {/* Mic permission help */}
      {showMicHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowMicHelp(false)}>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Permesso microfono negato</h3>
              <button onClick={() => setShowMicHelp(false)} className="text-gray-400 active:text-gray-600 text-lg leading-none">✕</button>
            </div>
            <p className="text-xs text-gray-500 mb-4">Il browser ha bloccato l'accesso al microfono. Segui questi passi per abilitarlo:</p>
            {(() => {
              const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
              const isIOS = /iPhone|iPad|iPod/i.test(ua)
              const isAndroid = /Android/i.test(ua)
              if (isIOS) return (
                <ol className="text-xs text-gray-700 space-y-2 list-decimal list-inside">
                  <li>Apri <strong>Impostazioni iPhone</strong></li>
                  <li>Scorri fino a <strong>Safari</strong> (o al tuo browser)</li>
                  <li>Tocca <strong>Microfono</strong> → seleziona <strong>Consenti</strong></li>
                  <li>Torna qui e clicca <strong>Riprova</strong></li>
                </ol>
              )
              if (isAndroid) return (
                <ol className="text-xs text-gray-700 space-y-2 list-decimal list-inside">
                  <li>Tocca l'icona <strong>lucchetto 🔒</strong> nella barra dell'indirizzo</li>
                  <li>Tocca <strong>Autorizzazioni</strong> → <strong>Microfono</strong></li>
                  <li>Seleziona <strong>Consenti</strong></li>
                  <li>Clicca <strong>Riprova</strong> qui sotto</li>
                </ol>
              )
              return (
                <div className="text-xs text-gray-700 space-y-3">
                  <div>
                    <p className="font-semibold mb-1">Reimposta il permesso (consigliato)</p>
                    <ol className="space-y-1 list-decimal list-inside text-gray-600">
                      <li>Clicca l'icona a sinistra dell'indirizzo (🔒 o ⊙)</li>
                      <li>Clicca <strong>Impostazioni sito</strong></li>
                      <li>Clicca <strong>Reimposta le autorizzazioni</strong></li>
                      <li>Ricarica la pagina e clicca <strong>Consenti</strong> quando richiesto</li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Se il problema persiste</p>
                    <ol className="space-y-1 list-decimal list-inside text-gray-600">
                      <li>Impostazioni Windows → Privacy → <strong>Microfono</strong></li>
                      <li>Attiva <strong>"Consenti alle app desktop di accedere al microfono"</strong></li>
                    </ol>
                  </div>
                </div>
              )
            })()}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => { setShowMicHelp(false); toggleRecording() }}
                className="flex-1 bg-gray-900 text-white text-sm font-medium py-2.5 rounded-xl active:opacity-80 transition-opacity">
                Riprova
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2.5 rounded-xl active:opacity-80 transition-opacity">
                Ricarica
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-4" onClick={() => setShareModalOpen(false)}>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-900">Condividi conversazione</p>
              <button onClick={() => setShareModalOpen(false)} className="text-gray-400 active:text-gray-600 w-6 h-6 flex items-center justify-center">✕</button>
            </div>

            {shareLoading ? (
              <p className="text-xs text-gray-400 text-center py-4">Caricamento...</p>
            ) : shareToken ? (
              <>
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 mb-3 flex items-center gap-2">
                  <p className="text-xs text-gray-500 flex-1 truncate font-mono">
                    {typeof window !== 'undefined' ? `${window.location.origin}/conv/${shareToken}` : ''}
                  </p>
                  <button onClick={copyShareLink}
                    className={`text-xs font-medium flex-shrink-0 ${shareCopied ? 'text-green-600' : 'text-blue-600'}`}>
                    {shareCopied ? 'Copiato!' : 'Copia'}
                  </button>
                </div>
                {shareExpiresAt && (
                  <p className="text-xs text-gray-400 mb-2">
                    Scade il {new Date(shareExpiresAt).toLocaleDateString('it-IT')}
                  </p>
                )}
                {shareHasPassword && <p className="text-xs text-gray-400 mb-3">🔒 Protetto da password</p>}
                <button onClick={revokeShare}
                  className="w-full text-sm text-red-500 active:text-red-400 py-2 mt-1">
                  Revoca link
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-3">Scadenza del link</p>
                <div className="space-y-2 mb-4">
                  {([
                    { value: null, label: 'Nessuna scadenza' },
                    { value: '7d', label: '7 giorni' },
                    { value: '30d', label: '30 giorni' },
                  ] as { value: string | null; label: string }[]).map(opt => (
                    <button key={String(opt.value)} onClick={() => setShareExpiry(opt.value)}
                      className={`w-full px-4 py-2.5 rounded-xl border text-left text-sm transition-colors ${
                        shareExpiry === opt.value
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-700 active:bg-gray-50'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="mb-4">
                  <button onClick={() => setSharePasswordEnabled(p => !p)}
                    className="flex items-center gap-2 text-sm text-gray-700 w-full">
                    <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${sharePasswordEnabled ? 'bg-gray-900 border-gray-900' : 'border-gray-300'}`}>
                      {sharePasswordEnabled && <span className="text-white text-[10px]">✓</span>}
                    </span>
                    Proteggi con password
                  </button>
                  {sharePasswordEnabled && (
                    <input
                      type="password"
                      value={sharePassword}
                      onChange={e => setSharePassword(e.target.value)}
                      placeholder="Password"
                      className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
                    />
                  )}
                </div>

                <button onClick={createShare}
                  disabled={sharePasswordEnabled && !sharePassword.trim()}
                  className="w-full py-3 bg-gray-900 text-white text-sm font-medium rounded-xl disabled:opacity-40 active:opacity-80">
                  Genera link
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal nuova skill personale */}
      {newSkillOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-4" onClick={() => setNewSkillOpen(false)}>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-900">✦ Nuova skill personale</p>
              <button onClick={() => setNewSkillOpen(false)} className="text-gray-400 active:text-gray-600 w-6 h-6 flex items-center justify-center">✕</button>
            </div>
            <input
              type="text"
              value={newSkillLabel}
              onChange={e => setNewSkillLabel(e.target.value)}
              maxLength={40}
              placeholder="Nome (es. Revisione contratti)"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm mb-2 focus:outline-none focus:border-gray-400"
            />
            <textarea
              value={newSkillExtra}
              onChange={e => setNewSkillExtra(e.target.value)}
              maxLength={8000}
              rows={4}
              placeholder="Istruzioni per l'assistente quando la skill è attiva (es. 'Rispondi sempre con un elenco puntato di rischi...')"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-gray-400"
            />
            <div className="flex items-center justify-between mt-1 mb-3">
              <p className="text-xs text-gray-300">{newSkillExtra.length}/8000</p>
              {newSkillError && <p className="text-xs text-red-500">{newSkillError}</p>}
            </div>
            <button onClick={createPersonalSkill} disabled={newSkillSaving}
              className="w-full py-3 bg-gray-900 text-white text-sm font-medium rounded-xl disabled:opacity-40 active:opacity-80">
              {newSkillSaving ? 'Salvo...' : 'Crea e attiva'}
            </button>
            <p className="text-xs text-gray-300 text-center mt-2">Modifica ed eliminazione dal Profilo → ✦ Skill</p>
          </div>
        </div>
      )}

      {/* Dialog scelta file */}
      {showFileDialog && pendingFile && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-5 w-full max-w-sm">
            <p className="text-sm font-semibold text-gray-900 mb-1 truncate">📎 {pendingFile.name}</p>
            <p className="text-xs text-gray-400 mb-4">Come vuoi usare questo file?</p>
            <div className="space-y-2">
              <button onClick={() => uploadFile('chat')} className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-left active:bg-gray-50 transition-colors">
                <p className="text-sm font-medium text-gray-900">Solo questa chat</p>
                <p className="text-xs text-gray-400 mt-0.5">Temporaneo, usato solo in questa conversazione</p>
              </button>
              <button onClick={() => uploadFile('profile')} className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-left active:bg-gray-50 transition-colors">
                <p className="text-sm font-medium text-gray-900">Aggiungi alle fonti {ambitoAttivo ? `[${ambitoAttivo}]` : 'permanenti'}</p>
                <p className="text-xs text-gray-400 mt-0.5">Disponibile in tutte le chat{ambitoAttivo ? ` di ${ambitoAttivo}` : ''}</p>
              </button>
            </div>
            <button onClick={() => { setShowFileDialog(false); setPendingFile(null) }} className="w-full mt-3 text-sm text-gray-400 py-2">Annulla</button>
          </div>
        </div>
      )}

      {/* Popup cambio ambito */}
      {showAmbitoMenu && ambitiDisponibili.length > 1 && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowAmbitoMenu(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-2 w-full max-w-xs" onClick={e => e.stopPropagation()}>
            <p className="text-xs font-medium text-gray-400 px-3 py-2">Cambia contesto</p>
            {ambitiDisponibili.map(a => {
              const cfg = AMBITI_CONFIG.find(ac => ac.value === a)
              const t = AMBITI_THEME[a]
              return (
                <button key={a} onClick={() => { setAmbitoAttivo(a as Ambito); setShowAmbitoMenu(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors mb-1 ${ambitoAttivo === a ? `${t.badge} font-semibold` : 'text-gray-700 active:bg-gray-50'}`}>
                  <span className="text-xl">{cfg?.emoji}</span>
                  <div className="text-left">
                    <p className="text-sm font-medium">{cfg?.label}</p>
                    <p className={`text-xs ${ambitoAttivo === a ? 'opacity-75' : 'text-gray-400'}`}>
                      {a === 'lavoro' && 'Documenti e fonti professionali'}
                      {a === 'studio' && 'Materiale didattico e appunti'}
                      {a === 'personale' && 'Uso personale e hobby'}
                    </p>
                  </div>
                  {ambitoAttivo === a && <span className="ml-auto">✓</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-4/5 max-w-xs ${theme.sidebar} flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="px-4 pt-4 pb-3 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Conversazioni</h2>
          <button onClick={() => setSidebarOpen(false)} className="text-white/60 active:text-white w-8 h-8 flex items-center justify-center">✕</button>
        </div>
        <div className="p-3 border-b border-white/10">
          <button onClick={newConversation} className="w-full flex items-center gap-2 px-3 py-3 rounded-xl bg-white/10 text-white text-sm font-medium active:bg-white/20 transition-colors">
            <span>+</span><span>Nuova conversazione</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {loadingHistory ? (
            <p className="text-xs text-white/40 text-center py-4">Caricamento...</p>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-white/40 text-center py-4">Nessuna conversazione</p>
          ) : (
            conversations.map(conv => (
              <div key={conv.id} onClick={() => loadConversation(conv)}
                className={`group flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-colors ${conv.id === conversationId ? theme.sidebarActive : 'active:bg-white/10'}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{conv.titolo || 'Nuova conversazione'}</p>
                  <p className="text-xs text-white/40">{formatDate(conv.created_at)}</p>
                </div>
                <button onClick={e => openShareModal(e, conv.id)} className="text-white/30 active:text-blue-400 p-1" title="Condividi">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="11" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
                    <circle cx="11" cy="11.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
                    <circle cx="3" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M4.4 6.3L9.6 3.2M4.4 7.7L9.6 10.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </button>
                <button onClick={e => deleteConversation(e, conv.id)} className="text-white/30 active:text-red-400 p-1">🗑</button>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t border-white/10 space-y-1">
          <button onClick={() => router.push('/profile')} className="w-full text-sm text-white/70 active:text-white text-left py-2 flex items-center gap-2">
            <span>👤</span> Profilo
          </button>
          {isAdmin && (
            <button onClick={() => router.push('/admin')} className="w-full text-sm text-white/70 active:text-white text-left py-2 flex items-center gap-2">
              <span>⚙️</span> Admin
            </button>
          )}
          <button onClick={handleLogout} className="w-full text-sm text-red-400 active:text-red-300 text-left py-2 flex items-center gap-2">
            <span>→</span> Esci
          </button>
        </div>
      </div>

      {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/30" onClick={() => setSidebarOpen(false)} />}

      {/* Main chat */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">

        {/* Header */}
        <div
          className={`${theme.header} ${theme.headerBorder} border-b px-3 flex items-center justify-between transition-colors duration-300 flex-shrink-0`}
          style={{ paddingTop: 'max(10px, env(safe-area-inset-top))', paddingBottom: '10px' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => { setSidebarOpen(true); loadConversations() }}
              className={`w-8 h-8 flex items-center justify-center ${theme.headerText} opacity-70 active:opacity-100 flex-shrink-0`}>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M2 4H14M2 8H14M2 12H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            <div className={`w-7 h-7 rounded-full ${theme.bubble} flex items-center justify-center flex-shrink-0`}>
              <span className="text-white text-xs font-medium">AI</span>
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${theme.headerText} truncate leading-tight`}>{nomeAssistente}</p>
              {nomeUtente && <p className={`text-xs ${theme.headerText} opacity-50 truncate leading-tight`}>Ciao, {nomeUtente}</p>}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {ambitiDisponibili.length > 1 ? (
              <button onClick={() => setShowAmbitoMenu(true)}
                data-tour="ambiti"
                className={`flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-medium bg-white/15 active:bg-white/25 ${theme.headerText}`}>
                <span>{ambitoConfig?.emoji}</span>
                <span className="hidden sm:inline">{ambitoConfig?.label}</span>
                <span className="opacity-60">▾</span>
              </button>
            ) : ambitoAttivo ? (
              <span data-tour="ambiti" className={`flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-medium bg-white/15 ${theme.headerText}`}>
                <span>{ambitoConfig?.emoji}</span>
                <span className="hidden sm:inline">{ambitoConfig?.label}</span>
              </span>
            ) : null}

            <button onClick={newConversation}
              className={`w-8 h-8 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20 ${theme.headerText} opacity-70 active:opacity-100`}>
              ✏️
            </button>
            <button onClick={() => router.push('/profile')}
              data-tour="profilo-btn"
              className={`hidden sm:flex w-8 h-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 ${theme.headerText} opacity-70 hover:opacity-100`}>
              👤
            </button>
            {isAdmin && (
              <button onClick={() => router.push('/admin')}
                className={`hidden sm:flex w-8 h-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 ${theme.headerText} opacity-70 hover:opacity-100`}>
                ⚙️
              </button>
            )}
          </div>
        </div>

        {/* Messaggi */}
        <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
          {messages.length === 0 && introMessage && (
            <MessageBubble message={{ role: 'assistant', content: introMessage }} theme={theme} />
          )}
          {messages.length === 0 && !introMessage && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className={`w-12 h-12 rounded-full ${theme.bubble} flex items-center justify-center mb-3 opacity-20`}>
                <span className="text-2xl text-white">{ambitoConfig?.emoji || '✨'}</span>
              </div>
              <p className="text-gray-800 font-semibold mb-1">Come posso aiutarti?</p>
              {ambitoAttivo && <p className="text-xs text-gray-500 mt-1">{ambitoConfig?.emoji} {ambitoConfig?.label}</p>}
              <p className="text-gray-400 text-sm mt-1">Scrivi o registra un messaggio vocale</p>
            </div>
          )}
          {messages.map((msg, i) => <MessageBubble key={i} message={msg} theme={theme} />)}
          {loading && (
            <div className="flex justify-start mb-3">
              <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Skill selector */}
        {visibleSkills.length > 0 && (
          <div className="px-3 pb-1.5 flex-shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setShowSkills(!showSkills)} data-tour="skill-selector" className="text-xs text-gray-500 active:text-gray-700 flex items-center gap-1 py-1">
                ✦ Skill {activeSkills.length > 0 && `(${activeSkills.length})`}
              </button>
              {showSkills && visibleSkills.map(skill => (
                <button key={skill.id}
                  onClick={() => setActiveSkills(prev => prev.includes(skill.slug) ? prev.filter(s => s !== skill.slug) : [...prev, skill.slug])}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${activeSkills.includes(skill.slug) ? `${theme.badge} border-transparent` : 'bg-white text-gray-600 border-gray-200'}`}>
                  {skill.label}
                </button>
              ))}
              {showSkills && (
                <button onClick={() => { setNewSkillOpen(true); setNewSkillError('') }}
                  title="Crea skill personale"
                  className="text-xs px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-gray-400 active:text-gray-600 transition-all">
                  +
                </button>
              )}
            </div>
          </div>
        )}

        {/* File allegati */}
        {fileContexts.length > 0 && (
          <div className="px-3 pb-1.5 flex flex-wrap gap-2 flex-shrink-0">
            {fileContexts.map(f => (
              <FileChip key={f.id} file={f} onRemove={() => setFileContexts(prev => prev.filter(fc => fc.id !== f.id))} />
            ))}
          </div>
        )}

        {/* Risultati ricerca web */}
        {webResults && (
          <div className="px-3 pb-1.5 flex-shrink-0">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-blue-800 truncate flex-1">🔍 &ldquo;{webQuery}&rdquo;</p>
                <button onClick={() => { setWebResults(null); setWebQuery('') }} className="text-blue-400 hover:text-blue-600 ml-2 text-xs flex-shrink-0">✕</button>
              </div>
              <div className="space-y-2">
                {webResults.map((r, i) => (
                  <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="block group">
                    <p className="text-xs font-medium text-blue-700 group-hover:underline truncate">{r.title}</p>
                    {r.description && <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{r.description}</p>}
                  </a>
                ))}
              </div>
              <p className="text-[10px] text-blue-400 mt-2">Saranno allegati al tuo prossimo messaggio · clicca ✕ per annullare</p>
            </div>
          </div>
        )}

        {/* Input */}
        <div className={`border-t ${theme.headerBorder} px-3 py-2 bg-white flex-shrink-0`}
          style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
          <div data-tour="input-area" className={`flex items-end gap-1.5 ${theme.inputBg} border ${isRecording ? 'border-red-400' : theme.inputBorder} rounded-2xl px-2.5 py-2 transition-colors`}>
            <button
              onClick={handleWebSearch}
              disabled={!input.trim() || webSearching || loading}
              data-tour="web-search-btn"
              title="Cerca online e includi i risultati nel messaggio"
              className="w-8 h-8 flex items-center justify-center text-gray-400 active:text-gray-600 disabled:opacity-40 flex-shrink-0"
            >
              {webSearching ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10 10L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
            </button>

            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              data-tour="file-upload"
              className="w-8 h-8 flex items-center justify-center text-gray-400 active:text-gray-600 disabled:opacity-40 flex-shrink-0">
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

            <textarea ref={textareaRef} value={input} onChange={handleTextareaChange} onKeyDown={handleKeyDown} onPaste={handlePaste}
              placeholder={isRecording ? '🎙️ Sto ascoltando...' : `Scrivi${ambitoAttivo ? ` — ${ambitoConfig?.label}` : ''}...`}
              rows={1}
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none py-1 leading-relaxed"
              style={{ maxHeight: '100px' }}
            />

            <button
              onClick={toggleRecording}
              className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors flex-shrink-0 select-none ${
                isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 active:text-gray-600'
              }`}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <rect x="5" y="1" width="5" height="8" rx="2.5" fill="currentColor"/>
                <path d="M2.5 7.5C2.5 10.261 4.739 12.5 7.5 12.5C10.261 12.5 12.5 10.261 12.5 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                <line x1="7.5" y1="12.5" x2="7.5" y2="14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>

            <button
              onClick={() => { if (isSpeaking) stopSpeaking(); else setTtsEnabled(p => !p) }}
              className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors flex-shrink-0 ${
                isSpeaking ? 'bg-blue-500 text-white animate-pulse' : ttsEnabled ? 'text-blue-500' : 'text-gray-300 active:text-gray-500'
              }`}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M2 5H5L9 2V13L5 10H2V5Z" fill="currentColor"/>
                {ttsEnabled || isSpeaking ? (
                  <>
                    <path d="M11 4.5C12.3 5.5 12.3 9.5 11 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <path d="M12.5 2.5C14.8 4.2 14.8 10.8 12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </>
                ) : (
                  <path d="M12 5L14 7.5L12 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                )}
              </svg>
            </button>

            <button onClick={sendMessage} disabled={!input.trim() || loading}
              className={`w-9 h-9 ${theme.sendBtn} rounded-xl flex items-center justify-center disabled:opacity-40 transition-all active:scale-[0.88] flex-shrink-0`}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L7 13M7 1L2 6M7 1L12 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <GuidePanel pagina="chat" professione={professione} />
    </div>
  )
}
