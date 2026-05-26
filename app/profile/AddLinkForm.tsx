'use client'

import { useState } from 'react'

interface AddLinkProps {
  ambito: string | null
  onAdded: (file: {
    id: string
    nome: string
    url: string
    dimensione: number
    scaricato: boolean
  }) => void
}

export default function AddLinkForm({ ambito, onAdded }: AddLinkProps) {
  const [url, setUrl] = useState('')
  const [titolo, setTitolo] = useState('')
  const [scaricaContenuto, setScaricaContenuto] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          titolo: titolo.trim() || undefined,
          ambito,
          tipo_contesto: 'profile',
          scarica_contenuto: scaricaContenuto,
        }),
      })

      const data = await res.json()

      if (data.error) {
        setError(data.error)
        return
      }

      onAdded(data)
      setUrl('')
      setTitolo('')
    } catch {
      setError('Errore durante il salvataggio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Aggiungi link</h3>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">URL *</label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://www.gazzettaufficiale.it/..."
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Titolo (opzionale)</label>
          <input
            type="text"
            value={titolo}
            onChange={e => setTitolo(e.target.value)}
            placeholder="Es. D.Lgs. 231/2001 — Testo coordinato"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={scaricaContenuto}
            onChange={e => setScaricaContenuto(e.target.checked)}
            className="mt-0.5 rounded"
          />
          <div>
            <p className="text-sm text-gray-900 font-medium">Scarica il contenuto</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Il testo della pagina viene estratto e inserito nel contesto dell&apos;assistente.
              Se disabilitato, il link viene salvato come riferimento ma il contenuto non è accessibile.
            </p>
          </div>
        </label>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="w-full bg-gray-900 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-40 transition-colors"
        >
          {loading
            ? scaricaContenuto ? 'Scarico il contenuto...' : 'Salvo...'
            : 'Aggiungi link'
          }
        </button>
      </div>
    </form>
  )
}
