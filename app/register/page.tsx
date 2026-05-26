'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome }
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/onboarding')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center">
            <span className="text-white text-lg font-semibold">AI</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Crea account</h1>
          <p className="text-gray-500 text-sm mb-6">Inizia a usare il tuo assistente personale</p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                required
                autoComplete="given-name"
                autoCapitalize="words"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900"
                placeholder="Il tuo nome"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoCapitalize="none"
                inputMode="email"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900"
                placeholder="tu@esempio.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
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

            {error && (
              <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white rounded-xl py-3.5 text-base font-medium hover:bg-gray-800 active:bg-gray-700 disabled:opacity-50 transition-colors mt-2"
            >
              {loading ? 'Registrazione in corso...' : 'Crea account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Hai già un account?{' '}
          <Link href="/login" className="text-gray-900 font-semibold hover:underline">
            Accedi
          </Link>
        </p>
      </div>
    </div>
  )
}
