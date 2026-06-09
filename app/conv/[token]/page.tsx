'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'

interface SharedMessage {
  ruolo: 'user' | 'assistant'
  contenuto: string
  created_at: string
}

interface SharedConvData {
  conversation: { id: string; titolo: string | null; created_at: string }
  messages: SharedMessage[]
  expires_at: string | null
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function SharedConversationPage() {
  const { token } = useParams() as { token: string }

  const [phase, setPhase] = useState<'loading' | 'password' | 'loaded' | 'error'>('loading')
  const [data, setData] = useState<SharedConvData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/conv/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.requires_password) { setPhase('password'); return }
        if (d.error) { setErrorMsg(d.error); setPhase('error'); return }
        setData(d)
        setPhase('loaded')
      })
      .catch(() => { setErrorMsg('Errore di rete'); setPhase('error') })
  }, [token])

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) return
    setSubmitting(true)
    setPasswordError('')
    try {
      const res = await fetch(`/api/conv/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const d = await res.json()
      if (d.error) { setPasswordError(d.error); return }
      setData(d)
      setPhase('loaded')
    } catch {
      setPasswordError('Errore di rete')
    } finally {
      setSubmitting(false)
    }
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Caricamento...</p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-4">🔗</p>
          <p className="text-sm font-semibold text-gray-900 mb-1">{errorMsg || 'Link non valido'}</p>
          <p className="text-xs text-gray-400 mt-1">Il link potrebbe essere scaduto o revocato.</p>
          <a href="/" className="mt-6 inline-block text-xs text-blue-600 underline">Torna alla home</a>
        </div>
      </div>
    )
  }

  if (phase === 'password') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 w-full max-w-sm">
          <p className="text-2xl text-center mb-2">🔒</p>
          <p className="text-sm font-semibold text-gray-900 text-center mb-1">Conversazione protetta</p>
          <p className="text-xs text-gray-400 text-center mb-4">Inserisci la password per visualizzarla</p>
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
            />
            {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
            <button
              type="submit"
              disabled={submitting || !password.trim()}
              className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl disabled:opacity-40 active:opacity-80"
            >
              {submitting ? 'Verifica...' : 'Accedi'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {data.conversation.titolo || 'Conversazione condivisa'}
            </p>
            <p className="text-xs text-gray-400">{formatDate(data.conversation.created_at)}</p>
          </div>
          <a href="/" className="flex items-center gap-1.5 flex-shrink-0">
            <span className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center text-white text-[10px] font-bold">AI</span>
            <span className="hidden sm:inline text-xs text-gray-400">assistente-ai.it</span>
          </a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {data.messages.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-8">Nessun messaggio</p>
        )}
        {data.messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.ruolo === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[82%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.ruolo === 'user'
                ? 'bg-gray-900 text-white rounded-br-sm'
                : 'bg-white text-gray-900 rounded-bl-sm shadow-sm border border-gray-100'
            }`}>
              {msg.ruolo === 'user' ? (
                <span className="whitespace-pre-wrap">{msg.contenuto}</span>
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
                  {msg.contenuto}
                </ReactMarkdown>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 text-center border-t border-gray-100 mt-4">
        <p className="text-xs text-gray-400">
          Condiviso tramite{' '}
          <a href="/" className="text-gray-600 underline underline-offset-2">assistente-ai.it</a>
        </p>
        {data.expires_at && (
          <p className="text-xs text-gray-400 mt-1">
            Scade il {new Date(data.expires_at).toLocaleDateString('it-IT')}
          </p>
        )}
      </div>
    </div>
  )
}
