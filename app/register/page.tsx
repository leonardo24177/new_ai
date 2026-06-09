'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [nome, setNome] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== passwordConfirm) {
      setError('Le password non coincidono.')
      return
    }

    setLoading(true)

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
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-11 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900"
                  placeholder="Minimo 6 caratteri"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 active:text-gray-800 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Conferma password</label>
              <div className="relative">
                <input
                  type={showPasswordConfirm ? 'text' : 'password'}
                  value={passwordConfirm}
                  onChange={e => setPasswordConfirm(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className={`w-full border rounded-xl px-4 py-3 pr-11 text-base focus:outline-none focus:ring-2 text-gray-900 ${
                    passwordConfirm && password !== passwordConfirm
                      ? 'border-red-300 focus:ring-red-400'
                      : 'border-gray-300 focus:ring-gray-900'
                  }`}
                  placeholder="Ripeti la password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 active:text-gray-800 transition-colors"
                  tabIndex={-1}
                  aria-label={showPasswordConfirm ? 'Nascondi password' : 'Mostra password'}
                >
                  <EyeIcon open={showPasswordConfirm} />
                </button>
              </div>
              {passwordConfirm && password !== passwordConfirm && (
                <p className="text-red-500 text-xs mt-1.5">Le password non coincidono</p>
              )}
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>
            )}

            <p className="text-xs text-gray-400 text-center">
              Registrandoti accetti i{' '}
              <Link href="/termini" className="underline hover:text-gray-600">Termini di Servizio</Link>
              {' '}e la{' '}
              <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white rounded-xl py-3.5 text-base font-medium hover:bg-gray-800 active:bg-gray-700 disabled:opacity-50 transition-colors"
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
