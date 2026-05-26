'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Le password non coincidono.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/chat')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm mx-auto">
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center">
            <span className="text-white text-lg font-semibold">AI</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Nuova password</h1>
          <p className="text-gray-500 text-sm mb-6">Scegli una nuova password per il tuo account.</p>

          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nuova password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900"
                placeholder="Minimo 6 caratteri"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Conferma password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900"
                placeholder="Ripeti la password"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white rounded-xl py-3.5 text-base font-medium hover:bg-gray-800 active:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Salvataggio...' : 'Salva nuova password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
