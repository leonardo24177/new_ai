'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function isWarning(content: string) {
  return content.startsWith('⚠️ FONTE NON VERIFICATA')
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const hasWarning = !isUser && isWarning(message.content)

  // Separa il warning dal resto del contenuto
  let warningText = ''
  let mainContent = message.content

  if (hasWarning) {
    const parts = message.content.split('\n\n')
    warningText = parts[0]
    mainContent = parts.slice(1).join('\n\n')
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {hasWarning && (
          <div className="mb-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-800 font-medium">{warningText}</p>
          </div>
        )}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-gray-900 text-white rounded-br-sm'
              : 'bg-gray-100 text-gray-900 rounded-bl-sm'
          }`}
        >
          {mainContent}
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [nomeAssistente, setNomeAssistente] = useState('Assistente')
  const [nomeUtente, setNomeUtente] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    initChat()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function initChat() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    // Recupera config utente
    const { data: config } = await supabase
      .from('user_configs')
      .select('nome_assistente')
      .eq('user_id', user.id)
      .single()

    if (!config) {
      router.push('/onboarding')
      return
    }

    setNomeAssistente(config.nome_assistente || 'Assistente')
    setNomeUtente(user.user_metadata?.nome || user.email?.split('@')[0] || '')

    // Crea nuova conversazione
    const { data: conv } = await supabase
      .from('conversations')
      .insert({ user_id: user.id })
      .select('id')
      .single()

    if (conv) setConversationId(conv.id)
  }

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          conversation_id: conversationId,
        }),
      })

      const data = await res.json()

      if (data.message) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.message,
        }])
      }
    } catch (e) {
      console.error(e)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Si è verificato un errore. Riprova.',
      }])
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
  }

  return (
    <div className="flex flex-col h-screen bg-white">

      {/* Header */}
      <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
            <span className="text-white text-xs font-medium">AI</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{nomeAssistente}</p>
            {nomeUtente && (
              <p className="text-xs text-gray-400">Ciao, {nomeUtente}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Esci
        </button>
      </div>

      {/* Messaggi */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <span className="text-2xl">✨</span>
            </div>
            <p className="text-gray-900 font-medium mb-1">Come posso aiutarti?</p>
            <p className="text-gray-400 text-sm">Scrivi un messaggio per iniziare</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

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

      {/* Input */}
      <div className="border-t border-gray-100 px-4 py-3">
        <div className="flex items-end gap-3 bg-gray-50 rounded-2xl px-4 py-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Scrivi un messaggio... (Invio per inviare)"
            rows={1}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none"
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
        <p className="text-xs text-gray-400 text-center mt-2">
          Shift+Invio per andare a capo
        </p>
      </div>
    </div>
  )
}
